'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, AlertCircle } from 'lucide-react';

const typeColor: Record<string, string> = {
  COURT_DATE: 'badge-red', STATUTE_DEADLINE: 'badge-red', FILING_DEADLINE: 'badge-red',
  HEARING: 'badge-yellow', DEPOSITION: 'badge-yellow', MEETING: 'badge-blue',
  TASK_DUE: 'badge-gray', OTHER: 'badge-gray',
};

export default function CalendarPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [events, setEvents] = useState<any[]>([]);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:'', type:'COURT_DATE', eventDate:'', matterId:'', isHardDeadline: false, description:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const from = now.toISOString().split('T')[0];
      const to = new Date(now.setMonth(now.getMonth()+3)).toISOString().split('T')[0];
      const [evRes, dlRes, mRes] = await Promise.all([
        api.get(`/calendar?from=${from}&to=${to}`),
        api.get('/calendar/upcoming-deadlines?days=30'),
        api.get('/matters?limit=100'),
      ]);
      setEvents(evRes.data || []);
      setDeadlines(dlRes.data || []);
      setMatters(mRes.data.matters || []);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      alert('Event title is required');
      return;
    }
    setSaving(true);
    try {
      await api.post('/calendar', {
        ...form,
        matterId: form.matterId || undefined,
      });
      setShowModal(false);
      setForm({ title:'', type:'COURT_DATE', eventDate:'', matterId:'', isHardDeadline: false, description:'' });
      load();
    } catch (err: any) { alert(err.response?.data?.error || 'Failed to create event'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{ fontSize:'16px', fontWeight:600, color:'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Calendar & Deadlines</h1><p className="page-subtitle">Track court dates, statute of limitations, and all critical deadlines</p></div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16}/>Add Event</button>
        </div>

        {/* Upcoming Hard Deadlines Alert */}
        {deadlines.length > 0 && (
          <div style={{ background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:'10px', padding:'16px 20px', marginBottom:'24px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'12px' }}>
              <AlertCircle size={16} style={{ color:'#f87171' }}/>
              <span style={{ color:'#f87171', fontWeight:600, fontSize:'13px' }}>HARD DEADLINES — Next 30 Days ({deadlines.length})</span>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:'8px' }}>
              {deadlines.slice(0,6).map((d:any) => {
                const daysLeft = Math.ceil((new Date(d.eventDate).getTime() - Date.now())/(1000*60*60*24));
                return (
                  <div key={d.id} style={{ background:'var(--surface)', borderRadius:'8px', padding:'10px 14px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <div>
                      <p style={{ fontSize:'13px', color:'var(--text-primary)', fontWeight:500 }}>{d.title}</p>
                      <p style={{ fontSize:'11px', color:'var(--text-muted)', marginTop:'2px' }}>{d.matter?.referenceNumber} · {new Date(d.eventDate).toLocaleDateString('en-NG')}</p>
                    </div>
                    <span className={`badge ${daysLeft<=3?'badge-red':daysLeft<=7?'badge-yellow':'badge-blue'}`}>{daysLeft}d</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* All Events Table */}
        <div className="table-container">
          <table>
            <thead><tr><th>Title</th><th>Type</th><th>Date</th><th>Matter</th><th>Hard Deadline</th></tr></thead>
            <tbody>
              {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(5)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : events.length===0 ? <tr><td colSpan={5} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No events found</td></tr>
              : events.map((ev:any) => (
                <tr key={ev.id}>
                  <td style={{color:'var(--text-primary)',fontWeight:500}}>{ev.title}</td>
                  <td><span className={`badge ${typeColor[ev.type]||'badge-gray'}`}>{ev.type.replace(/_/g,' ')}</span></td>
                  <td style={{fontSize:'13px'}}>{new Date(ev.eventDate).toLocaleDateString('en-NG',{dateStyle:'medium'})}</td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{ev.matter?.referenceNumber||'—'}</td>
                  <td>{ev.isHardDeadline ? <span className="badge badge-red">YES</span> : <span className="badge badge-gray">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>New Calendar Event</h2>
            <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Type *</label>
                <select className="form-input" value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))}>
                  {['COURT_DATE','STATUTE_DEADLINE','FILING_DEADLINE','HEARING','DEPOSITION','MEETING','TASK_DUE','OTHER'].map(t=><option key={t} value={t}>{t.replace(/_/g,' ')}</option>)}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Date & Time *</label><input className="form-input" type="datetime-local" required value={form.eventDate} onChange={e=>setForm(f=>({...f,eventDate:e.target.value}))}/></div>
              <div className="form-group">
                <label className="form-label">Matter (Optional)</label>
                <select className="form-input" value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))}>
                  <option value="">General Event / Firm Deadline (No linked matter)</option>
                  {matters.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.referenceNumber} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',color:'var(--text-secondary)'}}>
                <input type="checkbox" checked={form.isHardDeadline} onChange={e=>setForm(f=>({...f,isHardDeadline:e.target.checked}))}/>
                <span>Hard Deadline (escalating alerts)</span>
              </label>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Saving…':'Create Event'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
