// Utility functions for API calls to the Express.js backend
// Use NEXT_PUBLIC_API_BASE so deployments can point to a real API host.
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000/api';
const API_ORIGIN = API_BASE.replace(/\/api\/?$/, '');

const TOKEN_KEY = 'dnl_token';
const USER_KEY = 'dnl_user';

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuth(token, user) {
  if (typeof window === 'undefined') return;
  if (token) window.localStorage.setItem(TOKEN_KEY, String(token));
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));

  try {
    window.dispatchEvent(new Event('dnl-auth-changed'));
  } catch {
    // ignore
  }
}

export function clearStoredAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(TOKEN_KEY);
  window.localStorage.removeItem(USER_KEY);

  try {
    window.dispatchEvent(new Event('dnl-auth-changed'));
  } catch {
    // ignore
  }
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function authHeader() {
  const token = getStoredToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

async function readErrorBody(res) {
  const contentType = String(res.headers.get('content-type') || '').toLowerCase();
  try {
    if (contentType.includes('application/json')) {
      return await res.json();
    }
  } catch {
    // ignore
  }
  try {
    return await res.text();
  } catch {
    return null;
  }
}

function messageFromBody(body) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (typeof body === 'object') {
    if (typeof body.error === 'string') return body.error;
    if (typeof body.message === 'string') return body.message;
  }
  return '';
}

export async function fetchAPI(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeader(),
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    const msg = messageFromBody(body) || `Request failed (${res.status})`;

    if (typeof window !== 'undefined') {
      if (res.status === 401) {
        clearStoredAuth();
        window.location.href = '/login';
      }
      if (res.status === 403) {
        window.location.href = '/forbidden';
      }
    }

    throw new ApiError(msg, res.status, body);
  }

  return res.json();
}

export { ApiError };

// Auth
export const login = async (userName, password) => {
  const data = await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ userName, password }),
  });
  if (data?.token) setStoredAuth(data.token, data.user);
  return data;
};

export const getMe = () => fetchAPI('/auth/me');

