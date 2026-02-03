"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { getAgreementByToken, getDocumentUrl, signAgreementByToken } from "../../../../utils/api";

function isValidToken(token) {
  return typeof token === "string" && token.length >= 20;
}

export default function SignDriverAgreementClient({ token }) {
  const normalizedToken = useMemo(() => (isValidToken(token) ? token : null), [token]);

  const canvasRef = useRef(null);
  const drawingRef = useRef(false);

  const [agreement, setAgreement] = useState(null);
  const [signerName, setSignerName] = useState("");
  const [hasSignature, setHasSignature] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchAgreement = useCallback(async (t) => {
    if (!t) return;
    setLoading(true);
    try {
      const data = await getAgreementByToken(t);
      setAgreement(data);
      setError("");
    } catch (e) {
      setAgreement(null);
      setError(e?.message || "Failed to load agreement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgreement(normalizedToken);
  }, [normalizedToken, fetchAgreement]);

  const resizeCanvasForDpr = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();

    const width = Math.max(300, Math.floor(rect.width));
    const height = Math.max(140, Math.floor(rect.height));

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);

    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#111827";
  };

  useEffect(() => {
    resizeCanvasForDpr();
    const onResize = () => resizeCanvasForDpr();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (e.touches && e.touches[0]) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top,
      };
    }

    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e);
    drawingRef.current = true;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const moveDraw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { x, y } = getPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasSignature(true);
  };

  const endDraw = (e) => {
    if (!drawingRef.current) return;
    e.preventDefault();
    drawingRef.current = false;
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasSignature(false);
  };

  const submitSignature = async () => {
    if (!normalizedToken) return;
    if (!signerName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!hasSignature) {
      setError("Please add your signature.");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) {
      setError("Signature pad not ready.");
      return;
    }

    setLoading(true);
    try {
      const signatureDataUrl = canvas.toDataURL("image/png");
      const result = await signAgreementByToken(normalizedToken, {
        signerName: signerName.trim(),
        signatureDataUrl,
      });

      setSuccess("Signed successfully.");
      setError("");
      await fetchAgreement(normalizedToken);

      // If backend returned signedPdfPath, keep it around
      if (result?.signedPdfPath) {
        setAgreement((prev) => ({ ...prev, signedPdfPath: result.signedPdfPath, status: "signed" }));
      }
    } catch (e) {
      setError(e?.message || "Failed to sign");
      setSuccess("");
    } finally {
      setLoading(false);
    }
  };

  if (!normalizedToken) {
    return (
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <div className="bg-white rounded-2xl shadow-lg p-6 mt-2">
          <div className="text-red-700 font-medium">Invalid signing link.</div>
          <div className="mt-3">
            <Link className="text-blue-700 hover:underline" href="/">
              Go to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const signedUrl = agreement?.signedPdfPath ? getDocumentUrl(agreement.signedPdfPath) : null;

  return (
    <div className="max-w-5xl mx-auto px-2 sm:px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 mt-2">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold text-blue-900 tracking-tight">Driver Agreement</h1>
            <div className="text-sm text-gray-600 mt-1">
              {agreement?.driverName ? `Driver: ${agreement.driverName}` : ""}
            </div>
          </div>
        </div>

        {error ? <div className="text-red-600 mt-3 text-sm font-medium">{error}</div> : null}
        {success ? <div className="text-green-700 mt-3 text-sm font-medium">{success}</div> : null}

        {signedUrl ? (
          <div className="mt-3 rounded-lg border border-gray-200 bg-white p-3">
            <div className="text-sm text-gray-800">This agreement is signed.</div>
            <a className="text-blue-700 hover:underline" href={signedUrl} target="_blank" rel="noreferrer">
              Open signed PDF
            </a>
          </div>
        ) : null}

        <div className="mt-4 rounded-xl border border-gray-200 bg-white overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">Agreement</div>
            <div className="text-xs text-gray-500">Please read before signing</div>
          </div>
          <div className="p-0">
            {agreement?.agreementHtml ? (
              <iframe
                title="Agreement"
                srcDoc={agreement.agreementHtml}
                className="w-full"
                style={{ height: 560 }}
              />
            ) : (
              <div className="p-4 text-sm text-gray-600">{loading ? "Loading…" : "Agreement not available."}</div>
            )}
          </div>
        </div>

        {agreement?.status === "signed" ? null : (
          <div className="mt-4 rounded-xl border border-gray-200 bg-white p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold text-blue-900">Sign</h2>
              <button
                type="button"
                onClick={clearSignature}
                className="text-sm text-gray-600 hover:underline"
                disabled={loading}
              >
                Clear
              </button>
            </div>

            <label htmlFor="signerName" className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
            <input
              id="signerName"
              name="signerName"
              type="text"
              value={signerName}
              onChange={(e) => setSignerName(e.target.value)}
              disabled={loading}
              placeholder="Type your full name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoComplete="name"
            />

            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Signature</label>
              <div className="border border-gray-300 rounded-lg overflow-hidden">
                <div className="bg-gray-50 px-3 py-2 text-xs text-gray-500">Draw your signature below</div>
                <div className="p-2">
                  <canvas
                    ref={canvasRef}
                    className="w-full"
                    style={{ height: 160, touchAction: "none" }}
                    onMouseDown={startDraw}
                    onMouseMove={moveDraw}
                    onMouseUp={endDraw}
                    onMouseLeave={endDraw}
                    onTouchStart={startDraw}
                    onTouchMove={moveDraw}
                    onTouchEnd={endDraw}
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={submitSignature}
              disabled={loading}
              className="mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold px-4 py-2 rounded"
            >
              {loading ? "Submitting…" : "Agree & Sign"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
