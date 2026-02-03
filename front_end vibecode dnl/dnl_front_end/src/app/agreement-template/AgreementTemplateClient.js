"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAgreementTemplate, updateAgreementTemplate } from "../../utils/api";

const DEFAULT_TEMPLATE = `
<p class="p">This agreement is between <strong>{{company.name}}</strong> (the “Company”) and <strong>{{driver.name}}</strong> (the “Driver”).</p>
<p class="p">By signing, the Driver agrees to the terms and conditions described in this document.</p>

<p class="p"><strong>Driver Info</strong></p>
<ul>
  <li>Name: {{driver.name}}</li>
  <li>MC #: {{driver.mcNumber}}</li>
	<li>Truck Type: {{driver.truckType}}</li>
  <li>Contact: {{driver.contactNumber}}</li>
  <li>Email: {{driver.email}}</li>
	<li>Percentage: {{driver.percentage}}</li>
</ul>

<p class="p"><strong>Terms</strong></p>
<ul>
  <li>Driver will provide transportation services as assigned.</li>
  <li>Driver will maintain valid operating authority, insurance, and required documents.</li>
  <li>Payments, deductions, and settlement terms are governed by Company policy.</li>
  <li>Driver agrees to comply with safety, compliance, and load handling requirements.</li>
</ul>
`;

function mergePreview(html, values) {
	let out = String(html || "");
	for (const [key, value] of Object.entries(values || {})) {
		const re = new RegExp(`{{\\s*${key.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\s*}}`, "g");
		out = out.replace(re, String(value ?? ""));
	}
	return out;
}

