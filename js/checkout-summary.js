// js/checkout-summary.js
(function () {
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("foodcheq_cart_v1")) || [];
    } catch {
      return [];
    }
  }

  function moneyNGN(kobo, currency = "NGN") {
    const amount = Number(kobo || 0) / 100;
    if (currency === "NGN") return `₦${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
    return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function renderOrderSummary() {
    const list = document.getElementById("orderSummaryList");
    const totalEl = document.getElementById("orderSummaryTotal");
    if (!list || !totalEl) return;

    const cart = getCart();
    const currency = cart[0]?.currency || "NGN";

    const totalRow = list.querySelector("li:last-child");
    list.innerHTML = "";
    if (totalRow) list.appendChild(totalRow);

    if (!cart.length) {
      const empty = document.createElement("li");
      empty.className = "px-4 py-3 text-sm text-slate-600";
      empty.textContent = "Your cart is empty.";
      list.insertBefore(empty, totalRow);
      totalEl.textContent = moneyNGN(0, currency);
      return;
    }

    let totalKobo = 0;

    cart.forEach((item) => {
      const qty = Number(item.quantity || 1);
      const priceKobo = Number(item.priceKobo || 0);
      const lineKobo = qty * priceKobo;
      totalKobo += lineKobo;

      const li = document.createElement("li");
      li.className = "flex items-center justify-between px-4 py-3 text-sm";
      li.innerHTML = `
        <div class="flex flex-col">
          <strong>${item.name || "Item"}</strong>
          <small class="text-slate-500">Qty: ${qty}</small>
        </div>
        <span class="font-semibold">${moneyNGN(lineKobo, item.currency || currency)}</span>
      `;
      list.insertBefore(li, totalRow);
    });

    totalEl.textContent = moneyNGN(totalKobo, currency);
  }

  document.addEventListener("DOMContentLoaded", () => {
    renderOrderSummary();
    window.addEventListener("storage", (e) => {
      if (e.key === "foodcheq_cart_v1") renderOrderSummary();
    });
  });
})();
