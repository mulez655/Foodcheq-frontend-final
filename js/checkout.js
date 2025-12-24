// js/checkout.js
import { api } from "./api.js";
import { getCart, clearCart } from "./cart.js";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("checkoutForm") || document.querySelector("form");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const cart = getCart();
    if (!cart.length) {
      alert("Your cart is empty.");
      return;
    }

    // If any item has 0 price, force user to re-add from shop (means it was legacy/invalid)
    if (cart.some((x) => Number(x.priceKobo || 0) <= 0)) {
      alert("One or more items have missing prices. Please remove them and re-add from the shop.");
      return;
    }

    const items = cart.map((item) => ({
      productId: item.productId || item.id,
      quantity: Number(item.quantity || 1),
    }));

    if (items.some((i) => !i.productId)) {
      alert("Some cart items are missing productId. Please re-add them to cart.");
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    const oldText = btn?.textContent;

    if (btn) {
      btn.disabled = true;
      btn.textContent = "Processing...";
    }

    try {
      // ✅ Create order (backend should compute totals in NGN safely)
      const orderRes = await api("/orders", {
        method: "POST",
        auth: true,
        body: { items },
      });

      const orderId = orderRes?.order?.id;
      if (!orderId) throw new Error("Order created but order id not returned.");

      // ✅ Paystack init (NGN)
      const payRes = await api("/payments/paystack/init", {
        method: "POST",
        auth: true,
        body: { orderId },
      });

      const authorizationUrl = payRes?.authorizationUrl;
      if (!authorizationUrl) throw new Error("Payment init failed (no authorizationUrl).");

      // Optional: clear cart before redirect
      clearCart();

      window.location.href = authorizationUrl;
    } catch (err) {
      alert(err.message || "Checkout failed.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText || "Place Order";
      }
    }
  });
});
