// js/cart.js
import { storage } from "./storage.js";

const CART_KEY = "foodcheq_cart_v1";
const LEGACY_KEY = "cart"; // older cart key used in your project

function readLegacyCart() {
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

// Normalize any cart item to the v1 format we need
function normalizeItem(x) {
  const productId = x.productId || x.id || x.slug || x.name;
  const quantity = Math.max(1, Number(x.quantity ?? x.qty ?? 1) || 1);

  // We want NGN kobo inside cart always
  const priceKobo =
    Number(x.priceKobo) ||
    (x.price != null ? Math.round(Number(x.price) * 100) : 0);

  return {
    productId: String(productId || ""),
    name: x.name || "Item",
    priceKobo: Number.isFinite(priceKobo) ? priceKobo : 0,
    currency: "NGN",
    quantity,
  };
}

function migrateLegacyIfNeeded() {
  const current = storage.get(CART_KEY, []);
  if (Array.isArray(current) && current.length) return;

  const legacy = readLegacyCart();
  if (!legacy.length) return;

  const migrated = legacy
    .map(normalizeItem)
    .filter((x) => x.productId);

  storage.set(CART_KEY, migrated);
  localStorage.removeItem(LEGACY_KEY);
}

export function getCart() {
  migrateLegacyIfNeeded();

  const raw = storage.get(CART_KEY, []);
  const list = Array.isArray(raw) ? raw : [];
  // always normalize to avoid weird shapes
  return list.map(normalizeItem).filter((x) => x.productId);
}

export function setCart(items) {
  const list = Array.isArray(items) ? items : [];
  storage.set(CART_KEY, list.map(normalizeItem).filter((x) => x.productId));
}

export function clearCart() {
  storage.remove(CART_KEY);
}

export function addToCart(product, qty = 1) {
  migrateLegacyIfNeeded();

  const cart = getCart();
  const quantity = Math.max(1, Number(qty) || 1);

  const id = product.productId || product.id;
  if (!id) return;

  const i = cart.findIndex((x) => x.productId === id);

  const priceKobo = Number(product.priceKobo || 0); // MUST be NGN kobo by now
  const name = product.name || "Item";

  if (i >= 0) {
    cart[i].quantity += quantity;

    // If old item had 0, update it
    if (!cart[i].priceKobo && priceKobo) cart[i].priceKobo = priceKobo;
    if (!cart[i].name && name) cart[i].name = name;
  } else {
    cart.push({
      productId: String(id),
      name,
      priceKobo: Number.isFinite(priceKobo) ? priceKobo : 0,
      currency: "NGN",
      quantity,
    });
  }

  setCart(cart);
}

export function updateQty(productId, qty) {
  const cart = getCart();
  const quantity = Math.max(1, Number(qty) || 1);

  const next = cart.map((x) =>
    x.productId === productId ? { ...x, quantity } : x
  );

  setCart(next);
}

export function removeItem(productId) {
  const cart = getCart().filter((x) => x.productId !== productId);
  setCart(cart);
}

export function cartTotalKobo() {
  return getCart().reduce(
    (sum, x) => sum + Number(x.priceKobo || 0) * Number(x.quantity || 0),
    0
  );
}

export function cartCount() {
  return getCart().reduce((sum, x) => sum + Number(x.quantity || 0), 0);
}
