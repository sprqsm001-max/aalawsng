'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';

export default function AuditPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [module, setModule] = useState('');
  const [action, setAction] = useState('');

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, [page, module, action]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/audit?page=${page}&limit=50${module?`&module=${module}`:''}${action?`&action=${action}`:''}`);
      setLogs(data.logs||[]); setTotal(data.total||0);
    } catch {}
    setLoading(false);
  };

  const actionColor = (a: string) => {
    if (a.includes('TRUST')) return 'badge-gold';
    if (a.includes('DELETE') || a.includes('REVOKE')) return 'badge-red';
    if (a.includes('CREATE') || a.includes('LOGIN')) return 'badge-green';
    if (a.includes('ROLE') || a.includes('PERMISSION')) return 'badge-yellow';
    return 'badge-gray';
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Audit Trail</h1><p className="page-subtitle">{total} immutable log entries — read-only, append-only</p></div>
        </div>

        <div style={{background:'rgba(96,165,250,0.08)',border:'1px solid rgba(96,165,250,0.2)',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',fontSize:'12.5px',color:'var(--text-secondary)'}}>
          All records in this log are immutable. No entry can be modified or deleted. Trust accounting entries are flagged in gold.
        </div>

        <div style={{display:'flex',gap:'12px',marginBottom:'20px'}}>
          <select className="form-input" style={{maxWidth:'180px'}} value={module} onChange={e=>{setModule(e.target.value);setPage(1)}}>
            <option value="">All Modules</option>
            {['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20'].map(m=><option key={m} value={m}>{m}</option>)}
          </select>
          <input className="form-input" style={{maxWidth:'200px'}} placeholder="Filter by action…" value={action} onChange={e=>{setAction(e.target.value);setPage(1)}}/>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Module</th><th>Entity</th><th>IP Address</th></tr></thead>
            <tbody>
              {loading ? [...Array(10)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : logs.length===0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No audit logs</td></tr>
              : logs.map((l:any)=>(
                <tr key={l.id}>
                  <td style={{fontSize:'11px',fontFamily:'monospace',color:'var(--text-muted)'}}>{new Date(l.timestamp).toISOString().replace('T',' ').split('.')[0]}</td>
                  <td style={{fontSize:'12px'}}>{l.user?.staffProfile?.firstName||l.user?.email?.split('@')[0]} <span style={{color:'var(--text-muted)',fontSize:'10px'}}>({l.user?.tier})</span></td>
                  <td><span className={`badge ${actionColor(l.action)}`} style={{fontSize:'10px',letterSpacing:'0.04em'}}>{l.action}</span></td>
                  <td><span className="badge badge-gray" style={{fontSize:'10px'}}>{l.module||'—'}</span></td>
                  <td style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'monospace',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{l.entityType} {l.entityId?.slice(0,8)}…</td>
                  <td style={{fontSize:'11px',color:'var(--text-muted)',fontFamily:'monospace'}}>{l.ipAddress||'—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginTop:'16px'}}>
          <span style={{color:'var(--text-muted)',fontSize:'13px'}}>Showing {logs.length} of {total}</span>
          <div style={{display:'flex',gap:'8px'}}>
            <button className="btn btn-secondary btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={logs.length<50} onClick={()=>setPage(p=>p+1)}>Next</button>
          </div>
        </div>
      </main>
    </div>
  );
}
