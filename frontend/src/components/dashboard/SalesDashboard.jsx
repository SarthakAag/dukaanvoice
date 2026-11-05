
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  BarChart3,
  ClipboardList,
  IndianRupee,
  Package,
  RotateCcw,
  LoaderCircle,
} from "lucide-react";

import {
  fetchAnalytics,
  updateProductStock,
} from "../../services/analyticsApi";

import StatCard from "./StatCard";
import RevenueChart from "./RevenueChart";
import TopProducts from "./TopProducts";
import InventoryTable from "../inventory/InventoryTable";


export default function SalesDashboard({
  onMessage,
  onProductsUpdated,
}) {
  const [analytics, setAnalytics] = useState(null);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(false);
  const [savingStockId, setSavingStockId] = useState(null);

  // Keep the latest notification callback without
  // unnecessarily reloading analytics.
  const onMessageRef = useRef(onMessage);

  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);


  // -----------------------------------------------------
  // LOAD SALES ANALYTICS
  // -----------------------------------------------------

  const loadAnalytics = useCallback(async () => {
    setLoading(true);

    try {
      const data = await fetchAnalytics(days);

      setAnalytics(data);

    } catch (error) {
      console.error("Analytics loading error:", error);

      onMessageRef.current?.(
        error.response?.data?.detail ||
          "Could not load analytics.",
        "error"
      );

    } finally {
      setLoading(false);
    }
  }, [days]);


  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);


  // -----------------------------------------------------
  // UPDATE PRODUCT STOCK
  // -----------------------------------------------------

  async function handleStockUpdate(productId, stock) {
    setSavingStockId(productId);

    try {
      const updated = await updateProductStock(
        productId,
        stock
      );

      // Reload analytics after stock update.
      await loadAnalytics();

      // Refresh product catalogue in parent component.
      if (onProductsUpdated) {
        await onProductsUpdated();
      }

      onMessageRef.current?.(
        "Stock updated successfully.",
        "success"
      );

      return updated;

    } catch (error) {
      console.error("Stock update error:", error);

      onMessageRef.current?.(
        error.response?.data?.detail ||
          "Could not update stock.",
        "error"
      );

      return null;

    } finally {
      setSavingStockId(null);
    }
  }


  // -----------------------------------------------------
  // CALCULATE SUMMARY
  // -----------------------------------------------------

  const revenue = (analytics?.sales || []).reduce(
    (sum, day) =>
      sum + Number(day.revenue || 0),
    0
  );

  const orders = (analytics?.sales || []).reduce(
    (sum, day) =>
      sum + Number(day.orders || 0),
    0
  );


  // -----------------------------------------------------
  // RENDER DASHBOARD
  // -----------------------------------------------------

  return (
    <section className="panel analytics-panel">

      {/* Dashboard heading */}

      <div className="section-heading history-heading">

        <div className="heading-icon">
          <BarChart3 size={20} />
        </div>

        <div>
          <h2>Sales Analytics</h2>

          <p>
            Revenue, orders and inventory performance.
          </p>
        </div>

        <div className="analytics-toolbar">

          <select
            value={days}
            onChange={(event) =>
              setDays(Number(event.target.value))
            }
            aria-label="Analytics date range"
          >
            <option value={7}>Last 7 days</option>
            <option value={30}>Last 30 days</option>
            <option value={90}>Last 90 days</option>
          </select>

          <button
            type="button"
            className="secondary-button"
            onClick={loadAnalytics}
            disabled={loading}
          >
            <RotateCcw size={15} />

            {loading ? "Loading..." : "Refresh"}
          </button>

        </div>

      </div>


      {/* Loading state */}

      {loading && !analytics ? (

        <div className="empty-state">

          <LoaderCircle
            size={24}
            className="loading-spinner"
          />

          <p>Loading analytics...</p>

        </div>

      ) : analytics ? (

        <>

          {/* KPI cards */}

          <div className="analytics-kpis">

            <StatCard
              label="Revenue"
              value={`₹${revenue.toFixed(2)}`}
              icon={IndianRupee}
            />

            <StatCard
              label="Orders"
              value={orders}
              icon={ClipboardList}
            />

            <StatCard
              label="Low-stock products"
              value={analytics.low_stock?.length || 0}
              icon={Package}
            />

          </div>


          {/* Revenue chart and top products */}

          <div className="analytics-grid">

            <RevenueChart
              sales={analytics.sales || []}
            />

            <TopProducts
              products={analytics.top_products || []}
            />

          </div>


          {/* Inventory management */}

          <InventoryTable
            products={analytics.low_stock || []}
            onSave={handleStockUpdate}
            savingStockId={savingStockId}
          />


          {/* Information */}

          <p className="helper-text">
            Sales figures are calculated from confirmed
            orders. Inventory updates are saved in PostgreSQL.
          </p>

        </>

      ) : (

        <div className="empty-state">
          <p>No analytics data available.</p>

          <button
            type="button"
            className="secondary-button"
            onClick={loadAnalytics}
          >
            Try again
          </button>
        </div>

      )}

    </section>
  );
}
