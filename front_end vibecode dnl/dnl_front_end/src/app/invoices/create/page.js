"use client";
import { useCallback, useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getDrivers, getLoads, getCompanyDetails, createInvoice } from "../../../utils/api";

export default function CreateInvoicePage() {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [loads, setLoads] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState("");
  const [selectedCompany, setSelectedCompany] = useState("");
  const [commission, setCommission] = useState("");
  const [selectedLoads, setSelectedLoads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const invoiceRef = useRef(null);

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    if (!selectedDriver) return;
    const driver = drivers.find(d => d.id == selectedDriver);
    setCommission(driver?.percentage || "");
  }, [selectedDriver, drivers]);

  useEffect(() => {
    if (!selectedDriver) {
      setLoads([]);
      setSelectedLoads([]);
      return;
    }
    filterLoadsByDriver(selectedDriver);
  }, [selectedDriver, filterLoadsByDriver]);

  const fetchAllData = async () => {
    setLoading(true);
    try {
      const [driversData, loadsData, companiesData] = await Promise.all([
        getDrivers(),
        getLoads(),
        getCompanyDetails()
      ]);
      setDrivers(driversData);
      setLoads(loadsData);
      setCompanies(companiesData);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const filterLoadsByDriver = useCallback(
    (driverId) => {
      const filtered = loads.filter(
        (l) =>
          (l.driverId ?? l.driverName) == driverId &&
          l.loadStatus == "delivered" &&
          l.payment_status == "unpaid"
      );
      setLoads(filtered);
      setSelectedLoads(filtered.map((l) => l.id));
    },
    [loads]
  );

  const handleLoadToggle = (loadId) => {
    if (selectedLoads.includes(loadId)) {
      setSelectedLoads(selectedLoads.filter(id => id !== loadId));
    } else {
      setSelectedLoads([...selectedLoads, loadId]);
    }
  };

  const generateInvoiceNumber = () => {
    // Get company abbreviation (first 3 chars)
    // const companyAbbr = company?.CompanyName?.substring(0, 3).toUpperCase() || "DNL";
    
    // Get driver abbreviation (first 3 chars)
    const driverAbbr = driver?.name?.substring(0, 3).toUpperCase() || "";
    
    // Get current date and time in hours format (YYMMDDHH)
    const now = new Date();
    const year = String(now.getFullYear()).slice(-2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hour = String(now.getHours()).padStart(2, '0');
    const dateTimeHours = `${year}${month}${day}${hour}`;
    
    return `${driverAbbr}${dateTimeHours}`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedDriver || !selectedCompany || selectedLoads.length === 0) {
      setError("Please select driver, company, and at least one load");
      return;
    }

    const selectedLoadsData = availableLoads.filter(l => selectedLoads.includes(l.id));
    const grossTotal = selectedLoadsData.reduce((sum, l) => sum + (parseFloat(l.loadAmount) || 0), 0);
    const commissionRate = parseFloat(commission) || 0;
    const totalAmount = grossTotal * (commissionRate / 100);
    const invoiceNumber = generateInvoiceNumber();

    setLoading(true);
    try {
      await createInvoice({
        invoiceNumber: invoiceNumber,
        driverId: selectedDriver,
        companyId: selectedCompany,
        selectedLoadIds: selectedLoads,
        commission: commissionRate,
        totalAmount: totalAmount
      });
      router.push("/invoices");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    try {
      return new Date(dateString).toLocaleDateString(undefined, options);
    } catch (e) {
      return dateString;
    }
  };

  const availableLoads = selectedDriver 
    ? loads.filter(l => (l.driverId ?? l.driverName) == selectedDriver && l.loadStatus == "delivered" && l.payment_status == "unpaid")
    : [];

  const selectedLoadsData = availableLoads.filter(l => selectedLoads.includes(l.id));
  const grossLoadTotal = selectedLoadsData.reduce((sum, l) => sum + (parseFloat(l.loadAmount) || 0), 0);
  const commissionRate = parseFloat(commission) || 0;
  const commissionAmount = grossLoadTotal * (commissionRate / 100);
  const driver = drivers.find(d => d.id == selectedDriver);
  const company = companies.find(c => c.CompanyID == selectedCompany);

  return (
    <div className="p-4 md:p-8 flex flex-col items-center">
      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 w-full max-w-4xl">{error}</div>}

      {/* Form Section */}
      <div className="max-w-4xl w-full mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Create New Invoice</h1>
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Select Driver *</label>
              <select
                value={selectedDriver}
                onChange={e => setSelectedDriver(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Choose a driver</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Select Company *</label>
              <select
                value={selectedCompany}
                onChange={e => setSelectedCompany(e.target.value)}
                required
                className="w-full border border-gray-300 rounded px-3 py-2"
              >
                <option value="">Choose a company</option>
                {companies.map(c => (
                  <option key={c.CompanyID} value={c.CompanyID}>{c.CompanyName}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="commissionPercentage" className="block text-sm font-medium mb-1">Commission Percentage</label>
              <input
                id="commissionPercentage"
                name="commission"
                type="number"
                value={commission}
                onChange={e => setCommission(e.target.value)}
                step="0.01"
                className="w-full border border-gray-300 rounded px-3 py-2"
                autoComplete="off"
              />
            </div>
          </div>

          {/* Loads Selection Table */}
          {availableLoads.length > 0 && (
            <div>
              <h2 className="text-lg font-bold mb-2">Select Loads for Invoice</h2>
              <table className="min-w-full divide-y divide-gray-200 text-blue-900">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-3"></th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase">Date</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase">Load ID</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase">Origin/Dest.</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase">Miles</th>
                    <th className="px-3 py-3 text-left text-xs font-medium uppercase">Pay</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200 text-sm">
                  {availableLoads.map(load => {
                    const miles = parseFloat(load.miles) || 0;
                    const amt = parseFloat(load.loadAmount) || 0;
                    const from = (load.loadFrom || "-").split(" ").slice(0, 6).join(" ");
                    const to = (load.loadTo || "-").split(" ").slice(0, 6).join(" ");
                    return (
                      <tr key={load.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-center">
                          <input
                            id={`select-load-${load.id}`}
                            name="selectedLoads"
                            type="checkbox"
                            checked={selectedLoads.includes(load.id)}
                            onChange={() => handleLoadToggle(load.id)}
                            aria-label={`Select load ${load.loadNumber || load.id}`}
                            autoComplete="off"
                          />
                        </td>
                        <td className="px-3 py-2">{formatDate(load.dateTime)}</td>
                        <td className="px-3 py-2 font-medium text-indigo-600">{load.loadNumber || load.id}</td>
                        <td className="px-3 py-2">{`${from} to ${to}`}</td>
                        <td className="px-3 py-2">{miles || "-"}</td>
                        <td className="px-3 py-2 text-right font-medium">{formatCurrency(amt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-6 rounded"
            >
              {loading ? "Creating..." : "Create Invoice"}
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
      </div>

      {/* Invoice Preview
      {selectedDriver && (
        <div ref={invoiceRef} className="invoice-container bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-100">
          <header className="flex justify-between items-start mb-10 border-b pb-4">
            <div>
              <h1 className="text-4xl font-extrabold text-gray-800">DRIVER SETTLEMENT</h1>
              <p className="text-lg text-indigo-600 font-semibold mt-1">Settlement ID: DRV-{selectedDriver || "00000"}</p>
              <p className="text-sm text-gray-500 mt-1">Issue Date: {formatDate(new Date())}</p>
            </div>
            <div className="text-right">
              <img src={company?.LogoURL || "/DNL_logo.png"} alt="Company Logo" className="h-12 w-auto mb-2 ml-auto rounded-md" />
              <p className="text-xl font-bold text-gray-700">{company?.CompanyName || "Drive Now Logistics"}</p>
              <p className="text-sm text-gray-500">{company?.Address || "123 Main St, City, State"}</p>
              <p className="text-sm text-gray-500">{company?.Phone || "(555) 123-4567"}</p>
            </div>
          </header>

          <section className="mb-10 bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-600">
            <h2 className="text-lg font-bold text-indigo-800 mb-4">SETTLEMENT DETAILS</h2>
            <div className="grid grid-cols-2 gap-8 text-sm text-gray-700">
              <div>
                <h3 className="text-base font-bold text-indigo-700 mb-2">Driver Information</h3>
                <div className="mb-2"><span className="font-semibold">Driver Name:</span> <span className="text-gray-900">{driver?.name || "N/A"}</span></div>
                <div className="mb-2"><span className="font-semibold">MC Number:</span> <span>{driver?.MC_number || "N/A"}</span></div>
                <div className="mb-2"><span className="font-semibold">Contact:</span> <span>{driver?.contactNumber || "N/A"}</span></div>
              </div>
              <div>
                <h3 className="text-base font-bold text-indigo-700 mb-2">Company Account</h3>
                <div className="mb-2"><span className="font-semibold">Bank:</span> <span className="font-mono">{company?.BankName || "Global Transport Bank"}</span></div>
                <div className="mb-2"><span className="font-semibold">IBAN:</span> <span className="text-lg font-extrabold text-indigo-700">{company?.IBAN || "N/A"}</span></div>
                <div className="mb-2"><span className="font-semibold">Holder:</span> <span>{company?.AccountHolder || "N/A"}</span></div>
              </div>
            </div>
          </section>

          <section className="mb-10">
            <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">LOAD SERVICE BREAKDOWN</h2>
            <table className="min-w-full divide-y divide-gray-200 text-blue-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">Load ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">Origin/Dest.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium uppercase">Miles</th>
                  <th className="px-3 py-3 text-right text-xs font-medium uppercase">Pay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {selectedLoadsData.map(load => {
                  const miles = parseFloat(load.miles) || 0;
                  const amt = parseFloat(load.loadAmount) || 0;
                  const from = (load.loadFrom || "-").split(" ").slice(0, 6).join(" ");
                  const to = (load.loadTo || "-").split(" ").slice(0, 6).join(" ");
                  return (
                    <tr key={load.id}>
                      <td className="px-3 py-2">{formatDate(load.dateTime)}</td>
                      <td className="px-3 py-2 font-medium text-indigo-600">{load.loadNumber || load.id}</td>
                      <td className="px-3 py-2">{`${from} to ${to}`}</td>
                      <td className="px-3 py-2">{miles || "-"}</td>
                      <td className="px-3 py-2 text-right font-medium">{formatCurrency(amt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={4}></td>
                  <td className="px-3 py-3 text-right font-bold">TOTAL: {formatCurrency(grossLoadTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </section>

          <section className="mb-10 p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
            <h2 className="text-xl font-bold text-red-700 mb-4">COMMISSION AND FEES</h2>
            <div className="flex justify-between text-lg mb-2">
              <span className="font-medium">Gross Pay:</span>
              <span>{formatCurrency(grossLoadTotal)}</span>
            </div>
            <div className="flex justify-between text-xl font-extrabold">
              <span className="text-red-700">Commission ({commissionRate}%):</span>
              <span className="text-red-700">{formatCurrency(commissionAmount)}</span>
            </div>
          </section>

          <section className="bg-indigo-700 text-white p-6 rounded-lg">
            <div className="flex justify-between text-3xl font-extrabold">
              <span>DUE BALANCE</span>
              <span>{formatCurrency(commissionAmount)}</span>
            </div>
          </section>
           {/* Footer Notes */}
       {/* <footer className="mt-8 text-sm text-gray-600 border-t pt-4">
          <p className="font-semibold">Terms & Notes:</p>
          <p>1. This settlement is based on a dispatch service fee of <span>{commissionRate}%</span> of the total gross income.</p>
          <p>2. Payment will be processed via <span>{driver?.paymentMethod || "Direct Deposit"}</span> within 24 hours.</p>
          <p>3. Drive Now Logistics provides dispatch services to truck owners and drivers. The fee is a fixed percentage of gross income as agreed.</p>
          <p className="mt-4 text-center text-gray-500">Thank you for your reliable service this period!</p>
        </footer>
        {error && <div className="text-red-600 mb-2">{error}</div>}
        </div> */}
      {/* Invoice Container */} 
      <div ref={invoiceRef} className="invoice-container bg-white p-8 md:p-12 rounded-xl shadow-2xl w-full max-w-4xl border border-gray-100">
        {/* ...existing code for invoice, but use selectedLoadsData instead of loads... */}
        <header className="flex justify-between items-start mb-10 border-b pb-4">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-800">INVOICE</h1>
              <p className="text-lg text-indigo-600 font-semibold mt-1">Settlement ID: {generateInvoiceNumber() || "00000"}</p>
            <p className="text-sm text-gray-500 mt-1">Issue Date: {formatDate(new Date())}</p>
            <p className="text-sm text-gray-500">Pay Period: {formatDate(new Date())} to {formatDate(new Date())}</p>
          </div>
          <div className="text-right">
            <Image
              src={company?.LogoURL || "/DNL_logo.png"}
              alt="Company Logo"
              width={160}
              height={48}
              className="h-12 w-auto mb-2 ml-auto rounded-md"
              unoptimized
            />
            <p className="text-xl font-bold text-gray-700">{company?.CompanyName || "Drive Now Logistics"}</p>
              <p className="text-sm text-gray-500">{company?.Address || "123 Main St, City, State"}</p>
              <p className="text-sm text-gray-500">{company?.Phone || "(555) 123-4567"}</p>
          </div>
        </header>
        {/* Payee & Company Account Information */}
        <section className="mb-10 bg-indigo-50 p-4 rounded-lg border-l-4 border-indigo-600">
          <h2 className="text-lg font-bold text-indigo-800 mb-4">SETTLEMENT DETAILS</h2>
          <div className="grid grid-cols-2 gap-8 text-sm text-gray-700">
        {/* {pdf.text(`Settlement ID: DRV-${selectedDriver || "00000"}`, 10, y)}; */}
            <div>
              <h3 className="text-base font-bold text-indigo-700 mb-2">Driver Information</h3>
              <div className="mb-2"><span className="font-semibold">Driver Name:</span> <span className="text-gray-900">{driver?.name || "N/A"}</span></div>
              <div className="mb-2"><span className="font-semibold">MC Number:</span> <span>{driver?.MC_number || "N/A"}</span></div>
              <div className="mb-2"><span className="font-semibold">Contact Number:</span> <span>{driver?.contactNumber || "N/A"}</span></div>
              <div className="mb-2"><span className="font-semibold">Email:</span> <span>{driver?.email || "N/A"}</span></div>
            </div>
            {/* Company Account Info */}
            <div>
               <h3 className="text-base font-bold text-indigo-700 mb-2">Company Account</h3>
                <div className="mb-2"><span className="font-semibold">Bank:</span> <span className="font-mono">{company?.BankName || "Global Transport Bank"}</span></div>
                <div className="mb-2"><span className="font-semibold">IBAN:</span> <span className="text-lg font-extrabold text-indigo-700">{company?.IBAN || "N/A"}</span></div>
                <div className="mb-2"><span className="font-semibold">Holder:</span> <span>{company?.AccountHolder || "N/A"}</span></div>
                {/* <div className="mb-2"><span className="font-semibold">Contact:</span> <span className="font-mono">(555) 123-4567 | info@drivenow.com</span></div> */}
            </div>
          </div>
        {/* Settlement Summary Section */}
        {/* <section className="mb-10 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">Settlement Summary</h2>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div><span className="font-semibold">Gross Income:</span> <span>{formatCurrency(grossLoadTotal)}</span></div>
            <div><span className="font-semibold">Dispatch Service Fee (%):</span> <span>{commissionRate}%</span></div>
            <div><span className="font-semibold">Due Amount:</span> <span>{formatCurrency(commissionAmount)}</span></div>
          </div>
        </section> */}
        </section>
        {/* I. Load Service Breakdown (Table) */}
        <section className="mb-10">
          <h2 className="text-xl font-bold text-gray-700 mb-4 border-b pb-2">I. LOAD SERVICE BREAKDOWN (GROSS PAY)</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-blue-900">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Load ID</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Origin/Dest.</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Miles</th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate/mile</th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Pay</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {selectedLoadsData.map(load => {
                  const miles = parseFloat(load.miles) || 0;
                  const amt = parseFloat(load.loadAmount) || 0;
                  const ratePerMile = miles > 0 ? (amt / miles).toFixed(2) : "-";
                  return (
                    <tr key={load.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 whitespace-nowrap">{formatDate(load.dateTime)}</td>
                      <td className="px-3 py-2 font-medium text-indigo-600 whitespace-nowrap">{load.loadNumber || load.loadId}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{
                        (() => {
                          const from = (load.loadFrom || "-").split(" ").slice(0, 6).join(" ");
                          const to = (load.loadTo || "-").split(" ").slice(0, 6).join(" ");
                          return `${from} to ${to}`;
                        })()
                      }</td>
                      <td className="px-3 py-2 whitespace-nowrap">{miles || "-"}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{ratePerMile}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-right font-medium">{formatCurrency(amt)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100">
                  <td colSpan={5}></td>
                  <td className="px-3 py-3 text-right text-sm font-bold text-gray-700" colSpan={2}>
                    TOTAL GROSS LOAD PAY: {formatCurrency(grossLoadTotal)}
                  </td>
                </tr>
              </tfoot>
            </table>
            {!loading && selectedLoadsData.length === 0 && <div className="text-gray-500 mt-2">No loads selected for invoice.</div>}
          </div>
        </section>
        {/* II. Commission and Fees */}
        <section className="mb-10 p-6 bg-red-50 rounded-lg border-l-4 border-red-600">
          <h2 className="text-xl font-bold text-red-700 mb-4 border-b pb-2">II. COMMISSION AND FEES</h2>
          <div className="flex justify-between text-lg mb-2">
            <span className="font-medium text-gray-800">Gross Pay Subject to Commission:</span>
            <span className="font-semibold text-gray-800">{formatCurrency(grossLoadTotal)}</span>
          </div>
          <div className="flex justify-between text-xl font-extrabold mb-4">
            <span className="font-medium text-red-700">Commission Rate ({commissionRate}%):</span>
            <span className="font-extrabold text-red-700">{formatCurrency(commissionAmount)}</span>
          </div>
        </section>
        {/* III. Payment Instructions for Commission */}
        {/* <section className="mb-10 p-6 bg-gray-50 rounded-lg border-l-4 border-gray-400">
          <h2 className="text-xl font-bold text-gray-700 mb-3 border-b pb-2">III. PAYMENT INSTRUCTIONS</h2>
          <p className="text-sm text-gray-600 mb-3">Please remit the dispatch service fee directly to the company account above within 24 hours.</p>
        </section> */}
        {/* Settlement Summary Section */}
        <section className="mb-10 bg-yellow-50 p-4 rounded-lg border-l-4 border-yellow-600">
          <h2 className="text-lg font-bold text-yellow-800 mb-2">Settlement Summary</h2>
          <div className="grid grid-cols-1 gap-2 text-sm text-gray-700">
            <div><span className="font-semibold">Gross Income:</span> <span>{formatCurrency(grossLoadTotal)}</span></div>
            <div><span className="font-semibold">Dispatch Service Fee (%):</span> <span>{commissionRate}%</span></div>
            <div><span className="font-semibold">Due Amount:</span> <span>{formatCurrency(commissionAmount)}</span></div>
          </div>
        </section>
        {/* Only show NET PAY DUE TO DRIVER as dispatch service fee */}
        <section className="bg-indigo-700 text-white p-6 rounded-lg shadow-xl">
          <div className="flex justify-between text-3xl font-extrabold">
            <span> DUE BALANCE</span>
            <span>{formatCurrency(commissionAmount)}</span>
          </div>
        </section>
        {/* Footer Notes */}
        <footer className="mt-8 text-sm text-gray-600 border-t pt-4">
          <p className="font-semibold">Terms & Notes:</p>
          <p>1. This settlement is based on a dispatch service fee of <span>{commissionRate}%</span> of the total gross income.</p>
          <p>2. Payment will be processed via <span>{driver?.paymentMethod || "Direct Deposit"}</span> within 24 hours.</p>
          <p>3. Drive Now Logistics provides dispatch services to truck owners and drivers. The fee is a fixed percentage of gross income as agreed.</p>
          <p className="mt-4 text-center text-gray-500">Thank you for your reliable service this period!</p>
        </footer>
        {error && <div className="text-red-600 mb-2">{error}</div>}
      </div>
    </div>
  );
}
