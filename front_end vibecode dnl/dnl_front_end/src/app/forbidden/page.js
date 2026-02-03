"use client";

import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-lg bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
        <h1 className="text-2xl font-semibold text-blue-900">Access denied</h1>
        <p className="text-sm text-gray-600 mt-2">
          Your account doesn’t have permission to view this page.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link
            href="/"
            className="bg-blue-900 hover:bg-blue-800 text-white font-semibold px-4 py-2 rounded-lg"
          >
            Go home
          </Link>
          <Link
            href="/drivers"
            className="border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg"
          >
            Drivers
          </Link>
          <Link
            href="/loads"
            className="border border-gray-300 hover:border-gray-400 text-gray-800 font-semibold px-4 py-2 rounded-lg"
          >
            Loads
          </Link>
        </div>
      </div>
    </div>
  );
}
