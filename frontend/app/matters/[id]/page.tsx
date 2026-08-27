'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft, Briefcase, FileText, CheckSquare, Clock, Receipt,
  User, Calendar, AlertCircle, Shield, Plus, Upload
} from 'lucide-react';

export default function MatterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isAuthenticated, user } = useAuthStore();

  const [matter, setMatter] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'tasks' | 'time' | 'billing'>('overview');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (id) loadMatter();
  }, [id, isAuthenticated]);

  const loadMatter = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/matters/${id}`);
      setMatter(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load matter');
    } finally {
      setLoading(false);
    }
  };

  const statusColor: Record<string, string> = {
    INTAKE: 'badge-blue', OPEN: 'badge-green', IN_PROGRESS: 'badge-gold',
    PENDING: 'badge-yellow', CLOSED: 'badge-gray', ARCHIVED: 'badge-gray',
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/matters')} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={14} /> Back to Matters
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
        </div>
      </div>

      <main className="main-content">
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
            <div className="skeleton" style={{ height: '300px', borderRadius: '12px' }} />
          </div>
        ) : error || !matter ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <AlertCircle size={36} style={{ color: '#f87171', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Matter Not Found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>{error || 'Unable to retrieve matter details.'}</p>
            <button className="btn btn-secondary" onClick={() => router.push('/matters')}>Return to Matters</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                  <code style={{ fontSize: '13px', color: 'var(--accent)', fontFamily: 'monospace', background: 'rgba(200,169,110,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                    {matter.referenceNumber}
                  </code>
                  <span className={`badge ${statusColor[matter.status] || 'badge-gray'}`}>
                    {matter.status.replace(/_/g, ' ')}
                  </span>
                </div>
                <h1 className="page-title">{matter.title}</h1>
                <p className="page-subtitle">
                  Client: {matter.client?.companyName || `${matter.client?.firstName} ${matter.client?.lastName}`}
                  {matter.matterType ? ` · Type: ${matter.matterType.name}` : ''}
                </p>
              </div>

              {user?.tier !== 'CLIENT' && (
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/time?matterId=${matter.id}`)}>
                    <Clock size={14} /> Log Time
                  </button>
                  <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/documents?matterId=${matter.id}`)}>
                    <Upload size={14} /> Upload Doc
                  </button>
                </div>
              )}
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', borderBottom: '1px solid var(--border)', paddingBottom: '12px' }}>
              {[
                { id: 'overview', label: 'Overview', icon: Briefcase },
                { id: 'documents', label: `Documents (${matter.documents?.length || 0})`, icon: FileText },
                { id: 'tasks', label: `Tasks (${matter.tasks?.length || 0})`, icon: CheckSquare },
                { id: 'time', label: `Time Entries (${matter.timeEntries?.length || 0})`, icon: Clock },
                { id: 'billing', label: `Invoices (${matter.invoices?.length || 0})`, icon: Receipt },
              ].map(tab => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`btn btn-sm ${active ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Tab: Overview */}
            {activeTab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card">
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                      Scope & Description
                    </h3>
                    <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                      {matter.description || 'No description provided for this matter.'}
                    </p>
                  </div>

                  <div className="card">
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                      Court & Litigation Details
                    </h3>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Court / Jurisdiction</p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>{matter.courtJurisdiction || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Suit / Case Number</p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>{matter.courtCaseNumber || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opposing Party</p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>{matter.opposingPartyName || '—'}</p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opposing Counsel</p>
                        <p style={{ fontSize: '13.5px', color: 'var(--text-primary)', marginTop: '2px' }}>{matter.opposingCounselName || '—'}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Sidebar Info */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                  <div className="card">
                    <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                      Key Dates & Assigned Staff
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Opened Date</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {new Date(matter.openedAt).toLocaleDateString('en-NG', { dateStyle: 'long' })}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Lead Attorney</p>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {matter.leadAttorney ? `${matter.leadAttorney.firstName} ${matter.leadAttorney.lastName}` : 'Unassigned'}
                        </p>
                      </div>
                      <div>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Budget</p>
                        <p style={{ fontSize: '14px', fontFamily: 'monospace', fontWeight: 600, color: 'var(--accent)' }}>
                          {matter.budgetAmount ? `₦${Number(matter.budgetAmount).toLocaleString()}` : 'No budget set'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: Documents */}
            {activeTab === 'documents' && (
              <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Document Name</th>
                        <th>Visibility</th>
                        <th>Uploaded By</th>
                        <th>Size</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matter.documents?.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No documents associated with this matter.</td></tr>
                      ) : matter.documents?.map((d: any) => (
                        <tr key={d.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{d.name}</td>
                          <td>
                            {d.visibility === 'CLIENT_VISIBLE' ? (
                              <span className="badge badge-green">Client Visible</span>
                            ) : (
                              <span className="badge badge-gray">Internal</span>
                            )}
                          </td>
                          <td style={{ fontSize: '12px' }}>{d.uploadedBy?.firstName} {d.uploadedBy?.lastName}</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{(d.fileSize / 1024).toFixed(0)} KB</td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(d.createdAt).toLocaleDateString('en-NG')}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Tasks */}
            {activeTab === 'tasks' && (
              <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Task</th>
                        <th>Assigned To</th>
                        <th>Priority</th>
                        <th>Status</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matter.tasks?.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No tasks for this matter.</td></tr>
                      ) : matter.tasks?.map((t: any) => (
                        <tr key={t.id}>
                          <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{t.title}</td>
                          <td style={{ fontSize: '12px' }}>{t.assignedTo ? `${t.assignedTo.firstName} ${t.assignedTo.lastName}` : 'Unassigned'}</td>
                          <td><span className="badge badge-blue">{t.priority}</span></td>
                          <td><span className="badge badge-gray">{t.status}</span></td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-NG') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Time */}
            {activeTab === 'time' && (
              <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Staff</th>
                        <th>Description</th>
                        <th>Duration</th>
                        <th>Billable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matter.timeEntries?.length === 0 ? (
                        <tr><td colSpan={5} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No time entries recorded.</td></tr>
                      ) : matter.timeEntries?.map((te: any) => (
                        <tr key={te.id}>
                          <td style={{ fontSize: '12px' }}>{new Date(te.date).toLocaleDateString('en-NG')}</td>
                          <td style={{ fontSize: '12px' }}>{te.staff?.firstName} {te.staff?.lastName}</td>
                          <td style={{ fontSize: '13px' }}>{te.description}</td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>{(te.minutes / 60).toFixed(2)}h</td>
                          <td>{te.isBillable ? <span className="badge badge-green">Yes</span> : <span className="badge badge-gray">No</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Tab: Billing */}
            {activeTab === 'billing' && (
              <div className="card">
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Invoice #</th>
                        <th>Total Amount</th>
                        <th>Amount Paid</th>
                        <th>Destination</th>
                        <th>Status</th>
                        <th>Due Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {matter.invoices?.length === 0 ? (
                        <tr><td colSpan={6} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No invoices for this matter.</td></tr>
                      ) : matter.invoices?.map((inv: any) => (
                        <tr key={inv.id}>
                          <td><code style={{ fontSize: '12px', color: 'var(--accent)' }}>{inv.invoiceNumber}</code></td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 600 }}>₦{Number(inv.totalAmount).toLocaleString()}</td>
                          <td style={{ fontFamily: 'monospace', color: '#4ade80' }}>₦{Number(inv.amountPaid).toLocaleString()}</td>
                          <td><span className="badge badge-blue">{inv.paymentDestination}</span></td>
                          <td><span className="badge badge-gray">{inv.status}</span></td>
                          <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-NG') : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
