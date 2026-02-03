"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
	deleteLoadExtraDocument,
	getDocumentUrl,
	getLoadExtraDocuments,
	uploadLoadExtraDocuments,
} from "../utils/api";

function formatDateTime(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleString();
}

function formatDate(value) {
	if (!value) return "";
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return date.toLocaleDateString();
}

function formatMoney(value) {
	const num = Number(value);
	if (Number.isNaN(num)) return value ? String(value) : "";
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
		maximumFractionDigits: 2,
	}).format(num);
}

function Field({ label, value }) {
	const display = value === null || value === undefined || value === "" ? "-" : String(value);
	return (
		<div className="flex items-start justify-between gap-4 px-3 py-2">
			<div className="text-xs font-semibold text-gray-600">{label}</div>
			<div className="text-sm text-gray-900 text-right break-words">{display}</div>
		</div>
	);
}

function DocRow({ label, status, path }) {
	const url = getDocumentUrl(path);
	const normalizedStatus = String(status || "").toLowerCase();
	const statusClass =
		normalizedStatus === "received"
			? "text-green-700"
			: normalizedStatus === "submitted"
				? "text-blue-700"
				: "text-gray-600";

	return (
		<div className="flex items-center justify-between gap-4 px-3 py-2">
			<div className="text-xs font-semibold text-gray-600">{label}</div>
			<div className="flex items-center gap-2">
				<div className={`text-sm ${statusClass}`}>{status || "pending"}</div>
				{url ? (
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-sm text-blue-700 hover:underline"
					>
						Open
					</a>
				) : (
					<div className="text-sm text-gray-400">No file</div>
				)}
			</div>
		</div>
	);
}

