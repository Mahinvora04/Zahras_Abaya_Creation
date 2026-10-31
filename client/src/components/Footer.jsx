import { FaFacebookF, FaInstagram, FaTwitter } from "react-icons/fa";
import { Mail, MapPin, Phone } from "lucide-react";

import { Link } from "react-router-dom";
import logo from "../assets/logo.png";

export default function Footer() {

  return (
    <footer className="bg-stone-950 text-stone-300 border-t border-stone-900 font-serif">

      {/* ----------------- MAIN FOOTER LINKS ----------------- */}
      <div className="max-w-7xl mx-auto px-6 py-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
        {/* Brand Column */} 
        <div className="space-y-5">
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logo}
              alt="Zahra's Abaya Creation"
              className="h-16 w-auto object-contain"
            />
          </Link>
          <p className="text-sm text-stone-400 leading-relaxed">
            Redefining modest fashion with timeless elegance. Every piece is
            crafted with premium fabrics and meticulous attention to detail.
          </p>
          <div className="flex items-center gap-4 pt-2">
            <a
              href="#"
              className="p-2 rounded-full bg-stone-900 text-stone-400 hover:bg-amber-900/30 hover:text-amber-300 transition-all"
            >
              <FaInstagram className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-stone-900 text-stone-400 hover:bg-amber-900/30 hover:text-amber-300 transition-all"
            >
              <FaFacebookF className="w-4 h-4" />
            </a>
            <a
              href="#"
              className="p-2 rounded-full bg-stone-900 text-stone-400 hover:bg-amber-900/30 hover:text-amber-300 transition-all"
            >
              <FaTwitter className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-200 mb-6">
            Quick Links
          </h4>
          <ul className="space-y-3">
            {[
              { label: "Home", path: "/" },
              { label: "Shop All", path: "/products" },
              { label: "Abaya Collection", path: "/products?category=Abaya" },
              { label: "Hijabs & Scarves", path: "/products?category=Hijab" },
              { label: "Kaftans", path: "/products?category=Kaftan" },
            ].map((link) => (
              <li key={link.label}>
                <Link
                  to={link.path}
                  className="text-sm text-stone-400 hover:text-amber-300 transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Contact Info */}
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-widest text-amber-200 mb-6">
            Get In Touch
          </h4>
          <ul className="space-y-4">
            <li className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-amber-300 mt-1 shrink-0" />
              <span className="text-sm text-stone-400">
                33, GF, Seventh Heaven Complex, Opp Al-Burooj Tower, Sonal-Makraba Road, Ahmedabad - 51
              </span>
            </li>
            <li className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-amber-300 shrink-0" />
              <a
                href="tel:+971501234567"
                className="text-sm text-stone-400 hover:text-amber-300 transition-colors"
              >
                +91 97243 73153
              </a>
            </li>
            <li className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-amber-300 shrink-0" />
              <a
                href="mailto:care@zahraabaya.com"
                className="text-sm text-stone-400 hover:text-amber-300 transition-colors"
              >
                care@zahraabaya.com
              </a>
            </li>
          </ul>
        </div>
      </div>

      {/* ----------------- BOTTOM BAR ----------------- */}
      <div className="border-t border-stone-900 bg-black py-6">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-stone-500">
            &copy; {new Date().getFullYear()} Zahra's Abaya Creation. All rights
            reserved.
          </p>

          {/* Payment Icons (Text based for simplicity, or use SVGs) */}
          <div className="flex items-center gap-4 text-xs text-stone-500 font-medium tracking-wider">
           <Link to="/about-us" className="flex items-center gap-3">
            <span>ABOUT US</span>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
