'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Clock } from 'lucide-react';

export default function TimePage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ matterId:'', date: new Date().toISOString().split('T')[0], minutes:60, description:'', isBillable: true });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/time?limit=30');
      setEntries(data.entries||[]); setTotal(data.total||0);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/time', form);
      setShowModal(false);
      setForm({ matterId:'', date: new Date().toISOString().split('T')[0], minutes:60, description:'', isBillable: true });
      load();
    } catch (err:any) { alert(err.response?.data?.error||'Failed'); }
    setSaving(false);
  };

  const totalBillableHrs = entries.filter((e:any)=>e.isBillable).reduce((sum:number,e:any)=>sum+(e.minutes||0),0) / 60;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Time & Billing</h1><p className="page-subtitle">{total} time entries — {totalBillableHrs.toFixed(1)} billable hours shown</p></div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={16}/>Log Time</button>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
          {[
            { label:'Entries Shown', value: entries.length },
            { label:'Billable Hours', value: `${totalBillableHrs.toFixed(1)}h`, color:'var(--accent)' },
            { label:'Non-Billable', value: `${(entries.filter((e:any)=>!e.isBillable).reduce((s:number,e:any)=>s+(e.minutes||0),0)/60).toFixed(1)}h`, color:'#94a3b8' },
          ].map((s,i)=>(
            <div key={i} className="card-stat">
              <p className="stat-label">{s.label}</p>
              <p className="stat-value" style={{marginTop:'6px',color:s.color||'var(--text-primary)'}}>{s.value}</p>
            </div>
          ))}
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Matter</th><th>Staff</th><th>Duration</th><th>Description</th><th>Billable</th><th>Rate</th><th>Amount</th></tr></thead>
            <tbody>
              {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(8)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : entries.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No time entries yet</td></tr>
              : entries.map((e:any)=>{
                const hrs = (e.minutes/60).toFixed(2);
                const amount = e.isBillable && e.hourlyRate ? ((e.minutes/60)*e.hourlyRate).toFixed(2) : '—';
                return (
                  <tr key={e.id}>
                    <td style={{fontSize:'12px'}}>{new Date(e.date).toLocaleDateString('en-NG')}</td>
                    <td style={{fontSize:'12px',color:'var(--accent)'}}>{e.matter?.referenceNumber||'—'}</td>
                    <td style={{fontSize:'12px'}}>{e.staff?.firstName} {e.staff?.lastName}</td>
                    <td><span style={{fontFamily:'monospace',fontWeight:600,color:'var(--text-primary)'}}>{hrs}h</span></td>
                    <td style={{fontSize:'12px',color:'var(--text-secondary)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{e.description||'—'}</td>
                    <td>{e.isBillable?<span className="badge badge-green">Billable</span>:<span className="badge badge-gray">Non-bill</span>}</td>
                    <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{e.hourlyRate?`₦${Number(e.hourlyRate).toLocaleString()}/h`:'—'}</td>
                    <td style={{fontFamily:'monospace',fontSize:'13px',color:e.isBillable?'var(--accent)':'var(--text-muted)'}}>{amount!=='—'?`₦${Number(amount).toLocaleString()}`:amount}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
      {showModal&&(
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>Log Time Entry</h2>
            <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Matter ID *</label><input className="form-input" required value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))} placeholder="UUID"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div className="form-group"><label className="form-label">Date *</label><input className="form-input" type="date" required value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">Duration (minutes) *</label><input className="form-input" type="number" required min={1} value={form.minutes} onChange={e=>setForm(f=>({...f,minutes:parseInt(e.target.value)}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Description *</label><textarea className="form-input" required rows={2} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} style={{resize:'none'}}/></div>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'var(--text-secondary)'}}>
                <input type="checkbox" checked={form.isBillable} onChange={e=>setForm(f=>({...f,isBillable:e.target.checked}))}/>Billable
              </label>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Logging…':'Log Time'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
