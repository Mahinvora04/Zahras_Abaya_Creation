import { useEffect, useState } from 'react';
import { ArrowRight, LockKeyhole } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import useAuthStore from '../../store/authStore';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const { user, adminLogin, error, clearError, loading } = useAuthStore();
  const navigate = useNavigate();
  useEffect(() => { if (!loading && user?.role === 'admin') navigate('/admin', { replace: true }); }, [user, loading, navigate]);
  useEffect(() => () => clearError(), [clearError]);
  const submit = async (event) => { event.preventDefault(); setBusy(true); const result = await adminLogin(email, password); setBusy(false); if (result.success) navigate('/admin', { replace: true }); };
  return <main className="min-h-screen bg-stone-950 flex items-center justify-center p-5"><section className="w-full max-w-md bg-stone-50 p-8 sm:p-10 shadow-2xl"><Link to="/" className="font-serif text-xl text-stone-900">Zahra&apos;s Abaya</Link><p className="text-[10px] uppercase tracking-[.25em] text-amber-900 mt-8">Secure workspace</p><h1 className="font-serif text-3xl mt-2">Administrator sign in</h1><p className="text-sm text-stone-500 mt-2 mb-7">Use the admin credentials configured for this store.</p>
    {error && <div role="alert" className="bg-rose-50 border border-rose-200 p-3 text-sm text-rose-800 mb-5">{error}</div>}
    <form onSubmit={submit} className="space-y-5"><label className="block text-xs uppercase tracking-wider text-stone-600">Admin email<input required type="email" autoComplete="username" value={email} onChange={(e)=>setEmail(e.target.value)} className="mt-2 w-full border border-stone-300 bg-white px-3 py-3 normal-case tracking-normal text-sm focus:outline-none focus:border-amber-800" /></label><label className="block text-xs uppercase tracking-wider text-stone-600">Password<input required type="password" autoComplete="current-password" value={password} onChange={(e)=>setPassword(e.target.value)} className="mt-2 w-full border border-stone-300 bg-white px-3 py-3 normal-case tracking-normal text-sm focus:outline-none focus:border-amber-800" /></label><button disabled={busy} className="w-full flex justify-center items-center gap-2 bg-stone-900 text-white py-3 text-xs uppercase tracking-[.18em] hover:bg-amber-900 disabled:opacity-60"><LockKeyhole size={15}/>{busy ? 'Signing in…' : 'Sign in'}<ArrowRight size={15}/></button></form>
    <p className="text-center text-xs text-stone-500 mt-6"><Link to="/" className="hover:text-stone-900">Return to storefront</Link></p></section></main>;
}
