import { Suspense } from "react";
import LoadManagementClient from "./LoadManagementClient";

export default function LoadManagementPage() {
	return (
		<Suspense fallback={<div className="p-8">Loading...</div>}>
			<LoadManagementClient />
		</Suspense>
	);
}
