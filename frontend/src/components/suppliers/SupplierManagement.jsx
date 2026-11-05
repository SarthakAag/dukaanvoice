
import React, { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Plus,
  Search,
  Edit2,
  Users,
  Phone,
  Mail,
  MapPin,
  X,
  RefreshCw,
  UserRound,
} from "lucide-react";
import api from "../../services/api";
import "./SupplierManagement.css";

const emptyForm = {
  name: "",
  contact_person: "",
  phone: "",
  email: "",
  address: "",
  notes: "",
};

export default function SupplierManagement({ onBack }) {
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadSuppliers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await api.get("/suppliers", {
        params: { include_inactive: true },
      });

      setSuppliers(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to load suppliers. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSuppliers();
  }, []);

  const filteredSuppliers = useMemo(() => {
    const term = search.trim().toLowerCase();

    return suppliers.filter((supplier) => {
      const matchesStatus = showInactive || supplier.is_active;

      const matchesSearch =
        !term ||
        [
          supplier.name,
          supplier.contact_person,
          supplier.phone,
          supplier.email,
        ]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));

      return matchesStatus && matchesSearch;
    });
  }, [suppliers, search, showInactive]);

  const openAddForm = () => {
    setEditingSupplier(null);
    setForm(emptyForm);
    setError("");
    setShowForm(true);
  };

  const openEditForm = (supplier) => {
    setEditingSupplier(supplier);
    setForm({
      name: supplier.name || "",
      contact_person: supplier.contact_person || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      notes: supplier.notes || "",
    });
    setError("");
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setForm(emptyForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((previous) => ({ ...previous, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Supplier name and phone number are required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        contact_person: form.contact_person.trim() || null,
        phone: form.phone.trim(),
        email: form.email.trim() || null,
        address: form.address.trim() || null,
        notes: form.notes.trim() || null,
      };

      if (editingSupplier) {
        await api.put(`/suppliers/${editingSupplier.id}`, payload);
        setSuccess("Supplier updated successfully.");
      } else {
        await api.post("/suppliers", payload);
        setSuccess("Supplier added successfully.");
      }

      closeForm();
      await loadSuppliers();
    } catch (err) {
      setError(
        err.response?.data?.detail || "Unable to save supplier. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const toggleSupplierStatus = async (supplier) => {
    const nextStatus = !supplier.is_active;

    try {
      setError("");
      setSuccess("");

      await api.patch(`/suppliers/${supplier.id}/status`, {
        is_active: nextStatus,
      });

      setSuppliers((previous) =>
        previous.map((item) =>
          item.id === supplier.id
            ? { ...item, is_active: nextStatus }
            : item
        )
      );

      setSuccess(
        nextStatus
          ? "Supplier activated successfully."
          : "Supplier deactivated successfully."
      );
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Unable to update supplier status. Please try again."
      );
    }
  };

  const activeCount = suppliers.filter((item) => item.is_active).length;
  const inactiveCount = suppliers.length - activeCount;

  return (
    <div className="supplier-page">
      <div className="supplier-header">
        <div className="supplier-heading">
          <button className="supplier-back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            Back
          </button>

          <div>
            <h1>Supplier Management</h1>
            <p>Manage your suppliers and their contact information.</p>
          </div>
        </div>

        <button className="supplier-add-btn" onClick={openAddForm}>
          <Plus size={18} />
          Add Supplier
        </button>
      </div>

      <div className="supplier-stats">
        <div className="supplier-stat-card">
          <div className="supplier-stat-icon">
            <Users size={21} />
          </div>
          <div>
            <span>Total Suppliers</span>
            <strong>{suppliers.length}</strong>
          </div>
        </div>

        <div className="supplier-stat-card">
          <div className="supplier-stat-icon active">
            <UserRound size={21} />
          </div>
          <div>
            <span>Active Suppliers</span>
            <strong>{activeCount}</strong>
          </div>
        </div>

        <div className="supplier-stat-card">
          <div className="supplier-stat-icon inactive">
            <UserRound size={21} />
          </div>
          <div>
            <span>Inactive Suppliers</span>
            <strong>{inactiveCount}</strong>
          </div>
        </div>
      </div>

      <div className="supplier-toolbar">
        <div className="supplier-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by name, phone or contact person..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <label className="supplier-inactive-filter">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(event) => setShowInactive(event.target.checked)}
          />
          Show inactive suppliers
        </label>

        <button
          className="supplier-refresh-btn"
          onClick={loadSuppliers}
          disabled={loading}
          title="Refresh suppliers"
        >
          <RefreshCw size={17} />
        </button>
      </div>

      {error && !showForm && (
        <div className="supplier-alert error">{error}</div>
      )}

      {success && (
        <div className="supplier-alert success">{success}</div>
      )}

      {loading ? (
        <div className="supplier-empty">Loading suppliers...</div>
      ) : filteredSuppliers.length === 0 ? (
        <div className="supplier-empty">
          <Users size={38} />
          <h3>No suppliers found</h3>
          <p>
            {search
              ? "Try another search term."
              : "Add your first supplier to get started."}
          </p>
        </div>
      ) : (
        <div className="supplier-grid">
          {filteredSuppliers.map((supplier) => (
            <div className="supplier-card" key={supplier.id}>
              <div className="supplier-card-top">
                <div className="supplier-avatar">
                  {(supplier.name || "S").charAt(0).toUpperCase()}
                </div>

                <span
                  className={`supplier-status ${
                    supplier.is_active ? "is-active" : "is-inactive"
                  }`}
                >
                  {supplier.is_active ? "Active" : "Inactive"}
                </span>
              </div>

              <h3>{supplier.name}</h3>

              {supplier.contact_person && (
                <p className="supplier-contact-person">
                  <UserRound size={15} />
                  {supplier.contact_person}
                </p>
              )}

              <div className="supplier-details">
                <p>
                  <Phone size={15} />
                  {supplier.phone}
                </p>

                {supplier.email && (
                  <p>
                    <Mail size={15} />
                    {supplier.email}
                  </p>
                )}

                {supplier.address && (
                  <p>
                    <MapPin size={15} />
                    {supplier.address}
                  </p>
                )}
              </div>

              {supplier.notes && (
                <p className="supplier-notes">{supplier.notes}</p>
              )}

              <div className="supplier-card-actions">
                <button
                  className="supplier-edit-btn"
                  onClick={() => openEditForm(supplier)}
                >
                  <Edit2 size={15} />
                  Edit
                </button>

                <button
                  className={`supplier-toggle-btn ${
                    supplier.is_active ? "deactivate" : "activate"
                  }`}
                  onClick={() => toggleSupplierStatus(supplier)}
                >
                  {supplier.is_active ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div className="supplier-modal-overlay">
          <div className="supplier-modal">
            <div className="supplier-modal-header">
              <div>
                <h2>
                  {editingSupplier ? "Edit Supplier" : "Add New Supplier"}
                </h2>
                <p>Enter the supplier's information below.</p>
              </div>

              <button className="supplier-close-btn" onClick={closeForm}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="supplier-form-grid">
                <div className="supplier-field">
                  <label>Supplier Name *</label>
                  <input
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    placeholder="Enter supplier name"
                    required
                    maxLength={150}
                  />
                </div>

                <div className="supplier-field">
                  <label>Contact Person</label>
                  <input
                    name="contact_person"
                    value={form.contact_person}
                    onChange={handleChange}
                    placeholder="Enter contact person"
                    maxLength={150}
                  />
                </div>

                <div className="supplier-field">
                  <label>Phone Number *</label>
                  <input
                    name="phone"
                    type="tel"
                    value={form.phone}
                    onChange={handleChange}
                    placeholder="Enter phone number"
                    required
                    minLength={5}
                    maxLength={20}
                  />
                </div>

                <div className="supplier-field">
                  <label>Email Address</label>
                  <input
                    name="email"
                    type="email"
                    value={form.email}
                    onChange={handleChange}
                    placeholder="Enter email address"
                  />
                </div>

                <div className="supplier-field full-width">
                  <label>Address</label>
                  <textarea
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Enter supplier address"
                    rows={2}
                  />
                </div>

                <div className="supplier-field full-width">
                  <label>Notes</label>
                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    placeholder="Additional information"
                    rows={3}
                  />
                </div>
              </div>

              {error && (
                <div className="supplier-alert error">{error}</div>
              )}

              <div className="supplier-modal-actions">
                <button
                  type="button"
                  className="supplier-cancel-btn"
                  onClick={closeForm}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="supplier-submit-btn"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingSupplier
                    ? "Update Supplier"
                    : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
