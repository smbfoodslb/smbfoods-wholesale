/* SMB Foods / Organicopia — wholesale order catalog
   Static, dependency-free. Cart persists in localStorage. Checkout opens a
   pre-filled WhatsApp chat (wa.me) with the order — customer taps Send. */

const WHATSAPP_NUMBER = "96178879350"; // +961 78 879 350, digits only, no leading +
const CART_KEY = "smb-foods-cart-v1";
const IMG_BASE = "images/";
const PLACEHOLDER_IMG = "images/placeholder.svg";

let CATALOG = null;
let cart = loadCart();

// ---------------- Cart persistence ----------------
function loadCart() {
  try {
    const raw = localStorage.getItem(CART_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    return {};
  }
}
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
}

function findProduct(num) {
  for (const s of CATALOG.sections) {
    for (const c of s.categories) {
      for (const p of c.items) {
        if (p.num === num) return p;
      }
    }
  }
  return null;
}

function isPurchasable(p) {
  return p.status !== "soon" && p.status !== "oos" && p.price != null;
}

// Case-only items (canned seafood, YumEarth, Pur gum) are sold by the case,
// not the piece — the card still displays the per-piece price for reference,
// but every cart calculation (stepper line total, drawer, WhatsApp order,
// header running total) charges the case price instead.
function unitPrice(p) {
  if (p.case_only && p.case_price != null) return p.case_price;
  return p.price;
}

// For case-only items the cart still tracks the number of CASES internally
// (that's what each +/- click adds and what the price is charged per), but
// the number shown to the customer is the actual piece count (qty × case
// size) so it's immediately clear what they're getting — click once on a
// case of 12 and it reads "12", click again and it reads "24".
function displayQty(p, qty) {
  if (p.case_only && p.case_qty) return qty * p.case_qty;
  return qty;
}

function setQty(num, qty) {
  const p = findProduct(num);
  if (!p) return;
  if (qty <= 0) {
    delete cart[num];
  } else {
    cart[num] = qty;
  }
  saveCart();
  renderCartCount();
  renderCartDrawer();
  updateCardQtyUI(num);
}

function cartTotal() {
  let total = 0;
  let count = 0;
  for (const numStr of Object.keys(cart)) {
    const p = findProduct(Number(numStr));
    if (!p || p.price == null) continue;
    total += unitPrice(p) * cart[numStr];
    count += cart[numStr];
  }
  return { total, count };
}

// ---------------- Rendering: catalog ----------------
function imgSrc(p) {
  return p.img ? IMG_BASE + p.img : PLACEHOLDER_IMG;
}

function tagHtml(tags) {
  return tags.map((t) => `<span class="card-tag">${escapeHtml(t)}</span>`).join("");
}

function priceHtml(p) {
  if (p.status === "soon" || p.price == null) {
    return `<div class="price-pending">Pricing to follow</div>`;
  }
  let html = `<div class="price-piece">$${p.price.toFixed(2)}<span class="unit"> / piece</span></div>`;
  if (p.case_qty && p.case_price != null) {
    html += `<div class="price-case">Case of ${p.case_qty} — $${p.case_price.toFixed(2)}</div>`;
  }
  return html;
}

function cartControlHtml(p) {
  if (!isPurchasable(p)) {
    if (p.status === "oos") return `<div class="unavailable-note">Out of stock</div>`;
    if (p.status === "soon") return `<div class="unavailable-note">Coming soon</div>`;
    return `<div class="unavailable-note">Pricing to follow</div>`;
  }
  const qty = cart[p.num] || 0;
  if (qty === 0) {
    return `<span class="card-line-total"></span><button class="add-btn" data-add="${p.num}" aria-label="Add to cart">+</button>`;
  }
  const lineTotal = (unitPrice(p) * qty).toFixed(2);
  return `
    <span class="card-line-total">$${lineTotal}</span>
    <div class="qty-stepper" data-stepper="${p.num}">
      <button data-dec="${p.num}" aria-label="Decrease quantity">&minus;</button>
      <span class="qty-num">${displayQty(p, qty)}</span>
      <button data-inc="${p.num}" aria-label="Increase quantity">+</button>
    </div>`;
}