export default function AgreementTemplateClient() {
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const [savedAt, setSavedAt] = useState("");

	const [company, setCompany] = useState(null);
	const [companyNameOverride, setCompanyNameOverride] = useState("");
	const [logoUrlOverride, setLogoUrlOverride] = useState("");
	const [agreementBodyHtml, setAgreementBodyHtml] = useState("");

	const [previewWithSampleDriver, setPreviewWithSampleDriver] = useState(false);

	useEffect(() => {
		let mounted = true;
		(async () => {
			setLoading(true);
			try {
				const resp = await getAgreementTemplate();
				if (!mounted) return;

				setCompany(resp?.company || null);
				setCompanyNameOverride(resp?.template?.companyNameOverride || "");
				setLogoUrlOverride(resp?.template?.logoUrlOverride || "");
				setAgreementBodyHtml(resp?.template?.agreementBodyHtml || DEFAULT_TEMPLATE);
				setSavedAt(resp?.template?.updatedAt ? String(resp.template.updatedAt) : "");
				setError("");
			} catch (e) {
				if (!mounted) return;
				setError(e?.message || "Failed to load template");
			} finally {
				if (mounted) setLoading(false);
			}
		})();

		return () => {
			mounted = false;
		};
	}, []);

	const effectiveCompanyName = useMemo(() => {
		return (companyNameOverride || "").trim() || company?.CompanyName || "";
	}, [companyNameOverride, company]);

	const effectiveLogoUrl = useMemo(() => {
		return (logoUrlOverride || "").trim() || company?.LogoURL || "";
	}, [logoUrlOverride, company]);

	const previewHtml = useMemo(() => {
		const values = previewWithSampleDriver
			? {
				"company.name": effectiveCompanyName,
				"company.address": company?.Address || "",
				"company.phone": company?.Phone || "",
				"company.email": company?.Email || "",
				"driver.name": "Sample Driver",
				"driver.mcNumber": "MC123456",
				"driver.truckType": "Hotshot",
				"driver.contactNumber": "+1 555-555-5555",
				"driver.email": "driver@example.com",
				"driver.percentage": "5",
				date: new Date().toISOString().slice(0, 10),
				today: new Date().toISOString().slice(0, 10),
			}
			: {
				"company.name": effectiveCompanyName,
				"company.address": company?.Address || "",
				"company.phone": company?.Phone || "",
				"company.email": company?.Email || "",
				"driver.name": "",
				"driver.mcNumber": "",
				"driver.truckType": "",
				"driver.contactNumber": "",
				"driver.email": "",
				"driver.percentage": "",
				date: new Date().toISOString().slice(0, 10),
				today: new Date().toISOString().slice(0, 10),
			};

		const body = mergePreview(agreementBodyHtml, values);

		return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agreement Preview</title>
    <style>
      body { font-family: Arial, Helvetica, sans-serif; color: #111827; margin: 0; padding: 18px; }
      .container { max-width: 900px; margin: 0 auto; }
      h1 { font-size: 18px; margin: 0 0 6px 0; }
      .muted { color: #6b7280; font-size: 12px; margin-bottom: 12px; }
      .header { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 10px; }
      .logo { height: 46px; width: auto; object-fit: contain; }
      .company { display: flex; flex-direction: column; gap: 2px; }
      .company-name { font-size: 16px; font-weight: 700; color: #0f172a; }
      .company-meta { font-size: 11px; color: #6b7280; }
      .section { border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; margin-bottom: 12px; }
      .section h2 { font-size: 13px; margin: 0 0 10px 0; color: #1f2937; }
      .p { font-size: 12.5px; line-height: 1.6; margin: 0 0 10px 0; }
      ul { margin: 8px 0 0 16px; padding: 0; font-size: 12.5px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="company">
          <div class="company-name">${effectiveCompanyName || "Company"}</div>
          <div class="company-meta">${company?.Address || ""}${company?.Address ? " • " : ""}${company?.Phone || ""}${company?.Phone ? " • " : ""}${company?.Email || ""}</div>
        </div>
        ${effectiveLogoUrl ? `<img class="logo" src="${effectiveLogoUrl}" alt="Logo" />` : ""}
      </div>
      <h1>Driver Agreement</h1>
      <div class="muted">Preview only</div>
      <div class="section">
        <h2>Agreement</h2>
        ${body}
      </div>
    </div>
  </body>
</html>`;
	}, [agreementBodyHtml, company, effectiveCompanyName, effectiveLogoUrl, previewWithSampleDriver]);

	const save = async () => {
		setLoading(true);
		try {
			await updateAgreementTemplate({
				companyNameOverride: companyNameOverride || null,
				logoUrlOverride: logoUrlOverride || null,
				agreementBodyHtml: agreementBodyHtml || null,
			});
			setSavedAt(new Date().toISOString());
			setError("");
		} catch (e) {
			setError(e?.message || "Failed to save template");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="max-w-6xl mx-auto px-2 sm:px-4">
			<div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
				<div className="flex items-start justify-between gap-4">
					<div>
						<h1 className="text-2xl font-semibold text-blue-900 tracking-tight">Agreement Template</h1>
						<div className="text-sm text-gray-600 mt-1">Edit the agreement text, company name/logo (optional overrides), and save.</div>
					</div>
					<Link className="text-blue-700 hover:underline" href="/drivers">
						Back to Drivers
					</Link>
				</div>

				{error ? <div className="text-red-600 mt-3 text-sm font-medium">{error}</div> : null}

				<div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div className="rounded-xl border border-gray-200 bg-white p-4">
						<h2 className="text-lg font-semibold text-blue-900 mb-3">Settings</h2>

						<div className="text-xs text-gray-500 mb-3">
							Placeholders: <code>{"{{driver.name}}"}</code>, <code>{"{{driver.mcNumber}}"}</code>, <code>{"{{driver.truckType}}"}</code>, <code>{"{{driver.contactNumber}}"}</code>, <code>{"{{driver.email}}"}</code>, <code>{"{{driver.percentage}}"}</code>, <code>{"{{company.name}}"}</code>, <code>{"{{company.address}}"}</code>, <code>{"{{company.phone}}"}</code>, <code>{"{{company.email}}"}</code>, <code>{"{{today}}"}</code>
						</div>

						<div className="grid grid-cols-1 gap-3">
							<label className="text-sm text-gray-700">
								<div className="font-medium">Company name override (optional)</div>
								<input
									id="agreement-company-name-override"
									name="companyNameOverride"
									type="text"
									autoComplete="organization"
									value={companyNameOverride}
									onChange={(e) => setCompanyNameOverride(e.target.value)}
									disabled={loading}
									placeholder={company?.CompanyName || ""}
									className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								/>
							</label>

							<label className="text-sm text-gray-700">
								<div className="font-medium">Logo URL override (optional)</div>
								<input
									id="agreement-logo-url-override"
									name="logoUrlOverride"
									type="text"
									autoComplete="url"
									value={logoUrlOverride}
									onChange={(e) => setLogoUrlOverride(e.target.value)}
									disabled={loading}
									placeholder={company?.LogoURL || ""}
									className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
								/>
							</label>

							<label className="text-sm text-gray-700">
								<div className="font-medium">Agreement body (HTML)</div>
								<textarea
									id="agreement-body-html"
									name="agreementBodyHtml"
									autoComplete="off"
									value={agreementBodyHtml}
									onChange={(e) => setAgreementBodyHtml(e.target.value)}
									disabled={loading}
									rows={16}
									className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono"
								/>
							</label>

							<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
								<label className="inline-flex items-center gap-2 text-sm text-gray-700">
									<input
										id="preview-with-sample-driver"
										name="previewWithSampleDriver"
										type="checkbox"
										autoComplete="off"
										checked={previewWithSampleDriver}
										onChange={(e) => setPreviewWithSampleDriver(e.target.checked)}
										disabled={loading}
									/>
									Preview with sample driver data
								</label>
								<button
									type="button"
									onClick={save}
									disabled={loading}
									className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-3 py-2 rounded"
								>
									Save template
								</button>
							</div>

							<div className="text-xs text-gray-500">{savedAt ? `Last saved: ${savedAt}` : ""}</div>
						</div>
					</div>

					<div className="rounded-xl border border-gray-200 bg-white p-4">
						<h2 className="text-lg font-semibold text-blue-900 mb-3">Preview</h2>
						<div className="rounded-lg border border-gray-200 overflow-hidden">
							<iframe title="Agreement preview" className="w-full h-[680px]" srcDoc={previewHtml} />
						</div>
					</div>
				</div>

				{loading ? <div className="mt-4 text-sm text-gray-500">Working…</div> : null}
			</div>
		</div>
	);
}
