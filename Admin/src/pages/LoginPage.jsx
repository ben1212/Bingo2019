import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';

export function LoginPage() {
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) return;
    setError('');
    setLoading(true);
    try {
      await login(username.trim(), password);
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#080C14] flex items-center justify-center p-5 relative overflow-hidden select-none">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-sky-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative w-full max-w-[400px] animate-fade-in">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/20 border border-white/10 ring-4 ring-blue-500/10">
            <img src="/icon-512.jpg" alt="BingoX Admin" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center justify-center gap-1.5">
            <span>Bingo</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-sky-400 to-blue-500">X</span>
            <span className="text-xs font-black px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider ml-1">HQ</span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1.5">Executive Management & Operations Portal</p>
        </div>

        {/* Card */}
        <div className="bg-[#0E1524]/90 backdrop-blur-2xl border border-white/[0.08] rounded-3xl p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)]">
          <form onSubmit={handleSubmit} className="space-y-4.5" noValidate>
            {/* Username */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Admin Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter admin username"
                autoFocus
                required
                className="w-full bg-[#080C14]/90 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-[11px] font-extrabold text-slate-400 uppercase tracking-wider mb-2">
                Security Password
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full bg-[#080C14]/90 border border-white/[0.08] text-white text-sm rounded-xl px-4 py-3 pr-11 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors p-1"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3 animate-slide-up">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !username.trim() || !password}
              className="w-full mt-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-extrabold text-sm rounded-xl py-3.5 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98] ring-1 ring-white/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Authenticating...</span>
                </>
              ) : (
                'Sign In to Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
