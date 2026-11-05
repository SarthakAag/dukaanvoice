
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Plus,
  Search,
  Pencil,
  Power,
  Package,
  RefreshCw,
  X,
  Save,
} from "lucide-react";
import "./ProductManagement.css";

const API = "http://127.0.0.1:8000/api";

const EMPTY_FORM = {
  name: "",
  aliases: "",
  price: "",
  unit: "piece",
  stock: "100",
};

export default function ProductManagement({ onBack, onProductsUpdated }) {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadProducts() {
    setLoading(true);
    setError("");

    try {
      // Include inactive products so the shopkeeper can manage them.
      const response = await axios.get(
        `${API}/products?include_inactive=true`
      );
      setProducts(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not load products. Check whether the backend is running."
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.name, ...(product.aliases || [])].some((value) =>
          String(value).toLowerCase().includes(query)
        );

      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && product.is_active) ||
        (statusFilter === "inactive" && !product.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [products, search, statusFilter]);

  const activeCount = products.filter((product) => product.is_active).length;
  const inactiveCount = products.length - activeCount;

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function resetForm() {
    setForm(EMPTY_FORM);
    setEditingId(null);
  }

  function editProduct(product) {
    setEditingId(product.id);
    setForm({
      name: product.name || "",
      aliases: (product.aliases || []).join(", "),
      price: String(product.price ?? ""),
      unit: product.unit || "piece",
      stock: String(product.stock ?? 0),
    });

    setError("");
    setSuccess("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const name = form.name.trim();
    const price = Number(form.price);
    const stock = Number(form.stock);

    if (!name) {
      setError("Please enter a product name.");
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be greater than zero.");
      return;
    }

    if (!Number.isFinite(stock) || stock < 0) {
      setError("Stock cannot be negative.");
      return;
    }

    if (!form.unit.trim()) {
      setError("Please enter a unit.");
      return;
    }

    const payload = {
      name,
      aliases: form.aliases
        .split(",")
        .map((alias) => alias.trim())
        .filter(Boolean),
      price,
      unit: form.unit.trim(),
      stock,
    };

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (editingId) {
        await axios.put(`${API}/products/${editingId}`, payload);
        setSuccess("Product updated successfully.");
      } else {
        await axios.post(`${API}/products`, payload);
        setSuccess("Product added successfully.");
      }

      resetForm();
      await loadProducts();

      if (onProductsUpdated) {
        await onProductsUpdated();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not save the product. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleProductStatus(product) {
    const action = product.is_active ? "deactivate" : "activate";

    const confirmed = window.confirm(
      `Are you sure you want to ${action} ${product.name}?`
    );

    if (!confirmed) return;

    setError("");
    setSuccess("");

    try {
      await axios.patch(`${API}/products/${product.id}/status`, {
        is_active: !product.is_active,
      });

      setSuccess(
        `${product.name} ${product.is_active ? "deactivated" : "activated"} successfully.`
      );

      await loadProducts();

      if (onProductsUpdated) {
        await onProductsUpdated();
      }
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          `Could not ${action} this product.`
      );
    }
  }

  return (
    <main className="product-management">
      <div className="pm-header">
        <div>
          <span className="pm-eyebrow">CATALOGUE MANAGEMENT</span>
          <h1>Product Management</h1>
          <p>Manage your shop products, prices and availability.</p>
        </div>

        <button className="pm-back-button" onClick={onBack}>
          Back to ordering
        </button>
      </div>

      <section className="pm-stats">
        <article className="pm-stat-card">
          <Package size={22} />
          <div>
            <span>Total products</span>
            <strong>{products.length}</strong>
          </div>
        </article>

        <article className="pm-stat-card">
          <div className="pm-status-dot active-dot" />
          <div>
            <span>Active products</span>
            <strong>{activeCount}</strong>
          </div>
        </article>

        <article className="pm-stat-card">
          <div className="pm-status-dot inactive-dot" />
          <div>
            <span>Inactive products</span>
            <strong>{inactiveCount}</strong>
          </div>
        </article>
      </section>

      {error && (
        <div className="pm-alert pm-error" role="alert">
          {error}
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="pm-alert pm-success" role="status">
          {success}
          <button
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <section className="pm-form-card">
        <div className="pm-section-heading">
          <div>
            <h2>{editingId ? "Edit product" : "Add new product"}</h2>
            <p>
              {editingId
                ? "Update the selected product details."
                : "Enter the details of a product to add it to your catalogue."}
            </p>
          </div>

          {editingId && (
            <button className="pm-cancel-button" onClick={resetForm}>
              <X size={16} />
              Cancel edit
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="pm-form-grid">
            <label>
              Product name *
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Example: Basmati Rice"
                maxLength={150}
                required
              />
            </label>

            <label>
              Price (₹) *
              <input
                name="price"
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={updateField}
                placeholder="Example: 80"
                required
              />
            </label>

            <label>
              Unit *
              <input
                name="unit"
                value={form.unit}
                onChange={updateField}
                placeholder="Example: kg, litre, piece"
                maxLength={30}
                required
              />
            </label>

            <label>
              Opening / current stock *
              <input
                name="stock"
                type="number"
                min="0"
                max="1000000"
                step="any"
                value={form.stock}
                onChange={updateField}
                required
              />
            </label>

            <label className="pm-full-width">
              Aliases
              <input
                name="aliases"
                value={form.aliases}
                onChange={updateField}
                placeholder="Example: rice, arisi, biyyam"
              />
              <small>
                Separate alternative names with commas. Useful for voice
                recognition.
              </small>
            </label>
          </div>

          <div className="pm-form-actions">
            <button
              type="submit"
              className="pm-primary-button"
              disabled={saving}
            >
              {saving ? (
                <RefreshCw className="pm-spin" size={17} />
              ) : editingId ? (
                <Save size={17} />
              ) : (
                <Plus size={17} />
              )}
              {saving
                ? "Saving..."
                : editingId
                  ? "Update product"
                  : "Add product"}
            </button>
          </div>
        </form>
      </section>

      <section className="pm-list-card">
        <div className="pm-section-heading">
          <div>
            <h2>Product catalogue</h2>
            <p>{filteredProducts.length} products displayed</p>
          </div>

          <button
            className="pm-refresh-button"
            onClick={loadProducts}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "pm-spin" : ""} />
            Refresh
          </button>
        </div>

        <div className="pm-toolbar">
          <div className="pm-search">
            <Search size={17} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search product or alias..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="Filter products by status"
          >
            <option value="all">All products</option>
            <option value="active">Active only</option>
            <option value="inactive">Inactive only</option>
          </select>
        </div>

        {loading ? (
          <div className="pm-empty-state">Loading products...</div>
        ) : filteredProducts.length === 0 ? (
          <div className="pm-empty-state">
            No products found. Try another search or add a product.
          </div>
        ) : (
          <div className="pm-table-wrapper">
            <table className="pm-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Unit</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <div className="pm-product-name">
                        <span className="pm-product-avatar">
                          {product.name?.charAt(0)?.toUpperCase() || "P"}
                        </span>
                        <div>
                          <strong>{product.name}</strong>
                          {product.aliases?.length > 0 && (
                            <small>{product.aliases.join(", ")}</small>
                          )}
                        </div>
                      </div>
                    </td>

                    <td>₹{Number(product.price).toFixed(2)}</td>
                    <td>{product.unit}</td>
                    <td>{product.stock}</td>

                    <td>
                      <span
                        className={`pm-status ${
                          product.is_active ? "is-active" : "is-inactive"
                        }`}
                      >
                        {product.is_active ? "Active" : "Inactive"}
                      </span>
                    </td>

                    <td>
                      <div className="pm-row-actions">
                        <button
                          className="pm-edit-button"
                          onClick={() => editProduct(product)}
                          title={`Edit ${product.name}`}
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil size={16} />
                        </button>

                        <button
                          className={`pm-toggle-button ${
                            product.is_active ? "deactivate" : "activate"
                          }`}
                          onClick={() => toggleProductStatus(product)}
                          title={
                            product.is_active ? "Deactivate" : "Activate"
                          }
                          aria-label={
                            `${product.is_active ? "Deactivate" : "Activate"} ${product.name}`
                          }
                        >
                          <Power size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
