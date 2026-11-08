import {
  ChevronDown,
  LogOut,
  Menu,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
  X,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../assets/logo.png";
import useAuthStore from "../store/authStore";
import useCartStore from "../store/cartStore";
import { useState } from "react";

export default function Navbar() {
  const { user, logout } = useAuthStore();

  // ✅ FIX: Use the store's built-in getTotalItems() which correctly sums 'quantity'
  const count = useCartStore((s) => s.getTotalItems());

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setUserDropdownOpen(false);
    setMobileMenuOpen(false);
    navigate("/login");
  };

  return (
    <header className="font-serif sticky top-0 z-50 bg-stone-950 backdrop-blur-md border-b border-stone-800 transition-all text-stone-100">
      {/* ----------------- TOP ANNOUNCEMENT BAR ----------------- */}
      <div className="bg-black text-stone-300 text-[11px] py-1.5 px-4 text-center font-light tracking-widest uppercase flex items-center justify-center gap-2 border-b border-stone-900">
        <Sparkles className="w-3 h-3 text-amber-300" />
        <span>ZAHRA'S ABAYA CREATION</span>
      </div>

      {/* ----------------- MAIN NAVIGATION BAR ----------------- */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* 1. Brand Logo (Strictly Left) */}
          <Link to="/" className="flex items-center gap-3 group shrink-0">
            <img
              src={logo}
              alt="Zahra's Abaya Creation"
              className="h-16 w-auto object-contain transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* 2. Everything Else (Right Side) */}
          <div className="flex items-center gap-4 md:gap-8">
            {/* Navigation Links (Desktop Only) */}
            <nav className="hidden md:flex items-center gap-6 lg:gap-8">
              <Link
                to="/"
                className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 transition-colors"
              >
                Home
              </Link>
              <Link
                to="/products"
                className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 transition-colors"
              >
                All Collection
              </Link>
              <Link
                to="/products?category=Abaya"
                className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 transition-colors"
              >
                Abaya
              </Link>
              <Link
                to="/products?category=Hijab"
                className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 transition-colors"
              >
                Hijab
              </Link>
              <Link
                to="/about-us"
                className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 transition-colors"
              >
                About Us
              </Link>
            </nav>

            {/* Right Action Icons (Cart, User, Mobile Menu) */}
            <div className="flex items-center gap-3 sm:gap-4">
              {/* Cart Icon */}
              <Link
                to="/cart"
                className="relative p-2 text-stone-200 hover:text-amber-300 transition-colors group"
                aria-label="Shopping Cart"
              >
                <ShoppingBag className="w-5 h-5 stroke-[1.5]" />
                {user && count > 0 && (
                  <span className="absolute top-1 right-0 bg-amber-600 text-white text-[10px] font-semibold w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {count}
                  </span>
                )}
              </Link>

              {/* Auth / Account Controls */}
              {user ? (
                <div className="relative">
                  <button
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-full hover:bg-stone-900 transition-colors text-stone-200 focus:outline-none"
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-900/40 text-amber-200 border border-amber-500/30 flex items-center justify-center text-xs font-serif font-medium">
                      {user.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                    <span className="hidden lg:inline text-xs font-medium text-stone-200 max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <ChevronDown className="w-3.5 h-3.5 text-stone-400 hidden lg:inline" />
                  </button>

                  {/* Account Dropdown Menu */}
                  {userDropdownOpen && (
                    <div
                      className="absolute right-0 mt-3 w-56 bg-stone-900 border border-stone-800 shadow-2xl rounded-sm py-2 z-50 text-stone-200"
                      onMouseLeave={() => setUserDropdownOpen(false)}
                    >
                      <div className="px-4 py-2 border-b border-stone-800">
                        <p className="text-xs font-semibold text-stone-100">
                          {user.name}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">
                          {user.email || user.phone}
                        </p>
                      </div>

                      {user.role === "admin" && (
                        <Link
                          to="/admin"
                          onClick={() => setUserDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-amber-300 font-medium hover:bg-stone-800 transition-colors"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          <span>Admin Dashboard</span>
                        </Link>
                      )}

                      <Link
                        to="/profile"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-300 hover:bg-stone-800 transition-colors"
                      >
                        <User className="w-4 h-4 text-stone-400" />
                        <span>My Profile</span>
                      </Link>

                      <Link
                        to="/orders"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2.5 px-4 py-2.5 text-xs text-stone-300 hover:bg-stone-800 transition-colors"
                      >
                        <ShoppingBag className="w-4 h-4 text-stone-400" />
                        <span>Order History</span>
                      </Link>

                      <button
                        onClick={handleLogout}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs text-rose-400 hover:bg-rose-950/30 transition-colors text-left border-t border-stone-800 mt-1"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-3">
                  <Link
                    to="/login"
                    className="text-xs font-medium uppercase tracking-widest text-stone-300 hover:text-amber-300 px-3 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="text-xs font-medium uppercase tracking-widest bg-amber-200 text-stone-950 hover:bg-amber-300 px-4 py-2.5 rounded-none transition-all shadow-sm font-semibold"
                  >
                    Register
                  </Link>
                </div>
              )}

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-stone-300 hover:text-amber-200 focus:outline-none"
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-6 h-6" />
                ) : (
                  <Menu className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ----------------- MOBILE DRAWER MENU ----------------- */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-stone-800 bg-stone-950 px-6 py-6 space-y-4 shadow-2xl">
          <nav className="flex flex-col gap-4">
            <Link
              to="/"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
            >
              Home
            </Link>
            <Link
              to="/products"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
            >
              All Products
            </Link>
            <Link
              to="/products?category=Abaya"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
            >
              Abaya Collection
            </Link>
            <Link
              to="/products?category=Hijab"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
            >
              Hijabs & Scarves
            </Link>
            <Link
              to="/products?category=Kaftan"
              onClick={() => setMobileMenuOpen(false)}
              className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
            >
              Kaftans
            </Link>
          </nav>

          {user && (
            <div className="border-t border-stone-800 pt-4 flex flex-col gap-4">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
              >
                My Profile
              </Link>
              <Link
                to="/orders"
                onClick={() => setMobileMenuOpen(false)}
                className="text-sm font-medium uppercase tracking-wider text-stone-200 hover:text-amber-300"
              >
                Order History
              </Link>
            </div>
          )}

          {!user && (
            <div className="pt-4 border-t border-stone-800 flex flex-col gap-2">
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-medium uppercase tracking-widest border border-stone-700 text-stone-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center py-2.5 text-xs font-medium uppercase tracking-widest bg-amber-200 text-stone-950 font-semibold"
              >
                Create Account
              </Link>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
