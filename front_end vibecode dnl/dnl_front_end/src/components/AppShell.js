"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Navbar from "./Navbar";
import { getStoredToken, getStoredUser } from "../utils/api";

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const isPublicSigningRoute = typeof pathname === "string" && pathname.startsWith("/sign/");
    const isLoginRoute = pathname === "/login";
    const isAccessRoute = pathname === "/forbidden" || pathname === "/unauthorized";

    if (isPublicSigningRoute || isLoginRoute || isAccessRoute) {
      setReady(true);
      return;
    }

    const token = getStoredToken();
    if (!token) {
      router.replace("/login");
      return;
    }

    const me = getStoredUser();
    const role = String(me?.role || "").toLowerCase();

    const isAllowedForRole = () => {
      if (!pathname) return true;
      if (role === "admin") return true;

      // Dispatcher: home + loads + load management only.
      if (role === "dispatcher") {
        return pathname === "/" || pathname.startsWith("/loads") || pathname.startsWith("/load_managment");
      }

      // Sales agent: drivers only (kept for consistency with earlier requirements).
      if (role === "sales_agent" || role === "salesagent" || role === "sales agent" || role === "sales") {
        return pathname === "/" || pathname.startsWith("/drivers");
      }

      return true;
    };

    if (!isAllowedForRole()) {
      router.replace("/forbidden");
      return;
    }

    setReady(true);
  }, [pathname, router]);

  if (!ready) return null;

  return (
    <>
      <Navbar />
      <main className="p-4 max-w-7xl mx-auto w-full">{children}</main>
    </>
  );
}
