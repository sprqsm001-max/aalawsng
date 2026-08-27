'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Shield, CheckCircle, AlertCircle, FileText, Scale } from 'lucide-react';

export default function TrustLedgerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ledgerId = params?.id as string;
  const { isAuthenticated, user } = useAuthStore();

  const [ledger, setLedger] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    if (ledgerId) loadLedgerData();
  }, [ledgerId, isAuthenticated]);

  const loadLedgerData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/trust/ledgers`);
      const found = data.find((l: any) => l.id === ledgerId);
      if (!found) {
        setError('Client account ledger not found.');
        return;
      }
      setLedger(found);

      const journalRes = await api.get(`/trust/journal/${found.clientId}?currency=${found.currency || 'NGN'}`);
      setEntries(journalRes.data.entries || []);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load client journal.');
    } finally {
      setLoading(false);
    }
  };

  const typeBadge = (type: string) => {
    switch (type) {
      case 'RECEIPT_CLIENT_FUNDS':
      case 'DEPOSIT':
        return <span className="badge badge-green">Receipt (LPAR 1964)</span>;
      case 'TRANSFER_TO_OFFICE_FEES_EARNED':
      case 'TRANSFER_TO_OPERATING':
        return <span className="badge badge-gold">Fee Transfer to Office</span>;
      case 'TRANSFER_TO_OFFICE_DISBURSEMENT':
        return <span className="badge badge-blue">Disbursement Recovery</span>;
      case 'PAYMENT_TO_CLIENT':
      case 'WITHDRAWAL':
        return <span className="badge badge-red">Payment to Client</span>;
      case 'REFUND':
        return <span className="badge badge-gray">Refund</span>;
      default:
        return <span className="badge badge-gray">{type.replace(/_/g, ' ')}</span>;
    }
  };

  const curSymbol = ledger?.currency === 'USD' ? '$' : '₦';

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.push('/trust')} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={14} /> Back to Client Accounts
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
        ) : error || !ledger ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px' }}>
            <AlertCircle size={36} style={{ color: '#f87171', margin: '0 auto 12px' }} />
            <h2 style={{ fontSize: '18px', color: 'var(--text-primary)', marginBottom: '8px' }}>Ledger Not Found</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '16px' }}>{error || 'Unable to retrieve client account ledger.'}</p>
            <button className="btn btn-secondary" onClick={() => router.push('/trust')}>Return to Client Accounts</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="page-header" style={{ marginBottom: '24px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <Shield size={16} style={{ color: 'var(--accent)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {ledger.accountCategory === 'CLIENT_FUNDS' ? "Legal Practitioners' Accounts Rules 1964" : "RPC 2023 Rule 23 Trust Account"}
                  </span>
                  <span className="badge badge-gray">{ledger.currency}</span>
                </div>
                <h1 className="page-title">
                  {ledger.client?.companyName || `${ledger.client?.firstName} ${ledger.client?.lastName}`}
                </h1>
                <p className="page-subtitle">
                  Bank: {ledger.bankName || 'Access Bank Plc (Designated Client Account)'} · Ledger ID: {ledger.id.slice(0, 8)}…
                </p>
              </div>

              <div className="card-stat" style={{ padding: '14px 22px', minWidth: '240px' }}>
                <p className="stat-label">Current Ledger Balance</p>
                <p className="stat-value" style={{ color: '#4ade80', fontSize: '26px', marginTop: '4px' }}>
                  {curSymbol}{Number(ledger.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>

            {/* Compliance Guarantee Banner */}
            <div style={{ background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <CheckCircle size={18} style={{ color: '#4ade80', flexShrink: 0 }} />
              <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                <strong>Immutable Audit Trail:</strong> Each transaction below is sealed with before/after balances. Every entry complies with LPAR 1964 receipting and withdrawal authorization mandates.
              </p>
            </div>

            {/* Journal Entries Table */}
            <div className="card">
              <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, marginBottom: '16px' }}>
                Client Account Journal History ({entries.length} Entries)
              </h3>
              <div className="table-container" style={{ border: 'none' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Date & Time</th>
                      <th>Transaction Type</th>
                      <th>Description / Purpose</th>
                      <th>Amount</th>
                      <th>Balance Before</th>
                      <th>Balance After</th>
                      <th>Rule Reference</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entries.length === 0 ? (
                      <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No journal transactions recorded yet.</td></tr>
                    ) : (
                      entries.map((e: any) => (
                        <tr key={e.id}>
                          <td style={{ fontSize: '11px', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {new Date(e.createdAt).toLocaleString('en-NG')}
                          </td>
                          <td>{typeBadge(e.type)}</td>
                          <td style={{ fontSize: '13px', color: 'var(--text-primary)', maxWidth: '280px' }}>
                            {e.description}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontWeight: 700, color: ['RECEIPT_CLIENT_FUNDS', 'DEPOSIT'].includes(e.type) ? '#4ade80' : '#f87171' }}>
                            {['RECEIPT_CLIENT_FUNDS', 'DEPOSIT'].includes(e.type) ? '+' : '-'}{curSymbol}{Number(e.amount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '12px', color: 'var(--text-muted)' }}>
                            {curSymbol}{Number(e.balanceBefore).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {curSymbol}{Number(e.balanceAfter).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                          </td>
                          <td style={{ fontSize: '11px', color: 'var(--accent)' }}>
                            {e.lparRuleReference || 'LPAR 1964'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
