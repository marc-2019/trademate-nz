'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  HardHat,
  Award,
  Wallet,
  FileText,
  Receipt,
  Clock,
  Users,
  Settings,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Work (SWMS)', href: '/swms', icon: HardHat },
  { label: 'Certifications', href: '/certifications', icon: Award },
  {
    label: 'Money',
    icon: Wallet,
    children: [
      { label: 'Invoices', href: '/invoices', icon: FileText },
      { label: 'Quotes', href: '/quotes', icon: FileText },
      { label: 'Expenses', href: '/expenses', icon: Receipt },
      { label: 'Job Logs', href: '/job-logs', icon: Clock },
    ],
  },
  { label: 'Teams', href: '/teams', icon: Users },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [moneyOpen, setMoneyOpen] = useState(
    ['/invoices', '/quotes', '/expenses', '/job-logs'].some(p => pathname.startsWith(p)),
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const navContent = (
    <nav className="flex flex-col gap-1 px-3 py-4">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 py-4 mb-2">
        <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
          <span className="text-white font-bold text-sm">BB</span>
        </div>
        <span className="text-lg font-bold text-white">BossBoard</span>
      </div>

      {NAV_ITEMS.map((item) => {
        if ('children' in item) {
          return (
            <div key={item.label}>
              <button
                onClick={() => setMoneyOpen(!moneyOpen)}
                className="flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              >
                <span className="flex items-center gap-3">
                  <item.icon size={18} />
                  {item.label}
                </span>
                <ChevronDown size={16} className={`transition-transform ${moneyOpen ? 'rotate-180' : ''}`} />
              </button>
              {moneyOpen && (
                <div className="ml-4 mt-1 flex flex-col gap-0.5">
                  {item.children!.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                        isActive(child.href)
                          ? 'bg-accent text-white font-semibold'
                          : 'text-gray-400 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      <child.icon size={16} />
                      {child.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        }

        return (
          <Link
            key={item.href}
            href={item.href!}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive(item.href!)
                ? 'bg-accent text-white font-semibold'
                : 'text-gray-300 hover:text-white hover:bg-white/10'
            }`}
          >
            <item.icon size={18} />
            {item.label}
          </Link>
        );
      })}
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
