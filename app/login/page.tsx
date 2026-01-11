// app/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, LogIn, Mail } from 'lucide-react';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        console.error('Login error:', authError);
        setError('Invalid email or password. Please try again.');
        setLoading(false);
        return;
      }

      if (data.user) {
        // Successful login
        router.push('/admin');
        router.refresh();
      }
    } catch (err) {
      console.error('Unexpected error:', err);
      setError('Connection failed. Please check your internet and try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-red-50/50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          {/* Red Header with Logo */}
          <div className="bg-[#C81F2D] p-8 text-center relative overflow-hidden">
            {/* Subtle pattern overlay */}
            <div className="absolute inset-0 opacity-10" style={{
              backgroundImage: 'radial-gradient(circle at 20% 50%, white 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }}></div>
            
            {/* Content */}
            <div className="relative z-10">
              <div className="inline-block bg-white rounded-2xl p-5 shadow-2xl ring-4 ring-white/20">
                <Image
                  src="/r-t logo.jpg"
                  alt="R&T Marketing"
                  width={100}
                  height={100}
                  className="rounded-xl"
                  priority
                />
              </div>
              <h1 className="text-white text-3xl font-bold mt-5 tracking-tight drop-shadow-lg">R&T MARKETING</h1>
              <p className="text-white/95 text-sm mt-2 font-medium tracking-wide">Admin Portal</p>
            </div>
          </div>

          {/* Login Form */}
          <div className="p-8 bg-gradient-to-b from-white to-gray-50">
            <div className="flex items-center justify-center gap-2 mb-6">
              <div className="p-2 bg-red-50 rounded-lg">
                <Lock className="w-5 h-5 text-[#C81F2D]" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Secure Login</h2>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="admin@rtmarketing.com"
                    autoComplete="username email"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C81F2D] focus:border-[#C81F2D] transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {/* Password Field */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Lock className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#C81F2D] focus:border-[#C81F2D] transition-all outline-none"
                    required
                  />
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                  <span className="text-red-500 text-lg">⚠</span>
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#C81F2D] hover:bg-[#A01823] text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 shadow-lg hover:shadow-xl"
              >
                {loading ? (
                  <>
                    <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Logging in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    <span>Login to Dashboard</span>
                  </>
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-200 text-center">
              <a 
                href="/catalogue" 
                className="inline-flex items-center gap-1 text-sm text-[#C81F2D] hover:text-[#A01823] font-semibold group transition-colors"
              >
                <span>View Public Catalog</span>
                <span className="transform group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-gray-500 text-xs">
            © 2026 R&T Marketing. All rights reserved.
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Secure admin access portal
          </p>
        </div>
      </div>
    </div>
  );
}
