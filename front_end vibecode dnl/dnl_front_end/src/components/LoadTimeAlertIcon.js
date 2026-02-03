"use client";

function parseDate(value) {
	if (!value) return null;
	const d = new Date(value);
	return Number.isNaN(d.getTime()) ? null : d;
}

function formatRemaining(ms) {
	const totalMinutes = Math.floor(ms / 60000);
	if (totalMinutes < 1) return "<1m";
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	if (hours <= 0) return `${minutes}m`;
	return `${hours}h ${minutes}m`;
}

/**
 * Shows a timer icon when pickup or delivery is within the next hour.
 * Turns red when within 5 minutes.
 * If pickup/delivery time has passed, shows red with an "overdue" tooltip.
 */
export default function LoadTimeAlertIcon({ pickupAt, deliveryAt, now }) {
	const nowDate = now instanceof Date ? now : new Date();
	const pickup = parseDate(pickupAt);
	const delivery = parseDate(deliveryAt);

	const candidates = [
		pickup ? { kind: "Pickup", when: pickup } : null,
		delivery ? { kind: "Delivery", when: delivery } : null,
	].filter(Boolean);

	const withDiff = candidates
		.map((c) => ({ ...c, diffMs: c.when.getTime() - nowDate.getTime() }));

	const upcoming = withDiff.filter((c) => c.diffMs >= 0).sort((a, b) => a.diffMs - b.diffMs);
	const past = withDiff.filter((c) => c.diffMs < 0).sort((a, b) => b.diffMs - a.diffMs); // closest to now first

	// Prefer upcoming within 1 hour.
	if (upcoming.length > 0 && upcoming[0].diffMs <= 60 * 60 * 1000) {
		const next = upcoming[0];
		const isRed = next.diffMs <= 5 * 60 * 1000;
		const colorClass = isRed ? "text-red-600" : "text-amber-600";
		const title = `${next.kind} in ${formatRemaining(next.diffMs)}`;

		return (
			<span className={`inline-flex items-center ${colorClass}`} title={title} aria-label={title}>
				<span className="text-base leading-none">⏱</span>
			</span>
		);
	}

	// If any passed time exists, show overdue.
	if (past.length > 0) {
		const last = past[0];
		const overdueMs = Math.abs(last.diffMs);
		const title = `${last.kind} overdue by ${formatRemaining(overdueMs)}`;
		return (
			<span className="inline-flex items-center text-red-600" title={title} aria-label={title}>
				<span className="text-base leading-none">⏱</span>
			</span>
		);
	}

	return null;
}
