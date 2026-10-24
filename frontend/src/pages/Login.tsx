import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useShopfloorStore } from '../context/shopfloorStore';
import logoImg from '../logo.png';
import { Shield, Key, Eye, EyeOff } from 'lucide-react';
import { getApiUrl } from '../config';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loginStore = useShopfloorStore((state) => state.login);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(getApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        loginStore(data.access_token, data.user);
        
        // Super Admin directs to enterprise management page by default
        if (data.user?.role === 'SUPER_ADMIN') {
          navigate('/super-admin');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(response.status === 401 ? 'Invalid username or password.' : response.status === 403 ? 'Account not authorized for this plant.' : 'Login unavailable. Contact your administrator.');
      }
    } catch {
      setError('Cannot connect to the server. Please try again when the connection is restored.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0B0F19] text-slate-100 p-4 font-sans relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute w-[500px] h-[500px] bg-[#174A7C] rounded-full blur-[140px] opacity-25 -top-20 -left-20"></div>
      <div className="absolute w-[450px] h-[450px] bg-[#059669] rounded-full blur-[140px] opacity-15 -bottom-20 -right-20"></div>
      <div className="absolute w-[300px] h-[300px] bg-[#F5A623] rounded-full blur-[120px] opacity-10 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>

      <div className="w-full max-w-lg bg-[#142A45]/90 backdrop-blur-xl border border-[#1F3A5C] rounded-3xl p-8 sm:p-10 shadow-2xl relative z-10">
        {/* Header with Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-white px-6 py-3 rounded-2xl shadow-xl border border-slate-200/20 mb-3 flex items-center justify-center">
            <img
              src={logoImg}
              alt="UGAM Next Gen MES"
              className="h-12 w-auto object-contain block"
            />
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
            UGAM NEXT GEN MES
          </h1>
          <p className="text-xs text-[#F5A623] font-bold uppercase tracking-wider mt-1">
            Next Generation MES for connected, traceable manufacturing
          </p>
        </div>

        {error && (
          <div className="bg-red-500/15 border border-red-500/30 text-red-300 p-3 rounded-xl text-sm mb-6 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse"></span>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          {/* Username */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Username</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Shield size={18} />
              </span>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. superadmin, admin, food_op1, operator1"
                className="w-full bg-[#0D1B2A] border border-[#1F3A5C] rounded-xl py-2.5 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-[#174A7C] placeholder-slate-500 font-medium"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">Password</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
                <Key size={18} />
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0D1B2A] border border-[#1F3A5C] rounded-xl py-2.5 pl-10 pr-10 text-white text-sm focus:outline-none focus:border-[#174A7C] placeholder-slate-500 font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 focus:outline-none transition cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-[#174A7C] to-[#133E68] hover:from-[#1A548D] hover:to-[#174A7C] text-white font-bold py-3 rounded-xl transition duration-200 shadow-xl shadow-[#174A7C]/40 cursor-pointer flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Authenticating Session...</span>
            ) : (
              <span>Enter Plant Station &rarr;</span>
            )}
          </button>
        </form>


      </div>
    </div>
  );
}

