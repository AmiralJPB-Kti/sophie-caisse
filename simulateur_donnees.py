import csv
import random
from datetime import date, timedelta
import locale

# Configuration
ANNEE = 2025  # On génère sur l'année passée pour avoir du recul
FILENAME = "donnees_simulation_2025.csv"

# Paramètres de simulation (Profil Commerçant type)
JOURS_OUVERTS = [0, 1, 2, 3, 4, 5] # 0=Lundi ... 5=Samedi (Fermé Dimanche=6)
MOYENNE_JOUR = 350
VARIATION_JOUR = 150 # +/- ce montant

# Coefficients multiplicateurs (Saisonnalité & Semaine)
COEFF_JOUR = {
    0: 0.8, # Lundi calme
    1: 0.9, # Mardi moyen
    2: 1.0, # Mercredi normal
    3: 1.0, # Jeudi normal
    4: 1.2, # Vendredi fort
    5: 1.5, # Samedi très fort
    6: 0.0  # Dimanche fermé
}

COEFF_MOIS = {
    1: 0.8, # Janvier creux
    2: 0.9, 
    3: 1.0,
    4: 1.1,
    5: 1.2,
    6: 1.3,
    7: 1.5, # Juillet fort
    8: 1.4, # Août fort
    9: 1.1,
    10: 1.0,
    11: 0.9,
    12: 1.8 # Décembre explosif (Noël)
}

def generate_data():
    start_date = date(ANNEE, 1, 1)
    end_date = date(ANNEE, 12, 31)
    delta = timedelta(days=1)
    
    rows = []
    current_date = start_date
    
    print(f"Génération des données pour {ANNEE}...")

    while current_date <= end_date:
        weekday = current_date.weekday()
        month = current_date.month
        
        # Si c'est un jour ouvert
        if weekday in JOURS_OUVERTS:
            # Calcul du CA du jour
            base = MOYENNE_JOUR + random.uniform(-VARIATION_JOUR, VARIATION_JOUR)
            
            # Application des coefficients
            ca_total = base * COEFF_JOUR[weekday] * COEFF_MOIS[month]
            
            # Répartition des paiements (Simulation réaliste)
            # CB : 50-70%, Espèces : 20-40%, Chèques : Reste
            part_cb = random.uniform(0.50, 0.70)
            part_esp = random.uniform(0.20, 0.40)
            
            # Ajustement pour ne pas dépasser 100%
            if part_cb + part_esp > 0.95:
                part_esp = 0.95 - part_cb
                
            cb = round(ca_total * part_cb, 2)
            especes = round(ca_total * part_esp, 2)
            cheques = round(ca_total - cb - especes, 2)
            
            # Parfois des dépenses en espèces (1 jour sur 3)
            depenses = 0
            if random.random() > 0.7:
                depenses = round(random.uniform(5, 50), 2)

            # Format Supabase (date, especes, cb, cheques, depenses)
            # Note: Supabase attend YYYY-MM-DD
            rows.append([
                current_date.strftime("%Y-%m-%d"),
                especes,
                cb,
                cheques,
                depenses
            ])
            
        current_date += delta

    # Écriture CSV
    with open(FILENAME, 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        # Header technique pour import Supabase
        writer.writerow(['date', 'especes', 'cb', 'cheques', 'depenses'])
        writer.writerows(rows)
        
    print(f"✅ Terminé ! {len(rows)} jours générés dans '{FILENAME}'.")
    print("👉 Importez ce fichier dans Supabase (Table Editor > Import).")

if __name__ == "__main__":
    generate_data()
