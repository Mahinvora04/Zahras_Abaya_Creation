import {
  Image,
  LayoutDashboard,
  LogOut,
  Package,
  ShoppingBag,
  Store,
  Tags,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import logo from "../assets/logo.png";
import useAuthStore from "../store/authStore";

const links = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard },
  { to: "/admin/products", label: "Products", icon: Package },
  { to: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { to: "/admin/categories", label: "Categories", icon: Tags },
  { to: "/admin/banners", label: "Banners", icon: Image },
];

export default function AdminSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  return (
    <aside className="sticky top-0 z-30 flex h-auto w-full shrink-0 flex-col bg-stone-950 p-3 text-stone-100 sm:p-4 md:h-screen md:w-64 md:p-5">
      <Link
        to="/admin"
        className="group mb-3 flex items-center justify-center gap-3 text-lg font-serif tracking-wide text-amber-200 transition hover:text-white md:mb-10 md:flex-col md:gap-1"
      >
        <img
          src={logo}
          alt="Zahra's Abaya Creation"
          className="h-10 w-auto object-contain transition-transform duration-300 group-hover:scale-105 md:h-16"
        />

        <span className="mt-1 block text-[9px] uppercase tracking-[.16em] text-stone-400 sm:text-[10px] md:tracking-[.24em]">
          Store administration
        </span>
      </Link>
      <nav className="-mx-1 flex gap-1 overflow-x-auto pb-1 md:mx-0 md:flex-col md:space-y-1 md:overflow-visible md:pb-0">
        {links.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={`flex shrink-0 items-center gap-2 rounded px-3 py-2.5 text-xs transition sm:gap-3 sm:text-sm md:py-3 ${location.pathname === to || (to !== "/admin" && location.pathname.startsWith(to)) ? "bg-amber-100/10 text-amber-200" : "text-stone-300 hover:bg-white/5 hover:text-white"}`}
          >
            <Icon size={17} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="mt-2 flex shrink-0 justify-end gap-1 border-t border-white/10 pt-2 md:mt-auto md:flex-col md:justify-start md:gap-0 md:border-0 md:pt-0 md:space-y-1">
        <Link
          to="/"
          className="flex items-center gap-2 px-3 py-2 text-xs text-stone-300 hover:text-white sm:text-sm md:gap-3 md:px-3 md:py-3"
        >
          <Store size={17} />
          View storefront
        </Link>
        <button
          onClick={async () => {
            await logout();
            navigate("/admin/login");
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs text-stone-300 hover:text-white sm:text-sm md:w-full md:gap-3 md:px-3 md:py-3"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
