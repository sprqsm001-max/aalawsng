'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import {
  ArrowLeft, User, Briefcase, Mail, Phone, MapPin, Receipt,
  Shield, Plus, AlertCircle, FileText, CheckCircle, AlertTriangle
} from 'lucide-react';

export default function ClientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { isAuthenticated, user } = useAuthStore();

  const [client, setClient] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (id) loadClient();
  }, [id, isAuthenticated]);

  const loadClient = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/clients/${id}`);
      setClient(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load client');
    } finally {
      setLoading(false);
    }
  };

  const ngnLedger = client?.trustLedgers?.find((l: any) => l.currency === 'NGN');
  const usdLedger = client?.trustLedgers?.find((l: any) => l.currency === 'USD');

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/clients')} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={14} /> Back to Clients
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
        ) : error || !client ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <AlertCircle size={36} style={{ color: '#f87171', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Client Not Found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>{error || 'Unable to retrieve client record.'}</p>
            <button className="btn btn-secondary" onClick={() => router.push('/clients')}>Return to Clients</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <h1 className="page-title" style={{ margin: 0 }}>
                    {client.companyName || `${client.firstName} ${client.lastName}`}
                  </h1>
                  <span className={`badge ${client.kycStatus === 'VERIFIED' ? 'badge-green' : 'badge-yellow'}`}>
                    KYC: {client.kycStatus || 'PENDING'}
                  </span>
                  {client.pepStatus && (
                    <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <AlertTriangle size={10} /> PEP
                    </span>
                  )}
                </div>
                <p className="page-subtitle">
                  {client.companyName ? `Contact: ${client.firstName} ${client.lastName} · ` : ''}
                  {client.rcNumber ? `CAC: ${client.rcNumber} · ` : ''}
                  Client since {new Date(client.intakeDate).toLocaleDateString('en-NG', { dateStyle: 'long' })}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/trust`)}>
                  <Shield size={14} /> Client Accounts
                </button>
                <button className="btn btn-primary btn-sm" onClick={() => router.push(`/matters/new`)}>
                  <Plus size={14} /> Open Matter
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '20px' }}>
              {/* Profile & AML/CFT Card */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="card">
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                    Contact & Identification
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Email</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Mail size={13} style={{ opacity: 0.6 }} /> {client.email}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Phone</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <Phone size={13} style={{ opacity: 0.6 }} /> {client.phone || '—'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Address</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                        <MapPin size={13} style={{ opacity: 0.6 }} /> {client.address || '—'}
                      </p>
                    </div>
                    <div>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Identity Document</p>
                      <p style={{ fontSize: '13px', color: 'var(--text-primary)', marginTop: '2px' }}>
                        {client.idType || 'NIN'}: {client.idNumber || 'Unverified'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Client Money Ledgers */}
                <div className="card">
                  <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                    Client Funds Held (LPAR 1964)
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>NGN Client Account</p>
                      <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: '#4ade80', marginTop: '2px' }}>
                        ₦{Number(ngnLedger?.balance || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </p>
                    </div>

                    <div style={{ background: 'var(--surface)', padding: '12px', borderRadius: '8px' }}>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>USD Domiciliary Account</p>
                      <p style={{ fontSize: '18px', fontFamily: 'monospace', fontWeight: 700, color: '#60a5fa', marginTop: '2px' }}>
                        ${Number(usdLedger?.balance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matters List */}
              <div className="card">
                <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '14px' }}>
                  Matters ({client.matters?.length || 0})
                </h3>
                <div className="table-container" style={{ border: 'none' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Reference</th>
                        <th>Title</th>
                        <th>Status</th>
                        <th>Opened</th>
                      </tr>
                    </thead>
                    <tbody>
                      {client.matters?.length === 0 ? (
                        <tr><td colSpan={4} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No matters found for this client.</td></tr>
                      ) : (
                        client.matters?.map((m: any) => (
                          <tr key={m.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/matters/${m.id}`)}>
                            <td><code style={{ fontSize: '12px', color: 'var(--accent)' }}>{m.referenceNumber}</code></td>
                            <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{m.title}</td>
                            <td><span className="badge badge-gray">{m.status}</span></td>
                            <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{new Date(m.openedAt).toLocaleDateString('en-NG')}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
