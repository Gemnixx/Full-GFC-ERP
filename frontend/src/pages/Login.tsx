import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Lock, User, AlertCircle, ArrowRight, Shield } from 'lucide-react';
import { cn } from '../lib/cn';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      if (remember) localStorage.setItem('gfc-remember', username);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid username or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1a3a5c] via-[#0f2942] to-[#0a1f33] flex items-center justify-center p-4 relative overflow-hidden">

      {/* ============================================================
          BACKGROUND FLOATING SHAPES — GFC Products
          ============================================================ */}

      {/* Large Ceiling Fan — Top Right */}
      <div className="absolute -top-20 -right-20 w-96 h-96 opacity-20 animate-spin-slow" style={{ animationDuration: '40s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="15" fill="#60a5fa" />
          <ellipse cx="100" cy="50" rx="12" ry="45" fill="#3b82f6" opacity="0.7" />
          <ellipse cx="100" cy="150" rx="12" ry="45" fill="#3b82f6" opacity="0.7" />
          <ellipse cx="50" cy="100" rx="45" ry="12" fill="#3b82f6" opacity="0.7" />
          <ellipse cx="150" cy="100" rx="45" ry="12" fill="#3b82f6" opacity="0.7" />
          <circle cx="100" cy="100" r="8" fill="#93c5fd" />
        </svg>
      </div>

      {/* Small Fan — Bottom Left */}
      <div className="absolute -bottom-10 -left-10 w-80 h-80 opacity-15 animate-spin-slow" style={{ animationDuration: '30s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="12" fill="#60a5fa" />
          <path d="M100 45 Q105 80 100 100 Q95 80 100 45 Z" fill="#3b82f6" />
          <path d="M155 100 Q120 105 100 100 Q120 95 155 100 Z" fill="#3b82f6" />
          <path d="M100 155 Q95 120 100 100 Q105 120 100 155 Z" fill="#3b82f6" />
          <path d="M45 100 Q80 95 100 100 Q80 105 45 100 Z" fill="#3b82f6" />
        </svg>
      </div>

      {/* Table Fan — Top Left */}
      <div className="absolute top-1/4 left-10 w-48 h-48 opacity-10 animate-float" style={{ animationDuration: '8s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="100" cy="100" r="70" stroke="#60a5fa" strokeWidth="4" fill="none" opacity="0.5" />
          <circle cx="100" cy="100" r="55" stroke="#60a5fa" strokeWidth="2" fill="none" opacity="0.3" />
          <circle cx="100" cy="100" r="10" fill="#60a5fa" />
          <path d="M100 45 L105 95 L100 100 Z" fill="#3b82f6" />
          <path d="M155 100 L105 105 L100 100 Z" fill="#3b82f6" />
          <path d="M100 155 L95 105 L100 100 Z" fill="#3b82f6" />
          <path d="M45 100 L95 95 L100 100 Z" fill="#3b82f6" />
        </svg>
      </div>

      {/* Wall Fan / Bracket — Bottom Right */}
      <div className="absolute bottom-1/4 right-20 w-40 h-40 opacity-15 animate-float" style={{ animationDuration: '10s', animationDelay: '2s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="80" y="140" width="40" height="10" rx="3" fill="#60a5fa" opacity="0.6" />
          <rect x="90" y="100" width="20" height="45" fill="#3b82f6" opacity="0.7" />
          <circle cx="100" cy="80" r="40" stroke="#60a5fa" strokeWidth="3" fill="none" opacity="0.5" />
          <circle cx="100" cy="80" r="8" fill="#93c5fd" />
          <path d="M100 45 L103 75 L100 80 Z" fill="#3b82f6" />
          <path d="M135 80 L105 83 L100 80 Z" fill="#3b82f6" />
          <path d="M100 115 L97 85 L100 80 Z" fill="#3b82f6" />
          <path d="M65 80 L95 77 L100 80 Z" fill="#3b82f6" />
        </svg>
      </div>

      {/* Exhaust Fan — Small */}
      <div className="absolute top-1/3 right-1/4 w-32 h-32 opacity-10 animate-spin-slow" style={{ animationDuration: '25s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <rect x="30" y="30" width="140" height="140" rx="15" stroke="#60a5fa" strokeWidth="3" fill="none" opacity="0.5" />
          <circle cx="100" cy="100" r="10" fill="#60a5fa" />
          <path d="M100 55 Q110 90 100 100 Q90 90 100 55 Z" fill="#3b82f6" />
          <path d="M145 100 Q110 110 100 100 Q110 90 145 100 Z" fill="#3b82f6" />
          <path d="M100 145 Q90 110 100 100 Q110 110 100 145 Z" fill="#3b82f6" />
          <path d="M55 100 Q90 90 100 100 Q90 110 55 100 Z" fill="#3b82f6" />
        </svg>
      </div>

      {/* Bulb / Light — Bottom Center-Left */}
      <div className="absolute bottom-10 left-1/3 w-24 h-24 opacity-10 animate-float" style={{ animationDuration: '6s', animationDelay: '1s' }}>
        <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M100 40 Q140 40 140 90 Q140 130 120 145 L120 165 L80 165 L80 145 Q60 130 60 90 Q60 40 100 40 Z" fill="#60a5fa" opacity="0.4" />
          <rect x="85" y="165" width="30" height="10" rx="2" fill="#93c5fd" />
          <rect x="85" y="178" width="30" height="5" rx="2" fill="#93c5fd" />
          <path d="M100 60 Q120 60 120 90" stroke="#93c5fd" strokeWidth="2" fill="none" />
        </svg>
      </div>

      {/* Bracket shapes — Decorative blobs like original image */}
      <div className="absolute top-20 left-1/3 w-20 h-20 rounded-full bg-blue-500/10 blur-2xl" />
      <div className="absolute bottom-32 right-1/3 w-32 h-32 rounded-full bg-blue-400/10 blur-3xl" />

      {/* ============================================================
          GLASS CARD
          ============================================================ */}
      <div className="relative z-10 w-full max-w-md">

        {/* Outer card with backdrop blur */}
        <div className="relative p-8 sm:p-10 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 shadow-2xl shadow-blue-950/50">

          {/* Inner subtle glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/10 via-transparent to-blue-500/5 pointer-events-none" />

          <div className="relative">

            {/* Logo */}
            <div className="flex justify-center mb-6">
              <div className="w-60 h-20 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center p-3 shadow-lg">
                <img
                  src="/logo.svg"
                  alt="GFC"
                  className="w-full h-full object-contain"
                  onError={(e: any) => {
                    // Fallback if logo doesn't load
                    e.target.style.display = 'none';
                    e.target.parentElement.innerHTML = '<span class="text-white font-bold text-2xl">GFC</span>';
                  }}
                />
              </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
              <h1 className="text-3xl font-bold text-white tracking-tight">
                Welcome Back
              </h1>
              <p className="text-blue-200/70 text-sm mt-2">
                Sign in to GFC Fans Management System
              </p>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-3 rounded-xl bg-red-500/10 border border-red-400/30 backdrop-blur-sm flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-red-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-red-200">{error}</p>
                </div>
              </div>
            )}

            {/* Form */}
            <form onSubmit={submit} className="space-y-5">

              {/* Username */}
              <div>
                <label className="block text-xs font-medium text-blue-200/80 mb-2 uppercase tracking-wider">
                  Username
                </label>
                <div className="relative group">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/60 group-focus-within:text-white transition-colors" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin"
                    className="w-full pl-11 pr-4 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm text-white placeholder:text-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/60 focus:bg-white/15 transition-all"
                    required
                    autoComplete="username"
                    autoFocus
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-medium text-blue-200/80 mb-2 uppercase tracking-wider">
                  Password
                </label>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-300/60 group-focus-within:text-white transition-colors" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-11 pr-11 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-sm text-white placeholder:text-blue-200/40 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/60 focus:bg-white/15 transition-all"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-blue-300/60 hover:text-white transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember + Forgot */}
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="w-4 h-4 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-blue-400/50 focus:ring-offset-0"
                  />
                  <span className="text-xs text-blue-200/70">Remember me</span>
                </label>
                <button
                  type="button"
                  className="text-xs text-blue-200/70 hover:text-white transition-colors"
                  onClick={() => alert('Contact admin to reset password')}
                >
                  Forgot password?
                </button>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className={cn(
                  'w-full py-3 rounded-xl font-semibold text-sm text-white',
                  'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600',
                  'shadow-lg shadow-blue-900/40 hover:shadow-xl hover:shadow-blue-700/40',
                  'transition-all duration-200',
                  'flex items-center justify-center gap-2',
                  'disabled:opacity-60 disabled:cursor-not-allowed',
                  'active:scale-[0.98]',
                  'border border-blue-400/30'
                )}
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-transparent text-[10px] text-blue-200/50 uppercase tracking-widest font-medium">
                  Secure Access
                </span>
              </div>
            </div>

            {/* Demo creds */}
            <div className="p-3 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
              <div className="flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-blue-300 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-blue-200/80 uppercase tracking-wider mb-1">
                    Demo Credentials
                  </p>
                  <p className="text-[11px] text-blue-200/60">
                    admin / <span className="font-mono text-blue-100">admin123</span>
                  </p>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[11px] text-blue-200/40 mt-5">
          © {new Date().getFullYear()} GFC Fans Outlet · All rights reserved
        </p>
      </div>

      {/* Custom animations — add to tailwind config or inline style tag */}
      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        .animate-spin-slow {
          animation: spin-slow linear infinite;
        }
        .animate-float {
          animation: float ease-in-out infinite;
        }
      `}</style>

    </div>
  );
}