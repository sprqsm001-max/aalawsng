'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Scale, Search, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ConflictsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [checks, setChecks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId:'', matterId:'', searchTerms:'' });
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get('/conflicts'); setChecks(data||[]); } catch {}
    setLoading(false);
  };

  const runCheck = async (e: React.FormEvent) => {
    e.preventDefault(); setRunning(true); setResult(null);
    try {
      const terms = form.searchTerms.split(',').map(t=>t.trim()).filter(Boolean);
      const { data } = await api.post('/conflicts/run', { clientId: form.clientId||undefined, matterId: form.matterId||undefined, searchTerms: terms });
      setResult(data.summary);
      load();
    } catch (err:any) { alert(err.response?.data?.error||'Check failed'); }
    setRunning(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Conflict of Interest Checks</h1><p className="page-subtitle">Must be run before onboarding any new client</p></div>
          <button className="btn btn-primary" onClick={()=>{setShowModal(true);setResult(null)}}><Search size={15}/>Run Conflict Check</button>
        </div>

        <div style={{background:'rgba(200,169,110,0.07)',border:'1px solid rgba(200,169,110,0.2)',borderRadius:'10px',padding:'14px 18px',marginBottom:'24px',fontSize:'12.5px',color:'var(--text-secondary)',lineHeight:1.5}}>
          <strong style={{color:'var(--accent)'}}>Compliance Requirement:</strong> A conflict check must be completed before any client intake is finalized. Flagged results require human review — they do not auto-block intake. All checks are permanently logged.
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Date</th><th>Client</th><th>Search Terms</th><th>Result</th><th>Flagged Clients</th><th>Flagged Matters</th></tr></thead>
            <tbody>
              {loading ? [...Array(4)].map((_,i)=><tr key={i}>{[...Array(6)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : checks.length===0 ? <tr><td colSpan={6} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No conflict checks run yet</td></tr>
              : checks.map((c:any)=>(
                <tr key={c.id}>
                  <td style={{fontSize:'12px'}}>{new Date(c.checkedAt).toLocaleString('en-NG')}</td>
                  <td style={{fontSize:'13px'}}>{c.client?.firstName} {c.client?.lastName||'—'}</td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)',maxWidth:'200px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{(c.searchTerms||[]).join(', ')}</td>
                  <td>
                    {c.result==='CLEAR'
                      ? <span className="badge badge-green" style={{display:'flex',alignItems:'center',gap:'4px',width:'fit-content'}}><CheckCircle size={10}/>CLEAR</span>
                      : <span className="badge badge-red" style={{display:'flex',alignItems:'center',gap:'4px',width:'fit-content'}}><AlertTriangle size={10}/>{c.result}</span>}
                  </td>
                  <td><span className="badge badge-yellow">{(c.flaggedClients||[]).length}</span></td>
                  <td><span className="badge badge-yellow">{(c.flaggedMatters||[]).length}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal&&(
        <div className="modal-backdrop" onClick={()=>{setShowModal(false);setResult(null)}}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'8px'}}>Run Conflict of Interest Check</h2>
            <p style={{fontSize:'12.5px',color:'var(--text-muted)',marginBottom:'20px'}}>Enter names, companies, and related party names to search across all existing clients and matters.</p>
            <form onSubmit={runCheck} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group"><label className="form-label">Client ID (optional)</label><input className="form-input" value={form.clientId} onChange={e=>setForm(f=>({...f,clientId:e.target.value}))} placeholder="UUID of new client being checked"/></div>
              <div className="form-group"><label className="form-label">Matter ID (optional)</label><input className="form-input" value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))} placeholder="UUID"/></div>
              <div className="form-group">
                <label className="form-label">Search Terms * (comma-separated)</label>
                <input className="form-input" required value={form.searchTerms} onChange={e=>setForm(f=>({...f,searchTerms:e.target.value}))} placeholder="Adeyemi, Chukwuemeka, ABC Limited, opposing counsel name"/>
              </div>
              {result&&(
                <div className={result.result==='CLEAR'?'trust-safe':'trust-alert'}>
                  {result.result==='CLEAR'?<CheckCircle size={18}/>:<AlertTriangle size={18}/>}
                  <div>
                    <strong>{result.result==='CLEAR'?'No conflicts detected':'Potential conflicts found — human review required'}</strong>
                    {result.result!=='CLEAR'&&(
                      <p style={{fontSize:'12px',marginTop:'4px',opacity:0.8}}>
                        {result.flaggedClients.length} matching client(s), {result.flaggedMatters.length} matching matter(s)
                      </p>
                    )}
                  </div>
                </div>
              )}
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>{setShowModal(false);setResult(null)}}>Close</button>
                <button type="submit" className="btn btn-primary" disabled={running}>{running?'Searching…':'Run Check'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
