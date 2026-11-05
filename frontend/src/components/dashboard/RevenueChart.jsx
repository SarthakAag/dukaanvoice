
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

export default function RevenueChart({ sales = [] }) {
  const maxRevenue = Math.max(
    ...sales.map((day) => Number(day.revenue || 0)),
    1
  );

  const hasSales = sales.some(
    (day) => Number(day.revenue) > 0
  );

  return (
    <section className="analytics-card sales-chart-card">
      <div className="analytics-card-heading">
        <div>
          <h3>Revenue trend</h3>
          <p>Daily revenue · Asia/Kolkata</p>
        </div>

        <TrendingUp size={19} />
      </div>

      {!hasSales ? (
        <div className="empty-state compact-empty">
          No sales in this period yet.
        </div>
      ) : (
        <div
          className="sales-chart"
          role="img"
          aria-label="Daily revenue bar chart"
        >
          {sales.map((day) => {
            const revenue = Number(day.revenue || 0);

            const height = revenue > 0
              ? Math.max(
                  5,
                  (revenue / maxRevenue) * 100
                )
              : 0;

            return (
              <div
                className="sales-chart-column"
                key={day.date}
                title={`${day.label}: ₹${revenue.toFixed(2)}`}
              >
                <div className="sales-chart-bar-wrap">
                  <div
                    className="sales-chart-bar"
                    style={{ height: `${height}%` }}
                  />
                </div>

                <small>{day.label}</small>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
