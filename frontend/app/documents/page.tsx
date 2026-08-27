'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Upload, FileText, Eye, Lock, Download } from 'lucide-react';

export default function DocumentsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [file, setFile] = useState<File|null>(null);
  const [form, setForm] = useState({ matterId:'', name:'', visibility:'INTERNAL', description:'' });
  const [saving, setSaving] = useState(false);
  const [matterId, setMatterId] = useState('');

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, [matterId]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/documents?limit=30${matterId?`&matterId=${matterId}`:''}`);
      setDocs(data.documents||[]);
      setTotal(data.total||0);
    } catch {}
    setLoading(false);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('matterId', form.matterId);
      fd.append('name', form.name || file.name);
      fd.append('visibility', form.visibility);
      fd.append('description', form.description);
      await api.post('/documents', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setShowModal(false);
      setFile(null);
      setForm({ matterId:'', name:'', visibility:'INTERNAL', description:'' });
      load();
    } catch (err:any) { alert(err.response?.data?.error || 'Upload failed'); }
    setSaving(false);
  };

  const fmtSize = (b: number) => b > 1048576 ? `${(b/1048576).toFixed(1)} MB` : `${(b/1024).toFixed(0)} KB`;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{ fontSize:'16px', fontWeight:600, color:'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Documents</h1>
            <p className="page-subtitle">{total} documents — client-visible and internal files managed separately</p>
          </div>
          {user?.tier !== 'CLIENT' && <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Upload size={15}/>Upload Document</button>}
        </div>

        {user?.tier !== 'CLIENT' && (
          <div style={{ background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)', borderRadius:'8px', padding:'12px 16px', marginBottom:'20px', fontSize:'12.5px', color:'var(--text-secondary)' }}>
            <strong style={{color:'#60a5fa'}}>Document Visibility:</strong> <strong>INTERNAL</strong> files are never visible to client portal users regardless of matter. <strong>CLIENT VISIBLE</strong> files appear in the client portal. This flag is enforced at the API layer.
          </div>
        )}

        <div style={{ display:'flex', gap:'12px', marginBottom:'20px' }}>
          <input className="form-input" placeholder="Filter by Matter ID…" value={matterId} onChange={e=>setMatterId(e.target.value)} style={{ maxWidth:'280px' }}/>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Name</th><th>Visibility</th><th>Matter</th><th>Uploaded By</th><th>Size</th><th>Version</th><th>Date</th></tr></thead>
            <tbody>
              {loading ? [...Array(6)].map((_,i)=><tr key={i}>{[...Array(7)].map((_,j)=><td key={j}><div className="skeleton" style={{height:'14px',borderRadius:'4px'}}/></td>)}</tr>)
              : docs.length===0 ? <tr><td colSpan={7} style={{textAlign:'center',padding:'40px',color:'var(--text-muted)'}}>No documents found</td></tr>
              : docs.map((d:any) => (
                <tr key={d.id}>
                  <td><div style={{display:'flex',alignItems:'center',gap:'8px'}}><FileText size={14} style={{color:'var(--accent)',opacity:0.7}}/><span style={{color:'var(--text-primary)',fontWeight:500,fontSize:'13px'}}>{d.name}</span></div></td>
                  <td>
                    {d.visibility === 'CLIENT_VISIBLE'
                      ? <span className="badge badge-green" style={{display:'flex',alignItems:'center',gap:'4px',width:'fit-content'}}><Eye size={10}/>Client Visible</span>
                      : <span className="badge badge-gray" style={{display:'flex',alignItems:'center',gap:'4px',width:'fit-content'}}><Lock size={10}/>Internal</span>}
                  </td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{d.matter?.referenceNumber||'—'}</td>
                  <td style={{fontSize:'12px'}}>{d.uploadedBy?.firstName} {d.uploadedBy?.lastName}</td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{fmtSize(d.fileSize)}</td>
                  <td><span className="badge badge-gray">v{d.version}</span></td>
                  <td style={{fontSize:'12px',color:'var(--text-muted)'}}>{new Date(d.createdAt).toLocaleDateString('en-NG')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {showModal && (
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>Upload Document</h2>
            <form onSubmit={handleUpload} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group">
                <label className="form-label">File *</label>
                <input type="file" className="form-input" required onChange={e=>setFile(e.target.files?.[0]||null)} accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.txt"/>
              </div>
              <div className="form-group"><label className="form-label">Document Name</label><input className="form-input" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} placeholder="Leave blank to use filename"/></div>
              <div className="form-group"><label className="form-label">Matter ID *</label><input className="form-input" required value={form.matterId} onChange={e=>setForm(f=>({...f,matterId:e.target.value}))} placeholder="UUID"/></div>
              <div className="form-group">
                <label className="form-label">Visibility *</label>
                <select className="form-input" value={form.visibility} onChange={e=>setForm(f=>({...f,visibility:e.target.value}))}>
                  <option value="INTERNAL">INTERNAL — Never shown to client</option>
                  <option value="CLIENT_VISIBLE">CLIENT VISIBLE — Shown in client portal</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Description</label><input className="form-input" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))}/></div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end',marginTop:'8px'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Uploading…':'Upload'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