export default function LoadDetailsTemplate({
	load,
	driverName,
	dispatcherName,
	companyFee,
	commissionPercent,
}) {
	const [extraDocuments, setExtraDocuments] = useState([]);
	const [extraFiles, setExtraFiles] = useState(null);
	const [extraLoading, setExtraLoading] = useState(false);
	const [extraError, setExtraError] = useState("");

	const loadId = load?.id;

	const fetchExtraDocuments = useCallback(async (id) => {
		if (!id) {
			setExtraDocuments([]);
			return;
		}
		try {
			const docs = await getLoadExtraDocuments(id);
			setExtraDocuments(Array.isArray(docs) ? docs : []);
			setExtraError("");
		} catch (e) {
			setExtraDocuments([]);
			setExtraError(e?.message || "Failed to load extra documents");
		}
	}, []);

	useEffect(() => {
		fetchExtraDocuments(loadId);
	}, [loadId, fetchExtraDocuments]);

	if (!load) return null;

	const handleExtraUpload = async () => {
		if (!loadId) return;
		const files = extraFiles ? Array.from(extraFiles) : [];
		if (files.length === 0) return;

		setExtraLoading(true);
		try {
			await uploadLoadExtraDocuments(loadId, files);
			setExtraFiles(null);
			await fetchExtraDocuments(loadId);
			setExtraError("");
		} catch (e) {
			setExtraError(e?.message || "Failed to upload extra documents");
		} finally {
			setExtraLoading(false);
		}
	};

	const handleExtraDelete = async (docId) => {
		if (!loadId || !docId) return;
		if (!confirm("Delete this extra document?")) return;

		setExtraLoading(true);
		try {
			await deleteLoadExtraDocument(loadId, docId);
			await fetchExtraDocuments(loadId);
			setExtraError("");
		} catch (e) {
			setExtraError(e?.message || "Failed to delete extra document");
		} finally {
			setExtraLoading(false);
		}
	};

	const loadDriverId = load.driverId ?? load.driverName;
	const driverIdParam = (() => {
		const raw = load.driverId ?? null;
		if (raw === null || raw === undefined || raw === "") return null;
		const num = Number(raw);
		if (!Number.isFinite(num)) return null;
		return String(raw);
	})();
	const rpm = (() => {
		const amt = parseFloat(load.loadAmount);
		const miles = parseFloat(load.miles);
		if (Number.isNaN(amt) || Number.isNaN(miles) || miles <= 0) return "";
		return (amt / miles).toFixed(2);
	})();

	const coreFields = [
		{ label: "Load ID", value: load.id },
		{ label: "Load #", value: load.loadNumber },
		{ label: "Status", value: load.loadStatus },
		{ label: "Payment Status", value: load.payment_status },
		{ label: "Invoice #", value: load.invoice_number },
		...(String(load.loadStatus || "").toLowerCase() === "canceled"
			? [{ label: "Canceled Reason", value: load.canceled_reason }]
			: []),
	];

	const peopleFields = [
		{ label: "Driver", value: driverName || loadDriverId },
		{ label: "Dispatcher", value: dispatcherName || load.dispatcherId },
		{ label: "Broker Company", value: load.brokerCompany },
		{ label: "Broker MC", value: load.brokerMC },
		{ label: "Broker Name", value: load.brokerName },
	];

	const routeFields = [
		{ label: "From", value: load.loadFrom },
		{ label: "To", value: load.loadTo },
		{ label: "Pickup", value: formatDateTime(load.pickedUp_dateTime) },
		{ label: "Dropoff", value: formatDateTime(load.dropOff_dateTime) },
		{ label: "Delivered", value: formatDateTime(load.delivered_at) },
	];

	const moneyFields = [
		{ label: "Amount", value: formatMoney(load.loadAmount) },
		{ label: "Miles", value: load.miles },
		{ label: "RPM", value: rpm },
		{ label: "Commission %", value: commissionPercent ?? load.commission_rate_override },
		{
			label: "Company Fee",
			value:
				companyFee !== undefined ? formatMoney(companyFee) : formatMoney(load.netAmount),
		},
		{ label: "Equipment", value: load.equipmentType },
		{ label: "Category", value: load.loadCategory },
		{ label: "Payment Terms", value: load.paymentTerms },
		{ label: "QuickPay Fee %", value: load.quickPayFee },
		{ label: "Expected Payment", value: formatDate(load.expectedPaymentDate) },
	];

	const auditFields = [{ label: "Created", value: formatDateTime(load.dateTime) }];

	const FieldList = ({ title, fields }) => (
		<div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
			<div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
				<div className="text-xs font-semibold text-gray-700">{title}</div>
			</div>
			<div className="divide-y divide-gray-200">
				{fields.map((f, idx) => (
					<div key={`${f.label}-${idx}`} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
						<Field label={f.label} value={f.value} />
					</div>
				))}
			</div>
		</div>
	);

	const DocsList = () => (
		<div className="rounded-lg border border-gray-200 bg-white overflow-hidden">
			<div className="px-3 py-2 bg-gray-50 border-b border-gray-200">
				<div className="text-xs font-semibold text-gray-700">Documents</div>
			</div>
			<div className="divide-y divide-gray-200">
				{[
					{ label: "BOL", status: load.bolStatus, path: load.bolDocumentPath },
					{ label: "POD", status: load.podStatus, path: load.podDocumentPath },
					{ label: "Rate Conf", status: load.rateConfStatus, path: load.rateConfDocumentPath },
				].map((d, idx) => (
					<div key={d.label} className={idx % 2 === 0 ? "bg-white" : "bg-gray-50"}>
						<DocRow label={d.label} status={d.status} path={d.path} />
					</div>
				))}
			</div>
		</div>
	);

	return (
		<div className="rounded-lg bg-white">
			<div className="flex flex-wrap items-center justify-between gap-2 mb-2">
				<div className="text-sm font-semibold text-gray-900">
					Load #{load.loadNumber || load.id}
				</div>
				<div className="flex items-center gap-3">
					{driverIdParam ? (
						<Link
							href={`/drivers?driverId=${encodeURIComponent(driverIdParam)}`}
							className="text-xs font-medium text-blue-700 hover:underline"
							title="Open this driver in Drivers page"
						>
							Driver Documents
						</Link>
					) : null}
					<div className="text-xs text-gray-600">
					Status: <span className="font-medium text-gray-900">{load.loadStatus || "-"}</span>
					{load.payment_status ? (
						<>
							<span className="mx-2 text-gray-300">|</span>
							Payment: <span className="font-medium text-gray-900">{load.payment_status}</span>
						</>
					) : null}
				</div>
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
				<FieldList title="Core" fields={coreFields} />
				<FieldList title="People" fields={peopleFields} />
				<FieldList title="Route" fields={routeFields} />
				<FieldList title="Money" fields={moneyFields} />
			</div>

			<div className="mt-3">
				<DocsList />
			</div>

			<div className="mt-3 rounded-lg border border-gray-200 bg-white overflow-hidden">
				<div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between gap-2">
					<div className="text-xs font-semibold text-gray-700">Extra Documents</div>
					{!loadId ? (
						<div className="text-xs text-gray-500">Save/load first</div>
					) : null}
				</div>
				<div className="p-3">
					{extraError ? <div className="text-xs text-red-600 mb-2">{extraError}</div> : null}
					<div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between mb-3">
						<label className="text-sm text-gray-700">
							<span className="sr-only">Upload extra documents</span>
							<input
								id="extra-documents"
								name="extraDocuments"
								type="file"
								multiple
								disabled={!loadId || extraLoading}
								onChange={(e) => setExtraFiles(e.target.files)}
								className="text-sm"
								autoComplete="off"
								aria-label="Upload extra documents"
							/>
						</label>
						<button
							type="button"
							onClick={handleExtraUpload}
							disabled={!loadId || extraLoading || !extraFiles || extraFiles.length === 0}
							className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded"
						>
							{extraLoading ? "Working..." : "Upload"}
						</button>
					</div>

					{extraDocuments.length === 0 ? (
						<div className="text-sm text-gray-500">No extra documents uploaded.</div>
					) : (
						<div className="space-y-2">
							{extraDocuments.map((doc) => {
								const url = getDocumentUrl(doc.path);
								return (
									<div
										key={doc.id}
										className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border rounded p-2"
									>
										<div>
											<div className="text-sm text-gray-900 font-medium">
												{doc.originalName || doc.storedName || "Document"}
											</div>
											<div className="text-xs text-gray-500">
												Uploaded: {formatDateTime(doc.uploadedAt)}
											</div>
										</div>
										<div className="flex items-center gap-3">
											{url ? (
												<a
													href={url}
													target="_blank"
													rel="noopener noreferrer"
													className="text-sm text-blue-700 hover:underline"
												>
													Open
												</a>
											) : null}
											<button
												type="button"
												onClick={() => handleExtraDelete(doc.id)}
												disabled={extraLoading}
												className="text-sm text-red-600 hover:underline disabled:opacity-60"
											>
												Delete
											</button>
										</div>
									</div>
								);
							})}
						</div>
					)}
				</div>
			</div>

			<div className="mt-3">
				<FieldList title="Audit" fields={auditFields} />
			</div>
		</div>
	);
}
