
import api from "./api";

export async function downloadInvoice(orderId) {
  const response = await api.get(`/orders/${orderId}/invoice`, {
    responseType: "blob",
  });

  const blob = new Blob([response.data], {
    type: "application/pdf",
  });

  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = `dukaanvoice-invoice-${orderId}.pdf`;

  document.body.appendChild(link);
  link.click();
  link.remove();

  window.URL.revokeObjectURL(url);
}
