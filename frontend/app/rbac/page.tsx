'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Shield, Check, X } from 'lucide-react';

const MODULES = ['M01','M02','M03','M04','M05','M06','M07','M08','M09','M10','M11','M12','M13','M14','M15','M16','M17','M18','M19','M20'];
const MODULE_LABELS: Record<string,string> = {
  M01:'Matters',M02:'Clients',M03:'Calendar',M04:'Documents',M05:'Tasks',
  M06:'Time',M07:'Invoices',M08:'Trust (CRITICAL)',M09:'Expenses',M10:'Fin Dashboard',
  M11:'Staff Mgmt',M12:'Staff Tasks',M13:'HR',M14:'Client Portal',M15:'Internal Msg',
  M16:'Client Msg',M17:'Analytics',M18:'Conflicts',M19:'Audit',M20:'RBAC',
};
const ROLES = ['ADMIN','ATTORNEY','PARALEGAL','BILLING_STAFF','ADMIN_STAFF','ASSOCIATE'];

export default function RBACPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [matrix, setMatrix] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/rbac/matrix'); setMatrix(data.matrix||{}); } catch {}
    setLoading(false);
  };

  const togglePerm = async (role: string, mod: string, type: 'read'|'write'|'admin') => {
    const current = matrix?.[role]?.[mod]?.[type] || false;
    setSaving(true);
    try {
      const current_perms = matrix?.[role]?.[mod] || { read:false, write:false, admin:false };
      await api.post('/rbac/permissions', {
        role, module: mod,
        canRead: type==='read' ? !current : current_perms.read,
        canWrite: type==='write' ? !current : current_perms.write,
        canAdmin: type==='admin' ? !current : current_perms.admin,
      });
      setMatrix((m:any) => ({ ...m, [role]: { ...m[role], [mod]: { ...m[role]?.[mod], [type]: !current } } }));
    } catch (err:any) { alert(err.response?.data?.error||'Failed'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Role & Permission Matrix</h1><p className="page-subtitle">Fine-grained access control per module — Admin only</p></div>
          {saving&&<span className="badge badge-blue">Saving…</span>}
        </div>

        <div style={{background:'rgba(239,68,68,0.08)',border:'1px solid rgba(239,68,68,0.25)',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',fontSize:'12.5px',color:'#f87171'}}>
          <strong>⚠️ Caution:</strong> Changes take effect immediately. Role changes for active users apply on their next API request. Trust module (M08) should always require elevated approval.
        </div>

        <div style={{overflowX:'auto',borderRadius:'12px',border:'1px solid var(--border)'}}>
          <table style={{minWidth:'900px'}}>
            <thead>
              <tr>
                <th style={{position:'sticky',left:0,background:'var(--surface-card)',zIndex:2,minWidth:'150px'}}>Module</th>
                {ROLES.map(r=><th key={r} style={{textAlign:'center',minWidth:'120px'}}>{r.replace('_',' ')}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(10)].map((_,i)=>(
                <tr key={i}>
                  <td><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>
                  {ROLES.map((_,j)=><td key={j}><div className="skeleton" style={{height:'40px',borderRadius:'4px'}}/></td>)}
                </tr>
              )) : MODULES.map(mod=>(
                <tr key={mod}>
                  <td style={{position:'sticky',left:0,background:'var(--surface-card)',zIndex:1,fontWeight:500,fontSize:'12.5px',color:mod==='M08'?'#f87171':'var(--text-primary)'}}>
                    {mod==='M08'&&<Shield size={12} style={{display:'inline',marginRight:'4px',color:'#f87171'}}/>}
                    <span style={{fontSize:'11px',color:'var(--text-muted)',display:'block'}}>{mod}</span>
                    {MODULE_LABELS[mod]}
                  </td>
                  {ROLES.map(role=>{
                    const perms = matrix?.[role]?.[mod] || { read:false, write:false, admin:false };
                    return (
                      <td key={role} style={{textAlign:'center'}}>
                        <div style={{display:'flex',justifyContent:'center',gap:'4px'}}>
                          {(['read','write','admin'] as const).map(type=>(
                            <button
                              key={type}
                              title={type}
                              onClick={()=>role!=='ADMIN'&&togglePerm(role,mod,type)}
                              style={{
                                width:'26px',height:'26px',borderRadius:'6px',border:'none',cursor:role==='ADMIN'?'not-allowed':'pointer',
                                background: perms[type] ? (type==='admin'?'rgba(239,68,68,0.2)':type==='write'?'rgba(0,184,98,0.2)':'rgba(34,197,94,0.2)') : 'var(--surface)',
                                color: perms[type] ? (type==='admin'?'#f87171':type==='write'?'var(--accent)':'#4ade80') : 'var(--text-muted)',
                                fontSize:'10px',fontWeight:700,transition:'all 0.15s',display:'flex',alignItems:'center',justifyContent:'center',
                              }}
                            >
                              {type[0].toUpperCase()}
                            </button>
                          ))}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'12px'}}>R = Read &nbsp; W = Write &nbsp; A = Admin. ADMIN role permissions cannot be changed from this interface.</p>
      </main>
    </div>
  );
}
