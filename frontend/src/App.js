import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  RefreshCw, LogOut, ShieldCheck, Download, 
  Users, Search, User, ArrowUpRight, ArrowDownLeft, 
  Wallet, Activity, Filter
} from 'lucide-react';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isRegistering, setIsRegistering] = useState(false);
  const [balance, setBalance] = useState(0);


  const [logs, setLogs] = useState([]);
  const [ledger, setLedger] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUserFilter, setSelectedUserFilter] = useState('');
  const [formData, setFormData] = useState({ userId: '', email: '', password: '', name: '' });
  const [transferData, setTransferData] = useState({ receiverUserId: '', amount: '' });
  const [status, setStatus] = useState(null);

  const fetchData = async () => {
    if (!token) return;
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const [meRes, userRes, logRes, ledgerRes] = await Promise.all([
        axios.get(`${API_URL}/api/me`, config),
        axios.get(`${API_URL}/api/users`, config),
        axios.get(selectedUserFilter ? `${API_URL}/api/audit-logs?targetUserId=${selectedUserFilter}` : `${API_URL}/api/audit-logs`, config),
        axios.get(selectedUserFilter ? `${API_URL}/api/ledger?targetUserId=${selectedUserFilter}` : `${API_URL}/api/ledger`, config)
      ]);
      setBalance(meRes.data.balance);
      setAllUsers(userRes.data);
      setLogs(logRes.data);
      setLedger(ledgerRes.data);
    } catch (err) {
      if (err.response?.status === 401) logout();
    }
  };

  useEffect(() => { fetchData(); }, [token, selectedUserFilter]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setStatus({ type: 'loading', msg: 'Processing...' });
    const endpoint = isRegistering ? '/api/register' : '/api/login';
    try {
      const res = await axios.post(`${API_URL}${endpoint}`, formData);
      if (isRegistering) {
        setStatus({ type: 'success', msg: 'Account created! Please login.' });
        setIsRegistering(false);
      } else {
        localStorage.setItem('token', res.data.token);
        localStorage.setItem('user', JSON.stringify(res.data.user));
        setToken(res.data.token);
        setUser(res.data.user);
        setBalance(res.data.user.balance);
        setStatus(null);
      }
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Authentication failed' });
    }
  };

  const logout = () => {
    localStorage.clear();
    setToken(null);
    setUser(null);
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    const amt = parseFloat(transferData.amount);
    if (isNaN(amt) || amt <= 0) {
      setStatus({ type: 'error', msg: 'Amount must be a positive number' });
      return;
    }

    setStatus({ type: 'loading', msg: 'Processing...' });
    try {
      await axios.post(`${API_URL}/api/transfer`, transferData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransferData({ receiverUserId: '', amount: '' });
      setStatus({ type: 'success', msg: 'Transfer successful!' });
      fetchData();
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      setStatus({ type: 'error', msg: err.response?.data?.error || 'Transfer failed' });
      fetchData();
    }
  };

  const downloadCSV = () => {
    const headers = ["Timestamp", "Action", "Status", "Details"];
    const rows = logs.map(l => [
      new Date(l.timestamp).toLocaleString().replace(',', ''),
      l.action, l.status, l.details?.replace(/,/g, ' ') || 'No details'
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `AuditLogs.csv`;
    link.click();
  };

  const downloadTransactionCSV = () => {
    const headers = user.role === 'admin' ? ["Timestamp", "Sender", "Receiver", "Amount"] : ["Timestamp", "Partner", "Amount", "Balance After"];
    const rows = ledger.map(tx => {
      const isSender = user.userId === tx.senderUserId;
      if (user.role === 'admin') {
        return [new Date(tx.timestamp).toLocaleString().replace(',', ''), tx.senderUserId, tx.receiverUserId, tx.amount];
      }
      const partner = isSender ? tx.receiverUserId : tx.senderUserId;
      const displayAmount = isSender ? -tx.amount : tx.amount;
      const displayBalance = isSender ? tx.senderBalanceAfter : tx.receiverBalanceAfter;
      return [new Date(tx.timestamp).toLocaleString().replace(',', ''), partner, displayAmount, displayBalance];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `Ledger.csv`;
    link.click();
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
        <div className="bg-slate-900/50 backdrop-blur-xl p-8 rounded-3xl border border-slate-800 shadow-2xl w-full max-w-md relative z-10">
          <div className="flex flex-col items-center mb-6">
            <div className="w-14 h-14 bg-indigo-600 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-white tracking-tight">SecurePay</h1>
          </div>
          <form onSubmit={handleAuth} className="space-y-4">
            <input className="w-full bg-slate-800/50 border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-sm" placeholder="User ID" required value={formData.userId} onChange={e => setFormData({...formData, userId: e.target.value})} />
            {isRegistering && (
              <>
                <input className="w-full bg-slate-800/50 border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" type="email" placeholder="Email Address" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                <input className="w-full bg-slate-800/50 border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" placeholder="Full Name" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </>
            )}
            <input className="w-full bg-slate-800/50 border border-slate-700 text-white p-3.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-sm" type="password" placeholder="Password" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
            <button className="w-full bg-indigo-600 hover:bg-indigo-500 text-white p-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/20 active:scale-[0.98] transition-all">
              {status?.type === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin mx-auto" /> : (isRegistering ? 'Create Account' : 'Authenticate')}
            </button>
          </form>
          <button onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-6 text-slate-400 text-sm hover:text-white transition-colors">
            {isRegistering ? 'Already have an account? Login' : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900">
      <nav className="sticky top-0 z-50 bg-white border-b border-slate-200 px-8 py-5 shadow-sm">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-xl shadow-xl shadow-indigo-100">
              <ShieldCheck className="text-white w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-wider text-slate-900 leading-none">
                SecurePay
              </h1>
              <p className="text-xs uppercase font-extrabold text-indigo-500 tracking-[0.2em] mt-2">
                {user.role}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block border-r-2 border-slate-100 pr-8 py-1">
              <p className="text-lg font-black text-slate-900 leading-none tracking-tight">
                {user.name}
              </p>
              <p className="text-base font-semibold text-slate-400 mt-2 tracking-tight">
                {user.userId}
              </p>
            </div>
            <button 
              onClick={logout} 
              className="p-3.5 bg-slate-100 text-slate-600 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all active:scale-90"
              title="Logout"
            >
              <LogOut size={24}/>
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 lg:p-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
          
          <div className="lg:col-span-4 space-y-6">
            {user.role !== 'admin' && (
              <div className="bg-indigo-700 p-8 rounded-[2rem] shadow-xl shadow-indigo-100 text-white relative overflow-hidden">
                <p className="text-indigo-200 text-sm font-medium">Available Balance</p>
                <h2 className="text-4xl font-bold mt-2">₹{balance.toLocaleString()}</h2>
                <Wallet className="absolute bottom-4 right-4 text-white/10 w-20 h-20" />
              </div>
            )}

            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
              <h2 className="font-bold text-slate-800 text-lg mb-6 flex items-center gap-2">
                {user.role === 'admin' ? <><Filter size={20} className="text-indigo-500"/> Audit Filters</> : <><ArrowUpRight size={20} className="text-indigo-500"/> Send Money</>}
              </h2>
              {user.role === 'admin' ? (
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-3 text-slate-400 w-4 h-4" />
                    <input list="adminUsers" className="w-full bg-slate-50 border border-slate-200 p-2.5 pl-9 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Search User ID..." value={selectedUserFilter} onChange={e => setSelectedUserFilter(e.target.value)} />
                  </div>
                  <datalist id="adminUsers">{allUsers.map(u => <option key={u._id} value={u.userId}>{u.name}</option>)}</datalist>
                  {selectedUserFilter && <button onClick={() => setSelectedUserFilter('')} className="w-full py-2 text-xs font-bold text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition-colors">Clear Filter</button>}
                </div>
              ) : (
                <form onSubmit={handleTransfer} className="space-y-4">
                  <input list="users" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-sm outline-none focus:ring-2 font-bold focus:ring-indigo-500/20" placeholder="Recipient ID" required value={transferData.receiverUserId} onChange={e => setTransferData({...transferData, receiverUserId: e.target.value})} />
                  <datalist id="users">{allUsers.filter(u => u.userId !== user.userId).map(u => <option key={u._id} value={u.userId}>{u.name}</option>)}</datalist>
                  <input type="number" min="0.01" step="any" className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-base font-bold outline-none focus:ring-2 focus:ring-indigo-500/20" placeholder="Amount (₹)" required value={transferData.amount} onChange={e => setTransferData({...transferData, amount: e.target.value})} />
                  <button disabled={status?.type === 'loading'} className={`w-full p-3 rounded-xl font-bold transition-all shadow-lg ${status?.type === 'loading' ? 'bg-slate-100 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100'}`}>
                    {status?.type === 'loading' ? <RefreshCw className="animate-spin w-5 h-5 mx-auto" /> : 'Authorize Transfer'}
                  </button>
                  {status && status.type !== 'loading' && <div className={`p-3 text-center text-xs font-bold rounded-xl border animate-in fade-in ${status.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>{status.msg}</div>}
                </form>
              )}
            </div>
          </div>

          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600"><Activity size={22} /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Transaction Ledger</h3>
                </div>
                <button onClick={downloadTransactionCSV} className="p-2 bg-slate-50 text-slate-500 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all active:scale-95"><Download size={18} /></button>
              </div>
              <div className="max-h-[450px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm text-slate-400 uppercase text-[11px] font-black tracking-widest z-10">
                    <tr>
                      <th className="px-6 py-4">Date/Time</th>
                      {user.role === 'admin' ? <><th className="px-6 py-4">Origin</th><th className="px-6 py-4">Dest</th></> : <th className="px-6 py-4">Counterparty</th>}
                      <th className="px-6 py-4 text-right">Volume</th>
                      {user.role !== 'admin' && <th className="px-6 py-4 text-right">Settled</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledger.length > 0 ? ledger.map((tx) => {
                      const isSender = user.userId === tx.senderUserId;
                      const partner = isSender ? tx.receiverUserId : tx.senderUserId;
                      const displayAmount = isSender ? -tx.amount : tx.amount;
                      const displayBalance = isSender ? tx.senderBalanceAfter : tx.receiverBalanceAfter;
                      return (
                        <tr key={tx._id} className="hover:bg-slate-50/80 transition-all group">
                          <td className="px-6 py-5 text-slate-500 font-mono text-[14px] whitespace-nowrap">{new Date(tx.timestamp).toLocaleString()}</td>
                          {user.role === 'admin' ? (
                            <><td className="px-6 py-5 font-bold text-slate-700 text-base">{tx.senderUserId}</td><td className="px-6 py-5 font-bold text-slate-700 text-base">{tx.receiverUserId}</td></>
                          ) : (
                            <td className="px-6 py-5"><div className="flex items-center gap-3">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isSender ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-500'}`}>{isSender ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}</div>
                              <span className="font-bold text-slate-800 text-base">{partner}</span>
                            </div></td>
                          )}
                          <td className={`px-6 py-5 text-right font-black text-lg ${user.role === 'admin' ? 'text-slate-900' : (displayAmount > 0 ? 'text-emerald-600' : 'text-rose-600')}`}>
                            {user.role === 'admin' ? `₹${tx.amount}` : (displayAmount > 0 ? `+₹${displayAmount}` : `-₹${Math.abs(displayAmount)}`)}
                          </td>
                          {user.role !== 'admin' && <td className="px-6 py-5 text-right font-bold text-slate-400 text-base">₹{displayBalance?.toLocaleString()}</td>}
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan={6} className="p-16 text-center text-slate-400 font-medium italic">No ledger entries recorded</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/30 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-200 rounded-lg text-slate-500"><ShieldCheck size={22} /></div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight text-lg">Security Audit Trail</h3>
                </div>
                <button onClick={downloadCSV} className="text-[10px] font-bold uppercase text-indigo-600 tracking-widest px-3 py-1 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-all">Export Audit</button>
              </div>
              <div className="max-h-[350px] overflow-y-auto">
                <table className="w-full text-left border-collapse">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-sm text-slate-400 uppercase text-[11px] font-black tracking-widest border-b border-slate-100 z-10">
                    <tr>
                      <th className="px-6 py-4">Timestamp</th>
                      <th className="px-6 py-4">Event Details</th>
                      <th className="px-6 py-4 text-right">Result</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {logs.map(log => (
                      <tr key={log._id} className="hover:bg-slate-50/50 group transition-all">
                        <td className="px-6 py-5 text-slate-500 font-mono text-[14px] whitespace-nowrap w-[230px]">{new Date(log.timestamp).toLocaleString()}</td>
                        <td className="px-6 py-5 text-slate-700 font-bold text-base">{log.details}</td>
                        <td className="px-6 py-5 text-right">
                          <span className={`px-3 py-1 rounded-full text-[12px] font-black tracking-widest uppercase shadow-sm ${log.status === 'SUCCESS' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                            {log.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;