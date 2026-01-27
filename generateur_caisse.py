import zipfile
import xml.etree.ElementTree as ET
import datetime
import shutil
import os
import calendar

# Configuration
SOURCE_FILE = "fiche de remise de caisse.ods"
OUTPUT_FILENAME_TEMPLATE = "fiche de remise de caisse {year}.ods"

# Styles identifiés (à préserver)
STYLE_HEADER = "ce1"
STYLE_TOTAL_LABEL = "ce3"
STYLE_TOTAL_VALUE = "ce8"
STYLE_TOTAL_WEEK = "ce12"

# Namespaces ODS
NS = {
    'table': 'urn:oasis:names:tc:opendocument:xmlns:table:1.0',
    'text': 'urn:oasis:names:tc:opendocument:xmlns:text:1.0',
    'office': 'urn:oasis:names:tc:opendocument:xmlns:office:1.0',
}
for p, u in NS.items():
    ET.register_namespace(p, u)

def get_day_label(date_obj):
    days = ["lun.", "mar.", "mer.", "jeu.", "ven.", "sam.", "dim."]
    months = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."]
    return f"{days[date_obj.weekday()]} {date_obj.day} {months[date_obj.month-1]} {str(date_obj.year)[-2:]}"

def create_cell(text_content, style=None, formula=None, value_type="string", value=None):
    cell = ET.Element(f"{{{NS['table']}}}table-cell")
    if style:
        cell.set(f"{{{NS['table']}}}style-name", style)
    if formula:
        # Ajout du préfixe 'of:' pour compatibilité OpenOffice (fix #VALEUR!)
        if formula.startswith("=") and not formula.startswith("of:"):
            formula = "of:" + formula
        cell.set(f"{{{NS['table']}}}formula", formula)
    
    cell.set(f"{{{NS['table']}}}value-type", value_type)
    if value is not None:
         cell.set(f"{{{NS['office']}}}value", str(value))

    p = ET.SubElement(cell, f"{{{NS['text']}}}p")
    p.text = text_content
    return cell

