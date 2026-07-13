'use client';
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { DEMO_DATA } from './dashboard/lib/config';
import { saveLS, loadLS } from './dashboard/lib/utils';
 
const ERPContext = createContext(null);
 
export function ERPProvider({ children }) {
  const [db, setDb] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [scriptURL, setScriptURL] = useState('');
  const [currentUser, setCurrentUser] = useState(null); // role string
  const [activePage, setActivePage] = useState('overview');
  const [selectedYear, setSelectedYear] = useState('2025');
 
  // Notifications / Approvals / Messages (local)
  const [messages,  setMessages]  = useState([]);
  const [notifs,    setNotifs]     = useState([]);
  const [approvals, setApprovals]  = useState([]);
  const [audit,     setAudit]      = useState([]);
 
  // Store module data
  const [srvReceipts, setSrvReceipts] = useState([]);
  const [stockReg,    setStockReg]    = useState([]);
  const [stockOut,    setStockOut]    = useState([]);
  const [expired,     setExpired]     = useState([]);
  const [purchaseOrders, setPOs]      = useState([]);
  const [invoices,    setInvoices]    = useState([]);
  const [receipts,    setReceipts]    = useState([]);
  const [p2pList,     setP2pList]     = useState([]);
  const [assets,      setAssets]      = useState([]);
 
  // Load saved data from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    setScriptURL(localStorage.getItem('rhvScriptURL') || '');
    setMessages(loadLS('rhvMessages', seedMessages()));
    setNotifs(loadLS('rhvNotifs', seedNotifs()));
    setApprovals(loadLS('rhvApprovals', seedApprovals()));
    setAudit(loadLS('rhvAudit', seedAudit()));
    setSrvReceipts(loadLS('rhvSRV', []));
    setStockReg(loadLS('rhvStockReg', []));
    setStockOut(loadLS('rhvStockOut', []));
    setExpired(loadLS('rhvExpired', []));
    setPOs(loadLS('rhvPO', []));
    setInvoices(loadLS('rhvInvoices', []));
    setReceipts(loadLS('rhvReceipts', []));
    setP2pList(loadLS('rhvP2P', []));
    setAssets(loadLS('rhvAssets', []));
  }, []);
 
  const fetchData = useCallback(async (role, year) => {
    const savedURL = typeof window !== 'undefined' ? localStorage.getItem('rhvScriptURL') : null;
    const token = {
      admin:'rhv-admin-2024', revenue:'rhv-revenue-2024', store:'rhv-store-2024',
      payables:'rhv-payables-2024', procurement:'rhv-procurement-2024',
      pharmacy:'rhv-pharmacy-2024', lab:'rhv-lab-2024', radiology:'rhv-radiology-2024',
      ophthal:'rhv-ophthal-2024', cssd:'rhv-cssd-2024', coo:'rhv-admin-2024', ceo:'rhv-admin-2024',
    }[role] || '';
 
    if (!token || !savedURL) {
      setDb({ ...DEMO_DATA, meta: { workbook: 'RHV Finance (Demo Mode)' } });
      setIsLive(false);
      return;
    }
    try {
      const res = await fetch(`${savedURL}?token=${token}&action=all&year=${year}`, { redirect: 'follow' });
      const text = await res.text();
      const match = text.match(/\{[\s\S]*\}/);
      const j = match ? JSON.parse(match[0]) : {};
      if (j.error || !j.revenue) throw new Error(j.error || 'No revenue data');
      setDb(j);
      setIsLive(true);
    } catch {
      setDb({ ...DEMO_DATA, meta: { workbook: 'RHV Finance (Demo Mode)' } });
      setIsLive(false);
    }
  }, []);
 
  const login = useCallback((role) => {
    setCurrentUser(role);
    fetchData(role, selectedYear);
  }, [fetchData, selectedYear]);
 
  const logout = useCallback(() => {
    setCurrentUser(null);
    setDb(null);
    setActivePage('overview');
  }, []);
 
  const addAuditEntry = useCallback((module, action, prev, next, ref) => {
    const entry = {
      time: new Date().toLocaleDateString('en-GB', { day:'2-digit', month:'short' }) + ' · ' +
            new Date().toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' }),
      user: currentUser || 'system', module, action, prev: prev || '—', next: next || '—', ref: ref || '—',
    };
    setAudit(prev => { const n=[entry,...prev].slice(0,200); saveLS('rhvAudit',n); return n; });
  }, [currentUser]);
 
  const addNotif = useCallback((type, icon, title, body, priority='info') => {
    const n = {
      id: Date.now(), type, icon, title, body,
      time: new Date().toLocaleDateString('en-GB',{day:'2-digit',month:'short'}) + ' · ' +
            new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'}),
      read: false, priority,
    };
    setNotifs(prev => { const arr=[n,...prev].slice(0,100); saveLS('rhvNotifs',arr); return arr; });
  }, []);
 
  // Save helpers
  const savePOs     = (arr) => { setPOs(arr);      saveLS('rhvPO',arr); };
  const saveSRV     = (arr) => { setSrvReceipts(arr); saveLS('rhvSRV',arr); };
  const saveStock   = (arr) => { setStockReg(arr); saveLS('rhvStockReg',arr); };
  const saveOut     = (arr) => { setStockOut(arr); saveLS('rhvStockOut',arr); };
  const saveExp     = (arr) => { setExpired(arr);  saveLS('rhvExpired',arr); };
  const saveInvoices= (arr) => { setInvoices(arr); saveLS('rhvInvoices',arr); };
  const saveReceipts= (arr) => { setReceipts(arr); saveLS('rhvReceipts',arr); };
  const saveP2P     = (arr) => { setP2pList(arr);  saveLS('rhvP2P',arr); };
  const saveAssets  = (arr) => { setAssets(arr);   saveLS('rhvAssets',arr); };
  const saveApprovals=(arr) => { setApprovals(arr);saveLS('rhvApprovals',arr); };
  const saveMessages =(arr) => { setMessages(arr); saveLS('rhvMessages',arr); };
  const saveNotifs   =(arr) => { setNotifs(arr);   saveLS('rhvNotifs',arr); };
 
  return (
    <ERPContext.Provider value={{
      db, isLive, scriptURL, setScriptURL,
      currentUser, login, logout,
      activePage, setActivePage,
      selectedYear, setSelectedYear,
      fetchData,
      // comms
      messages, setMessages: saveMessages,
      notifs, setNotifs: saveNotifs,
      approvals, setApprovals: saveApprovals,
      audit, addAuditEntry, addNotif,
      // store
      srvReceipts, setSrvReceipts: saveSRV,
      stockReg, setStockReg: saveStock,
      stockOut, setStockOut: saveOut,
      expired, setExpired: saveExp,
      purchaseOrders, setPOs: savePOs,
      invoices, setInvoices: saveInvoices,
      receipts, setReceipts: saveReceipts,
      p2pList, setP2pList: saveP2P,
      assets, setAssets: saveAssets,
    }}>
      {children}
    </ERPContext.Provider>
  );
}
 
