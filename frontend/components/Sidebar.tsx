'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import {
  LayoutDashboard, Users, Briefcase, Calendar, FileText, CheckSquare,
  Clock, Receipt, Shield, DollarSign, UserCheck, BarChart2, MessageSquare,
  MessageCircle, Scale, Activity, Settings, LogOut, Menu, X
} from 'lucide-react';

interface NavSection {
  section: string;
}

interface NavLinkItem {
  href: string;
  label: string;
  icon: any;
  critical?: boolean;
}

type NavItem = NavSection | NavLinkItem;

const STAFF_NAV: NavItem[] = [
  { section: 'Practice' },
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/matters', label: 'Matters', icon: Briefcase },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/calendar', label: 'Calendar & Deadlines', icon: Calendar },
  { href: '/documents', label: 'Documents', icon: FileText },
  { href: '/tasks', label: 'Tasks', icon: CheckSquare },
  { section: 'Financial' },
  { href: '/time', label: 'Time & Billing', icon: Clock },
  { href: '/invoices', label: 'Invoices', icon: Receipt },
  { href: '/trust', label: 'Client & Trust Accounts', icon: Shield, critical: true },
  { href: '/expenses', label: 'Expenses', icon: DollarSign },
  { section: 'Communication' },
  { href: '/messages', label: 'Internal Messages', icon: MessageSquare },
  { href: '/client-messages', label: 'Client Messages', icon: MessageCircle },
  { section: 'Staff & HR' },
  { href: '/staff', label: 'Staff Directory', icon: UserCheck },
  { href: '/hr', label: 'HR & Leaves', icon: Users },
  { section: 'Compliance & Admin' },
  { href: '/conflicts', label: 'Conflict Checks', icon: Scale },
  { href: '/audit', label: 'Audit Ledger', icon: Activity },
  { href: '/analytics', label: 'Analytics', icon: BarChart2 },
  { href: '/rbac', label: 'Permissions', icon: Settings },
];

const CLIENT_NAV: NavItem[] = [
  { href: '/portal', label: 'Overview', icon: LayoutDashboard },
  { href: '/matters', label: 'My Matters', icon: Briefcase },
  { href: '/documents', label: 'My Documents', icon: FileText },
  { href: '/invoices', label: 'My Invoices', icon: Receipt },
  { href: '/client-messages', label: 'Messages', icon: MessageCircle },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const navItems = user?.tier === 'CLIENT' ? CLIENT_NAV : STAFF_NAV;

  const handleLogout = async () => {
    try {
      await api.post('/auth/logout', { refreshToken: localStorage.getItem('refreshToken') });
    } catch { /* ignore */ }
    logout();
    router.push('/login');
  };

  return (
    <>
      {/* Mobile Header Bar */}
      <div className="mobile-header">
        <button
          className="mobile-menu-btn"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label="Toggle navigation menu"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img
            src="/logo.png"
            alt="AALAWSNG Logo"
            style={{ width: '26px', height: '26px', borderRadius: '50%', objectFit: 'cover' }}
          />
          <span style={{ fontFamily: 'Playfair Display, serif', fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)', letterSpacing: '0.04em' }}>
            AALAWS<span style={{ color: 'var(--accent)' }}>NG</span>
          </span>
          <span style={{ fontSize: '9.5px', color: 'var(--text-muted)', background: 'var(--surface-hover)', padding: '1px 6px', borderRadius: '4px', border: '1px solid var(--border)' }}>
            Lagos
          </span>
        </div>
        <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#1c1c22', border: '1px solid rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700, color: 'var(--accent)' }}>
          {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
        </div>
      </div>

      {/* Mobile Backdrop Overlay */}
      {mobileOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside className={`sidebar ${mobileOpen ? 'open' : ''}`}>
        {/* Logo Branding */}
        <div className="sidebar-logo">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <img
                src="/logo.png"
                alt="AALAWSNG Logo"
                style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', border: '1px solid rgba(255,255,255,0.15)' }}
              />
              <div>
                <h1 style={{ margin: 0, fontSize: '16px', lineHeight: 1.2, color: 'var(--text-primary)' }}>
                  AALAWS<span style={{ color: 'var(--accent)' }}>NG</span>
                </h1>
                <p style={{ margin: '1px 0 0', fontSize: '9.5px', color: 'var(--text-muted)', letterSpacing: '0.06em' }}>
                  Law Practice Mgmt
                </p>
              </div>
            </div>
            <button
              className="mobile-close-btn"
              onClick={() => setMobileOpen(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {navItems.map((item, i) => {
            if ('section' in item) {
              return <div key={i} className="sidebar-section">{item.section}</div>;
            }
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && item.href !== '/portal' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-link ${isActive ? 'active' : ''}`}
                onClick={() => setMobileOpen(false)}
              >
                <Icon size={15} className="icon" />
                <span style={{ flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.label}
                </span>
                {item.critical && (
                  <span className="badge-critical-pill">
                    LPAR
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="sidebar-footer">
          <div className="user-profile-card">
            <div className="user-avatar">
              {user?.name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.name || user?.email}
              </div>
              <div style={{ fontSize: '9.5px', color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
                {user?.role || user?.tier}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="logout-btn"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
