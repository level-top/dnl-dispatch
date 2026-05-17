"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { clearStoredAuth, getStoredUser } from '../utils/api';

const DEFAULT_LOGO_SRC = '/DNL_logo.png';

function NavIcon({ kind, className = 'w-4 h-4' }) {
  const props = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.9,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
    className,
    'aria-hidden': 'true',
  };

  switch (kind) {
    case 'users':
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
          <circle cx="9.5" cy="7" r="3" />
          <path d="M20 8v6" />
          <path d="M23 11h-6" />
        </svg>
      );
    case 'loads':
      return (
        <svg {...props}>
          <path d="M3 7h11v8H3z" />
          <path d="M14 10h3l4 3v2h-7z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="18.5" cy="17.5" r="1.5" />
        </svg>
      );
    case 'drivers':
      return (
        <svg {...props}>
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    case 'assignments':
      return (
        <svg {...props}>
          <path d="M9 5h11" />
          <path d="M9 12h11" />
          <path d="M9 19h11" />
          <path d="M4 5h.01" />
          <path d="M4 12h.01" />
          <path d="M4 19h.01" />
        </svg>
      );
    case 'management':
      return (
        <svg {...props}>
          <path d="M12 3v18" />
          <path d="M17 8l-5-5-5 5" />
          <path d="M7 16l5 5 5-5" />
        </svg>
      );
    case 'invoices':
      return (
        <svg {...props}>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v5h5" />
          <path d="M10 13h6" />
          <path d="M10 17h4" />
        </svg>
      );
    default:
      return null;
  }
}

