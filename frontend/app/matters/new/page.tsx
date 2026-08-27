'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { ArrowLeft, Briefcase, Plus, AlertCircle } from 'lucide-react';

export default function NewMatterPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [clients, setClients] = useState<any[]>([]);
  const [matterTypes, setMatterTypes] = useState<any[]>([]);
  const [staffList, setStaffList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    title: '',
    description: '',
    clientId: '',
    matterTypeId: '',
    leadAttorneyId: '',
    estimatedHours: '',
    budgetAmount: '',
    hourlyRateOverride: '',
    courtJurisdiction: '',
    courtCaseNumber: '',
    opposingPartyName: '',
    opposingCounselName: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }
    loadData();
  }, [isAuthenticated, router]);

  const loadData = async () => {
    try {
      const [cRes, sRes] = await Promise.all([
        api.get('/clients?limit=100'),
        api.get('/staff?limit=100'),
      ]);
      setClients(cRes.data.clients || []);
      setStaffList(sRes.data.staff || []);

      // Default matter types fallback if not separate endpoint
      setMatterTypes([
        { id: 'litigation', name: 'Litigation' },
        { id: 'property', name: 'Property Transaction' },
        { id: 'family', name: 'Family Law' },
        { id: 'corporate', name: 'Corporate & Commercial' },
        { id: 'estate', name: 'Estate & Probate' },
        { id: 'employment', name: 'Employment' },
      ]);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = {
        title: form.title,
        description: form.description,
        clientId: form.clientId,
        matterTypeId: form.matterTypeId || undefined,
        leadAttorneyId: form.leadAttorneyId || undefined,
        courtJurisdiction: form.courtJurisdiction || undefined,
        courtCaseNumber: form.courtCaseNumber || undefined,
        opposingPartyName: form.opposingPartyName || undefined,
        opposingCounselName: form.opposingCounselName || undefined,
      };

      if (form.estimatedHours) payload.estimatedHours = parseFloat(form.estimatedHours);
      if (form.budgetAmount) payload.budgetAmount = parseFloat(form.budgetAmount);
      if (form.hourlyRateOverride) payload.hourlyRateOverride = parseFloat(form.hourlyRateOverride);

      const { data } = await api.post('/matters', payload);
      router.push(`/matters/${data.id}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create matter. Ensure all required fields are filled.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button onClick={() => router.back()} className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }}>
            <ArrowLeft size={14} /> Back
          </button>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
        </div>
      </div>
      <main className="main-content">
        <div className="page-header">
          <div>
            <h1 className="page-title">Open New Matter</h1>
            <p className="page-subtitle">Intake and matter onboarding form</p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '12px 16px', marginBottom: '20px', color: '#f87171', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <div className="card" style={{ maxWidth: '800px' }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="form-label">Matter Title *</label>
              <input
                className="form-input"
                required
                placeholder="e.g. Adeyemi vs. Federal Ministry of Transport"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Client *</label>
                <select
                  className="form-input"
                  required
                  value={form.clientId}
                  onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                >
                  <option value="">Select Client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.companyName ? `${c.companyName} (${c.firstName} ${c.lastName})` : `${c.firstName} ${c.lastName}`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Lead Attorney</label>
                <select
                  className="form-input"
                  value={form.leadAttorneyId}
                  onChange={e => setForm(f => ({ ...f, leadAttorneyId: e.target.value }))}
                >
                  <option value="">Assign Attorney...</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.firstName} {s.lastName} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Description / Scope of Work</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Details of the matter, context, and legal objectives..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Court / Jurisdiction</label>
                <input
                  className="form-input"
                  placeholder="e.g. High Court of Lagos State, Ikeja"
                  value={form.courtJurisdiction}
                  onChange={e => setForm(f => ({ ...f, courtJurisdiction: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Court Case Number / Suit No.</label>
                <input
                  className="form-input"
                  placeholder="e.g. LD/4021/2024"
                  value={form.courtCaseNumber}
                  onChange={e => setForm(f => ({ ...f, courtCaseNumber: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Opposing Party Name</label>
                <input
                  className="form-input"
                  placeholder="Opposing individual or entity"
                  value={form.opposingPartyName}
                  onChange={e => setForm(f => ({ ...f, opposingPartyName: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Opposing Counsel</label>
                <input
                  className="form-input"
                  placeholder="Opposing law firm or attorney"
                  value={form.opposingCounselName}
                  onChange={e => setForm(f => ({ ...f, opposingCounselName: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Budget Amount (NGN)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 2500000"
                  value={form.budgetAmount}
                  onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estimated Hours</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="e.g. 40"
                  value={form.estimatedHours}
                  onChange={e => setForm(f => ({ ...f, estimatedHours: e.target.value }))}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custom Hourly Rate (NGN)</label>
                <input
                  className="form-input"
                  type="number"
                  placeholder="Optional rate override"
                  value={form.hourlyRateOverride}
                  onChange={e => setForm(f => ({ ...f, hourlyRateOverride: e.target.value }))}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '12px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Creating Matter...' : 'Open Matter'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
