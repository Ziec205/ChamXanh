const API = '';
let token = localStorage.getItem('admin_token');

async function api(path, options = {}) {
  const headers = { ...options.headers };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
  const res = await fetch(API + path, { ...options, headers });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Loi');
  return data;
}

async function adminLogin() {
  const email = document.getElementById('loginEmail').value;
  const password = document.getElementById('loginPassword').value;
  try {
    const data = await api('/api/auth/admin/login', { method: 'POST', body: JSON.stringify({ email, password }) });
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

function showTab(tab, el) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.add('hidden'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.remove('hidden');
  if (el) el.classList.add('active');
  if (tab === 'overview') loadOverview();
  if (tab === 'products') loadProducts();
  if (tab === 'users') loadUsers();
}

async function loadOverview() {
  try {
    const [u, p] = await Promise.all([api('/api/users'), api('/api/products/all')]);
    document.getElementById('statUsers').textContent = u.users.length;
    document.getElementById('statProducts').textContent = p.products.length;
    document.getElementById('statActive').textContent = u.users.filter(x => x.active).length;
    const recent = u.users.slice(-5).reverse();
    document.getElementById('recentUsers').innerHTML = recent.length
      ? '<table class="users-table"><thead><tr><th>Nguoi dung</th><th>Email</th><th>Trang thai</th></tr></thead><tbody>'
        + recent.map(r => `<tr><td><div class="user-cell"><div class="user-avatar">${(r.name||'?')[0].toUpperCase()}</div><span class="user-name">${r.name}</span></div></td><td class="user-email">${r.email}</td><td><span class="badge ${r.active?'active':'inactive'}">${r.active?'Active':'Inactive'}</span></td></tr>`).join('')
        + '</tbody></table>'
      : '<div class="empty-state"><span class="empty-icon">&#9823;</span><p>Chua co nguoi dung nao</p></div>';
  } catch (e) { console.error(e); }
}

async function loadProducts() {
  try {
    const data = await api('/api/products/all');
    const c = document.getElementById('productsList');
    c.innerHTML = data.products.length
      ? data.products.map(p => `
        <div class="product-card">
          ${p.image ? `<img src="${p.image}" alt="${p.name}">` : `<div class="no-img">&#9752;</div>`}
          <div class="product-body">
            <h3>${p.name}</h3>
            <div class="product-price">${Number(p.price).toLocaleString()}d</div>
            <span class="product-category">${p.category}</span>
            ${p.description ? `<div class="product-desc">${p.description}</div>` : ''}
            <div class="product-actions">
              <button class="btn-edit" onclick='editProduct(${JSON.stringify(p).replace(/'/g,"\\'")})'>Sua</button>
              <button class="btn-toggle" onclick="toggleProduct('${p._id||p.id}',${p.active})">${p.active?'An':'Hien'}</button>
              <button class="btn-delete" onclick="deleteProduct('${p._id||p.id}')">Xoa</button>
            </div>
          </div>
        </div>`).join('')
      : '<div class="empty-state" style="grid-column:1/-1"><span class="empty-icon">&#9752;</span><p>Chua co san pham. Nhan "Them San Pham" de bat dau!</p></div>';
  } catch (e) { console.error(e); }
}

function showAddProduct() {
  document.getElementById('modalTitle').textContent = 'Them San Pham';
  document.getElementById('productId').value = '';
  document.getElementById('productName').value = '';
  document.getElementById('productPrice').value = '';
  document.getElementById('productDesc').value = '';
  document.getElementById('productCategory').value = 'Cay canh';
  document.getElementById('productImage').value = '';
  document.getElementById('imagePreview').innerHTML = '';
  document.getElementById('productModal').classList.remove('hidden');
}

function editProduct(p) {
  document.getElementById('modalTitle').textContent = 'Chinh Sua San Pham';
  document.getElementById('productId').value = p._id || p.id;
  document.getElementById('productName').value = p.name;
  document.getElementById('productPrice').value = p.price;
  document.getElementById('productDesc').value = p.description || '';
  document.getElementById('productCategory').value = p.category || 'Cay canh';
  document.getElementById('imagePreview').innerHTML = p.image ? `<img src="${p.image}">` : '';
  document.getElementById('productModal').classList.remove('hidden');
}

function closeProductModal() { document.getElementById('productModal').classList.add('hidden'); }

async function saveProduct() {
  const id = document.getElementById('productId').value;
  const fd = new FormData();
  fd.append('name', document.getElementById('productName').value);
  fd.append('price', document.getElementById('productPrice').value);
  fd.append('description', document.getElementById('productDesc').value);
  fd.append('category', document.getElementById('productCategory').value);
  const f = document.getElementById('productImage').files[0];
  if (f) fd.append('image', f);
  try {
    if (id) await api('/api/products/' + id, { method: 'PUT', body: fd, headers: {} });
    else await api('/api/products', { method: 'POST', body: fd, headers: {} });
    closeProductModal();
    loadProducts();
  } catch (e) { alert(e.message); }
}

async function toggleProduct(id, active) {
  const fd = new FormData();
  fd.append('active', !active);
  await api('/api/products/' + id, { method: 'PUT', body: fd, headers: {} });
  loadProducts();
}

async function deleteProduct(id) {
  if (!confirm('Xoa san pham nay?')) return;
  await api('/api/products/' + id, { method: 'DELETE' });
  loadProducts();
}

async function loadUsers() {
  try {
    const data = await api('/api/users');
    const c = document.getElementById('usersList');
    c.innerHTML = data.users.length
      ? data.users.map(u => `
        <tr>
          <td><div class="user-cell"><div class="user-avatar">${(u.name||'?')[0].toUpperCase()}</div><span class="user-name">${u.name}</span></div></td>
          <td><span class="user-email">${u.email}</span></td>
          <td><span class="user-email">${u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : '-'}</span></td>
          <td><span class="badge ${u.active?'active':'inactive'}">${u.active?'Active':'Inactive'}</span></td>
          <td><div class="user-actions">
            <button onclick="toggleUser('${u._id||u.id}')">${u.active?'Khoa':'Mo'}</button>
            <button class="btn-del" onclick="deleteUser('${u._id||u.id}')">Xoa</button>
          </div></td>
        </tr>`).join('')
      : '<tr><td colspan="5"><div class="empty-state"><span class="empty-icon">&#9823;</span><p>Chua co nguoi dung</p></div></td></tr>';
  } catch (e) { console.error(e); }
}

async function toggleUser(id) { await api('/api/users/' + id + '/toggle', { method: 'PUT' }); loadUsers(); }
async function deleteUser(id) { if (!confirm('Xoa nguoi dung?')) return; await api('/api/users/' + id, { method: 'DELETE' }); loadUsers(); }

function saveSettings() { alert('Da luu! Can restart server de ap dung.'); }

document.addEventListener('DOMContentLoaded', () => {
  const i = document.getElementById('productImage');
  if (i) i.addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) { const r = new FileReader(); r.onload = ev => { document.getElementById('imagePreview').innerHTML = `<img src="${ev.target.result}">`; }; r.readAsDataURL(f); }
  });
});

if (token) { api('/api/users').then(() => showDashboard()).catch(() => logout()); }
else { document.getElementById('loginPage').classList.remove('hidden'); }
