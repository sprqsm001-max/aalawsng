'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Briefcase, FileText, Receipt, MessageCircle, Shield, CreditCard } from 'lucide-react';

export default function PortalPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [payingId, setPayingId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (user?.tier !== 'CLIENT') {
      router.replace('/dashboard');
      return;
    }
    load();
  }, [isAuthenticated, user, router]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/portal/overview');
      setOverview(data);
    } catch {}
    setLoading(false);
  };

  const handlePaystack = async (inv: any) => {
    setPayingId(inv.id);
    try {
      const { data } = await api.post('/trust/portal-payment', {
        invoiceId: inv.id,
        clientId: inv.clientId,
      });
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to initialize Paystack payment');
    } finally {
      setPayingId(null);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
          <span style={{ fontSize: '10.5px', color: 'var(--accent)', background: 'rgba(0,184,98,0.1)', padding: '1px 8px', borderRadius: '999px', border: '1px solid rgba(0,184,98,0.25)' }}>
            Client Portal (Private & Encrypted)
          </span>
        </div>
      </div>

      <main className="main-content">
        {/* Welcome */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Welcome, {overview?.client?.firstName || 'Client'}</h1>
            <p className="page-subtitle">Adeola Kolawole & Associates — Legal Operations & Client Account Services</p>
          </div>
          <span className="badge badge-green">
            Client Portal
          </span>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '10px' }} />
            ))}
          </div>
        ) : (
          <>
            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Active Matters', value: overview?.matters?.length || 0, icon: Briefcase, color: '#ffffff' },
                { label: 'Pending Invoices', value: overview?.pendingInvoices?.length || 0, icon: Receipt, color: '#f59e0b' },
                { label: 'Unread Messages', value: overview?.unreadMessages || 0, icon: MessageCircle, color: '#38bdf8' },
                { label: 'Client Funds Held', value: `₦${Number(overview?.client?.trustLedgers?.find((l: any) => l.currency === 'NGN')?.balance || 0).toLocaleString()}`, icon: Shield, color: '#00b862' },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="card-stat">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p className="stat-label">{s.label}</p>
                        <p className="stat-value" style={{ color: s.color }}>{s.value}</p>
                      </div>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} style={{ color: s.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* My Matters and Pending Invoices */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 600 }}>My Legal Matters</h3>
                  <a href="/matters" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>View All</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overview?.matters?.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No active matters</p>
                  )}
                  {overview?.matters?.map((m: any) => (
                    <div key={m.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px' }}>
                      <div>
                        <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500 }}>{m.title}</p>
                        <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{m.referenceNumber}</p>
                      </div>
                      <span className={`badge ${m.status === 'OPEN' || m.status === 'IN_PROGRESS' ? 'badge-green' : 'badge-gray'}`}>
                        {m.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pending Invoices with Paystack Checkout */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 600 }}>Outstanding Invoices</h3>
                  <a href="/invoices" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>View All</a>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {overview?.pendingInvoices?.length === 0 && (
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '16px' }}>No pending invoices</p>
                  )}
                  {overview?.pendingInvoices?.map((inv: any) => {
                    const isNgn = (inv.currency || 'NGN') === 'NGN';
                    const cur = isNgn ? '₦' : '$';
                    const due = Math.ceil((new Date(inv.dueDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                    return (
                      <div key={inv.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px' }}>
                        <div>
                          <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 600 }}>
                            {cur}{Number(inv.totalAmount - inv.amountPaid).toLocaleString()}
                          </p>
                          <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>
                            {inv.invoiceNumber} · Due in {due}d
                          </p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className={`badge ${inv.status === 'OVERDUE' ? 'badge-red' : 'badge-yellow'}`}>
                            {inv.status}
                          </span>
                          <button
                            className="btn btn-sm btn-primary"
                            disabled={payingId === inv.id}
                            onClick={() => handlePaystack(inv)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '10.5px', padding: '3px 7px' }}
                          >
                            <CreditCard size={11} /> {payingId === inv.id ? 'Loading…' : 'Pay Online'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
