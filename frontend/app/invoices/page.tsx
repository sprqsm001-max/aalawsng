'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Send, CreditCard, ExternalLink, CheckCircle, Eye, Printer, Download, X, FileText } from 'lucide-react';

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
  const [clients, setClients] = useState<any[]>([]);
  const [matters, setMatters] = useState<any[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    clientId: '',
    matterId: '',
    currency: 'NGN',
    dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    paymentDestination: 'OFFICE_ACCOUNT',
    notes: 'Payment due within 14 days',
  });

  const [lineItems, setLineItems] = useState([
    { description: 'Professional Legal Representation & Advisory', quantity: 1, unitPrice: 250000 },
  ]);

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
    loadData();
  }, [mounted, statusFilter, currencyFilter, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [invRes, cRes, mRes] = await Promise.allSettled([
        api.get(`/invoices?limit=50${statusFilter ? `&status=${statusFilter}` : ''}`),
        api.get('/clients?limit=100'),
        api.get('/matters?limit=100'),
      ]);

      if (invRes.status === 'fulfilled') {
        let list = invRes.value.data.invoices || [];
        if (currencyFilter !== 'ALL') {
          list = list.filter((i: any) => i.currency === currencyFilter);
        }
        setInvoices(list);
        setTotal(invRes.value.data.total || 0);
      }
      if (cRes.status === 'fulfilled') {
        const cData = cRes.value.data;
        setClients(cData.clients || (Array.isArray(cData) ? cData : []));
      }
      if (mRes.status === 'fulfilled') {
        const mData = mRes.value.data;
        setMatters(mData.matters || (Array.isArray(mData) ? mData : []));
      }
    } catch (err) {
      console.error('Failed to load invoices data:', err);
    } finally {
      setLoading(false);
    }
  };

  const openInvoiceModal = async (inv: any, autoPrint = false) => {
    setSelectedInvoice(inv);
    setLoadingDetails(true);
    try {
      const { data } = await api.get(`/invoices/${inv.id}`);
      setSelectedInvoice(data);
      if (autoPrint) {
        setTimeout(() => window.print(), 500);
      }
    } catch {
      // keep basic inv data if detail fetch fails
    } finally {
      setLoadingDetails(false);
    }
  };

  const sendInvoice = async (id: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setSendingId(id);
    try {
      const res = await api.patch(`/invoices/${id}/send`);
      const updated = res.data;
      setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'SENT', sentAt: new Date().toISOString() } : inv));
      if (selectedInvoice && selectedInvoice.id === id) {
        setSelectedInvoice((prev: any) => ({ ...prev, status: 'SENT', sentAt: new Date().toISOString() }));
      }
    } catch (err: any) {
      try {
        await api.patch(`/invoices/${id}/status`, { status: 'SENT' });
        setInvoices(prev => prev.map(inv => inv.id === id ? { ...inv, status: 'SENT', sentAt: new Date().toISOString() } : inv));
        if (selectedInvoice && selectedInvoice.id === id) {
          setSelectedInvoice((prev: any) => ({ ...prev, status: 'SENT', sentAt: new Date().toISOString() }));
        }
      } catch (err2: any) {
        console.error('Invoice send error:', err, err2);
        alert(err.response?.data?.error || err2.response?.data?.error || 'Failed to send invoice');
      }
    } finally {
      setSendingId(null);
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
    if (!form.clientId) {
      alert('Please select a client for this invoice');
      return;
    }
    setSaving(true);
    try {
      const formattedItems = lineItems.map(li => ({
        description: li.description || 'Legal Services Rendered',
        quantity: Number(li.quantity) || 1,
        unitPrice: Number(li.unitPrice) || 0,
        amount: (Number(li.quantity) || 1) * (Number(li.unitPrice) || 0),
      }));

      await api.post('/invoices', {
        clientId: form.clientId,
        matterId: form.matterId || undefined,
        currency: form.currency,
        lineItems: formattedItems,
        extraLineItems: formattedItems,
        dueDate: form.dueDate,
        paymentDestination: form.paymentDestination,
        notes: form.notes,
      });

      setShowModal(false);
      setForm({
        clientId: '',
        matterId: '',
        currency: 'NGN',
        dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        paymentDestination: 'OFFICE_ACCOUNT',
        notes: 'Payment due within 14 days',
      });
      setLineItems([{ description: 'Professional Legal Representation & Advisory', quantity: 1, unitPrice: 250000 }]);
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

      <main className={`main-content ${selectedInvoice ? 'no-print' : ''}`}>
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
                      <td>
                        <button
                          onClick={() => openInvoiceModal(inv)}
                          style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left' }}
                          title="Click to view and print invoice"
                        >
                          <code style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'underline' }}>{inv.invoiceNumber}</code>
                        </button>
                      </td>
                      <td style={{ fontSize: '13px' }}>
                        {inv.client?.companyName || `${inv.client?.firstName || ''} ${inv.client?.lastName || ''}`.trim() || 'Client'}
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
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <button
                            className="btn btn-sm btn-secondary"
                            onClick={() => openInvoiceModal(inv)}
                            style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                            title="View / Print Invoice"
                          >
                            <Eye size={12} /> View
                          </button>

                          {inv.status === 'DRAFT' && user?.tier !== 'CLIENT' && (
                            <button
                              type="button"
                              className="btn btn-sm btn-secondary"
                              disabled={sendingId === inv.id}
                              onClick={(e) => sendInvoice(inv.id, e)}
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', padding: '4px 8px' }}
                              title="Send invoice to client"
                            >
                              <Send size={12} /> {sendingId === inv.id ? 'Sending…' : 'Send'}
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
                <label className="form-label">Linked Matter (Optional)</label>
                <select
                  className="form-input"
                  value={form.matterId}
                  onChange={e => setForm(f => ({ ...f, matterId: e.target.value }))}
                >
                  <option value="">General Retainer / Not linked to specific matter</option>
                  {matters.map((m: any) => (
                    <option key={m.id} value={m.id}>
                      {m.referenceNumber} — {m.title}
                    </option>
                  ))}
                </select>
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

              {/* Interactive Line Items */}
              <div className="form-group">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Line Items (Fees & Disbursements)</label>
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setLineItems(items => [...items, { description: '', quantity: 1, unitPrice: 50000 }])}
                  >
                    <Plus size={13} /> Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {lineItems.map((item, idx) => (
                    <div key={idx} style={{ display: 'grid', gridTemplateColumns: '3fr 1fr 1.5fr auto', gap: '8px', alignItems: 'center' }}>
                      <input
                        className="form-input"
                        placeholder="Description of service"
                        value={item.description}
                        onChange={e => {
                          const val = e.target.value;
                          setLineItems(items => items.map((it, i) => i === idx ? { ...it, description: val } : it));
                        }}
                        required
                      />
                      <input
                        className="form-input"
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={e => {
                          const val = parseInt(e.target.value) || 1;
                          setLineItems(items => items.map((it, i) => i === idx ? { ...it, quantity: val } : it));
                        }}
                        required
                      />
                      <input
                        className="form-input"
                        type="number"
                        min="0"
                        placeholder={`Rate (${form.currency === 'USD' ? '$' : '₦'})`}
                        value={item.unitPrice}
                        onChange={e => {
                          const val = parseFloat(e.target.value) || 0;
                          setLineItems(items => items.map((it, i) => i === idx ? { ...it, unitPrice: val } : it));
                        }}
                        required
                      />
                      {lineItems.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-sm"
                          style={{ color: '#ef4444', background: 'rgba(239,68,68,0.1)', border: 'none', padding: '6px 10px', cursor: 'pointer' }}
                          onClick={() => setLineItems(items => items.filter((_, i) => i !== idx))}
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: '8px', textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>
                  Invoice Total: <strong style={{ color: 'var(--accent)', fontSize: '15px' }}>
                    {form.currency === 'USD' ? '$' : '₦'}
                    {lineItems.reduce((sum, it) => sum + ((Number(it.quantity) || 1) * (Number(it.unitPrice) || 0)), 0).toLocaleString()}
                  </strong>
                </div>
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

      {/* Invoice Detail / Printable Bill of Costs Modal */}
      {selectedInvoice && (
        <div className="modal-backdrop" onClick={() => setSelectedInvoice(null)} style={{ overflowY: 'auto', padding: '24px 0', zIndex: 1100 }}>
          <div className="modal invoice-modal-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: '860px', width: '95%', margin: 'auto', padding: '20px' }}>
            {/* Action Bar (strictly hidden on print) */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px', paddingBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${statusColor[selectedInvoice.status] || 'badge-gray'}`} style={{ fontSize: '12px' }}>
                  {selectedInvoice.status.replace(/_/g, ' ')}
                </span>
                <span className={`badge ${selectedInvoice.paymentDestination === 'CLIENT_ACCOUNT' || selectedInvoice.paymentDestination === 'TRUST' ? 'badge-gold' : 'badge-blue'}`}>
                  {selectedInvoice.paymentDestination === 'CLIENT_ACCOUNT' || selectedInvoice.paymentDestination === 'TRUST' ? 'Client Account (LPAR 1964)' : 'Office Operating Account'}
                </span>
                {loadingDetails && <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Refreshing details…</span>}
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  onClick={() => window.print()}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  title="Print or Save official PDF"
                >
                  <Printer size={14} /> Print / Save as PDF
                </button>
                {selectedInvoice.status === 'DRAFT' && user?.tier !== 'CLIENT' && (
                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    disabled={sendingId === selectedInvoice.id}
                    onClick={(e) => sendInvoice(selectedInvoice.id, e)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Send size={14} /> {sendingId === selectedInvoice.id ? 'Sending…' : 'Send to Client'}
                  </button>
                )}
                {['SENT', 'PARTIALLY_PAID', 'OVERDUE'].includes(selectedInvoice.status) && (
                  <button
                    type="button"
                    className="btn btn-sm btn-primary"
                    disabled={payingId === selectedInvoice.id}
                    onClick={() => handlePaystackPay(selectedInvoice)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <CreditCard size={14} /> Paystack
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setSelectedInvoice(null)}
                  style={{ padding: '6px 10px' }}
                  title="Close"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Printable Official Document Sheet (Pure White, Pristine Legal Typography) */}
            <div
              className="printable-invoice"
              style={{
                background: '#ffffff',
                color: '#0f172a',
                borderRadius: '8px',
                padding: '40px',
                boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
                lineHeight: 1.5,
              }}
            >
              {/* Firm Official Letterhead */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #b45309', paddingBottom: '18px', marginBottom: '22px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px' }}>
                  <img
                    src="/logo.png"
                    alt="AALAWSNG"
                    style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '1px solid #d97706', marginTop: '2px' }}
                  />
                  <div>
                    <h2 style={{ margin: 0, fontSize: '19px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.02em', fontFamily: 'serif' }}>
                      ADEOLA KOLAWOLE &amp; ASSOCIATES
                    </h2>
                    <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#b45309', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                      Barristers, Solicitors &amp; Legal Consultants
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#475569', lineHeight: 1.4 }}>
                      Plot 12, Admiralty Way, Lekki Phase 1, Lagos, Nigeria<br />
                      Tel: +234 800 000 0000 · Email: billing@aalawsng.com · Web: portal.aalawsng.com
                    </p>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.04em' }}>
                    BILL OF COSTS
                  </h3>
                  <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#b45309', fontFamily: 'monospace', margin: '4px 0 2px' }}>
                    {selectedInvoice.invoiceNumber}
                  </div>
                  <p style={{ margin: '2px 0 0', fontSize: '11px', color: '#475569' }}>
                    Date Issued: <strong>{new Date(selectedInvoice.createdAt || Date.now()).toLocaleDateString('en-NG')}</strong><br />
                    Due Date: <strong>{selectedInvoice.dueDate ? new Date(selectedInvoice.dueDate).toLocaleDateString('en-NG') : 'Upon Receipt'}</strong>
                  </p>
                  <div style={{ marginTop: '6px' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '10px',
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      background: selectedInvoice.status === 'PAID' ? '#dcfce7' : selectedInvoice.status === 'SENT' ? '#e0f2fe' : '#f1f5f9',
                      color: selectedInvoice.status === 'PAID' ? '#15803d' : selectedInvoice.status === 'SENT' ? '#0369a1' : '#475569',
                      border: `1px solid ${selectedInvoice.status === 'PAID' ? '#86efac' : selectedInvoice.status === 'SENT' ? '#7dd3fc' : '#cbd5e1'}`
                    }}>
                      {selectedInvoice.status.replace(/_/g, ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Billed To & Matter Reference Boxes */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '22px' }}>
                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#b45309', fontWeight: 800, letterSpacing: '0.06em' }}>
                    BILLED TO:
                  </span>
                  <h4 style={{ margin: '4px 0 2px', fontSize: '13.5px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedInvoice.client?.companyName || `${selectedInvoice.client?.firstName || ''} ${selectedInvoice.client?.lastName || ''}`.trim() || 'Valued Client'}
                  </h4>
                  {selectedInvoice.client?.companyName && (
                    <p style={{ margin: '0 0 2px', fontSize: '11px', color: '#334155' }}>
                      Attn: {selectedInvoice.client?.firstName} {selectedInvoice.client?.lastName}
                    </p>
                  )}
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    {selectedInvoice.client?.email || ''} {selectedInvoice.client?.phone ? `· ${selectedInvoice.client?.phone}` : ''}
                  </p>
                </div>

                <div style={{ padding: '14px 16px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <span style={{ fontSize: '10px', textTransform: 'uppercase', color: '#b45309', fontWeight: 800, letterSpacing: '0.06em' }}>
                    MATTER REFERENCE:
                  </span>
                  <h4 style={{ margin: '4px 0 2px', fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                    {selectedInvoice.matter?.title || 'Professional Legal Representation & Advisory'}
                  </h4>
                  <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>
                    Case File: <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{selectedInvoice.matter?.referenceNumber || 'AAL-GENERAL'}</strong>
                  </p>
                </div>
              </div>

              {/* Legal Services & Disbursements Table */}
              <table style={{ width: '100%', marginBottom: '18px', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderTop: '1px solid #cbd5e1', borderBottom: '2px solid #0f172a', textAlign: 'left' }}>
                    <th style={{ padding: '9px 10px', fontSize: '10.5px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.04em' }}>
                      Description of Legal Services &amp; Disbursements
                    </th>
                    <th style={{ padding: '9px 10px', fontSize: '10.5px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 700, textAlign: 'center', width: '60px' }}>
                      Qty
                    </th>
                    <th style={{ padding: '9px 10px', fontSize: '10.5px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right', width: '120px' }}>
                      Rate
                    </th>
                    <th style={{ padding: '9px 10px', fontSize: '10.5px', color: '#0f172a', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right', width: '130px' }}>
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(selectedInvoice.lineItems && selectedInvoice.lineItems.length > 0 ? selectedInvoice.lineItems : [
                    { description: 'Professional Legal Representation & Advisory Services', quantity: 1, unitPrice: selectedInvoice.subtotal || selectedInvoice.totalAmount, amount: selectedInvoice.subtotal || selectedInvoice.totalAmount }
                  ]).map((item: any, i: number) => {
                    const isNgn = (selectedInvoice.currency || 'NGN') === 'NGN';
                    const curSym = isNgn ? '₦' : '$';
                    return (
                      <tr key={i} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ padding: '10px 10px', fontSize: '12px', color: '#1e293b' }}>
                          <span style={{ fontWeight: 600 }}>{item.description}</span>
                          {item.type && (
                            <span style={{ fontSize: '10px', color: '#64748b', marginLeft: '6px', textTransform: 'uppercase' }}>
                              [{item.type}]
                            </span>
                          )}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'center', color: '#475569' }}>
                          {item.quantity || 1}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'right', color: '#334155', fontFamily: 'monospace' }}>
                          {curSym}{Number(item.unitPrice || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ padding: '10px 10px', fontSize: '12px', textAlign: 'right', fontWeight: 700, color: '#0f172a', fontFamily: 'monospace' }}>
                          {curSym}{Number(item.amount || (item.quantity * item.unitPrice) || 0).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '22px' }}>
                <div style={{ width: '300px', display: 'flex', flexDirection: 'column', gap: '6px', background: '#f8fafc', padding: '14px 18px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                      {(selectedInvoice.currency === 'USD' ? '$' : '₦')}{Number(selectedInvoice.subtotal || selectedInvoice.totalAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(selectedInvoice.taxAmount) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#475569' }}>
                      <span>VAT / Statutory Tax:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600, color: '#0f172a' }}>
                        {(selectedInvoice.currency === 'USD' ? '$' : '₦')}{Number(selectedInvoice.taxAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 800, color: '#0f172a', borderTop: '2px solid #0f172a', paddingTop: '8px', marginTop: '2px' }}>
                    <span>Total Amount:</span>
                    <span style={{ color: '#b45309', fontFamily: 'monospace' }}>
                      {(selectedInvoice.currency === 'USD' ? '$' : '₦')}{Number(selectedInvoice.totalAmount).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  {Number(selectedInvoice.amountPaid) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#16a34a' }}>
                      <span>Amount Paid:</span>
                      <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                        -{(selectedInvoice.currency === 'USD' ? '$' : '₦')}{Number(selectedInvoice.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                  {Number(selectedInvoice.amountPaid) > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, color: '#dc2626', borderTop: '1px dashed #cbd5e1', paddingTop: '6px' }}>
                      <span>Balance Outstanding:</span>
                      <span style={{ fontFamily: 'monospace' }}>
                        {(selectedInvoice.currency === 'USD' ? '$' : '₦')}{Number(selectedInvoice.totalAmount - selectedInvoice.amountPaid).toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Settlement Remittance & Bank Instructions */}
              <div style={{ background: '#f8fafc', padding: '14px 16px', borderRadius: '6px', border: '1px solid #e2e8f0', fontSize: '11px', color: '#334155', lineHeight: 1.6, marginBottom: '22px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '16px' }}>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10.5px' }}>
                      Remittance / Bank Transfer Instructions:
                    </strong>
                    Bank Name: <strong>Access Bank Plc</strong><br />
                    Account Name: <strong>Adeola Kolawole &amp; Associates</strong><br />
                    Account Number: <strong>0123456789</strong> (Naira) · <strong>0987654321</strong> (USD)<br />
                    Designation: <strong>{selectedInvoice.paymentDestination === 'CLIENT_ACCOUNT' || selectedInvoice.paymentDestination === 'TRUST' ? 'Client Trust Account (LPAR 1964 Regulated)' : 'Firm Operating Account'}</strong>
                  </div>
                  <div>
                    <strong style={{ color: '#0f172a', display: 'block', marginBottom: '4px', textTransform: 'uppercase', fontSize: '10.5px' }}>
                      Terms &amp; Statutory Governance:
                    </strong>
                    {selectedInvoice.notes || 'Payment is requested within 14 calendar days of bill presentation.'}<br />
                    Governed under the Legal Practitioners Act and Legal Practitioners’ Accounts Rules 1964.
                  </div>
                </div>
              </div>

              {/* Law Firm Official Attestation / Signatory */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderTop: '1px solid #e2e8f0', paddingTop: '16px', marginTop: '10px' }}>
                <div style={{ fontSize: '10.5px', color: '#64748b' }}>
                  AALAWSNG System-Generated Legal Bill of Costs · Portal Verification Ref: <code>{selectedInvoice.id}</code>
                </div>
                <div style={{ textAlign: 'right', minWidth: '220px' }}>
                  <p style={{ margin: '0 0 24px', fontSize: '11.5px', color: '#0f172a', fontWeight: 600 }}>
                    For: <strong>ADEOLA KOLAWOLE &amp; ASSOCIATES</strong>
                  </p>
                  <div style={{ borderBottom: '1px solid #0f172a', width: '200px', marginLeft: 'auto', marginBottom: '4px' }}></div>
                  <p style={{ margin: 0, fontSize: '10.5px', color: '#475569', fontWeight: 600 }}>
                    Authorized Legal Practitioner / Managing Partner
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
