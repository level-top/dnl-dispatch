import { Suspense } from "react";
import DriverDetailsClient from "./DriverDetailsClient";

export default function DriverDetailsPage({ params }) {
  return (
    <Suspense fallback={<div className="p-6 text-gray-600">Loading driver…</div>}>
      <DriverDetailsClient driverId={params?.id} />
    </Suspense>
  );
}
