(function () {
  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const fmt = (n) => (n == null ? '—' : money.format(n).replace('MX', ''));
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  let key = localStorage.getItem('adminKey') || '';
  let state = { products: [], screens: [], settings: {} };

  async function api(method, url, body, type = 'application/json') {
    const res = await fetch(url, {
      method,
      headers: { 'x-admin-key': key, ...(body !== undefined && { 'Content-Type': type }) },
      body: body === undefined ? undefined : type === 'application/json' ? JSON.stringify(body) : body,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401) logout();
    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
    return data;
  }

  function toast(msg) {
    $('toast').textContent = msg;
    $('toast').hidden = false;
    clearTimeout(toast.t);
    toast.t = setTimeout(() => ($('toast').hidden = true), 2500);
  }

  function logout() {
    localStorage.removeItem('adminKey');
    clearInterval(start.t);
    $('app').hidden = true;
    $('login').hidden = false;
  }

  async function refresh({ settings = true } = {}) {
    state = await api('GET', '/api/state');
    renderProducts();
    renderScreens();
    if (settings) for (const [k, v] of Object.entries(state.settings)) {
      const input = $('settingsForm').elements[k];
      if (input) input.value = v;
    }
  }

  function renderProducts() {
    const q = $('search').value.trim().toLowerCase();
    const rows = state.products
      .filter((p) => !q || `${p.sku} ${p.name} ${p.department}`.toLowerCase().includes(q))
      .sort((a, b) => a.name.localeCompare(b.name));
    $('productRows').innerHTML = rows.map((p) => {
      const screens = state.screens.filter((s) => s.skus.includes(p.sku)).map((s) => esc(s.name)).join(', ');
      return `<tr>
        <td>${esc(p.sku)}</td>
        <td>${esc(p.name)}<br><small>${esc(p.department)}</small></td>
        <td class="num"><b>${fmt(p.price)}</b></td>
        <td class="num">${fmt(p.regularPrice)}</td>
        <td>${screens || '—'}</td>
        <td><button class="link" data-edit-product="${esc(p.sku)}">Editar</button>
            <button class="link danger" data-del-product="${esc(p.sku)}">Borrar</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="6">Sin productos</td></tr>';
  }

  function renderScreens() {
    $('screenRows').innerHTML = state.screens.map((s) => {
      const url = `${location.origin}/display/${encodeURIComponent(s.id)}`;
      return `<tr>
        <td><span class="dot ${s.online ? 'on' : ''}"></span>${s.online ? 'En línea' : 'Desconectada'}</td>
        <td>${esc(s.name)}<br><small>${esc(s.id)}</small></td>
        <td>${s.skus.map(esc).join(', ') || '—'}</td>
        <td><a href="${url}" target="_blank">${esc(url)}</a></td>
        <td><button class="link" data-edit-screen="${esc(s.id)}">Editar</button>
            <button class="link danger" data-del-screen="${esc(s.id)}">Borrar</button></td>
      </tr>`;
    }).join('') || '<tr><td colspan="5">Sin pantallas</td></tr>';
  }

  function fill(form, obj) {
    for (const el of form.elements) if (el.name && el.name in obj) el.value = Array.isArray(obj[el.name]) ? obj[el.name].join(', ') : obj[el.name] ?? '';
    form.scrollIntoView({ behavior: 'smooth' });
  }

  // ---- eventos ----
  $('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    key = $('key').value;
    try {
      await api('POST', '/api/login');
      localStorage.setItem('adminKey', key);
      start();
    } catch (err) {
      $('loginError').textContent = err.message;
    }
  });

  document.querySelectorAll('nav button').forEach((btn) => btn.addEventListener('click', () => {
    document.querySelectorAll('nav button').forEach((b) => b.classList.toggle('active', b === btn));
    document.querySelectorAll('.tab').forEach((t) => (t.hidden = t.id !== `tab-${btn.dataset.tab}`));
    refresh().catch((err) => toast(err.message));
  }));

  $('search').addEventListener('input', renderProducts);

  $('productForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await api('PUT', `/api/products/${encodeURIComponent(data.sku.trim())}`, data);
      toast('Producto guardado — pantallas actualizadas');
      e.target.reset();
      refresh();
    } catch (err) { toast(err.message); }
  });

  $('screenForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    try {
      await api('PUT', `/api/screens/${encodeURIComponent(data.id.trim())}`, data);
      toast('Pantalla guardada');
      e.target.reset();
      refresh();
    } catch (err) { toast(err.message); }
  });

  $('settingsForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
      await api('PUT', '/api/settings', Object.fromEntries(new FormData(e.target)));
      toast('Ajustes guardados');
    } catch (err) { toast(err.message); }
  });

  $('csvFile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (file) $('csvText').value = await file.text();
  });

  $('importBtn').addEventListener('click', async () => {
    try {
      const r = await api('POST', '/api/products/import', $('csvText').value, 'text/csv');
      $('importResult').textContent = `Importados: ${r.imported}` + (r.errors.length ? `\nErrores:\n${r.errors.join('\n')}` : '');
      refresh();
    } catch (err) { toast(err.message); }
  });

  document.addEventListener('click', async (e) => {
    const t = e.target.dataset;
    try {
      if (t.editProduct) fill($('productForm'), state.products.find((p) => p.sku === t.editProduct));
      if (t.editScreen) fill($('screenForm'), state.screens.find((s) => s.id === t.editScreen));
      if (t.delProduct && confirm(`¿Borrar producto ${t.delProduct}?`)) { await api('DELETE', `/api/products/${encodeURIComponent(t.delProduct)}`); refresh(); }
      if (t.delScreen && confirm(`¿Borrar pantalla ${t.delScreen}?`)) { await api('DELETE', `/api/screens/${encodeURIComponent(t.delScreen)}`); refresh(); }
    } catch (err) { toast(err.message); }
  });

  function start() {
    $('login').hidden = true;
    $('app').hidden = false;
    refresh().catch((err) => toast(err.message));
    clearInterval(start.t);
    // refresca el estado "en línea" de las pantallas sin pisar el formulario de ajustes
    start.t = setInterval(() => refresh({ settings: false }).catch(() => {}), 15000);
  }

  if (key) start();
})();
