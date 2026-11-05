
import React, { useEffect, useState } from "react";
import api from "../../services/api";
import { downloadInvoice } from "../../services/orderApi";

export default function OrderHistory({ onBack }) {
  const [orders, setOrders] = useState([]);
  const [summary, setSummary] = useState(null);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [downloadingInvoice, setDownloadingInvoice] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    loadOrderHistory();
  }, []);

  async function loadOrderHistory() {
    setLoading(true);
    setError("");

    try {
      const [ordersResponse, summaryResponse] = await Promise.all([
        api.get("/orders?limit=50&offset=0"),
        api.get("/dashboard/summary"),
      ]);

      setOrders(ordersResponse.data.orders || []);
      setSummary(summaryResponse.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load order history."
      );
    } finally {
      setLoading(false);
    }
  }

  async function openOrderDetails(orderId) {
    setDetailsLoading(true);
    setError("");

    try {
      const response = await api.get(`/orders/${orderId}`);
      setSelectedOrder(response.data);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
        "Could not load order details."
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleInvoiceDownload(orderId) {
    setDownloadingInvoice(orderId);
    setError("");

    try {
      await downloadInvoice(orderId);
    } catch (err) {
      console.error("Invoice download failed:", err);
      setError(
        err.response?.data?.detail ||
        "Unable to download invoice. Please try again."
      );
    } finally {
      setDownloadingInvoice(null);
    }
  }

  function formatDate(dateValue) {
    if (!dateValue) return "Date unavailable";

    return new Date(dateValue).toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });
  }

  const currency = (value) =>
    `₹${Number(value || 0).toFixed(2)}`;

  return (
    <main className="order-history-page">
      <div className="order-history-header">
        <div>
          <p className="history-eyebrow">DUKAANVOICE</p>
          <h1>Order History</h1>
          <p>View previous orders and download customer invoices.</p>
        </div>

        <div className="history-actions">
          <button
            type="button"
            onClick={loadOrderHistory}
            disabled={loading}
            className="history-button"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>

          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="history-button primary"
            >
              Back to Ordering
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="history-error" role="alert">
          {error}
        </div>
      )}

      {summary && (
        <div className="history-summary">
          <div className="history-stat">
            <span>Total Orders</span>
            <strong>{summary.total_orders ?? 0}</strong>
          </div>

          <div className="history-stat">
            <span>Total Revenue</span>
            <strong>{currency(summary.total_revenue)}</strong>
          </div>

          <div className="history-stat">
            <span>Today's Orders</span>
            <strong>{summary.today_orders ?? 0}</strong>
          </div>

          <div className="history-stat">
            <span>Today's Revenue</span>
            <strong>{currency(summary.today_revenue)}</strong>
          </div>
        </div>
      )}

      {selectedOrder && (
        <section className="order-detail-panel">
          <div className="detail-heading">
            <div>
              <h2>Order Details</h2>
              <p>{selectedOrder.order_number}</p>
            </div>

            <button
              type="button"
              className="history-button"
              onClick={() => setSelectedOrder(null)}
            >
              Close Details
            </button>
          </div>

          <div className="detail-meta">
            <span>
              Status: <strong>{selectedOrder.status}</strong>
            </span>
            <span>
              Language: <strong>{selectedOrder.language}</strong>
            </span>
            <span>
              Date: <strong>{formatDate(selectedOrder.created_at)}</strong>
            </span>
          </div>

          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Quantity</th>
                  <th>Unit Price</th>
                  <th>Amount</th>
                </tr>
              </thead>

              <tbody>
                {(selectedOrder.items || []).map((item, index) => (
                  <tr key={`${item.product_id}-${index}`}>
                    <td>{item.product_name}</td>
                    <td>{item.quantity} {item.unit}</td>
                    <td>{currency(item.unit_price)}</td>
                    <td>{currency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="history-total">
            Grand Total: {currency(selectedOrder.total)}
          </div>

          {selectedOrder.status === "confirmed" && (
            <button
              type="button"
              className="invoice-download-btn"
              onClick={() => handleInvoiceDownload(selectedOrder.id)}
              disabled={downloadingInvoice === selectedOrder.id}
            >
              {downloadingInvoice === selectedOrder.id
                ? "Downloading Invoice..."
                : "Download PDF Invoice"}
            </button>
          )}
        </section>
      )}

      <section className="orders-list-section">
        <h2>Recent Orders</h2>

        {loading ? (
          <p className="history-empty">Loading orders...</p>
        ) : orders.length === 0 ? (
          <p className="history-empty">
            No orders found. Confirm your first order to see it here.
          </p>
        ) : (
          <div className="history-table-wrapper">
            <table className="history-table">
              <thead>
                <tr>
                  <th>Order Number</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Language</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {orders.map((order) => (
                  <tr key={order.id}>
                    <td>{order.order_number}</td>
                    <td>{formatDate(order.created_at)}</td>
                    <td>{order.item_count}</td>
                    <td>{order.language}</td>
                    <td>{currency(order.total)}</td>
                    <td>
                      <span className="order-status">
                        {order.status}
                      </span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="history-button"
                        onClick={() => openOrderDetails(order.id)}
                        disabled={detailsLoading}
                      >
                        View
                      </button>

                      {order.status === "confirmed" && (
                        <button
                          type="button"
                          className="invoice-download-btn"
                          onClick={() => handleInvoiceDownload(order.id)}
                          disabled={downloadingInvoice === order.id}
                        >
                          {downloadingInvoice === order.id
                            ? "Downloading..."
                            : "Invoice"}
                        </button>
                      )}
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
