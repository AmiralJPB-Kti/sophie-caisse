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
  Mail,
  PieChart as PieChartIcon
} from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval, getDaysInMonth, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
// Imports graphiques
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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

  // --- AUTHENTIFICATION ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setCheckingSession(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingAuth(true);
    setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setLoginError("Email ou mot de passe incorrect.");
    setLoadingAuth(false);
  };

  const handleLogout = async () => await supabase.auth.signOut();

  // --- APP STATE ---
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [entries, setEntries] = useState<Entry[]>([]);
  const [viewMode, setViewMode] = useState<'form' | 'table' | 'stats'>('form');
  const [formData, setFormData] = useState({ especes: '', cb: '', cheques: '', depenses: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  
  // --- PROFIL ---
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [msgProfile, setMsgProfile] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setMsgProfile("Le mot de passe doit faire au moins 6 caractères."); return; }
    setLoadingAuth(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMsgProfile("Erreur: " + error.message);
    else {
      setMsgProfile("Mot de passe modifié avec succès !");
      setTimeout(() => { setShowProfileModal(false); setMsgProfile(""); setNewPassword(""); }, 1500);
    }
    setLoadingAuth(false);
  };

  // --- DATA LOADING ---
  const loadEntries = async () => {
    if (!session) return;
    setLoadingData(true);
    const { data, error } = await supabase.from('caisse_sophie').select('*').order('date', { ascending: true });
    if (error) console.error(error);
    else setEntries(data || []);
    setLoadingData(false);
  };

  useEffect(() => { if (session) loadEntries(); }, [session]);

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

  // --- CRUD ---
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
    const { error } = await supabase.from('caisse_sophie').upsert(entryData, { onConflict: 'date' });
    if (error) alert("Erreur : " + error.message);
    else { await loadEntries(); alert("Enregistré !"); }
  };

  const handleDelete = async (dateStr: string) => {
    if (!session) return;
    if (confirm("Supprimer cette entrée ?")) {
      const { error } = await supabase.from('caisse_sophie').delete().eq('date', dateStr);
      if (error) alert("Erreur : " + error.message);
      else {
        await loadEntries();
        if (format(selectedDate, 'yyyy-MM-dd') === dateStr) {
          setFormData({ especes: '', cb: '', cheques: '', depenses: '' });
          setIsEditing(false);
        }
      }
    }
  };

  const clearField = (field: keyof typeof formData) => setFormData(prev => ({ ...prev, [field]: '' }));

  // --- CALCULS ---
  const totalDay = parseFloat(formData.especes || '0') + parseFloat(formData.cb || '0') + parseFloat(formData.cheques || '0') + parseFloat(formData.depenses || '0');
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const getDayData = (date: Date) => entries.find(e => e.date === format(date, 'yyyy-MM-dd')) || { especes: 0, cb: 0, cheques: 0, depenses: 0 };
  
  const currentMonthStr = format(selectedDate, 'MM-yyyy');
  const monthEntries = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr);
  const totalMonthEsp = monthEntries.reduce((acc, e) => acc + e.especes, 0);
  const totalMonthCB = monthEntries.reduce((acc, e) => acc + e.cb, 0);
  const totalMonthChq = monthEntries.reduce((acc, e) => acc + e.cheques, 0);
  const totalMonthDep = monthEntries.reduce((acc, e) => acc + e.depenses, 0);
  const totalCA = totalMonthEsp + totalMonthCB + totalMonthChq;
  const avgDay = monthEntries.length > 0 ? totalCA / monthEntries.length : 0;

  // Graph data
  const dataPie = [
    { name: 'Espèces', value: totalMonthEsp, color: '#16a34a' },
    { name: 'CB', value: totalMonthCB, color: '#2563eb' },
    { name: 'Chèques', value: totalMonthChq, color: '#9333ea' },
  ].filter(d => d.value > 0);

  const dataBar = daysInMonth.map(day => ({
    day: format(day, 'dd'),
    CA: getDayData(day).especes + getDayData(day).cb + getDayData(day).cheques
  }));

  if (checkingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-indigo-600 bg-indigo-50 p-4 rounded-full" />
          <h1 className="text-2xl font-bold">Caisse de Sophie</h1>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} placeholder="Email" className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500" />
            <input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Mot de passe" className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500" />
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl">{loadingAuth ? '...' : 'Se connecter'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold">Changer mot de passe</h3>
              <X className="cursor-pointer" onClick={() => setShowProfileModal(false)} />
            </div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full border-2 p-3 rounded-xl" autoFocus />
              {msgProfile && <p className="text-xs text-center font-bold">{msgProfile}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl">Confirmer</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl print:hidden">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div>
            <h1 className="font-bold text-xl text-white">Caisse de Sophie</h1>
            <button onClick={() => setShowProfileModal(true)} className="text-xs opacity-80 flex items-center gap-1 hover:underline text-white">
              <User size={12} /> {session.user.email} (Modifier)
            </button>
          </div>
          <div className="flex gap-2">
            <Download className="cursor-pointer" onClick={() => window.print()} />
            <LogOut className="cursor-pointer" onClick={handleLogout} />
          </div>
        </div>

        <div className="max-w-md mx-auto flex justify-between items-center mt-6">
          <ChevronLeft className="cursor-pointer" onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'form' ? 1 : 30))} />
          <div className="text-center">
            <div className="text-xs uppercase opacity-70 font-bold">{format(selectedDate, viewMode === 'form' ? 'EEEE' : 'MMMM', { locale: fr })}</div>
            <div className="text-xl font-bold">{format(selectedDate, viewMode === 'form' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: fr })}</div>
          </div>
          <ChevronRight className="cursor-pointer" onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'form' ? 1 : 30))} />
        </div>

        <div className="max-w-xs mx-auto flex bg-indigo-800/50 p-1 rounded-xl mt-6">
          <button onClick={() => setViewMode('form')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${viewMode === 'form' ? 'bg-white text-indigo-600' : ''}`}>Saisie</button>
          <button onClick={() => setViewMode('table')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${viewMode === 'table' ? 'bg-white text-indigo-600' : ''}`}>Tableau</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-2 rounded-lg text-sm font-bold ${viewMode === 'stats' ? 'bg-white text-indigo-600' : ''}`}>Bilan</button>
        </div>
      </header>

      <main className={`p-4 mx-auto max-w-md ${viewMode === 'table' ? 'max-w-4xl' : ''}`}>
        {loadingData ? <div className="text-center p-10"><RefreshCw className="animate-spin inline text-indigo-500" /></div> : 
         viewMode === 'form' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl space-y-4">
              <h2 className="font-bold flex items-center gap-2"><Calendar size={20}/> {isEditing ? 'Modification' : 'Saisie'}</h2>
              {['especes', 'cb', 'cheques', 'depenses'].map(f => (
                <div key={f} className="relative">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">{f}</label>
                  <input type="number" value={formData[f as keyof typeof formData]} onChange={(e) => setFormData({...formData, [f]: e.target.value})} onFocus={e => e.target.select()} className="w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold" />
                  {formData[f as keyof typeof formData] && <X className="absolute right-4 top-10 text-slate-300" onClick={() => clearField(f as keyof typeof formData)} />}
                </div>
              ))}
              <div className="flex justify-between items-center bg-indigo-50 p-4 rounded-2xl font-bold"><span>Total</span><span className="text-xl text-indigo-600">{totalDay.toFixed(2)} €</span></div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg flex justify-center gap-2"><Save /> {isEditing ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 ml-2">Historique récent</h3>
              {entries.slice(-5).reverse().map(e => (
                <div key={e.date} className="bg-white/60 p-4 rounded-2xl flex justify-between items-center border border-white shadow-sm">
                  <div><div className="font-bold capitalize">{format(new Date(e.date), 'EEEE d MMMM', { locale: fr })}</div><div className="text-xs text-slate-500">{(e.cb + e.especes + e.cheques + e.depenses).toFixed(2)} €</div></div>
                  <div className="flex gap-2"><Edit2 className="text-indigo-500 cursor-pointer" onClick={() => setSelectedDate(new Date(e.date))} /><Trash2 className="text-red-400 cursor-pointer" onClick={() => handleDelete(e.date)} /></div>
                </div>
              ))}
            </div>
          </div>
         ) : viewMode === 'stats' ? (
          <div className="space-y-6">
            {monthEntries.length === 0 ? <div className="bg-white p-10 rounded-3xl text-center font-bold text-slate-400 shadow-sm">Aucune donnée pour ce mois</div> : (
              <>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
                  <div className="text-xs font-bold text-slate-400 uppercase mb-1">Chiffre d'Affaires</div>
                  <div className="text-4xl font-black">{totalCA.toFixed(2)} €</div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100"><div className="text-[10px] font-bold text-slate-400 uppercase">Dépenses</div><div className="text-xl font-bold text-red-500">{totalMonthDep.toFixed(2)} €</div></div>
                  <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100"><div className="text-[10px] font-bold text-slate-400 uppercase">Moy/Jour</div><div className="text-xl font-bold text-indigo-600">{avgDay.toFixed(0)} €</div></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <PieChart><Pie data={dataPie} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">{dataPie.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><Tooltip /><Legend /></PieChart>
                   </ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm h-64">
                   <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dataBar}><XAxis dataKey="day" hide /><Tooltip /><Bar dataKey="CA" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart>
                   </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
         ) : (
          <div className="bg-white p-1 overflow-x-auto shadow-xl rounded-xl">
            <table className="w-full border-collapse text-xs">
              <thead><tr className="bg-slate-100"><th className="border border-slate-400 p-2 text-left">Jour</th><th className="border border-slate-400 p-2 text-right">Esp.</th><th className="border border-slate-400 p-2 text-right">CB</th><th className="border border-slate-400 p-2 text-right">Chq.</th><th className="border border-slate-400 p-2 text-right">Dép.</th><th className="border border-slate-400 p-2 text-right bg-slate-200">Total</th></tr></thead>
              <tbody>
                {(() => {
                  let week = { e: 0, cb: 0, cq: 0, d: 0, n: 1 };
                  return daysInMonth.flatMap((day, i) => {
                    const d = getDayData(day);
                    week.e += d.especes; week.cb += d.cb; week.cq += d.cheques; week.d += d.depenses;
                    const res = [<tr key={day.toString()}><td className="border border-slate-400 p-1 capitalize">{format(day, 'EEE d', { locale: fr })}</td><td className="border border-slate-400 p-1 text-right">{d.especes || ''}</td><td className="border border-slate-400 p-1 text-right">{d.cb || ''}</td><td className="border border-slate-400 p-1 text-right">{d.cheques || ''}</td><td className="border border-slate-400 p-1 text-right text-red-500">{d.depenses || ''}</td><td className="border border-slate-400 p-1 text-right font-bold bg-slate-50">{(d.especes + d.cb + d.cheques + d.depenses) || ''}</td></tr>];
                    if (day.getDay() === 0 || i === daysInMonth.length - 1) {
                      res.push(<tr key={`w-${week.n}`} className="bg-slate-300 font-bold"><td className="border border-black p-1 italic text-[10px]">Total Sem {week.n}</td><td className="border border-black p-1 text-right">{week.e.toFixed(2)}</td><td className="border border-black p-1 text-right">{week.cb.toFixed(2)}</td><td className="border border-black p-1 text-right">{week.cq.toFixed(2)}</td><td className="border border-black p-1 text-right">{week.d.toFixed(2)}</td><td className="border border-black p-1 text-right bg-slate-400">{(week.e + week.cb + week.cq + week.d).toFixed(2)}</td></tr>);
                      week = { e: 0, cb: 0, cq: 0, d: 0, n: week.n + 1 };
                    }
                    return res;
                  });
                })()}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold"><tr className="text-right"><td className="p-2 text-left">TOTAL</td><td className="p-2">{totalMonthEsp.toFixed(2)}</td><td className="p-2">{totalMonthCB.toFixed(2)}</td><td className="p-2">{totalMonthChq.toFixed(2)}</td><td className="p-2">{totalMonthDep.toFixed(2)}</td><td className="p-2 bg-indigo-600">{grandTotalNet.toFixed(2)}</td></tr></tfoot>
            </table>
          </div>
         )}
      </main>
    </div>
  );
}
