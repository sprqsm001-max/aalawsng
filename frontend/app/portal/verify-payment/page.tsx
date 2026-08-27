'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import Sidebar from '@/components/Sidebar';
import { CheckCircle, AlertTriangle, ArrowLeft, Loader2, Shield } from 'lucide-react';

function VerifyPaymentContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const reference = searchParams.get('reference');
  const invoiceId = searchParams.get('invoiceId');

  const [loading, setLoading] = useState(true);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (reference) {
      verify();
    } else {
      setLoading(false);
      setMessage('Missing payment reference parameter.');
    }
  }, [reference]);

  const verify = async () => {
    try {
      const { data } = await api.post('/trust/verify-payment', { reference });
      setSuccess(true);
      setMessage(data.message || 'Payment successfully verified and credited.');
    } catch (err: any) {
      setSuccess(false);
      setMessage(err.response?.data?.error || 'Payment verification failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '40px auto' }}>
      <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
        {loading ? (
          <div>
            <Loader2 size={42} style={{ margin: '0 auto 16px', color: 'var(--accent)', animation: 'spin 1s linear infinite' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--text-primary)' }}>Verifying Payment with Paystack...</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '8px' }}>
              Confirming transaction reference <code>{reference}</code>
            </p>
          </div>
        ) : success ? (
          <div>
            <CheckCircle size={48} style={{ color: '#4ade80', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Payment Confirmed
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              {message}
            </p>

            <div style={{ background: 'rgba(34,197,94,0.08)', borderRadius: '8px', padding: '12px 16px', marginBottom: '24px', fontSize: '12.5px', color: 'var(--text-secondary)', textAlign: 'left', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Shield size={16} style={{ color: '#4ade80', flexShrink: 0 }} />
              <span>
                Funds have been credited in compliance with the Legal Practitioners' Accounts Rules 1964. An immutable receipt has been appended to the audit ledger.
              </span>
            </div>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => router.push('/portal')}>
                Return to Client Portal
              </button>
              <button className="btn btn-secondary" onClick={() => router.push('/invoices')}>
                View Invoices
              </button>
            </div>
          </div>
        ) : (
          <div>
            <AlertTriangle size={48} style={{ color: '#f87171', margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Payment Verification Failed
            </h2>
            <p style={{ fontSize: '14px', color: '#f87171', marginBottom: '24px' }}>
              {message}
            </p>
            <button className="btn btn-secondary" onClick={() => router.push('/portal')}>
              Return to Portal
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyPaymentPage() {
  return (
    <div className="dashboard-layout">
      <Sidebar />
      <div className="topbar">
        <h2 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Adeola Kolawole & Associates</h2>
      </div>
      <main className="main-content">
        <Suspense fallback={<div className="skeleton" style={{ height: '200px', maxWidth: '600px', margin: '40px auto', borderRadius: '12px' }} />}>
          <VerifyPaymentContent />
        </Suspense>
      </main>
    </div>
  );
}
