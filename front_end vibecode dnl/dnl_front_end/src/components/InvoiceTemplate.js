"use client";

import Link from "next/link";
import Image from "next/image";

function formatCurrency(amount) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(amount) || 0);
}

function formatDate(dateValue) {
  if (!dateValue) return "";
  const options = { year: "numeric", month: "short", day: "numeric" };
  try {
    return new Date(dateValue).toLocaleDateString(undefined, options);
  } catch {
    return String(dateValue);
  }
}

export default function InvoiceTemplate({
  invoice,
  driver,
  company,
  loads,
  loadingLoads = false,
}) {
  const invoiceId = invoice?.InvoiceID;

  const commissionRate = Number(
    invoice?.Commission ?? driver?.percentage ?? 0
  );

  const grossLoadTotal = (Array.isArray(loads) ? loads : []).reduce(
    (sum, l) => sum + (Number(l?.loadAmount) || 0),
    0
  );

  // In this app, TotalAmount is the dispatch commission amount.
  const commissionAmount =
    invoice?.TotalAmount !== undefined && invoice?.TotalAmount !== null
      ? Number(invoice.TotalAmount) || 0
      : (grossLoadTotal * (commissionRate / 100) || 0);

  const payPeriodStart = invoice?.PeriodStart || invoice?.InvoiceDate;
  const payPeriodEnd = invoice?.PeriodEnd || invoice?.InvoiceDate;

  return (
    <div className="invoice-container bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-100">
      <header className="flex justify-between items-start mb-10 border-b pb-4">
        <div>
          <h1 className="text-4xl font-extrabold text-gray-800">INVOICE</h1>
          <p className="text-lg text-indigo-600 font-semibold mt-1">
            Settlement ID:{" "}
            {invoiceId ? (
              <Link
                href={`/invoices/${invoiceId}`}
                className="hover:underline"
                title="Open invoice details"
              >
                {invoice?.InvoiceNumber || String(invoiceId)}
              </Link>
            ) : (
              invoice?.InvoiceNumber || "-"
            )}
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Issue Date: {formatDate(invoice?.InvoiceDate)}
          </p>
          <p className="text-sm text-gray-500">
            Pay Period: {formatDate(payPeriodStart)} to {formatDate(payPeriodEnd)}
          </p>
        </div>

        <div className="text-right">
          <Image
            src={company?.LogoURL || "/logo.png"}
            alt="Company Logo"
            width={160}
            height={48}
            className="h-12 w-auto mb-2 ml-auto rounded-md"
            unoptimized
          />
          <p className="text-xl font-bold text-gray-700">
            {company?.CompanyName || invoice?.CompanyName || "Drive Now Logistics"}
          </p>
          <p className="text-sm text-gray-500">
            {company?.Address || "123 Main St, City, State"}
          </p>
          <p className="text-sm text-gray-500">
            {company?.Phone || "(555) 123-4567"}
          </p>
        </div>
      </header>

      <section className="mb-10 bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-600">
        <h2 className="text-lg font-bold text-indigo-800 mb-4">
          SETTLEMENT DETAILS
        </h2>

        <div className="grid grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <h3 className="text-base font-bold text-indigo-700 mb-2">
              Driver Information
            </h3>
            <div className="mb-2">
              <span className="font-semibold">Driver Name:</span>{" "}
              <span className="text-gray-900">
                {driver?.name || invoice?.driverName || "N/A"}
              </span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">MC Number:</span>{" "}
              <span>{driver?.MC_number || "N/A"}</span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Contact Number:</span>{" "}
              <span>{driver?.contactNumber || "N/A"}</span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Email:</span>{" "}
              <span>{driver?.email || "N/A"}</span>
            </div>
          </div>

          <div>
            <h3 className="text-base font-bold text-indigo-700 mb-2">
              Company Account
            </h3>
            <div className="mb-2">
              <span className="font-semibold">Bank:</span>{" "}
              <span className="font-mono">
                {company?.BankName || "Global Transport Bank"}
              </span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">IBAN:</span>{" "}
              <span className="text-lg font-extrabold text-indigo-700">
                {company?.IBAN || "N/A"}
              </span>
            </div>
            <div className="mb-2">
              <span className="font-semibold">Holder:</span>{" "}
              <span>{company?.AccountHolder || "N/A"}</span>
            </div>
          </div>
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">
          I. LOAD SERVICE BREAKDOWN (GROSS PAY)
        </h2>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-blue-900">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Load ID
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Origin/Dest.
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Miles
                </th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate/mile
                </th>
                <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pay
                </th>
              </tr>
            </thead>

            <tbody className="bg-white divide-y divide-gray-200 text-sm">
              {Array.isArray(loads) && loads.length > 0 ? (
                loads.map((load) => {
                  const miles = Number(load?.miles) || 0;
                  const amt = Number(load?.loadAmount) || 0;
                  const ratePerMile = miles > 0 ? (amt / miles).toFixed(2) : "-";
                  const from = (load?.loadFrom || "-")
                    .split(" ")
                    .slice(0, 6)
                    .join(" ");
                  const to = (load?.loadTo || "-")
                    .split(" ")
                    .slice(0, 6)
                    .join(" ");

                  return (
                    <tr key={load?.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDate(load?.dateTime)}
                      </td>
                      <td className="px-3 py-2 font-medium text-indigo-600 whitespace-nowrap">
                        {load?.loadNumber || load?.id}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{`${from} to ${to}`}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{miles || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{ratePerMile}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-medium">
                        {formatCurrency(amt)}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td className="px-3 py-3 text-sm text-gray-500" colSpan={6}>
                    {loadingLoads ? "Loading loads..." : "No loads linked to this invoice."}
                  </td>
                </tr>
              )}
            </tbody>

            <tfoot>
              <tr className="bg-gray-100">
                <td colSpan={5}></td>
                <td className="px-3 py-3 text-right text-sm font-bold text-gray-700">
                  TOTAL GROSS LOAD PAY: {formatCurrency(grossLoadTotal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* <section className="mb-10 p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
        <h2 className="text-xl font-bold text-red-700 mb-4 border-b pb-2">
          II. COMMISSION AND FEES
        </h2>
        <div className="flex justify-between text-lg mb-2">
          <span className="font-medium text-gray-800">
            Gross Pay Subject to Commission:
          </span>
          <span className="font-semibold text-gray-800">
            {formatCurrency(grossLoadTotal)}
          </span>
        </div>
        <div className="flex justify-between text-xl font-extrabold mb-4">
          <span className="font-medium text-red-700">
            Commission Rate ({commissionRate}%):
          </span>
          <span className="font-extrabold text-red-700">
            {formatCurrency(commissionAmount)}
          </span>
        </div>
      </section> */}

      <section className="mb-10 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
        <h2 className="text-lg font-bold text-yellow-800 mb-2">
          Settlement Summary
        </h2>
        <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
          <div>
            <span className="font-semibold">Gross Income:</span>{" "}
            <span>{formatCurrency(grossLoadTotal)}</span>
          </div>
          <div>
            <span className="font-semibold">Dispatch Service Fee (%):</span>{" "}
            <span>{commissionRate}%</span>
          </div>
          <div>
            <span className="font-semibold">Due Amount:</span>{" "}
            <span>{formatCurrency(commissionAmount)}</span>
          </div>
        </div>
      </section>

      <section className="bg-indigo-700 text-white p-6 rounded-lg shadow-xl">
        <div className="flex justify-between text-3xl font-extrabold">
          <span>DUE BALANCE</span>
          <span>{formatCurrency(commissionAmount)}</span>
        </div>
      </section>

      <footer className="mt-8 text-sm text-gray-600 border-t pt-4">
        <p className="font-semibold">Terms & Notes:</p>
        <p>
          1. This settlement is based on a dispatch service fee of{" "}
          <span>{commissionRate}%</span> of the total gross income.
        </p>
        <p>
          2. Payment will be processed via{" "}
          <span>{driver?.paymentMethod || "Direct Deposit"}</span> within 24 hours.
        </p>
        <p>
          3. Drive Now Logistics provides dispatch services to truck owners and drivers.
          The fee is a fixed percentage of gross income as agreed.
        </p>
        <p className="mt-4 text-center text-gray-500">
          Thank you for your reliable service this period!
        </p>
      </footer>
    </div>
  );
}
