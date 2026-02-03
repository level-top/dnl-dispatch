"use client";
import { useEffect, useState } from "react";

import { getUsers, createUser, updateUser, deleteUser } from "../../utils/api";

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: "",
    userName: "",
    password: "",
    role: "dispatcher",
    contactNumber: "",
    email: ""
  });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  useEffect(() => { fetchUsers(); }, []);

  const handleChange = e => {
    const { name, value } = e.target;
    
    if (name === "contactNumber") {
      // Only allow numbers, +, -, (), and spaces for phone
      const phoneValue = value.replace(/[^\d\s\-+()]/g, '');
      setForm({ ...form, [name]: phoneValue });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async e => {
    e.preventDefault();
    
    // Validation
    if (!form.name?.trim() || form.name.length < 2) {
      setError("Name must be at least 2 characters");
      return;
    }

    if (!form.userName?.trim() || form.userName.length < 3) {
      setError("Username must be at least 3 characters");
      return;
    }

    if (!form.password?.trim() || form.password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      setError("Invalid email format");
      return;
    }

    if (form.contactNumber && !/^\+?[\d\s\-()]{10,}$/.test(form.contactNumber)) {
      setError("Phone number must be at least 10 digits");
      return;
    }

    // Check for uniqueness (skip if editing the same user)
    const duplicateUsername = users.find(u => 
      u.userName === form.userName && u.id !== editingId
    );
    if (duplicateUsername) {
      setError("Username already exists");
      return;
    }

    const duplicateEmail = users.find(u => 
      u.email === form.email && u.id !== editingId
    );
    if (duplicateEmail) {
      setError("Email already exists");
      return;
    }

    const duplicatePhone = users.find(u => 
      u.contactNumber === form.contactNumber && u.id !== editingId
    );
    if (duplicatePhone) {
      setError("Phone number already exists");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await updateUser(editingId, form);
      } else {
        await createUser(form);
      }
      setForm({
        name: "",
        userName: "",
        password: "",
        role: "dispatcher",
        contactNumber: "",
        email: ""
      });
      setEditingId(null);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const handleEdit = user => {
    setForm({
      name: user.name || "",
      userName: user.userName || "",
      password: user.password || "",
      role: user.role || "dispatcher",
      contactNumber: user.contactNumber || "",
      email: user.email || ""
    });
    setEditingId(user.id);
  };

  const handleDelete = async id => {
    if (!confirm("Delete this user?")) return;
    setLoading(true);
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 mt-2">
        <h1 className="text-2xl font-semibold text-blue-900 mb-6 tracking-tight">Users</h1>
        <form onSubmit={handleSubmit} className="grid text-blue-900 grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label htmlFor="name" className="block mb-1 font-medium">Name</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} placeholder="Name" className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required minLength={2} autoComplete="name" />
          </div>
          <div>
            <label htmlFor="userName" className="block mb-1 font-medium">Username</label>
            <input id="userName" name="userName" value={form.userName} onChange={handleChange} placeholder="Username" className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required minLength={3} autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </div>
          <div>
            <label htmlFor="password" className="block mb-1 font-medium">Password</label>
            <input id="password" name="password" value={form.password} onChange={handleChange} placeholder="Password" className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required type="password" minLength={6} autoComplete="new-password" />
          </div>
          <div>
            <label htmlFor="role" className="block mb-1 font-medium">Role</label>
            <select id="role" name="role" value={form.role} onChange={handleChange} className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required>
              <option value="admin">Admin</option>
              <option value="dispatcher">Dispatcher</option>
              <option value="sales">Sales</option>
            </select>
          </div>
          <div>
            <label htmlFor="contactNumber" className="block mb-1 font-medium">Contact Number</label>
            <input id="contactNumber" name="contactNumber" value={form.contactNumber} onChange={handleChange} placeholder="Contact Number (min 10 digits)" className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required pattern="^\+?[\d\s\-()]{10,}$" title="Phone number must be at least 10 digits" autoComplete="tel" />
          </div>
          <div>
            <label htmlFor="email" className="block mb-1 font-medium">Email</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email" className="text-gray-600 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 w-full" required pattern="[^\s@]+@[^\s@]+\.[^\s@]+" title="Enter a valid email address" autoComplete="email" autoCapitalize="none" spellCheck={false} />
          </div>
          <div className="flex gap-2 mt-2 md:col-span-3">
            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow transition disabled:opacity-60" disabled={loading}>
              {editingId ? "Update" : "Add"} User
            </button>
            {editingId && (
              <button type="button" className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded-lg shadow transition" onClick={() => { setForm({ name: "", userName: "", password: "", role: "dispatcher", contactNumber: "", email: "" }); setEditingId(null); }}>
                Cancel
              </button>
            )}
          </div>
        </form>
        {error && <div className="text-red-600 mb-2 text-sm font-medium">{error}</div>}
        <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Username</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Password</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Role</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact Number</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-blue-50 transition text-black">
                  <td className="px-4 py-2 whitespace-nowrap">{user.name}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{user.userName}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{user.password}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{user.role}</td>
                  <td className="px-4 py-2 whitespace-nowrap">{user.contactNumber}</td>
                  <td className="px-4 py-2 whitespace-nowrap ">{user.email}</td>
                  <td className="px-4 py-2 whitespace-nowrap flex gap-2">
                    <button className="bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium px-3 py-1 rounded shadow-sm transition" onClick={() => handleEdit(user)}>Edit</button>
                    <button className="bg-red-100 hover:bg-red-200 text-red-700 font-medium px-3 py-1 rounded shadow-sm transition" onClick={() => handleDelete(user.id)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
