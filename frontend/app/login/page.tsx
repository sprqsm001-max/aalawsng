'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.user, data.accessToken, data.refreshToken);
      if (data.user.tier === 'CLIENT') router.push('/portal');
      else router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        {/* Official Logo */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <div style={{ display: 'inline-block', position: 'relative', marginBottom: '12px' }}>
            <img
              src="/logo.png"
              alt="AALAWSNG Official Logo"
              style={{ width: '84px', height: '84px', borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255, 255, 255, 0.2)', boxShadow: '0 8px 24px rgba(0,0,0,0.6)' }}
            />
          </div>
          <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '24px', color: 'var(--text-primary)', fontWeight: 700, letterSpacing: '0.02em', margin: 0 }}>
            AALAWS<span style={{ color: 'var(--accent)' }}>NG</span>
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '11px', marginTop: '4px', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Law Firm Management System
          </p>
          <div style={{ width: '32px', height: '2px', background: 'var(--accent)', margin: '12px auto 0', borderRadius: '2px' }} />
        </div>

        <h2 style={{ fontFamily: 'Inter, sans-serif', fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '18px', textAlign: 'center' }}>
          Sign in to your practice account
        </h2>

        {error && (
          <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 12px', marginBottom: '16px', color: '#f87171', fontSize: '12px' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@aalawsng.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '6px', padding: '11px', fontSize: '13.5px' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ width: '15px', height: '15px', border: '2px solid', borderColor: '#000 transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
                Signing in…
              </span>
            ) : 'Sign In'}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)', marginTop: '24px' }}>
          Adeola Kolawole & Associates · Lagos, Nigeria
        </p>
      </div>
    </div>
  );
}
