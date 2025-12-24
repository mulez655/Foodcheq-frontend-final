// js/cart-badges.js
import { cartCount } from "./cart.js";

function setBadge(el, count) {
  if (!el) return;
  const n = Number(count || 0);

  el.textContent = String(n);
  if (n > 0) el.classList.remove("hidden");
  else el.classList.add("hidden");
}

function updateBadges() {
  const count = cartCount();
  setBadge(document.getElementById("cartCount"), count);
  setBadge(document.getElementById("cartCountMobile"), count); // if you later add mobile badge id
}

// expose globally so layout.js can call it after navbar mount
window.__updateCartBadges = updateBadges;

document.addEventListener("DOMContentLoaded", () => {
  updateBadges();

  // Update if cart changes (same tab updates won't fire storage event,
  // so we also rely on pages calling __updateCartBadges after add/remove)
  window.addEventListener("storage", (e) => {
    if (e.key === "foodcheq_cart_v1") updateBadges();
  });
});
