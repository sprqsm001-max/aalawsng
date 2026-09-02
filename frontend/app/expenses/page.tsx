'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, DollarSign } from 'lucide-react';

export default function ExpensesPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ matterId:'', category:'COURT_FILING', amount:'', description:'', isBillable: true, incurredAt: new Date().toISOString().split('T')[0] });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [exRes, mRes] = await Promise.all([
        api.get('/expenses?limit=50'),
        api.get('/matters?limit=100'),
      ]);
      setExpenses(Array.isArray(exRes.data) ? exRes.data : []);
      setTotal(Array.isArray(exRes.data) ? exRes.data.length : 0);
      setMatters(mRes.data.matters || []);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }
    setSaving(true);
    try {
      await api.post('/expenses', {
        ...form,
        expenseDate: form.incurredAt,
        matterId: form.matterId || undefined,
        amount: parseFloat(form.amount),
      });
      setShowModal(false);
      setForm({ matterId:'', category:'COURT_FILING', amount:'', description:'', isBillable: true, incurredAt: new Date().toISOString().split('T')[0] });
      load();
    } catch (err:any) { alert(err.response?.data?.error || 'Failed to record expense'); }
    setSaving(false);
  };

  const totalBillable = expenses.filter(e=>e.isBillable).reduce((s,e)=>s+Number(e.amount),0);

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Expenses</h1><p className="page-subtitle">₦{totalBillable.toLocaleString('en-NG')} in billable disbursements</p></div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={16}/>Add Expense</button>
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Category</th><th>Matter</th><th>Description</th><th>Amount</th><th>Billable</th></tr></thead>
            <tbody>
              {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : expenses.length===0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No expenses recorded yet</td></tr>
              : expenses.map((e:any)=>(
                <tr key={e.id}>
                  <td style={{fontSize:'12px'}}>{new Date(e.expenseDate || e.incurredAt || e.createdAt).toLocaleDateString('en-NG')}</td>
                  <td><span className="badge badge-blue" style={{fontSize:'10px'}}>{e.category?.replace(/_/g,' ')}</span></td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{e.matter?.referenceNumber ? `${e.matter.referenceNumber} — ${e.matter.title}` : '—'}</td>
                  <td style={{fontSize:'13px',color:'var(--text-secondary)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description}</td>
                  <td style={{fontFamily:'monospace',fontWeight:600,color:'var(--accent)'}}>₦{Number(e.amount).toLocaleString()}</td>
                  <td>{e.isBillable?<span className="badge badge-green">Billable</span>:<span className="badge badge-gray">Non-bill</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {showModal&&(
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>Add Expense / Disbursement</h2>
            <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Category</label>
                <select className="form-input" value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                  {['COURT_FILING','TRANSPORT','PRINTING','POSTAGE','EXPERT_WITNESS','SEARCH_FEE','MISCELLANEOUS'].map(c=><option key={c} value={c}>{c.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Matter (Optional)</label>
                <select className="form-input" value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))}>
                  <option value="">General Office / Overhead (No linked matter)</option>
                  {matters.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.referenceNumber} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div className="form-group"><label className="form-label">Amount (NGN) *</label><input className="form-input" type="number" required min="0.01" step="0.01" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} placeholder="e.g. 25000"/></div>
                <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" required value={form.incurredAt} onChange={e=>setForm(f=>({...f,incurredAt:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Description *</label><input className="form-input" required value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} placeholder="Purpose of disbursement…"/></div>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'var(--text-secondary)'}}>
                <input type="checkbox" checked={form.isBillable} onChange={e=>setForm(f=>({...f,isBillable:e.target.checked}))}/>Billable to Client
              </label>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Adding…':'Add Expense'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
