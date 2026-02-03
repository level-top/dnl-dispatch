import { Suspense } from "react";
import PrintAllInvoicesClient from "./PrintAllInvoicesClient";

export default function PrintAllInvoicesPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center">Loading...</div>}>
      <PrintAllInvoicesClient />
    </Suspense>
  );
}
