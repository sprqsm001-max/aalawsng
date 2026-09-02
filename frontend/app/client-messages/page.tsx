'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { MessageCircle, Send } from 'lucide-react';

export default function ClientMessagingPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ clientId:'', matterId:'', subject:'', body:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [msgRes, cRes, mRes] = await Promise.all([
        api.get('/client-messages?limit=30'),
        api.get('/clients?limit=100'),
        api.get('/matters?limit=100'),
      ]);
      setMessages(msgRes.data.messages || []);
      setTotal(msgRes.data.total || 0);
      setClients(cRes.data.clients || []);
      setMatters(mRes.data.matters || []);
    } catch {}
    setLoading(false);
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clientId || !form.matterId) {
      alert('Please select both a client and a matter');
      return;
    }
    setSaving(true);
    try {
      await api.post('/client-messages', form);
      setShowModal(false);
      setForm({ clientId:'', matterId:'', subject:'', body:'' });
      load();
    } catch (err:any) { alert(err.response?.data?.error || 'Failed to send message'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Client Messages</h1>
            <p className="page-subtitle">Separate channel for client communications — {total} threads</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Send size={15}/>Message Client</button>
        </div>

        <div style={{background:'rgba(34,197,94,0.07)',border:'1px solid rgba(34,197,94,0.2)',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',fontSize:'12.5px',color:'var(--text-secondary)'}}>
          <strong style={{color:'#4ade80'}}>Separate Channel:</strong> This is a distinct communication channel from internal staff messaging. Clients can only read and send messages in their own matters.
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {loading ? [...Array(5)].map((_,i)=><div key={i} className="skeleton" style={{height:'72px',borderRadius:'10px'}}/>)
          : messages.length===0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <MessageCircle size={32} style={{margin:'0 auto 12px',opacity:0.3}}/>
              <p>No client messages yet</p>
            </div>
          ) : messages.map((m:any)=>(
            <div key={m.id} className="card" style={{borderLeft:m.direction==='CLIENT_TO_STAFF'?'3px solid var(--accent)':'3px solid transparent'}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <span style={{fontSize:'13px',fontWeight:600,color:'var(--text-primary)'}}>{m.subject||'(no subject)'}</span>
                    <span className={`badge ${m.direction==='CLIENT_TO_STAFF'?'badge-gold':'badge-blue'}`} style={{fontSize:'10px'}}>{m.direction==='CLIENT_TO_STAFF'?'FROM CLIENT':'TO CLIENT'}</span>
                    {!m.isRead&&<span className="badge badge-blue" style={{fontSize:'10px'}}>NEW</span>}
                  </div>
                  <p style={{fontSize:'12px',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'500px'}}>{m.body}</p>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'4px'}}>Matter: {m.matter?.referenceNumber||'—'}</p>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:'16px'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{new Date(m.sentAt).toLocaleDateString('en-NG')}</p>
                  {m.replies?.length>0&&<p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{m.replies.length} replies</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal&&(
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'20px'}}>Message a Client</h2>
            <form onSubmit={handleSend} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select
                  className="form-input"
                  required
                  value={form.clientId}
                  onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                >
                  <option value="">Select a client…</option>
                  {clients.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.firstName} {c.lastName} {c.companyName ? `— ${c.companyName}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Matter *</label>
                <select
                  className="form-input"
                  required
                  value={form.matterId}
                  onChange={e => setForm(f => ({ ...f, matterId: e.target.value }))}
                >
                  <option value="">Select a matter…</option>
                  {matters.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.referenceNumber} — {m.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Subject *</label><input className="form-input" required value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" required rows={4} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} style={{resize:'none'}}/></div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Sending…':'Send'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
