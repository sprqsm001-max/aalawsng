'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronRight, AlertTriangle } from 'lucide-react';

const statusColor: Record<string, string> = {
  INTAKE: 'badge-blue', OPEN: 'badge-green', IN_PROGRESS: 'badge-gold',
  PENDING: 'badge-yellow', CLOSED: 'badge-gray', ARCHIVED: 'badge-gray',
};

export default function MattersPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [matters, setMatters] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { router.replace('/login'); return; }
    load();
  }, [page, search, status]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/matters?page=${page}&limit=20${search ? `&search=${search}` : ''}${status ? `&status=${status}` : ''}`);
      setMatters(data.matters || []);
      setTotal(data.total || 0);
    } catch { }
    setLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date().toLocaleDateString('en-NG', { dateStyle: 'long' })}</span>
      </div>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Matters</h1>
            <p className="page-subtitle">{total} total matters across all clients</p>
          </div>
          {user?.tier !== 'CLIENT' && (
            <button className="btn btn-primary" onClick={() => router.push('/matters/new')}>
              <Plus size={16} /> New Matter
            </button>
          )}
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input className="form-input" placeholder="Search matters..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: '36px' }} />
          </div>
          <select className="form-input" style={{ width: '160px' }} value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}>
            <option value="">All Statuses</option>
            {['INTAKE','OPEN','IN_PROGRESS','PENDING','CLOSED','ARCHIVED'].map(s => <option key={s} value={s}>{s.replace('_',' ')}</option>)}
          </select>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Matter Title</th>
                <th>Client</th>
                <th>Type</th>
                <th>Status</th>
                <th>Assigned</th>
                <th>Docs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(7)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '14px', borderRadius: '4px' }} /></td>
                    ))}
                    <td />
                  </tr>
                ))
              ) : matters.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No matters found</td></tr>
              ) : matters.map(m => (
                <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/matters/${m.id}`)}>
                  <td><code style={{ fontSize: '12px', color: 'var(--accent)', fontFamily: 'monospace' }}>{m.referenceNumber}</code></td>
                  <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.title}</td>
                  <td>{m.client?.companyName || `${m.client?.firstName} ${m.client?.lastName}`}</td>
                  <td style={{ fontSize: '12px' }}>{m.matterType?.name}</td>
                  <td><span className={`badge ${statusColor[m.status] || 'badge-gray'}`}>{m.status.replace('_',' ')}</span></td>
                  <td>{m.assignments?.slice(0,2).map((a: any) => `${a.staff.firstName} ${a.staff.lastName[0]}.`).join(', ')}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{m._count?.documents}</td>
                  <td><ChevronRight size={16} style={{ color: 'var(--text-muted)' }} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Showing {matters.length} of {total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={matters.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </main>
    </div>
  );
}
