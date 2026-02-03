"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getAllInvoices, payInvoice, undoPayInvoice, deleteInvoice } from "../../utils/api";
import PaymentModal from "../../components/PaymentModal";

export default function InvoicesClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");
  const [filterDriverId, setFilterDriverId] = useState("All");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState(null);
  const [paymentDefaultAmount, setPaymentDefaultAmount] = useState("");

  useEffect(() => {
    fetchInvoices();
  }, []);

  useEffect(() => {
    const raw = String(searchParams?.get("status") || "").toLowerCase();
    const mapped =
      raw === "pending" ? "Pending" :
      raw === "paid" ? "Paid" :
      raw === "partial" ? "Partial" :
      raw === "all" || raw === "" ? "All" :
      null;
    if (mapped) setFilterStatus(mapped);
  }, [searchParams]);

  const fetchInvoices = async () => {
    setLoading(true);
    try {
      const data = await getAllInvoices();
      setInvoices(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const openPaymentModal = (invoiceId) => {
    const invoice = invoices.find((i) => i.InvoiceID === invoiceId);
    setPaymentInvoiceId(invoiceId);
    setPaymentDefaultAmount(invoice?.TotalAmount ?? "");
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
    setPaymentInvoiceId(null);
    setPaymentDefaultAmount("");
  };

  const submitPayment = async (payload) => {
    if (!paymentInvoiceId) return;
    setLoading(true);
    try {
      const result = await payInvoice(paymentInvoiceId, payload);

      // Update the row locally using backend-computed status.
      if (result && result.InvoiceID) {
        setInvoices((prev) =>
          prev.map((inv) => {
            if (inv.InvoiceID !== paymentInvoiceId) return inv;
            return {
              ...inv,
              InvoiceStatus: result.InvoiceStatus ?? inv.InvoiceStatus,
              PaymentDate: result.PaymentDate ?? inv.PaymentDate,
            };
          })
        );
      } else {
        fetchInvoices();
      }

      closePaymentModal();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if (confirm("Are you sure you want to delete this invoice?")) {
      setLoading(true);
      try {
        await deleteInvoice(invoiceId);
        fetchInvoices();
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleUndoPaid = async (invoiceId) => {
    if (!confirm("Undo payment for this invoice? This will remove recorded payments and set status back to Pending.")) return;

    const reason = prompt("Undo reason (required):", "")
    if (reason === null) return;
    if (!String(reason).trim()) {
      alert("Undo reason is required");
      return;
    }

    setLoading(true);
    try {
      await undoPayInvoice(invoiceId, { reason: String(reason).trim() });
      fetchInvoices();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const resetForm = () => {
    // No-op: form is now on separate page
  };

  const availableLoads = [];
  const driverOptions = Array.from(
    invoices.reduce((map, inv) => {
      const id = inv?.DriverID ?? inv?.driverId ?? inv?.driver_id;
      if (id === null || id === undefined) return map;

      const name = inv?.driverName ?? inv?.DriverName ?? inv?.driver_name;
      const key = String(id);
      if (!map.has(key)) map.set(key, String(name || `Driver ${key}`));
      return map;
    }, new Map())
  )
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const [sortBy, setSortBy] = useState("InvoiceNumber");
  const [sortDir, setSortDir] = useState("desc");
  function getDefaultDateRange() {
    const today = new Date();
    const end = today.toISOString().slice(0, 10);
    const startDate = new Date(today);
    startDate.setMonth(startDate.getMonth() - 3);
    const start = startDate.toISOString().slice(0, 10);
    return { start, end };
  }

  const [dateRange, setDateRange] = useState(getDefaultDateRange());

  const filteredInvoices = invoices.filter((inv) => {
    const matchesStatus = filterStatus === "All" || inv.InvoiceStatus === filterStatus;
    const driverId = inv?.DriverID ?? inv?.driverId ?? inv?.driver_id;
    const matchesDriver =
      filterDriverId === "All" || String(driverId ?? "") === String(filterDriverId);
    let matchesDate = true;
    if (dateRange.start) {
      matchesDate = matchesDate && new Date(inv.InvoiceDate) >= new Date(dateRange.start);
    }
    if (dateRange.end) {
      matchesDate = matchesDate && new Date(inv.InvoiceDate) <= new Date(dateRange.end);
    }
    return matchesStatus && matchesDriver && matchesDate;
  });

  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let aVal, bVal;
    if (sortBy === "InvoiceNumber") {
      aVal = a.InvoiceNumber || "";
      bVal = b.InvoiceNumber || "";
      // Try numeric sort if possible
      const aNum = parseInt(aVal.replace(/\D/g, ""), 10);
      const bNum = parseInt(bVal.replace(/\D/g, ""), 10);
      if (!isNaN(aNum) && !isNaN(bNum)) {
        return sortDir === "asc" ? aNum - bNum : bNum - aNum;
      }
      return sortDir === "asc" ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    if (sortBy === "TotalAmount") {
      aVal = Number(a.TotalAmount) || 0;
      bVal = Number(b.TotalAmount) || 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    if (sortBy === "InvoiceDate") {
      aVal = new Date(a.InvoiceDate).getTime() || 0;
      bVal = new Date(b.InvoiceDate).getTime() || 0;
      return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    }
    return 0;
  });

  const totalFilteredAmount = filteredInvoices.reduce(
    (sum, inv) => sum + (Number(inv?.TotalAmount) || 0),
    0
  );

  return (
    <div className="p-4 md:p-8">
      <PaymentModal
        open={paymentModalOpen}
        title="Add Payment"
        defaultAmount={paymentDefaultAmount}
        onCancel={closePaymentModal}
        onSubmit={submitPayment}
      />

      <h1 className="text-3xl font-bold text-gray-800 mb-6">Invoices Management</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* Actions */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => router.push('/invoices/create')}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Create New Invoice
          </button>

          <Link
            href="/settlements/weekly"
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded"
          >
            Weekly Settlement
          </Link>
        </div>

        <div className="flex sm:justify-end">
          <Link
            href="/company-details"
            className="bg-gray-200 text-gray-800 hover:bg-gray-300 font-bold py-2 px-4 rounded"
          >
            Company Details
          </Link>
        </div>
      </div>

      {/* Filter Status & Date Range */}
      <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-2 flex-wrap">
          {["All", "Pending", "Partial", "Paid"].map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-4 py-2 rounded font-medium ${
                filterStatus === status
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <label htmlFor="invoice-filter-driver" className="text-sm font-medium text-gray-700">Driver</label>
            <select
              id="invoice-filter-driver"
              name="filterDriverId"
              value={filterDriverId}
              onChange={(e) => setFilterDriverId(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
              autoComplete="off"
            >
              <option value="All">All Drivers</option>
              {driverOptions.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="invoices-date-start" className="text-sm font-medium text-gray-700">Date</label>
            <input
              id="invoices-date-start"
              name="dateStart"
              type="date"
              value={dateRange.start}
              onChange={e => setDateRange(r => ({ ...r, start: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
              max={dateRange.end || undefined}
              autoComplete="off"
              aria-label="Start date"
            />
            <span className="text-gray-500">to</span>
            <label htmlFor="invoices-date-end" className="sr-only">End date</label>
            <input
              id="invoices-date-end"
              name="dateEnd"
              type="date"
              value={dateRange.end}
              onChange={e => setDateRange(r => ({ ...r, end: e.target.value }))}
              className="border rounded px-2 py-1 text-sm"
              min={dateRange.start || undefined}
              autoComplete="off"
              aria-label="End date"
            />
            {(dateRange.start || dateRange.end) && (
              <button
                type="button"
                className="ml-1 text-xs text-gray-500 hover:text-red-600"
                onClick={() => setDateRange({ start: "", end: "" })}
                title="Clear date range"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer select-none" onClick={() => {
                setSortBy("InvoiceNumber");
                setSortDir(sortBy === "InvoiceNumber" && sortDir === "desc" ? "asc" : "desc");
              }}>
                Invoice #
                <span className="ml-1 align-middle text-xs">
                  {sortBy === "InvoiceNumber" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Driver</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Company</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer select-none" onClick={() => {
                setSortBy("TotalAmount");
                setSortDir(sortBy === "TotalAmount" && sortDir === "desc" ? "asc" : "desc");
              }}>
                <div>Amount
                  <span className="ml-1 align-middle text-xs">
                    {sortBy === "TotalAmount" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                  </span>
                </div>
                <div className="text-xs font-normal text-gray-500">
                  Total: ${totalFilteredAmount.toFixed(2)}
                </div>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Received / Pending</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Commission</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 cursor-pointer select-none" onClick={() => {
                setSortBy("InvoiceDate");
                setSortDir(sortBy === "InvoiceDate" && sortDir === "desc" ? "asc" : "desc");
              }}>
                Date
                <span className="ml-1 align-middle text-xs">
                  {sortBy === "InvoiceDate" ? (sortDir === "asc" ? "▲" : "▼") : ""}
                </span>
              </th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedInvoices.map((invoice) => (
              <tr key={invoice.InvoiceID} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm font-medium">
                  <Link
                    href={`/invoices/${invoice.InvoiceID}`}
                    className="text-indigo-600 hover:underline"
                    title="Open invoice details"
                  >
                    {invoice.InvoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">{invoice.driverName}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{invoice.CompanyName}</td>
                <td className="px-4 py-3 text-sm text-gray-800">${invoice.TotalAmount || 0}</td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {String(invoice.InvoiceStatus || "").toLowerCase() === "partial" && (
                    <span className="text-xs text-gray-600">
                      ${Number(invoice.TotalPaid ?? 0).toFixed(2)} / ${Number(invoice.Balance ?? (Number(invoice.TotalAmount) || 0)).toFixed(2)}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">{invoice.Commission || 0}%</td>
                <td className="px-4 py-3 text-sm">
                  <span
                    className={`px-2 py-1 rounded text-white text-xs font-bold ${
                      String(invoice.InvoiceStatus || "").toLowerCase() === "paid"
                        ? "bg-green-500"
                        : String(invoice.InvoiceStatus || "").toLowerCase() === "partial"
                          ? "bg-blue-600"
                          : "bg-yellow-500"
                    }`}
                  >
                    {invoice.InvoiceStatus}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-800">
                  {new Date(invoice.InvoiceDate).toLocaleDateString()}
                </td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <button
                    onClick={() => window.open(`/invoices/${invoice.InvoiceID}?print=1`, '_blank')}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded text-xs"
                    title="Download / Print"
                  >
                    Download
                  </button>
                  {["pending", "partial"].includes(String(invoice.InvoiceStatus || "").toLowerCase()) && (
                    <button
                      onClick={() => openPaymentModal(invoice.InvoiceID)}
                      className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Add Payment
                    </button>
                  )}
                  {String(invoice.InvoiceStatus || "").toLowerCase() === "paid" && (
                    <button
                      onClick={() => handleUndoPaid(invoice.InvoiceID)}
                      className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Undo Paid
                    </button>
                  )}
                  {String(invoice.InvoiceStatus || "").toLowerCase() !== "paid" && (
                    <button
                      onClick={() => handleDeleteInvoice(invoice.InvoiceID)}
                      className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && filteredInvoices.length === 0 && (
          <div className="p-4 text-center text-gray-500">No invoices found</div>
        )}
      </div>
    </div>
  );
}
