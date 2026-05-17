import { Suspense } from "react";
import DriverDetailsClient from "./DriverDetailsClient";

export default async function DriverDetailsPage({ params }) {
  const resolvedParams = await params;
  const driverId = resolvedParams?.id;

  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading driver…</div>}>
      <DriverDetailsClient driverId={driverId} />
    </Suspense>
  );
}