function isRouteActive(pathname, href) {
  if (!pathname) return false;
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function AppNavLink({ href, children, icon, pathname }) {
  const active = isRouteActive(pathname, href);

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${active
        ? 'bg-blue-600 text-white shadow-[0_12px_28px_-18px_rgba(37,99,235,0.95)]'
        : 'text-slate-600 hover:bg-white hover:text-slate-900'
        }`}
    >
      <NavIcon kind={icon} className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );
}

export default function Navbar() {
  const [me, setMe] = useState(() => getStoredUser());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const isPublicSigningRoute = typeof pathname === 'string' && pathname.startsWith('/sign/');

  useEffect(() => {
    // Keep navbar in sync after login/logout and on navigation.
    setMe(getStoredUser());
    setUserMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onAuthChanged = () => {
      setMe(getStoredUser());
      setUserMenuOpen(false);
    };

    window.addEventListener('dnl-auth-changed', onAuthChanged);
    window.addEventListener('storage', onAuthChanged);
    return () => {
      window.removeEventListener('dnl-auth-changed', onAuthChanged);
      window.removeEventListener('storage', onAuthChanged);
    };
  }, []);

  useEffect(() => {
    if (!userMenuOpen) return;

    const onMouseDown = (e) => {
      const root = userMenuRef.current;
      if (!root) return;
      if (root.contains(e.target)) return;
      setUserMenuOpen(false);
    };

    const onKeyDown = (e) => {
      if (e.key === 'Escape') setUserMenuOpen(false);
    };

    document.addEventListener('mousedown', onMouseDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [userMenuOpen]);

  if (isPublicSigningRoute) {
    return (
      <nav className="sticky top-0 z-50 mx-auto mt-3 mb-6 flex max-w-7xl items-center justify-between rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.78)] px-5 py-3 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
        <div className="flex items-center gap-3" aria-label="Drive Now Logistics">
          <span
            className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-md"
          >
            <Image
              src={DEFAULT_LOGO_SRC}
              alt="Company Logo"
              width={42}
              height={42}
              className="w-10 h-10 object-contain"
              unoptimized
            />
          </span>
          <div>
            <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Dispatch OS</div>
            <span className="font-semibold text-lg text-slate-900 tracking-wide">Drive Now Logistics</span>
          </div>
        </div>
        <div className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm font-medium text-slate-600">Agreement Signing</div>
      </nav>
    );
  }

  const role = String(me?.role || '').toLowerCase();
  const isAuthed = !!me?.id;
  const isAdmin = role === 'admin';
  const isDispatcher = role === 'dispatcher';
  const isSalesAgent = role === 'sales_agent' || role === 'salesagent' || role === 'sales agent' || role === 'sales';

  const canSeeUsers = isAdmin;
  const canSeeAssignments = isAdmin;
  const canSeeInvoices = isAdmin;
  const canSeeLoads = isAdmin || isDispatcher;
  const canSeeDrivers = isAdmin || isSalesAgent;
  const canSeeLoadManagement = isAdmin || isDispatcher;

  const onLogout = () => {
    clearStoredAuth();
    setMe(null);
    setUserMenuOpen(false);
    router.replace('/login');
  };

  const displayName = String(me?.name || me?.userName || 'User');
  const displayUserName = String(me?.userName || '');
  const displayRole = String(me?.role || '').toLowerCase() || 'user';

  return (
    <nav className="sticky top-0 z-50 mx-auto mt-3 mb-6 flex max-w-7xl items-center justify-between rounded-[24px] border border-white/70 bg-[rgba(255,255,255,0.78)] px-5 py-3 shadow-[0_22px_60px_-36px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <Link href="/" className="flex items-center gap-3" aria-label="Home">
        <span
          className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 shadow-md"
        >
          <Image
            src={DEFAULT_LOGO_SRC}
            alt="Company Logo"
            width={42}
            height={42}
            className="w-10 h-10 object-contain"
            unoptimized
          />
        </span>
        <div>
          <div className="text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-blue-600">Dispatch OS</div>
          <span className="font-semibold text-lg text-slate-900 tracking-wide">Drive Now Logistics</span>
        </div>
      </Link>
      <div className="flex items-center gap-2 md:gap-3">
        {canSeeUsers ? (
          <AppNavLink href="/users" icon="users" pathname={pathname}>Users</AppNavLink>
        ) : null}
        {canSeeLoads ? (
          <AppNavLink href="/loads" icon="loads" pathname={pathname}>Loads</AppNavLink>
        ) : null}
        {canSeeDrivers ? (
          <AppNavLink href="/drivers" icon="drivers" pathname={pathname}>Drivers</AppNavLink>
        ) : null}
        {canSeeAssignments ? (
          <AppNavLink href="/assignments" icon="assignments" pathname={pathname}>Assignments</AppNavLink>
        ) : null}
        {canSeeLoadManagement ? (
          <AppNavLink href="/load_managment" icon="management" pathname={pathname}>Load Management</AppNavLink>
        ) : null}
        {canSeeInvoices ? (
          <AppNavLink href="/invoices" icon="invoices" pathname={pathname}>Invoices</AppNavLink>
        ) : null}

        {isAuthed ? (
          <div
            ref={userMenuRef}
            className="relative"
          >
            <button
              type="button"
              onClick={() => setUserMenuOpen((v) => !v)}
              aria-haspopup="menu"
              aria-expanded={userMenuOpen ? 'true' : 'false'}
              className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:border-blue-200 hover:text-blue-700"
              title="Account"
            >
              <span className="sr-only">Open user menu</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path
                  fillRule="evenodd"
                  d="M12 2.25a4.5 4.5 0 0 0-4.5 4.5v.75A4.5 4.5 0 0 0 12 12a4.5 4.5 0 0 0 4.5-4.5v-.75a4.5 4.5 0 0 0-4.5-4.5ZM6 19.5A6 6 0 0 1 12 13.5a6 6 0 0 1 6 6 .75.75 0 0 1-.75.75H6.75A.75.75 0 0 1 6 19.5Z"
                  clipRule="evenodd"
                />
              </svg>
            </button>

            {userMenuOpen ? (
              <div
                role="menu"
                aria-label="User menu"
                className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_24px_60px_-40px_rgba(15,23,42,0.6)]"
              >
                <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-4 py-3">
                  <div className="truncate text-sm font-semibold text-slate-900">{displayName}</div>
                  <div className="truncate text-xs text-slate-500">{displayUserName ? `@${displayUserName}` : ''}</div>
                  <div className="mt-2 inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                    {displayRole}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    role="menuitem"
                    className="w-full rounded-xl px-3 py-2 text-left font-semibold text-slate-700 hover:bg-red-50 hover:text-red-700"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="rounded-xl border border-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-white hover:text-blue-700">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
