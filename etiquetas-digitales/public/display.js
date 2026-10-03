// Pantalla de etiqueta. Se conecta al servidor por SSE y se actualiza sola
// cuando cambia un precio. Guarda la última información en el dispositivo
// para seguir mostrando la etiqueta si se cae la red.
(function () {
  const screenId = decodeURIComponent(location.pathname.split('/').filter(Boolean).pop());
  const cacheKey = `etiqueta:${screenId}`;
  const $ = (id) => document.getElementById(id);
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });
  const fmt = (n) => money.format(n).replace('MX', '');

  let state = null;
  let index = 0;
  let rotateTimer = null;

  function renderProduct(p) {
    const s = state.settings;
    $('name').textContent = p.name;
    $('department').textContent = p.department || '';
    $('price').textContent = fmt(p.price);
    $('price').classList.toggle('sale', !!p.regularPrice);
    $('regular').hidden = !p.regularPrice;
    if (p.regularPrice) {
      $('regularLabel').textContent = s.regularPriceLabel || 'Precio regular';
      $('regularPrice').textContent = fmt(p.regularPrice);
      $('savings').textContent = `Ahorras ${fmt(p.regularPrice - p.price)}`;
    }
    $('sku').textContent = p.sku;
    $('barcode').src = `/barcode/${encodeURIComponent(p.barcode || p.sku)}.svg`;
    $('qr').src = `/qr.svg?text=${encodeURIComponent(s.appUrl || location.origin)}`;
    $('qr').parentElement.hidden = !s.appUrl;
    $('footer').textContent = s.footer || '';
  }

  function show() {
    const products = state.products;
    clearTimeout(rotateTimer);
    document.body.classList.toggle('dark', state.screen.theme === 'dark');
    if (!products.length) {
      $('label').hidden = true;
      $('message').hidden = false;
      $('message').textContent = `Pantalla "${state.screen.name}" sin productos asignados`;
      return;
    }
    $('message').hidden = true;
    $('label').hidden = false;
    index = index % products.length;
    renderProduct(products[index]);
    if (products.length > 1) {
      rotateTimer = setTimeout(() => {
        $('label').classList.add('fade');
        setTimeout(() => {
          index++;
          show();
          $('label').classList.remove('fade');
        }, 300);
      }, state.screen.rotateSeconds * 1000);
    }
  }

  function apply(data) {
    if (!data) {
      $('label').hidden = true;
      $('message').hidden = false;
      $('message').textContent = `Pantalla "${screenId}" no registrada. Dala de alta en el panel de administración.`;
      return;
    }
    state = data;
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch (_) {}
    show();
  }

  function setStatus(online) {
    $('status').className = `status ${online ? 'online' : 'offline'}`;
  }

  try {
    const cached = JSON.parse(localStorage.getItem(cacheKey));
    if (cached) apply(cached);
  } catch (_) {}

  // EventSource se reconecta automáticamente si se pierde la conexión.
  const events = new EventSource(`/api/display/${encodeURIComponent(screenId)}/events`);
  events.onopen = () => setStatus(true);
  events.onerror = () => setStatus(false);
  events.onmessage = (e) => apply(JSON.parse(e.data));

  // Mantener la pantalla encendida y entrar en pantalla completa con un toque.
  async function keepAwake() {
    try { if ('wakeLock' in navigator) await navigator.wakeLock.request('screen'); } catch (_) {}
  }
  keepAwake();
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && keepAwake());
  document.addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen?.().catch(() => {});
    keepAwake();
  });
})();
