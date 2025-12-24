// js/layout.js
import { wireNavbarAuth } from "./nav-auth.js";

async function inject(selector, url) {
  const mount = document.querySelector(selector);
  if (!mount) return;

  const res = await fetch(url);
  if (!res.ok) return;

  mount.innerHTML = await res.text();
}

document.addEventListener("DOMContentLoaded", async () => {
  // Inject shared layout
  await inject("#navbarMount", "components/navbar.html");
  await inject("#footerMount", "components/footer.html");

  // Wire auth + logout AFTER navbar exists
  wireNavbarAuth();
});
