"use client";
import { useEffect, useState } from "react";
import {
  getLoads,
  createLoad,
  updateLoad,
  deleteLoad,
  getUsers,
  getDrivers,
  getDriversForDispatcher,
  getStoredUser,
  uploadLoadDocument,
  deleteLoadDocument,
  getDocumentUrl,
  getLoadExtraDocuments,
  uploadLoadExtraDocuments,
  deleteLoadExtraDocument,
} from "../../utils/api";
import { formatDateTime } from "../../components/formatDateTime";
import LoadDetailsPopup from "../../components/LoadDetailsPopup";
import LoadTimeAlertIcon from "../../components/LoadTimeAlertIcon";
import {
  ActionButton,
  DataBadge,
  DataTable,
  DeleteIcon,
  EditIcon,
  HeaderCell,
  TableEmptyState,
} from "../../components/DataTable";


export default function LoadsPage() {
  const [me] = useState(() => getStoredUser());
  const role = String(me?.role || "").toLowerCase();
  const isDispatcher = role === "dispatcher";

  const [loads, setLoads] = useState([]);
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [assignedDrivers, setAssignedDrivers] = useState([]);
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [now, setNow] = useState(() => new Date());

  const [sortBy, setSortBy] = useState("pickup");
  const [sortOrder, setSortOrder] = useState("asc");

  const visibleLoads = isDispatcher
    ? loads.filter((l) => String(l?.dispatcherId || "") === String(me?.id || ""))
    : loads;

  const inProgressLoads = visibleLoads.filter((l) => {
    const status = String(l?.loadStatus || "").toLowerCase();
    return status === "booked" || status === "pickedup";
  });

  const toWordString = (value) => {
    const str = String(value ?? "");
    return str
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/\s+/g, " ")
      .trim();
  };

  const flattenForSearch = (value) => {
    const parts = [];
    if (value === null || value === undefined) return parts;
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      parts.push(String(value));
      return parts;
    }
    if (value instanceof Date) {
      parts.push(value.toISOString());
      return parts;
    }
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        parts.push(...flattenForSearch(item));
      });
      return parts;
    }
    if (typeof value === "object") {
      Object.entries(value).forEach(([k, v]) => {
        parts.push(...flattenForSearch(v));
      });
    }
    return parts;
  };

  const buildSearchHaystack = (load) => {
    const parts = flattenForSearch(load);

    const driver = drivers.find((d) => String(d.id) === String(load?.driverId ?? load?.driverName));
    if (driver?.name) {
      parts.push(driver.name);
    }

    const dispatcher = users.find((u) => String(u.id) === String(load?.dispatcherId));
    if (dispatcher?.name) {
      parts.push(dispatcher.name);
    }

    const statusRaw = String(load?.loadStatus ?? "");
    const statusWords = toWordString(statusRaw);
    const statusLower = statusWords.toLowerCase();
    const statusCompact = statusLower.replace(/\s+/g, "");
    if (statusRaw) parts.push(statusRaw);
    if (statusWords) parts.push(statusWords, statusLower);
    if (statusCompact) parts.push(statusCompact);

    return parts;
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const compactQuery = normalizedQuery.replace(/\s+/g, "");
  const filteredLoads = !normalizedQuery
    ? inProgressLoads
    : inProgressLoads.filter((load) => {
      const haystack = buildSearchHaystack(load).join(" | ").toLowerCase();
      if (haystack.includes(normalizedQuery)) return true;
      if (!compactQuery) return true;
      const compactHaystack = haystack.replace(/\s+/g, "");
      return compactHaystack.includes(compactQuery);
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

  const sortedLoads = [...filteredLoads].sort((a, b) => {
    let result = 0;
    if (sortBy === "pickup") {
      result = new Date(a.pickedUp_dateTime || 0) - new Date(b.pickedUp_dateTime || 0);
    } else if (sortBy === "delivery") {
      result = new Date(a.dropOff_dateTime || 0) - new Date(b.dropOff_dateTime || 0);
    } else if (sortBy === "amount") {
      result = (parseFloat(a.loadAmount) || 0) - (parseFloat(b.loadAmount) || 0);
    }
    return sortOrder === "asc" ? result : -result;
  });

  const initialForm = () => ({
    pickedUp_dateTime: "",
    dropOff_dateTime: "",
    driverName: "",
    dispatcherId: isDispatcher ? String(me?.id || "") : "",
    loadFrom: "",
    loadTo: "",
    brokerCompany: "",
    brokerMC: "",
    brokerName: "",
    loadNumber: "",
    loadAmount: "",
    miles: "",
    loadStatus: "booked",
    equipmentType: "",
    loadCategory: "",
    paymentTerms: "",
    quickPayFee: "",
    bolStatus: "pending",
    podStatus: "pending",
    rateConfStatus: "pending",
    expectedPaymentDate: "",
  });

  const [form, setForm] = useState(initialForm);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [extraDocuments, setExtraDocuments] = useState([]);

  const fetchExtraDocuments = async (loadId) => {
    if (!loadId) {
      setExtraDocuments([]);
      return;
    }
    try {
      const docs = await getLoadExtraDocuments(loadId);
      setExtraDocuments(Array.isArray(docs) ? docs : []);
    } catch {
      setExtraDocuments([]);
    }
  };

  const fetchLoads = async () => {
    setLoading(true);
    try {
      setLoads(await getLoads());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchLoads(); }, []);

  useEffect(() => {
    if (!isDispatcher) return;
    const myId = String(me?.id || "");
    if (!myId) return;
    setUsers(me ? [me] : []);
    setForm((prev) => ({ ...prev, dispatcherId: myId }));
  }, [isDispatcher, me]);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      setDrivers(await getDrivers());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDrivers(); }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      setUsers(await getUsers());
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (isDispatcher) return;
    fetchUsers();
  }, [isDispatcher]);

  useEffect(() => {
    fetchExtraDocuments(editingId);
  }, [editingId]);

  const handleChange = async e => {
    const { name, value } = e.target;
    if (isDispatcher && name === "dispatcherId") return;

    setForm(prev => ({ ...prev, [name]: value }));

    if (!isDispatcher && name === "dispatcherId" && value) {
      try {
        const result = await getDriversForDispatcher(value);
        setAssignedDrivers(result);
      } catch (err) {
        setAssignedDrivers([]);
      }
    } else if (!isDispatcher && name === "dispatcherId" && !value) {
      setAssignedDrivers([]);
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Validation
    const pickupDate = new Date(form.pickedUp_dateTime);
    const dropoffDate = new Date(form.dropOff_dateTime);

    if (pickupDate >= dropoffDate) {
      setError("Pickup date/time must be before dropoff date/time");
      return;
    }

    const amount = parseFloat(form.loadAmount);
    if (amount <= 0) {
      setError("Load amount must be greater than 0");
      return;
    }

    const miles = parseFloat(form.miles);
    if (miles <= 0) {
      setError("Miles must be greater than 0");
      return;
    }

    // Check load number uniqueness
    const duplicateLoadNumber = loads.find(l =>
      l.loadNumber === form.loadNumber && l.id !== editingId
    );
    if (duplicateLoadNumber) {
      setError("Load number already exists");
      return;
    }

    if (!form.loadFrom?.trim() || form.loadFrom.length < 3) {
      setError("Load From location must be at least 3 characters");
      return;
    }

    if (!form.loadTo?.trim() || form.loadTo.length < 3) {
      setError("Load To location must be at least 3 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const payload = isDispatcher
        ? { ...form, dispatcherId: String(me?.id || form.dispatcherId || "") }
        : form;

      if (editingId) {
        await updateLoad(editingId, payload);
      } else {
        await createLoad(payload);
      }
      setForm(initialForm());
      setEditingId(null);
      setAssignedDrivers([]);
      fetchLoads();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleEdit = async load => {
    // Format datetime for datetime-local input (YYYY-MM-DDTHH:MM)
    const formatForInput = (dateStr) => {
      if (!dateStr) return "";
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    setForm({
      pickedUp_dateTime: formatForInput(load.pickedUp_dateTime),
      dropOff_dateTime: formatForInput(load.dropOff_dateTime),
      driverName: load.driverName || "",
      dispatcherId: isDispatcher ? String(me?.id || "") : (load.dispatcherId || ""),
      loadFrom: load.loadFrom || "",
      loadTo: load.loadTo || "",
      brokerCompany: load.brokerCompany || "",
      brokerMC: load.brokerMC || "",
      brokerName: load.brokerName || "",
      loadNumber: load.loadNumber || "",
      loadAmount: load.loadAmount || "",
      miles: load.miles || "",
      loadStatus: load.loadStatus || "booked",
      equipmentType: load.equipmentType || "",
      loadCategory: load.loadCategory || "",
      paymentTerms: load.paymentTerms || "",
      quickPayFee: load.quickPayFee || "",
      bolStatus: load.bolStatus || "pending",
      podStatus: load.podStatus || "pending",
      rateConfStatus: load.rateConfStatus || "pending",
      expectedPaymentDate: load.expectedPaymentDate || "",
    });
    setEditingId(load.id);

    // Fetch assigned drivers for the selected dispatcher
    if (!isDispatcher && load.dispatcherId) {
      try {
        const result = await getDriversForDispatcher(load.dispatcherId);
        setAssignedDrivers(result);
      } catch (err) {
        setAssignedDrivers([]);
      }
    }

    window.scrollTo(0, 0);
  };

  const handleDelete = async id => {
    if (!confirm("Delete this load?")) return;
    setLoading(true);
    try {
      await deleteLoad(id);
      fetchLoads();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDocumentUpload = async (loadId, documentType, file) => {
    if (!file) return;
    setLoading(true);
    try {
      await uploadLoadDocument(loadId, documentType, file);
      fetchLoads();
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleDocumentDelete = async (loadId, documentType) => {
    if (!confirm(`Delete this ${documentType.toUpperCase()} document?`)) return;
    setLoading(true);
    try {
      await deleteLoadDocument(loadId, documentType);
      fetchLoads();
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleExtraDocumentsUpload = async (loadId, files) => {
    if (!loadId) return;
    if (!files || files.length === 0) return;
    setLoading(true);
    try {
      await uploadLoadExtraDocuments(loadId, files);
      await fetchExtraDocuments(loadId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleExtraDocumentDelete = async (loadId, docId) => {
    if (!loadId || !docId) return;
    if (!confirm('Delete this extra document?')) return;
    setLoading(true);
    try {
      await deleteLoadExtraDocument(loadId, docId);
      await fetchExtraDocuments(loadId);
      setError("");
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const selectedDriver = selectedLoad
    ? drivers.find((d) => String(d.id) === String(selectedLoad.driverId ?? selectedLoad.driverName))
    : null;
  const selectedDispatcher = selectedLoad
    ? users.find((u) => String(u.id) === String(selectedLoad.dispatcherId))
    : null;

  const dispatcherDisplayName = isDispatcher
    ? String(me?.name || me?.userName || "You")
    : (selectedDispatcher?.name || "");

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <LoadDetailsPopup
        open={!!selectedLoad}
        onClose={() => setSelectedLoad(null)}
        load={selectedLoad}
        driverName={selectedDriver?.name}
        dispatcherName={dispatcherDisplayName}
        onEdit={(load) => {
          setSelectedLoad(null);
          if (load) handleEdit(load);
        }}
        onDelete={(load) => {
          setSelectedLoad(null);
          if (load?.id) handleDelete(load.id);
        }}
      />
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
        <h1 className="text-2xl font-semibold text-blue-900 mb-6 tracking-tight">Loads</h1>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="flex flex-col">
            <label htmlFor="pickedUp_dateTime" className="mb-1 text-sm font-medium text-gray-700">Pickup Date/Time</label>
            <input id="pickedUp_dateTime" name="pickedUp_dateTime" value={form.pickedUp_dateTime} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="datetime-local" required />
          </div>
          <div className="flex flex-col">
            <label htmlFor="dropOff_dateTime" className="mb-1 text-sm font-medium text-gray-700">Dropoff Date/Time</label>
            <input id="dropOff_dateTime" name="dropOff_dateTime" value={form.dropOff_dateTime} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="datetime-local" required />
          </div>
          <div className="flex flex-col">
            <label htmlFor="dispatcherId" className="mb-1 text-sm font-medium text-gray-700">Dispatcher</label>
            {isDispatcher ? (
              <div className="text-gray-700 border border-gray-300 rounded-lg px-4 py-2 bg-gray-50">
                {String(me?.name || me?.userName || "You")}
              </div>
            ) : (
              <select id="dispatcherId" name="dispatcherId" value={form.dispatcherId} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required>
                <option value="">Select Dispatcher</option>
                {users.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex flex-col">
            <label htmlFor="driverName" className="mb-1 text-sm font-medium text-gray-700">Driver</label>
            <select id="driverName" name="driverName" value={form.driverName} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required>
              <option value="">Select Driver</option>
              {((!isDispatcher && form.dispatcherId) ? assignedDrivers : drivers).map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadFrom" className="mb-1 text-sm font-medium text-gray-700">From</label>
            <input id="loadFrom" name="loadFrom" value={form.loadFrom} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={3} placeholder="City, State" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadTo" className="mb-1 text-sm font-medium text-gray-700">To</label>
            <input id="loadTo" name="loadTo" value={form.loadTo} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={3} placeholder="City, State" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="brokerCompany" className="mb-1 text-sm font-medium text-gray-700">Broker Company</label>
            <input id="brokerCompany" name="brokerCompany" value={form.brokerCompany} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={2} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="brokerMC" className="mb-1 text-sm font-medium text-gray-700">Broker MC</label>
            <input id="brokerMC" name="brokerMC" value={form.brokerMC} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={2} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="brokerName" className="mb-1 text-sm font-medium text-gray-700">Broker Name</label>
            <input id="brokerName" name="brokerName" value={form.brokerName} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={2} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadNumber" className="mb-1 text-sm font-medium text-gray-700">Load Number (unique)</label>
            <input id="loadNumber" name="loadNumber" value={form.loadNumber} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required minLength={2} />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadAmount" className="mb-1 text-sm font-medium text-gray-700">Load Amount ($)</label>
            <input id="loadAmount" name="loadAmount" value={form.loadAmount} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required type="number" min="0.01" step="0.01" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="miles" className="mb-1 text-sm font-medium text-gray-700">Miles</label>
            <input id="miles" name="miles" value={form.miles} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required type="number" min="1" step="1" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="ratePerMile" className="mb-1 text-sm font-medium text-gray-700">Rate / Mile</label>
            <input id="ratePerMile" name="ratePerMile" value={(() => {
              const amt = parseFloat(form.loadAmount) || 0;
              const miles = parseFloat(form.miles) || 0;
              return miles > 0 ? (amt / miles).toFixed(2) : "";
            })()} readOnly className="bg-gray-100 text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none" type="number" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadPercentage" className="mb-1 text-sm font-medium text-gray-700">Load %</label>
            <input id="loadPercentage" name="loadPercentage" value={(() => {
              const driver = drivers.find(d => d.id == form.driverName);
              return driver?.percentage || "";
            })()} readOnly className="bg-gray-100 text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none" type="number" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="netAmount" className="mb-1 text-sm font-medium text-gray-700">Net Amount</label>
            <input id="netAmount" name="netAmount" value={(() => {
              const amt = parseFloat(form.loadAmount) || 0;
              const driver = drivers.find(d => d.id == form.driverName);
              const perc = driver?.percentage || 0;
              return amt * perc / 100 ? (amt * perc / 100).toFixed(2) : "";
            })()} readOnly className="bg-gray-100 text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none" type="number" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadStatus" className="mb-1 text-sm font-medium text-gray-700">Load Status</label>
            <select id="loadStatus" name="loadStatus" value={form.loadStatus} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" required>
              <option value="booked">Booked</option>
              <option value="pickedUp">Picked Up</option>
              <option value="delivered">Delivered</option>
              <option value="issue">Issue</option>
              <option value="canceled">Canceled</option>
            </select>
          </div>

          {/* Equipment & Load Details */}
          <div className="flex flex-col">
            <label htmlFor="equipmentType" className="mb-1 text-sm font-medium text-gray-700">Equipment Type (optional)</label>
            <select id="equipmentType" name="equipmentType" value={form.equipmentType} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">-- Select --</option>
              <option value="Dry Van">Dry Van</option>
              <option value="Refrigerated">Refrigerated (Reefer)</option>
              <option value="Flatbed">Flatbed</option>
              <option value="Step Deck">Step Deck</option>
              <option value="Power Only">Power Only</option>
              <option value="Hazmat">Hazmat</option>
              <option value="Conestoga">Conestoga</option>
              <option value="Box Truck">Box Truck</option>
              <option value="Auto Carrier">Auto Carrier</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="loadCategory" className="mb-1 text-sm font-medium text-gray-700">Load Category (optional)</label>
            <select id="loadCategory" name="loadCategory" value={form.loadCategory} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">-- Select --</option>
              <option value="Full Truckload">Full Truckload (FTL)</option>
              <option value="Partial Load">Partial Load</option>
              <option value="LTL">Less Than Truckload (LTL)</option>
            </select>
          </div>

          {/* Payment Terms */}
          <div className="flex flex-col">
            <label htmlFor="paymentTerms" className="mb-1 text-sm font-medium text-gray-700">Payment Terms (optional)</label>
            <select id="paymentTerms" name="paymentTerms" value={form.paymentTerms} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="">-- Select --</option>
              <option value="Quick Pay">Quick Pay (1-5 days)</option>
              <option value="Net 15">Net 15</option>
              <option value="Net 30">Net 30</option>
              <option value="Factoring">Factoring</option>
              <option value="COD">Cash on Delivery (COD)</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="quickPayFee" className="mb-1 text-sm font-medium text-gray-700">Quick Pay Fee % (optional)</label>
            <input id="quickPayFee" name="quickPayFee" value={form.quickPayFee} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="number" min="0" max="100" step="0.1" placeholder="e.g., 3.5" />
          </div>
          <div className="flex flex-col">
            <label htmlFor="expectedPaymentDate" className="mb-1 text-sm font-medium text-gray-700">Expected Payment Date (optional)</label>
            <input id="expectedPaymentDate" name="expectedPaymentDate" value={form.expectedPaymentDate} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400" type="date" />
          </div>

          {/* Documentation Status */}
          <div className="flex flex-col">
            <label htmlFor="bolStatus" className="mb-1 text-sm font-medium text-gray-700">BOL Status</label>
            <select id="bolStatus" name="bolStatus" value={form.bolStatus} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="podStatus" className="mb-1 text-sm font-medium text-gray-700">POD Status</label>
            <select id="podStatus" name="podStatus" value={form.podStatus} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>
          <div className="flex flex-col">
            <label htmlFor="rateConfStatus" className="mb-1 text-sm font-medium text-gray-700">Rate Confirmation Status</label>
            <select id="rateConfStatus" name="rateConfStatus" value={form.rateConfStatus} onChange={handleChange} className="text-gray-500 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400">
              <option value="pending">Pending</option>
              <option value="received">Received</option>
              <option value="submitted">Submitted</option>
            </select>
          </div>

          {/* Document Upload Section */}
          <div className="md:col-span-3 mt-4 mb-2">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Upload Documents
              {!editingId && <span className="text-sm text-gray-500 font-normal ml-2">(Save load first to enable uploads)</span>}
            </h3>
          </div>
          <div className="flex flex-col">
            <label htmlFor="load-bol" className="mb-1 text-sm font-medium text-gray-700">BOL Document</label>
            <input
              id="load-bol"
              name="bol"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => e.target.files[0] && handleDocumentUpload(editingId, 'bol', e.target.files[0])}
              disabled={!editingId}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="load-pod" className="mb-1 text-sm font-medium text-gray-700">POD Document</label>
            <input
              id="load-pod"
              name="pod"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => e.target.files[0] && handleDocumentUpload(editingId, 'pod', e.target.files[0])}
              disabled={!editingId}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>
          <div className="flex flex-col">
            <label htmlFor="load-rateConf" className="mb-1 text-sm font-medium text-gray-700">Rate Confirmation</label>
            <input
              id="load-rateConf"
              name="rateConf"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              onChange={(e) => e.target.files[0] && handleDocumentUpload(editingId, 'rateConf', e.target.files[0])}
              disabled={!editingId}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
            />
          </div>

          {/* Extra Documents (multi-file) */}
          <div className="md:col-span-3 mt-4 mb-2">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2">
              Extra Documents
              {!editingId && (
                <span className="text-sm text-gray-500 font-normal ml-2">(Save load first to enable uploads)</span>
              )}
            </h3>
          </div>
          <div className="md:col-span-3">
            <label htmlFor="load-extra-documents" className="sr-only">Upload extra documents</label>
            <input
              id="load-extra-documents"
              name="extraDocuments"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
              disabled={!editingId}
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                if (files.length) handleExtraDocumentsUpload(editingId, files);
                e.target.value = "";
              }}
              className="text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 disabled:opacity-50 disabled:cursor-not-allowed"
              autoComplete="off"
              aria-label="Upload extra documents"
            />

            <div className="mt-3 rounded-lg border border-gray-200 bg-white">
              {extraDocuments.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">No extra documents uploaded.</div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {extraDocuments.map((doc) => (
                    <div key={doc.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 px-3 py-2">
                      <div className="text-sm text-gray-700 break-words">
                        <div className="font-medium">{doc.originalName || doc.storedName}</div>
                        {doc.uploadedAt ? (
                          <div className="text-xs text-gray-500">Uploaded: {formatDateTime(doc.uploadedAt)}</div>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          className="text-sm text-blue-700 hover:underline"
                          href={getDocumentUrl(doc.path)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open
                        </a>
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => handleExtraDocumentDelete(editingId, doc.id)}
                          className="text-sm text-red-700 hover:underline disabled:opacity-60"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-2 mt-2 md:col-span-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition disabled:opacity-60" disabled={loading}>
              {editingId ? "Update" : "Add"} Load
            </button>
            {editingId && (
              <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg shadow transition" onClick={() => {
                setForm({
                  pickedUp_dateTime: "",
                  dropOff_dateTime: "",
                  driverName: "",
                  dispatcherId: "",
                  loadFrom: "",
                  loadTo: "",
                  brokerCompany: "",
                  brokerMC: "",
                  brokerName: "",
                  loadNumber: "",
                  loadAmount: "",
                  miles: "",
                  loadStatus: "booked",
                  equipmentType: "",
                  loadCategory: "",
                  paymentTerms: "",
                  quickPayFee: "",
                  bolStatus: "pending",
                  podStatus: "pending",
                  rateConfStatus: "pending",
                  expectedPaymentDate: "",
                }); setEditingId(null); setAssignedDrivers([]);
              }}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && <div className="text-red-600 mb-2 text-sm font-medium">{error}</div>}
        <div className="mb-3">
          <label htmlFor="loadsSearch" className="block mb-1 text-sm font-medium text-gray-700">Search</label>
          <input
            id="loadsSearch"
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search any load field (load #, broker, route, status, docs, etc.)"
            className="w-full text-gray-700 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <DataTable>
          <thead>
            <tr>
              <HeaderCell sortable onClick={() => toggleSort("pickup")} sortDirection={sortBy === "pickup" ? sortOrder : undefined}>Pickup</HeaderCell>
              <HeaderCell sortable onClick={() => toggleSort("delivery")} sortDirection={sortBy === "delivery" ? sortOrder : undefined}>Delivery</HeaderCell>
              <HeaderCell>Driver</HeaderCell>
              <HeaderCell>Load #</HeaderCell>
              <HeaderCell>Route</HeaderCell>
              <HeaderCell>Dispatcher</HeaderCell>
              <HeaderCell sortable onClick={() => toggleSort("amount")} sortDirection={sortBy === "amount" ? sortOrder : undefined}>Amount</HeaderCell>
              <HeaderCell>Status</HeaderCell>
              <HeaderCell>Actions</HeaderCell>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {sortedLoads.length === 0 ? (
              <TableEmptyState colSpan={9} title="No loads found" description="Try widening the date range or clearing a filter." />
            ) : (
              sortedLoads.map(load => {
                let pickedUpDate = new Date(load.pickedUp_dateTime).toLocaleString();
                let dropOffDate = new Date(load.dropOff_dateTime).toLocaleString();
                let dateTime = new Date(load.dateTime).toLocaleString();
                const driver = drivers.find(d => String(d.id) === String(load.driverId ?? load.driverName));
                const dispatcher = users.find(u => String(u.id) === String(load.dispatcherId));
                return (
                  <tr key={load.id} className="cursor-pointer text-slate-900 transition hover:bg-sky-50/70" onClick={() => setSelectedLoad(load)}>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 font-medium">
                        <LoadTimeAlertIcon pickupAt={load.pickedUp_dateTime} deliveryAt={load.dropOff_dateTime} now={now} />
                        <span>{pickedUpDate}</span>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{dropOffDate}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm font-semibold text-slate-900">{driver?.name || (load.driverId ?? load.driverName)}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-900">{load.loadNumber}</div>
                      <div className="text-xs text-slate-500">Created {dateTime}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      <div className="font-medium text-slate-900">{load.loadFrom}</div>
                      <div className="text-xs text-slate-500">→ {load.loadTo}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm text-slate-600">{dispatcher?.name || load.dispatcherId}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <div className="font-semibold text-slate-900">${load.loadAmount}</div>
                      <div className="text-xs text-slate-500">{load.miles ? `${load.miles} mi` : "Mileage pending"}</div>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm">
                      <DataBadge
                        tone={
                          load.loadStatus === "delivered"
                            ? "success"
                            : load.loadStatus === "pickedUp"
                              ? "info"
                              : load.loadStatus === "canceled"
                                ? "danger"
                                : "warning"
                        }
                      >
                        {load.loadStatus}
                      </DataBadge>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-sm" onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2">
                        <ActionButton variant="primary" icon={<EditIcon />} onClick={() => handleEdit(load)}>Edit</ActionButton>
                        <ActionButton variant="danger" icon={<DeleteIcon />} onClick={() => handleDelete(load.id)}>Delete</ActionButton>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </DataTable>
      </div>
    </div>
  );
}