function cardHtml(p) {
  const badges = [];
  if (p.status === "oos") badges.push('<span class="status-badge oos">Out of Stock</span>');
  else if (p.status === "soon") badges.push('<span class="status-badge soon">Coming Soon</span>');
  if (p.is_new) badges.push('<span class="status-badge new">New</span>');
  else if (p.back_in_stock) badges.push('<span class="status-badge back">Back In Stock</span>');

  let cardCls = "card";
  if (p.status === "oos") cardCls += " is-oos";
  if (p.is_new) cardCls += " badge-new";
  else if (p.back_in_stock) cardCls += " badge-back";

  const brandHtml = p.brand ? `<div class="card-brand">${escapeHtml(p.brand)}</div>` : "";
  const subHtml = p.sub ? `<div class="card-sub">${escapeHtml(p.sub)}</div>` : "";

  return `
  <div class="${cardCls}" data-product="${p.num}" data-search="${escapeHtml((p.brand || "") + " " + p.name + " " + (p.sub || "") + " " + p.num).toLowerCase()}">
    <div class="card-badge-row">
      <span class="no-badge">No. ${String(p.num).padStart(3, "0")}</span>
      ${badges.join("")}
    </div>
    <div class="card-img"><img src="${imgSrc(p)}" alt="${escapeHtml(p.name)}" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'"></div>
    <div class="card-body">
      ${brandHtml}
      <div class="card-name">${escapeHtml(p.name)}</div>
      ${subHtml}
      <div class="card-tags">${tagHtml(p.tags)}</div>
      <div class="card-price-row">${priceHtml(p)}</div>
      <div class="card-cart-row" data-cart-control>${cartControlHtml(p)}</div>
    </div>
  </div>`;
}

function categoryHtml(section, cat) {
  const catId = `cat-${section.key}-${slug(cat.title)}`;
  return `
  <div class="category-block" id="${catId}">
    <div class="category-title">
      <h3>${escapeHtml(cat.title)}</h3>
      <span class="desc">${escapeHtml(cat.desc)}</span>
    </div>
    <div class="grid">${cat.items.map(cardHtml).join("")}</div>
  </div>`;
}

function renderCatalog() {
  const root = document.getElementById("catalog");
  const nav = document.getElementById("catNav");
  let html = "";
  let navHtml = "";

  CATALOG.sections.forEach((section) => {
    html += `
    <div class="section-block" id="section-${section.key}">
      <h2 class="section-heading">${escapeHtml(section.label)}</h2>
      <p class="section-sub">${section.categories.length} categories</p>
      ${section.categories.map((c) => categoryHtml(section, c)).join("")}
    </div>`;

    navHtml += `<span class="nav-section-label">${escapeHtml(section.label)}</span>`;
    section.categories.forEach((c) => {
      navHtml += `<a href="#cat-${section.key}-${slug(c.title)}">${escapeHtml(c.title)}</a>`;
    });
  });

  root.innerHTML = html;
  nav.innerHTML = navHtml;
}

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ---------------- Cart UI updates ----------------
function updateCardQtyUI(num) {
  document.querySelectorAll(`[data-cart-control] , .card[data-product="${num}"]`);
  const card = document.querySelector(`.card[data-product="${num}"] [data-cart-control]`);
  if (card) {
    const p = findProduct(num);
    card.innerHTML = cartControlHtml(p);
  }
}

function renderCartCount() {
  const { count, total } = cartTotal();
  document.getElementById("cartCount").textContent = count;
  document.getElementById("cartHeaderTotal").textContent = `$${total.toFixed(2)}`;
}

function renderCartDrawer() {
  const itemsEl = document.getElementById("cartItems");
  const nums = Object.keys(cart).filter((n) => cart[n] > 0);
  if (nums.length === 0) {
    itemsEl.innerHTML = `<div class="cart-empty">Your cart is empty.<br>Tap the + on any item to add it.</div>`;
  } else {
    itemsEl.innerHTML = nums
      .map((numStr) => {
        const num = Number(numStr);
        const p = findProduct(num);
        const qty = cart[numStr];
        const lineTotal = (unitPrice(p) * qty).toFixed(2);
        return `
        <div class="cart-line">
          <div class="cart-line-img"><img src="${imgSrc(p)}" alt="" onerror="this.src='${PLACEHOLDER_IMG}'"></div>
          <div class="cart-line-body">
            <div class="cart-line-name">${escapeHtml(p.name)}</div>
            <div class="cart-line-sub">${p.sub ? escapeHtml(p.sub) + " · " : ""}No. ${String(num).padStart(3, "0")}</div>
            <div class="cart-line-controls">
              <div class="qty-stepper" data-stepper="${num}">
                <button data-dec="${num}" aria-label="Decrease quantity">&minus;</button>
                <span class="qty-num">${displayQty(p, qty)}</span>
                <button data-inc="${num}" aria-label="Increase quantity">+</button>
              </div>
              <span class="cart-line-price">$${lineTotal}</span>
            </div>
            <button class="cart-remove" data-remove="${num}">Remove</button>
          </div>
        </div>`;
      })
      .join("");
  }
  const { total, count } = cartTotal();
  document.getElementById("cartTotal").textContent = `$${total.toFixed(2)}`;
  document.getElementById("checkoutBtn").disabled = count === 0;
}

