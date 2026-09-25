'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { BarChart2, Users, Briefcase, DollarSign, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#00b862', '#10d87a', '#22c55e', '#f59e0b', '#ef4444', '#60a5fa', '#a78bfa'];

export default function AnalyticsPage() {
  const { isAuthenticated, user } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    // Check localStorage as well in case Zustand is hydrating
    const token = typeof window !== 'undefined' ? (localStorage.getItem('accessToken') || localStorage.getItem('aalawsng-auth')) : null;
    if (!isAuthenticated && !token) {
      router.replace('/login');
      return;
    }

    if (user?.tier === 'CLIENT') {
      router.replace('/portal');
      return;
    }

    load();
  }, [mounted, isAuthenticated, user]);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/analytics');
      setData(res.data);
    } catch (err: any) {
      console.error('Failed to load analytics:', err);
      setError(err?.response?.data?.error || err?.message || 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  const overview = data?.overview || {};
  const financial = data?.financial || {};
  const matterBreakdown = Array.isArray(data?.matters?.statusBreakdown) ? data.matters.statusBreakdown : [];
  const taskBreakdown = Array.isArray(data?.tasks?.statusBreakdown)
    ? data.tasks.statusBreakdown
    : Array.isArray(data?.tasks)
      ? data.tasks
      : [];
  const staffList = Array.isArray(data?.staff?.utilization)
    ? data.staff.utilization
    : Array.isArray(data?.staff)
      ? data.staff
      : [];
  const clientList = Array.isArray(data?.clients?.topByMatters)
    ? data.clients.topByMatters
    : Array.isArray(data?.matters?.topClients)
      ? data.matters.topClients
      : [];

  const revenue = financial?.revenueThisMonth ?? financial?.invoicedAmountThisMonth ?? 0;
  const billableHours = financial?.billableHoursThisMonth ?? 0;

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          Adeola Kolawole & Associates
        </h2>
      </div>
      <main className="main-content">
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 className="page-title">Analytics & Reports</h1>
            <p className="page-subtitle">Firm-wide performance metrics and KPIs</p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className="btn btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', padding: '7px 12px' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
            {[...Array(6)].map((_, i) => (
              <div key={i} className="skeleton" style={{ height: '100px', borderRadius: '14px' }} />
            ))}
          </div>
        ) : error ? (
          <div className="card" style={{ textAlign: 'center', padding: '48px 24px', maxWidth: '480px', margin: '40px auto' }}>
            <AlertTriangle size={36} color="#ef4444" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>Failed to Load Analytics</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '18px' }}>{error}</p>
            <button onClick={load} className="btn btn-primary" style={{ padding: '8px 20px' }}>
              Retry Now
            </button>
          </div>
        ) : !data ? (
          <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '60px' }}>
            No analytics data available
          </p>
        ) : (
          <>
            {/* Overview KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              {[
                { label: 'Active Clients', value: overview.totalClients ?? 0, icon: Users, color: '#60a5fa' },
                { label: 'Active Matters', value: overview.activeMatters ?? 0, icon: Briefcase, color: 'var(--accent)' },
                { label: 'Total Staff', value: overview.totalStaff ?? 0, icon: Users, color: '#4ade80' },
                { label: 'Revenue This Month', value: `₦${Number(revenue).toLocaleString()}`, icon: DollarSign, color: 'var(--accent)' },
                { label: 'Billable Hours (Month)', value: `${billableHours}h`, icon: Clock, color: '#a78bfa' },
                {
                  label: 'Pending Conflicts',
                  value: overview.pendingConflicts ?? 0,
                  icon: AlertTriangle,
                  color: (overview.pendingConflicts ?? 0) > 0 ? '#f87171' : '#4ade80',
                },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="card-stat">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p className="stat-label">{stat.label}</p>
                        <p className="stat-value" style={{ color: stat.color, marginTop: '6px' }}>{stat.value}</p>
                      </div>
                      <div style={{ width: '38px', height: '38px', borderRadius: '9px', background: `${stat.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} style={{ color: stat.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px', marginBottom: '24px' }}>
              <div className="card">
                <h3 style={{ fontFamily: 'Inter,sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  Matter Status Distribution
                </h3>
                {mounted && matterBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={matterBreakdown.map((s: any) => ({ name: s.status, value: s._count || s.count || 1 }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {matterBreakdown.map((_: any, i: number) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No matter data
                  </p>
                )}
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Inter,sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  Task Status Breakdown
                </h3>
                {mounted && taskBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={taskBreakdown.map((t: any) => ({
                        status: (t.status || 'OTHER').replace('_', ' '),
                        count: t._count || t.count || 0,
                      }))}
                    >
                      <XAxis dataKey="status" tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 11 }} axisLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                      <Bar dataKey="count" fill="#00b862" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)', fontSize: '13px' }}>
                    No task data
                  </p>
                )}
              </div>
            </div>

            {/* Staff Utilization & Top Clients */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
              <div className="card">
                <h3 style={{ fontFamily: 'Inter,sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  Staff Matter Load
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {staffList.slice(0, 6).map((s: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                      }}
                    >
                      <div>
                        <p style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {s.name || `${s.firstName || ''} ${s.lastName || ''}`.trim() || 'Staff'}
                        </p>
                        <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '1px' }}>
                          {s.role || 'ATTORNEY'}
                        </p>
                      </div>
                      <span className="badge badge-blue">
                        {s.matterCount ?? s._count?.assignedMatters ?? 0} matters
                      </span>
                    </div>
                  ))}
                  {staffList.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No staff data
                    </p>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontFamily: 'Inter,sans-serif', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
                  Top Clients by Matter Count
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {clientList.slice(0, 5).map((c: any, i: number) => (
                    <div
                      key={i}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        background: 'var(--surface)',
                        borderRadius: '8px',
                      }}
                    >
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {c.name || c.companyName || `${c.firstName || ''} ${c.lastName || ''}`.trim() || 'Client'}
                      </span>
                      <span className="badge badge-gold">
                        {c.matterCount ?? c._count?.matters ?? 0} matters
                      </span>
                    </div>
                  ))}
                  {clientList.length === 0 && (
                    <p style={{ textAlign: 'center', padding: '20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No client data
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
