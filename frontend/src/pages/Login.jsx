import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth, DEMO_USERS } from '../context/AuthContext';
import { LogIn, Layers, AlertCircle, ArrowRight } from 'lucide-react';

export const Login = () => {
  const { login, switchDemoAccount } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const user = await login(email, password);
      if (user.role === 'organizer') navigate('/organizer');
      else if (user.role === 'ambassador' || user.role === 'coordinator') navigate('/staff');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail) => {
    setLoading(true);
    setError('');
    try {
      await switchDemoAccount(demoEmail);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-3xl border border-gray-200 shadow-xl">
        <div className="text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-indigo-100">
            <Layers className="w-6 h-6" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Sign in to CampusForge</h2>
          <p className="text-xs text-gray-500 mt-1">Student Opportunity & Collaboration Platform</p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-gray-700 mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@university.edu"
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block font-semibold text-gray-700 mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full p-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* 1-Click Demo Evaluation Personas */}
        <div className="pt-4 border-t border-gray-100">
          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block mb-2 text-center">
            ⚡ Quick 1-Click Demo Login for Mentors
          </span>
          <div className="grid grid-cols-1 gap-1.5">
            {DEMO_USERS.map((demo) => (
              <button
                key={demo.email}
                type="button"
                onClick={() => handleQuickDemo(demo.email)}
                className="w-full text-left px-3 py-2 rounded-xl bg-gray-50 hover:bg-indigo-50 border border-gray-200 hover:border-indigo-200 transition-colors cursor-pointer flex items-center justify-between text-xs"
              >
                <div>
                  <span className="font-bold text-gray-800">{demo.label}</span>
                  <span className="text-[10px] text-gray-400 block">{demo.email}</span>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
              </button>
            ))}
          </div>
        </div>

        <div className="text-center text-xs text-gray-500 pt-2">
          Don't have an account?{' '}
          <Link to="/register" className="font-bold text-indigo-600 hover:underline">
            Register Student Account
          </Link>
        </div>
      </div>
    </div>
  );
};
