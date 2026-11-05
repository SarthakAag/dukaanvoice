
import { useState } from "react";
import { Package, AlertTriangle } from "lucide-react";

export default function InventoryTable({
  products = [],
  onSave,
  savingStockId,
}) {
  const [stockDrafts, setStockDrafts] = useState({});

  function getStockValue(product) {
    return stockDrafts[product.id] ?? String(product.stock);
  }

  function changeStock(productId, value) {
    setStockDrafts((current) => ({
      ...current,
      [productId]: value,
    }));
  }

  async function save(product) {
    const stock = Number(getStockValue(product));

    if (!Number.isFinite(stock) || stock < 0) {
      return;
    }

    const updated = await onSave(product.id, stock);

    if (updated) {
      setStockDrafts((current) => ({
        ...current,
        [product.id]: String(updated.stock),
      }));
    }
  }

  return (
    <section className="analytics-card inventory-card">
      <div className="analytics-card-heading">
        <div>
          <h3>Inventory health</h3>
          <p>Low-stock threshold: 10 units</p>
        </div>

        <AlertTriangle size={19} />
      </div>

      {products.length === 0 ? (
        <div className="inventory-healthy">
          <Package size={20} />
          <span>
            All products are above the low-stock threshold.
          </span>
        </div>
      ) : (
        <div className="inventory-table-wrap">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Available stock</th>
                <th>New stock</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>

                  <td>
                    <span className="stock-warning">
                      {product.stock} {product.unit}
                    </span>
                  </td>

                  <td>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={getStockValue(product)}
                      onChange={(event) =>
                        changeStock(
                          product.id,
                          event.target.value
                        )
                      }
                      aria-label={`New stock for ${product.name}`}
                    />
                  </td>

                  <td>
                    <button
                      type="button"
                      className="secondary-button stock-save-button"
                      disabled={savingStockId === product.id}
                      onClick={() => save(product)}
                    >
                      {savingStockId === product.id
                        ? "Saving..."
                        : "Update stock"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
