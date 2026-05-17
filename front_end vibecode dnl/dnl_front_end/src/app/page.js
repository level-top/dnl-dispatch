"use client";
import Image from "next/image";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { getAllInvoices, getCompanyDetails, getDrivers, getLoads, getStoredUser, getUsers } from "../utils/api";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const PERIODS = [
  { key: "daily", label: "Daily", days: 1 },
  { key: "weekly", label: "Weekly", days: 7 },
  { key: "monthly", label: "Monthly", days: 30 },
  { key: "yearly", label: "Yearly", days: 365 },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toYMD(date) {
  const d = new Date(date);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatMoney(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function sum(numbers) {
  return numbers.reduce((acc, n) => acc + (Number(n) || 0), 0);
}

function normalizeId(value) {
  return value === null || value === undefined ? "" : String(value);
}

function getCommissionPercent(load, driver) {
  const override = parseFloat(load?.commission_rate_override);
  if (!Number.isNaN(override) && override > 0) return override;
  const driverPerc = parseFloat(driver?.percentage);
  if (!Number.isNaN(driverPerc) && driverPerc > 0) return driverPerc;
  return null;
}

function getCompanyRevenue(load, driver) {
  const netAmount = parseFloat(load?.netAmount);
  if (!Number.isNaN(netAmount)) return netAmount;
  const amt = parseFloat(load?.loadAmount);
  const perc = getCommissionPercent(load, driver);
  if (!Number.isNaN(amt) && perc !== null) return (amt * perc) / 100;
  return 0;
}

function DashboardIcon({ kind, className = "h-5 w-5" }) {
  const props = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    className,
    "aria-hidden": "true",
  };

  switch (kind) {
    case "overview":
      return (
        <svg {...props}>
          <path d="M4 19h16" />
          <path d="M7 15V9" />
          <path d="M12 15V5" />
          <path d="M17 15v-3" />
        </svg>
      );
    case "orders":
      return (
        <svg {...props}>
          <path d="M3 7h11v8H3z" />
          <path d="M14 10h3l4 3v2h-7z" />
          <circle cx="7.5" cy="17.5" r="1.5" />
          <circle cx="18.5" cy="17.5" r="1.5" />
        </svg>
      );
    case "revenue":
      return (
        <svg {...props}>
          <path d="M12 2v20" />
          <path d="M17 6.5c0-1.9-2.2-3.5-5-3.5s-5 1.6-5 3.5 2.2 3.5 5 3.5 5 1.6 5 3.5-2.2 3.5-5 3.5-5-1.6-5-3.5" />
        </svg>
      );
    case "invoice":
      return (
        <svg {...props}>
          <path d="M7 3h8l4 4v14H7z" />
          <path d="M15 3v5h5" />
          <path d="M10 13h6" />
          <path d="M10 17h4" />
        </svg>
      );
    case "payment":
      return (
        <svg {...props}>
          <path d="M3 8h18" />
          <path d="M5 5h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z" />
          <path d="M16 15h.01" />
          <path d="M7 15h3" />
        </svg>
      );
    case "drivers":
      return (
        <svg {...props}>
          <circle cx="12" cy="7" r="3.5" />
          <path d="M5 20a7 7 0 0 1 14 0" />
        </svg>
      );
    default:
      return null;
  }
}

export default function Home() {
  const [me] = useState(() => getStoredUser());
  const role = String(me?.role || "").toLowerCase();
  const isDispatcher = role === "dispatcher";
  const isSalesAgent = role === "sales" || role === "sales_agent" || role === "salesagent" || role === "sales agent";

  const [periodKey, setPeriodKey] = useState("yearly");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [loads, setLoads] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [users, setUsers] = useState([]);
  const [companyLogoUrl, setCompanyLogoUrl] = useState("");
  const [companyName, setCompanyName] = useState("Drive Now Logistics");

  const [filterDriver, setFilterDriver] = useState("");
  const [filterDispatcher, setFilterDispatcher] = useState(() => (isDispatcher ? String(me?.id || "") : ""));

  const visibleDriverIds = useMemo(() => {
    return new Set(drivers.map((d) => normalizeId(d?.id)));
  }, [drivers]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const tasks = [
          getLoads(),
          getCompanyDetails(),
          getDrivers(),
          getAllInvoices(),
          ...(role === "admin" ? [getUsers()] : []),
        ];

        const results = await Promise.all(tasks);
        const loadsData = results[0];
        const companies = results[1];
        const driversData = results[2];
        const invoicesData = results[3];
        const usersData = role === "admin" ? results[results.length - 1] : [];

        if (cancelled) return;
        setLoads(Array.isArray(loadsData) ? loadsData : []);
        setInvoices(Array.isArray(invoicesData) ? invoicesData : []);
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setUsers(Array.isArray(usersData) ? usersData : []);

        const firstCompany = Array.isArray(companies) ? companies[0] : null;
        setCompanyLogoUrl(firstCompany?.LogoURL || "");
        setCompanyName(firstCompany?.CompanyName || "Drive Now Logistics");
        setError("");
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load dashboard data");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isDispatcher, role]);

  useEffect(() => {
    if (!isDispatcher) return;
    const myId = String(me?.id || "");
    if (!myId) return;
    setFilterDispatcher(myId);
  }, [isDispatcher, me?.id]);

  const dispatchers = useMemo(() => {
    return users
      .filter((u) => String(u?.role || "").toLowerCase() === "dispatcher")
      .sort((a, b) => String(a?.name || "").localeCompare(String(b?.name || "")));
  }, [users]);

  const period = useMemo(
    () => PERIODS.find((p) => p.key === periodKey) || PERIODS[1],
    [periodKey]
  );

  const range = useMemo(() => {
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - (period.days - 1));
    return { start: startOfDay(start), end: now };
  }, [period.days]);

  const loadsInRangeAll = useMemo(() => {
    return loads.filter((l) => {
      const t = new Date(l.dateTime || l.pickedUp_dateTime || l.dropOff_dateTime);
      if (Number.isNaN(t.getTime()) || t < range.start || t > range.end) return false;

      const loadDriverId = l.driverId ?? l.driverName;
      if (isSalesAgent && visibleDriverIds.size > 0 && !visibleDriverIds.has(normalizeId(loadDriverId))) return false;
      if (filterDriver && normalizeId(loadDriverId) !== normalizeId(filterDriver)) return false;
      if (isDispatcher) {
        const myId = String(me?.id || "");
        if (myId && normalizeId(l.dispatcherId) !== normalizeId(myId)) return false;
      } else if (filterDispatcher && normalizeId(l.dispatcherId) !== normalizeId(filterDispatcher)) {
        return false;
      }

      return true;
    });
  }, [filterDispatcher, filterDriver, isDispatcher, isSalesAgent, loads, me?.id, range.end, range.start, visibleDriverIds]);

  const dispatcherInProgressByDriver = useMemo(() => {
    if (!isDispatcher) return [];
    const inProgress = loadsInRangeAll.filter((l) => {
      const s = String(l.loadStatus || "").toLowerCase();
      return s === "booked" || s === "pickedup";
    });

    const counts = new Map();
    for (const l of inProgress) {
      const driverId = l.driverId ?? l.driverName;
      const key = normalizeId(driverId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }

    return drivers
      .map((d) => ({
        id: d.id,
        name: d.name,
        count: counts.get(normalizeId(d.id)) || 0,
      }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [drivers, isDispatcher, loadsInRangeAll]);

  // For KPIs/revenue, exclude canceled loads.
  const loadsInRange = useMemo(() => {
    return loadsInRangeAll.filter(
      (l) => String(l.loadStatus || "").toLowerCase() !== "canceled"
    );
  }, [loadsInRangeAll]);

  const invoicesInRange = useMemo(() => {
    const invoiceIdsFromLoads = new Set(
      loadsInRangeAll
        .map((l) => l.invoice_number)
        .filter((v) => v !== null && v !== undefined && String(v).trim() !== "")
        .map((v) => normalizeId(v))
    );

    return invoices.filter((inv) => {
      const t = new Date(inv.InvoiceDate);
      if (Number.isNaN(t.getTime()) || t < range.start || t > range.end) return false;

      if (isSalesAgent && visibleDriverIds.size > 0 && !visibleDriverIds.has(normalizeId(inv.DriverID))) return false;
      if (filterDriver && normalizeId(inv.DriverID) !== normalizeId(filterDriver)) return false;

      // If dispatcher is selected, keep only invoices that have at least one matching load.
      if (filterDispatcher && !invoiceIdsFromLoads.has(normalizeId(inv.InvoiceID))) return false;

      return true;
    });
  }, [filterDispatcher, filterDriver, invoices, isSalesAgent, loadsInRangeAll, range.end, range.start, visibleDriverIds]);

  const kpis = useMemo(() => {
    const deliveredLoads = loadsInRange.filter((l) => String(l.loadStatus || "").toLowerCase() === "delivered");
    const totalLoads = loadsInRange.length;
    const deliveredCount = deliveredLoads.length;
    const totalMiles = sum(loadsInRange.map((l) => l.miles));
    const grossRevenue = sum(loadsInRange.map((l) => l.loadAmount));

    const companyRevenue = sum(
      loadsInRange.map((l) => {
        const driverId = l.driverId ?? l.driverName;
        const driver = drivers.find((d) => normalizeId(d.id) === normalizeId(driverId));
        return getCompanyRevenue(l, driver);
      })
    );

    const pendingInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "pending");
    const partialInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "partial");
    const paidInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "paid");
    const invoiceTotal = sum(invoicesInRange.map((i) => i.TotalAmount));

    const invoicePaidSoFar = (inv) => {
      const v = Number(inv?.TotalPaid);
      if (!Number.isNaN(v)) return v;
      return String(inv?.InvoiceStatus || "").toLowerCase() === "paid" ? (Number(inv?.TotalAmount) || 0) : 0;
    };

    const invoiceBalance = (inv) => {
      const v = Number(inv?.Balance);
      if (!Number.isNaN(v)) return Math.max(0, v);
      const total = Number(inv?.TotalAmount) || 0;
      return Math.max(0, total - invoicePaidSoFar(inv));
    };

    const receivedTotal = sum(invoicesInRange.map(invoicePaidSoFar));
    const receivablesTotal = sum(
      invoicesInRange
        .filter((i) => ["pending", "partial"].includes(String(i.InvoiceStatus || "").toLowerCase()))
        .map(invoiceBalance)
    );

    const openInvoicesCount = invoicesInRange.filter(
      (i) => invoiceBalance(i) > 0 && ["pending", "partial"].includes(String(i.InvoiceStatus || "").toLowerCase())
    ).length;

    const invoicesWithPaymentsCount = invoicesInRange.filter((i) => invoicePaidSoFar(i) > 0).length;

    return {
      totalLoads,
      deliveredCount,
      totalMiles,
      grossRevenue,
      companyRevenue,
      invoiceCount: invoicesInRange.length,
      invoiceTotal,
      paidCount: paidInvoices.length,
      pendingCount: pendingInvoices.length,
      partialCount: partialInvoices.length,
      receivedTotal,
      receivablesTotal,
      openInvoicesCount,
      invoicesWithPaymentsCount,
    };
  }, [drivers, invoicesInRange, loadsInRange]);

  const activeDriversCount = useMemo(() => {
    return drivers.filter((d) => String(d?.status || "inactive").toLowerCase() === "active").length;
  }, [drivers]);

  const orderInvoiceSummary = useMemo(() => {
    const booked = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "booked").length;
    const canceled = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "canceled").length;
    const pickedUp = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "pickedup").length;
    const delivered = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "delivered").length;
    const issue = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "issue").length;
    const deliveredNotInvoiced = loadsInRangeAll.filter((l) => {
      const status = String(l.loadStatus || "").toLowerCase();
      const pay = String(l.payment_status || "").toLowerCase();
      return status === "delivered" && pay === "unpaid";
    }).length;

    const pendingInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "pending").length;
    const paidInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "paid").length;

    return {
      booked,
      canceled,
      pickedUp,
      delivered,
      issue,
      deliveredNotInvoiced,
      pendingInvoices,
      paidInvoices,
    };
  }, [invoicesInRange, loadsInRangeAll]);

  const loadManagementHref = (params = {}) => {
    const search = new URLSearchParams();
    if (periodKey) search.set("period", String(periodKey));
    if (params.status) search.set("status", String(params.status));
    if (params.payment) search.set("payment", String(params.payment));
    const qs = search.toString();
    return qs ? `/load_managment?${qs}` : "/load_managment";
  };

  const invoicesHref = (status) => {
    const search = new URLSearchParams();
    if (status) search.set("status", String(status));
    const qs = search.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };

  const cashPipelineReport = useMemo(() => {
    const paidInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "paid");
    const pendingInvoices = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "pending");

    const deliveredNotInvoicedLoads = loadsInRange.filter((l) => {
      const status = String(l.loadStatus || "").toLowerCase();
      const pay = String(l.payment_status || "").toLowerCase();
      return status === "delivered" && pay === "unpaid";
    });

    const bookedLoads = loadsInRange.filter((l) => String(l.loadStatus || "").toLowerCase() === "booked");
    const canceledLoadsAll = loadsInRangeAll.filter((l) => String(l.loadStatus || "").toLowerCase() === "canceled");

    const loadCompanyAmount = (l) => {
      const driverId = l.driverId ?? l.driverName;
      const driver = drivers.find((d) => normalizeId(d.id) === normalizeId(driverId));
      return getCompanyRevenue(l, driver);
    };

    return {
      paidInvoices: {
        count: paidInvoices.length,
        amount: sum(paidInvoices.map((i) => i.TotalAmount)),
      },
      pendingInvoices: {
        count: pendingInvoices.length,
        amount: sum(pendingInvoices.map((i) => i.TotalAmount)),
      },
      deliveredNotInvoiced: {
        count: deliveredNotInvoicedLoads.length,
        amount: sum(deliveredNotInvoicedLoads.map(loadCompanyAmount)),
      },
      booked: {
        count: bookedLoads.length,
        amount: sum(bookedLoads.map(loadCompanyAmount)),
      },
      canceled: {
        count: canceledLoadsAll.length,
        // Do not count canceled revenue/value.
        amount: 0,
      },
    };
  }, [drivers, invoicesInRange, loadsInRange, loadsInRangeAll]);

  const timeSeries = useMemo(() => {
    if (period.key === "daily") {
      const labels = Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, "0")}:00`);
      const buckets = new Array(24).fill(0);

      for (const l of loadsInRange) {
        const t = new Date(l.dateTime || l.pickedUp_dateTime || l.dropOff_dateTime);
        if (Number.isNaN(t.getTime())) continue;
        const hour = t.getHours();
        const driverId = l.driverId ?? l.driverName;
        const driver = drivers.find((d) => normalizeId(d.id) === normalizeId(driverId));
        buckets[hour] += Number(getCompanyRevenue(l, driver)) || 0;
      }

      return { labels, values: buckets };
    }

    const labels = [];
    const values = [];
    const cursor = new Date(range.start);
    while (cursor <= range.end) {
      const key = toYMD(cursor);
      labels.push(key);
      values.push(0);
      cursor.setDate(cursor.getDate() + 1);
    }

    const indexByKey = new Map(labels.map((k, idx) => [k, idx]));
    for (const l of loadsInRange) {
      const t = new Date(l.dateTime || l.pickedUp_dateTime || l.dropOff_dateTime);
      if (Number.isNaN(t.getTime())) continue;
      const key = toYMD(t);
      const idx = indexByKey.get(key);
      if (idx === undefined) continue;
      const driverId = l.driverId ?? l.driverName;
      const driver = drivers.find((d) => normalizeId(d.id) === normalizeId(driverId));
      values[idx] += Number(getCompanyRevenue(l, driver)) || 0;
    }

    return { labels, values };
  }, [drivers, loadsInRange, period.key, range.end, range.start]);

  const statusBreakdown = useMemo(() => {
    const paid = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "paid").length;
    const pending = invoicesInRange.filter((i) => String(i.InvoiceStatus || "").toLowerCase() === "pending").length;
    const other = Math.max(0, invoicesInRange.length - paid - pending);
    return { paid, pending, other };
  }, [invoicesInRange]);

  const lineData = useMemo(
    () => ({
      labels: timeSeries.labels,
      datasets: [
        {
          label: "Load Revenue",
          data: timeSeries.values,
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.15)",
          tension: 0.3,
          pointRadius: 2,
        },
      ],
    }),
    [timeSeries.labels, timeSeries.values]
  );

  const barData = useMemo(
    () => ({
      labels: ["Loads", "Invoices"],
      datasets: [
        {
          label: "Total",
          data: [kpis.companyRevenue, kpis.invoiceTotal],
          backgroundColor: ["rgba(99, 102, 241, 0.75)", "rgba(16, 185, 129, 0.75)"],
        },
      ],
    }),
    [kpis.companyRevenue, kpis.invoiceTotal]
  );

  const doughnutData = useMemo(
    () => ({
      labels: ["Paid", "Pending", "Other"],
      datasets: [
        {
          data: [statusBreakdown.paid, statusBreakdown.pending, statusBreakdown.other],
          backgroundColor: ["rgba(16, 185, 129, 0.75)", "rgba(245, 158, 11, 0.75)", "rgba(107, 114, 128, 0.55)"],
          borderWidth: 0,
        },
      ],
    }),
    [statusBreakdown.other, statusBreakdown.paid, statusBreakdown.pending]
  );

  const incomeBarData = useMemo(
    () => ({
      labels: [
        "Paid Invoices (Received)",
        "Pending Invoices (Receivables)",
        "Delivered (Not Invoiced)",
        "Booked (Pipeline Value)",
        "Canceled (Pipeline Value)",
      ],
      datasets: [
        {
          label: "Value",
          data: [
            cashPipelineReport.paidInvoices.amount,
            cashPipelineReport.pendingInvoices.amount,
            cashPipelineReport.deliveredNotInvoiced.amount,
            cashPipelineReport.booked.amount,
            cashPipelineReport.canceled.amount,
          ],
          backgroundColor: [
            "rgba(16, 185, 129, 0.75)",
            "rgba(245, 158, 11, 0.75)",
            "rgba(99, 102, 241, 0.75)",
            "rgba(59, 130, 246, 0.75)",
            "rgba(239, 68, 68, 0.75)",
          ],
          borderWidth: 0,
        },
      ],
    }),
    [
      cashPipelineReport.booked.amount,
      cashPipelineReport.canceled.amount,
      cashPipelineReport.deliveredNotInvoiced.amount,
      cashPipelineReport.paidInvoices.amount,
      cashPipelineReport.pendingInvoices.amount,
    ]
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[28px] border border-slate-200/80 bg-[linear-gradient(135deg,rgba(255,255,255,0.96),rgba(239,246,255,0.86))] p-6 shadow-[0_32px_90px_-60px_rgba(15,23,42,0.5)]">
        <div className="absolute inset-y-0 right-0 w-56 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.15),transparent_68%)]" />
        <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <span className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[22px] border border-blue-100 bg-white shadow-md">
                <Image
                  src={companyLogoUrl || "/DNL_logo.png"}
                  alt="Company Logo"
                  width={58}
                  height={58}
                  className="h-14 w-14 object-contain"
                  unoptimized
                  onError={() => setCompanyLogoUrl("")}
                />
              </span>

              <div>
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.22em] text-blue-700">
                  <DashboardIcon kind="overview" className="h-3.5 w-3.5" />
                  Operations Dashboard
                </div>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-950 md:text-4xl">{companyName}</h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600 md:text-base">
                  A unified control center for orders, revenue, invoicing, and driver operations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Reporting Window</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{period.label}</div>
                <div className="text-sm text-slate-500">{toYMD(range.start)} to {toYMD(range.end)}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Orders Snapshot</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{kpis.totalLoads} active records</div>
                <div className="text-sm text-slate-500">Delivered: {kpis.deliveredCount} • Active drivers: {activeDriversCount}</div>
              </div>
              <div className="rounded-2xl border border-white/80 bg-white/75 p-4 shadow-sm backdrop-blur">
                <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cash Position</div>
                <div className="mt-2 text-lg font-semibold text-slate-900">{formatMoney(kpis.receivedTotal)}</div>
                <div className="text-sm text-slate-500">Receivables open: {formatMoney(kpis.receivablesTotal)}</div>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 rounded-2xl border border-white/70 bg-white/75 p-2 shadow-sm backdrop-blur">
            {PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setPeriodKey(p.key)}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${periodKey === p.key
                  ? "bg-blue-600 text-white shadow-[0_18px_35px_-20px_rgba(37,99,235,0.95)]"
                  : "bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-700 shadow-sm">{error}</div>
      )}

      {isSalesAgent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">Active Drivers</div>
                <div className="mt-2 text-3xl font-extrabold text-slate-950">{activeDriversCount}</div>
                <div className="mt-2 text-sm text-slate-500">Read-only</div>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <DashboardIcon kind="drivers" />
              </span>
            </div>
          </div>
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">Payments & Receivables</div>
                <div className="mt-3 space-y-1 text-sm text-slate-600">
                  <div>Received: <span className="font-semibold text-slate-900">{formatMoney(kpis.receivedTotal)}</span></div>
                  <div>Receivables: <span className="font-semibold text-slate-900">{formatMoney(kpis.receivablesTotal)}</span></div>
                </div>
                <div className="mt-2 text-sm text-slate-500">Read-only</div>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                <DashboardIcon kind="payment" />
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-slate-500">Orders</div>
                <div className="mt-2 text-3xl font-extrabold text-slate-950">{kpis.totalLoads}</div>
                <div className="mt-2 text-sm text-slate-500">Delivered: {kpis.deliveredCount}</div>
              </div>
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
                <DashboardIcon kind="orders" />
              </span>
            </div>
          </div>
          {isDispatcher ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Assigned Drivers</div>
                  <div className="mt-2 text-3xl font-extrabold text-slate-950">{drivers.length}</div>
                  <div className="mt-2 text-sm text-slate-500">Based on your assignments</div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-100 text-sky-700">
                  <DashboardIcon kind="drivers" />
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Company Revenue</div>
                  <div className="mt-2 text-3xl font-extrabold text-slate-950">{formatMoney(kpis.companyRevenue)}</div>
                  <div className="mt-2 text-sm text-slate-500">Loads: {kpis.totalLoads || 0}</div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700">
                  <DashboardIcon kind="revenue" />
                </span>
              </div>
            </div>
          )}

          {isDispatcher ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">In-Progress Loads</div>
                  <div className="mt-2 text-3xl font-extrabold text-slate-950">
                    {loadsInRangeAll.filter((l) => {
                      const s = String(l.loadStatus || "").toLowerCase();
                      return s === "booked" || s === "pickedup";
                    }).length}
                  </div>
                  <div className="mt-2 text-sm text-slate-500">Booked + Picked Up</div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                  <DashboardIcon kind="overview" />
                </span>
              </div>
            </div>
          ) : (
            <Link
              href="/invoices"
              className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)] transition hover:-translate-y-0.5 hover:bg-white"
              title="Open invoices"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Invoices</div>
                  <div className="mt-2 text-3xl font-extrabold text-slate-950">{kpis.invoiceCount}</div>
                  <div className="mt-2 text-sm text-slate-500">Total: {formatMoney(kpis.invoiceTotal)}</div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-100 text-cyan-700">
                  <DashboardIcon kind="invoice" />
                </span>
              </div>
            </Link>
          )}

          {isDispatcher ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Dispatcher</div>
                  <div className="mt-2 truncate text-xl font-extrabold text-slate-950">{String(me?.name || me?.userName || "You")}</div>
                  <div className="mt-2 text-sm text-slate-500">Dashboard scoped to your loads</div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                  <DashboardIcon kind="drivers" />
                </span>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-5 shadow-[0_20px_60px_-45px_rgba(15,23,42,0.45)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-medium text-slate-500">Payments & Receivables</div>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <div>Received: <span className="font-semibold text-slate-900">{formatMoney(kpis.receivedTotal)}</span></div>
                    <div>Receivables: <span className="font-semibold text-slate-900">{formatMoney(kpis.receivablesTotal)}</span></div>
                  </div>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700">
                  <DashboardIcon kind="payment" />
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {isDispatcher && dispatcherInProgressByDriver.length ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <div className="text-lg font-bold text-gray-900">Driver Progress (In-Progress Loads)</div>
          <div className="text-sm text-gray-500">Booked + Picked Up per assigned driver</div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {dispatcherInProgressByDriver.slice(0, 12).map((d) => (
              <div key={d.id} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                <div className="text-sm text-gray-700 font-semibold truncate">{d.name}</div>
                <div className="text-2xl font-extrabold text-gray-900 mt-1">{d.count}</div>
                <div className="text-xs text-gray-500">in-progress loads</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {!isDispatcher && !isSalesAgent ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Link
            href={invoicesHref("pending")}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 hover:bg-gray-50 transition"
            title="Open pending invoices"
          >
            <div className="text-sm text-gray-500">Receivables</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{formatMoney(kpis.receivablesTotal)}</div>
            <div className="text-sm text-gray-500 mt-2">Open invoices: {kpis.openInvoicesCount} (Pending + Partial)</div>
          </Link>

          <Link
            href={invoicesHref("paid")}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 hover:bg-gray-50 transition"
            title="Open paid invoices"
          >
            <div className="text-sm text-gray-500">Payments Received</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{formatMoney(kpis.receivedTotal)}</div>
            <div className="text-sm text-gray-500 mt-2">Invoices w/ payments: {kpis.invoicesWithPaymentsCount}</div>
          </Link>

          <Link
            href={loadManagementHref({ status: "delivered", payment: "unpaid" })}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 hover:bg-gray-50 transition"
            title="Open delivered + unpaid loads"
          >
            <div className="text-sm text-gray-500">Unbilled</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.deliveredNotInvoiced.amount)}</div>
            <div className="text-sm text-gray-500 mt-2">Delivered (not invoiced): {cashPipelineReport.deliveredNotInvoiced.count}</div>
          </Link>

          <Link
            href={loadManagementHref({ status: "booked" })}
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 hover:bg-gray-50 transition"
            title="Open booked loads"
          >
            <div className="text-sm text-gray-500">Pipeline Value</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.booked.amount)}</div>
            <div className="text-sm text-gray-500 mt-2">
              Booked: {orderInvoiceSummary.booked} • Picked Up: {orderInvoiceSummary.pickedUp} • Issue: {orderInvoiceSummary.issue}
            </div>
          </Link>

          <Link
            href="/drivers#drivers-list"
            className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 hover:bg-gray-50 transition"
          >
            <div className="text-sm text-gray-500">Active Drivers</div>
            <div className="text-3xl font-extrabold text-gray-900 mt-1">{activeDriversCount}</div>
            <div className="text-sm text-gray-500 mt-2">Click to view list</div>
          </Link>
        </div>
      ) : null}

      {!isSalesAgent ? (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
            <div>
              <div className="text-lg font-bold text-gray-900">Dashboard Filters</div>
              <div className="text-sm text-gray-500">Filter the dashboard by driver/dispatcher</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setFilterDriver("");
                setFilterDispatcher("");
              }}
              className="px-4 py-2 rounded-lg font-medium transition border bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            >
              Clear Filters
            </button>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="homeFilterDriver" className="block mb-1 font-medium text-gray-700">Driver</label>
              <select
                id="homeFilterDriver"
                value={filterDriver}
                onChange={(e) => setFilterDriver(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2"
              >
                <option value="">All Drivers</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            {!isDispatcher ? (
              <div>
                <label htmlFor="homeFilterDispatcher" className="block mb-1 font-medium text-gray-700">Dispatcher</label>
                <select
                  id="homeFilterDispatcher"
                  value={filterDispatcher}
                  onChange={(e) => setFilterDispatcher(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2"
                >
                  <option value="">All Dispatchers</option>
                  {dispatchers.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="block mb-1 font-medium text-gray-700">Dispatcher</label>
                <div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
                  {String(me?.name || me?.userName || "You")}
                </div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
          <div>
            <div className="text-lg font-bold text-gray-900">Orders & Invoices Summary</div>
            <div className="text-sm text-gray-500">{period.label} counts (operational + billing)</div>
          </div>
          <div className="text-sm text-gray-500">{toYMD(range.start)} → {toYMD(range.end)}</div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Booked</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.booked}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "booked" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Booked</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.booked}</div>
            </Link>
          )}

          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Canceled</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.canceled}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "canceled" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Canceled</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.canceled}</div>
            </Link>
          )}

          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Picked Up</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.pickedUp}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "pickedup" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Picked Up</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.pickedUp}</div>
            </Link>
          )}

          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Delivered</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.delivered}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "delivered" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Delivered</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.delivered}</div>
            </Link>
          )}

          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Issue</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.issue}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "issue" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Issue</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.issue}</div>
            </Link>
          )}

          {isSalesAgent ? (
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Read-only">
              <div className="text-sm text-gray-500">Delivered (Not Invoiced)</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.deliveredNotInvoiced}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={loadManagementHref({ status: "delivered", payment: "unpaid" })}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Delivered (Not Invoiced)</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.deliveredNotInvoiced}</div>
            </Link>
          )}

          {isDispatcher || isSalesAgent ? (
            <div
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed"
              title={isDispatcher ? "Invoice pages are disabled for dispatcher" : "Read-only"}
            >
              <div className="text-sm text-gray-500">Pending Invoices</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.pendingInvoices}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={invoicesHref("pending")}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Pending Invoices</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.pendingInvoices}</div>
            </Link>
          )}

          {isDispatcher || isSalesAgent ? (
            <div
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed"
              title={isDispatcher ? "Invoice pages are disabled for dispatcher" : "Read-only"}
            >
              <div className="text-sm text-gray-500">Paid Invoices</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.paidInvoices}</div>
              <div className="text-xs text-gray-500 mt-1">Read-only</div>
            </div>
          ) : (
            <Link
              href={invoicesHref("paid")}
              className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
            >
              <div className="text-sm text-gray-500">Paid Invoices</div>
              <div className="text-2xl font-extrabold text-gray-900 mt-1">{orderInvoiceSummary.paidInvoices}</div>
            </Link>
          )}
        </div>
      </div>

      {!isSalesAgent ? (

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Cash & Pipeline Report</div>
              <div className="text-sm text-gray-500">{period.label} summary (received, receivables, pipeline)</div>
            </div>
            <div className="text-sm text-gray-500">{toYMD(range.start)} → {toYMD(range.end)}</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
            {isDispatcher ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Invoice pages are disabled for dispatcher">
                <div className="text-sm text-gray-500">Paid Invoices (Received)</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.paidInvoices.amount)}</div>
                <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.paidInvoices.count} • Read-only</div>
              </div>
            ) : (
              <Link
                href={invoicesHref("paid")}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
              >
                <div className="text-sm text-gray-500">Paid Invoices (Received)</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.paidInvoices.amount)}</div>
                <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.paidInvoices.count}</div>
              </Link>
            )}

            {isDispatcher ? (
              <div className="rounded-lg border border-gray-100 bg-gray-50 p-4 opacity-80 cursor-not-allowed" title="Invoice pages are disabled for dispatcher">
                <div className="text-sm text-gray-500">Pending Invoices (Receivables)</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.pendingInvoices.amount)}</div>
                <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.pendingInvoices.count} • Read-only</div>
              </div>
            ) : (
              <Link
                href={invoicesHref("pending")}
                className="rounded-lg border border-gray-100 bg-gray-50 p-4 hover:bg-gray-100 transition"
              >
                <div className="text-sm text-gray-500">Pending Invoices (Receivables)</div>
                <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.pendingInvoices.amount)}</div>
                <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.pendingInvoices.count}</div>
              </Link>
            )}
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Delivered (Not Invoiced)</div>
              <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.deliveredNotInvoiced.amount)}</div>
              <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.deliveredNotInvoiced.count}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Booked (Pipeline Value)</div>
              <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.booked.amount)}</div>
              <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.booked.count}</div>
            </div>
            <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
              <div className="text-sm text-gray-500">Canceled (Pipeline Value)</div>
              <div className="text-xl font-extrabold text-gray-900 mt-1">{formatMoney(cashPipelineReport.canceled.amount)}</div>
              <div className="text-xs text-gray-500 mt-1">Count: {cashPipelineReport.canceled.count}</div>
            </div>
          </div>

          <div className="mt-5 h-80">
            <Bar
              data={incomeBarData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    ticks: {
                      callback: (v) => `$${v}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">{period.label} Revenue Trend</div>
              <div className="text-sm text-gray-500">
                {toYMD(range.start)} → {toYMD(range.end)}
              </div>
            </div>
            {loading && <div className="text-sm text-gray-500">Loading…</div>}
          </div>
          <div className="h-72">
            <Line
              data={lineData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  y: {
                    ticks: {
                      callback: (v) => `$${v}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <div className="text-lg font-bold text-gray-900 mb-4">Invoice Status</div>
          <div className="h-72">
            <Doughnut
              data={doughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "bottom" },
                },
              }}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
        <div className="text-lg font-bold text-gray-900 mb-4">Loads vs Invoices (Totals)</div>
        <div className="h-72">
          <Bar
            data={barData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
            }}
          />
        </div>
      </div>
    </div>
  );
}
