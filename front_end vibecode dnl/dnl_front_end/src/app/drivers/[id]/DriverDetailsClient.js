"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
	createDriverAgreement,
	deleteDriverDocument,
	deleteDriverExtraDocument,
	getDocumentUrl,
	getDriver,
	getDriverExtraDocuments,
  getStoredUser,
	listDriverAgreements,
	uploadDriverDocument,
	uploadDriverExtraDocuments,
} from "../../../utils/api";

const ACCEPTED_TYPES = ".pdf,.png,.jpg,.jpeg,.doc,.docx";

function getFilenameFromPath(path) {
	if (!path) return "";
	return String(path).split("/").pop() || "";
}

export default function DriverDetailsClient({ driverId }) {
	const normalizedDriverId = useMemo(() => {
		if (driverId === null || driverId === undefined) return null;
		const n = Number(driverId);
		if (!Number.isFinite(n)) return null;
		return String(driverId);
	}, [driverId]);

	const [driver, setDriver] = useState(null);
	const [extraDocuments, setExtraDocuments] = useState([]);
	const [agreements, setAgreements] = useState([]);
  const [me, setMe] = useState(null);
	const [latestSigningLink, setLatestSigningLink] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [copiedKey, setCopiedKey] = useState(null);

  useEffect(() => {
    setMe(getStoredUser());
  }, []);

	const copyToClipboard = async (value, key) => {
		if (value === null || value === undefined || value === "") return;
		const text = String(value);

		const markCopied = () => {
			setCopiedKey(key);
			window.setTimeout(() => setCopiedKey(null), 1200);
		};

		try {
			if (navigator?.clipboard?.writeText) {
				await navigator.clipboard.writeText(text);
				markCopied();
				return;
			}
		} catch {
			// fall through
		}

		try {
			const textarea = document.createElement("textarea");
			textarea.value = text;
			textarea.setAttribute("readonly", "");
			textarea.style.position = "fixed";
			textarea.style.top = "-9999px";
			document.body.appendChild(textarea);
			textarea.select();
			document.execCommand("copy");
			document.body.removeChild(textarea);
			markCopied();
		} catch {
			// ignore
		}
	};

	const CopyButton = ({ value, copyKey, ariaLabel }) => (
		<button
			type="button"
			onClick={() => copyToClipboard(value, copyKey)}
			className="inline-flex items-center gap-1 text-gray-500 hover:text-gray-800 disabled:opacity-50"
			disabled={loading || value === null || value === undefined || value === ""}
			aria-label={ariaLabel}
			title="Copy"
		>
			<svg
				xmlns="http://www.w3.org/2000/svg"
				width="16"
				height="16"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			>
				<rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
				<path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
			</svg>
			{copiedKey === copyKey ? (
				<span className="text-xs text-green-700">Copied</span>
			) : null}
		</button>
	);

	const docCards = useMemo(
		() => [
			{
				key: "driverLicenseFront",
				label: "Driver License (Front)",
				pathKey: "driverLicenseFrontPath",
			},
			{
				key: "driverLicenseBack",
				label: "Driver License (Back)",
				pathKey: "driverLicenseBackPath",
			},
			{
				key: "coi",
				label: "COI",
				pathKey: "coiDocumentPath",
			},
			{
				key: "mcAuthority",
				label: "MC Authority",
				pathKey: "mcAuthorityDocumentPath",
			},
			{
				key: "w9",
				label: "W-9",
				pathKey: "w9DocumentPath",
			},
		],
		[]
	);

	const fetchAll = useCallback(async (id) => {
		if (!id) return;
		setLoading(true);
		try {
			const d = await getDriver(id);
			setDriver(d);

			const extra = await getDriverExtraDocuments(id);
			setExtraDocuments(Array.isArray(extra) ? extra : []);

			try {
				const a = await listDriverAgreements(id);
				setAgreements(Array.isArray(a) ? a : []);
			} catch {
				setAgreements([]);
			}

			setError("");
		} catch (e) {
			setError(e?.message || "Failed to load driver");
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchAll(normalizedDriverId);
	}, [normalizedDriverId, fetchAll]);

	const createAgreementLink = async () => {
		if (!normalizedDriverId) return;

		setLoading(true);
		try {
			const resp = await createDriverAgreement(normalizedDriverId, { expiresInDays: 30 });
			const token = resp?.token;
			if (!token) throw new Error("No token returned");

			const link = `${window.location.origin}/sign/driver-agreement/${token}`;
			setLatestSigningLink(link);
			await copyToClipboard(link, "agreementLink");
			await fetchAll(normalizedDriverId);
			setError("");
		} catch (e) {
			setError(e?.message || "Failed to create agreement link");
		} finally {
			setLoading(false);
		}
	};

	const handleDocumentUpload = async (documentType, file) => {
		if (!normalizedDriverId || !file) return;
		setLoading(true);
		try {
      await uploadDriverDocument(normalizedDriverId, documentType, file);
 		await fetchAll(normalizedDriverId);
 		setError("");
 	} catch (e) {
 		setError(e?.message || "Upload failed");
 	} finally {
 		setLoading(false);
 	}
	};

  const handleDocumentDelete = async (documentType) => {
    if (!normalizedDriverId) return;
    if (!confirm("Delete this document?")) return;

    setLoading(true);
    try {
      await deleteDriverDocument(normalizedDriverId, documentType);
      await fetchAll(normalizedDriverId);
      setError("");
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExtraDocumentsUpload = async (files) => {
    if (!normalizedDriverId) return;
    if (!files || files.length === 0) return;

    setLoading(true);
    try {
      await uploadDriverExtraDocuments(normalizedDriverId, files);
      await fetchAll(normalizedDriverId);
      setError("");
    } catch (e) {
      setError(e?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  const handleExtraDocumentDelete = async (docId) => {
    if (!normalizedDriverId || !docId) return;
    if (!confirm("Delete this extra document?")) return;

    setLoading(true);
    try {
      await deleteDriverExtraDocument(normalizedDriverId, docId);
      await fetchAll(normalizedDriverId);
      setError("");
    } catch (e) {
      setError(e?.message || "Delete failed");
    } finally {
      setLoading(false);
    }
  };

  if (!normalizedDriverId) {
    return (
      <div className="max-w-5xl mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-2">
          <div className="text-red-700 font-medium">Invalid driver id.</div>
          <div className="mt-3">
            <Link className="text-blue-700 hover:underline" href="/drivers">
              Back to Drivers
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900 tracking-tight">Driver Details</h1>
            <div className="text-sm text-gray-600 mt-1">Driver ID: {normalizedDriverId}</div>
          </div>
          <Link className="text-blue-700 hover:underline" href="/drivers">
            Back to Drivers
          </Link>
        </div>

        {error ? <div className="text-red-600 mt-3 text-sm font-medium">{error}</div> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Information</h2>
            <div className="text-sm text-gray-800 grid grid-cols-1 gap-2">
              <div>
                <span className="text-gray-500">Name:</span> {driver?.name || "-"}
              </div>
              <div>
                <span className="text-gray-500">MC #:</span>{" "}
                <span className="inline-flex items-center gap-2">
                  <span>{driver?.MC_number || "-"}</span>
                  <CopyButton value={driver?.MC_number} copyKey="mc" ariaLabel="Copy MC number" />
                </span>
              </div>
              <div>
                <span className="text-gray-500">Truck Type:</span> {driver?.truckType || "-"}
              </div>
              <div>
                <span className="text-gray-500">Contact:</span>{" "}
                <span className="inline-flex items-center gap-2">
                  <span>{driver?.contactNumber || "-"}</span>
                  <CopyButton value={driver?.contactNumber} copyKey="contact" ariaLabel="Copy contact number" />
                </span>
              </div>
              <div>
                <span className="text-gray-500">Email:</span>{" "}
                <span className="inline-flex items-center gap-2">
                  <span>{driver?.email || "-"}</span>
                  <CopyButton value={driver?.email} copyKey="email" ariaLabel="Copy email" />
                </span>
              </div>
              <div>
                <span className="text-gray-500">Join Date:</span>{" "}
                {driver?.joinDate ? String(driver.joinDate).slice(0, 10) : "-"}
              </div>
              <div>
                <span className="text-gray-500">Sales Agent:</span> {driver?.sales_agent_id || "-"}
              </div>
              <div>
                <span className="text-gray-500">Percentage:</span> {driver?.percentage || "-"}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-blue-900 mb-3">Standard Documents</h2>
            <div className="grid grid-cols-1 gap-4">
              {docCards.map((doc) => {
                const path = driver?.[doc.pathKey];
                const inputId = `driver-doc-${doc.key}`;
                return (
                  <div key={doc.key} className="rounded-lg border border-gray-200 p-3">
                    <label htmlFor={inputId} className="text-sm font-medium text-gray-900 mb-2 block">
                      {doc.label}
                    </label>

                    <input
                      id={inputId}
                      name={doc.key}
                      type="file"
                      disabled={loading}
                      accept={ACCEPTED_TYPES}
                      onChange={(e) => handleDocumentUpload(doc.key, e.target.files?.[0])}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
                      autoComplete="off"
                    />

                    {path ? (
                      <div className="mt-2 text-sm text-gray-600">
                        <span className="mr-2">Current: {getFilenameFromPath(path)}</span>
                        <a
                          className="text-blue-700 hover:underline"
                          href={getDocumentUrl(path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                      </div>
                    ) : (
                      <div className="mt-2 text-xs text-gray-500">No file uploaded.</div>
                    )}

                    <button
                      type="button"
                      disabled={loading || !path}
                      onClick={() => handleDocumentDelete(doc.key)}
                      className="mt-2 text-sm text-red-700 hover:underline disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold text-blue-900">Extra Documents</h2>
            <div className="text-xs text-gray-500">Max 10MB per file</div>
          </div>

          <label htmlFor="driver-extra-documents" className="sr-only">Upload extra documents</label>
          <input
            id="driver-extra-documents"
            name="extraDocuments"
            type="file"
            multiple
            disabled={loading}
            accept={ACCEPTED_TYPES}
            onChange={(e) => {
              const files = Array.from(e.target.files || []);
              if (files.length) handleExtraDocumentsUpload(files);
              e.target.value = "";
            }}
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-60"
            autoComplete="off"
            aria-label="Upload extra documents"
          />

          <div className="mt-3 rounded-lg border border-gray-200 bg-white">
            {extraDocuments.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No extra documents uploaded.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {extraDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2"
                  >
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

        <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h2 className="text-lg font-semibold text-blue-900">Driver Agreement</h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {String(me?.role || "").toLowerCase() === "admin" ? (
                <Link
                  className="border border-gray-300 hover:border-gray-400 text-gray-800 text-sm font-semibold px-3 py-2 rounded text-center"
                  href="/agreement-template"
                >
                  Edit agreement template
                </Link>
              ) : null}
              <button
                type="button"
                onClick={createAgreementLink}
                disabled={loading}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded"
              >
                Create signing link
              </button>
            </div>
          </div>

          <div className="text-xs text-gray-500 mb-3">This creates a unique link. Anyone with the link can sign.</div>

          {latestSigningLink ? (
            <div className="rounded-lg border border-gray-200 bg-white p-3 mb-3">
              <div className="text-xs text-gray-500 mb-1">Latest link (copied)</div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <a
                  href={latestSigningLink}
                  className="text-sm text-blue-700 hover:underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  {latestSigningLink}
                </a>
                <CopyButton value={latestSigningLink} copyKey="agreementLink" ariaLabel="Copy agreement link" />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-gray-200 bg-white">
            {agreements.length === 0 ? (
              <div className="px-3 py-2 text-sm text-gray-500">No agreements created yet.</div>
            ) : (
              <div className="divide-y divide-gray-200">
                {agreements.map((a) => (
                  <div
                    key={a.id}
                    className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2"
                  >
                    <div className="text-sm text-gray-700">
                      <div className="font-medium">Agreement</div>
                      <div className="text-xs text-gray-500">
                        Status: {a.status}
                        {a.signedAt ? ` • Signed: ${String(a.signedAt).slice(0, 10)}` : ""}
                        {a.viewedAt ? ` • Viewed: ${String(a.viewedAt).slice(0, 10)}` : ""}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {a.signedPdfPath ? (
                        <a
                          className="text-sm text-blue-700 hover:underline"
                          href={getDocumentUrl(a.signedPdfPath)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open signed PDF
                        </a>
                      ) : (
                        <span className="text-xs text-gray-500">No PDF yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {loading ? <div className="mt-4 text-sm text-gray-500">Working…</div> : null}
      </div>
    </div>
  );
}
