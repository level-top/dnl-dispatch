"use client";
import Image from "next/image";
import { useEffect, useState } from "react";
import { getCompanyDetails, createCompanyDetails, updateCompanyDetails, deleteCompanyDetails } from "../../utils/api";

export default function CompanyDetailsPage() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    CompanyName: "",
    Address: "",
    Phone: "",
    Email: "",
    BankName: "",
    IBAN: "",
    AccountHolder: "",
    LogoURL: "",
  });

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const data = await getCompanyDetails();
      setCompanies(data);
      setError("");
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    if (name === "Phone") {
      // Only allow numbers, +, -, (), and spaces for phone
      const phoneValue = value.replace(/[^\d\s\-+()]/g, '');
      setFormData({ ...formData, [name]: phoneValue });
    } else if (name === "LogoURL") {
      // URLs and base64 data URIs are case-sensitive; never uppercase this.
      setFormData({ ...formData, [name]: value });
    } else if (name === "Email") {
      // Keep email casing as-entered (or you can lowercase it), but do not uppercase.
      setFormData({ ...formData, [name]: value });
    } else {
      setFormData({ ...formData, [name]: value.toUpperCase() });
    }
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData({ ...formData, LogoURL: reader.result });
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.CompanyName?.trim()) {
      setError("Company Name is required");
      return;
    }

    if (formData.Email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.Email)) {
      setError("Invalid email format");
      return;
    }

    if (formData.Phone && !/^\+?[\d\s\-()]{10,}$/.test(formData.Phone)) {
      setError("Phone number must be at least 10 digits");
      return;
    }

    if (formData.IBAN && formData.IBAN.length < 15) {
      setError("IBAN must be at least 15 characters");
      return;
    }

    setLoading(true);
    setError("");
    try {
      if (editingId) {
        await updateCompanyDetails(editingId, formData);
      } else {
        await createCompanyDetails(formData);
      }
      setFormData({
        CompanyName: "",
        Address: "",
        Phone: "",
        Email: "",
        BankName: "",
        IBAN: "",
        AccountHolder: "",
        LogoURL: "",
      });
      setEditingId(null);
      fetchCompanies();
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleEdit = (company) => {
    setFormData(company);
    setEditingId(company.CompanyID);
    window.scrollTo(0, 0);
  };

  const handleDelete = async (id) => {
    if (confirm("Are you sure you want to delete this company?")) {
      setLoading(true);
      try {
        await deleteCompanyDetails(id);
        setError("");
        fetchCompanies();
      } catch (err) {
        setError(err.message);
      }
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      CompanyName: "",
      Address: "",
      Phone: "",
      Email: "",
      BankName: "",
      IBAN: "",
      AccountHolder: "",
      LogoURL: "",
    });
  };

  return (
    <div className="p-4 md:p-8">
      <h1 className="text-3xl font-bold text-blue-900 mb-6">Company Details</h1>

      {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4">{error}</div>}

      {/* Form */}
      <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
        <h2 className="text-xl text-blue-900 font-bold mb-4">{editingId ? "Edit Company" : "Add New Company"}</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-700">
          <input
            id="company-name"
            type="text"
            name="CompanyName"
            autoComplete="organization"
            aria-label="Company Name"
            placeholder="Company Name *"
            value={formData.CompanyName}
            onChange={handleInputChange}
            required
            minLength={2}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-address"
            type="text"
            name="Address"
            autoComplete="street-address"
            aria-label="Address"
            placeholder="Address"
            value={formData.Address}
            onChange={handleInputChange}
            minLength={5}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-phone"
            type="tel"
            name="Phone"
            autoComplete="tel"
            aria-label="Phone"
            placeholder="Phone (min 10 digits)"
            value={formData.Phone}
            onChange={handleInputChange}
            pattern="^\+?[\d\s\-()]{10,}$"
            title="Phone number must be at least 10 digits"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-email"
            type="email"
            name="Email"
            autoComplete="email"
            aria-label="Email"
            placeholder="Email"
            value={formData.Email}
            onChange={handleInputChange}
            pattern="[^\s@]+@[^\s@]+\.[^\s@]+"
            title="Enter a valid email address"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-bank-name"
            type="text"
            name="BankName"
            autoComplete="off"
            aria-label="Bank Name"
            placeholder="Bank Name"
            value={formData.BankName}
            onChange={handleInputChange}
            minLength={2}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-iban"
            type="text"
            name="IBAN"
            autoComplete="off"
            aria-label="IBAN"
            placeholder="IBAN (min 15 characters)"
            value={formData.IBAN}
            onChange={handleInputChange}
            minLength={15}
            maxLength={34}
            title="IBAN must be between 15-34 characters"
            className="border border-gray-300 rounded px-3 py-2"
          />
          <input
            id="company-account-holder"
            type="text"
            name="AccountHolder"
            autoComplete="name"
            aria-label="Account Holder Name"
            placeholder="Account Holder Name"
            value={formData.AccountHolder}
            onChange={handleInputChange}
            className="border border-gray-300 rounded px-3 py-2"
          />
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <input
                id="company-logo-url"
                type="text"
                name="LogoURL"
                autoComplete="url"
                aria-label="Logo URL"
                placeholder="Logo URL or upload below"
                value={formData.LogoURL}
                onChange={handleInputChange}
                className="border border-gray-300 rounded px-3 py-2 flex-1"
              />
              <label className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded cursor-pointer flex items-center">
                Upload
                <input
                  id="company-logo-upload"
                  name="companyLogo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  autoComplete="off"
                />
              </label>
            </div>
            {formData.LogoURL && (
              <div className="flex items-center gap-2">
                <Image
                  src={formData.LogoURL}
                  alt="Logo preview"
                  width={96}
                  height={48}
                  className="h-12 w-auto border border-gray-300 rounded"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, LogoURL: "" })}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
          <div className="md:col-span-2 flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
            >
              {loading ? "Saving..." : editingId ? "Update" : "Create"}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={handleCancel}
                className="bg-gray-500 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded"
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Companies Table */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Company Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Email</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Phone</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Bank Name</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {companies.map((company) => (
              <tr key={company.CompanyID} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-sm text-gray-800">{company.CompanyName}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{company.Email || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{company.Phone || "-"}</td>
                <td className="px-4 py-3 text-sm text-gray-800">{company.BankName || "-"}</td>
                <td className="px-4 py-3 text-sm flex gap-2">
                  <button
                    onClick={() => handleEdit(company)}
                    className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(company.CompanyID)}
                    className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!loading && companies.length === 0 && (
          <div className="p-4 text-center text-gray-500">No companies found</div>
        )}
      </div>
    </div>
  );
}
