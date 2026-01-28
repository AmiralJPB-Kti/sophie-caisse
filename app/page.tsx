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
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

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
  
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [msgProfile, setMsgProfile] = useState("");

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) { setMsgProfile("Mini 6 caractères."); return; }
    setLoadingAuth(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMsgProfile("Erreur: " + error.message);
    else {
      setMsgProfile("Succès !");
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
    else {
      const cleanData = (data || []).map((d: any) => ({
        ...d,
        especes: parseFloat(d.especes) || 0,
        cb: parseFloat(d.cb) || 0,
        cheques: parseFloat(d.cheques) || 0,
        depenses: parseFloat(d.depenses) || 0
      }));
      setEntries(cleanData);
    }
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

  // --- ACTIONS ---
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
    if (!session || !confirm("Supprimer cette entrée ?")) return;
    const { error } = await supabase.from('caisse_sophie').delete().eq('date', dateStr);
    if (error) alert("Erreur");
    else await loadEntries();
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
  const totalMonthEspeces = monthEntries.reduce((acc, e) => acc + e.especes, 0);
  const totalMonthCB = monthEntries.reduce((acc, e) => acc + e.cb, 0);
  const totalMonthCheques = monthEntries.reduce((acc, e) => acc + e.cheques, 0);
  const totalMonthDepenses = monthEntries.reduce((acc, e) => acc + e.depenses, 0);
  const totalCA = totalMonthEspeces + totalMonthCB + totalMonthCheques;
  const grandTotalNet = totalCA + totalMonthDepenses;
  const avgDay = monthEntries.length > 0 ? totalCA / monthEntries.length : 0;

  const dataPie = [{ name: 'Espèces', value: totalMonthEspeces, color: '#16a34a' }, { name: 'CB', value: totalMonthCB, color: '#2563eb' }, { name: 'Chèques', value: totalMonthCheques, color: '#9333ea' }].filter(d => d.value > 0);
  const dataBar = daysInMonth.map(day => ({ day: format(day, 'dd'), CA: getDayData(day).especes + getDayData(day).cb + getDayData(day).cheques }));

  if (checkingSession) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-indigo-600 bg-indigo-50 p-4 rounded-full" />
          <h1 className="text-2xl font-bold text-slate-800">Caisse de Sophie</h1>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Email</label><div className="relative"><Mail className="absolute left-3 top-3 text-slate-400" size={20} /><input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500 pl-10" placeholder="sophie@exemple.com" /></div></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Mot de passe</label><div className="relative"><Lock className="absolute left-3 top-3 text-slate-400" size={20} /><input type="password" value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500 pl-10" placeholder="••••••••" /></div></div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95">{loadingAuth ? 'Connexion...' : 'Se connecter'}</button>
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
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Mot de passe</h3><X className="cursor-pointer" onClick={() => setShowProfileModal(false)} /></div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full border-2 p-3 rounded-xl" autoFocus />
              {msgProfile && <p className="text-xs text-center font-bold">{msgProfile}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Valider</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl print:hidden shadow-lg">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <div><h1 className="font-bold text-xl">Caisse de Sophie</h1><button onClick={() => setShowProfileModal(true)} className="text-xs opacity-80 flex items-center gap-1 hover:underline"><User size={12} /> {session.user.email} (Modifier)</button></div>
          <div className="flex gap-3"><Download className="cursor-pointer hover:scale-110 transition" onClick={() => window.print()} /><LogOut className="cursor-pointer hover:scale-110 transition" onClick={handleLogout} /></div>
        </div>
        <div className="max-w-md mx-auto flex justify-between items-center mt-6">
          <button onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'form' ? 1 : 30))}><ChevronLeft /></button>
          <div className="text-center"><div className="text-xs uppercase opacity-70 font-bold">{format(selectedDate, viewMode === 'form' ? 'EEEE' : 'MMMM', { locale: fr })}</div><div className="text-xl font-bold">{format(selectedDate, viewMode === 'form' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: fr })}</div></div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'form' ? 1 : 30))}><ChevronRight /></button>
        </div>
        <div className="max-w-xs mx-auto flex bg-indigo-800/50 p-1 rounded-xl mt-6">
          <button onClick={() => setViewMode('form')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'form' ? 'bg-white text-indigo-600' : ''}`}><LayoutGrid size={16}/> Saisie</button>
          <button onClick={() => setViewMode('table')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'table' ? 'bg-white text-indigo-600' : ''}`}><TableIcon size={16}/> Tableau</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'stats' ? 'bg-white text-indigo-600' : ''}`}><PieChartIcon size={16}/> Bilan</button>
        </div>
      </header>

      <div className="hidden print:block text-center mt-8 mb-8"><h1 className="text-2xl font-bold border-b-2 border-black pb-2 inline-block">FEUILLE DE REMISE DE CAISSE - {format(selectedDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}</h1></div>

      <main className={`p-4 mx-auto ${viewMode === 'table' ? 'max-w-[98%] md:max-w-5xl' : 'max-w-md'} ${viewMode === 'stats' ? 'max-w-xl' : ''}`}>
        {loadingData ? <div className="text-center p-10"><RefreshCw className="animate-spin inline text-indigo-500" /></div> : 
         viewMode === 'form' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl space-y-5 border border-slate-100">
              <h2 className="font-bold flex items-center gap-2 text-slate-800 border-b pb-4"><Calendar size={20} className="text-indigo-500"/> {isEditing ? 'Modification du jour' : 'Saisie du jour'}</h2>
              {[
                {id:'especes', label:'Espèces', icon:Banknote, color:'text-green-600'},
                {id:'cb', label:'Carte Bancaire', icon:CreditCard, color:'text-blue-600'},
                {id:'cheques', label:'Chèques', icon:Receipt, color:'text-purple-600'},
                {id:'depenses', label:'Dépenses Espèces', icon:ShoppingBag, color:'text-red-600'}
              ].map(f => (
                <div key={f.id} className="relative">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">{f.label}</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${f.color}`}><f.icon size={20} /></div>
                    <input type="number" value={formData[f.id as keyof typeof formData]} onChange={(e) => setFormData({...formData, [f.id]: e.target.value})} onFocus={e => e.target.select()} className="w-full bg-slate-50 p-4 pl-12 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-lg" placeholder="0.00" />
                    {formData[f.id as keyof typeof formData] && <X className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 cursor-pointer" onClick={() => clearField(f.id as keyof typeof formData)} />}
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center bg-indigo-50 p-5 rounded-2xl font-bold mt-4"><span className="text-indigo-900">Total Journée</span><span className="text-2xl text-indigo-600">{totalDay.toFixed(2)} €</span></div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-lg flex justify-center gap-3 transition-all active:scale-95"><Save size={24}/> {isEditing ? 'Mettre à jour la caisse' : 'Enregistrer la caisse'}</button>
            </div>
            <div className="space-y-3">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 ml-2 tracking-widest">Historique récent</h3>
              {entries.slice(-5).reverse().map(e => (
                <div key={e.date} className="bg-white/70 p-4 rounded-2xl flex justify-between items-center border border-white shadow-sm">
                  <div><div className="font-bold capitalize text-slate-700">{format(new Date(e.date), 'EEEE d MMMM', { locale: fr })}</div><div className="text-xs text-slate-500 font-medium">Total : {(e.cb + e.especes + e.cheques + e.depenses).toFixed(2)} €</div></div>
                  <div className="flex gap-2"><button onClick={() => setSelectedDate(new Date(e.date))} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition"><Edit2 size={18} /></button><button onClick={() => handleDelete(e.date)} className="p-2 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition"><Trash2 size={18} /></button></div>
                </div>
              ))}
              <button onClick={() => { setViewMode('table'); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="w-full py-4 text-sm font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition flex items-center justify-center gap-2 border border-indigo-100"><TableIcon size={18} /> Voir tout le mois dans le tableau</button>
            </div>
          </div>
         ) : viewMode === 'stats' ? (
          <div className="space-y-6 pb-10">
            {monthEntries.length === 0 ? <div className="bg-white p-12 rounded-3xl text-center font-bold text-slate-400 border-2 border-dashed">Aucune donnée pour ce mois</div> : (
              <>
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100"><div className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Chiffre d'Affaires</div><div className="text-5xl font-black text-slate-800">{totalCA.toFixed(2)} €</div></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dépenses</div><div className="text-2xl font-black text-red-500">{totalMonthDepenses.toFixed(2)} €</div></div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100"><div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Moy/Jour</div><div className="text-2xl font-black text-indigo-600">{avgDay.toFixed(0)} €</div></div>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm h-72 border border-slate-100" style={{ minHeight: '300px' }}>
                   <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChartIcon size={18} className="text-indigo-500"/> Répartition des encaissements</h3>
                   <ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={dataPie} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">{dataPie.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                </div>
                <div className="bg-white p-6 rounded-3xl shadow-sm h-72 border border-slate-100" style={{ minHeight: '300px' }}>
                   <h3 className="text-sm font-bold text-slate-800 mb-4">Évolution quotidienne</h3>
                   <ResponsiveContainer width="100%" height="90%"><BarChart data={dataBar}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '12px', border:'none'}} /><Bar dataKey="CA" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                </div>
              </>
            )}
          </div>
         ) : (
          <div className="bg-white p-1 shadow-2xl rounded-2xl print:shadow-none print:p-0 overflow-visible">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead>
                <tr className="bg-slate-100 print:bg-slate-200">
                  <th className="border border-slate-400 p-2 text-left w-28 font-bold print:border-black">Jour</th>
                  <th className="border border-slate-400 p-2 text-right font-bold print:border-black">Espèces</th>
                  <th className="border border-slate-400 p-2 text-right font-bold print:border-black">CB</th>
                  <th className="border border-slate-400 p-2 text-right font-bold print:border-black">Chèques</th>
                  <th className="border border-slate-400 p-2 text-right font-bold print:border-black">Dépenses</th>
                  <th className="border border-slate-400 p-2 text-right font-bold bg-slate-200 print:bg-slate-300 print:border-black">Total</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  let week = { e: 0, cb: 0, cq: 0, d: 0, n: 1 };
                  return daysInMonth.flatMap((day, i) => {
                    const d = getDayData(day);
                    week.e += d.especes; week.cb += d.cb; week.cq += d.cheques; week.d += d.depenses;
                    const res = [<tr key={`d-${day.toString()}`} className={day.getDay() === 0 ? 'bg-slate-50' : ''}>
                      <td className="border border-slate-300 p-1.5 capitalize print:border-black">{format(day, 'EEE d', { locale: fr })}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.especes ? d.especes.toFixed(2) : ''}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.cb ? d.cb.toFixed(2) : ''}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.cheques ? d.cheques.toFixed(2) : ''}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono text-red-500 print:border-black">{d.depenses ? d.depenses.toFixed(2) : ''}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-bold bg-slate-50 print:border-black">{(d.especes + d.cb + d.cheques + d.depenses) ? (d.especes + d.cb + d.cheques + d.depenses).toFixed(2) : ''}</td>
                    </tr>];
                    if (day.getDay() === 0 || i === daysInMonth.length - 1) {
                      res.push(<tr key={`w-${week.n}`} className="bg-slate-300 font-bold border-t-2 border-slate-800 print:border-black">
                        <td className="border border-slate-400 p-1.5 italic text-[10px] print:border-black">Total Sem {week.n}</td>
                        <td className="border border-slate-400 p-1.5 text-right print:border-black">{week.e.toFixed(2)}</td>
                        <td className="border border-slate-400 p-1.5 text-right print:border-black">{week.cb.toFixed(2)}</td>
                        <td className="border border-slate-400 p-1.5 text-right print:border-black">{week.cq.toFixed(2)}</td>
                        <td className="border border-slate-400 p-1.5 text-right text-red-900 print:border-black">{week.d.toFixed(2)}</td>
                        <td className="border border-slate-400 p-1.5 text-right bg-slate-400 print:border-black">{(week.e + week.cb + week.cq + week.d).toFixed(2)}</td>
                      </tr>);
                      week = { e: 0, cb: 0, cq: 0, d: 0, n: week.n + 1 };
                    }
                    return res;
                  });
                })()}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold border-t-2 border-black">
                <tr className="text-right">
                  <td className="p-2 text-left uppercase text-xs">TOTAUX MENSUELS</td>
                  <td className="p-2 font-mono">{totalMonthEspeces.toFixed(2)}</td>
                  <td className="p-2 font-mono">{totalMonthCB.toFixed(2)}</td>
                  <td className="p-2 font-mono">{totalMonthCheques.toFixed(2)}</td>
                  <td className="p-2 font-mono">{totalMonthDepenses.toFixed(2)}</td>
                  <td className="p-2 bg-indigo-500 font-mono text-lg">{grandTotalNet.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
         )}
      </main>
    </div>
  );
}
