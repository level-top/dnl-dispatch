"use client";

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Image from 'next/image';
import { clearStoredAuth, getStoredUser, getCompanyDetails } from '../utils/api';

export default function Navbar() {
  const [logoUrl, setLogoUrl] = useState("");
  const [me, setMe] = useState(() => getStoredUser());
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);
  const pathname = usePathname();
  const router = useRouter();

  const isPublicSigningRoute = typeof pathname === 'string' && pathname.startsWith('/sign/');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const companies = await getCompanyDetails();
        const firstCompany = Array.isArray(companies) ? companies[0] : null;
        if (!cancelled) setLogoUrl(firstCompany?.LogoURL || "");
      } catch {
        // Ignore errors; fallback logo will be used.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

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
      <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 shadow-lg rounded-b-2xl mx-auto max-w-7xl mt-2 mb-6 px-4 py-3 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-3" aria-label="Drive Now Logistics">
          <span
            className={`${logoUrl ? "bg-white" : "bg-blue-900"} rounded-full w-9 h-9 flex items-center justify-center shadow-md border border-gray-200 overflow-hidden`}
          >
            <Image
              src={logoUrl || "/DNL_logo.png"}
              alt="Company Logo"
              width={32}
              height={32}
              className="w-8 h-8 object-contain"
              unoptimized
              onError={() => setLogoUrl("")}
            />
          </span>
          <span className="font-semibold text-lg text-blue-900 tracking-wide">Drive Now Logistics</span>
        </div>
        <div className="text-sm font-medium text-gray-600">Agreement Signing</div>
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
    <nav className="bg-white/90 backdrop-blur sticky top-0 z-50 shadow-lg rounded-b-2xl mx-auto max-w-7xl mt-2 mb-6 px-4 py-3 flex items-center justify-between border-b border-gray-200">
      <Link href="/" className="flex items-center gap-3" aria-label="Home">
        <span
          className={`${logoUrl ? "bg-white" : "bg-blue-900"} rounded-full w-9 h-9 flex items-center justify-center shadow-md border border-gray-200 overflow-hidden`}
        >
          <Image
            src={logoUrl || "/DNL_logo.png"}
            alt="Company Logo"
            width={32}
            height={32}
            className="w-8 h-8 object-contain"
			unoptimized
			onError={() => setLogoUrl("")}
          />
        </span>
        <span className="font-semibold text-lg text-blue-900 tracking-wide">Drive Now Logistics</span>
      </Link>
      <div className="flex items-center gap-2 md:gap-4">
        {canSeeUsers ? (
          <Link href="/users" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Users</Link>
        ) : null}
        {canSeeLoads ? (
          <Link href="/loads" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Loads</Link>
        ) : null}
        {canSeeDrivers ? (
          <Link href="/drivers" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Drivers</Link>
        ) : null}
        {canSeeAssignments ? (
          <Link href="/assignments" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Assignments</Link>
        ) : null}
        {canSeeLoadManagement ? (
          <Link href="/load_managment" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Load Management</Link>
        ) : null}
        {canSeeInvoices ? (
          <Link href="/invoices" className="px-3 py-2 rounded-lg font-medium text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition">Invoices</Link>
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
              className="inline-flex items-center justify-center w-10 h-10 rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm"
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
                className="absolute right-0 mt-2 w-64 rounded-xl border border-gray-200 bg-white shadow-xl overflow-hidden"
              >
                <div className="px-4 py-3 bg-gray-50">
                  <div className="text-sm font-semibold text-gray-900 truncate">{displayName}</div>
                  <div className="text-xs text-gray-600 truncate">{displayUserName ? `@${displayUserName}` : ''}</div>
                  <div className="mt-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                    {displayRole}
                  </div>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    onClick={onLogout}
                    role="menuitem"
                    className="w-full text-left px-3 py-2 rounded-lg font-semibold text-gray-700 hover:bg-red-50 hover:text-red-700 transition"
                  >
                    Logout
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="px-3 py-2 rounded-lg font-semibold text-gray-700 hover:bg-blue-50 hover:text-blue-700 transition border border-gray-200">
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
