'use client';

import { useState, useTransition, Suspense } from 'react';
import { login, signup } from './actions';
import { useSearchParams } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const errorMessage = searchParams.get('error');

  const [roleType, setRoleType] = useState<'admin' | 'user'>('admin');
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.append('role_type', roleType);

    startTransition(async () => {
      if (authMode === 'signin') {
        await login(formData);
      } else {
        await signup(formData);
      }
    });
  };

  return (
    <div className="login-container" style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top left, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)',
      padding: '24px 16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background glows */}
      <div style={{
        position: 'absolute',
        width: 500,
        height: 500,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, rgba(99,102,241,0) 70%)',
        top: -150,
        left: -150,
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        width: 450,
        height: 450,
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(168,85,247,0.12) 0%, rgba(168,85,247,0) 70%)',
        bottom: -120,
        right: -120,
        pointerEvents: 'none'
      }} />

      <div style={{
        width: '100%',
        maxWidth: 460,
        background: 'rgba(255, 255, 255, 0.94)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(226, 232, 240, 0.9)',
        borderRadius: 24,
        boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8) inset',
        padding: '36px 32px',
        position: 'relative',
        zIndex: 1
      }}>
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 16,
            background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
            color: 'white',
            fontWeight: 800,
            fontSize: 24,
            boxShadow: '0 10px 25px -5px rgba(79, 70, 229, 0.4)',
            marginBottom: 14
          }}>
            J
          </div>
          <h1 style={{
            fontSize: 24,
            fontWeight: 800,
            color: '#0f172a',
            letterSpacing: '-0.025em',
            margin: '0 0 6px 0'
          }}>
            Personal JIRA Cloud
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            {authMode === 'signin' ? 'Sign in to access your workspaces & issues' : 'Create an account to join the agile workspace'}
          </p>
        </div>

        {/* 1. ROLE SELECTOR TAB: Admin vs User */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 6,
          background: '#f1f5f9',
          padding: 4,
          borderRadius: 14,
          marginBottom: 20
        }}>
          <button
            type="button"
            onClick={() => setRoleType('admin')}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: roleType === 'admin' ? '#ffffff' : 'transparent',
              color: roleType === 'admin' ? '#4f46e5' : '#64748b',
              boxShadow: roleType === 'admin' ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none'
            }}
          >
            <span>👑</span>
            <span>Admin</span>
          </button>

          <button
            type="button"
            onClick={() => setRoleType('user')}
            style={{
              padding: '10px 12px',
              borderRadius: 10,
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600,
              fontSize: 13,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              transition: 'all 0.2s ease',
              background: roleType === 'user' ? '#ffffff' : 'transparent',
              color: roleType === 'user' ? '#4f46e5' : '#64748b',
              boxShadow: roleType === 'user' ? '0 4px 12px rgba(15, 23, 42, 0.08)' : 'none'
            }}
          >
            <span>👤</span>
            <span>Team Member</span>
          </button>
        </div>

        {/* Role Badge description */}
        <div style={{
          fontSize: 12,
          color: roleType === 'admin' ? '#4338ca' : '#475569',
          background: roleType === 'admin' ? '#eef2ff' : '#f8fafc',
          border: `1px solid ${roleType === 'admin' ? '#c7d2fe' : '#e2e8f0'}`,
          borderRadius: 10,
          padding: '8px 12px',
          marginBottom: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8
        }}>
          <span>{roleType === 'admin' ? '🛡️' : '🚀'}</span>
          <span>
            {roleType === 'admin' 
              ? 'Admin Mode: Full access to manage team roles, projects & system settings' 
              : 'User Mode: Access assigned tasks, board view, sprints & backlogs'}
          </span>
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div style={{
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#991b1b',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8
          }}>
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 2. AUTH FORM */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {authMode === 'signup' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                  Full Name
                </label>
                <input
                  name="full_name"
                  type="text"
                  required
                  placeholder="e.g. Nikhil Singh"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 12,
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    fontSize: 14,
                    outline: 'none',
                    transition: 'border-color 0.2s',
                    boxSizing: 'border-box'
                  }}
                  onFocus={e => (e.target.style.borderColor = '#6366f1')}
                  onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    City
                  </label>
                  <select
                    name="city"
                    required
                    defaultValue="Mumbai"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box',
                      cursor: 'pointer'
                    }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
                  >
                    <option value="Mumbai">📍 Mumbai</option>
                    <option value="Pune">📍 Pune</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
                    Designation
                  </label>
                  <input
                    name="designation"
                    type="text"
                    required
                    placeholder="e.g. QA / Developer"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: 12,
                      border: '1px solid #cbd5e1',
                      background: '#ffffff',
                      fontSize: 14,
                      outline: 'none',
                      transition: 'border-color 0.2s',
                      boxSizing: 'border-box'
                    }}
                    onFocus={e => (e.target.style.borderColor = '#6366f1')}
                    onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#334155', marginBottom: 6 }}>
              Email Address
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@company.com"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 12,
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                fontSize: 14,
                outline: 'none',
                transition: 'border-color 0.2s',
                boxSizing: 'border-box'
              }}
              onFocus={e => (e.target.style.borderColor = '#6366f1')}
              onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
            />
          </div>

          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>
                Password
              </label>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                autoComplete="current-password"
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px 42px 12px 14px',
                  borderRadius: 12,
                  border: '1px solid #cbd5e1',
                  background: '#ffffff',
                  fontSize: 14,
                  outline: 'none',
                  transition: 'border-color 0.2s',
                  boxSizing: 'border-box'
                }}
                onFocus={e => (e.target.style.borderColor = '#6366f1')}
                onBlur={e => (e.target.style.borderColor = '#cbd5e1')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  color: '#94a3b8',
                  padding: 4
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '👁️' : '🔒'}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isPending}
            style={{
              marginTop: 6,
              width: '100%',
              padding: '12px 16px',
              borderRadius: 12,
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)',
              color: 'white',
              fontSize: 14,
              fontWeight: 600,
              cursor: isPending ? 'not-allowed' : 'pointer',
              boxShadow: '0 10px 20px -5px rgba(79, 70, 229, 0.35)',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              opacity: isPending ? 0.7 : 1
            }}
          >
            {isPending ? (
              <span>⏳ Processing...</span>
            ) : (
              <>
                <span>{authMode === 'signin' ? `Sign In as ${roleType === 'admin' ? 'Admin' : 'Team Member'}` : 'Create Account'}</span>
                <span>→</span>
              </>
            )}
          </button>
        </form>

        {/* 3. SWITCH BETWEEN SIGN IN & SIGN UP */}
        <div style={{
          marginTop: 24,
          paddingTop: 20,
          borderTop: '1px solid #f1f5f9',
          textAlign: 'center',
          fontSize: 13,
          color: '#64748b'
        }}>
          {authMode === 'signin' ? (
            <span>
              Don't have an account yet?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signup')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Create an account
              </button>
            </span>
          ) : (
            <span>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#4f46e5',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: 0,
                  textDecoration: 'underline'
                }}
              >
                Sign in instead
              </button>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ color: '#64748b', fontSize: 14 }}>Loading...</div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
