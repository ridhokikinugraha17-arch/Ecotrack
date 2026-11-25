/* EcoTrack Lampung - inti front-end: sidebar, filter global, pemuatan data tunggal, fungsi statistik bersama. */
(function () {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const body = document.body;
  const Eco = (window.Eco = { $, $$ });

  /* Konstanta tampilan */
  window.LL = [-4.95, 105.15];
  window.dot = c => L.divIcon({ className: '', html: '<div style="width:16px;height:16px;border-radius:50%;background:' + c + ';border:2px solid #fff;box-shadow:0 0 4px #0006"></div>' });
  Eco.CLASSES = [
    { k: 'Rendah', c: '#10B981' },
    { k: 'Sedang', c: '#FACC15' },
    { k: 'Tinggi', c: '#F59E0B' },
    { k: 'Sangat Tinggi', c: '#EF4444' }
  ];
  Eco.NODATA = '#CBD5E1';
  Eco.PALETTE = ['#064E3B', '#059669', '#2563EB', '#F59E0B', '#34D399', '#0EA5E9', '#EF4444', '#84CC16', '#6366F1', '#14B8A6', '#FBBF24', '#475569', '#A3E635', '#F472B6', '#94A3B8'];

  /* Format angka Indonesia & escape HTML */
  Eco.fmt = (n, d = 0) => new Intl.NumberFormat('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }).format(n);
  Eco.compact = n => (n >= 1e6 ? Eco.fmt(n / 1e6, 2) + ' jt' : n >= 1e3 ? Eco.fmt(n / 1e3, 1) + ' rb' : Eco.fmt(n, 0));
  Eco.axis = v => (v >= 1e6 ? Eco.fmt(v / 1e6, 1) + ' jt' : v >= 1e3 ? Eco.fmt(v / 1e3, 0) + ' rb' : Eco.fmt(v));
  Eco.esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  Eco.short = n => n.replace(/^Kab\. |^Kota /, m => (m === 'Kota ' ? 'Kota ' : ''));

  /* ---------- Sidebar: collapse (desktop) & drawer (mobile) ---------- */
  const drawer = o => body.classList.toggle('drawer-open', o);
  const collapse = () => {
    const c = body.classList.toggle('collapsed');
    try { localStorage.setItem('eco.side', c ? '1' : '0'); } catch (e) {}
    setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
  };
  $('#ecoBurger') && $('#ecoBurger').addEventListener('click', () => drawer(true));
  $('#ecoOverlay') && $('#ecoOverlay').addEventListener('click', () => drawer(false));
  $('#ecoCollapse') && $('#ecoCollapse').addEventListener('click', collapse);
  $('#ecoCollapse2') && $('#ecoCollapse2').addEventListener('click', collapse);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') drawer(false); });
  $$('.side-nav a').forEach(a => a.addEventListener('click', () => drawer(false)));

  /* ---------- State filter global (tahun, kab, q) ---------- */
  Eco.state = { tahun: 'all', kab: 'all', q: '' };
  Eco.hasFilters = !!$('#ecoFilters');
  const listeners = [];
  Eco.onChange = fn => listeners.push(fn);
  let tmr;
  const emit = () => { clearTimeout(tmr); tmr = setTimeout(() => listeners.forEach(f => f(Eco.state)), 60); };

  function persist() {
    const s = Eco.state, p = new URLSearchParams(location.search);
    ['tahun', 'kab', 'q'].forEach(k => p.delete(k));
    if (s.tahun !== Eco.defaultYear) p.set('tahun', s.tahun);
    if (s.kab !== 'all') p.set('kab', s.kab);
    if (s.q) p.set('q', s.q);
    try { sessionStorage.setItem('eco.f', JSON.stringify(s)); } catch (e) {}
    const qs = p.toString();
    history.replaceState(null, '', location.pathname + (qs ? '?' + qs : ''));
    keepLinks();
  }
  function keepLinks() {
    const s = Eco.state, p = new URLSearchParams();
    if (Eco.defaultYear && s.tahun !== Eco.defaultYear) p.set('tahun', s.tahun);
    if (s.kab !== 'all') p.set('kab', s.kab);
    if (s.q) p.set('q', s.q);
    $$('a[data-keep]').forEach(a => {
      const base = a.getAttribute('data-base') || a.getAttribute('href').split('?')[0];
      a.setAttribute('data-base', base);
      const qs = p.toString();
      a.setAttribute('href', base + (qs ? '?' + qs : ''));
    });
  }
  Eco.set = (patch, silent) => {
    Object.assign(Eco.state, patch);
    syncControls();
    persist();
    if (!silent) emit();
  };
  function syncControls() {
    const s = Eco.state;
    $('#fTahun') && ($('#fTahun').value = s.tahun);
    $('#fKab') && ($('#fKab').value = s.kab);
    $('#ecoQ') && $('#ecoQ') !== document.activeElement && ($('#ecoQ').value = s.q);
    $('#tSearch') && $('#tSearch') !== document.activeElement && ($('#tSearch').value = s.q);
  }

  /* ---------- Pemuatan data (satu request ke /sipsn?format=json) ---------- */
  Eco.load = function () {
    if (Eco._p) return Eco._p;
    Eco._p = fetch('/sipsn?format=json', { headers: { Accept: 'application/json' } })
      .then(async r => {
        let j;
        try { j = await r.json(); } catch (e) { throw new Error('Respons server bukan JSON yang valid (HTTP ' + r.status + ').'); }
        if (!r.ok || !j.ok) throw new Error((j && j.error) || 'Gagal memuat data (HTTP ' + r.status + ').');
        return j;
      })
      .then(j => { prepare(j); return j; })
      .catch(err => { Eco._p = null; throw err; });
    return Eco._p;
  };

  function quantile(sorted, p) {
    if (!sorted.length) return 0;
    const i = (sorted.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
  }
  Eco.quantile = quantile;

  function prepare(j) {
    Eco.meta = j.meta;
    Eco.rows = j.data;
    Eco.years = [...j.meta.tahun].sort((a, b) => a - b);
    Eco.defaultYear = Eco.years.length ? String(Eco.years[Eco.years.length - 1]) : 'all';
    Eco.regions = j.meta.wilayah;                        /* 15 kabupaten/kota (daftar administratif) */
    Eco.key = {};
    Eco.rows.forEach(r => (Eco.key[r.kabkota + '|' + r.tahun] = r));
    /* Klasifikasi tunggal & konsisten: kuartil seluruh nilai timbulan tahunan dataset (semua tahun). */
    const v = Eco.rows.map(r => r.tahunan).sort((a, b) => a - b);
    Eco.breaks = [quantile(v, 0.25), quantile(v, 0.5), quantile(v, 0.75)];
  }
  Eco.classOf = val => (val <= Eco.breaks[0] ? 0 : val <= Eco.breaks[1] ? 1 : val <= Eco.breaks[2] ? 2 : 3);

  /* ---------- Fungsi statistik bersama ---------- */
  Eco.matchQ = (r, q) => !q || r.kabkota.toLowerCase().includes(q.toLowerCase());
  /* Baris sesuai filter. opt.ignoreYear=true mengabaikan filter tahun (untuk grafik tren) */
  Eco.filtered = (opt = {}) => {
    const s = Eco.state;
    return Eco.rows.filter(r =>
      (opt.ignoreYear || s.tahun === 'all' || r.tahun === +s.tahun) &&
      (s.kab === 'all' || r.kabkota === s.kab) && Eco.matchQ(r, s.q));
  };
  /* Agregasi per wilayah. Untuk satu tahun = nilai tahun itu; untuk "Semua Tahun" = rata-rata tahun yang tersedia. */
  Eco.regionAgg = rows => {
    const m = new Map();
    rows.forEach(r => {
      const o = m.get(r.kabkota) || { nama: r.kabkota, kode: r.kode, n: 0, years: [], sh: 0, st: 0 };
      o.n++; o.years.push(r.tahun); o.sh += r.harian; o.st += r.tahunan; m.set(r.kabkota, o);
    });
    return [...m.values()].map(o => ({ nama: o.nama, kode: o.kode, n: o.n, years: o.years.sort(), harian: o.sh / o.n, tahunan: o.st / o.n, sumT: o.st, sumH: o.sh }))
      .sort((a, b) => b.tahunan - a.tahunan);
  };
  /* Agregasi per tahun (cakupan dihitung dari baris yang diberikan) */
  Eco.yearAgg = rows => {
    const m = new Map();
    rows.forEach(r => {
      const o = m.get(r.tahun) || { tahun: r.tahun, n: 0, sumT: 0, sumH: 0, rows: [] };
      o.n++; o.sumT += r.tahunan; o.sumH += r.harian; o.rows.push(r); m.set(r.tahun, o);
    });
    return [...m.values()].sort((a, b) => a.tahun - b.tahun).map(o => {
      const s = [...o.rows].sort((a, b) => b.tahunan - a.tahunan), t = s.map(x => x.tahunan).reverse();
      return { tahun: o.tahun, n: o.n, sumT: o.sumT, sumH: o.sumH, avgT: o.sumT / o.n, avgH: o.sumH / o.n, medT: quantile(t, 0.5), max: s[0], min: s[s.length - 1], rows: s };
    });
  };
  /* Perubahan tahun ke tahun hanya untuk wilayah yang ada di KEDUA tahun (apple-to-apple) */
  Eco.likeForLike = rows => {
    const ys = [...new Set(rows.map(r => r.tahun))].sort((a, b) => a - b), out = [];
    const idx = {}; rows.forEach(r => (idx[r.kabkota + '|' + r.tahun] = r));
    ys.forEach(y => {
      if (!ys.includes(y + 1)) return;
      const pairs = rows.filter(r => r.tahun === y && idx[r.kabkota + '|' + (y + 1)]).map(r => ({ nama: r.kabkota, a: r.tahunan, b: idx[r.kabkota + '|' + (y + 1)].tahunan }));
      if (!pairs.length) return;
      const A = pairs.reduce((s, p) => s + p.a, 0), B = pairs.reduce((s, p) => s + p.b, 0);
      out.push({ dari: y, ke: y + 1, n: pairs.length, A, B, pct: (B / A - 1) * 100, pairs: pairs.map(p => ({ ...p, pct: (p.b / p.a - 1) * 100 })) });
    });
    return out;
  };
  Eco.regionNames = () => Eco.regions.map(r => r.nama);
  Eco.missing = year => {
    const have = new Set(Eco.rows.filter(r => r.tahun === +year).map(r => r.kabkota));
    return Eco.regionNames().filter(n => !have.has(n));
  };
  Eco.coverageText = () => Eco.years.map(y => y + ': ' + Eco.rows.filter(r => r.tahun === y).length + ' wilayah').join(' · ');
  Eco.pct = (v, d = 1) => (v > 0 ? '+' : '') + Eco.fmt(v, d) + '%';

  /* ---------- Chart.js helper ---------- */
  Eco.charts = {};
  Eco.chart = (id, cfg) => {
    const el = document.getElementById(id);
    if (!el || !window.Chart) return null;
    if (Eco.charts[id]) Eco.charts[id].destroy();
    Chart.defaults.font.family = "'Plus Jakarta Sans', system-ui, sans-serif";
    Chart.defaults.color = '#64748B';
    cfg.options = Object.assign({ responsive: true, maintainAspectRatio: false }, cfg.options || {});
    return (Eco.charts[id] = new Chart(el, cfg));
  };

  /* ---------- UI filter ---------- */
  function buildFilters() {
    const t = $('#fTahun'), k = $('#fKab');
    if (t) {
      t.innerHTML = '<option value="all">Semua Tahun</option>' + Eco.years.map(y => '<option value="' + y + '">' + y + '</option>').join('');
      t.addEventListener('change', () => Eco.set({ tahun: t.value }));
    }
    if (k) {
      k.innerHTML = '<option value="all">Semua Kabupaten/Kota</option>' + Eco.regionNames().sort().map(n => '<option>' + Eco.esc(n) + '</option>').join('');
      k.addEventListener('change', () => Eco.set({ kab: k.value }));
    }
    const rs = $('#fReset');
    rs && rs.addEventListener('click', () => Eco.set({ tahun: Eco.defaultYear, kab: 'all', q: '' }));
  }
  function updateInfo() {
    const el = $('#fInfo'); if (!el) return;
    const s = Eco.state, rows = Eco.filtered();
    const regs = new Set(rows.map(r => r.kabkota)).size, total = Eco.regions.length;
    el.innerHTML = '<i class="bi bi-info-circle"></i> ' + (s.tahun === 'all' ? 'Semua tahun' : 'Tahun ' + s.tahun) + ': <b>' + regs + '</b> dari ' + total + ' kab/kota terdata · ' + rows.length + ' baris data' + (s.q ? ' · pencarian “' + Eco.esc(s.q) + '”' : '');
  }
  Eco.onChange(updateInfo);

  /* Pencarian topbar */
  const form = $('#ecoSearch'), qi = $('#ecoQ');
  if (form && qi) {
    let dt;
    form.addEventListener('submit', e => {
      e.preventDefault();
      const v = qi.value.trim().slice(0, 60);
      if (Eco.hasFilters) Eco.set({ q: v });
      else location.href = '/sipsn' + (v ? '?q=' + encodeURIComponent(v) : '');
    });
    qi.addEventListener('input', () => {
      if (!Eco.hasFilters) return;
      clearTimeout(dt);
      dt = setTimeout(() => Eco.set({ q: qi.value.trim().slice(0, 60) }), 250);
    });
  }

  /* Notifikasi / error */
  Eco.notice = (html, type = 'warning', retry) => {
    const el = $('#ecoNotice'); if (!el) return;
    el.innerHTML = html ? '<div class="alert alert-' + type + ' d-flex align-items-center gap-2 flex-wrap" role="alert"><div class="flex-grow-1">' + html + '</div>' + (retry ? '<button class="btn btn-sm btn-outline-dark" id="ecoRetry">Coba lagi</button>' : '') + '</div>' : '';
    const b = $('#ecoRetry'); b && b.addEventListener('click', retry);
  };

  /* Titik masuk halaman: pages.js memanggil Eco.start(modul) */
  Eco.start = async function (mod) {
    const run = async () => {
      Eco.notice('');
      try {
        await Eco.load();
      } catch (err) {
        Eco.notice('<b>Data belum dapat dimuat.</b> ' + Eco.esc(err.message) + ' Pastikan database terhubung dan dataset SIPSN sudah diimpor (<code>tools/sipsn.sql</code>).', 'danger', run);
        $$('[data-skel]').forEach(n => (n.innerHTML = '<div class="empty">Data tidak tersedia</div>'));
        return;
      }
      if (!Eco._built) {
        Eco._built = true;
        const sp = new URLSearchParams(location.search), st = {};
        let saved = {};
        try { saved = JSON.parse(sessionStorage.getItem('eco.f') || '{}'); } catch (e) {}
        const pick = k => (sp.has(k) ? sp.get(k) : saved[k]);
        const names = Eco.regionNames();
        const ty = pick('tahun'), kb = pick('kab'), qq = pick('q');
        st.tahun = ty === 'all' || Eco.years.includes(+ty) ? String(ty) : Eco.defaultYear;
        if (!ty) st.tahun = Eco.defaultYear;
        st.kab = kb && names.includes(kb) ? kb : 'all';
        st.q = typeof qq === 'string' ? qq.slice(0, 60) : '';
        Object.assign(Eco.state, st);
        buildFilters();
        Eco.onChange(() => mod.render());
      }
      syncControls(); keepLinks(); updateInfo();
      if (!Eco.rows.length) {
        Eco.notice('Belum ada data SIPSN di database. Jalankan <code>tools/sipsn.sql</code> atau impor CSV melalui halaman Data Timbulan Sampah (admin).', 'warning');
      }
      await mod.init();
      mod.render();
    };
    return run();
  };
  keepLinks();
})();
