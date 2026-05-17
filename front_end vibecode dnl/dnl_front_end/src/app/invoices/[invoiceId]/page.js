"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Head from "next/head";
import {
  getCompanyDetailsById,
  getDriver,
  getInvoiceAudit,
  getInvoiceById,
  getInvoiceLoads,
  getInvoicePayments,
  payInvoice,
  undoPayInvoice,
} from "../../../utils/api";

import InvoiceTemplate from "../../../components/InvoiceTemplate";
import PaymentModal from "../../../components/PaymentModal";
import { DataBadge, DataTable, HeaderCell } from "../../../components/DataTable";

function formatMoney(value) {
  const num = Number(value) || 0;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(num);
}

function formatDate(value) {
  if (!value) return "-";
  try {
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function InvoiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const invoiceId = params?.invoiceId;
  const autoPrint = searchParams?.get('print') === '1';

  const [invoice, setInvoice] = useState(null);
  const [driver, setDriver] = useState(null);
  const [company, setCompany] = useState(null);
  const [loads, setLoads] = useState([]);
  const [payments, setPayments] = useState([]);
  const [audit, setAudit] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);

  const isPaid = useMemo(
    () => String(invoice?.InvoiceStatus || "").toLowerCase() === "paid",
    [invoice?.InvoiceStatus]
  );

  const isPartial = useMemo(
    () => String(invoice?.InvoiceStatus || "").toLowerCase() === "partial",
    [invoice?.InvoiceStatus]
  );

  const totalPaid = useMemo(
    () => payments.reduce((acc, p) => acc + (Number(p.Amount) || 0), 0),
    [payments]
  );

  const balance = useMemo(() => {
    const total = Number(invoice?.TotalAmount) || 0;
    return Math.max(0, total - (Number(totalPaid) || 0));
  }, [invoice?.TotalAmount, totalPaid]);

  const fetchAll = async () => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const inv = await getInvoiceById(invoiceId);

      const [invLoads, invPayments, invAudit, drv, comp] = await Promise.all([
        getInvoiceLoads(invoiceId),
        getInvoicePayments(invoiceId),
        getInvoiceAudit(invoiceId),
        inv?.DriverID ? getDriver(inv.DriverID) : Promise.resolve(null),
        inv?.companyId ? getCompanyDetailsById(inv.companyId) : Promise.resolve(null),
      ]);

      setInvoice(inv);
      setLoads(Array.isArray(invLoads) ? invLoads : []);
      setPayments(Array.isArray(invPayments) ? invPayments : []);
      setAudit(Array.isArray(invAudit) ? invAudit : []);
      setDriver(drv);
      setCompany(comp);
      setError("");
    } catch (e) {
      setError(e?.message || "Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invoiceId]);

  useEffect(() => {
    if (autoPrint && invoice && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [autoPrint, invoice, loading]);

  const openPaymentModal = () => {
    if (!invoiceId) return;
    setPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    setPaymentModalOpen(false);
  };

  const submitPayment = async (payload) => {
    if (!invoiceId) return;
    setLoading(true);
    try {
      const result = await payInvoice(invoiceId, payload);

      // Immediately reflect the computed status.
      if (result?.InvoiceStatus) {
        setInvoice((prev) =>
          prev
            ? {
              ...prev,
              InvoiceStatus: result.InvoiceStatus,
              PaymentDate: result.PaymentDate ?? prev.PaymentDate,
            }
            : prev
        );
      }

      // Append the created payment row without a full refetch.
      if (result?.Payment && result.Payment.PaymentID) {
        setPayments((prev) => [result.Payment, ...(Array.isArray(prev) ? prev : [])]);
      }

      closePaymentModal();
    } catch (e) {
      setError(e?.message || "Failed to add payment");
    } finally {
      setLoading(false);
    }
  };

  const onUndoPaid = async () => {
    if (!invoiceId) return;
    if (!confirm("Undo payment for this invoice? This will remove recorded payments and set status back to Pending.")) return;

    const reason = prompt("Undo reason (required):", "");
    if (reason === null) return;
    if (!String(reason).trim()) {
      alert("Undo reason is required");
      return;
    }

    setLoading(true);
    try {
      await undoPayInvoice(invoiceId, { reason: String(reason).trim() });
      await fetchAll();
    } catch (e) {
      setError(e?.message || "Failed to undo invoice payment");
    } finally {
      setLoading(false);
    }
  };

  const onDownloadInvoice = () => {
    if (typeof window === "undefined") return;
    window.print();
  };

  return (
    <>
      <title>{invoice?.InvoiceNumber ? `Invoice ${invoice.InvoiceNumber}` : "Invoice Details"}</title>
      <div className="p-4 md:p-8 space-y-6">
        <PaymentModal
          open={paymentModalOpen}
          title="Add Payment"
          defaultAmount={balance > 0 ? balance : invoice?.TotalAmount ?? ""}
          onCancel={closePaymentModal}
          onSubmit={submitPayment}
        />

        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-2xl font-extrabold text-gray-900">Invoice Details</div>
            <div className="text-sm text-gray-500">Invoice ID: {String(invoiceId || "-")}</div>
          </div>

          <div className="flex gap-2 no-print">
            <button
              type="button"
              onClick={() => router.push("/invoices")}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Back
            </button>

            <button
              type="button"
              onClick={onDownloadInvoice}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              Download / Print
            </button>

            {!isPaid && (
              <button
                type="button"
                disabled={loading}
                onClick={openPaymentModal}
                className="bg-green-600 hover:bg-green-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded"
              >
                Add Payment
              </button>
            )}
            {isPaid && (
              <button
                type="button"
                disabled={loading}
                onClick={onUndoPaid}
                className="bg-yellow-600 hover:bg-yellow-700 disabled:opacity-60 text-white font-bold py-2 px-4 rounded"
              >
                Undo Paid
              </button>
            )}
          </div>
        </div>

        {error && <div className="bg-red-100 text-red-700 p-3 rounded">{error}</div>}

        {loading && <div className="text-sm text-gray-500">Loading…</div>}

        {invoice && (
          <div className="flex flex-col items-center">
            <div className="w-full max-w-4xl flex items-center justify-between mb-2 no-print">
              <div className="text-sm text-gray-600">
                Status:{" "}
                <span
                  className={
                    String(invoice?.InvoiceStatus || "").toLowerCase() === "paid"
                      ? "px-2 py-1 rounded text-white text-xs font-bold bg-green-600"
                      : String(invoice?.InvoiceStatus || "").toLowerCase() === "partial"
                        ? "px-2 py-1 rounded text-white text-xs font-bold bg-blue-600"
                        : "px-2 py-1 rounded text-white text-xs font-bold bg-yellow-500"
                  }
                >
                  {invoice?.InvoiceStatus || "-"}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                Balance: {formatMoney(balance)} (Paid recorded: {formatMoney(totalPaid)})
              </div>
            </div>

            <div id="invoice-print" className="w-full flex justify-center">
              <InvoiceTemplate
                invoice={invoice}
                driver={driver}
                company={company}
                loads={loads}
                loadingLoads={loading}
              />
            </div>

            <div className="w-full max-w-4xl mt-6 bg-white rounded-xl shadow-lg border border-gray-100 p-5 no-print">
              <div className="text-lg font-bold text-gray-900">Recent Audit</div>
              <div className="text-sm text-gray-500 mb-3">Last changes for this invoice</div>

              {audit.length === 0 ? (
                <div className="text-sm text-gray-600">No audit entries found.</div>
              ) : (
                <DataTable minWidthClassName="min-w-[900px] w-full" hint="Swipe to review invoice audit history">
                  <thead>
                    <tr>
                      <HeaderCell>Time</HeaderCell>
                      <HeaderCell>Action</HeaderCell>
                      <HeaderCell>User</HeaderCell>
                      <HeaderCell>Reason</HeaderCell>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {audit.map((a) => {
                      let reason = "-";
                      try {
                        const after = a?.AfterJSON ? JSON.parse(a.AfterJSON) : null;
                        if (after?.reason) reason = String(after.reason);
                      } catch {
                        // ignore JSON parse errors
                      }

                      return (
                        <tr key={a.AuditID} className="transition hover:bg-sky-50/70">
                          <td className="px-4 py-3 text-sm text-slate-600">
                            {formatDate(a.PerformedAt)}
                          </td>
                          <td className="px-4 py-3 text-sm"><DataBadge tone="info">{a.Action || "-"}</DataBadge></td>
                          <td className="px-4 py-3 text-sm text-slate-600">{a.PerformedByUserID ?? "-"}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </DataTable>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
