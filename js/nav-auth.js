// js/nav-auth.js
// Works with injected navbar (event delegation + simple auth UI toggles)

export function wireNavbarAuth() {
  // 1) Logout handler (event delegation so it works even after navbar is injected)
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-logout]");
    if (!btn) return;

    e.preventDefault();

    // Clear everything we’ve used across user/vendor sessions
    localStorage.removeItem("token");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("authType");
    localStorage.removeItem("user");
    localStorage.removeItem("vendor");

    sessionStorage.removeItem("token");
    sessionStorage.removeItem("accessToken");
    sessionStorage.removeItem("refreshToken");
    sessionStorage.removeItem("authType");
    sessionStorage.removeItem("user");
    sessionStorage.removeItem("vendor");

    // Optional: clear cart/wishlist if you want “fresh session”
    // localStorage.removeItem("cart");
    // localStorage.removeItem("wishlist");

    // Send user back to login (or home)
    window.location.href = "login.html";
  });

  // 2) Toggle navbar items based on auth state
  updateNavbarAuthUI();
}

export function updateNavbarAuthUI() {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    sessionStorage.getItem("token") ||
    sessionStorage.getItem("accessToken") ||
    "";

  const authType =
    localStorage.getItem("authType") ||
    sessionStorage.getItem("authType") ||
    ""; // "user" | "vendor"

  // Elements tagged for guest/user visibility
  const guestEls = document.querySelectorAll("[data-guest]");
  const userEls = document.querySelectorAll("[data-user]");
  const vendorEls = document.querySelectorAll("[data-vendor]");

  const isAuthed = !!token;
  const isUser = isAuthed && authType === "user";
  const isVendor = isAuthed && authType === "vendor";

  guestEls.forEach((el) => el.classList.toggle("hidden", isAuthed));
  userEls.forEach((el) => el.classList.toggle("hidden", !isUser));
  vendorEls.forEach((el) => el.classList.toggle("hidden", !isVendor));
}
