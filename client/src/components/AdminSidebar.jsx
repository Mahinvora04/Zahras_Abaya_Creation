import { Link, useLocation } from 'react-router-dom';

const links = [
  { to: '/admin', label: 'Dashboard', icon: '📊' },
  { to: '/admin/products', label: 'Products', icon: '🛍️' },
  { to: '/', label: 'View Store', icon: '🏪' },
];

export default function AdminSidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <h2 className="text-xl font-bold mb-6 text-purple-400">Admin Panel</h2>
      <nav className="space-y-2">
        {links.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className={`block px-4 py-2 rounded ${
              location.pathname === link.to
                ? 'bg-purple-600'
                : 'hover:bg-gray-800'
            }`}
          >
            <span className="mr-2">{link.icon}</span>
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}