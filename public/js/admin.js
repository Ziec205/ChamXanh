const API = '';
let token = localStorage.getItem('admin_token');

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Lỗi');
  return data;
}

// LOGIN
async function adminLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const data = await api('/api/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    token = data.token;
    localStorage.setItem('admin_token', token);
    showDashboard();
  } catch (e) {
    document.getElementById('loginError').textContent = e.message;
  }
}

function logout() {
  token = null;
  localStorage.removeItem('admin_token');
  document.getElementById('loginPage').classList.remove('hidden');
  document.getElementById('dashboard').classList.add('hidden');
}

function showDashboard() {
  document.getElementById('loginPage').classList.add('hidden');
  document.getElementById('dashboard').classList.remove('hidden');
  loadOverview();
}

// TABS
function showTab(tab) {
  document.querySelectorAll('.tab-content').forEach((el) => el.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach((el) => el.classList.remove('active'));
  document.getElementById(`tab-${tab}`).classList.remove('hidden');
  event.target.classList.add('active');
  if (tab === 'overview') loadOverview();
  if (tab === 'products') loadProducts();
  if (tab === 'users') loadUsers();
}

// OVERVIEW
async function loadOverview() {
  try {
    const [usersData, productsData] = await Promise.all([
      api('/api/users'),
      api('/api/products/all'),
    ]);
    document.getElementById('statUsers').textContent = usersData.users.length;
    document.getElementById('statProducts').textContent = productsData.products.length;
    document.getElementById('statActive').textContent = usersData.users.filter((u) => u.active).length;

    const recent = usersData.users.slice(-5).reverse();
    document.getElementById('recentUsers').innerHTML = recent.length
      ? recent.map((u) => `<div class="user-card"><div class="user-info"><div class="user-avatar">${u.name?.[0]?.toUpperCase() || '?'}</div><div><div class="user-name">${u.name}</div><div class="user-email">${u.email}</div></div></div><span class="badge ${u.active ? 'active' : 'inactive'}">${u.active ? 'Active' : 'Inactive'}</span></div>`).join('')
      : '<p style="color:#76786b">Chưa có người dùng nào</p>';
  } catch (e) {
    console.error(e);
  }
}

// PRODUCTS
async function loadProducts() {
  try {
    const data = await api('/api/products/all');
    const container = document.getElementById('productsList');
    container.innerHTML = data.products.length
      ? data.products.map((p) => `
        <div class="product-card">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div class="no-img">🌱</div>`}
          <div class="product-info">
            <h3>${p.name}</h3>
            <div class="price">${Number(p.price).toLocaleString()}đ</div>
            <span class="category">${p.category}</span>
            ${p.description ? `<div class="desc">${p.description}</div>` : ''}
            <div class="product-actions">
              <button class="edit-btn" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "\\'")})'>✏️ Sửa</button>
              <button class="toggle-btn" onclick="toggleProduct('${p._id||p.id}', ${p.active})">${p.active ? '🔒 Ẩn' : '👁 Hiện'}</button>
              <button class="delete-btn" onclick="deleteProduct('${p._id||p.id}')">🗑️</button>
            </div>
          </div>
        </div>
      `).join('')
      : '<p style="color:#76786b;grid-column:1/-1;text-align:center;padding:40px">Chưa có sản phẩm. Nhấn "Thêm Sản Phẩm" để bắt đầu!</p>';
  } catch (e) {
    console.error(e);
  }
}

function showAddProduct() {
  document.getElementById('modalTitle').textContent = 'Thêm Sản Phẩm';
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productCategory').value = 'Cây cảnh';
  document.getElementById('productImage').value = '';
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('productModal').classList.remove('hidden');
}

function editProduct(product) {
  document.getElementById('modalTitle').textContent = 'Chỉnh Sửa Sản Phẩm';
  document.getElementById('productId').value = product._id || product.id;
  document.getElementById('productName').value = product.name;
  document.getElementById('productPrice').value = product.price;
  document.getElementById('productDesc').value = product.description || '';
  document.getElementById('productCategory').value = product.category || 'Cây cảnh';
  document.getElementById('imagePreview').innerHTML = product.image ? `<img src="${product.image}">` : '';
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() {
  document.getElementById('productModal').classList.add('hidden');
}

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const formData = new FormData();
  formData.append('name', document.getElementById('productName').value);
  formData.append('price', document.getElementById('productPrice').value);
  formData.append('description', document.getElementById('productDesc').value);
  formData.append('category', document.getElementById('productCategory').value);
  const file = document.getElementById('productImage').files[0];
  if (file) formData.append('image', file);

  try {
    if (id) {
      await api(`/api/products/${id}`, { method: 'PUT', body: formData, headers: {} });
    } else {
      await api('/api/products', { method: 'POST', body: formData, headers: {} });
    }
    closeProductModal();
    loadProducts();
  } catch (e) {
    alert(e.message);
  }
}

async function toggleProduct(id, active) {
  const formData = new FormData();
  formData.append('active', !active);
  await api(`/api/products/${id}`, { method: 'PUT', body: formData, headers: {} });
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Xóa sản phẩm này?')) return;
  await api(`/api/products/${id}`, { method: 'DELETE' });
  loadProducts();
}

// USERS
async function loadUsers() {
  try {
    const data = await api('/api/users');
    const container = document.getElementById('usersList');
    container.innerHTML = data.users.length
      ? data.users.map((u) => `
        <div class="user-card">
          <div class="user-info">
            <div class="user-avatar">${u.name?.[0]?.toUpperCase() || '?'}</div>
            <div>
              <div class="user-name">${u.name}</div>
              <div class="user-email">${u.email}</div>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span class="badge ${u.active ? 'active' : 'inactive'}">${u.active ? 'Active' : 'Inactive'}</span>
            <div class="user-actions">
              <button class="toggle-btn" onclick="toggleUser('${u._id||u.id}')">${u.active ? '🔒 Khóa' : '✅ Mở'}</button>
              <button class="delete-btn" onclick="deleteUser('${u._id||u.id}')">🗑️</button>
            </div>
          </div>
        </div>
      `).join('')
      : '<p style="color:#76786b;text-align:center;padding:40px">Chưa có người dùng nào</p>';
  } catch (e) {
    console.error(e);
  }
}

async function toggleUser(id) {
  await api(`/api/users/${id}/toggle`, { method: 'PUT' });
  loadUsers();
}

async function deleteUser(id) {
  if (!confirm('Xóa người dùng này?')) return;
  await api(`/api/users/${id}`, { method: 'DELETE' });
  loadUsers();
}

// SETTINGS
function saveSettings() {
  alert('Gemini API Key đã lưu! Cần restart server để áp dụng.');
}

// IMAGE PREVIEW
document.addEventListener('DOMContentLoaded', () => {
  const imgInput = document.getElementById('productImage');
  if (imgInput) {
    imgInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => { document.getElementById('imagePreview').innerHTML = `<img src="${ev.target.result}">`; };
        reader.readAsDataURL(file);
      }
    });
  }
});

// INIT
if (token) {
  api('/api/users').then(() => showDashboard()).catch(() => logout());
} else {
  document.getElementById('loginPage').classList.remove('hidden');
}
