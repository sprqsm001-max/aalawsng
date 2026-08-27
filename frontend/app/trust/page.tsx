'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Shield, ArrowRight, AlertTriangle, CheckCircle, DollarSign, Scale, FileText } from 'lucide-react';

export default function TrustAccountingPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [ledgers, setLedgers] = useState<any[]>([]);
  const [reconciliations, setReconciliations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currencyFilter, setCurrencyFilter] = useState<'ALL' | 'NGN' | 'USD'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CLIENT_FUNDS' | 'TRUST_FUNDS'>('ALL');

  const [depositModal, setDepositModal] = useState(false);
  const [transferModal, setTransferModal] = useState(false);
  const [reconModal, setReconModal] = useState(false);

  const [form, setForm] = useState({
    clientId: '',
    amount: '',
    currency: 'NGN',
    accountCategory: 'CLIENT_FUNDS',
    description: '',
    referenceType: 'MANUAL',
    lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
    invoiceId: '',
    billDeliveredProof: true,
  });

  const [bankBalance, setBankBalance] = useState('');
  const [reconCurrency, setReconCurrency] = useState('NGN');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [currencyFilter, categoryFilter, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const curParam = currencyFilter !== 'ALL' ? `currency=${currencyFilter}` : '';
      const catParam = categoryFilter !== 'ALL' ? `category=${categoryFilter}` : '';
      const query = [curParam, catParam].filter(Boolean).join('&');

      const [ledgersRes, reconRes] = await Promise.all([
        api.get(`/trust/ledgers${query ? `?${query}` : ''}`),
        api.get('/trust/reconciliations'),
      ]);
      setLedgers(ledgersRes.data || []);
      setReconciliations(reconRes.data || []);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const totalFundsNGN = ledgers
    .filter(l => l.currency === 'NGN')
    .reduce((sum, l) => sum + Number(l.balance), 0);

  const totalFundsUSD = ledgers
    .filter(l => l.currency === 'USD')
    .reduce((sum, l) => sum + Number(l.balance), 0);

  const latestRecon = reconciliations[0];

  const handleDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/trust/deposit', {
        clientId: form.clientId,
        amount: parseFloat(form.amount),
        currency: form.currency,
        accountCategory: form.accountCategory,
        description: form.description,
        referenceType: form.referenceType,
        lparRuleReference: form.lparRuleReference,
      });

      setDepositModal(false);
      setForm({
        clientId: '',
        amount: '',
        currency: 'NGN',
        accountCategory: 'CLIENT_FUNDS',
        description: '',
        referenceType: 'MANUAL',
        lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
        invoiceId: '',
        billDeliveredProof: true,
      });
      loadData();

      if (data.amlAlert) {
        alert(data.amlAlert);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Deposit failed');
    } finally {
      setSaving(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/trust/transfer', {
        clientId: form.clientId,
        invoiceId: form.invoiceId,
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description,
        billDeliveredProof: form.billDeliveredProof,
      });
      setTransferModal(false);
      setForm({
        clientId: '',
        amount: '',
        currency: 'NGN',
        accountCategory: 'CLIENT_FUNDS',
        description: '',
        referenceType: 'MANUAL',
        lparRuleReference: 'LPAR 1964 Rule 3 - Receipt of Client Money',
        invoiceId: '',
        billDeliveredProof: true,
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Transfer failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReconcile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.post('/trust/reconcile', {
        bankBalance: parseFloat(bankBalance),
        currency: reconCurrency,
        accountCategory: 'CLIENT_FUNDS',
        notes: `Monthly Bank Reconciliation Certificate per LPAR 1964 (${reconCurrency})`,
      });

      setReconModal(false);
      setBankBalance('');
      loadData();

      if (!data.summary.isMatched) {
        alert(`⚠️ RECONCILIATION DISCREPANCY: ${reconCurrency} ${data.summary.discrepancy.toLocaleString()}`);
      } else {
        alert(`✅ Three-way bank reconciliation passed for ${reconCurrency} Client Account.`);
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Reconciliation failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
          <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(200,169,110,0.1)', padding: '2px 8px', borderRadius: '999px', border: '1px solid rgba(200,169,110,0.2)' }}>
            LPAR 1964 & RPC 2023 Compliant
          </span>
        </div>
      </div>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Client & Trust Accounts</h1>
            <p className="page-subtitle">
              Segregated Client Funds (LPAR 1964), Trust Funds (RPC 2023 Rule 23), and Firm Office Accounts
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary" onClick={() => setReconModal(true)}>
              <Scale size={15} /> 3-Way Reconciliation
            </button>
            <button className="btn btn-secondary" onClick={() => setTransferModal(true)}>
              <ArrowRight size={15} /> Transfer Earned Fees
            </button>
            <button className="btn btn-primary" onClick={() => setDepositModal(true)}>
              <Plus size={15} /> Record Receipt
            </button>
          </div>
        </div>

        {/* Compliance Notice Banner */}
        <div style={{ background: 'rgba(200,169,110,0.08)', border: '1px solid rgba(200,169,110,0.25)', borderRadius: '12px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
          <Shield size={20} style={{ color: 'var(--accent)', marginTop: '2px', flexShrink: 0 }} />
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <strong style={{ color: 'var(--accent)', display: 'block', marginBottom: '3px' }}>
              Nigerian Legal Practice Accounting Architecture
            </strong>
            In accordance with the <strong>Legal Practitioners’ Accounts Rules 1964</strong> and <strong>Rules of Professional Conduct 2023 (RPC 2023 Rule 23)</strong>, all client funds are strictly segregated from firm office operating revenue. Transfers to firm office accounts require an issued bill of costs/invoice. Paystack payment processing charges are absorbed by the firm and never deducted from client money.
          </div>
        </div>

        {/* Latest Reconciliation Status */}
        {latestRecon && (
          <div className={latestRecon.isMatched ? 'trust-safe' : 'trust-alert'} style={{ marginBottom: '24px' }}>
            {latestRecon.isMatched ? (
              <>
                <CheckCircle size={18} />
                <div>
                  <strong>Client Bank Account Reconciliation: MATCHED ({latestRecon.currency})</strong>
                  <span style={{ marginLeft: '12px', fontSize: '12px', opacity: 0.8 }}>
                    Last reconciled: {new Date(latestRecon.reconciledAt || latestRecon.checkedAt || Date.now()).toLocaleString('en-NG')}
                  </span>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle size={18} />
                <div>
                  <strong>
                    RECONCILIATION DISCREPANCY — Discrepancy: {latestRecon.currency} {Number(latestRecon.discrepancyAmount).toLocaleString()}
                  </strong>
                  <span style={{ display: 'block', fontSize: '12px', marginTop: '2px' }}>
                    Audit investigation required per LPAR 1964. Bank balance does not match client ledger totals.
                  </span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Multi-Currency Balances */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
          <div className="card-stat">
            <p className="stat-label">Client Funds Held (NGN)</p>
            <p className="stat-value" style={{ color: '#4ade80', marginTop: '4px' }}>
              ₦{totalFundsNGN.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-stat">
            <p className="stat-label">Client Funds Held (USD)</p>
            <p className="stat-value" style={{ color: '#60a5fa', marginTop: '4px' }}>
              ${totalFundsUSD.toLocaleString('en-US', { minimumFractionDigits: 2 })}
            </p>
          </div>
          <div className="card-stat">
            <p className="stat-label">Active Client Ledgers</p>
            <p className="stat-value" style={{ marginTop: '4px' }}>{ledgers.length}</p>
          </div>
          <div className="card-stat">
            <p className="stat-label">Reconciliations Run</p>
            <p className="stat-value" style={{ marginTop: '4px' }}>{reconciliations.length}</p>
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Currency:</span>
            {(['ALL', 'NGN', 'USD'] as const).map(cur => (
              <button
                key={cur}
                className={`btn btn-sm ${currencyFilter === cur ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCurrencyFilter(cur)}
              >
                {cur === 'ALL' ? 'All Currencies' : cur}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <span style={{ fontSize: '13px', color: 'var(--text-muted)', alignSelf: 'center', marginRight: '4px' }}>Fund Category:</span>
            {(['ALL', 'CLIENT_FUNDS', 'TRUST_FUNDS'] as const).map(cat => (
              <button
                key={cat}
                className={`btn btn-sm ${categoryFilter === cat ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setCategoryFilter(cat)}
              >
                {cat === 'ALL' ? 'All Funds' : cat.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Ledgers Table */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Per-Client & Per-Matter Sub-Ledgers
          </h3>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Client Name / Company</th>
                  <th>Category</th>
                  <th>Currency</th>
                  <th>Ledger Balance</th>
                  <th>Transactions</th>
                  <th>Bank Account</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i}>
                      {[...Array(6)].map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: '14px', borderRadius: '4px' }} /></td>
                      ))}
                      <td />
                    </tr>
                  ))
                ) : ledgers.length === 0 ? (
                  <tr><td colSpan={7} style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>No client ledgers match filters.</td></tr>
                ) : (
                  ledgers.map(l => (
                    <tr key={l.id}>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>
                        {l.client?.companyName || `${l.client?.firstName} ${l.client?.lastName}`}
                      </td>
                      <td>
                        <span className={`badge ${l.accountCategory === 'CLIENT_FUNDS' ? 'badge-blue' : 'badge-gold'}`}>
                          {l.accountCategory.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-gray">{l.currency}</span>
                      </td>
                      <td>
                        <span style={{ color: Number(l.balance) > 0 ? '#4ade80' : 'var(--text-muted)', fontWeight: 700, fontFamily: 'monospace', fontSize: '15px' }}>
                          {l.currency === 'USD' ? '$' : '₦'}{Number(l.balance).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </span>
                      </td>
                      <td><span className="badge badge-gray">{l._count?.journalEntries || 0}</span></td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{l.bankName || 'Access Bank Plc'}</td>
                      <td>
                        <button className="btn btn-secondary btn-sm" onClick={() => router.push(`/trust/${l.id}`)}>
                          View Journal
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 3-Way Reconciliation Certificates */}
        <div className="card">
          <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Three-Way Bank Reconciliation Certificates
          </h3>
          <div className="table-container" style={{ border: 'none' }}>
            <table>
              <thead>
                <tr>
                  <th>Audit Date</th>
                  <th>Currency</th>
                  <th>Bank Statement Balance</th>
                  <th>Client Ledgers Total</th>
                  <th>Cash Book System Total</th>
                  <th>Compliance Status</th>
                  <th>Discrepancy</th>
                </tr>
              </thead>
              <tbody>
                {reconciliations.slice(0, 10).map(r => (
                  <tr key={r.id}>
                    <td style={{ fontSize: '12px' }}>{new Date(r.checkedAt).toLocaleString('en-NG')}</td>
                    <td><span className="badge badge-gray">{r.currency || 'NGN'}</span></td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {r.currency === 'USD' ? '$' : '₦'}{Number(r.bankBalance).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {r.currency === 'USD' ? '$' : '₦'}{Number(r.ledgerSum).toLocaleString()}
                    </td>
                    <td style={{ fontFamily: 'monospace', fontSize: '13px' }}>
                      {r.currency === 'USD' ? '$' : '₦'}{Number(r.systemTotal).toLocaleString()}
                    </td>
                    <td>
                      <span className={`badge ${r.isMatched ? 'badge-green' : 'badge-red'}`}>
                        {r.isMatched ? 'MATCHED (LPAR COMPLIANT)' : 'MISMATCH'}
                      </span>
                    </td>
                    <td style={{ color: Number(r.discrepancyAmount) > 0 ? '#f87171' : 'var(--text-muted)', fontFamily: 'monospace', fontSize: '13px' }}>
                      {Number(r.discrepancyAmount) > 0 ? `${r.currency === 'USD' ? '$' : '₦'}${Number(r.discrepancyAmount).toLocaleString()}` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Record Receipt Modal */}
      {depositModal && (
        <div className="modal-backdrop" onClick={() => setDepositModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              Record Client Money Receipt
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Governed by Legal Practitioners' Accounts Rules 1964 Rule 3. Client money must be deposited into the designated Client Bank Account.
            </p>
            <form onSubmit={handleDeposit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Client ID *</label>
                <input className="form-input" required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} placeholder="UUID of client" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Currency *</label>
                  <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="NGN">NGN (₦ Nigerian Naira)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Amount *</label>
                  <input className="form-input" type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 5000000" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Account Category</label>
                <select className="form-input" value={form.accountCategory} onChange={e => setForm(f => ({ ...f, accountCategory: e.target.value }))}>
                  <option value="CLIENT_FUNDS">Client Funds (LPAR 1964)</option>
                  <option value="TRUST_FUNDS">Trust Funds (RPC 2023 Rule 23)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Description / Purpose *</label>
                <input className="form-input" required value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="e.g. Retainer deposit for commercial contract" />
              </div>

              <div style={{ background: 'rgba(200,169,110,0.08)', borderRadius: '8px', padding: '12px', fontSize: '12px', color: 'var(--text-muted)' }}>
                ℹ️ Receipts exceeding ₦5,000,000 (or $10,000) are flagged for SCUML/NFIU AML/CFT record-keeping under the Money Laundering Act 2022.
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDepositModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Recording…' : 'Record Receipt'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Transfer to Office Modal */}
      {transferModal && (
        <div className="modal-backdrop" onClick={() => setTransferModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              Transfer Earned Fees to Firm Office Account
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Governed by LPAR 1964 Rule 7. Transfer is only permissible when a bill of costs / invoice has been issued to the client.
            </p>
            <form onSubmit={handleTransfer} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Client ID *</label>
                <input className="form-input" required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} />
              </div>

              <div className="form-group">
                <label className="form-label">Invoice ID *</label>
                <input className="form-input" required value={form.invoiceId} onChange={e => setForm(f => ({ ...f, invoiceId: e.target.value }))} placeholder="UUID of issued invoice" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Currency *</label>
                  <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="NGN">NGN (₦)</option>
                    <option value="USD">USD ($)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Transfer Amount *</label>
                  <input className="form-input" type="number" required min="0.01" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Transfer Rationale</label>
                <input className="form-input" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Payment of professional fees earned" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setTransferModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Executing Transfer…' : 'Execute Transfer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3-Way Reconciliation Modal */}
      {reconModal && (
        <div className="modal-backdrop" onClick={() => setReconModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>
              Nigerian Bar Association 3-Way Bank Reconciliation
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Enter the bank statement balance from your commercial bank's designated Client Bank Account.
            </p>
            <form onSubmit={handleReconcile} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Account Currency</label>
                <select className="form-input" value={reconCurrency} onChange={e => setReconCurrency(e.target.value)}>
                  <option value="NGN">NGN (₦ Access Bank Client Account)</option>
                  <option value="USD">USD ($ Zenith Bank Domiciliary Account)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Bank Statement Balance *</label>
                <input className="form-input" type="number" required min="0" step="0.01" value={bankBalance} onChange={e => setBankBalance(e.target.value)} placeholder="0.00" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setReconModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Checking…' : 'Run 3-Way Check'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
