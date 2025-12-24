// js/vendor-dashboard.js
import { api, clearVendorToken, getVendorToken } from "./api.js";
import { storage } from "./storage.js";

// ✅ BACKEND ORIGIN (ONLY used for images)
// - Local dev: http://localhost:4000
// - When hosted: change to your Render URL (or set window.API_BASE somewhere if you already do)
const BACKEND_ORIGIN =
  window.API_BASE ||
  localStorage.getItem("API_BASE") ||
  "http://localhost:4000";

function moneyUSDFromCents(usdCents) {
  const amount = Number(usdCents || 0) / 100;
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ✅ FIX: turn "/uploads/..." into "http://localhost:4000/uploads/..."
function imgSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${u}`;
  if (u.startsWith("/")) return `${BACKEND_ORIGIN}${u}`;
  return u;
}

function ensureModal() {
  if (document.getElementById("addProductModal")) return;

  const modal = document.createElement("div");
  modal.id = "addProductModal";
  modal.className = "hidden fixed inset-0 z-[80]";

  modal.innerHTML = `
    <!-- Overlay -->
<div class="fixed inset-0 flex items-center justify-center bg-black/40 z-50">
  <!-- Modal -->
  <div class="relative mx-auto w-[92%] max-w-xl max-h-screen overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200">
    
    <!-- Header -->
    <div class="flex items-center justify-between px-6 py-4 border-b border-slate-200">
      <h3 class="text-base font-bold">Add Product</h3>
      <button type="button" id="closeAddProduct"
        class="h-10 w-10 grid place-items-center rounded-xl border border-slate-200 hover:bg-slate-50"
        aria-label="Close">
        ✕
      </button>
    </div>

    <!-- Form -->
    <form id="addProductForm" class="p-6 space-y-4">
      <div>
        <label class="text-sm font-medium text-slate-700">Product name</label>
        <input id="pName" required
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          placeholder="e.g. Antrodia Mushroom" />
      </div>

      <div>
        <label class="text-sm font-medium text-slate-700">Description (optional)</label>
        <textarea id="pDesc" rows="3"
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          placeholder="Full description..."></textarea>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label class="text-sm font-medium text-slate-700">Price ($)</label>
          <input id="pPriceUsd" type="number" min="0.01" step="0.01" required
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            placeholder="e.g. 12.50" />
          <p class="mt-1 text-xs text-slate-500">Stored in USD cents (schema B).</p>
        </div>

        <div>
          <label class="text-sm font-medium text-slate-700">Category (optional)</label>
          <input id="pCategory"
            class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
            placeholder="Tea / Powder / Extract" />
        </div>
      </div>

      <div>
        <label class="text-sm font-medium text-slate-700">Image URL (optional)</label>
        <input id="pImageUrl" type="url"
          class="mt-1 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-slate-400"
          placeholder="https://..." />
        <p class="mt-1 text-xs text-slate-500">You can paste a link OR upload after creating.</p>
      </div>

      <div class="flex items-center justify-between gap-3">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input id="pAvailable" type="checkbox" checked class="rounded border-slate-300" />
          Available
        </label>

        <button type="submit" id="saveProductBtn"
          class="inline-flex items-center justify-center rounded-xl bg-emerald-700 px-5 py-3 text-sm font-semibold text-white hover:bg-emerald-600">
          Save Product
        </button>
      </div>
    </form>
  </div>
</div>
  `;

  document.body.appendChild(modal);

  const close = () => modal.classList.add("hidden");
  modal.querySelector("#closeAddProduct")?.addEventListener("click", close);
  modal.querySelector(".absolute")?.addEventListener("click", close);
}

function openModal() {
  ensureModal();
  document.getElementById("addProductModal")?.classList.remove("hidden");
}

function closeModal() {
  document.getElementById("addProductModal")?.classList.add("hidden");
}

(async function () {
  const authType = storage.get("authType");
  if (authType !== "vendor") {
    window.location.href = "login.html";
    return;
  }

  const vendorNameEl = document.getElementById("vendorName");
  const vendorEmailEl = document.getElementById("vendorEmail");
  const vendorStatusEl = document.getElementById("vendorStatus");

  const productsTbody = document.getElementById("productsTbody");
  const productsEmpty = document.getElementById("productsEmpty");
  const productsWrap = document.getElementById("productsWrap");

  const statProducts = document.getElementById("statProducts");

  const btnLogout = document.getElementById("btnLogoutDash");
  const btnAddProduct = document.getElementById("btnAddProduct");
  const btnAddProductEmpty = document.getElementById("btnAddProductEmpty");
  const btnRefreshProducts = document.getElementById("btnRefreshProducts");
  const searchInput = document.getElementById("productSearch");

  btnLogout?.addEventListener("click", () => {
    storage.remove("vendor");
    storage.remove("authType");
    clearVendorToken();
    window.location.href = "login.html";
  });

  btnAddProduct?.addEventListener("click", openModal);
  btnAddProductEmpty?.addEventListener("click", openModal);

  let allProducts = [];

  async function loadProfile() {
    const profile = await api("/vendor/auth/me", { auth: "vendor" });
    const vendor = profile.vendor;

    vendorNameEl.textContent = vendor.businessName || "Vendor";
    vendorEmailEl.textContent = vendor.email || "";
    if (vendorStatusEl) vendorStatusEl.textContent = vendor.status || "PENDING";
  }

  function renderProducts(list) {
    statProducts.textContent = String(list.length);

    if (!list.length) {
      productsEmpty?.classList.remove("hidden");
      productsWrap?.classList.add("hidden");
      return;
    }

    productsEmpty?.classList.add("hidden");
    productsWrap?.classList.remove("hidden");

    productsTbody.innerHTML = list
      .map((p) => {
        const hasImg = !!p.imageUrl;

        // ✅ FIX applied here
        const thumb = hasImg
          ? `<img src="${escapeHtml(imgSrc(p.imageUrl))}" alt="" class="h-10 w-10 rounded-xl object-cover border border-slate-200" />`
          : `<div class="h-10 w-10 rounded-xl bg-slate-100 border border-slate-200 grid place-items-center text-[10px] text-slate-500">No<br/>img</div>`;

        return `
        <tr class="border-t border-slate-200">
          <td class="py-3 pr-4">
            <div class="flex items-center gap-3">
              ${thumb}
              <div>
                <p class="font-semibold">${escapeHtml(p.name)}</p>
                <p class="text-xs text-slate-500">${escapeHtml(p.id)}</p>
              </div>
            </div>
          </td>

          <td class="py-3 pr-4">${escapeHtml(p.category || "-")}</td>

          <td class="py-3 pr-4">
            <span class="font-semibold">${moneyUSDFromCents(p.priceUsdCents)}</span>
          </td>

          <td class="py-3 pr-4">${p.isAvailable ? "Available" : "Unavailable"}</td>
          <td class="py-3 pr-4">${escapeHtml(p.status || "-")}</td>

          <td class="py-3">
            <div class="flex flex-wrap items-center gap-2">
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                class="hidden"
                data-file
                data-id="${escapeHtml(p.id)}"
              />

              <button
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                data-upload
                data-id="${escapeHtml(p.id)}"
              >
                ${hasImg ? "Change Image" : "Upload Image"}
              </button>

              <button
                type="button"
                class="rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold hover:bg-slate-50"
                data-copy
                data-url="${escapeHtml(p.imageUrl || "")}"
              >
                Copy URL
              </button>
            </div>
          </td>
        </tr>
      `;
      })
      .join("");
  }

  async function loadProducts() {
    const prodRes = await api("/vendor/products", { auth: "vendor" });
    allProducts = Array.isArray(prodRes.products) ? prodRes.products : [];
    applySearch();
  }

  function applySearch() {
    const q = (searchInput?.value || "").trim().toLowerCase();
    const filtered = !q
      ? allProducts
      : allProducts.filter((p) => {
          const name = (p.name || "").toLowerCase();
          const cat = (p.category || "").toLowerCase();
          return name.includes(q) || cat.includes(q);
        });

    renderProducts(filtered);
  }

  searchInput?.addEventListener("input", applySearch);

  btnRefreshProducts?.addEventListener("click", async () => {
    btnRefreshProducts.disabled = true;
    const old = btnRefreshProducts.textContent;
    btnRefreshProducts.textContent = "Loading...";
    try {
      await loadProducts();
    } finally {
      btnRefreshProducts.disabled = false;
      btnRefreshProducts.textContent = old || "Refresh";
    }
  });

  // ==========================
  // Create product (Schema B)
  // ==========================
  ensureModal();
  const form = document.getElementById("addProductForm");
  const saveBtn = document.getElementById("saveProductBtn");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("pName")?.value?.trim();
    const description = document.getElementById("pDesc")?.value?.trim();
    const priceUsd = Number(document.getElementById("pPriceUsd")?.value || 0);
    const category = document.getElementById("pCategory")?.value?.trim();
    const imageUrl = document.getElementById("pImageUrl")?.value?.trim();
    const isAvailable = !!document.getElementById("pAvailable")?.checked;

    if (!name || name.length < 1) return alert("Enter a product name.");
    if (!priceUsd || priceUsd <= 0) return alert("Enter a valid price in USD.");

    const payload = {
      name,
      description: description || undefined,
      priceUsdCents: Math.round(priceUsd * 100),
      category: category || undefined,
      imageUrl: imageUrl || undefined,
      isAvailable,
    };

    saveBtn.disabled = true;
    const old = saveBtn.textContent;
    saveBtn.textContent = "Saving...";

    try {
      await api("/vendor/products", {
        method: "POST",
        auth: "vendor",
        body: payload,
      });

      closeModal();
      form.reset();
      document.getElementById("pAvailable").checked = true;

      await loadProducts();
      alert("✅ Product created successfully!");
    } catch (err) {
      alert(err?.message || "Failed to create product.");
      console.error(err);
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = old || "Save Product";
    }
  });

  // ==========================
  // Upload image (direct fetch)
  // ==========================
  productsTbody?.addEventListener("click", (e) => {
    const uploadBtn = e.target.closest("button[data-upload]");
    const copyBtn = e.target.closest("button[data-copy]");

    if (copyBtn) {
      const raw = copyBtn.dataset.url || "";
      if (!raw) return alert("No image URL yet.");

      // ✅ FIX: copy a usable URL (absolute if stored as /uploads/...)
      const full = imgSrc(raw);
      navigator.clipboard?.writeText(full);
      alert("Copied!");
      return;
    }

    if (!uploadBtn) return;

    const id = uploadBtn.dataset.id;
    const fileInput = productsTbody.querySelector(
      `input[data-file][data-id="${CSS.escape(id)}"]`
    );
    fileInput?.click();
  });

  productsTbody?.addEventListener("change", async (e) => {
    const input = e.target.closest('input[type="file"][data-file]');
    if (!input) return;

    const id = input.dataset.id;
    const file = input.files?.[0];
    if (!id || !file) return;

    if (file.size > 4 * 1024 * 1024) {
      input.value = "";
      return alert("Max image size is 4MB.");
    }

    const fd = new FormData();
    fd.append("image", file);

    const btn = productsTbody.querySelector(
      `button[data-upload][data-id="${CSS.escape(id)}"]`
    );
    const oldText = btn?.textContent || "Upload Image";

    try {
      if (btn) {
        btn.disabled = true;
        btn.textContent = "Uploading...";
      }

      const token = getVendorToken?.() || "";

      const res = await fetch(
        `${BACKEND_ORIGIN}/api/vendor/products/${encodeURIComponent(id)}/image`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: fd,
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        throw new Error(data?.message || "Upload failed");
      }

      await loadProducts();
      alert("✅ Image uploaded!");
    } catch (err) {
      console.error(err);
      alert(err?.message || "Image upload failed");
    } finally {
      input.value = "";
      if (btn) {
        btn.disabled = false;
        btn.textContent = oldText;
      }
    }
  });

  // Init
  try {
    await loadProfile();
    await loadProducts();
  } catch (err) {
    alert(err?.message || "Failed to load vendor dashboard.");
    console.error(err);
  }
})();

