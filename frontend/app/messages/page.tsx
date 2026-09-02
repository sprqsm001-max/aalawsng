'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { MessageSquare, Send, Reply } from 'lucide-react';

export default function MessagesPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ recipientId:'', subject:'', body:'' });
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try {
      const [msgsRes, unreadRes, staffRes] = await Promise.all([
        api.get('/internal-messages?limit=30'),
        api.get('/internal-messages/unread-count'),
        api.get('/staff?limit=100'),
      ]);
      setMessages(msgsRes.data.messages || []);
      setTotal(msgsRes.data.total || 0);
      setUnread(unreadRes.data.unreadCount || 0);
      setStaffList(staffRes.data.staff || []);
    } catch {}
    setLoading(false);
  };

  const markRead = async (id: string) => {
    try { await api.patch(`/internal-messages/${id}/read`); load(); } catch {}
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.recipientId) {
      alert('Please select a recipient');
      return;
    }
    setSaving(true);
    try {
      await api.post('/internal-messages', form);
      setShowModal(false);
      setForm({ recipientId:'', subject:'', body:'' });
      load();
    } catch (err:any) { alert(err.response?.data?.error || 'Failed to send'); }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Internal Messages</h1>
            <p className="page-subtitle">Staff-only messaging — completely separate from client communications</p>
          </div>
          <button className="btn btn-primary" onClick={()=>setShowModal(true)}><Send size={15}/>Compose</button>
        </div>

        {unread>0&&(
          <div style={{background:'rgba(96,165,250,0.1)',border:'1px solid rgba(96,165,250,0.3)',borderRadius:'8px',padding:'12px 16px',marginBottom:'20px',display:'flex',alignItems:'center',gap:'10px',fontSize:'13px',color:'#60a5fa'}}>
            <MessageSquare size={16}/>
            <span><strong>{unread}</strong> unread message{unread!==1?'s':''}</span>
          </div>
        )}

        <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
          {loading ? [...Array(5)].map((_,i)=><div key={i} className="skeleton" style={{height:'72px',borderRadius:'10px'}}/>)
          : messages.length===0 ? (
            <div style={{textAlign:'center',padding:'60px',color:'var(--text-muted)'}}>
              <MessageSquare size={32} style={{margin:'0 auto 12px',opacity:0.3}}/>
              <p>No messages yet</p>
            </div>
          ) : messages.map((m:any)=>(
            <div key={m.id} className="card" style={{cursor:'pointer',borderLeft:!m.isRead?'3px solid #60a5fa':'3px solid transparent'}} onClick={()=>markRead(m.id)}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <span style={{fontSize:'13px',fontWeight:600,color:m.isRead?'var(--text-secondary)':'var(--text-primary)'}}>{m.subject||'(no subject)'}</span>
                    {!m.isRead&&<span className="badge badge-blue" style={{fontSize:'10px'}}>NEW</span>}
                    {m.replies?.length>0&&<span style={{fontSize:'11px',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:'3px'}}><Reply size={10}/>{m.replies.length}</span>}
                  </div>
                  <p style={{fontSize:'12px',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'500px'}}>{m.body}</p>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:'16px'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{new Date(m.sentAt).toLocaleDateString('en-NG')}</p>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>{m.sender?.staffProfile?.firstName} {m.sender?.staffProfile?.lastName}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {showModal&&(
        <div className="modal-backdrop" onClick={()=>setShowModal(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <h2 style={{fontFamily:'Inter,sans-serif',fontSize:'18px',fontWeight:700,marginBottom:'4px'}}>Compose Internal Message</h2>
            <p style={{fontSize:'12px',color:'var(--text-muted)',marginBottom:'20px'}}>This channel is for staff use only. Client users cannot receive internal messages.</p>
            <form onSubmit={handleSend} style={{display:'flex',flexDirection:'column',gap:'14px'}}>
              <div className="form-group">
                <label className="form-label">Recipient Staff Member *</label>
                <select
                  className="form-input"
                  required
                  value={form.recipientId}
                  onChange={e => setForm(f => ({ ...f, recipientId: e.target.value }))}
                >
                  <option value="">Select a colleague…</option>
                  {staffList.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role || s.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group"><label className="form-label">Subject *</label><input className="form-input" required value={form.subject} onChange={e=>setForm(f=>({...f,subject:e.target.value}))}/></div>
              <div className="form-group"><label className="form-label">Message *</label><textarea className="form-input" required rows={4} value={form.body} onChange={e=>setForm(f=>({...f,body:e.target.value}))} style={{resize:'none'}}/></div>
              <div style={{display:'flex',gap:'10px',justifyContent:'flex-end'}}>
                <button type="button" className="btn btn-secondary" onClick={()=>setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving?'Sending…':'Send Message'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
