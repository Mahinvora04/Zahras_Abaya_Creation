import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';

import useAuthStore from '../store/authStore';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register, user, error, clearError } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/');
  }, [user, navigate]);

  useEffect(() => {
    return () => clearError();
  }, [clearError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');

    if (form.password !== form.confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    setLoading(true);
    const res = await register(form.name, form.email, form.password);
    setLoading(false);
    if (res?.success) navigate('/');
  };

  const displayError = localError || error;

  return (
    <div className="min-h-[85vh] flex items-center justify-center px-4 py-12 bg-stone-50/50">
      <div className="w-full max-w-md bg-white border border-stone-200/80 p-8 sm:p-10 shadow-xl rounded-sm">
        {/* Header */}
        <div className="text-center space-y-2 mb-8">
          <span className="text-[11px] font-medium tracking-[0.25em] text-amber-800 uppercase">
            Join Zahra's Abaya
          </span>
          <h2 className="text-3xl font-serif text-stone-900 font-light">Create Account</h2>
          <p className="text-xs text-stone-500 font-light">
            Enjoy exclusive member benefits, order tracking & fast checkout
          </p>
        </div>

        {/* Error Alert */}
        {displayError && (
          <div className="mb-6 p-4 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-sm flex items-start gap-3">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span className="leading-relaxed">{displayError}</span>
          </div>
        )}

        {/* Registration Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Full Name */}
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-stone-700 mb-1.5">
              Full Name
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="Amina Khan"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full pl-10 pr-4 py-3 text-sm text-stone-900 bg-stone-50/50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />
              <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-stone-700 mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="name@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full pl-10 pr-4 py-3 text-sm text-stone-900 bg-stone-50/50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />
              <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-stone-700 mb-1.5">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="w-full pl-10 pr-11 py-3 text-sm text-stone-900 bg-stone-50/50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-xs font-medium tracking-wider uppercase text-stone-700 mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                className="w-full pl-10 pr-4 py-3 text-sm text-stone-900 bg-stone-50/50 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />
              <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-stone-100 hover:bg-amber-900 py-3.5 px-4 text-xs font-medium tracking-widest uppercase transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <>
                <span>Register</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer Link */}
        <div className="mt-8 pt-6 border-t border-stone-100 text-center">
          <p className="text-xs text-stone-500">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-amber-800 font-semibold hover:text-stone-900 tracking-wider uppercase ml-1 transition-colors"
            >
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}