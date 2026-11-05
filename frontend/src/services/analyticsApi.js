import api from "./api";

export async function fetchAnalytics(days = 30) {
  const response = await api.get("/dashboard/analytics", {
    params: { days },
  });

  return response.data;
}

export async function updateProductStock(productId, stock) {
  const response = await api.put(
    `/products/${encodeURIComponent(productId)}/stock`,
    {
      stock: Number(stock),
    }
  );

  return response.data;
}