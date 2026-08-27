'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Send, CreditCard, ExternalLink, CheckCircle } from 'lucide-react';

const statusColor: Record<string, string> = {
  DRAFT: 'badge-gray',
  SENT: 'badge-blue',
  VIEWED: 'badge-blue',
  PARTIALLY_PAID: 'badge-yellow',
  PAID: 'badge-green',
  OVERDUE: 'badge-red',
  CANCELLED: 'badge-gray',
};

export default function InvoicesPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [currencyFilter, setCurrencyFilter] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: '',
    matterId: '',
    currency: 'NGN',
    lineItems: '',
    dueDate: '',
    paymentDestination: 'OFFICE_ACCOUNT',
    notes: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
    else loadData();
  }, [statusFilter, currencyFilter, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(
        `/invoices?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`
      );
      let list = data.invoices || [];
      if (currencyFilter !== 'ALL') {
        list = list.filter((i: any) => i.currency === currencyFilter);
      }
      setInvoices(list);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  const sendInvoice = async (id: string) => {
    try {
      await api.patch(`/invoices/${id}/send`);
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed');
    }
  };

  const handlePaystackPay = async (invoice: any) => {
    setPayingId(invoice.id);
    try {
      const { data } = await api.post('/trust/portal-payment', {
        invoiceId: invoice.id,
        clientId: invoice.clientId,
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      let lineItems = [];
      try {
        lineItems = JSON.parse(form.lineItems);
      } catch {
        lineItems = [{ description: 'Professional Legal Services', quantity: 1, unitPrice: 250000 }];
      }

      await api.post('/invoices', {
        clientId: form.clientId,
        matterId: form.matterId,
        currency: form.currency,
        lineItems,
        dueDate: form.dueDate,
        paymentDestination: form.paymentDestination,
        notes: form.notes,
      });

      setShowModal(false);
      setForm({
        clientId: '',
        matterId: '',
        currency: 'NGN',
        lineItems: '',
        dueDate: '',
        paymentDestination: 'OFFICE_ACCOUNT',
        notes: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create invoice');
    }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
          <span style={{ fontSize: '11px', color: '#4ade80', background: 'rgba(34,197,94,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
            Paystack Integrated
          </span>
        </div>
      </div>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Invoices & Billing</h1>
            <p className="page-subtitle">{total} invoices — Paystack payment enabled for NGN and USD</p>
          </div>
          {user?.tier !== 'CLIENT' && (
            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> New Invoice
            </button>
          )}
        </div>

        {/* Filter Controls */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {['', 'DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE'].map(s => (
              <button
                key={s}
                className={`btn btn-sm ${statusFilter === s ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setStatusFilter(s)}
              >
                {s ? s.replace(/_/g, ' ') : 'All Statuses'}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '6px' }}>
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
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Invoice #</th>
                <th>Client</th>
                <th>Matter</th>
                <th>Currency</th>
                <th>Total</th>
                <th>Paid</th>
                <th>Destination</th>
                <th>Status</th>
                <th>Due Date</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i}>
                    {[...Array(10)].map((_, j) => (
                      <td key={j}><div className="skeleton" style={{ height: '14px', borderRadius: '4px' }} /></td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr><td colSpan={10} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No invoices found</td></tr>
              ) : (
                invoices.map((inv: any) => {
                  const isNgn = (inv.currency || 'NGN') === 'NGN';
                  const cur = isNgn ? '₦' : '$';
                  const isUnpaid = ['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(inv.status);

                  return (
                    <tr key={inv.id}>
                      <td><code style={{ fontSize: '12px', color: 'var(--accent)' }}>{inv.invoiceNumber}</code></td>
                      <td style={{ fontSize: '13px' }}>
                        {inv.client?.companyName || `${inv.client?.firstName} ${inv.client?.lastName}`}
                      </td>
                      <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{inv.matter?.referenceNumber || '—'}</td>
                      <td><span className="badge badge-gray">{inv.currency || 'NGN'}</span></td>
                      <td style={{ fontFamily: 'monospace', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {cur}{Number(inv.totalAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={{ fontFamily: 'monospace', color: '#4ade80' }}>
                        {cur}{Number(inv.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </td>
                      <td>
                        <span className={`badge ${inv.paymentDestination === 'CLIENT_ACCOUNT' || inv.paymentDestination === 'TRUST' ? 'badge-gold' : 'badge-blue'}`}>
                          {inv.paymentDestination === 'CLIENT_ACCOUNT' || inv.paymentDestination === 'TRUST' ? 'Client Account' : 'Office Revenue'}
                        </span>
                      </td>
                      <td><span className={`badge ${statusColor[inv.status] || 'badge-gray'}`}>{inv.status.replace(/_/g, ' ')}</span></td>
                      <td style={{ fontSize: '12px', color: inv.status === 'OVERDUE' ? '#f87171' : 'var(--text-muted)' }}>
                        {inv.dueDate ? new Date(inv.dueDate).toLocaleDateString('en-NG') : '—'}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {inv.status === 'DRAFT' && user?.tier !== 'CLIENT' && (
                            <button className="btn btn-sm btn-secondary" onClick={() => sendInvoice(inv.id)} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Send size={12} /> Send
                            </button>
                          )}

                          {isUnpaid && (
                            <button
                              className="btn btn-sm btn-primary"
                              disabled={payingId === inv.id}
                              onClick={() => handlePaystackPay(inv)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                            >
                              <CreditCard size={12} /> {payingId === inv.id ? 'Connecting…' : 'Paystack'}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </main>

      {/* New Invoice Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Inter,sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '20px' }}>Create New Bill of Costs / Invoice</h2>
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label">Client ID *</label>
                <input className="form-input" required value={form.clientId} onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))} placeholder="UUID of client" />
              </div>

              <div className="form-group">
                <label className="form-label">Matter ID</label>
                <input className="form-input" value={form.matterId} onChange={e => setForm(f => ({ ...f, matterId: e.target.value }))} placeholder="UUID of matter" />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Billing Currency *</label>
                  <select className="form-input" value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))}>
                    <option value="NGN">NGN (₦ Nigerian Naira)</option>
                    <option value="USD">USD ($ US Dollar)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Due Date *</label>
                  <input className="form-input" type="date" required value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Payment Destination Account</label>
                <select className="form-input" value={form.paymentDestination} onChange={e => setForm(f => ({ ...f, paymentDestination: e.target.value }))}>
                  <option value="OFFICE_ACCOUNT">Firm Office Account (Earned Fees / Disbursements Recovered)</option>
                  <option value="CLIENT_ACCOUNT">Client Account (Retainer / Transaction Float per LPAR 1964)</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Line Items (JSON Array)</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.lineItems}
                  onChange={e => setForm(f => ({ ...f, lineItems: e.target.value }))}
                  placeholder='[{"description":"Professional Fees for Litigation","quantity":1,"unitPrice":1500000}]'
                  style={{ resize: 'none', fontFamily: 'monospace', fontSize: '12px' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Notes & Payment Terms</label>
                <input className="form-input" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Payment due within 14 days" />
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Creating…' : 'Generate Invoice'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
