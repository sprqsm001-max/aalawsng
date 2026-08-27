'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import LoginPage from './login/page';

export default function Home() {
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.tier === 'CLIENT') {
        router.replace('/portal');
      } else {
        router.replace('/dashboard');
      }
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--surface)' }}>
      <div style={{ textAlign: 'center' }}>
        <img
          src="/logo.png"
          alt="AALAWSNG"
          style={{ width: '72px', height: '72px', borderRadius: '50%', marginBottom: '16px' }}
        />
        <div style={{ width: '24px', height: '24px', border: '2px solid rgba(255,255,255,0.2)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto' }} />
      </div>
    </div>
  );
}

