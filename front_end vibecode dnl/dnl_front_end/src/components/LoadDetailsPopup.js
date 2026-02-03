"use client";

import LoadDetailsTemplate from "./LoadDetailsTemplate";

export default function LoadDetailsPopup({
	open,
	onClose,
	load,
	driverName,
	dispatcherName,
	companyFee,
	commissionPercent,
	onEdit,
	onDelete,
}) {
	if (!open) return null;

	return (
		<div
			className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
			role="dialog"
			aria-modal="true"
			onMouseDown={() => onClose?.()}
		>
			<div
				className="relative w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-lg"
				onMouseDown={(e) => e.stopPropagation()}
			>
				<div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
					<div className="text-sm font-semibold text-gray-900">Load Details</div>
					<div className="flex items-center gap-2">
						{typeof onEdit === "function" ? (
							<button
								type="button"
								onClick={() => onEdit?.(load)}
								className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-blue-700"
							>
								Edit
							</button>
						) : null}
						{typeof onDelete === "function" ? (
							<button
								type="button"
								onClick={() => onDelete?.(load)}
								className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700"
							>
								Delete
							</button>
						) : null}
						<button
							type="button"
							onClick={() => onClose?.()}
							className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
						>
							Close
						</button>
					</div>
				</div>
				<div className="p-4">
					<LoadDetailsTemplate
						load={load}
						driverName={driverName}
						dispatcherName={dispatcherName}
						companyFee={companyFee}
						commissionPercent={commissionPercent}
					/>
				</div>
			</div>
		</div>
	);
}