def generate_year(target_year):
    print(f"Génération du fichier pour l'année {target_year}...")
    
    if not os.path.exists(SOURCE_FILE):
        print(f"Erreur: Le fichier modèle '{SOURCE_FILE}' est introuvable.")
        return

    # 1. Lecture du content.xml original
    zin = zipfile.ZipFile(SOURCE_FILE, 'r')
    content_xml = zin.read('content.xml')
    zin.close()
    
    root = ET.fromstring(content_xml)
    spreadsheet = root.find('.//office:spreadsheet', NS)
    
    # Récupération des colonnes modèles
    first_table = spreadsheet.find(f"{{{NS['table']}}}table", NS)
    model_columns = []
    if first_table is not None:
        for col in first_table.findall(f"{{{NS['table']}}}table-column", NS):
            model_columns.append(col)
    
    # Supprimer les anciennes tables
    for table in spreadsheet.findall(f"{{{NS['table']}}}table", NS):
        spreadsheet.remove(table)
        
    # 2. Création des 12 mois
    month_names = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", 
                   "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"]
    
    for month_idx, month_name in enumerate(month_names):
        m = month_idx + 1
        sheet_name = f"{month_name} {str(target_year)[-2:]}"
        table = ET.SubElement(spreadsheet, f"{{{NS['table']}}}table")
        table.set(f"{{{NS['table']}}}name", sheet_name)
        
        if model_columns:
            for model_col in model_columns:
                new_col = ET.SubElement(table, f"{{{NS['table']}}}table-column")
                new_col.attrib = model_col.attrib
        
        # En-têtes
        row_header = ET.SubElement(table, f"{{{NS['table']}}}table-row")
        for h in ["Jour", "Espèces", "CB", "Chèques", "Dépense espèces", "Total"]:
            row_header.append(create_cell(h, style=STYLE_HEADER))
            
        num_days = calendar.monthrange(target_year, m)[1]
        week_counter = 1
        current_week_rows = [] 
        all_week_total_rows = []
        current_row_idx = 2 
        
        for d in range(1, num_days + 1):
            date_obj = datetime.date(target_year, m, d)
            row = ET.SubElement(table, f"{{{NS['table']}}}table-row")
            row.append(create_cell(get_day_label(date_obj)))
            for _ in range(4):
                row.append(create_cell("0,00 €", value_type="currency", value=0))
            
            f_day = f"=[.B{current_row_idx}]+[.C{current_row_idx}]+[.D{current_row_idx}]+[.E{current_row_idx}]"
            row.append(create_cell("0,00 €", formula=f_day, value_type="currency", value=0))
            
            current_week_rows.append(current_row_idx)
            current_row_idx += 1
            
            if date_obj.weekday() == 6 or d == num_days:
                row_total = ET.SubElement(table, f"{{{NS['table']}}}table-row")
                label = f"Total semaine {week_counter}" if date_obj.weekday() == 6 else "Total semaine partiel"
                row_total.append(create_cell(label, style=STYLE_TOTAL_LABEL))
                
                for col_letter in ['B', 'C', 'D', 'E']:
                    f_sum = "=" + "+".join([f"[.{col_letter}{r}]" for r in current_week_rows])
                    row_total.append(create_cell("0,00 €", style=STYLE_TOTAL_VALUE, formula=f_sum, value_type="currency", value=0))
                
                f_cross = f"=[.B{current_row_idx}]+[.C{current_row_idx}]+[.D{current_row_idx}]+[.E{current_row_idx}]"
                row_total.append(create_cell("0,00 €", style=STYLE_TOTAL_WEEK, formula=f_cross, value_type="currency", value=0))
                
                all_week_total_rows.append(current_row_idx)
                current_row_idx += 1
                week_counter += 1
                current_week_rows = [] 

        # --- Lignes de fin de mois ---
        # 1. Total colonnes
        row_col = ET.SubElement(table, f"{{{NS['table']}}}table-row")
        row_col.append(create_cell("Total colonnes", style="ce5"))
        for _ in range(4): row_col.append(create_cell("", style="ce15"))
        f_col_f = "=" + "+".join([f"[.F{r}]" for r in all_week_total_rows])
        row_col.append(create_cell("0,00 €", style="ce13", formula=f_col_f, value_type="currency", value=0))
        current_row_idx += 1

        # 2. Total fin de mois
        row_fin = ET.SubElement(table, f"{{{NS['table']}}}table-row")
        row_fin.append(create_cell("Total fin de mois", style="ce6"))
        for col_letter in ['B', 'C', 'D', 'E']:
            f_fin = "=" + "+".join([f"[.{col_letter}{r}]" for r in all_week_total_rows])
            row_fin.append(create_cell("0,00 €", style="ce10", formula=f_fin, value_type="currency", value=0))
        f_grand_total = f"=[.B{current_row_idx}]+[.C{current_row_idx}]+[.D{current_row_idx}]+[.E{current_row_idx}]"
        row_fin.append(create_cell("0,00 €", style="ce14", formula=f_grand_total, value_type="currency", value=0))

    # 3. Sauvegarde dans le fichier ODS
    out_filename = OUTPUT_FILENAME_TEMPLATE.format(year=target_year)
    with zipfile.ZipFile(SOURCE_FILE, 'r') as zin:
        with zipfile.ZipFile(out_filename, 'w') as zout:
            for item in zin.infolist():
                if item.filename != 'content.xml':
                    zout.writestr(item, zin.read(item.filename))
            with zout.open('content.xml', 'w') as f:
                ET.ElementTree(root).write(f, encoding='UTF-8', xml_declaration=True)
    print(f"Fichier créé : {out_filename}")

if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        try: year = int(sys.argv[1])
        except: sys.exit(1)
    else:
        print("--- GÉNÉRATEUR DE FICHIER DE CAISSE ---")
        try:
            saisie = input("Pour quelle année générer le fichier ? : ")
            year = int(saisie)
        except: sys.exit(1)
    try:
        generate_year(year)
        input("\nTerminé ! Appuyez sur Entrée pour quitter...")
    except Exception as e:
        print(f"Erreur : {e}")
        input()