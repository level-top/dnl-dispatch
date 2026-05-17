"use client";
import { useEffect, useMemo, useState } from "react";
import {
  getAssignments,
  getDrivers,
  getUsers,
  createAssignment,
  deleteAssignment,
} from "../../utils/api";
import {
  ActionButton,
  DataBadge,
  DataTable,
  DeleteIcon,
  HeaderCell,
  TableEmptyState,
} from "../../components/DataTable";

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [form, setForm] = useState({ dispatcherId: "", driverId: "" });
  const [filter, setFilter] = useState({ type: "all" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const fetchAll = async () => {
    setLoading(true);
    try {
      setAssignments(await getAssignments());
      setDrivers(await getDrivers());
      const users = await getUsers();
      setDispatchers(users.filter((u) => String(u.role).toLowerCase() === "dispatcher"));
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const assignedDriverIds = useMemo(() => {
    return new Set(assignments.map((a) => String(a.driverId)));
  }, [assignments]);

  const unassignedDrivers = useMemo(() => {
    return drivers.filter((d) => !assignedDriverIds.has(String(d.id)));
  }, [drivers, assignedDriverIds]);

  const dispatcherAssignedCounts = useMemo(() => {
    const counts = new Map();
    for (const dispatcher of dispatchers) {
      counts.set(String(dispatcher.id), 0);
    }
    for (const assignment of assignments) {
      const key = String(assignment.dispatcherId);
      counts.set(key, (counts.get(key) || 0) + 1);
    }
    return counts;
  }, [assignments, dispatchers]);

  const filteredAssignments = useMemo(() => {
    if (filter.type === "dispatcher" && filter.dispatcherId != null) {
      return assignments.filter(
        (a) => String(a.dispatcherId) === String(filter.dispatcherId)
      );
    }
    return assignments;
  }, [assignments, filter]);

  const handleCardClick = (nextFilter) => {
    const isSame =
      filter.type === nextFilter.type &&
      String(filter.dispatcherId ?? "") === String(nextFilter.dispatcherId ?? "");
    setFilter(isSame ? { type: "all" } : nextFilter);
  };

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      await createAssignment({
        dispatcherId: Number(form.dispatcherId),
        driverId: Number(form.driverId),
      });
      setForm({ dispatcherId: "", driverId: "" });
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDelete = async (dispatcherId, driverId) => {
    if (!confirm("Delete this assignment?")) return;
    setLoading(true);
    try {
      await deleteAssignment({ dispatcherId, driverId });
      fetchAll();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
        <h1 className="text-2xl font-semibold text-blue-900 mb-6 tracking-tight">Assignments</h1>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Drivers</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => handleCardClick({ type: "unassigned" })}
              className={`text-left rounded-2xl border p-4 shadow-sm transition hover:bg-blue-50 ${filter.type === "unassigned" ? "border-blue-400 bg-blue-50" : "border-gray-200 bg-white"
                }`}
            >
              <div className="text-sm font-medium text-gray-600">Unassigned Drivers</div>
              <div className="text-2xl font-semibold text-blue-900 mt-1">{unassignedDrivers.length}</div>
            </button>
          </div>
        </div>

        <div className="mb-6">
          <div className="text-sm font-semibold text-gray-700 mb-2">Dispatchers</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {dispatchers.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleCardClick({ type: "dispatcher", dispatcherId: d.id })}
                className={`text-left rounded-2xl border p-4 shadow-sm transition hover:bg-blue-50 ${filter.type === "dispatcher" && String(filter.dispatcherId) === String(d.id)
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 bg-white"
                  }`}
                title={`Filter by ${d.name}`}
              >
                <div className="text-sm font-medium text-gray-600 truncate">{d.name}</div>
                <div className="text-2xl font-semibold text-blue-900 mt-1">
                  {dispatcherAssignedCounts.get(String(d.id)) || 0}
                </div>
              </button>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <select name="dispatcherId" value={form.dispatcherId} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required>
            <option value="">Select Dispatcher</option>
            {dispatchers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select name="driverId" value={form.driverId} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required>
            <option value="">Select Driver</option>
            {drivers.map(d => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2 md:col-span-1">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition disabled:opacity-60" disabled={loading}>
              Assign
            </button>
          </div>
        </form>
        {error && <div className="text-red-600 mb-2 text-sm font-medium">{error}</div>}
        <div>
          {filter.type === "unassigned" ? (
            <DataTable>
              <thead>
                <tr>
                  <HeaderCell>Driver</HeaderCell>
                  <HeaderCell>Status</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {unassignedDrivers.map((d) => (
                  <tr key={d.id} className="text-slate-900 transition hover:bg-sky-50/70">
                    <td className="px-4 py-3 text-sm whitespace-nowrap font-semibold text-slate-900">{d.name}</td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <DataBadge>Not assigned</DataBadge>
                    </td>
                  </tr>
                ))}
                {unassignedDrivers.length === 0 && (
                  <TableEmptyState colSpan={2} title="All drivers are assigned" description="Switch the filter to review current dispatcher assignments." />
                )}
              </tbody>
            </DataTable>
          ) : (
            <DataTable>
              <thead>
                <tr>
                  <HeaderCell>Dispatcher</HeaderCell>
                  <HeaderCell>Driver</HeaderCell>
                  <HeaderCell>Actions</HeaderCell>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredAssignments.map(a => (
                  <tr key={`${a.dispatcherId}-${a.driverId}`} className="text-slate-900 transition hover:bg-sky-50/70">
                    <td className="px-4 py-3 text-sm whitespace-nowrap text-slate-600">
                      {a.dispatcherName ||
                        dispatchers.find(d => String(d.id) === String(a.dispatcherId))?.name ||
                        a.dispatcherId}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap font-semibold text-slate-900">
                      {a.driverName ||
                        drivers.find(d => String(d.id) === String(a.driverId))?.name ||
                        a.driverId}
                    </td>
                    <td className="px-4 py-3 text-sm whitespace-nowrap">
                      <ActionButton variant="danger" icon={<DeleteIcon />} onClick={() => handleDelete(a.dispatcherId, a.driverId)}>Delete</ActionButton>
                    </td>
                  </tr>
                ))}
                {filteredAssignments.length === 0 && (
                  <TableEmptyState colSpan={3} title="No assignments found" description="Try switching the assignment filter to broaden the results." />
                )}
              </tbody>
            </DataTable>
          )}
        </div>
      </div>
    </div>
  );
}