export function useERP() {
  const ctx = useContext(ERPContext);
  if (!ctx) throw new Error('useERP must be inside ERPProvider');
  return ctx;
}
 
// ── Seed data ────────────────────────────────────────────────────────────────
function seedMessages() {
  return [
    { id:1, from:'Chidi Mensah', role:'admin', to:'revenue', subject:'Q4 Revenue Review',
      body:'Please prepare the Q4 revenue analysis for the board meeting scheduled for next Friday. Focus on Pharmacy and Radiology departments.',
      time:'Nov 28, 2025 · 09:14', read:false, unread:true },
    { id:2, from:'Ngozi Peters', role:'store', to:'admin', subject:'Stock Alert — IV Fluids',
      body:'IV fluid stock is critically low. Current level at 12% of minimum threshold. Emergency procurement request attached.',
      time:'Nov 27, 2025 · 14:30', read:false, unread:true },
    { id:3, from:'Tunde Fashola', role:'payables', to:'admin', subject:'Pharmaplus Invoice Overdue',
      body:'Invoice INV-2025-089 from Pharmaplus Nigeria Ltd (₦3.45M) is now 14 days overdue. Requesting approval to release payment.',
      time:'Nov 26, 2025 · 11:05', read:true, unread:false },
    { id:4, from:'System', role:'system', to:'all', subject:'Monthly Close Reminder',
      body:'Automated reminder: November 2025 monthly financial close is due in 3 days. All departmental submissions must be completed by Dec 3rd.',
      time:'Nov 25, 2025 · 08:00', read:true, unread:false },
  ];
}
 
