import { Suspense } from "react";
import InvoicesClient from "./InvoicesClient";

export default function InvoicesPage() {
  return (
    <Suspense fallback={<div className="p-4 md:p-8">Loading...</div>}>
      <InvoicesClient />
    </Suspense>
  );
}
