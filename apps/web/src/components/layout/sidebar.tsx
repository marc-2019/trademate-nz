'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Smartphone,
  Menu,
  X,
} from 'lucide-react';

// Web app currently surfaces only the dashboard. Other product features
// (SWMS, invoices, quotes, expenses, job logs, teams, settings) live in
// the mobile app for the beta. Adding nav links to routes whose pages
// don't exist yet gives users 404s on click — strip the nav until those
// pages ship.
const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 py-4 h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 mb-2">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-white font-bold text-sm">BB</span>
        </div>
        <span className="text-lg font-bold text-white">BossBoard</span>
      </div>

      {NAV_ITEMS.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
            isActive(item.href)
              ? 'bg-accent text-white font-semibold'
              : 'text-gray-300 hover:text-white hover:bg-white/10'
          }`}
        >
          <item.icon size={18} />
          {item.label}
        </Link>
      ))}

      <div className="mt-auto px-3 py-4">
        <div className="rounded-lg bg-white/5 p-3 text-xs text-gray-300 leading-snug">
          <div className="flex items-center gap-2 text-white font-semibold mb-1">
            <Smartphone size={14} />
            Get the mobile app
          </div>
          <p className="text-gray-400">
            SWMS, invoices, quotes, jobs and teams live in the BossBoard mobile app.
            App Store + Google Play release coming soon.
          </p>
        </div>
      </div>
    </nav>
  );

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-primary text-white shadow-lg"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-primary z-40 transition-transform lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {navContent}
      </aside>
    </>
  );
}
