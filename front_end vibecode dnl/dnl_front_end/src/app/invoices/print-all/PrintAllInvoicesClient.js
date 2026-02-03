"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  getInvoiceById,
  getInvoiceLoads,
  getDriver,
  getCompanyDetailsById,
} from "../../../utils/api";
import InvoiceTemplate from "../../../components/InvoiceTemplate";

export default function PrintAllInvoicesClient() {
  const searchParams = useSearchParams();
  const [invoicesData, setInvoicesData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const ids = searchParams.get("ids");
    if (!ids) {
      setError("No invoice IDs provided");
      setLoading(false);
      return;
    }

    const invoiceIds = ids.split(",").filter(Boolean);

    const fetchAllInvoices = async () => {
      try {
        const results = [];

        for (const id of invoiceIds) {
          const invoice = await getInvoiceById(id);
          const loads = await getInvoiceLoads(id);
          const driver = invoice?.DriverID ? await getDriver(invoice.DriverID) : null;
          const company = invoice?.companyId
            ? await getCompanyDetailsById(invoice.companyId)
            : null;

          results.push({ invoice, loads, driver, company });
        }

        setInvoicesData(results);
        setLoading(false);

        setTimeout(() => {
          window.print();
        }, 500);
      } catch (err) {
        setError(err?.message || "Failed to load invoices");
        setLoading(false);
      }
    };

    fetchAllInvoices();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-semibold text-gray-700">
          Loading invoices for printing...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center">
        <div className="text-lg font-semibold text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="print-all-container">
      <div className="no-print p-4 bg-gray-100 text-center">
        <p className="text-sm text-gray-600 mb-2">
          {invoicesData.length} invoice{invoicesData.length !== 1 ? "s" : ""} ready
          to print
        </p>
        <button
          onClick={() => window.print()}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded mr-2"
        >
          Print / Download
        </button>
        <button
          onClick={() => window.close()}
          className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
        >
          Close
        </button>
      </div>

      <div className="invoices-print-wrapper space-y-8 p-4">
        {invoicesData.map(({ invoice, loads, driver, company }, index) => (
          <div key={invoice?.InvoiceID || index} className="page-break">
            <InvoiceTemplate
              invoice={invoice}
              driver={driver}
              company={company}
              loads={loads}
              loadingLoads={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
