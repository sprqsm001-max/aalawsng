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
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [form, setForm] = useState({ recipientId:'', subject:'', body:'' });
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('aalawsng-auth')) : null;
    if (!isAuthenticated && !token) {
      router.replace('/login');
      return;
    }
    load();
  }, [mounted, isAuthenticated]);

  const load = async () => {
    setLoading(true);
    try {
      const [msgsRes, unreadRes, staffRes] = await Promise.allSettled([
        api.get('/internal-messages?limit=30'),
        api.get('/internal-messages/unread-count'),
        api.get('/staff?limit=100'),
      ]);

      if (msgsRes.status === 'fulfilled') {
        setMessages(msgsRes.value.data.messages || msgsRes.value.data || []);
        setTotal(msgsRes.value.data.total || 0);
      }
      if (unreadRes.status === 'fulfilled') {
        setUnread(unreadRes.value.data.unreadCount || 0);
      }
      if (staffRes.status === 'fulfilled') {
        setStaffList(staffRes.value.data.staff || staffRes.value.data || []);
      }
    } catch (err) {
      console.error('Failed to load internal messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const openMessage = async (msg: any) => {
    setSelectedMessage(msg);
    if (!msg.isRead) {
      try {
        await api.patch(`/internal-messages/${msg.id}/read`);
        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
        setUnread(prev => Math.max(0, prev - 1));
      } catch {}
    }
  };

  const handleReply = (msg: any) => {
    setForm({
      recipientId: msg.senderId || msg.sender?.id || '',
      subject: msg.subject?.startsWith('Re:') ? msg.subject : `Re: ${msg.subject || ''}`,
      body: `\n\n--- On ${new Date(msg.sentAt).toLocaleString('en-NG')}, ${msg.sender?.firstName || 'Colleague'} wrote: ---\n${msg.body}`,
    });
    setSelectedMessage(null);
    setShowModal(true);
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
            <div
              key={m.id}
              className="card"
              style={{cursor:'pointer',borderLeft:!m.isRead?'3px solid #60a5fa':'3px solid transparent',transition:'background 0.15s ease'}}
              onClick={()=>openMessage(m)}
              title="Click to open and read full message"
            >
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',alignItems:'center',gap:'10px',marginBottom:'4px'}}>
                    <span style={{fontSize:'13.5px',fontWeight:600,color:m.isRead?'var(--text-secondary)':'var(--text-primary)'}}>{m.subject||'(no subject)'}</span>
                    {!m.isRead&&<span className="badge badge-blue" style={{fontSize:'10px'}}>NEW</span>}
                    {m.replies?.length>0&&<span style={{fontSize:'11px',color:'var(--text-muted)',display:'flex',alignItems:'center',gap:'3px'}}><Reply size={10}/>{m.replies.length}</span>}
                  </div>
                  <p style={{fontSize:'12px',color:'var(--text-muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'560px'}}>{m.body}</p>
                </div>
                <div style={{textAlign:'right',flexShrink:0,marginLeft:'16px'}}>
                  <p style={{fontSize:'11px',color:'var(--text-muted)'}}>{new Date(m.sentAt).toLocaleDateString('en-NG')}</p>
                  <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'2px'}}>
                    {m.sender?.firstName ? `${m.sender.firstName} ${m.sender.lastName || ''}` : (m.sender?.staffProfile?.firstName ? `${m.sender.staffProfile.firstName} ${m.sender.staffProfile.lastName}` : 'Colleague')}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Message Reading Pane / Modal */}
      {selectedMessage && (
        <div className="modal-backdrop" onClick={()=>setSelectedMessage(null)}>
          <div className="modal" onClick={e=>e.stopPropagation()} style={{maxWidth:'640px',width:'95%'}}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:'16px',borderBottom:'1px solid var(--border)',paddingBottom:'12px'}}>
              <div>
                <h3 style={{fontSize:'16px',fontWeight:700,color:'var(--text-primary)',marginBottom:'4px'}}>
                  {selectedMessage.subject || '(no subject)'}
                </h3>
                <p style={{fontSize:'12px',color:'var(--text-muted)'}}>
                  From: <strong style={{color:'var(--text-primary)'}}>{selectedMessage.sender?.firstName || 'Colleague'} {selectedMessage.sender?.lastName || ''}</strong> ({selectedMessage.sender?.role || 'Staff'}) · {new Date(selectedMessage.sentAt).toLocaleString('en-NG')}
                </p>
              </div>
              <button className="btn btn-sm btn-secondary" onClick={()=>setSelectedMessage(null)}>Close</button>
            </div>

            <div style={{background:'var(--surface)',padding:'16px',borderRadius:'8px',border:'1px solid var(--border)',minHeight:'140px',maxHeight:'360px',overflowY:'auto',fontSize:'13.5px',lineHeight:'1.6',color:'var(--text-primary)',whiteSpace:'pre-wrap'}}>
              {selectedMessage.body}
            </div>

            <div style={{display:'flex',justifyContent:'flex-end',gap:'10px',marginTop:'18px'}}>
              <button type="button" className="btn btn-secondary" onClick={()=>setSelectedMessage(null)}>Close</button>
              <button type="button" className="btn btn-primary" onClick={()=>handleReply(selectedMessage)}>
                <Reply size={14}/> Reply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Compose Message Modal */}
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