function seedNotifs() {
  return [
    { id:1, type:'Finance', icon:'🔴', title:'Debtor Threshold Exceeded', body:'Total outstanding receivables ₦37.3M exceeds ₦25M target by ₦12.3M.', time:'Nov 28 · 10:02', read:false, priority:'high' },
    { id:2, type:'Stores',  icon:'🟡', title:'Critical Drug Alert', body:'Cannula 18G stock at 8 units remaining — below minimum reorder point of 50 units.', time:'Nov 27 · 15:44', read:false, priority:'medium' },
    { id:3, type:'Finance', icon:'🔵', title:'Revenue Target Achieved', body:'November 2025 revenue of ₦155.1M has exceeded the ₦120M monthly target.', time:'Nov 27 · 09:00', read:true, priority:'info' },
    { id:4, type:'Billing', icon:'🟡', title:'HMO Claim Pending', body:'5 HMO claims totalling ₦2.8M have been pending for over 30 days.', time:'Nov 26 · 14:20', read:true, priority:'medium' },
    { id:5, type:'Finance', icon:'🔴', title:'Payables Overdue', body:'Pharmaplus invoice ₦3.45M is 14 days past due date. Supplier relationship at risk.', time:'Nov 25 · 08:30', read:false, priority:'high' },
  ];
}
 
function seedApprovals() {
  return [
    { id:1, title:'Emergency Drug Procurement', dept:'Pharmacy', requester:'Ngozi Peters', amount:4500000, description:'Emergency procurement of IV fluids and antibiotics due to critical stock shortage.', status:'PENDING', priority:'HIGH', submitted:'Nov 28, 2025', comments:'' },
    { id:2, title:'Equipment Maintenance Contract', dept:'Maintenance', requester:'Tunde Fashola', amount:1200000, description:'Annual maintenance contract renewal for CT scanner and MRI machine.', status:'PENDING', priority:'MEDIUM', submitted:'Nov 27, 2025', comments:'' },
    { id:3, title:'Staff Training — Financial Systems', dept:'Finance', requester:'Chidi Mensah', amount:350000, description:'Two-day training workshop on the new ERP financial reporting modules.', status:'APPROVED', priority:'LOW', submitted:'Nov 20, 2025', comments:'Approved. Schedule for December.' },
    { id:4, title:'Generator Fuel Top-Up', dept:'Maintenance', requester:'Store Unit', amount:180000, description:'Diesel top-up for hospital generators — 500 litres.', status:'APPROVED', priority:'LOW', submitted:'Nov 18, 2025', comments:'Routine. Approved.' },
    { id:5, title:'Temporary Staff Agency Invoice', dept:'HR', requester:'HR Unit', amount:2800000, description:'Invoice for 8 temporary nurses supplied by MedStaff Agency in October.', status:'REJECTED', priority:'MEDIUM', submitted:'Nov 15, 2025', comments:'Query with agency re: actual hours. Resubmit with timesheet.' },
  ];
}
 
function seedAudit() {
  return [
    { time:'Nov 28 · 10:44', user:'C. Mensah', module:'Finance', action:'Revenue Updated', prev:'₦152.8M', next:'₦155.1M', ref:'NOV-2025-REV' },
    { time:'Nov 28 · 09:15', user:'N. Peters',  module:'Stores',  action:'Stock Issued', prev:'Cannula 18G: 2,400', next:'Cannula 18G: 2,380', ref:'ISS-2025-1134' },
    { time:'Nov 27 · 16:30', user:'T. Fashola', module:'Payables', action:'Invoice Added', prev:'—', next:'₦3,450,000', ref:'INV-PHM-089' },
    { time:'Nov 26 · 11:20', user:'C. Mensah', module:'Finance', action:'Debtor Record Updated', prev:'₦29.0M', next:'₦37.3M', ref:'DEB-NOV-2025' },
    { time:'Nov 25 · 09:05', user:'N. Peters',  module:'Stores',  action:'SRV Posted', prev:'—', next:'₦9,202,204', ref:'SRV-NOV-001' },
  ];
}