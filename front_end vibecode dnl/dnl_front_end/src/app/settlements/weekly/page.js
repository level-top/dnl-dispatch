"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  createWeeklySettlementInvoice,
  getCompanyDetails,
  getDrivers,
  getLoads,
} from "../../../utils/api";
import { DataBadge, DataTable, HeaderCell } from "../../../components/DataTable";

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

function round2(value) {
  const n = Number(value) || 0;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function coalesceDate(load) {
  return load.dropOff_dateTime || load.delivered_at || load.dateTime;
}

export default function WeeklySettlementPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loads, setLoads] = useState([]);

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [selectedCompanyId, setSelectedCompanyId] = useState("");
  const [commissionBase, setCommissionBase] = useState("gross");

  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  useEffect(() => {
    const now = new Date();
    const end = toYMD(now);
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - 6);
    const start = toYMD(startDate);

    setPeriodStart(start);
    setPeriodEnd(end);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [driversData, companiesData, loadsData] = await Promise.all([
          getDrivers(),
          getCompanyDetails(),
          getLoads(),
        ]);

        if (cancelled) return;
        setDrivers(Array.isArray(driversData) ? driversData : []);
        setCompanies(Array.isArray(companiesData) ? companiesData : []);
        setLoads(Array.isArray(loadsData) ? loadsData : []);

        const firstCompany = Array.isArray(companiesData) ? companiesData[0] : null;
        if (firstCompany?.CompanyID && !selectedCompanyId) {
          setSelectedCompanyId(String(firstCompany.CompanyID));
        }

        setError("");
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load drivers/loads");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedCompanyId]);

  const selectedDriver = useMemo(
    () => drivers.find((d) => String(d.id) === String(selectedDriverId)) || null,
    [drivers, selectedDriverId]
  );

  const commissionRate = useMemo(() => {
    const pct = Number(selectedDriver?.percentage) || 0;
    return pct;
  }, [selectedDriver?.percentage]);

  const eligibleLoads = useMemo(() => {
    if (!selectedDriverId || !periodStart || !periodEnd) return [];

    const start = new Date(periodStart);
    start.setHours(0, 0, 0, 0);

    const end = new Date(periodEnd);
    end.setHours(23, 59, 59, 999);

    return loads
      .filter((l) => String(l.driverId ?? l.driverName) === String(selectedDriverId))
      .filter((l) => String(l.loadStatus || "").toLowerCase() === "delivered")
      .filter((l) => String(l.payment_status || "").toLowerCase() === "unpaid")
      .filter((l) => {
        const dt = new Date(coalesceDate(l));
        return !Number.isNaN(dt.getTime()) && dt >= start && dt <= end;
      })
      .sort((a, b) => {
        const da = new Date(coalesceDate(a)).getTime();
        const db = new Date(coalesceDate(b)).getTime();
        return da - db;
      });
  }, [loads, periodEnd, periodStart, selectedDriverId]);

  const previewItems = useMemo(() => {
    const base = String(commissionBase).toLowerCase() === "net" ? "net" : "gross";

    return eligibleLoads.map((l) => {
      const loadAmount = Number(l.loadAmount) || 0;
      const netAmount = l.netAmount === null || l.netAmount === undefined ? null : Number(l.netAmount) || 0;
      const baseAmount = base === "net" ? (netAmount ?? loadAmount) : loadAmount;
      const commissionAmount = round2((baseAmount * commissionRate) / 100);

      return {
        id: l.id,
        loadNumber: l.loadNumber || l.id,
        date: coalesceDate(l),
        from: l.loadFrom || "-",
        to: l.loadTo || "-",
        loadAmount,
        base,
        baseAmount,
        commissionAmount,
      };
    });
  }, [commissionBase, commissionRate, eligibleLoads]);

  const previewTotal = useMemo(
    () => round2(previewItems.reduce((acc, it) => acc + (Number(it.commissionAmount) || 0), 0)),
    [previewItems]
  );

  const onSubmit = async (e) => {
    e.preventDefault();
    setResult(null);

    if (!selectedDriverId || !selectedCompanyId || !periodStart || !periodEnd) {
      setError("Please select driver, company, and date range");
      return;
    }

    if (previewItems.length === 0) {
      setError("No eligible delivered (unpaid) loads found in this period");
      return;
    }

    setSubmitting(true);
    try {
      const response = await createWeeklySettlementInvoice({
        driverId: Number(selectedDriverId),
        companyId: Number(selectedCompanyId),
        periodStart,
        periodEnd,
        commissionBase,
      });

      setResult(response);
      setError("");
    } catch (err) {
      setError(err?.message || "Failed to create weekly invoice");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      <div className="max-w-5xl w-full space-y-6">
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-5">
          <div className="text-2xl font-extrabold text-gray-900">Create Weekly Driver Invoice</div>
          <div className="text-sm text-gray-600 mt-1">
            Generates an invoice for delivered loads in the selected period (commission-based).
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded w-full">{error}</div>
        )}

        <form onSubmit={onSubmit} className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="weekly-driver" className="block text-sm font-medium mb-1">Driver *</label>
              <select
                id="weekly-driver"
                name="driverId"
                value={selectedDriverId}
                onChange={(e) => setSelectedDriverId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
                autoComplete="off"
              >
                <option value="">Choose a driver</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
              <div className="text-xs text-gray-500 mt-1">Commission: {commissionRate}%</div>
            </div>

            <div>
              <label htmlFor="weekly-company" className="block text-sm font-medium mb-1">Company *</label>
              <select
                id="weekly-company"
                name="companyId"
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
                autoComplete="off"
              >
                <option value="">Choose a company</option>
                {companies.map((c) => (
                  <option key={c.CompanyID} value={c.CompanyID}>
                    {c.CompanyName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="weekly-commission-base" className="block text-sm font-medium mb-1">Commission Base</label>
              <select
                id="weekly-commission-base"
                name="commissionBase"
                value={commissionBase}
                onChange={(e) => setCommissionBase(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                autoComplete="off"
              >
                <option value="gross">Gross (loadAmount)</option>
                <option value="net">Net (netAmount)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="weekly-period-start" className="block text-sm font-medium mb-1">Period Start *</label>
              <input
                id="weekly-period-start"
                name="periodStart"
                type="date"
                value={periodStart}
                onChange={(e) => setPeriodStart(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="weekly-period-end" className="block text-sm font-medium mb-1">Period End *</label>
              <input
                id="weekly-period-end"
                name="periodEnd"
                type="date"
                value={periodEnd}
                onChange={(e) => setPeriodEnd(e.target.value)}
                className="w-full border border-gray-300 rounded px-3 py-2"
                required
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold py-2 px-6 rounded"
            >
              {submitting ? "Creating..." : "Create Weekly Invoice"}
            </button>
            <button
              type="button"
              onClick={() => router.back()}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-6 rounded"
            >
              Cancel
            </button>
          </div>
        </form>

        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-2 mb-4">
            <div>
              <div className="text-lg font-bold text-gray-900">Preview</div>
              <div className="text-sm text-gray-500">
                Delivered + unpaid loads for the selected driver and date range
              </div>
            </div>
            <div className="text-sm text-gray-700">
              Total commission: <span className="font-semibold">{formatMoney(previewTotal)}</span>
            </div>
          </div>

          {previewItems.length === 0 ? (
            <div className="text-sm text-gray-600">No eligible loads to invoice.</div>
          ) : (
            <DataTable minWidthClassName="min-w-[900px] w-full" hint="Swipe to inspect settlement rows">
              <thead>
                <tr>
                  <HeaderCell>Date</HeaderCell>
                  <HeaderCell>Load</HeaderCell>
                  <HeaderCell>Lane</HeaderCell>
                  <HeaderCell align="right">Load Amount</HeaderCell>
                  <HeaderCell align="right">Base</HeaderCell>
                  <HeaderCell align="right">Commission</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white text-sm">
                {previewItems.map((it) => (
                  <tr key={it.id} className="transition hover:bg-sky-50/70">
                    <td className="px-3 py-2 text-slate-600">{it.date ? String(it.date).slice(0, 10) : "-"}</td>
                    <td className="px-3 py-2 font-medium text-sky-700">{it.loadNumber}</td>
                    <td className="px-3 py-2 text-slate-600">{it.from} to {it.to}</td>
                    <td className="px-3 py-2 text-right font-medium text-slate-900">{formatMoney(it.loadAmount)}</td>
                    <td className="px-3 py-2 text-right text-slate-600">{formatMoney(it.baseAmount)} <DataBadge tone="neutral" className="ml-2">{it.base}</DataBadge></td>
                    <td className="px-3 py-2 text-right font-semibold text-slate-900">{formatMoney(it.commissionAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>

        {result && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6">
            <div className="text-lg font-bold text-gray-900">Created</div>
            <div className="text-sm text-gray-600 mt-1">
              Invoice <span className="font-semibold">#{result.InvoiceID}</span> — {result.InvoiceNumber} — Total: {formatMoney(result.TotalAmount)}
            </div>
            <div className="flex gap-2 mt-4">
              <button
                type="button"
                onClick={() => router.push("/invoices")}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded"
              >
                Go to Invoices
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
