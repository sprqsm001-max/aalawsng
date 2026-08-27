'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Plus, Search, ChevronRight, Phone, Mail, Shield, CheckCircle, AlertTriangle } from 'lucide-react';

export default function ClientsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    idType: 'NIN',
    idNumber: '',
    tin: '',
    rcNumber: '',
    pepStatus: false,
    riskRating: 'LOW',
    sourceOfFundsDeclaration: '',
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) router.replace('/login');
    else loadData();
  }, [page, search, isAuthenticated]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/clients?page=${page}&limit=20${search ? `&search=${search}` : ''}`);
      setClients(data.clients || []);
      setTotal(data.total || 0);
    } catch {}
    setLoading(false);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.post('/clients', form);
      setShowModal(false);
      setForm({
        firstName: '',
        lastName: '',
        companyName: '',
        email: '',
        phone: '',
        address: '',
        idType: 'NIN',
        idNumber: '',
        tin: '',
        rcNumber: '',
        pepStatus: false,
        riskRating: 'LOW',
        sourceOfFundsDeclaration: '',
      });
      loadData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create client');
    }
    setSaving(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
          <span style={{ fontSize: '11px', color: 'var(--accent)', background: 'rgba(200,169,110,0.1)', padding: '2px 8px', borderRadius: '999px' }}>
            NFIU / SCUML & AML/CFT Compliant
          </span>
        </div>
      </div>

      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Clients & CRM</h1>
            <p className="page-subtitle">{total} clients — verified with Nigerian identity & AML/CFT standards</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Client Intake
          </button>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder="Search by name, email, company, CAC RC, or TIN..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: '36px' }}
            />
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Client Name / Company</th>
                <th>KYC / AML Status</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Matters</th>
                <th>PEP Check</th>
                <th>Intake Date</th>
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
              ) : clients.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No clients found</td></tr>
              ) : (
                clients.map(c => (
                  <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => router.push(`/clients/${c.id}`)}>
                    <td>
                      <div style={{ fontWeight: 500, color: 'var(--text-primary)' }}>
                        {c.companyName || `${c.firstName} ${c.lastName}`}
                      </div>
                      {c.companyName && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Contact: {c.firstName} {c.lastName} {c.rcNumber ? `· ${c.rcNumber}` : ''}
                        </div>
                      )}
                    </td>
                    <td>
                      <span className={`badge ${c.kycStatus === 'VERIFIED' ? 'badge-green' : 'badge-yellow'}`}>
                        {c.kycStatus || 'PENDING'}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px' }}>
                        <Mail size={13} style={{ opacity: 0.5 }} /> {c.email}
                      </span>
                    </td>
                    <td style={{ fontSize: '13px' }}>{c.phone || '—'}</td>
                    <td><span className="badge badge-blue">{c._count?.matters || 0}</span></td>
                    <td>
                      {c.pepStatus ? (
                        <span className="badge badge-red" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content' }}>
                          <AlertTriangle size={10} /> PEP
                        </span>
                      ) : (
                        <span className="badge badge-gray">Non-PEP</span>
                      )}
                    </td>
                    <td style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {new Date(c.intakeDate).toLocaleDateString('en-NG')}
                    </td>
                    <td><ChevronRight size={16} style={{ color: 'var(--text-muted)' }} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Showing {clients.length} of {total}</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={clients.length < 20} onClick={() => setPage(p => p + 1)}>Next</button>
          </div>
        </div>
      </main>

      {/* New Client Intake Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '18px', fontWeight: 700, marginBottom: '4px' }}>
              Client Onboarding & AML/CFT Intake
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '18px' }}>
              Per Nigerian AML/CFT regulations (NFIU/SCUML), collect valid national identification and corporate CAC information.
            </p>

            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">First Name *</label>
                  <input className="form-input" required value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Name *</label>
                  <input className="form-input" required value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Company Name</label>
                  <input className="form-input" value={form.companyName} onChange={e => setForm(f => ({ ...f, companyName: e.target.value }))} placeholder="Optional corporate entity" />
                </div>
                <div className="form-group">
                  <label className="form-label">CAC RC Number</label>
                  <input className="form-input" value={form.rcNumber} onChange={e => setForm(f => ({ ...f, rcNumber: e.target.value }))} placeholder="e.g. RC-1489201" />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Email Address *</label>
                  <input className="form-input" type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Phone Number *</label>
                  <input className="form-input" required value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+234..." />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">ID Type</label>
                  <select className="form-input" value={form.idType} onChange={e => setForm(f => ({ ...f, idType: e.target.value }))}>
                    <option value="NIN">NIN (National Identification Number)</option>
                    <option value="INTL_PASSPORT">International Passport</option>
                    <option value="DRIVERS_LICENSE">FRSC Driver's License</option>
                    <option value="VOTERS_CARD">INEC Voter's Card</option>
                    <option value="CAC">CAC Certificate of Incorporation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID / Number</label>
                  <input className="form-input" value={form.idNumber} onChange={e => setForm(f => ({ ...f, idNumber: e.target.value }))} placeholder="NIN / Passport No" />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Physical Address</label>
                <input className="form-input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Office or Residential address" />
              </div>

              <div className="form-group">
                <label className="form-label">Source of Funds Declaration</label>
                <input className="form-input" value={form.sourceOfFundsDeclaration} onChange={e => setForm(f => ({ ...f, sourceOfFundsDeclaration: e.target.value }))} placeholder="e.g. Real Estate Revenue, Commercial Trading, Corporate Salary" />
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <input
                  type="checkbox"
                  checked={form.pepStatus}
                  onChange={e => setForm(f => ({ ...f, pepStatus: e.target.checked }))}
                />
                <span>Politically Exposed Person (PEP) or related party</span>
              </label>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '8px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Complete Intake'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
