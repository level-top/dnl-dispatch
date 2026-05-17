"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  getDrivers,
  createDriver,
  updateDriver,
  deleteDriver,
  uploadDriverDocument,
  deleteDriverDocument,
  getDocumentUrl,
  getDriverExtraDocuments,
  uploadDriverExtraDocuments,
  deleteDriverExtraDocument,
  getStoredUser,
} from "../../utils/api";
import {
  ActionButton,
  DataBadge,
  DataTable,
  DeleteIcon,
  EditIcon,
  HeaderCell,
  LinkBadge,
  TableEmptyState,
} from "../../components/DataTable";

const EMPTY_DRIVER_FORM = {
  name: "",
  MC_number: "",
  truckType: "",
  contactNumber: "",
  email: "",
  joinDate: "",
  sales_agent_id: "",
  percentage: "",
};

function normalizeRole(role) {
  const normalized = String(role || "").toLowerCase().trim();
  if (normalized === "sales_agent" || normalized === "salesagent" || normalized === "sales agent") {
    return "sales";
  }
  return normalized;
}

export default function DriversPage() {
  const [drivers, setDrivers] = useState([]);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(EMPTY_DRIVER_FORM);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extraDocuments, setExtraDocuments] = useState([]);
  const normalizedRole = normalizeRole(me?.role);
  const isSalesUser = normalizedRole === "sales";
  const lockedSalesAgentId = isSalesUser && me?.id != null ? String(me.id) : "";

  const fetchExtraDocuments = async (driverId) => {
    if (!driverId) {
      setExtraDocuments([]);
      return;
    }

    try {
      const docs = await getDriverExtraDocuments(driverId);
      setExtraDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      setExtraDocuments([]);
    }
  };

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      setDrivers(await getDrivers());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  useEffect(() => {
    setMe(getStoredUser());
  }, []);

  useEffect(() => {
    if (!isSalesUser || editingId) return;
    setForm((current) => {
      if (current.sales_agent_id === lockedSalesAgentId) {
        return current;
      }
      return {
        ...current,
        sales_agent_id: lockedSalesAgentId,
      };
    });
  }, [editingId, isSalesUser, lockedSalesAgentId]);

  useEffect(() => {
    fetchExtraDocuments(editingId);
  }, [editingId]);

  const handleChange = e => {
    if (isSalesUser && e.target.name === "sales_agent_id") {
      return;
    }
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await updateDriver(editingId, form);
      } else {
        await createDriver(form);
      }
      setForm({
        ...EMPTY_DRIVER_FORM,
        sales_agent_id: lockedSalesAgentId,
      });
      setEditingId(null);
      fetchDrivers();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleEdit = driver => {
    setForm({
      name: driver.name || "",
      MC_number: driver.MC_number || "",
      truckType: driver.truckType || "",
      contactNumber: driver.contactNumber || "",
      email: driver.email || "",
      joinDate: driver.joinDate ? String(driver.joinDate).slice(0, 10) : "",
      sales_agent_id: driver.sales_agent_id != null ? String(driver.sales_agent_id) : "",
      percentage: driver.percentage || ""
    });
    setEditingId(driver.id);
  };

  useEffect(() => {
    if (editingId || drivers.length === 0) return;
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const idParam = params.get("driverId");
    if (!idParam) return;

    const match = drivers.find((d) => String(d.id) === String(idParam));
    if (!match) return;

    handleEdit(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drivers]);

  const handleDelete = async id => {
    if (!confirm("Delete this driver?")) return;
    setLoading(true);
    try {
      await deleteDriver(id);
      fetchDrivers();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDocumentUpload = async (documentType, file) => {
    if (!editingId) return;
    if (!file) return;

    setLoading(true);
    try {
      await uploadDriverDocument(editingId, documentType, file);
      await fetchDrivers();
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDocumentDelete = async (documentType) => {
    if (!editingId) return;
    if (!confirm("Delete this document?")) return;

    setLoading(true);
    try {
      await deleteDriverDocument(editingId, documentType);
      await fetchDrivers();
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleExtraDocumentsUpload = async (files) => {
    if (!editingId) return;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      await uploadDriverExtraDocuments(editingId, files);
      await fetchExtraDocuments(editingId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleExtraDocumentDelete = async (docId) => {
    if (!editingId || !docId) return;
    if (!confirm('Delete this extra document?')) return;

    setLoading(true);
    try {
      await deleteDriverExtraDocument(editingId, docId);
      await fetchExtraDocuments(editingId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const editingDriver = editingId ? drivers.find((d) => d.id === editingId) : null;
  const getFilenameFromPath = (p) => (p ? String(p).split("/").pop() : "");

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
        <div className="flex items-start justify-between gap-3 mb-6">
          <h1 className="text-2xl font-semibold text-blue-900 tracking-tight">Drivers</h1>
          {String(me?.role || '').toLowerCase() === 'admin' ? (
            <Link
              href="/agreement-template"
              className="border border-gray-300 hover:border-gray-400 text-gray-800 text-sm font-semibold px-3 py-2 rounded"
            >
              Agreement Template
            </Link>
          ) : null}
        </div>
        <form onSubmit={handleSubmit} className="grid text-blue-900 grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">Name</label>
            <input id="name" name="name" type="text" value={form.name} onChange={handleChange} placeholder="Name" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required autoComplete="name" />
          </div>
          <div>
            <label htmlFor="MC_number" className="block mb-1 font-medium">MC Number</label>
            <input id="MC_number" name="MC_number" type="text" value={form.MC_number} onChange={handleChange} placeholder="MC Number" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required autoComplete="off" />
          </div>
          <div>
            <label htmlFor="truckType" className="block mb-1 font-medium">Truck Type</label>
            <input id="truckType" name="truckType" type="text" value={form.truckType} onChange={handleChange} placeholder="Truck Type" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required autoComplete="off" />
          </div>
          <div>
            <label htmlFor="contactNumber" className="block mb-1 font-medium">Contact Number</label>
            <input id="contactNumber" name="contactNumber" type="tel" value={form.contactNumber} onChange={handleChange} placeholder="Contact Number" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required autoComplete="email" autoCapitalize="none" spellCheck={false} />
          </div>
          <div>
            <label htmlFor="joinDate" className="block mb-1 font-medium">Join Date</label>
            <input id="joinDate" name="joinDate" value={form.joinDate} onChange={handleChange} placeholder="Join Date" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" type="date" required autoComplete="off" />
          </div>
          <div>
            <label htmlFor="sales_agent_id" className="block mb-1 font-medium">Sales Agent ID</label>
            <input id="sales_agent_id" name="sales_agent_id" type="text" value={form.sales_agent_id} onChange={handleChange} placeholder="Sales Agent ID" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed" autoComplete="off" readOnly={isSalesUser} disabled={isSalesUser} />
          </div>
          <div>
            <label htmlFor="percentage" className="block mb-1 font-medium">Percentage</label>
            <input id="percentage" name="percentage" type="number" value={form.percentage} onChange={handleChange} placeholder="Percentage" className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" autoComplete="off" step="0.01" />
          </div>
          <div className="flex gap-2 mt-2 md:col-span-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition disabled:opacity-60" disabled={loading}>
              {editingId ? "Update" : "Add"} Driver
            </button>
            {editingId && (
              <button
                type="button"
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg shadow transition"
                onClick={() => {
                  setForm({
                    ...EMPTY_DRIVER_FORM,
                    sales_agent_id: lockedSalesAgentId,
                  });
                  setEditingId(null);
                  setError("");
                }}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && <div className="text-red-600 mb-2 text-sm font-medium">{error}</div>}

        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-900">Driver Documents</h2>
            {!editingId && (
              <span className="text-xs text-gray-500">Save driver first to enable uploads</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="driver-doc-license-front" className="block mb-1 font-medium">Driver License (Front)</label>
              <input
                id="driver-doc-license-front"
                name="driverLicenseFront"
                type="file"
                disabled={!editingId || loading}
                onChange={(e) => handleDocumentUpload("driverLicenseFront", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                autoComplete="off"
              />
              {editingDriver?.driverLicenseFrontPath && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="mr-2">Current: {getFilenameFromPath(editingDriver.driverLicenseFrontPath)}</span>
                  <a
                    className="text-blue-700 hover:underline"
                    href={getDocumentUrl(editingDriver.driverLicenseFrontPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              )}
              <button
                type="button"
                disabled={!editingId || loading || !editingDriver?.driverLicenseFrontPath}
                onClick={() => handleDocumentDelete("driverLicenseFront")}
                className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>

            <div>
              <label htmlFor="driver-doc-license-back" className="block mb-1 font-medium">Driver License (Back)</label>
              <input
                id="driver-doc-license-back"
                name="driverLicenseBack"
                type="file"
                disabled={!editingId || loading}
                onChange={(e) => handleDocumentUpload("driverLicenseBack", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                autoComplete="off"
              />
              {editingDriver?.driverLicenseBackPath && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="mr-2">Current: {getFilenameFromPath(editingDriver.driverLicenseBackPath)}</span>
                  <a
                    className="text-blue-700 hover:underline"
                    href={getDocumentUrl(editingDriver.driverLicenseBackPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              )}
              <button
                type="button"
                disabled={!editingId || loading || !editingDriver?.driverLicenseBackPath}
                onClick={() => handleDocumentDelete("driverLicenseBack")}
                className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>

            <div>
              <label htmlFor="driver-doc-coi" className="block mb-1 font-medium">COI</label>
              <input
                id="driver-doc-coi"
                name="coi"
                type="file"
                disabled={!editingId || loading}
                onChange={(e) => handleDocumentUpload("coi", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                autoComplete="off"
              />
              {editingDriver?.coiDocumentPath && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="mr-2">Current: {getFilenameFromPath(editingDriver.coiDocumentPath)}</span>
                  <a
                    className="text-blue-700 hover:underline"
                    href={getDocumentUrl(editingDriver.coiDocumentPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              )}
              <button
                type="button"
                disabled={!editingId || loading || !editingDriver?.coiDocumentPath}
                onClick={() => handleDocumentDelete("coi")}
                className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>

            <div>
              <label htmlFor="driver-doc-mc-authority" className="block mb-1 font-medium">MC Authority</label>
              <input
                id="driver-doc-mc-authority"
                name="mcAuthority"
                type="file"
                disabled={!editingId || loading}
                onChange={(e) => handleDocumentUpload("mcAuthority", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                autoComplete="off"
              />
              {editingDriver?.mcAuthorityDocumentPath && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="mr-2">Current: {getFilenameFromPath(editingDriver.mcAuthorityDocumentPath)}</span>
                  <a
                    className="text-blue-700 hover:underline"
                    href={getDocumentUrl(editingDriver.mcAuthorityDocumentPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              )}
              <button
                type="button"
                disabled={!editingId || loading || !editingDriver?.mcAuthorityDocumentPath}
                onClick={() => handleDocumentDelete("mcAuthority")}
                className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>

            <div>
              <label htmlFor="driver-doc-w9" className="block mb-1 font-medium">W-9</label>
              <input
                id="driver-doc-w9"
                name="w9"
                type="file"
                disabled={!editingId || loading}
                onChange={(e) => handleDocumentUpload("w9", e.target.files?.[0])}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                autoComplete="off"
              />
              {editingDriver?.w9DocumentPath && (
                <div className="mt-2 text-sm text-gray-600">
                  <span className="mr-2">Current: {getFilenameFromPath(editingDriver.w9DocumentPath)}</span>
                  <a
                    className="text-blue-700 hover:underline"
                    href={getDocumentUrl(editingDriver.w9DocumentPath)}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                </div>
              )}
              <button
                type="button"
                disabled={!editingId || loading || !editingDriver?.w9DocumentPath}
                onClick={() => handleDocumentDelete("w9")}
                className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
              >
                Delete
              </button>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-900">Extra Documents</h2>
            {!editingId && (
              <span className="text-xs text-gray-500">Save driver first to enable uploads</span>
            )}
          </div>

          <label htmlFor="driver-extra-documents" className="sr-only">Upload extra documents</label>
          <input
            id="driver-extra-documents"
            name="extraDocuments"
            type="file"
            multiple
            disabled={!editingId || loading}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleExtraDocumentsUpload(files);
              e.target.value = "";
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
            autoComplete="off"
            aria-label="Upload extra documents"
          />

          <div className="mt-3 rounded-lg border border-gray-200 bg-white">
            {extraDocuments.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No extra documents uploaded.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {extraDocuments.map((doc) => (
                  <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2">
                    <div className="text-sm text-gray-700 break-words">
                      <div className="font-medium">{doc.originalName || doc.storedName}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <a
                        className="text-sm text-blue-700 hover:underline"
                        href={getDocumentUrl(doc.path)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open
                      </a>
                      <button
                        type="button"
                        disabled={loading}
                        onClick={() => handleExtraDocumentDelete(doc.id)}
                        className="text-sm text-red-700 hover:underline disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DataTable>
          <thead>
            <tr>
              <HeaderCell>Name</HeaderCell>
              <HeaderCell>MC #</HeaderCell>
              <HeaderCell>Truck Type</HeaderCell>
              <HeaderCell>Contact</HeaderCell>
              <HeaderCell>Email</HeaderCell>
              <HeaderCell>Join Date</HeaderCell>
              <HeaderCell>Sales Agent</HeaderCell>
              <HeaderCell>Percentage</HeaderCell>
              <HeaderCell>Docs</HeaderCell>
              <HeaderCell>Actions</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {drivers.length === 0 ? (
              <TableEmptyState colSpan={10} title="No drivers found" description="Create a driver to start assigning loads and documents." />
            ) : drivers.map(driver => (
              <tr key={driver.id} className="text-slate-900 transition hover:bg-sky-50/70">
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <Link
                    href={`/drivers/${driver.id}`}
                    className="font-semibold text-sky-700 hover:underline"
                    title="Open driver details"
                  >
                    {driver.name}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">{driver.MC_number || "-"}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap"><DataBadge tone="violet">{driver.truckType || "Not set"}</DataBadge></td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">{driver.contactNumber || "-"}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">{driver.email || "-"}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">{driver.joinDate ? String(driver.joinDate).slice(0, 10) : "-"}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">{driver.sales_agent_id || "-"}</td>
                <td className="px-4 py-3 text-sm whitespace-nowrap"><DataBadge tone="info">{driver.percentage || "0"}%</DataBadge></td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex flex-wrap gap-2 items-center">
                    {driver.driverLicenseFrontPath && (
                      <LinkBadge href={getDocumentUrl(driver.driverLicenseFrontPath)} title="Driver License Front">DL-F</LinkBadge>
                    )}
                    {driver.driverLicenseBackPath && (
                      <LinkBadge href={getDocumentUrl(driver.driverLicenseBackPath)} title="Driver License Back">DL-B</LinkBadge>
                    )}
                    {driver.coiDocumentPath && (
                      <LinkBadge href={getDocumentUrl(driver.coiDocumentPath)} title="COI">COI</LinkBadge>
                    )}
                    {driver.mcAuthorityDocumentPath && (
                      <LinkBadge href={getDocumentUrl(driver.mcAuthorityDocumentPath)} title="MC Authority">MC</LinkBadge>
                    )}
                    {driver.w9DocumentPath && (
                      <LinkBadge href={getDocumentUrl(driver.w9DocumentPath)} title="W-9">W9</LinkBadge>
                    )}
                    {!driver.driverLicenseFrontPath &&
                      !driver.driverLicenseBackPath &&
                      !driver.coiDocumentPath &&
                      !driver.mcAuthorityDocumentPath &&
                      !driver.w9DocumentPath && (
                        <DataBadge>No docs</DataBadge>
                      )}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm whitespace-nowrap">
                  <div className="flex gap-2">
                    <ActionButton variant="primary" icon={<EditIcon />} onClick={() => handleEdit(driver)}>Edit</ActionButton>
                    <ActionButton variant="danger" icon={<DeleteIcon />} onClick={() => handleDelete(driver.id)}>Delete</ActionButton>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}
