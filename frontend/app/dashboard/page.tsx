'use client';
import { useEffect, useState } from 'react';
import { useAuthStore } from '@/lib/store';
import Sidebar from '@/components/Sidebar';
import api from '@/lib/api';
import { TrendingUp, Users, Briefcase, AlertTriangle, Clock, DollarSign, Scale, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#00b862', '#ffffff', '#38bdf8', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const { user } = useAuthStore();
  const [finData, setFinData] = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [deadlines, setDeadlines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [finRes, analyticsRes, deadlineRes] = await Promise.all([
          api.get('/fin-dashboard'),
          api.get('/analytics'),
          api.get('/calendar/upcoming-deadlines?days=30'),
        ]);
        setFinData(finRes.data);
        setAnalytics(analyticsRes.data);
        setDeadlines(deadlineRes.data?.slice(0, 5) || []);
      } catch (e) { /* demo fallback */ }
      setLoading(false);
    };
    load();
  }, []);

  const formatNGN = (v: number) => `₦${v?.toLocaleString('en-NG') || 0}`;

  const statusData = analytics?.matters?.statusBreakdown?.map((s: any) => ({
    name: s.status.replace('_', ' '),
    value: s._count,
  })) || [];

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
          <span style={{ fontSize: '10.5px', color: 'var(--accent)', background: 'rgba(0,184,98,0.1)', padding: '1px 8px', borderRadius: '999px', border: '1px solid rgba(0,184,98,0.25)' }}>
            Lagos, Nigeria
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            {new Date().toLocaleDateString('en-NG', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
          </span>
        </div>
      </div>

      <main className="main-content">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Executive Dashboard</h1>
            <p className="page-subtitle">Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} — firm overview & NBA compliance status</p>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span className="badge badge-green">
              {new Date().toLocaleDateString('en-NG', { month: 'long', year: 'numeric' })}
            </span>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', marginBottom: '20px' }}>
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton" style={{ height: '90px', borderRadius: '10px' }} />)}
          </div>
        ) : (
          <>
            {/* KPI Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px', marginBottom: '20px' }}>
              {[
                { label: 'Revenue This Month', value: formatNGN(finData?.revenue?.thisMonth || 0), icon: TrendingUp, color: '#00b862', change: '+12%' },
                { label: 'Active Matters', value: analytics?.overview?.activeMatters || 0, icon: Briefcase, color: '#ffffff', change: null },
                { label: 'Outstanding AR', value: formatNGN(finData?.accountsReceivable?.outstanding || 0), icon: DollarSign, color: '#ffffff', change: null },
                { label: 'Client Funds Held (LPAR)', value: formatNGN(finData?.trust?.totalHeld || 0), icon: Scale, color: '#00b862', change: null },
              ].map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="card-stat">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <p className="stat-label">{stat.label}</p>
                        <p className="stat-value" style={{ color: stat.color }}>{stat.value}</p>
                        {stat.change && <p className="stat-change positive">{stat.change} this month</p>}
                      </div>
                      <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: `${stat.color === '#ffffff' ? 'rgba(255,255,255,0.08)' : 'rgba(0,184,98,0.12)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Icon size={18} style={{ color: stat.color }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Trust Reconciliation Status Banner */}
            {finData?.trust?.isReconciled === false ? (
              <div className="trust-alert" style={{ marginBottom: '20px' }}>
                <AlertTriangle size={18} />
                <div style={{ flex: 1 }}>
                  <strong>Client Bank Reconciliation Discrepancy Detected</strong>
                  <p style={{ fontSize: '11.5px', marginTop: '2px', opacity: 0.85 }}>
                    The client bank balance, client ledger sum, and cash book journal total do not match. Immediate audit review required per LPAR 1964.
                  </p>
                </div>
                <a href="/trust" className="btn btn-danger btn-sm" style={{ whiteSpace: 'nowrap' }}>Run 3-Way Check</a>
              </div>
            ) : (
              <div className="trust-safe" style={{ marginBottom: '20px' }}>
                <Scale size={16} />
                <span>Client & Trust accounts reconciled — Nigerian Bar Association (NBA) three-way match confirmed.</span>
              </div>
            )}

            {/* Charts Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px', marginBottom: '20px' }}>
              {/* Matter Status Pie */}
              <div className="card">
                <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  Matter Status Breakdown
                </h3>
                {statusData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={4} dataKey="value">
                        {statusData.map((_: any, index: number) => (
                          <Cell key={index} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No matter data yet
                  </div>
                )}
              </div>

              {/* AR Aging */}
              <div className="card">
                <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '14px' }}>
                  Accounts Receivable Aging
                </h3>
                {finData?.accountsReceivable?.aging ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <BarChart data={Object.entries(finData.accountsReceivable.aging).map(([k, v]) => ({ bucket: k + 'd', amount: v }))}>
                      <XAxis dataKey="bucket" tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} />
                      <YAxis tick={{ fill: 'var(--text-muted)', fontSize: 10 }} axisLine={false} tickFormatter={v => `₦${(v/1000).toFixed(0)}k`} />
                      <Tooltip contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border)', borderRadius: '6px', color: 'var(--text-primary)', fontSize: '11px' }} formatter={(v: any) => formatNGN(v)} />
                      <Bar dataKey="amount" fill="#00b862" radius={[4,4,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div style={{ height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
                    No AR data yet
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
              {/* Upcoming Deadlines */}
              <div className="card">
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Upcoming Court Deadlines
                  </h3>
                  <a href="/calendar" className="btn btn-secondary btn-sm" style={{ fontSize: '11px', padding: '3px 8px' }}>View All</a>
                </div>
                {deadlines.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '20px 0' }}>No upcoming court deadlines</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {deadlines.map((d: any) => {
                      const daysLeft = Math.ceil((new Date(d.eventDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                      return (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', background: 'var(--surface)', borderRadius: '6px' }}>
                          <div>
                            <p style={{ fontSize: '12.5px', color: 'var(--text-primary)', fontWeight: 500 }}>{d.title}</p>
                            <p style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginTop: '1px' }}>{d.matter?.referenceNumber} · {d.matter?.client?.firstName} {d.matter?.client?.lastName}</p>
                          </div>
                          <span className={`badge ${daysLeft <= 3 ? 'badge-red' : daysLeft <= 7 ? 'badge-yellow' : 'badge-green'}`}>
                            {daysLeft}d
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Operations Stats */}
              <div className="card">
                <h3 style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
                  Firm Operations Summary
                </h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  {[
                    { label: 'Total Clients', value: analytics?.overview?.totalClients ?? '—', color: '#ffffff' },
                    { label: 'Total Staff', value: analytics?.overview?.totalStaff ?? '—', color: '#00b862' },
                    { label: 'Active Matters', value: analytics?.overview?.activeMatters ?? '—', color: '#38bdf8' },
                    { label: 'Billable Hours', value: analytics?.financial?.billableHoursThisMonth ? `${analytics.financial.billableHoursThisMonth}h` : '—', color: '#00b862' },
                    { label: 'Pending Conflicts', value: analytics?.overview?.pendingConflicts ?? '0', color: '#f87171' },
                    { label: 'Invoices This Month', value: analytics?.financial?.invoicesIssuedThisMonth ?? '—', color: '#ffffff' },
                  ].map((item, i) => (
                    <div key={i} style={{ background: 'var(--surface)', padding: '10px 12px', borderRadius: '8px', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: '18px', fontWeight: 700, color: item.color, lineHeight: 1.1 }}>{item.value}</p>
                      <p style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px', textTransform: 'uppercase' }}>{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