// ---------------- Cart drawer open/close ----------------
function openCart() {
  document.getElementById("cartDrawer").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}
function closeCart() {
  document.getElementById("cartDrawer").classList.remove("open");
  document.getElementById("cartOverlay").classList.remove("open");
}

// ---------------- WhatsApp checkout ----------------
function buildOrderMessage() {
  const nums = Object.keys(cart).filter((n) => cart[n] > 0);
  const lines = ["Hi SMB Foods, I'd like to order:", ""];
  let total = 0;
  nums.forEach((numStr) => {
    const num = Number(numStr);
    const p = findProduct(num);
    const qty = cart[numStr];
    const lineTotal = unitPrice(p) * qty;
    total += lineTotal;
    const label = p.brand ? `${p.brand} ${p.name}` : p.name;
    const subLabel = p.sub ? ` (${p.sub})` : "";
    lines.push(`No. ${String(num).padStart(3, "0")} — ${label}${subLabel} × ${displayQty(p, qty)} — $${lineTotal.toFixed(2)}`);
  });
  lines.push("");
  lines.push(`Total: $${total.toFixed(2)}`);
  lines.push("");
  lines.push("Please confirm stock, pricing and delivery. Thank you!");
  return lines.join("\n");
}

function checkout() {
  const { count } = cartTotal();
  if (count === 0) return;
  const msg = buildOrderMessage();
  const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank", "noopener");
}

// ---------------- Search ----------------
function applySearch(query) {
  const q = query.trim().toLowerCase();
  document.querySelectorAll(".card").forEach((card) => {
    const match = !q || card.dataset.search.includes(q);
    card.style.display = match ? "" : "none";
  });
  document.querySelectorAll(".category-block").forEach((block) => {
    const anyVisible = Array.from(block.querySelectorAll(".card")).some((c) => c.style.display !== "none");
    block.style.display = anyVisible ? "" : "none";
  });
  document.querySelectorAll(".section-block").forEach((block) => {
    const anyVisible = Array.from(block.querySelectorAll(".card")).some((c) => c.style.display !== "none");
    block.style.display = anyVisible ? "" : "none";
  });
}

// ---------------- Event wiring ----------------
function wireEvents() {
  document.getElementById("cartToggle").addEventListener("click", openCart);
  document.getElementById("cartClose").addEventListener("click", closeCart);
  document.getElementById("cartOverlay").addEventListener("click", closeCart);
  document.getElementById("checkoutBtn").addEventListener("click", checkout);
  document.getElementById("searchInput").addEventListener("input", (e) => applySearch(e.target.value));

  document.body.addEventListener("click", (e) => {
    const addBtn = e.target.closest("[data-add]");
    if (addBtn) {
      const num = Number(addBtn.dataset.add);
      setQty(num, (cart[num] || 0) + 1);
      return;
    }
    const incBtn = e.target.closest("[data-inc]");
    if (incBtn) {
      const num = Number(incBtn.dataset.inc);
      setQty(num, (cart[num] || 0) + 1);
      return;
    }
    const decBtn = e.target.closest("[data-dec]");
    if (decBtn) {
      const num = Number(decBtn.dataset.dec);
      setQty(num, (cart[num] || 0) - 1);
      return;
    }
    const removeBtn = e.target.closest("[data-remove]");
    if (removeBtn) {
      const num = Number(removeBtn.dataset.remove);
      setQty(num, 0);
      return;
    }
  });
}

// ---------------- Init ----------------
async function init() {
  const res = await fetch("data/products.json");
  CATALOG = await res.json();
  renderCatalog();
  wireEvents();
  renderCartCount();
  renderCartDrawer();
}

init();
