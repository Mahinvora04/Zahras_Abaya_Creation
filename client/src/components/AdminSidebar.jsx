import { Image, LayoutDashboard, LogOut, Package, ShoppingBag, Store, Tags } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const links = [
  { to: '/admin', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/products', label: 'Products', icon: Package },
  { to: '/admin/orders', label: 'Orders', icon: ShoppingBag },
  { to: '/admin/categories', label: 'Categories', icon: Tags },
  { to: '/admin/banners', label: 'Banners', icon: Image },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  return (
    <aside className="w-64 shrink-0 bg-stone-950 text-stone-100 min-h-screen p-5 flex flex-col">
      <Link to="/admin" className="text-lg font-serif tracking-wide mb-10 text-amber-200">Zahra&apos;s <span className="block text-[10px] uppercase tracking-[.24em] text-stone-400 mt-1">Store administration</span></Link>
      <nav className="space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to} className={`flex items-center gap-3 px-3 py-3 rounded text-sm transition ${location.pathname === to || (to !== '/admin' && location.pathname.startsWith(to)) ? 'bg-amber-100/10 text-amber-200' : 'text-stone-300 hover:bg-white/5 hover:text-white'}`}>
            <Icon size={17} />{label}
          </Link>
        ))}
      </nav>
      <div className="mt-auto space-y-1">
        <Link to="/" className="flex items-center gap-3 px-3 py-3 text-sm text-stone-300 hover:text-white"><Store size={17} />View storefront</Link>
        <button onClick={async () => { await logout(); navigate('/admin/login'); }} className="w-full flex items-center gap-3 px-3 py-3 text-sm text-stone-300 hover:text-white"><LogOut size={17} />Sign out</button>
      </div>
    </aside>
  );
}
