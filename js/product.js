// js/product.js
import { api } from "./api.js";
import { addToCart } from "./cart.js";
import { getUsdNgnRate, usdCentsToKobo, formatNairaFromKobo } from "./fx.js";

const $ = (sel) => document.querySelector(sel);

// ✅ backend origin (for /uploads/* paths)
const BACKEND_ORIGIN =
  window.API_BASE ||
  localStorage.getItem("API_BASE") ||
  "http://localhost:4000";

// ✅ Fix relative image paths coming from backend
function imgSrc(url) {
  const u = String(url || "").trim();
  if (!u) return "images/placeholder.jpg";
  if (u.startsWith("http://") || u.startsWith("https://")) return u;
  if (u.startsWith("/uploads/")) return `${BACKEND_ORIGIN}${u}`;
  if (u.startsWith("/")) return `${BACKEND_ORIGIN}${u}`;
  return u;
}

function getProductIdFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function escapeHtml(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// ---------------- Reviews (LocalStorage for now) ----------------
function reviewKey(productId) {
  return `foodcheq_reviews_${productId}`;
}
function getReviews(productId) {
  try {
    return JSON.parse(localStorage.getItem(reviewKey(productId))) || [];
  } catch {
    return [];
  }
}
function saveReviews(productId, reviews) {
  localStorage.setItem(reviewKey(productId), JSON.stringify(reviews));
}
function renderStars(rating) {
  const r = Number(rating) || 0;
  let html = "";
  for (let i = 1; i <= 5; i++) {
    html += i <= r ? `<i class="fa-solid fa-star"></i>` : `<i class="fa-regular fa-star"></i>`;
  }
  return html;
}
function renderReviews(productId) {
  const list = $("#reviewsList");
  if (!list) return;

  const reviews = getReviews(productId);

  if (!reviews.length) {
    list.innerHTML = `<div class="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No reviews yet. Be the first!
    </div>`;
    return;
  }

  list.innerHTML = reviews
    .slice()
    .reverse()
    .map(
      (r) => `
      <div class="rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center justify-between gap-3">
          <div class="min-w-0">
            <p class="text-sm font-bold text-emerald-700 truncate">${escapeHtml(r.name)}</p>
            <p class="text-[11px] text-slate-500">Verified Buyer</p>
          </div>
          <div class="text-amber-500 text-xs">${renderStars(r.rating)}</div>
        </div>
        <p class="mt-2 text-sm text-slate-600">"${escapeHtml(r.comment)}"</p>
      </div>
    `
    )
    .join("");
}
function setupReviewForm(productId) {
  const form = $("#reviewForm");
  if (!form) return;

  const stars = document.querySelectorAll("#starRating .star");
  const ratingValue = $("#ratingValue");

  stars.forEach((btn) => {
    btn.addEventListener("click", () => {
      const v = Number(btn.dataset.value || 0);
      ratingValue.value = String(v);

      stars.forEach((b) => (b.innerHTML = `<i class="fa-regular fa-star"></i>`));
      for (let i = 0; i < v; i++) stars[i].innerHTML = `<i class="fa-solid fa-star"></i>`;
    });
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = $("#reviewName")?.value?.trim();
    const comment = $("#reviewComment")?.value?.trim();
    const rating = Number($("#ratingValue")?.value || 0);

    if (!name || !comment) return;
    if (!rating) {
      alert("Please select a rating.");
      return;
    }

    const reviews = getReviews(productId);
    reviews.push({ name, comment, rating, createdAt: Date.now() });
    saveReviews(productId, reviews);

    form.reset();
    $("#ratingValue").value = "0";
    stars.forEach((b) => (b.innerHTML = `<i class="fa-regular fa-star"></i>`));

    renderReviews(productId);
  });
}

// ---------------- Related ----------------
function renderRelated(related, rate) {
  const grid = $("#relatedGrid");
  if (!grid) return;

  if (!Array.isArray(related) || !related.length) {
    grid.innerHTML = `<div class="col-span-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
      No related items yet.
    </div>`;
    return;
  }

  grid.innerHTML = related
    .slice(0, 12)
    .map((p) => {
      const kobo = usdCentsToKobo(p.priceUsdCents || 0, rate);

      return `
        <article class="rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-sm transition">
          <a href="product.html?id=${encodeURIComponent(p.id)}" class="block">
            <div class="aspect-[4/3] bg-slate-50">
              <img src="${escapeHtml(imgSrc(p.imageUrl))}" alt="${escapeHtml(p.name)}" class="h-full w-full object-cover" loading="lazy" />
            </div>
            <div class="p-3">
              <p class="text-sm font-semibold line-clamp-2">${escapeHtml(p.name)}</p>
              <p class="mt-1 text-xs font-bold text-emerald-700">${formatNairaFromKobo(kobo)}</p>
            </div>
          </a>
        </article>
      `;
    })
    .join("");
}

// ---------------- Main ----------------
document.addEventListener("DOMContentLoaded", async () => {
  const id = getProductIdFromURL();

  const loading = $("#productLoading");
  const notFound = $("#productNotFound");
  const wrap = $("#productWrap");

  if (!id) {
    loading?.classList.add("hidden");
    notFound?.classList.remove("hidden");
    return;
  }

  try {
    loading?.classList.remove("hidden");
    notFound?.classList.add("hidden");
    wrap?.classList.add("hidden");

    const rate = await getUsdNgnRate();

    const res = await api(`/products/${encodeURIComponent(id)}`);
    const product = res?.product;
    const related = res?.related || [];

    if (!product?.id) throw new Error("Product not found");

    // Price conversion
    const priceKobo = usdCentsToKobo(product.priceUsdCents || 0, rate);

    // Core
    const img = $("#productImage");
    if (img) {
      img.src = imgSrc(product.imageUrl);
      img.alt = product.name || "Product image";
    }

    $("#productName").textContent = product.name || "Product";
    $("#productCategory").textContent = product.category || "Shop";
    $("#productShort").textContent =
      product.shortDesc || "Premium herbal product — natural and effective.";
    $("#productPrice").textContent = formatNairaFromKobo(priceKobo);
    $("#productVendor").textContent = product.vendor?.businessName
      ? `Sold by: ${product.vendor.businessName}`
      : "";

    $("#productDescription").textContent =
      product.description || "No description provided yet.";

    // Benefits
    const benefitsWrap = $("#benefitsWrap");
    const benefitsList = $("#benefitsList");
    const benefits = Array.isArray(product.benefits) ? product.benefits : [];

    if (!benefits.length) {
      benefitsWrap?.classList.add("hidden");
    } else {
      benefitsWrap?.classList.remove("hidden");
      benefitsList.innerHTML = benefits
        .map(
          (b) =>
            `<li class="flex gap-2"><span class="text-emerald-700 font-bold">✔</span><span>${escapeHtml(
              b
            )}</span></li>`
        )
        .join("");
    }

    // Related
    renderRelated(related, rate);

    // Reviews
    renderReviews(product.id);
    setupReviewForm(product.id);

    // Add to cart (stores NGN kobo derived from USD)
    const btn = $("#btnAddToCart");
    btn?.addEventListener("click", () => {
      if (btn.disabled) return;

      const old = btn.innerHTML;
      btn.disabled = true;
      btn.classList.add("opacity-70", "cursor-not-allowed");
      btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin mr-2"></i> Adding…`;

      try {
        addToCart(
          {
            id: product.id,
            name: product.name,
            priceKobo,
            currency: "NGN",
          },
          1
        );

        if (typeof window.__updateCartBadges === "function") window.__updateCartBadges();
      } finally {
        setTimeout(() => {
          btn.disabled = false;
          btn.classList.remove("opacity-70", "cursor-not-allowed");
          btn.innerHTML = old;
        }, 350);
      }
    });

    // Show
    loading?.classList.add("hidden");
    wrap?.classList.remove("hidden");

    if (typeof window.__updateCartBadges === "function") window.__updateCartBadges();
  } catch (e) {
    console.error("Product load failed:", e);
    loading?.classList.add("hidden");
    notFound?.classList.remove("hidden");
  }
});
