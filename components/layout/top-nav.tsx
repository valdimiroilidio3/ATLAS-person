'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Command, Menu, Search, X, type LucideIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { NAV_ITEMS } from '@/lib/atlas/constants';
import { useAtlas } from '@/lib/atlas/store';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { UserMenu } from './user-menu';

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const active = href === '/' ? pathname === '/' : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      title={label}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-[13px] transition-colors',
        active ? 'text-text bg-white/[0.07]' : 'text-text-2 hover:text-text hover:bg-white/[0.04]',
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden xl:inline">{label}</span>
    </Link>
  );
}

export function TopNav() {
  const { state, ui, toggleCommandPalette, openApprovalCenter } = useAtlas();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pendingApprovals = state.approvals.filter((a) => a.status === 'pending').length;

  return (
    <header className="sticky top-0 z-[60] border-b border-border bg-bg/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-shell items-center gap-2 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="mr-1 flex items-center rounded-lg outline-none">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="ml-2 hidden items-center gap-0.5 md:flex">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.href} {...item} />
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            onClick={toggleCommandPalette}
            aria-label="Open command bar"
            className="hidden h-8 items-center gap-2 rounded-lg border border-border bg-surface px-2.5 text-xs text-text-3 transition-colors hover:border-border-strong hover:text-text-2 sm:inline-flex"
          >
            <Search className="h-3.5 w-3.5" />
            <span>Search</span>
            <span className="ml-1 inline-flex items-center gap-0.5 rounded border border-border bg-surface2 px-1 py-px font-mono text-[10px]">
              <Command className="h-2.5 w-2.5" />K
            </span>
          </button>

          <button
            onClick={toggleCommandPalette}
            aria-label="Open command bar"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-white/[0.05] hover:text-text sm:hidden"
          >
            <Search className="h-4 w-4" />
          </button>

          <button
            onClick={openApprovalCenter}
            aria-label={`Approvals${pendingApprovals ? `, ${pendingApprovals} pending` : ''}`}
            className={cn(
              'relative inline-flex h-8 w-8 items-center justify-center rounded-lg transition-colors hover:bg-white/[0.05]',
              pendingApprovals > 0 ? 'text-warning' : 'text-text-2 hover:text-text',
            )}
          >
            <Bell className="h-4 w-4" />
            {pendingApprovals > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-warning px-1 font-mono text-[9px] font-medium text-[#171004]">
                {pendingApprovals}
              </span>
            )}
          </button>

          <div className="ml-1 hidden md:block">
            <UserMenu />
          </div>

          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label="Menu"
            aria-expanded={mobileOpen}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-white/[0.05] hover:text-text md:hidden"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            aria-label="Mobile"
            className="overflow-hidden border-t border-border md:hidden"
          >
            <div className="mx-auto max-w-shell space-y-1 px-4 py-3">
              {NAV_ITEMS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-text-2 hover:bg-white/[0.04] hover:text-text"
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex items-center justify-between px-3">
                <UserMenu />
              </div>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
