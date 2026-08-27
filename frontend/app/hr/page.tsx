'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, CheckCircle, XCircle, Clock } from 'lucide-react';

export default function HRPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [leaves, setLeaves] = useState<any[]>([]);
  const [timesheets, setTimesheets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'leave'|'timesheets'>('leave');
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({ type:'ANNUAL', startDate:'', endDate:'', reason:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, [activeTab]);

  const load = async () => {
    setLoading(true);
    try {
      if (activeTab==='leave') { const { data } = await api.get('/hr/leave'); setLeaves(data||[]); }
      else { const { data } = await api.get('/hr/timesheets'); setTimesheets(data||[]); }
    } catch {}
    setLoading(false);
  };

  const reviewLeave = async (id: string, status: 'APPROVED'|'REJECTED') => {
    try { await api.patch(`/hr/leave/${id}/review`, { status }); load(); } catch (err:any) { alert(err.response?.data?.error||'Failed'); }
  };

  const approveTimesheet = async (id: string) => {
    try { await api.patch(`/hr/timesheets/${id}/approve`); load(); } catch (err:any) { alert(err.response?.data?.error||'Failed'); }
  };

  const submitLeave = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true);
    try { await api.post('/hr/leave', leaveForm); setShowLeaveModal(false); load(); }
    catch (err:any) { alert(err.response?.data?.error||'Failed'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">HR & Leave Management</h1><p className="page-subtitle">Timesheets, leave requests, and approvals</p></div>
          {activeTab==='leave'&&<button className="btn btn-primary" onClick={()=>setShowLeaveModal(true)}><Plus size={16}/>Request Leave</button>}
        </div>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          <button className={`btn btn-sm ${activeTab==='leave'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab('leave')}>Leave Requests</button>
          <button className={`btn btn-sm ${activeTab==='timesheets'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab('timesheets')}>Timesheets</button>
        </div>

        {activeTab==='leave' ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Staff</th><th>Type</th><th>Start</th><th>End</th><th>Days</th><th>Status</th><th>Reason</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? [...Array(5)].map((_,i)=><tr key={i}>{[...Array(8)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
                : leaves.length===0 ? <tr><td colSpan={8} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No leave requests</td></tr>
                : leaves.map((l:any)=>(
                  <tr key={l.id}>
                    <td style={{fontSize:'13px'}}>{l.staff?.firstName} {l.staff?.lastName}</td>
                    <td><span className="badge badge-blue">{l.type}</span></td>
                    <td style={{fontSize:'12px'}}>{new Date(l.startDate).toLocaleDateString('en-NG')}</td>
                    <td style={{fontSize:'12px'}}>{new Date(l.endDate).toLocaleDateString('en-NG')}</td>
                    <td><span className="badge badge-gray">{l.totalDays}d</span></td>
                    <td>
                      <span className={`badge ${l.status==='APPROVED'?'badge-green':l.status==='REJECTED'?'badge-red':'badge-yellow'}`}>{l.status}</span>
                    </td>
                    <td style={{fontSize:'12px',color:'var(--text-muted)',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.reason||'—'}</td>
                    <td>
                      {l.status==='PENDING'&&(
                        <div style={{display:'flex',gap:'6px'}}>
                          <button className="btn btn-sm" style={{background:'rgba(34,197,94,0.15)',color:'#4ade80',border:'none'}} onClick={()=>reviewLeave(l.id,'APPROVED')}>✓ Approve</button>
                          <button className="btn btn-sm" style={{background:'rgba(239,68,68,0.15)',color:'#f87171',border:'none'}} onClick={()=>reviewLeave(l.id,'REJECTED')}>✗ Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Staff</th><th>Date</th><th>Hours</th><th>Notes</th><th>Approved</th><th>Actions</th></tr></thead>
              <tbody>
                {loading ? [...Array(5)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
                : timesheets.length===0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No timesheets</td></tr>
                : timesheets.map((ts:any)=>(
                  <tr key={ts.id}>
                    <td style={{fontSize:'13px'}}>{ts.staffId?.slice(0,8)}…</td>
                    <td style={{fontSize:'12px'}}>{new Date(ts.date).toLocaleDateString('en-NG')}</td>
                    <td style={{fontFamily:'monospace',fontWeight:600,color:'var(--accent)'}}>{ts.hoursWorked}h</td>
                    <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{ts.notes||'—'}</td>
                    <td>{ts.isApproved?<span className="badge badge-green">Approved</span>:<span className="badge badge-yellow">Pending</span>}</td>
                    <td>{!ts.isApproved&&<button className="btn btn-sm btn-secondary" onClick={()=>approveTimesheet(ts.id)}>Approve</button>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {showLeaveModal&&(
        <div className="modal-backdrop" onClick={()=>setShowLeaveModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>Request Leave</h2>
            <form onSubmit={submitLeave} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Leave Type</label>
                <select className="form-input" value={leaveForm.type} onChange={e=>setLeaveForm(f=>({...f,type:e.target.value}))}>
                  {['ANNUAL','SICK','MATERNITY','PATERNITY','EMERGENCY','UNPAID'].map(t=><option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px'}}>
                <div className="form-group"><label className="form-label">Start Date *</label><input className="form-input" type="date" required value={leaveForm.startDate} onChange={e=>setLeaveForm(f=>({...f,startDate:e.target.value}))}/></div>
                <div className="form-group"><label className="form-label">End Date *</label><input className="form-input" type="date" required value={leaveForm.endDate} onChange={e=>setLeaveForm(f=>({...f,endDate:e.target.value}))}/></div>
              </div>
              <div className="form-group"><label className="form-label">Reason</label><textarea className="form-input" rows={2} value={leaveForm.reason} onChange={e=>setLeaveForm(f=>({...f,reason:e.target.value}))} style={{resize:'none'}}/></div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowLeaveModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Submitting…':'Submit Request'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
