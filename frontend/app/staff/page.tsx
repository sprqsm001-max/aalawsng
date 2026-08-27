'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronRight, UserCheck } from 'lucide-react';

export default function StaffPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [staff, setStaff] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'list'|'workload'>('list');

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, [activeTab]);

  const load = async () => {
    setLoading(true);
    try {
      if (activeTab === 'list') {
        const { data } = await api.get('/staff?limit=30');
        setStaff(data.staff||[]); setTotal(data.total||0);
      } else {
        const { data } = await api.get('/staff/workload/summary');
        setWorkload(data||[]);
      }
    } catch {}
    setLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Staff Management</h1><p className="page-subtitle">{total} active staff members</p></div>
        </div>
        <div style={{display:'flex',gap:'8px',marginBottom:'20px'}}>
          <button className={`btn btn-sm ${activeTab==='list'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab('list')}>Staff List</button>
          <button className={`btn btn-sm ${activeTab==='workload'?'btn-primary':'btn-secondary'}`} onClick={()=>setActiveTab('workload')}>Workload</button>
        </div>

        {activeTab==='list' ? (
          <div className="table-container">
            <table>
              <thead><tr><th>Name</th><th>Role</th><th>Email</th><th>Hourly Rate</th><th>Matters</th><th>Tasks</th></tr></thead>
              <tbody>
                {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
                : staff.length===0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No staff found</td></tr>
                : staff.map((s:any)=>(
                  <tr key={s.id}>
                    <td style={{color:'var(--text-primary)',fontWeight:500}}>{s.firstName} {s.lastName}</td>
                    <td><span className="badge badge-blue">{s.role}</span></td>
                    <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{s.user?.email}</td>
                    <td style={{fontFamily:'monospace',fontSize:'13px'}}>₦{Number(s.hourlyRate||0).toLocaleString()}/h</td>
                    <td><span className="badge badge-gray">{s._count?.assignedMatters||0}</span></td>
                    <td><span className="badge badge-gray">{s._count?.tasks||0}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="table-container">
            <table>
              <thead><tr><th>Staff Member</th><th>Role</th><th>Active Matters</th><th>Active Tasks</th><th>Billable Hours (Month)</th></tr></thead>
              <tbody>
                {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(5)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
                : workload.length===0 ? <tr><td colSpan={5} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No workload data</td></tr>
                : workload.map((s:any)=>(
                  <tr key={s.id}>
                    <td style={{color:'var(--text-primary)',fontWeight:500}}>{s.name}</td>
                    <td><span className="badge badge-blue">{s.role}</span></td>
                    <td><span className="badge badge-gold">{s.activeMatters}</span></td>
                    <td><span className={`badge ${s.activeTasks>10?'badge-red':s.activeTasks>5?'badge-yellow':'badge-green'}`}>{s.activeTasks}</span></td>
                    <td style={{fontFamily:'monospace',fontWeight:600,color:'var(--accent)'}}>{s.billableHoursThisMonth}h</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
