// --- Utilities ---
const $ = (sel, parent = document) => parent.querySelector(sel);
const $$ = (sel, parent = document) => [...parent.querySelectorAll(sel)];

function formatCurrency(n) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'INR' }).format(n);
}

function getYear() {
  const y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();
}

function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cart') || '[]');
  } catch {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateNavCartCount();
}

function updateNavCartCount() {
  const count = getCart().reduce((sum, item) => sum + item.qty, 0);
  const el = document.getElementById('navCartCount');
  if (el) el.textContent = count;
}

// --- Cart operations ---
function addToCart(productId, qty = 1) {
  const cart = getCart();
  const existing = cart.find(i => i.id === productId);
  if (existing) {
    existing.qty += qty;
  } else {
    const p = products.find(p => p.id === productId);
    if (!p) return;
    cart.push({ id: productId, qty });
  }
  saveCart(cart);
  alert('Added to cart!');
}

function updateQuantity(productId, qty) {
  const cart = getCart();
  const item = cart.find(i => i.id === productId);
  if (!item) return;
  item.qty = Math.max(1, qty | 0);
  saveCart(cart);
  renderCart(); // refresh view
}

function removeFromCart(productId) {
  const cart = getCart().filter(i => i.id !== productId);
  saveCart(cart);
  renderCart();
}

// --- Index (listing) ---
function renderProductList() {
  const list = document.getElementById('productList');
  if (!list) return;
  list.innerHTML = products.map(p => `
    <article class="product card">
      <a href="product.html?id=${p.id}" aria-label="${p.name}">
        <img class="product__image" src="${p.images[0]}" alt="${p.name}" loading="lazy" />
      </a>
      <h3 class="product__title">${p.name}</h3>
      <div class="product__price">${formatCurrency(p.price)}</div>
      <div class="product__actions">
        <a class="btn" href="product.html?id=${p.id}">View</a>
        <button class="btn btn--primary" data-add="${p.id}">Add to Cart</button>
      </div>
    </article>
  `).join('');

  // Button handlers
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-add]');
    if (!btn) return;
    const id = Number(btn.getAttribute('data-add'));
    addToCart(id, 1);
  });
}

// --- Product detail ---
function renderProductDetail() {
  const root = document.getElementById('productDetail');
  if (!root) return;
  const params = new URLSearchParams(location.search);
  const id = Number(params.get('id'));
  const p = products.find(p => p.id === id) || products[0];

  root.innerHTML = `
    <div class="product-detail__gallery">
      <img id="mainImage" class="product__image" src="${p.images[0]}" alt="${p.name}" />
      <div class="product-detail__thumbs">
        ${p.images.map((src,i)=>`<img class="product__image" data-thumb="${i}" src="${src}" alt="${p.name} thumbnail ${i+1}" />`).join('')}
      </div>
    </div>
    <div>
      <h2 class="product-detail__title">${p.name}</h2>
      <div class="product__price">${formatCurrency(p.price)}</div>
      <p class="product-detail__desc">${p.description}</p>
      <div class="product__actions">
        <input id="qty" class="qty-input" type="number" value="1" min="1" />
        <button id="addBtn" class="btn btn--primary">Add to Cart</button>
      </div>
    </div>
  `;

  root.addEventListener('click', (e) => {
    const t = e.target;
    if (t.matches('[data-thumb]')) {
      $('#mainImage').src = t.src;
    }
  });

  $('#addBtn').addEventListener('click', () => {
    const qty = Math.max(1, Number($('#qty').value || 1));
    addToCart(p.id, qty);
  });
}

// --- Cart page ---
function renderCart() {
  const tbody = document.getElementById('cartItems');
  const empty = document.getElementById('cartEmpty');
  const content = document.getElementById('cartContent');
  const totalEl = document.getElementById('cartTotal');
  if (!tbody) return;

  const cart = getCart();
  if (cart.length === 0) {
    empty.classList.remove('hidden');
    content.classList.add('hidden');
    return;
  } else {
    empty.classList.add('hidden');
    content.classList.remove('hidden');
  }

  let total = 0;
  tbody.innerHTML = cart.map(item => {
    const p = products.find(p => p.id === item.id);
    if (!p) return '';
    const subtotal = p.price * item.qty;
    total += subtotal;
    return `
      <tr>
        <td>
          <div style="display:flex; gap:10px; align-items:center;">
            <img src="${p.images[0]}" alt="${p.name}" style="width:70px; height:70px; object-fit:cover; border-radius:10px; border:1px solid #eee;" />
            <div>
              <div style="font-weight:600;">${p.name}</div>
              <div style="font-size:.9rem; color:#666;">ID: ${p.id}</div>
            </div>
          </div>
        </td>
        <td class="center">${formatCurrency(p.price)}</td>
        <td class="center">
          <input class="qty-input" type="number" min="1" value="${item.qty}" data-qty="${p.id}" />
        </td>
        <td class="right">${formatCurrency(subtotal)}</td>
        <td class="right"><button class="btn btn--ghost" data-remove="${p.id}">Remove</button></td>
      </tr>
    `;
  }).join('');

  totalEl.textContent = formatCurrency(total);

  // Quantity & remove listeners
  tbody.addEventListener('input', (e) => {
    const input = e.target.closest('[data-qty]');
    if (!input) return;
    const id = Number(input.getAttribute('data-qty'));
    updateQuantity(id, Number(input.value));
  });

  tbody.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-remove]');
    if (!btn) return;
    const id = Number(btn.getAttribute('data-remove'));
    removeFromCart(id);
  });
}

// --- Checkout page ---
function initCheckout() {
  const form = document.getElementById('checkoutForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    // Basic validation
    const fields = ['name', 'address', 'email'];
    let valid = true;

    fields.forEach(f => {
      const input = document.getElementById(f);
      const error = document.querySelector(`[data-for="${f}"]`);
      if (!input.value.trim()) {
        error.textContent = 'This field is required.';
        valid = false;
      } else if (f === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        error.textContent = 'Please enter a valid email.';
        valid = false;
      } else {
        error.textContent = '';
      }
    });

    if (!valid) return;

    // In a real app you would send the order to a server here.
    localStorage.removeItem('cart');
    updateNavCartCount();
    document.getElementById('orderMessage').classList.remove('hidden');
    form.classList.add('hidden');
  });
}

// --- Boot ---
document.addEventListener('DOMContentLoaded', () => {
  getYear();
  updateNavCartCount();
  renderProductList();
  renderProductDetail();
  renderCart();
  initCheckout();
});
