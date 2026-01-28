"use client";

import React, { useState, useEffect } from 'react';
import {
  Calendar, Banknote, CreditCard, Receipt, ShoppingBag, Save, Edit2,
  ChevronLeft, ChevronRight, Download, X, Table as TableIcon, LayoutGrid,
  Trash2, RefreshCw, Lock, User, LogOut, Mail, PieChart as PieChartIcon,
  FileSpreadsheet, FileText, Printer, Eye, EyeOff, TrendingUp, Trophy
} from 'lucide-react';
import { format, addDays, subDays, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns';
import { fr } from 'date-fns/locale';
import { supabase } from '@/lib/supabase';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  // --- AUTH ---
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setCheckingSession(false); });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setLoadingAuth(true); setLoginError("");
    const { error } = await supabase.auth.signInWithPassword({ email: emailInput, password: passwordInput });
    if (error) setLoginError("Email ou mot de passe incorrect."); setLoadingAuth(false);
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
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [msgProfile, setMsgProfile] = useState("");

  // --- DATA LOADING ---
  const loadEntries = async () => {
    if (!session) return; setLoadingData(true);
    const { data, error } = await supabase.from('caisse_sophie').select('*').order('date', { ascending: true }).limit(10000);
    if (error) console.error(error); else {
      setEntries((data || []).map((d: any) => ({ ...d, especes: parseFloat(d.especes)||0, cb: parseFloat(d.cb)||0, cheques: parseFloat(d.cheques)||0, depenses: parseFloat(d.depenses)||0 })));
    }
    setLoadingData(false);
  };
  useEffect(() => { if (session) loadEntries(); }, [session]);

  useEffect(() => {
    const existing = entries.find(e => e.date === format(selectedDate, 'yyyy-MM-dd'));
    if (existing) { setFormData({ especes: existing.especes.toString(), cb: existing.cb.toString(), cheques: existing.cheques.toString(), depenses: existing.depenses.toString() }); setIsEditing(true); }
    else { setFormData({ especes: '', cb: '', cheques: '', depenses: '' }); setIsEditing(false); }
  }, [selectedDate, entries]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault(); if (newPassword.length < 6) { setMsgProfile("Mini 6 caractères."); return; }
    setLoadingAuth(true); const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setMsgProfile("Erreur: " + error.message); else { setMsgProfile("Succès !"); setTimeout(() => { setShowProfileModal(false); setMsgProfile(""); setNewPassword(""); }, 1500); }
    setLoadingAuth(false);
  };

  const handleSave = async () => {
    if (!session) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const entryData = { date: dateStr, especes: parseFloat(formData.especes || '0'), cb: parseFloat(formData.cb || '0'), cheques: parseFloat(formData.cheques || '0'), depenses: parseFloat(formData.depenses || '0') };
    const { error } = await supabase.from('caisse_sophie').upsert(entryData, { onConflict: 'date' });
    if (error) alert("Erreur : " + error.message); else { await loadEntries(); alert("Enregistré !"); } 
  };
  const handleDelete = async (dateStr: string) => { if (!session || !confirm("Supprimer ?")) return; const { error } = await supabase.from('caisse_sophie').delete().eq('date', dateStr); if (error) alert("Erreur"); else await loadEntries(); };
  const clearField = (field: keyof typeof formData) => setFormData(prev => ({ ...prev, [field]: '' }));

  // --- CALCULS GLOBAUX ---
  const currentMonthStr = format(selectedDate, 'MM-yyyy');
  const monthEntries = entries.filter(e => format(new Date(e.date), 'MM-yyyy') === currentMonthStr);
  const totalMonthEspeces = monthEntries.reduce((acc, e) => acc + e.especes, 0);
  const totalMonthCB = monthEntries.reduce((acc, e) => acc + e.cb, 0);
  const totalMonthCheques = monthEntries.reduce((acc, e) => acc + e.cheques, 0);
  const totalMonthDepenses = monthEntries.reduce((acc, e) => acc + e.depenses, 0);
  const totalCA = totalMonthEspeces + totalMonthCB + totalMonthCheques;
  const grandTotalNet = totalCA + totalMonthDepenses;
  const avgDay = monthEntries.length > 0 ? totalCA / monthEntries.length : 0;

  const totalDay = parseFloat(formData.especes || '0') + parseFloat(formData.cb || '0') + parseFloat(formData.cheques || '0') + parseFloat(formData.depenses || '0');
  const monthStart = startOfMonth(selectedDate);
  const monthEnd = endOfMonth(selectedDate);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const getDayData = (date: Date) => entries.find(e => e.date === format(date, 'yyyy-MM-dd')) || { especes: 0, cb: 0, cheques: 0, depenses: 0 };

  const dataPie = [{ name: 'Espèces', value: totalMonthEspeces, color: '#16a34a' }, { name: 'CB', value: totalMonthCB, color: '#2563eb' }, { name: 'Chèques', value: totalMonthCheques, color: '#9333ea' }].filter(d => d.value > 0);
  const dataBar = daysInMonth.map(day => ({ day: format(day, 'dd'), CA: getDayData(day).especes + getDayData(day).cb + getDayData(day).cheques }));

  // --- CALCUL MEILLEUR JOUR ---
  const getBestDay = () => {
    if (monthEntries.length === 0) return null;
    const daysCA: { [key: string]: { total: number, count: number } } = {};
    const dayNames = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
    
    monthEntries.forEach(e => {
        const d = new Date(e.date);
        const dayName = dayNames[d.getDay()];
        if (!daysCA[dayName]) daysCA[dayName] = { total: 0, count: 0 };
        daysCA[dayName].total += (e.especes + e.cb + e.cheques);
        daysCA[dayName].count += 1;
    });

    const averages = Object.keys(daysCA).map(name => ({
        name,
        avg: daysCA[name].total / daysCA[name].count
    }));

    return averages.sort((a, b) => b.avg - a.avg)[0];
  };
  const bestDayInfo = getBestDay();

  // --- EXPORTS ---
  const downloadFile = (content: string, fileName: string, contentType: string) => {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.setAttribute("download", fileName);
    document.body.appendChild(link); link.click();
    setShowExportMenu(false);
  };

  const handleExportCSV = (period: 'month' | 'year') => {
    let dataToExport = [];
    if (period === 'month') dataToExport = monthEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    else {
      const year = format(selectedDate, 'yyyy');
      dataToExport = entries.filter(e => format(new Date(e.date), 'yyyy') === year).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
    if (dataToExport.length === 0) return;
    let csv = "\uFEFFDate;Espèces;CB;Chèques;Dépenses;Total\n";
    dataToExport.forEach(e => {
      const t = e.especes + e.cb + e.cheques + e.depenses;
      csv += `${format(new Date(e.date), 'dd/MM/yyyy')};${e.especes.toString().replace('.',',')};${e.cb.toString().replace('.',',')};${e.cheques.toString().replace('.',',')};${e.depenses.toString().replace('.',',')};${t.toString().replace('.',',')}\n`;
    });
    downloadFile(csv, `Export_Caisse_${period}.csv`, "text/csv;charset=utf-8;");
  };

  const handleGeneratePDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16); doc.text(`Bilan de Caisse - ${format(selectedDate, 'MMMM yyyy', { locale: fr }).toUpperCase()}`, 14, 20);
    const tableRows: any[] = [];
    let week = { e: 0, cb: 0, cq: 0, d: 0, n: 1 };
    daysInMonth.forEach((day, index) => {
      const d = getDayData(day); const t = d.especes + d.cb + d.cheques + d.depenses;
      week.e += d.especes; week.cb += d.cb; week.cq += d.cheques; week.d += d.depenses;
      tableRows.push([format(day, 'EEE d', { locale: fr }), d.especes?d.especes.toFixed(2):'', d.cb?d.cb.toFixed(2):'', d.cheques?d.cheques.toFixed(2):'', d.depenses?d.depenses.toFixed(2):'', t?t.toFixed(2):'']);
      if (day.getDay() === 0 || index === daysInMonth.length - 1) {
        tableRows.push([{ content: `Total Semaine ${week.n}`, styles: { fontStyle: 'italic', fillColor: [240, 240, 240] } }, week.e.toFixed(2), week.cb.toFixed(2), week.cq.toFixed(2), { content: week.d.toFixed(2), styles: { textColor: [200, 0, 0] } }, { content: (week.e+week.cb+week.cq+week.d).toFixed(2), styles: { fontStyle: 'bold' } }]);
        week = { e: 0, cb: 0, cq: 0, d: 0, n: week.n + 1 };
      }
    });
    tableRows.push([{ content: 'TOTAUX MOIS', styles: { fontStyle: 'bold', fillColor: [50, 50, 50], textColor: [255, 255, 255] } }, totalMonthEspeces.toFixed(2), totalMonthCB.toFixed(2), totalMonthCheques.toFixed(2), totalMonthDepenses.toFixed(2), { content: grandTotalNet.toFixed(2), styles: { fontStyle: 'bold', fillColor: [79, 70, 229], textColor: [255, 255, 255] } }]);
    autoTable(doc, { head: [['Jour', 'Espèces', 'CB', 'Chèques', 'Dépenses', 'Total']], body: tableRows, startY: 30, theme: 'grid', styles: { fontSize: 8 } });
    doc.save(`Caisse_${format(selectedDate, 'MM-yyyy')}.pdf`);
    setShowExportMenu(false);
  };

  if (checkingSession) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><RefreshCw className="animate-spin text-indigo-600" /></div>;

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-sm text-center space-y-6">
          <Lock className="w-16 h-16 mx-auto text-indigo-600 bg-indigo-50 p-4 rounded-full" />
          <h1 className="text-2xl font-bold">Caisse de Sophie</h1>
          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <input type="email" value={emailInput} onChange={(e) => setEmailInput(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500" placeholder="Email" />
            <div className="relative"><input type={showPassword ? "text" : "password"} value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} className="w-full border-2 p-3 rounded-xl outline-none focus:border-indigo-500 pr-10" placeholder="Mot de passe" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
            {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
            <button type="submit" disabled={loadingAuth} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl transition-all active:scale-95">{loadingAuth ? '...' : 'Se connecter'}</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20 relative">
      {/* MODAL PROFIL */}
      {showProfileModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <div className="flex justify-between items-center mb-4"><h3 className="font-bold">Mot de passe</h3><X className="cursor-pointer" onClick={() => setShowProfileModal(false)} /></div>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="relative"><input type={showPassword ? "text" : "password"} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Nouveau mot de passe" className="w-full border-2 p-3 rounded-xl pr-10" autoFocus /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3 text-slate-400">{showPassword ? <EyeOff size={20} /> : <Eye size={20} />}</button></div>
              {msgProfile && <p className="text-xs text-center font-bold">{msgProfile}</p>}
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">Valider</button>
            </form>
          </div>
        </div>
      )}

      <header className="bg-indigo-600 text-white p-6 rounded-b-3xl print:hidden shadow-lg">
        <div className="max-w-md mx-auto flex justify-between items-center relative">
          <div><h1 className="font-bold text-xl">Caisse de Sophie</h1><button onClick={() => setShowProfileModal(true)} className="text-xs opacity-80 flex items-center gap-1 hover:underline"><User size={12} /> {session.user.email}</button></div>
          <div className="flex gap-3 relative">
            <div className="relative">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className={`bg-white/20 p-2 rounded-full transition hover:bg-white/30 ${showExportMenu ? 'bg-white/40 ring-2 ring-white' : ''}`}><Download size={20} /></button>
              {showExportMenu && (
                <div className="absolute right-0 top-12 bg-white text-slate-800 rounded-xl shadow-2xl p-3 w-64 z-50 border border-slate-100 animate-in fade-in zoom-in duration-200">
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-3 pb-2">Exporter le Mois</div>
                  <button onClick={() => handleExportCSV('month')} className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-3 font-medium text-sm"><FileSpreadsheet size={16} className="text-green-600" /> CSV ({format(selectedDate, 'MMM yyyy', {locale:fr})})</button>
                  <button onClick={handleGeneratePDF} className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-3 font-bold text-indigo-600 text-sm"><Printer size={16} /> PDF Tableau (A4)</button>
                  <div className="text-[10px] font-bold text-slate-400 uppercase px-3 pt-3 pb-2 border-t mt-2">Exporter l'Année</div>
                  <button onClick={() => handleExportCSV('year')} className="w-full text-left px-3 py-2 hover:bg-indigo-50 rounded-lg flex items-center gap-3 font-medium text-sm"><FileSpreadsheet size={16} className="text-green-700" /> CSV ({format(selectedDate, 'yyyy')})</button>
                  <div className="h-px bg-slate-100 my-2"></div>
                  <button onClick={() => { window.print(); setShowExportMenu(false); }} className="w-full text-left px-3 py-3 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-3 font-medium text-sm justify-center"><Printer size={18} /> Imprimer Page Web</button>
                </div>
              )}
            </div>
            <button onClick={handleLogout} className="bg-red-500/20 p-2 rounded-full hover:bg-red-500/40 transition text-red-100"><LogOut size={20} /></button>
          </div>
        </div>

        <div className={`max-w-md mx-auto flex justify-between items-center mt-6`}>
          <button onClick={() => setSelectedDate(subDays(selectedDate, viewMode === 'form' ? 1 : 30))}><ChevronLeft /></button>
          <div className="text-center relative group cursor-pointer">
            <div className="text-xs uppercase opacity-70 font-bold group-hover:opacity-100 transition">{viewMode === 'form' ? format(selectedDate, 'EEEE', { locale: fr }) : 'Mois de'}</div>
            <div className="text-xl font-bold flex items-center justify-center gap-2">{format(selectedDate, viewMode === 'form' ? 'd MMMM yyyy' : 'MMMM yyyy', { locale: fr })} <Calendar size={16} className="opacity-50" /></div>
            <input type="date" className="absolute inset-0 opacity-0 cursor-pointer" value={format(selectedDate, 'yyyy-MM-dd')} onChange={(e) => { if(e.target.valueAsDate) setSelectedDate(e.target.valueAsDate); }} />
          </div>
          <button onClick={() => setSelectedDate(addDays(selectedDate, viewMode === 'form' ? 1 : 30))}><ChevronRight /></button>
        </div>

        <div className="max-w-xs mx-auto flex bg-indigo-800/50 p-1 rounded-xl mt-6">
          <button onClick={() => setViewMode('form')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'form' ? 'bg-white text-indigo-600' : ''}`}><LayoutGrid size={16}/> Saisie</button>
          <button onClick={() => setViewMode('table')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'table' ? 'bg-white text-indigo-600' : ''}`}><TableIcon size={16}/> Tableau</button>
          <button onClick={() => setViewMode('stats')} className={`flex-1 py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 ${viewMode === 'stats' ? 'bg-white text-indigo-600' : ''}`}><PieChartIcon size={16}/> Bilan</button>
        </div>
      </header>

      <main className={`p-4 mx-auto ${viewMode === 'table' ? 'max-w-[98%] md:max-w-5xl' : 'max-w-md'} ${viewMode === 'stats' ? 'max-w-xl print:max-w-full' : ''} -mt-4 print:mt-0`}>
        {loadingData ? <div className="text-center p-10"><RefreshCw className="animate-spin inline text-indigo-500" /></div> : 
         viewMode === 'form' ? (
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl space-y-5 border border-slate-100">
              <h2 className="font-bold flex items-center gap-2 text-slate-800 border-b pb-4"><Calendar size={20} className="text-indigo-500"/> {isEditing ? 'Modification du jour' : 'Saisie du jour'}</h2>
              {[{id:'especes', label:'Espèces', icon:Banknote, color:'text-green-600'}, {id:'cb', label:'Carte Bancaire', icon:CreditCard, color:'text-blue-600'}, {id:'cheques', label:'Chèques', icon:Receipt, color:'text-purple-600'}, {id:'depenses', label:'Dépenses Espèces', icon:ShoppingBag, color:'text-red-600'}].map(f => (
                <div key={f.id} className="relative">
                  <label className="text-[10px] uppercase font-bold text-slate-400 ml-1">{f.label}</label>
                  <div className="relative">
                    <div className={`absolute left-4 top-1/2 -translate-y-1/2 ${f.color}`}>{<f.icon size={20} />}</div>
                    <input type="number" value={formData[f.id as keyof typeof formData]} onChange={(e) => setFormData({...formData, [f.id]: e.target.value})} onFocus={e => e.target.select()} className="w-full bg-slate-50 p-4 pl-12 rounded-2xl border-2 border-slate-100 outline-none focus:border-indigo-500 font-bold text-lg" placeholder="0.00" />
                    {formData[f.id as keyof typeof formData] && <X className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 cursor-pointer" onClick={() => clearField(f.id as keyof typeof formData)} />} 
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center bg-indigo-50 p-5 rounded-2xl font-bold mt-4"><span className="text-indigo-900">Total Journée</span><span className="text-2xl text-indigo-600">{totalDay.toFixed(2)} €</span></div>
              <button onClick={handleSave} className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl shadow-lg flex justify-center gap-3 active:scale-95 transition-all"><Save size={24}/> {isEditing ? 'Mettre à jour' : 'Enregistrer'}</button>
            </div>
            <div className="space-y-3 pb-10">
              <h3 className="text-[10px] uppercase font-bold text-slate-400 ml-2 tracking-widest">Historique récent</h3>
              {entries.slice(-5).reverse().map(e => (
                <div key={e.date} className="bg-white/70 p-4 rounded-2xl flex justify-between items-center border border-white shadow-sm">
                  <div><div className="font-bold capitalize text-slate-700">{format(new Date(e.date), 'EEEE d MMMM', { locale: fr })}</div><div className="text-xs text-slate-500 font-medium">{(e.cb + e.especes + e.cheques + e.depenses).toFixed(2)} €</div></div>
                  <div className="flex gap-2"><button onClick={() => setSelectedDate(new Date(e.date))} className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Edit2 size={18} /></button><button onClick={() => handleDelete(e.date)} className="p-2 bg-red-50 text-red-500 rounded-xl"><Trash2 size={18} /></button></div>
                </div>
              ))}
              <button onClick={() => setViewMode('table')} className="w-full py-4 text-sm font-bold text-indigo-500 bg-indigo-50 hover:bg-indigo-100 rounded-2xl transition flex items-center justify-center gap-2 border border-indigo-100"><TableIcon size={18} /> Voir tout le mois</button>
            </div>
          </div>
         ) : viewMode === 'stats' ? (
          <div className="space-y-6 pb-12 print:space-y-4 print:pb-0">
            {monthEntries.length === 0 ? <div className="bg-white p-12 rounded-3xl text-center font-bold text-slate-400 border-2 border-dashed">Aucune donnée</div> : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 col-span-2">
                    <div className="text-xs font-bold text-slate-400 uppercase mb-1 tracking-widest">Chiffre d'Affaires</div>
                    <div className="text-4xl font-black text-slate-800">{totalCA.toFixed(2)} €</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Dépenses</div>
                    <div className="text-xl font-bold text-red-500">{totalMonthDepenses.toFixed(2)} €</div>
                  </div>
                  <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Moy/Jour</div>
                    <div className="text-xl font-bold text-indigo-600">{avgDay.toFixed(0)} €</div>
                  </div>
                </div>

                {/* CARTE INTELLIGENTE : MEILLEUR JOUR */}
                {bestDayInfo && (
                    <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 p-6 rounded-3xl text-white shadow-lg flex items-center justify-between">
                        <div>
                            <div className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1 flex items-center gap-2"><Trophy size={14}/> Performance</div>
                            <div className="text-2xl font-bold">Le {bestDayInfo.name}</div>
                            <div className="text-sm opacity-90 mt-1">est votre meilleur jour avec une moyenne de <span className="font-black text-white">{bestDayInfo.avg.toFixed(2)} €</span></div>
                        </div>
                        <TrendingUp size={48} className="text-white/20" />
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:grid-cols-2">
                    <div className="bg-white p-6 rounded-3xl shadow-sm h-80 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2"><PieChartIcon size={18} className="text-indigo-500"/> Répartition</h3>
                        <ResponsiveContainer width="100%" height="90%"><PieChart><Pie data={dataPie} innerRadius={60} outerRadius={85} paddingAngle={5} dataKey="value" stroke="none">{dataPie.map((entry, index) => (<Cell key={index} fill={entry.color} />))}</Pie><Tooltip /><Legend /></PieChart></ResponsiveContainer>
                    </div>
                    <div className="bg-white p-6 rounded-3xl shadow-sm h-80 border border-slate-100">
                        <h3 className="text-sm font-bold text-slate-800 mb-4">Évolution</h3>
                        <ResponsiveContainer width="100%" height="90%"><BarChart data={dataBar}><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fontSize: 10}} /><Tooltip cursor={{fill: '#f8fafc'}} /><Bar dataKey="CA" fill="#6366f1" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
                    </div>
                </div>
              </>
            )}
          </div>
         ) : (
          <div className="bg-white p-1 shadow-2xl rounded-2xl print:shadow-none print:p-0 overflow-visible">
            <table className="w-full border-collapse text-xs md:text-sm">
              <thead><tr className="bg-slate-100 print:bg-slate-200"><th className="border border-slate-400 p-2 text-left w-28 font-bold print:border-black">Jour</th><th className="border border-slate-400 p-2 text-right font-bold print:border-black">Espèces</th><th className="border border-slate-400 p-2 text-right font-bold print:border-black">CB</th><th className="border border-slate-400 p-2 text-right font-bold print:border-black">Chèques</th><th className="border border-slate-400 p-2 text-right font-bold print:border-black">Dépenses</th><th className="border border-slate-400 p-2 text-right font-bold bg-slate-200 print:bg-slate-300 print:border-black">Total</th></tr></thead>
              <tbody>
                {(() => {
                  let week = { e: 0, cb: 0, cq: 0, d: 0, n: 1 };
                  return daysInMonth.flatMap((day, i) => {
                    const d = getDayData(day); week.e += d.especes; week.cb += d.cb; week.cq += d.cheques; week.d += d.depenses;
                    const res = [<tr key={`d-${day.toString()}`} className={day.getDay() === 0 ? 'bg-slate-50' : ''}><td className="border border-slate-300 p-1.5 capitalize print:border-black">{format(day, 'EEE d', { locale: fr })}</td><td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.especes?d.especes.toFixed(2):''}</td><td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.cb?d.cb.toFixed(2):''}</td><td className="border border-slate-300 p-1.5 text-right font-mono print:border-black">{d.cheques?d.cheques.toFixed(2):''}</td><td className="border border-slate-300 p-1.5 text-right font-mono text-red-500 print:border-black">{d.depenses?d.depenses.toFixed(2):''}</td><td className="border border-slate-300 p-1.5 text-right font-bold bg-slate-50 print:border-black">{(d.especes+d.cb+d.cheques+d.depenses)?(d.especes+d.cb+d.cheques+d.depenses).toFixed(2):''}</td></tr>];
                    if (day.getDay() === 0 || i === daysInMonth.length - 1) {
                      res.push(<tr key={`w-${week.n}`} className="bg-slate-300 font-bold border-t-2 border-slate-800 print:border-black"><td className="border border-slate-400 p-1.5 italic text-[10px] print:border-black">Total Sem {week.n}</td><td className="border border-slate-400 p-1.5 text-right print:border-black">{week.e.toFixed(2)}</td><td className="border border-slate-400 p-1.5 text-right print:border-black">{week.cb.toFixed(2)}</td><td className="border border-slate-400 p-1.5 text-right print:border-black">{week.cq.toFixed(2)}</td><td className="border border-slate-400 p-1.5 text-right text-red-900 print:border-black">{week.d.toFixed(2)}</td><td className="border border-slate-400 p-1.5 text-right bg-slate-400 print:border-black">{(week.e+week.cb+week.cq+week.d).toFixed(2)}</td></tr>);
                      week = { e: 0, cb: 0, cq: 0, d: 0, n: week.n + 1 };
                    }
                    return res;
                  });
                })()}
              </tbody>
              <tfoot className="bg-slate-800 text-white font-bold border-t-2 border-black"><tr className="text-right"><td className="p-2 text-left uppercase text-xs">TOTAUX MENSUELS</td><td className="p-2 font-mono">{totalMonthEspeces.toFixed(2)}</td><td className="p-2 font-mono">{totalMonthCB.toFixed(2)}</td><td className="p-2 font-mono">{totalMonthCheques.toFixed(2)}</td><td className="p-2 font-mono">{totalMonthDepenses.toFixed(2)}</td><td className="p-2 bg-indigo-500 font-mono text-lg">{grandTotalNet.toFixed(2)}</td></tr></tfoot>
            </table>
          </div>
         )}
      </main>
    </div>
  );
}
