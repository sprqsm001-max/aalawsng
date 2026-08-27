'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';

const priorityColor: Record<string, string> = { CRITICAL:'badge-red', HIGH:'badge-yellow', MEDIUM:'badge-blue', LOW:'badge-gray' };
const statusColor: Record<string, string> = { PENDING:'badge-gray', IN_PROGRESS:'badge-blue', COMPLETED:'badge-green', CANCELLED:'badge-red' };

export default function TasksPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [tasks, setTasks] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title:'', matterId:'', assignedToId:'', priority:'MEDIUM', dueDate:'', description:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, [statusFilter]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/tasks?limit=30${statusFilter?`&status=${statusFilter}`:''}`);
      setTasks(data.tasks||[]); setTotal(data.total||0);
    } catch {}
    setLoading(false);
  };

  const markComplete = async (id: string) => {
    try { await api.patch(`/tasks/${id}`, { status:'COMPLETED' }); load(); } catch {}
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/tasks', form);
      setShowModal(false);
      setForm({ title:'', matterId:'', assignedToId:'', priority:'MEDIUM', dueDate:'', description:'' });
      load();
    } catch (err:any) { alert(err.response?.data?.error||'Failed'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Tasks</h1><p className="page-subtitle">{total} tasks across all matters</p></div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Plus size={16}/>New Task</button>
        </div>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px',flexWrap:'wrap'}}>
          {['','PENDING','IN_PROGRESS','COMPLETED'].map(s=>(
            <button key={s} className={`btn btn-sm ${statusFilter===s?'btn-primary':'btn-secondary'}`} onClick={()=>setStatusFilter(s)}>{s||'All'}</button>
          ))}
        </div>
        <div className="table-container">
          <table>
            <thead><tr><th>Task</th><th>Matter</th><th>Assigned To</th><th>Priority</th><th>Status</th><th>Due Date</th><th>Action</th></tr></thead>
            <tbody>
              {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(7)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : tasks.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No tasks found</td></tr>
              : tasks.map((t:any)=>(
                <tr key={t.id}>
                  <td style={{color:'var(--text-primary)',fontWeight:500,maxWidth:'220px'}}>
                    <div style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.title}</div>
                    {t.subtasks?.length>0 && <div style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{t.subtasks.length} subtask{t.subtasks.length!==1?'s':''}</div>}
                  </td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{t.matter?.referenceNumber||'—'}</td>
                  <td style={{fontSize:'12px'}}>{t.assignedTo?`${t.assignedTo.firstName} ${t.assignedTo.lastName[0]}.`:'—'}</td>
                  <td><span className={`badge ${priorityColor[t.priority]||'badge-gray'}`}>{t.priority}</span></td>
                  <td><span className={`badge ${statusColor[t.status]||'badge-gray'}`}>{t.status.replace('_',' ')}</span></td>
                  <td style={{fontSize:'12px',color:t.isOverdue?'#f87171':'var(--text-muted)'}}>{t.dueDate?new Date(t.dueDate).toLocaleDateString('en-NG'):'—'}</td>
                  <td>{t.status!=='COMPLETED'&&<button className="btn btn-sm btn-secondary" onClick={()=>markComplete(t.id)}>Complete</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
      {showModal&&(
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>New Task</h2>
            <form onSubmit={handleCreate} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Title *</label><input className="form-input" required value={form.title} onChange={e=>setForm(f=>({...f,title:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Matter ID</label><input className="form-input" value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))} placeholder="UUID"/></div>
              <div className="form-group"><label className="form-label">Assign To (Staff ID)</label><input className="form-input" value={form.assignedToId} onChange={e=>setForm(f=>({...f,assignedToId:e.target.value}))} placeholder="UUID"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div className="form-group"><label className="form-label">Priority</label>
                  <select className="form-input" value={form.priority} onChange={e=>setForm(f=>({...f,priority:e.target.value}))}>
                    {['LOW','MEDIUM','HIGH','CRITICAL'].map(p=><option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div className="form-group"><label className="form-label">Due Date</label><input className="form-input" type="date" value={form.dueDate} onChange={e=>setForm(f=>({...f,dueDate:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} rows={2} style={{resize:'none'}}/></div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Creating…':'Create Task'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
