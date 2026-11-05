
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";

export default function TopProducts({ products = [] }) {
  return (
    <section className="analytics-card">
      <div className="analytics-card-heading">
        <div>
          <h3>Top-selling products</h3>
          <p>Ranked by quantity sold</p>
        </div>

        <TrendingUp size={19} />
      </div>

      {products.length === 0 ? (
        <div className="empty-state compact-empty">
          No product sales recorded yet.
        </div>
      ) : (
        <div className="top-products-list">
          {products.map((item, index) => (
            <div
              className="top-product-row"
              key={item.product_name}
            >
              <span className="top-product-rank">
                {index + 1}
              </span>

              <div className="top-product-info">
                <strong>{item.product_name}</strong>
                <small>{item.quantity} sold</small>
              </div>

              <strong>
                ₹{Number(item.revenue).toFixed(2)}
              </strong>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
