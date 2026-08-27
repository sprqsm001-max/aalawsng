'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import api from '@/lib/api';
import { 
  checkBiometricAvailability, 
  registerBiometricLogin, 
  authenticateWithBiometrics,
  type BiometricAvailability 
} from '@/lib/biometrics';

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState('');
  const [biometricInfo, setBiometricInfo] = useState<BiometricAvailability>({ isAvailable: false, biometryType: 'NONE' });
  const [hasRegisteredBiometrics, setHasRegisteredBiometrics] = useState(false);
  const [enableBiometricsOnLogin, setEnableBiometricsOnLogin] = useState(true);

  useEffect(() => {
    // Check if biometric authentication is supported on this device
    checkBiometricAvailability().then(info => {
      setBiometricInfo(info);
    });

    // Check if there is already a saved biometric profile on this device
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('aalawsng_biometric_auth');
      if (saved) {
        setHasRegisteredBiometrics(true);
      }
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await api.post('/auth/login', { email, password });
      login(data.user, data.accessToken, data.refreshToken);

      // Save for quick biometric sign-in if opted-in
      if (enableBiometricsOnLogin) {
        await registerBiometricLogin(email, data.accessToken, data.refreshToken, data.user);
      }

      if (data.user.tier === 'CLIENT') router.push('/portal');
      else router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricAuth = async () => {
    setBiometricLoading(true);
    setError('');
    try {
      const result = await authenticateWithBiometrics();
      if (result.success && result.data) {
        const { user, accessToken, refreshToken } = result.data;
        login(user, accessToken, refreshToken);
        if (user.tier === 'CLIENT') router.push('/portal');
        else router.push('/dashboard');
      } else {
        setError(result.error || 'Biometric authentication was cancelled or failed.');
      }
    } catch (err: any) {
      setError('Biometric authentication failed. Please sign in with password.');
    } finally {
      setBiometricLoading(false);
    }
  };

  const getBiometricLabel = () => {
    if (biometricInfo.biometryType === 'FACE_ID') return 'Face ID';
    if (biometricInfo.biometryType === 'TOUCH_ID') return 'Touch ID';
    return 'Fingerprint / Biometric ID';
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

        {/* Biometric One-Touch Sign-In Banner if credentials exist on this device */}
        {hasRegisteredBiometrics && (
          <div style={{ marginBottom: '18px' }}>
            <button
              id="biometric-quick-login-btn"
              type="button"
              onClick={handleBiometricAuth}
              disabled={biometricLoading}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                padding: '12px 16px',
                background: 'linear-gradient(135deg, rgba(0,184,98,0.15), rgba(0,184,98,0.05))',
                border: '1px solid var(--accent, #00b862)',
                borderRadius: '8px',
                color: 'var(--accent, #00b862)',
                fontWeight: 600,
                fontSize: '13px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: '0 4px 12px rgba(0,184,98,0.1)'
              }}
            >
              {biometricLoading ? (
                <span style={{ width: '16px', height: '16px', border: '2px solid', borderColor: 'currentColor transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', display: 'inline-block' }} />
              ) : (
                /* Biometric Fingerprint / Face Icon */
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004 11v.242C4 14.15 5.996 17.607 8.944 19.294" />
                </svg>
              )}
              <span>{biometricLoading ? 'Verifying...' : `One-Touch Sign In with ${getBiometricLabel()}`}</span>
            </button>

            <div style={{ display: 'flex', alignItems: 'center', margin: '16px 0 6px 0', color: 'var(--text-muted)' }}>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
              <span style={{ padding: '0 10px', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>or sign in with password</span>
              <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.08)' }} />
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email Address</label>
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
            <label className="form-label" htmlFor="password">Password</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ paddingRight: '42px', width: '100%' }}
              />
              <button
                type="button"
                id="toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                title={showPassword ? 'Hide password' : 'Show password'}
                style={{
                  position: 'absolute',
                  right: '8px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: showPassword ? 'var(--accent, #00b862)' : 'var(--text-muted, #94a3b8)',
                  transition: 'color 0.2s ease',
                  borderRadius: '4px'
                }}
              >
                {showPassword ? (
                  /* Eye-off SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  /* Eye SVG */
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Biometric Registration Opt-In Checkbox */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 0 4px 0' }}>
            <input
              id="enable-biometrics"
              type="checkbox"
              checked={enableBiometricsOnLogin}
              onChange={e => setEnableBiometricsOnLogin(e.target.checked)}
              style={{ accentColor: 'var(--accent, #00b862)', cursor: 'pointer', width: '15px', height: '15px' }}
            />
            <label htmlFor="enable-biometrics" style={{ fontSize: '12px', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>Enable {getBiometricLabel()} for fast 1-touch sign-in</span>
            </label>
          </div>

          <button
            id="login-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '4px', padding: '11px', fontSize: '13.5px' }}
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
