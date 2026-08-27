'use client';
import { useEffect, useState } from 'react';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { BarChart2, Users, Briefcase, DollarSign, Clock, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#00b862','#10d87a','#22c55e','#f59e0b','#ef4444','#60a5fa','#a78bfa'];

export default function AnalyticsPage() {
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { if (!isAuthenticated) router.replace('/login'); else load(); }, []);

  const load = async () => {
    setLoading(true);
    try { const res = await api.get('/analytics'); setData(res.data); } catch {}
    setLoading(false);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar"><h2 style={{fontSize:'16px',fontWeight:600,color:'var(--text-secondary)'}}>Adeola Kolawole & Associates</h2></div>
      <main className="main-content">
        <div className="page-header">
          <div><h1 className="page-title">Analytics & Reports</h1><p className="page-subtitle">Firm-wide performance metrics and KPIs</p></div>
        </div>

        {loading ? (
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px'}}>
            {[...Array(6)].map((_,i)=><div key={i} className="skeleton" style={{height:'100px',borderRadius:'14px'}}/>)}
          </div>
        ) : !data ? (
          <p style={{color:'var(--text-muted)',textAlign:'center',padding:'60px'}}>No analytics data available</p>
        ) : (
          <>
            {/* Overview KPIs */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:'16px',marginBottom:'24px'}}>
              {[
                { label:'Active Clients', value: data.overview.totalClients, icon: Users, color:'#60a5fa' },
                { label:'Active Matters', value: data.overview.activeMatters, icon: Briefcase, color:'var(--accent)' },
                { label:'Total Staff', value: data.overview.totalStaff, icon: Users, color:'#4ade80' },
                { label:'Revenue This Month', value: `₦${Number(data.financial.revenueThisMonth).toLocaleString()}`, icon: DollarSign, color:'var(--accent)' },
                { label:'Billable Hours (Month)', value: `${data.financial.billableHoursThisMonth}h`, icon: Clock, color:'#a78bfa' },
                { label:'Pending Conflicts', value: data.overview.pendingConflicts, icon: AlertTriangle, color: data.overview.pendingConflicts>0?'#f87171':'#4ade80' },
              ].map((stat,i) => {
                const Icon = stat.icon;
                return (
                  <div key={i} className="card-stat">
                    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                      <div>
                        <p className="stat-label">{stat.label}</p>
                        <p className="stat-value" style={{color:stat.color,marginTop:'6px'}}>{stat.value}</p>
                      </div>
                      <div style={{width:'38px',height:'38px',borderRadius:'9px',background:`${stat.color}15`,display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <Icon size={18} style={{color:stat.color}}/>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Charts Row */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px',marginBottom:'24px'}}>
              <div className="card">
                <h3 style={{fontFamily:'Inter,sans-serif',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Matter Status Distribution</h3>
                {data.matters.statusBreakdown.length>0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={data.matters.statusBreakdown.map((s:any)=>({name:s.status,value:s._count}))} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={4} dataKey="value">
                        {data.matters.statusBreakdown.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                      </Pie>
                      <Tooltip contentStyle={{background:'var(--surface-card)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)',fontSize:'13px'}}>No data</p>}
              </div>

              <div className="card">
                <h3 style={{fontFamily:'Inter,sans-serif',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Task Status Breakdown</h3>
                {data.tasks.statusBreakdown.length>0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={data.tasks.statusBreakdown.map((t:any)=>({status:t.status.replace('_',' '),count:t._count}))}>
                      <XAxis dataKey="status" tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false}/>
                      <YAxis tick={{fill:'var(--text-muted)',fontSize:11}} axisLine={false}/>
                      <Tooltip contentStyle={{background:'var(--surface-card)',border:'1px solid var(--border)',borderRadius:'8px',fontSize:'12px'}}/>
                      <Bar dataKey="count" fill="#00b862" radius={[4,4,0,0]}/>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <p style={{textAlign:'center',padding:'60px 0',color:'var(--text-muted)',fontSize:'13px'}}>No data</p>}
              </div>
            </div>

            {/* Staff Utilization */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'20px'}}>
              <div className="card">
                <h3 style={{fontFamily:'Inter,sans-serif',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Staff Matter Load</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {data.staff.utilization.slice(0,6).map((s:any,i:number)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--surface)',borderRadius:'8px'}}>
                      <div>
                        <p style={{fontSize:'13px',color:'var(--text-primary)',fontWeight:500}}>{s.name}</p>
                        <p style={{fontSize:'11px',color:'var(--text-muted)',marginTop:'1px'}}>{s.role}</p>
                      </div>
                      <span className="badge badge-blue">{s.matterCount} matters</span>
                    </div>
                  ))}
                  {data.staff.utilization.length===0&&<p style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:'13px'}}>No staff data</p>}
                </div>
              </div>

              <div className="card">
                <h3 style={{fontFamily:'Inter,sans-serif',fontSize:'14px',fontWeight:600,marginBottom:'16px'}}>Top Clients by Matter Count</h3>
                <div style={{display:'flex',flexDirection:'column',gap:'10px'}}>
                  {data.clients.topByMatters.slice(0,5).map((c:any,i:number)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 12px',background:'var(--surface)',borderRadius:'8px'}}>
                      <span style={{fontSize:'13px',color:'var(--text-primary)',fontWeight:500}}>{c.name}</span>
                      <span className="badge badge-gold">{c.matterCount} matters</span>
                    </div>
                  ))}
                  {data.clients.topByMatters.length===0&&<p style={{textAlign:'center',padding:'20px',color:'var(--text-muted)',fontSize:'13px'}}>No client data</p>}
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
