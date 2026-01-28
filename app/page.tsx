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
  RefreshCw,
  Lock,
  User,
  LogOut,
  Mail
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
  const [session, setSession] = useState<any>(null);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // --- GESTION AUTHENTIFICATION SUPABASE ---

  useEffect(() => {
    // Vérifier si une session existe déjà au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });

    // Écouter les changements d'état (connexion/déconnexion)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: emailInput,
      password: passwordInput,
    });

    if (error) {
      setLoginError("Email ou mot de passe incorrect.");
    }
    setLoadingAuth(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Le state 'session' sera mis à jour automatiquement via onAuthStateChange
  };

  // --- APP LOGIC (Reste inchangé) ---
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
  const [loadingData, setLoadingData] = useState(false);
  
  // --- GESTION PROFIL / MOT DE PASSE ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [msgProfile, setMsgProfile] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      setMsgProfile("Le mot de passe doit faire au moins 6 caractères.");
      return;
    }
    setLoadingAuth(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    
    if (error) {
      setMsgProfile("Erreur: " + error.message);
    } else {
      setMsgProfile("Mot de passe modifié avec succès !");
      setTimeout(() => {
        setShowProfileModal(false);
        setMsgProfile("");
        setNewPassword("");
      }, 1500);
    }
    setLoadingAuth(false);
  };

  // Charger les données (seulement si session active)
  const loadEntries = async () => {
    if (!session) return;
    
    setLoadingData(true);
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
    setLoadingData(false);
  };

  useEffect(() => {
    if (session) {
      loadEntries();
    }
  }, [session]);

  // Sync formulaire avec date
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
    if (!session) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const entryData = {
      date: dateStr,
      especes: parseFloat(formData.especes || '0'),
      cb: parseFloat(formData.cb || '0'),
      cheques: parseFloat(formData.cheques || '0'),
      depenses: parseFloat(formData.depenses || '0')
    };

    const { error } = await supabase
      .from('caisse_sophie')
      .upsert(entryData, { onConflict: 'date' });

    if (error) {
      alert("Erreur : " + error.message);
    } else {
      await loadEntries();
      alert("Enregistré !");
    }
  };

  const handleDelete = async (dateStr: string) => {
    if (!session) return;
    if (confirm("Supprimer cette entrée ?")) {
      const { error } = await supabase
        .from('caisse_sophie')
        .delete()
        .eq('date', dateStr);

      if (error) {
        alert("Erreur : " + error.message);
      } else {
        await loadEntries();
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

  // --- RENDER ---

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-indigo-600">
        <RefreshCw className="animate-spin" size={40} />
      </div>
    );
  }

  // Écran de Login (Si pas de session)
  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center space-y-6">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-indigo-600">
            <Lock size={32} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Caisse de Sophie</h1>
            <p className="text-slate-500 text-sm mt-1">Connexion Sécurisée</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  placeholder="sophie@exemple.com"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 outline-none transition-all"
                  autoFocus
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-slate-400" size={20} />
                <input
                  type="password"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-3 outline-none transition-all"
                />
              </div>
            </div>

            {loginError && (
              <p className="text-red-500 text-xs font-bold bg-red-50 p-3 rounded-lg text-center">
                {loginError}
              </p>
            )}
            
            <button 
              type="submit"
              disabled={loadingAuth}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all active:scale-95 mt-2 disabled:opacity-50"
            >
              {loadingAuth ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <div className="text-xs text-slate-400 pt-4 border-t">
            Application sécurisée v1.2
          </div>
        </div>
      </div>
    );
  }

  // Écran App (Si session active)
  return (
    <div className="min-h-screen bg-slate-50 pb-20 print:bg-white print:pb-0">
      
      {/* MODAL PROFIL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-4 border-b pb-2">
              <h3 className="text-lg font-bold text-slate-800">Changer le mot de passe</h3>
              <button onClick={() => setShowProfileModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleChangePassword} className="space-y-4">
              <p className="text-sm text-slate-600 mb-2">Entrez votre nouveau mot de passe pour <strong>{session.user.email}</strong>.</p>
              
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Nouveau mot de passe"
                className="w-full bg-slate-50 border-2 border-slate-200 focus:border-indigo-500 rounded-xl px-4 py-3 outline-none"
                autoFocus
              />

              {msgProfile && (
                <p className={`text-xs font-bold p-2 rounded-lg text-center ${msgProfile.includes('succès') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {msgProfile}
                </p>
              )}
              
              <button 
                type="submit"
                disabled={loadingAuth}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl mt-2"
              >
                {loadingAuth ? 'Modification...' : 'Confirmer'}
              </button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-6 shadow-lg rounded-b-3xl print:hidden">
        <div className="flex justify-between items-center max-w-md mx-auto">
          <div>
            <h1 className="text-xl font-bold tracking-tight">Caisse de Sophie</h1>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="text-xs text-indigo-200 flex items-center gap-1 hover:text-white hover:underline transition mt-1"
            >
              <User size={12} /> {session.user.email} (Profil)
            </button>
          </div>
          <div className="flex gap-2">
            <button onClick={printTable} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition">
              <Download size={20} />
            </button>
            <button onClick={handleLogout} className="bg-red-500/20 p-2 rounded-full hover:bg-red-500/40 transition text-red-100" title="Se déconnecter">
              <LogOut size={20} />
            </button>
          </div>
        </div>
        
        {/* Navigation Mois / Sélecteur ... */}
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

        {/* Toggle Vue ... */}
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

      <div className="hidden print:block text-center mt-8 mb-8">
        <h1 className="text-2xl font-bold border-b-2 border-black pb-2 inline-block">
          FEUILLE DE REMISE DE CAISSE - {format(selectedDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}
        </h1>
      </div>

      <main className={`max-w-md mx-auto px-4 ${viewMode === 'table' ? 'max-w-4xl' : ''} -mt-4 print:mt-0 print:max-w-full print:px-0`}>
        {loadingData ? (
          <div className="flex justify-center p-10"><RefreshCw className="animate-spin text-indigo-500" /></div>
        ) : viewMode === 'form' ? (
          <>
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
            
            <div className="mt-8 px-2 text-slate-400 uppercase text-[10px] font-black tracking-widest mb-4">
              Historique récent
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
          /* Vue Tableau ... (identique, abrégée pour le remplacement) */
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
                    weekEsp += data.especes; weekCb += data.cb; weekChq += data.cheques; weekDep += data.depenses;
                    const totalDay = data.especes + data.cb + data.cheques + data.depenses;
                    const isSunday = day.getDay() === 0;
                    const isLastDay = index === daysInMonth.length - 1;
                    const rows = [];
                    rows.push(
                      <tr key={day.toString()} className={`${isSunday ? 'bg-slate-50 print:bg-slate-50' : ''}`}>
                        <td className="px-2 py-1 font-medium text-black border border-slate-400 print:border-black capitalize">{format(day, 'EEE d', { locale: fr })}</td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">{data.especes !== 0 ? data.especes.toFixed(2) : ''}</td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">{data.cb !== 0 ? data.cb.toFixed(2) : ''}</td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black">{data.cheques !== 0 ? data.cheques.toFixed(2) : ''}</td>
                        <td className="px-2 py-1 text-right font-mono border border-slate-400 print:border-black text-black">{data.depenses !== 0 ? data.depenses.toFixed(2) : ''}</td>
                        <td className="px-2 py-1 text-right font-mono font-bold text-black bg-gray-50 border border-slate-400 print:border-black">{totalDay !== 0 ? totalDay.toFixed(2) : ''}</td>
                      </tr>
                    );
                    if (isSunday || isLastDay) {
                      const totalWeek = weekEsp + weekCb + weekChq + weekDep;
                      rows.push(
                        <tr key={`week-${weekNum}`} className="bg-gray-300 print:bg-gray-300 font-bold border-t-2 border-black">
                          <td className="px-2 py-1 text-left border border-black print:border-black italic">Total Semaine {weekNum}</td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">{weekEsp.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">{weekCb.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right border border-black print:border-black">{weekChq.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right border border-black print:border-black text-red-900">{weekDep.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right border border-black print:border-black bg-gray-400 print:bg-gray-400">{totalWeek.toFixed(2)}</td>
                        </tr>
                      );
                      weekEsp = 0; weekCb = 0; weekChq = 0; weekDep = 0; weekNum++;
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