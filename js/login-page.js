// js/login-page.js
import { api, setToken, setVendorToken } from "./api.js";
import { storage } from "./storage.js";

(function () {
  const tabsRoot = document.querySelector("[data-role-tabs]");
  const roleInput = document.getElementById("loginRole");
  const form = document.getElementById("loginForm");

  if (tabsRoot && roleInput) {
    tabsRoot.addEventListener("click", (e) => {
      const btn = e.target.closest("button[data-role]");
      if (!btn) return;

      const role = btn.getAttribute("data-role");
      roleInput.value = role;

      tabsRoot.querySelectorAll("button[data-role]").forEach((b) => {
        b.classList.remove("bg-white", "shadow-sm");
        b.classList.add("text-slate-700");
      });

      btn.classList.add("bg-white", "shadow-sm");
      btn.classList.remove("text-slate-700");
    });
  }

  function setLoading(btn, on) {
    if (!btn) return;
    if (on) {
      btn.disabled = true;
      btn.dataset.old = btn.textContent || "Login";
      btn.textContent = "Logging in...";
    } else {
      btn.disabled = false;
      btn.textContent = btn.dataset.old || "Login";
    }
  }

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const role = (roleInput?.value || "user").toLowerCase();
      const email = document.getElementById("email")?.value?.trim();
      const password = document.getElementById("password")?.value;

      const btn = form.querySelector('button[type="submit"]');
      setLoading(btn, true);

      try {
        if (role === "vendor") {
          const res = await api("/vendor/auth/login", {
            method: "POST",
            body: { email, password },
            auth: false,
          });

          // store vendor session
          storage.set("authType", "vendor");
          storage.set("vendor", res.vendor);
          setVendorToken(res.accessToken);

          window.location.href = "vendor-dashboard.html";
          return;
        }

        // user login
        const res = await api("/auth/login", {
          method: "POST",
          body: { email, password },
          auth: false,
        });

        storage.set("authType", "user");
        storage.set("user", res.user);
        setToken(res.accessToken);

        window.location.href = "index.html";
      } catch (err) {
        alert(err?.message || "Login failed");
        console.error(err);
      } finally {
        setLoading(btn, false);
      }
    });
  }
})();
