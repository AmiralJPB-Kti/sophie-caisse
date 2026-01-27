"use client";

import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Banknote, 
  CreditCard, 
  Receipt, 
  ShoppingBag, 
  Save, 
  Edit2, 
  ChevronLeft, 
  ChevronRight,
  Download,
  X,
  Table as TableIcon,
  LayoutGrid,
  Trash2,
  RefreshCw
} from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';

interface Entry {
  id?: string;
  date: string;
  especes: number;
  cb: number;
  cheques: number;
  depenses: number;
}

export default function SophieCaisse() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [formData, setFormData] = useState({
    especes: '',
    cb: '',
    cheques: '',
    depenses: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);

  // Charger les données depuis Supabase
  const loadEntries = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('caisse_sophie')
      .select('*')
      .order('date', { ascending: true });
    
    if (error) {
      console.error('Erreur chargement:', error);
      alert("Erreur de connexion aux données !");
    } else {
      setEntries(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadEntries();
  }, []);

  // Mettre à jour le formulaire quand la date change
  useEffect(() => {
    const existing = entries.find(e => e.date === format(selectedDate, 'yyyy-MM-dd'));
    if (existing) {
      setFormData({
        especes: existing.especes.toString(),
        cb: existing.cb.toString(),
        cheques: existing.cheques.toString(),
        depenses: existing.depenses.toString()
      });
      setIsEditing(true);
    } else {
      setFormData({ especes: '', cb: '', cheques: '', depenses: '' });
      setIsEditing(false);
    }
  }, [selectedDate, entries]);

  const handleSave = async () => {
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const entryData = {
      date: dateStr,
      especes: parseFloat(formData.especes || '0'),
      cb: parseFloat(formData.cb || '0'),
      cheques: parseFloat(formData.cheques || '0'),
      depenses: parseFloat(formData.depenses || '0')
    };

    // Upsert = Insérer ou Mettre à jour si la date existe déjà
    const { error } = await supabase
      .from('caisse_sophie')
      .upsert(entryData, { onConflict: 'date' });

    if (error) {
      alert("Erreur lors de la sauvegarde : " + error.message);
    } else {
      await loadEntries(); // Recharger pour avoir les données fraîches
      alert("Caisse enregistrée avec succès !");
    }
  };

  const handleDelete = async (dateStr: string) => {
    if (confirm("Voulez-vous vraiment supprimer cette entrée définitivement ?")) {
      const { error } = await supabase
        .from('caisse_sophie')
        .delete()
        .eq('date', dateStr);

      if (error) {
        alert("Erreur de suppression : " + error.message);
      } else {
        await loadEntries();
        // Si on supprime la date en cours d'édition, on vide le formulaire
        if (format(selectedDate, 'yyyy-MM-dd') === dateStr) {
          setFormData({ especes: '', cb: '', cheques: '', depenses: '' });
          setIsEditing(false);
        }
      }
    }
  };

  const clearField = (field: keyof typeof formData) => {
    setFormData(prev => ({ ...prev, [field]: '' }));
  };

  const totalDay = parseFloat(formData.especes || '0') + 
                   parseFloat(formData.cb || '0') + 
                   parseFloat(formData.cheques || '0') + 
                   parseFloat(formData.depenses || '0');

  // Génération des données pour le tableau du mois
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getDayData = (date: Date) => {
    return entries.find(e => e.date === format(date, 'yyyy-MM-dd')) || { especes: 0, cb: 0, cheques: 0, depenses: 0 };
  };

  const printTable = () => {
    window.print();
  };

  const currentMonthStr = format(selectedDate, 'MM-yyyy');
  const totalMonthEspeces = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr).reduce((acc, e) => acc + e.especes, 0);
  const totalMonthCB = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr).reduce((acc, e) => acc + e.cb, 0);
  const totalMonthCheques = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr).reduce((acc, e) => acc + e.cheques, 0);
  const totalMonthDepenses = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr).reduce((acc, e) => acc + e.depenses, 0);
  const grandTotalMonth = totalMonthEspeces + totalMonthCB + totalMonthCheques + totalMonthDepenses;

  if (loading && entries.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="animate-spin" size={40} />
          <p className="font-bold">Chargement des données...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      {/* Header - Masqué à l'impression */}
      <header className="bg-indigo-600 text-white p-6 shadow-lg rounded-b-3xl print:hidden">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <h1 className="text-2xl font-bold tracking-tight">Caisse de Sophie</h1>
          <button 
            onClick={printTable}
            className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition flex items-center gap-2 text-sm font-bold"
          >
            <Download size={20} /> PDF
          </button>
        </div>
        
        {/* Navigation Mois / Sélecteur */}
        <div className="flex items-center justify-between mt-6 max-w-md mx-auto">
             <button onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'table' ? 30 : 1))} className="p-2 hover:bg-white/10 rounded-full transition">
               <ChevronLeft />
             </button>
             <div className="text-center">
               <div className="text-sm uppercase opacity-80 font-medium">
                 {viewMode === 'table' ? 'Mois de' : format(selectedDate, 'EEEE', { locale: fr })}
               </div>
               <div className="text-xl font-bold capitalize">
                 {viewMode === 'table' 
                   ? format(selectedDate, 'MMMM yyyy', { locale: fr })
                   : format(selectedDate, 'd MMMM yyyy', { locale: fr })
                 }
               </div>
             </div>
             <button onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'table' ? 30 : 1))} className="p-2 hover:bg-white/10 rounded-full transition">
               <ChevronRight />
             </button>
        </div>

        {/* Toggle Vue */}
        <div className="flex bg-indigo-800/50 p-1 rounded-xl mt-6 max-w-xs mx-auto backdrop-blur-sm">
          <button 
            onClick={() => setViewMode('form')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'form' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
          >
            <LayoutGrid size={16} /> Saisie
          </button>
          <button 
            onClick={() => setViewMode('table')}
            className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all ${viewMode === 'table' ? 'bg-white text-indigo-600 shadow-sm' : 'text-white/70 hover:text-white'}`}
          >
            <TableIcon size={16} /> Tableau
          </button>
        </div>
      </header>

      {/* Titre Impression (uniquement visible à l'impression) */}
      <div className="hidden print:block text-center mt-8 mb-8">
        <h1 className="text-2xl font-bold border-b-2 border-black pb-2 inline-block">
          FEUILLE DE REMISE DE CAISSE - {format(selectedDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}
        </h1>
      </div>

      <main className={`max-w-md mx-auto px-4 ${viewMode === 'table' ? 'max-w-4xl' : ''} -mt-4 print:mt-0 print:max-w-full print:px-0`}>
        
        {viewMode === 'form' ? (
          <>
            {/* Card de Saisie */}
            <div className="bg-white rounded-3xl shadow-xl p-6 space-y-6 border border-slate-100">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                  <Calendar className="text-indigo-500" size={20} />
                  Saisie du jour
                </h2>
                {isEditing && (
                  <span className="bg-amber-100 text-amber-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                    <Edit2 size={12} /> MODIFICATION
                  </span>
                )}
              </div>

              <div className="grid gap-5">
                {[
                  { id: 'especes', label: 'Espèces', icon: Banknote, color: 'text-green-600' },
                  { id: 'cb', label: 'Carte Bancaire', icon: CreditCard, color: 'text-blue-600' },
                  { id: 'cheques', label: 'Chèques', icon: Receipt, color: 'text-purple-600' },
                  { id: 'depenses', label: 'Dépenses Espèces', icon: ShoppingBag, color: 'text-red-600' },
                ].map((field) => (
                  <div key={field.id} className="relative">
                    <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-1 block">
                      {field.label}
                    </label>
                    <div className="relative group">
                      <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${field.color}`}>
                        <field.icon size={20} />
                      </div>
                      <input
                        type="number"
                        value={formData[field.id as keyof typeof formData]}
                        onChange={(e) => setFormData({...formData, [field.id]: e.target.value})}
                        onFocus={(e) => e.target.select()}
                        placeholder="0.00"
                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 rounded-2xl py-4 pl-12 pr-12 text-lg font-medium outline-none transition-all"
                      />
                      {formData[field.id as keyof typeof formData] && (
                        <button 
                          onClick={() => clearField(field.id as keyof typeof formData)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500 p-1"
                        >
                          <X size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-indigo-50 p-4 rounded-2xl flex justify-between items-center">
                <span className="font-bold text-indigo-900">Total Journée</span>
                <span className="text-2xl font-black text-indigo-600">{totalDay.toFixed(2)} €</span>
              </div>

              <button 
                onClick={handleSave}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-3 transition-all active:scale-95"
              >
                <Save size={24} />
                {isEditing ? 'Mettre à jour' : 'Enregistrer'}
              </button>
            </div>
            
            {/* Historique avec fonction suppression */}
            <div className="mt-8 px-2 text-slate-400 uppercase text-[10px] font-black tracking-widest mb-4">
              Historique récent (Cloud)
            </div>
            <div className="space-y-3 pb-8">
              {entries.slice(-5).reverse().map((entry, i) => (
                <div key={i} className="bg-white/60 border border-white p-4 rounded-2xl flex justify-between items-center shadow-sm">
                  <div>
                    <div className="font-bold text-slate-700 capitalize">{format(new Date(entry.date), 'EEEE d MMMM', { locale: fr })}</div>
                    <div className="text-xs text-slate-500 font-medium">Total : {(entry.cb + entry.especes + entry.cheques + entry.depenses).toFixed(2)} €</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => { setSelectedDate(new Date(entry.date)); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                      className="p-2 text-indigo-500 hover:bg-indigo-50 rounded-xl transition"
                      title="Modifier"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button 
                      onClick={() => handleDelete(entry.date)}
                      className="p-2 text-red-400 hover:bg-red-50 rounded-xl transition"
                      title="Supprimer"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          /* Vue Tableau style Comptable (Style Excel forcé) */
          <div className="bg-white p-1 overflow-hidden print:shadow-none print:border-none">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-100 print:bg-gray-200">
                  <th className="px-2 py-2 text-left font-bold text-black border border-slate-400 print:border-black w-32">Jour</th>
                  <th className="px-2 py-2 text-right font-bold text-black border border-slate-400 print:border-black">Espèces</th>
                  <th className="px-2 py-2 text-right font-bold text-black border border-slate-400 print:border-black">CB</th>
                  <th className="px-2 py-2 text-right font-bold text-black border border-slate-400 print:border-black">Chèques</th>
                  <th className="px-2 py-2 text-right font-bold text-black border border-slate-400 print:border-black">Dépenses</th>
                  <th className="px-2 py-2 text-right font-bold text-black border border-slate-400 print:border-black bg-gray-200">Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let weekEsp = 0;
                  let weekCb = 0;
                  let weekChq = 0;
                  let weekDep = 0;
                  let weekNum = 1;

                  return daysInMonth.map((day, index) => {
                    const data = getDayData(day);
                    
                    // Cumul semaine
                    weekEsp += data.especes;
                    weekCb += data.cb;
                    weekChq += data.cheques;
                    weekDep += data.depenses;

                    const totalDay = data.especes + data.cb + data.cheques + data.depenses;
                    const isSunday = day.getDay() === 0;
                    const isLastDay = index === daysInMonth.length - 1;
                    
                    const rows = [];

                    // 1. Ligne du jour
                    rows.push(
                      <tr key={day.toString()} className={`${isSunday ? 'bg-slate-50 print:bg-slate-50' : ''}`}>
                        <td className="px-2 py-1 font-medium text-black border border-slate-400 print:border-black capitalize">
                          {format(day, 'EEE d', { locale: fr })}
                        </td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">
                          {data.especes !== 0 ? data.especes.toFixed(2) : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">
                          {data.cb !== 0 ? data.cb.toFixed(2) : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">
                          {data.cheques !== 0 ? data.cheques.toFixed(2) : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black text-black">
                          {data.depenses !== 0 ? data.depenses.toFixed(2) : ''}
                        </td>
                        <td className="px-2 py-1 text-right font-mono font-bold text-black bg-gray-50 border border-slate-400 print:border-black">
                          {totalDay !== 0 ? totalDay.toFixed(2) : ''}
                        </td>
                      </tr>
                    );

                    // 2. Ligne Total Semaine (si Dimanche ou Fin de mois)
                    if (isSunday || isLastDay) {
                      const totalWeek = weekEsp + weekCb + weekChq + weekDep;
                      rows.push(
                        <tr key={`week-${weekNum}`} className="bg-gray-300 print:bg-gray-300 font-bold border-t-2 border-black">
                          <td className="px-2 py-1 text-left border border-black print:border-black italic">
                            Total Semaine {weekNum}
                          </td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">
                            {weekEsp.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">
                            {weekCb.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">
                            {weekChq.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right border border-black print:border-black text-red-900">
                            {weekDep.toFixed(2)}
                          </td>
                          <td className="px-2 py-1 text-right border border-black print:border-black bg-gray-400 print:bg-gray-400">
                            {totalWeek.toFixed(2)}
                          </td>
                        </tr>
                      );
                      
                      // Reset compteurs
                      weekEsp = 0;
                      weekCb = 0;
                      weekChq = 0;
                      weekDep = 0;
                      weekNum++;
                    }

                    return rows;
                  });
                })()}
              </tbody>
              <tfoot className="bg-gray-200 text-black border-t-2 border-black">
                <tr className="font-bold">
                  <td className="px-2 py-2 border border-slate-400 print:border-black uppercase text-xs">TOTAUX</td>
                  <td className="px-2 py-2 text-right border border-slate-400 print:border-black font-mono">{totalMonthEspeces.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right border border-slate-400 print:border-black font-mono">{totalMonthCB.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right border border-slate-400 print:border-black font-mono">{totalMonthCheques.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right border border-slate-400 print:border-black font-mono">{totalMonthDepenses.toFixed(2)}</td>
                  <td className="px-2 py-2 text-right bg-gray-300 border border-slate-400 print:border-black font-mono">{grandTotalMonth.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