// Users
export const getUsers = () => fetchAPI('/users');
export const getUser = (id) => fetchAPI(`/users/${id}`);
export const createUser = (data) => fetchAPI('/users', { method: 'POST', body: JSON.stringify(data) });
export const updateUser = (id, data) => fetchAPI(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteUser = (id) => fetchAPI(`/users/${id}`, { method: 'DELETE' });

// Loads
const normalizeLoad = (load) => {
  if (!load || typeof load !== 'object') return load;
  return {
    ...load,
    driverId: load.driverId ?? load.driverName ?? null,
  };
};

export const getLoads = async () => {
  const loads = await fetchAPI('/loads');
  return Array.isArray(loads) ? loads.map(normalizeLoad) : loads;
};

export const getLoad = async (id) => normalizeLoad(await fetchAPI(`/loads/${id}`));
export const createLoad = (data) => fetchAPI('/loads', { method: 'POST', body: JSON.stringify(data) });
export const updateLoad = (id, data) => fetchAPI(`/loads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteLoad = (id) => fetchAPI(`/loads/${id}`, { method: 'DELETE' });

// Drivers
export const getDrivers = () => fetchAPI('/drivers');
export const getDriver = (id) => fetchAPI(`/drivers/${id}`);
export const createDriver = (data) => fetchAPI('/drivers', { method: 'POST', body: JSON.stringify(data) });
export const updateDriver = (id, data) => fetchAPI(`/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteDriver = (id) => fetchAPI(`/drivers/${id}`, { method: 'DELETE' });

// Assignments
export const getAssignments = () => fetchAPI('/assignments');
export const getDriversForDispatcher = (dispatcherId) => fetchAPI(`/assignments/drivers/${dispatcherId}`);
export const getDispatchersForDriver = (driverId) => fetchAPI(`/assignments/dispatchers/${driverId}`);
export const createAssignment = (data) => fetchAPI('/assignments', { method: 'POST', body: JSON.stringify(data) });
export const deleteAssignment = (data) => fetchAPI('/assignments', { method: 'DELETE', body: JSON.stringify(data) });


// Company Details
export const getCompanyDetails = () => fetchAPI('/company');
export const getCompanyDetailsById = (id) => fetchAPI(`/company/${id}`);
export const createCompanyDetails = (data) => fetchAPI('/company', { method: 'POST', body: JSON.stringify(data) });
export const updateCompanyDetails = (id, data) => fetchAPI(`/company/${id}`, { method: 'PUT', body: JSON.stringify(data) });
export const deleteCompanyDetails = (id) => fetchAPI(`/company/${id}`, { method: 'DELETE' });

// Invoices
export const getAllInvoices = () => fetchAPI('/invoices');
export const getInvoiceById = (invoiceId) => fetchAPI(`/invoices/${invoiceId}`);
export const getInvoiceLoads = (invoiceId) => fetchAPI(`/invoices/${invoiceId}/loads`);
export const getInvoicePayments = (invoiceId) => fetchAPI(`/invoices/${invoiceId}/payments`);
export const getInvoiceAudit = (invoiceId) => fetchAPI(`/invoices/${invoiceId}/audit`);
export const getInvoicesByDriver = (driverId) => fetchAPI(`/invoices/driver/${driverId}`);
export const createInvoice = (data) => fetchAPI('/invoices', { method: 'POST', body: JSON.stringify(data) });
export const updateInvoice = (invoiceId, data) => fetchAPI(`/invoices/${invoiceId}`, { method: 'PUT', body: JSON.stringify(data) });
export const payInvoice = (invoiceId, payment) =>
  fetchAPI(`/invoices/${invoiceId}/pay`, {
    method: 'POST',
    body: payment ? JSON.stringify(payment) : undefined,
  });
export const undoPayInvoice = (invoiceId, payload) =>
  fetchAPI(`/invoices/${invoiceId}/undo-pay`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : undefined,
  });
export const deleteInvoice = (invoiceId) => fetchAPI(`/invoices/${invoiceId}`, { method: 'DELETE' });

// Settlements
export const createWeeklySettlementInvoice = (data) =>
  fetchAPI('/settlements/weekly', { method: 'POST', body: JSON.stringify(data) });

// Document uploads for loads
const API_BASE_ROOT = API_BASE;

export const uploadLoadDocument = async (loadId, documentType, file) => {
  const formData = new FormData();
  // Append documentType before the file so Multer can access it during filename generation.
  formData.append('documentType', documentType);
  formData.append('document', file);

  const res = await fetch(`${API_BASE_ROOT}/loads/${loadId}/upload-document`, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteLoadDocument = async (loadId, documentType) => {
  const res = await fetch(`${API_BASE_ROOT}/loads/${loadId}/delete-document`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ documentType }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const getDocumentUrl = (path) => {
  if (!path) return null;
  const baseUrl = `${API_ORIGIN}${path}`;
  // Agreements are intentionally public (token links). Other uploads require auth.
  const p = String(path);
  if (!(p.startsWith('/uploads/loads/') || p.startsWith('/uploads/drivers/'))) return baseUrl;

  const token = getStoredToken();
  if (!token) return baseUrl;

  try {
    const url = new URL(baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
  } catch {
    // Fallback for unexpected URL parsing issues
    const joiner = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${joiner}token=${encodeURIComponent(token)}`;
  }
};

// Document uploads for drivers
export const uploadDriverDocument = async (driverId, documentType, file) => {
  const formData = new FormData();
  // Append documentType before the file so Multer can access it during filename generation.
  formData.append('documentType', documentType);
  formData.append('document', file);

  const res = await fetch(`${API_BASE_ROOT}/drivers/${driverId}/upload-document`, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteDriverDocument = async (driverId, documentType) => {
  const res = await fetch(`${API_BASE_ROOT}/drivers/${driverId}/delete-document`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json', ...authHeader() },
    body: JSON.stringify({ documentType }),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

// Extra Documents (multi-file) for loads
export const getLoadExtraDocuments = (loadId) => fetchAPI(`/loads/${loadId}/extra-documents`);

export const uploadLoadExtraDocuments = async (loadId, files) => {
  const formData = new FormData();
  (files || []).forEach((file) => {
    formData.append('documents', file);
  });

  const res = await fetch(`${API_BASE_ROOT}/loads/${loadId}/extra-documents`, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteLoadExtraDocument = (loadId, docId) =>
  fetchAPI(`/loads/${loadId}/extra-documents/${docId}`, { method: 'DELETE' });

// Extra Documents (multi-file) for drivers
export const getDriverExtraDocuments = (driverId) => fetchAPI(`/drivers/${driverId}/extra-documents`);

export const uploadDriverExtraDocuments = async (driverId, files) => {
  const formData = new FormData();
  (files || []).forEach((file) => {
    formData.append('documents', file);
  });

  const res = await fetch(`${API_BASE_ROOT}/drivers/${driverId}/extra-documents`, {
    method: 'POST',
    body: formData,
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
};

export const deleteDriverExtraDocument = (driverId, docId) =>
  fetchAPI(`/drivers/${driverId}/extra-documents/${docId}`, { method: 'DELETE' });

// Driver Agreements (in-app signing)
export const listDriverAgreements = (driverId) => fetchAPI(`/drivers/${driverId}/agreements`);

export const createDriverAgreement = (driverId, payload) =>
  fetchAPI(`/drivers/${driverId}/agreements`, {
    method: 'POST',
    body: payload ? JSON.stringify(payload) : JSON.stringify({}),
  });

// Public: token link flows
export const getAgreementByToken = (token) => fetchAPI(`/agreements/${token}`);

export const signAgreementByToken = (token, payload) =>
  fetchAPI(`/agreements/${token}/sign`, {
    method: 'POST',
    body: JSON.stringify(payload || {}),
  });

// Agreement Template (company editable)
export const getAgreementTemplate = () => fetchAPI('/agreement-template');

export const updateAgreementTemplate = (payload) =>
  fetchAPI('/agreement-template', {
    method: 'PUT',
    body: JSON.stringify(payload || {}),
  });

// Admin backups
export const getBackups = async () => {
  const data = await fetchAPI('/backups');
  return Array.isArray(data?.files) ? data.files : [];
};

export const createBackupNow = () => fetchAPI('/backups', { method: 'POST' });

export const deleteBackup = (fileName) =>
  fetchAPI(`/backups/${encodeURIComponent(fileName)}`, { method: 'DELETE' });

export const downloadBackup = async (fileName) => {
  const res = await fetch(`${API_BASE}/backups/${encodeURIComponent(fileName)}/download`, {
    method: 'GET',
    headers: {
      ...authHeader(),
    },
  });

  if (!res.ok) {
    const body = await readErrorBody(res);
    throw new ApiError(messageFromBody(body) || `Request failed (${res.status})`, res.status, body);
  }

  const blob = await res.blob();
  const objectUrl = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(objectUrl);
};
