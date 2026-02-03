"use client";
import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getLoads, getDrivers, getStoredUser, getUsers, deleteLoad } from "../../utils/api";
import LoadDetailsPopup from "../../components/LoadDetailsPopup";
import LoadTimeAlertIcon from "../../components/LoadTimeAlertIcon";

const PERIODS = [
	{ key: "daily", label: "Daily", days: 1 },
	{ key: "weekly", label: "Weekly", days: 7 },
	{ key: "monthly", label: "Monthly", days: 30 },
	{ key: "yearly", label: "Yearly", days: 365 },
];

function startOfDay(date) {
	const d = new Date(date);
	d.setHours(0, 0, 0, 0);
	return d;
}

function toYMD(date) {
	const d = new Date(date);
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
}

export default function LoadManagementClient() {
	const [me] = useState(() => getStoredUser());
	const role = String(me?.role || "").toLowerCase();
	const isDispatcher = role === "dispatcher";

	const router = useRouter();
	const searchParams = useSearchParams();
	const [loads, setLoads] = useState([]);
	const [drivers, setDrivers] = useState([]);
	const [users, setUsers] = useState([]);
	const [selectedLoad, setSelectedLoad] = useState(null);
	const [now, setNow] = useState(() => new Date());
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState("");

	const refreshLoads = async () => {
		setLoads(await getLoads());
	};

	const normalizeId = (value) => (value === null || value === undefined ? "" : String(value));
	const formatMoney = (value) => {
		const num = Number(value) || 0;
		return new Intl.NumberFormat("en-US", {
			style: "currency",
			currency: "USD",
			maximumFractionDigits: 2,
		}).format(num);
	};
	const parseYMDStart = (ymd) => (ymd ? new Date(`${ymd}T00:00:00`) : null);
	const parseYMDEnd = (ymd) => (ymd ? new Date(`${ymd}T23:59:59.999`) : null);
	const dispatchers = users.filter((u) => String(u.role || "").toLowerCase() === "dispatcher");
	const getCommissionPercent = (load, driver) => {
		const override = parseFloat(load?.commission_rate_override);
		if (!Number.isNaN(override) && override > 0) return override;
		const driverPerc = parseFloat(driver?.percentage);
		if (!Number.isNaN(driverPerc) && driverPerc > 0) return driverPerc;
		return null;
	};
	const getCompanyFee = (load, driver) => {
		const netAmount = parseFloat(load?.netAmount);
		if (!Number.isNaN(netAmount)) return netAmount;
		const amt = parseFloat(load?.loadAmount);
		const perc = getCommissionPercent(load, driver);
		if (!Number.isNaN(amt) && perc !== null) return (amt * perc) / 100;
		return 0;
	};

	// Dashboard controls
	const [periodKey, setPeriodKey] = useState("weekly");
	const [search, setSearch] = useState("");
	const [filterDriver, setFilterDriver] = useState("");
	const [filterDispatcher, setFilterDispatcher] = useState(() => (isDispatcher ? String(me?.id || "") : ""));
	const [filterStatus, setFilterStatus] = useState("");
	const [sortBy, setSortBy] = useState("pickup");
	const [sortOrder, setSortOrder] = useState("asc");
	const [filterPaymentStatus, setFilterPaymentStatus] = useState("");
	const [loadDateStart, setLoadDateStart] = useState("");
	const [loadDateEnd, setLoadDateEnd] = useState("");

	useEffect(() => {
		const period = PERIODS.find((p) => p.key === periodKey) || PERIODS[1];
		const now = new Date();
		const start = new Date(now);
		start.setDate(start.getDate() - (period.days - 1));
		setLoadDateStart(toYMD(startOfDay(start)));
		setLoadDateEnd(toYMD(now));
	}, [periodKey]);

	useEffect(() => {
		const qpPeriod = String(searchParams?.get("period") || "").toLowerCase();
		if (qpPeriod && PERIODS.some((p) => p.key === qpPeriod)) {
			setPeriodKey(qpPeriod);
		}

		const qpStatus = String(searchParams?.get("status") || "").toLowerCase();
		const qpPayment = String(searchParams?.get("payment") || "").toLowerCase();

		// Keep behavior consistent with KPI cards:
		// - Invoice Ready is the only case where both filters are active.
		if (qpStatus === "delivered" && qpPayment === "unpaid") {
			setFilterStatus("delivered");
			setFilterPaymentStatus("unpaid");
			return;
		}

		if (qpPayment) {
			setFilterPaymentStatus(qpPayment);
			setFilterStatus("");
			return;
		}

		if (qpStatus) {
			setFilterStatus(qpStatus);
			setFilterPaymentStatus("");
		}
	}, [searchParams]);

	useEffect(() => {
		async function fetchAll() {
			try {
				setLoads(await getLoads());
				setDrivers(await getDrivers());
				if (isDispatcher) {
					setUsers(me?.id ? [me] : []);
					const myId = String(me?.id || "");
					if (myId) setFilterDispatcher(myId);
				} else {
					setUsers(await getUsers());
				}
				setError("");
			} catch (e) {
				setError(e.message);
			}
			setLoading(false);
		}
		fetchAll();
	}, [isDispatcher, me]);

	const getDispatcherName = (dispatcherId) => {
		if (isDispatcher) return String(me?.name || me?.userName || "You");
		const dispatcher = users.find((u) => normalizeId(u.id) === normalizeId(dispatcherId));
		return dispatcher?.name || dispatcherId;
	};

	useEffect(() => {
		const t = setInterval(() => setNow(new Date()), 30_000);
		return () => clearInterval(t);
	}, []);

	// Filter, search, and sort loads
	const loadsForKpisAll = loads.filter((load) => {
		const loadDriverId = load.driverId ?? load.driverName;
		if (filterDriver && normalizeId(loadDriverId) !== normalizeId(filterDriver)) return false;
		if (isDispatcher) {
			const myId = String(me?.id || "");
			if (myId && normalizeId(load.dispatcherId) !== normalizeId(myId)) return false;
		} else if (filterDispatcher && normalizeId(load.dispatcherId) !== normalizeId(filterDispatcher)) {
			return false;
		}

		if (loadDateStart || loadDateEnd) {
			const dateCandidate = load.dateTime;
			const dateForRange = dateCandidate ? new Date(dateCandidate) : null;
			if (!dateForRange || Number.isNaN(dateForRange.getTime())) return false;
			const start = parseYMDStart(loadDateStart);
			const end = parseYMDEnd(loadDateEnd);
			if (start && dateForRange < start) return false;
			if (end && dateForRange > end) return false;
		}

		return true;
	});

	// Do not count canceled loads in general KPIs (still show them when explicitly filtered).
	const loadsForKpis = loadsForKpisAll.filter(
		(l) => String(l.loadStatus || "").toLowerCase() !== "canceled"
	);

	const statusCounts = loadsForKpisAll.reduce((acc, load) => {
		const key = String(load.loadStatus || "").toLowerCase();
		if (key) acc[key] = (acc[key] || 0) + 1;
		return acc;
	}, {});

	const invoiceReadyCount = loadsForKpis.filter((l) => {
		const status = String(l.loadStatus || "").toLowerCase();
		const pay = String(l.payment_status || "").toLowerCase();
		return status === "delivered" && pay === "unpaid";
	}).length;

	const paidCount = loadsForKpis.filter((l) => String(l.payment_status || "").toLowerCase() === "paid")
		.length;

	const invoicedCount = loadsForKpis.filter(
		(l) => String(l.payment_status || "").toLowerCase() === "invoiced"
	).length;

	const baseForDisplay =
		String(filterStatus || "").toLowerCase() === "canceled" ? loadsForKpisAll : loadsForKpis;

	const loadsBeforeStatus = baseForDisplay.filter((load) => {
		if (!filterPaymentStatus) return true;
		return (
			String(load.payment_status || "").toLowerCase() ===
			String(filterPaymentStatus).toLowerCase()
		);
	});

	const displayedLoads = loadsBeforeStatus
		.filter((load) => {
			if (!filterStatus) return true;
			return String(load.loadStatus || "").toLowerCase() === String(filterStatus).toLowerCase();
		})
		.filter((load) => {
			if (!search.trim()) return true;
			const searchLower = search.toLowerCase();
			return Object.values(load).some(
				(val) => val && val.toString().toLowerCase().includes(searchLower)
			);
		})
		.sort((a, b) => {
			let result = 0;
			if (sortBy === "pickup") {
				result = new Date(a.pickedUp_dateTime || 0) - new Date(b.pickedUp_dateTime || 0);
			} else if (sortBy === "delivery") {
				const ad = a.delivered_at || a.dropOff_dateTime || 0;
				const bd = b.delivered_at || b.dropOff_dateTime || 0;
				result = new Date(ad) - new Date(bd);
			} else if (sortBy === "amount") {
				result = (parseFloat(a.loadAmount) || 0) - (parseFloat(b.loadAmount) || 0);
			} else if (sortBy === "id") {
				result = (a.id || 0) - (b.id || 0);
			} else if (sortBy === "loaddate") {
				result = new Date(a.dateTime || 0) - new Date(b.dateTime || 0);
			}
			return sortOrder === "asc" ? result : -result;
		});

	const toggleSort = (key) => {
		if (sortBy === key) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
			return;
		}
		setSortBy(key);
		setSortOrder("asc");
	};

	const sortIcon = (key) => {
		if (sortBy !== key) return "↕";
		return sortOrder === "asc" ? "▲" : "▼";
	};

	const toggleStatusFilter = (statusKey) => {
		const next = String(statusKey || "").toLowerCase();
		const current = String(filterStatus || "").toLowerCase();
		const willEnable = current !== next;
		setFilterStatus(willEnable ? next : "");
		// Make KPI cards single-select across groups:
		// choosing a Status clears any Payment filter.
		if (willEnable) setFilterPaymentStatus("");
	};

	const toggleInvoiceReadyFilter = () => {
		const status = String(filterStatus || "").toLowerCase();
		const pay = String(filterPaymentStatus || "").toLowerCase();
		const isActive = status === "delivered" && pay === "unpaid";
		if (isActive) {
			setFilterStatus("");
			setFilterPaymentStatus("");
			return;
		}
		setFilterStatus("delivered");
		setFilterPaymentStatus("unpaid");
	};

	const togglePaymentStatusFilter = (paymentKey) => {
		const next = String(paymentKey || "").toLowerCase();
		const current = String(filterPaymentStatus || "").toLowerCase();
		const willEnable = current !== next;
		setFilterPaymentStatus(willEnable ? next : "");
		// Make KPI cards single-select across groups:
		// choosing a Payment status clears any Status filter.
		if (willEnable) setFilterStatus("");
	};

	if (loading) return <div className="p-8">Loading...</div>;
	if (error) return <div className="p-8 text-red-600">{error}</div>;

	const selectedDriverId = selectedLoad ? selectedLoad.driverId ?? selectedLoad.driverName : null;
	const selectedDriver = selectedLoad
		? drivers.find((d) => normalizeId(d.id) === normalizeId(selectedDriverId))
		: null;
	const selectedDispatcher = selectedLoad
		? users.find((u) => normalizeId(u.id) === normalizeId(selectedLoad.dispatcherId))
		: null;
	const selectedCommissionPercent = selectedLoad
		? getCommissionPercent(selectedLoad, selectedDriver)
		: null;
	const selectedCompanyFee = selectedLoad ? getCompanyFee(selectedLoad, selectedDriver) : undefined;

	return (
		<div className="max-w-7xl mx-auto px-2 sm:px-4">
			<LoadDetailsPopup
				open={!!selectedLoad}
				onClose={() => setSelectedLoad(null)}
				load={selectedLoad}
				driverName={selectedDriver?.name}
				dispatcherName={getDispatcherName(selectedLoad?.dispatcherId)}
				companyFee={selectedCompanyFee}
				commissionPercent={selectedCommissionPercent}
				onEdit={(load) => {
					if (!load?.id) return;
					setSelectedLoad(null);
					router.push(`/load_managment/${load.id}`);
				}}
				onDelete={async (load) => {
					if (!load?.id) return;
					setSelectedLoad(null);
					if (!confirm("Delete this load?")) return;
					try {
						await deleteLoad(load.id);
						await refreshLoads();
						setError("");
					} catch (e) {
						setError(e.message);
					}
				}}
			/>
			<div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
				<div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
					<h1 className="text-2xl font-semibold text-blue-900 tracking-tight">
						Load Management Dashboard
					</h1>
					<div className="flex gap-2 flex-wrap">
						{PERIODS.map((p) => (
							<button
								key={p.key}
								onClick={() => setPeriodKey(p.key)}
								className={`px-4 py-2 rounded-lg font-medium transition border ${
									periodKey === p.key
										? "bg-indigo-600 text-white border-indigo-600"
										: "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
								}`}
							>
								{p.label}
							</button>
						))}
					</div>
				</div>
				<div className="mb-6 grid grid-cols-1 text-blue-900 md:grid-cols-6 gap-4 items-end">
					<div className="md:col-span-2">
						<label htmlFor="search" className="block mb-1 font-medium">
							Search Loads
						</label>
						<input
							id="search"
							name="search"
							type="text"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							placeholder="Search all fields..."
							className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
							autoComplete="off"
						/>
					</div>
					<div>
						<label htmlFor="loadDateStart" className="block mb-1 font-medium">
							Load Date From
						</label>
						<input
							id="loadDateStart"
							name="loadDateStart"
							type="date"
							value={loadDateStart}
							onChange={(e) => setLoadDateStart(e.target.value)}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
							autoComplete="off"
						/>
					</div>
					<div>
						<label htmlFor="loadDateEnd" className="block mb-1 font-medium">
							Load Date To
						</label>
						<input
							id="loadDateEnd"
							name="loadDateEnd"
							type="date"
							value={loadDateEnd}
							onChange={(e) => setLoadDateEnd(e.target.value)}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
							autoComplete="off"
						/>
					</div>
					<div>
						<label htmlFor="filterDriver" className="block mb-1 font-medium">
							Driver
						</label>
						<select
							id="filterDriver"
							name="filterDriver"
							value={filterDriver}
							onChange={(e) => setFilterDriver(e.target.value)}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
							autoComplete="off"
						>
							<option value="">All Drivers</option>
							{drivers.map((d) => (
								<option key={d.id} value={d.id}>
									{d.name}
								</option>
							))}
						</select>
					</div>
					{isDispatcher ? (
						<div>
							<label className="block mb-1 font-medium">Dispatcher</label>
							<div className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-gray-50 text-gray-700">
								{String(me?.name || me?.userName || "You")}
							</div>
						</div>
					) : (
						<div>
							<label htmlFor="filterDispatcher" className="block mb-1 font-medium">
								Dispatcher
							</label>
							<select
								id="filterDispatcher"
								name="filterDispatcher"
								value={filterDispatcher}
								onChange={(e) => setFilterDispatcher(e.target.value)}
								className="w-full border border-gray-300 rounded-lg px-4 py-2"
								autoComplete="off"
							>
								<option value="">All Dispatchers</option>
								{dispatchers.map((u) => (
									<option key={u.id} value={u.id}>
										{u.name}
									</option>
								))}
							</select>
						</div>
					)}
					<div>
						<label htmlFor="filterStatus" className="block mb-1 font-medium">
							Status
						</label>
						<select
							id="filterStatus"
							value={filterStatus}
							onChange={(e) => setFilterStatus(String(e.target.value || "").toLowerCase())}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
						>
							<option value="">All Statuses</option>
							<option value="booked">Booked</option>
							<option value="pickedup">Picked Up</option>
							<option value="delivered">Delivered</option>
							<option value="issue">Issue</option>
							<option value="canceled">Canceled</option>
						</select>
					</div>
					<div>
						<label htmlFor="filterPaymentStatus" className="block mb-1 font-medium">
							Payment Status
						</label>
						<select
							id="filterPaymentStatus"
							value={filterPaymentStatus}
							onChange={(e) =>
								setFilterPaymentStatus(String(e.target.value || "").toLowerCase())
							}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
						>
							<option value="">All Payment Status</option>
							<option value="unpaid">Unpaid</option>
							<option value="invoiced">Invoiced</option>
							<option value="paid">Paid</option>
						</select>
					</div>
					<div>
						<label htmlFor="sortBy" className="block mb-1 font-medium">
							Sort By
						</label>
						<select
							id="sortBy"
							value={sortBy}
							onChange={(e) => setSortBy(e.target.value)}
							className="w-full border border-gray-300 rounded-lg px-4 py-2"
						>
							<option value="pickup">Pickup Date</option>
							<option value="delivery">Delivery Date</option>
							<option value="loaddate">Load Date</option>
							<option value="amount">Amount</option>
							<option value="id">Load ID</option>
						</select>
					</div>
					<div className="flex flex-col justify-end">
						<button
							type="button"
							onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
							className="w-full border border-gray-300 rounded-lg px-4 py-2 bg-blue-50 hover:bg-blue-100 font-medium text-blue-700 transition"
						>
							{sortOrder === "asc" ? "Ascending" : "Descending"}
						</button>
					</div>
				</div>
				<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 mb-4">
					<div className="rounded-lg border border-gray-200 bg-gray-50 p-2">
						<div className="text-xs text-gray-500">Displayed Loads</div>
						<div className="text-lg font-semibold text-gray-900">{displayedLoads.length}</div>
					</div>
					<button
						type="button"
						onClick={toggleInvoiceReadyFilter}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterStatus || "").toLowerCase() === "delivered" &&
							String(filterPaymentStatus || "").toLowerCase() === "unpaid"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
						title="Filter to delivered + unpaid"
					>
						<div className="text-xs text-gray-500">Invoice Ready (Delivered + Unpaid)</div>
						<div className="text-lg font-semibold text-gray-900">{invoiceReadyCount}</div>
					</button>

					<button
						type="button"
						onClick={() => togglePaymentStatusFilter("invoiced")}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterPaymentStatus || "").toLowerCase() === "invoiced"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
						title="Filter payment status: invoiced"
					>
						<div className="text-xs text-gray-500">Invoiced</div>
						<div className="text-lg font-semibold text-gray-900">{invoicedCount}</div>
					</button>

					<button
						type="button"
						onClick={() => togglePaymentStatusFilter("paid")}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterPaymentStatus || "").toLowerCase() === "paid"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
						title="Filter payment status: paid"
					>
						<div className="text-xs text-gray-500">Paid</div>
						<div className="text-lg font-semibold text-gray-900">{paidCount}</div>
					</button>

					<button
						type="button"
						onClick={() => toggleStatusFilter("booked")}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterStatus || "").toLowerCase() === "booked"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
					>
						<div className="text-xs text-gray-500">Booked</div>
						<div className="text-lg font-semibold text-gray-900">{statusCounts.booked || 0}</div>
					</button>

					<button
						type="button"
						onClick={() => toggleStatusFilter("delivered")}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterStatus || "").toLowerCase() === "delivered"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
					>
						<div className="text-xs text-gray-500">Delivered</div>
						<div className="text-lg font-semibold text-gray-900">{statusCounts.delivered || 0}</div>
					</button>

					<button
						type="button"
						onClick={() => toggleStatusFilter("canceled")}
						className={`rounded-lg border p-2 text-left transition hover:bg-blue-50 ${
							String(filterStatus || "").toLowerCase() === "canceled"
								? "border-blue-400 bg-blue-50"
								: "border-gray-200 bg-gray-50"
						}`}
					>
						<div className="text-xs text-gray-500">Canceled</div>
						<div className="text-lg font-semibold text-gray-900">{statusCounts.canceled || 0}</div>
					</button>
				</div>
				<div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-2 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									&nbsp;
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Load #
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									<button
										type="button"
										onClick={() => toggleSort("pickup")}
										className="flex items-center gap-2"
									>
										<span>Pickup</span>
										<span className="text-gray-400">{sortIcon("pickup")}</span>
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Dropoff
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Delivered
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Route
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Driver
								</th>
								{!isDispatcher ? (
									<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
										Dispatcher
									</th>
								) : null}
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									<button
										type="button"
										onClick={() => toggleSort("amount")}
										className="flex items-center gap-2"
									>
										<span>Amount</span>
										<span className="text-gray-400">{sortIcon("amount")}</span>
									</button>
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Company Fee
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Status
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Payment
								</th>
								<th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
									Docs
								</th>
							</tr>
						</thead>
						<tbody className="bg-white divide-y divide-gray-100">
							{displayedLoads.map((load) => {
								const loadDriverId = load.driverId ?? load.driverName;
								const driver = drivers.find(
									(d) => normalizeId(d.id) === normalizeId(loadDriverId)
								);
								const dispatcher = !isDispatcher
									? users.find((u) => normalizeId(u.id) === normalizeId(load.dispatcherId))
									: null;
								const pickedUpDate = load.pickedUp_dateTime
									? new Date(load.pickedUp_dateTime).toLocaleString()
									: "";
								const dropOffDate = load.dropOff_dateTime
									? new Date(load.dropOff_dateTime).toLocaleString()
									: "";
								const deliveredAt = load.delivered_at
									? new Date(load.delivered_at).toLocaleString()
									: "";
								const percentage = getCommissionPercent(load, driver);
								const companyFee = getCompanyFee(load, driver);

								let dotColor = "bg-gray-300";
								if (load.payment_status === "unpaid") dotColor = "bg-red-500";
								else if (load.payment_status === "invoiced") dotColor = "bg-blue-500";
								else if (load.payment_status === "paid") dotColor = "bg-green-500";
								return (
									<tr
										key={load.id}
										className="hover:bg-blue-50 transition text-black cursor-pointer"
										onClick={() => setSelectedLoad(load)}
									>
										<td className="px-2 py-2 whitespace-nowrap">
											<span
												className={`inline-block w-3 h-3 rounded-full mr-2 align-middle ${dotColor}`}
											></span>
										</td>
										<td className="px-4 py-2 whitespace-nowrap">{load.loadNumber}</td>
										<td className="px-4 py-2 whitespace-nowrap">
											<div className="flex items-center gap-2">
												<LoadTimeAlertIcon
													pickupAt={load.pickedUp_dateTime}
													deliveryAt={load.dropOff_dateTime}
													now={now}
												/>
												<span>{pickedUpDate}</span>
											</div>
										</td>
										<td className="px-4 py-2 whitespace-nowrap">{dropOffDate}</td>
										<td className="px-4 py-2 whitespace-nowrap">{deliveredAt}</td>
										<td className="px-4 py-2 whitespace-nowrap">
											<div className="text-sm text-gray-900">{load.loadFrom}</div>
											<div className="text-xs text-gray-500">→ {load.loadTo}</div>
										</td>
										<td className="px-4 py-2 whitespace-nowrap">{driver?.name || loadDriverId}</td>
										{!isDispatcher ? (
											<td className="px-4 py-2 whitespace-nowrap">{dispatcher?.name || load.dispatcherId}</td>
										) : null}
										<td className="px-4 py-2 whitespace-nowrap">
											<div>{load.loadAmount}</div>
											<div className="text-xs text-gray-500">{load.miles ? `${load.miles} mi` : "-"}</div>
										</td>
										<td className="px-4 py-2 whitespace-nowrap">
											{companyFee ? companyFee.toFixed(2) : "0.00"}
										</td>
										<td className="px-4 py-2 whitespace-nowrap">{load.loadStatus}</td>
										<td className="px-4 py-2 whitespace-nowrap">{load.payment_status}</td>
										<td className="px-4 py-2 whitespace-nowrap text-xs">
											<div
												className={
													String(load.bolStatus || "").toLowerCase() === "received"
														? "text-green-700"
														: "text-gray-600"
												}
											>
												BOL: {load.bolStatus || "pending"}
											</div>
											<div
												className={
													String(load.podStatus || "").toLowerCase() === "received"
														? "text-green-700"
														: "text-gray-600"
												}
											>
												POD: {load.podStatus || "pending"}
											</div>
											<div
												className={
													String(load.rateConfStatus || "").toLowerCase() === "received"
														? "text-green-700"
														: "text-gray-600"
												}
											>
												RC: {load.rateConfStatus || "pending"}
											</div>
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
