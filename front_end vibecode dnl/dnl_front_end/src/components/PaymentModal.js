"use client";

import { useEffect, useMemo, useState } from "react";

export default function PaymentModal({
  open,
  title = "Add Payment",
  defaultAmount,
  onCancel,
  onSubmit,
}) {
  const initialAmount = useMemo(() => {
    if (defaultAmount === undefined || defaultAmount === null || defaultAmount === "") return "";
    return String(defaultAmount);
  }, [defaultAmount]);

  const [amountText, setAmountText] = useState("");
  const [method, setMethod] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [localError, setLocalError] = useState("");

  useEffect(() => {
    if (!open) return;
    setAmountText(initialAmount);
    setMethod("");
    setReference("");
    setNotes("");
    setLocalError("");
  }, [open, initialAmount]);

  if (!open) return null;

  const submit = async (e) => {
    e?.preventDefault?.();

    const amount = Number.parseFloat(String(amountText).trim());
    if (!Number.isFinite(amount) || amount <= 0) {
      setLocalError("Enter a valid amount");
      return;
    }

    setLocalError("");
    await onSubmit?.({
      amount,
      method: method.trim() || null,
      reference: reference.trim() || null,
      notes: notes.trim() || null,
    });
  };

  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onCancel?.();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={onBackdropClick}
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-200">
          <div className="text-lg font-bold text-gray-900">{title}</div>
          <div className="text-sm text-gray-500">Enter payment details</div>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {localError && (
            <div className="bg-red-100 text-red-700 p-3 rounded">{localError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="block">
              <span className="text-sm font-medium text-gray-700">Amount (USD)</span>
              <input
                autoFocus
                id="payment-amount"
                name="amount"
                type="number"
                inputMode="decimal"
                step="0.01"
                min="0"
                value={amountText}
                onChange={(e) => setAmountText(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                placeholder="0.00"
                autoComplete="off"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-gray-700">Method</span>
              <input
                id="payment-method"
                name="method"
                type="text"
                value={method}
                onChange={(e) => setMethod(e.target.value)}
                className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
                placeholder="cash, zelle, wire..."
                autoComplete="off"
              />
            </label>
          </div>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Reference (optional)</span>
            <input
              id="payment-reference"
              name="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              placeholder="Transaction ID, check #, etc"
              autoComplete="off"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-gray-700">Notes (optional)</span>
            <textarea
              id="payment-notes"
              name="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 w-full border border-gray-300 rounded px-3 py-2"
              rows={3}
              placeholder="Any extra details"
              autoComplete="off"
            />
          </label>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
            >
              Save Payment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
