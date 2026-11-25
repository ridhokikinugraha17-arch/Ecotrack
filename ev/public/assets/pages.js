/* EcoTrack Lampung - modul halaman dashboard. Semua angka dihitung dari dataset SIPSN yang dimuat Eco.load(). */
(function () {
  'use strict';
  const { $, $$, esc, fmt } = Eco;
  const page = document.body.dataset.page;
  const nameShort = n => n.replace(/^Kab\. /, '').replace(/^Kota (.*)$/, '$1 (Kota)');
  Eco.short = nameShort;
  const basisLabel = () => (Eco.state.tahun === 'all' ? 'rata-rata tahunan ' + Eco.years[0] + '–' + Eco.years[Eco.years.length - 1] : 'tahun ' + Eco.state.tahun);
  const empty = (el, msg) => { if (el) el.innerHTML = '<div class="empty"><i class="bi bi-inbox"></i><span>' + esc(msg || 'Data tidak tersedia untuk filter ini') + '</span></div>'; };
  const classBadge = v => { const c = Eco.CLASSES[Eco.classOf(v)]; return '<span class="cls" style="--c:' + c.c + '">' + c.k + '</span>'; };
  const rangeText = () => {
    const b = Eco.breaks, f = v => Eco.compact(v);
    return [`≤ ${f(b[0])}`, `${f(b[0])} – ${f(b[1])}`, `${f(b[1])} – ${f(b[2])}`, `> ${f(b[2])}`];
  };

  /* =====================================================================
     INSIGHT OTOMATIS (informasi, perhatian, rekomendasi) - dihitung dari data aktual
     ===================================================================== */
  function insights() {
    const s = Eco.state, rows = Eco.filtered(), out = { info: [], warn: [], rec: [] };
    const agg = Eco.regionAgg(rows), n = agg.length;
    const base = basisLabel();
    const missingYear = s.tahun !== 'all' ? Eco.missing(s.tahun) : [];
    if (!n) {
      out.info.push({ t: 'Data tidak tersedia', d: 'Tidak ada data yang cocok dengan filter saat ini. Wilayah yang tidak memiliki data ditampilkan sebagai “tidak tersedia”, bukan nol.' });
      if (missingYear.length) out.warn.push({ t: 'Belum ada data tahun ' + s.tahun, d: missingYear.map(nameShort).join(', ') + '.' });
      return out;
    }
    const tot = agg.reduce((a, b) => a + b.tahunan, 0), hi = agg[0], lo = agg[n - 1];
    const sumRows = rows.reduce((a, r) => a + r.tahunan, 0), avgH = rows.reduce((a, r) => a + r.harian, 0) / rows.length;

    /* ---- Informasi ---- */
    out.info.push({ t: 'Wilayah timbulan tertinggi', d: `<b>${esc(hi.nama)}</b>: ${fmt(hi.tahunan)} ton/tahun (${fmt(hi.tahunan / tot * 100, 1)}% dari ${n} kab/kota terdata, ${base}).` });
    if (n > 1) out.info.push({ t: 'Wilayah timbulan terendah', d: `<b>${esc(lo.nama)}</b>: ${fmt(lo.tahunan)} ton/tahun. Wilayah tertinggi ${fmt(hi.tahunan / lo.tahunan, 1)}× lebih besar dari terendah.` });
    out.info.push({ t: 'Rata-rata & total', d: `Rata-rata timbulan harian <b>${fmt(avgH, 1)} ton/hari</b> per kab/kota. ${s.tahun === 'all' ? 'Akumulasi seluruh data terlapor' : 'Total timbulan tahunan'}: <b>${fmt(sumRows)} ton</b>.` });
    if (n >= 4) {
      const t3 = agg.slice(0, 3);
      out.info.push({ t: 'Perbandingan antarwilayah', d: `Tiga wilayah terbesar (${t3.map(x => nameShort(x.nama)).join(', ')}) menyumbang <b>${fmt(t3.reduce((a, b) => a + b.tahunan, 0) / tot * 100, 1)}%</b> dari total terdata.` });
    }
    const ya = Eco.yearAgg(Eco.filtered({ ignoreYear: true }));
    if (ya.length > 1) {
      const top = [...ya].sort((a, b) => b.sumT - a.sumT)[0];
      out.info.push({ t: 'Tahun dengan total tertinggi', d: `<b>${top.tahun}</b> (${fmt(top.sumT)} ton/tahun) pada cakupan ${top.n} kab/kota. Total antartahun tidak setara karena cakupan berbeda (${ya.map(y => y.tahun + ': ' + y.n).join(', ')}).` });
    }

    /* ---- Perubahan sebanding (wilayah yang ada di kedua tahun) ---- */
    const lfl = Eco.likeForLike(Eco.filtered({ ignoreYear: true }));
    let pair = null;
    if (s.tahun === 'all') pair = lfl[lfl.length - 1] || null; else pair = lfl.find(p => p.ke === +s.tahun) || null;
    let rising = [];

    /* ---- Perhatian ---- */
    const vh = agg.filter(x => Eco.classOf(x.tahunan) === 3);
    if (vh.length) out.warn.push({ t: 'Kelas “Sangat Tinggi”', d: `${vh.map(x => nameShort(x.nama)).join(', ')} berada di atas ${fmt(Eco.breaks[2])} ton/tahun (kuartil ke-3 seluruh data SIPSN).` });
    if (pair) {
      const srt = [...pair.pairs].sort((a, b) => b.pct - a.pct), up = srt[0], dn = srt[srt.length - 1];
      rising = srt.filter(x => x.pct > 5);
      out.warn.push({ t: `Perubahan ${pair.dari}→${pair.ke} (wilayah sebanding)`, d: `Pada ${pair.n} wilayah yang terdata di kedua tahun, total berubah <b>${Eco.pct(pair.pct)}</b>. Naik terbesar: ${esc(nameShort(up.nama))} (${Eco.pct(up.pct)}); ${dn.pct < 0 ? 'turun terbesar' : 'naik terkecil'}: ${esc(nameShort(dn.nama))} (${Eco.pct(dn.pct)}).` });
    } else if (s.tahun !== 'all') {
      out.warn.push({ t: 'Perubahan tahunan', d: `Tidak ada wilayah yang datanya tersedia pada ${+s.tahun - 1} dan ${s.tahun} untuk filter ini, sehingga kenaikan/penurunan tidak dihitung.` });
    }
    if (s.tahun !== 'all' && missingYear.length) out.warn.push({ t: `Data tahun ${s.tahun} tidak tersedia`, d: `${missingYear.length} kab/kota belum memiliki data: ${missingYear.map(nameShort).join(', ')}. Ditampilkan sebagai tidak tersedia, bukan nol.` });
    else if (s.tahun === 'all') {
      const thin = Eco.regionNames().map(r => ({ r, k: Eco.rows.filter(x => x.kabkota === r).length })).filter(x => x.k <= 1);
      if (thin.length) out.warn.push({ t: 'Cakupan data terbatas', d: `${thin.map(x => nameShort(x.r) + (x.k ? ' (1 tahun)' : ' (tidak ada)')).join(', ')} hanya memiliki data pada ≤1 tahun.` });
    }
    const same = [];
    const byR = {};
    Eco.filtered({ ignoreYear: true }).forEach(r => (byR[r.kabkota] = (byR[r.kabkota] || []).concat(r)));
    Object.values(byR).forEach(list => {
      list.sort((a, b) => a.tahun - b.tahun);
      for (let i = 1; i < list.length; i++) {
        const a = list[i - 1], b = list[i];
        if (b.tahun === a.tahun + 1 && Math.abs(b.tahunan - a.tahunan) / a.tahunan < 1e-4) same.push({ nama: a.kabkota, a: a.tahun, b: b.tahun, ident: a.tahunan === b.tahunan });
      }
    });
    if (same.length) out.warn.push({ t: 'Nilai nyaris/benar-benar identik antar tahun', d: `${same.slice(0, 4).map(x => `${esc(nameShort(x.nama))} ${x.a}→${x.b}${x.ident ? ' (identik)' : ''}`).join('; ')}${same.length > 4 ? '; +' + (same.length - 4) + ' lainnya' : ''}. Selisih <0,01% mengindikasikan data mungkin belum diperbarui pada pelaporan.` });

    /* ---- Rekomendasi (berdasar temuan di atas) ---- */
    if (n >= 3) {
      const t3 = agg.slice(0, 3);
      out.rec.push({ t: 'Prioritaskan wilayah dengan timbulan terbesar', d: `Perkuat pemilahan dari sumber, TPS3R/bank sampah, dan kapasitas pengangkutan serta TPA di ${t3.map(x => nameShort(x.nama)).join(', ')} (±${fmt(t3.reduce((a, b) => a + b.tahunan, 0) / tot * 100, 0)}% dari total terdata).` });
    } else {
      out.rec.push({ t: 'Pantau wilayah terpilih', d: `Gunakan data ${esc(hi.nama)} sebagai dasar target pengurangan sampah dan bandingkan dengan wilayah sejenis pada filter “Semua Kabupaten/Kota”.` });
    }
    if (rising.length) out.rec.push({ t: 'Waspadai wilayah dengan tren naik', d: `${rising.slice(0, 3).map(x => nameShort(x.nama) + ' (' + Eco.pct(x.pct) + ')').join(', ')} naik >5% pada periode sebanding; tinjau penyebab dan kesiapan fasilitas pengolahan.` });
    if (s.tahun !== 'all' && missingYear.length) out.rec.push({ t: 'Lengkapi pelaporan SIPSN', d: `Dorong ${missingYear.length} kab/kota yang belum memiliki data ${s.tahun} untuk melapor agar total provinsi dan tren antartahun dapat dibandingkan secara adil.` });
    else if (ya.length > 1 && Math.min(...ya.map(y => y.n)) !== Math.max(...ya.map(y => y.n))) out.rec.push({ t: 'Samakan cakupan pelaporan', d: 'Jumlah kab/kota terdata berbeda tiap tahun; gunakan perbandingan wilayah sebanding saat menyimpulkan naik/turun, dan standarkan pelaporan tahunan.' });
    if (same.length) out.rec.push({ t: 'Verifikasi data yang tidak berubah', d: 'Konfirmasi ke pengelola data daerah apakah nilai identik antar tahun merupakan hasil pembaruan atau salinan tahun sebelumnya.' });
    return out;
  }
  const insItem = (x, cls) => `<div class="ins ${cls}"><b>${esc(x.t)}</b><span>${x.d}</span></div>`;

  /* =====================================================================
     PETA (Leaflet) - choropleth kab/kota berdasarkan kelas kuartil data aktual
     ===================================================================== */
  async function loadGeo() {
    if (Eco.geo) return Eco.geo;
    const r = await fetch('/assets/data/lampung-kabkota.geojson');
    if (!r.ok) throw new Error('Batas wilayah tidak dapat dimuat (HTTP ' + r.status + ')');
    return (Eco.geo = await r.json());
  }
  Eco.mapView = async function (elId, opt = {}) {
    const el = document.getElementById(elId);
    if (!el || !window.L) { if (el) el.innerHTML = '<div class="empty">Pustaka peta tidak termuat</div>'; return null; }
    let geo;
    try { geo = await loadGeo(); } catch (e) { el.innerHTML = '<div class="empty">' + esc(e.message) + '</div>'; return null; }
    const map = L.map(el, { zoomControl: true, scrollWheelZoom: !!opt.wheel, attributionControl: true, minZoom: 7, maxZoom: 13, zoomSnap: 0.25, zoomDelta: 0.5 });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap | Batas: Kemendagri', maxZoom: 18 }).addTo(map);
    const byName = {};
    const layer = L.geoJSON(geo, {
      style: () => ({ weight: 1, color: '#fff', fillOpacity: .85, fillColor: Eco.NODATA }),
      onEachFeature: (f, ly) => {
        byName[f.properties.nama] = ly;
        ly.on({ mouseover: () => ly.setStyle({ weight: 2.5, color: '#064E3B' }), mouseout: () => layer.resetStyle(ly) && restyle(ly) });
        ly.on('click', () => { ly.openPopup(); });
      }
    }).addTo(map);
    map.fitBounds(layer.getBounds(), { padding: [6, 6] });
    const bounds = layer.getBounds();
    map.setMaxBounds(bounds.pad(0.6));

    if (!opt.legendEl) {
      const legend = L.control({ position: 'bottomright' });
      legend.onAdd = () => { const d = L.DomUtil.create('div', 'map-legend'); d.id = elId + 'Leg'; return d; };
      legend.addTo(map);
    }
    const labels = [];
    if (opt.labels) Object.entries(byName).forEach(([n, ly]) => {
      const t = L.tooltip({ permanent: true, direction: 'center', className: 'map-lbl' }, ly).setContent(nameShort(n));
      ly.bindTooltip(t); labels.push(ly);
    });

    let info = {};
    function restyle(ly) {
      const n = ly.feature.properties.nama, a = info[n], s = Eco.state;
      const active = (s.kab === 'all' || s.kab === n) && Eco.matchQ({ kabkota: n }, s.q);
      ly.setStyle({
        fillColor: a ? Eco.CLASSES[Eco.classOf(a.tahunan)].c : Eco.NODATA,
        fillOpacity: active ? .88 : .25, weight: s.kab === n ? 3 : 1, color: s.kab === n ? '#064E3B' : '#fff', dashArray: a ? null : '4 3'
      });
    }
    function update() {
      /* Data peta mengikuti filter tahun; filter kab/pencarian hanya menyorot wilayah (wilayah lain tidak dianggap "tidak ada data"). */
      const s = Eco.state;
      const rows = Eco.rows.filter(r => s.tahun === 'all' || r.tahun === +s.tahun);
      info = {}; Eco.regionAgg(rows).forEach(a => (info[a.nama] = a));
      const tot = Object.values(info).reduce((a, b) => a + b.tahunan, 0);
      Object.entries(byName).forEach(([n, ly]) => {
        restyle(ly);
        const a = info[n];
        const body = a
          ? `<div class="pop"><b>${esc(n)}</b><div class="pop-sub">${s.tahun === 'all' ? 'Rata-rata ' + a.years[0] + '–' + a.years[a.years.length - 1] + ' (' + a.n + ' tahun data)' : 'Tahun ' + s.tahun}</div><table><tr><td>Timbulan harian</td><td><b>${fmt(a.harian, 2)}</b> ton/hari</td></tr><tr><td>Timbulan tahunan</td><td><b>${fmt(a.tahunan)}</b> ton/tahun</td></tr><tr><td>Kontribusi</td><td>${fmt(a.tahunan / tot * 100, 1)}% dari total terdata</td></tr><tr><td>Kategori</td><td>${classBadge(a.tahunan)}</td></tr></table></div>`
          : `<div class="pop"><b>${esc(n)}</b><div class="pop-sub">${s.tahun === 'all' ? 'Seluruh tahun' : 'Tahun ' + s.tahun}</div><span class="text-muted">Data tidak tersedia</span></div>`;
        ly.unbindPopup().bindPopup(body);
        if (!opt.labels) { ly.unbindTooltip().bindTooltip(`<b>${esc(nameShort(n))}</b><br>${a ? fmt(a.tahunan) + ' ton/tahun' : 'Data tidak tersedia'}`, { sticky: true }); }
        else { const t = ly.getTooltip(); t && t.setContent(`<span>${esc(nameShort(n))}</span>`); }
      });
      const rt = rangeText();
      const legEl = opt.legendEl ? document.getElementById(opt.legendEl) : $('#' + elId + 'Leg');
      legEl.innerHTML = (opt.legendEl ? '' : '<b>Timbulan (ton/tahun)</b>') + Eco.CLASSES.map((c, i) => `<div><i style="background:${c.c}"></i>${c.k} <small>${rt[i]}</small></div>`).join('') + `<div><i style="background:${Eco.NODATA}"></i>Data tidak tersedia</div>`;
      if (s.kab !== 'all' && byName[s.kab]) map.fitBounds(byName[s.kab].getBounds(), { padding: [20, 20], maxZoom: 10 });
      else if (opt.refit !== false) map.fitBounds(bounds, { padding: [6, 6] });
    }
    setTimeout(() => map.invalidateSize(), 150);
    window.addEventListener('resize', () => map.invalidateSize());
    return { map, update, byName, layer };
  };

  /* =====================================================================
     DASHBOARD
     ===================================================================== */
  const dash = {
    async init() {
      this.mv = await Eco.mapView('miniMap', { wheel: false, legendEl: 'miniLeg' });
    },
    cards() {
      const s = Eco.state, rows = Eco.filtered(), agg = Eco.regionAgg(rows), n = agg.length;
      const none = !rows.length;
      const sumT = rows.reduce((a, r) => a + r.tahunan, 0), avgH = none ? 0 : rows.reduce((a, r) => a + r.harian, 0) / rows.length;
      const hi = agg[0], y0 = Eco.years[0], y1 = Eco.years[Eco.years.length - 1];
      const C = [
        { c: 'g', i: 'bi-trash3-fill', t: s.tahun === 'all' ? 'Total Timbulan Sampah (akumulasi)' : 'Total Timbulan Sampah Tahunan', v: none ? '—' : fmt(sumT), u: 'ton/tahun', d: none ? 'Data tidak tersedia' : s.tahun === 'all' ? `Akumulasi ${rows.length} baris data ${y0}–${y1}` : `${n} dari ${Eco.regions.length} kab/kota terdata` },
        { c: 'am', i: 'bi-calendar-day-fill', t: 'Rata-rata Timbulan Harian', v: none ? '—' : fmt(avgH, 1), u: 'ton/hari', d: none ? 'Data tidak tersedia' : 'Rata-rata per kab/kota terdata' },
        { c: 'bl', i: 'bi-geo-alt-fill', t: 'Kabupaten/Kota Terdata', v: String(n), u: 'wilayah', d: s.tahun !== 'all' && s.kab === 'all' && !s.q ? `${Eco.regions.length - n} dari ${Eco.regions.length} belum ada data` : `dari ${Eco.regions.length} kab/kota di Lampung` },
        { c: 'dg', i: 'bi-clock-history', t: 'Tahun Pengamatan', v: `${y0}–${y1}`, u: '', sm: true, d: `${Eco.years.length} tahun · ${Eco.rows.length} baris data` },
        { c: 'rd', i: 'bi-graph-up-arrow', t: 'Wilayah Timbulan Tertinggi', v: hi ? nameShort(hi.nama) : '—', u: '', d: hi ? `${fmt(hi.tahunan)} ton/tahun${s.tahun === 'all' ? ' (rata-rata)' : ''}` : 'Data tidak tersedia', sm: true }
      ];
      $('#cards').innerHTML = C.map(c => `<div class="stat-card"><div class="sc-i ${c.c}"><i class="bi ${c.i}"></i></div><div class="sc-b"><div class="sc-t">${c.t}</div><div class="sc-v${c.sm ? ' sm' : ''}">${esc(c.v)}${c.u ? '<small>' + c.u + '</small>' : ''}</div><div class="sc-d">${esc(c.d)}</div></div></div>`).join('');
    },
    trend() {
      const s = Eco.state, rows = Eco.filtered({ ignoreYear: true }), ya = Eco.yearAgg(rows), by = {};
      ya.forEach(y => (by[y.tahun] = y));
      const labels = Eco.years;
      const tot = labels.map(y => (by[y] ? by[y].sumT : null)), avg = labels.map(y => (by[y] ? by[y].avgT : null));
      const sel = s.tahun === 'all' ? -1 : labels.indexOf(+s.tahun);
      Eco.chart('cTrend', {
        type: 'line',
        data: { labels, datasets: [
          { label: 'Total terlapor (ton/tahun)', data: tot, borderColor: '#059669', backgroundColor: 'rgba(5,150,105,.12)', fill: true, tension: .3, pointRadius: labels.map((_, i) => (i === sel ? 7 : 4)), pointBackgroundColor: labels.map((_, i) => (i === sel ? '#064E3B' : '#059669')), spanGaps: false },
          { label: 'Rata-rata per kab/kota terdata (ton/tahun)', data: avg, borderColor: '#2563EB', borderDash: [6, 4], tension: .3, pointRadius: labels.map((_, i) => (i === sel ? 7 : 3)), pointBackgroundColor: '#2563EB', spanGaps: false }
        ] },
        options: {
          interaction: { mode: 'index', intersect: false },
          scales: { y: { beginAtZero: true, title: { display: true, text: 'Timbulan sampah (ton/tahun)' }, ticks: { callback: v => Eco.axis(v) } }, x: { title: { display: true, text: 'Tahun' } } },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y === null ? 'Data tidak tersedia' : fmt(c.parsed.y) + ' ton'}`, afterBody: it => { const y = by[labels[it[0].dataIndex]]; return y ? `Cakupan: ${y.n} kab/kota terdata` : 'Data tidak tersedia pada tahun ini'; } } } }
        }
      });
      $('#trendNote').innerHTML = '<i class="bi bi-exclamation-circle"></i> <b>Catatan cakupan:</b> jumlah kab/kota terdata berbeda tiap tahun (' + Eco.coverageText() + '). Perubahan total agregat dipengaruhi cakupan pelaporan, bukan hanya perubahan timbulan.';
    },
    bar() {
      const agg = Eco.regionAgg(Eco.filtered()), box = $('#barWrap'), n = agg.length;
      if (!n) { Eco.charts.cBar && Eco.charts.cBar.destroy(); delete Eco.charts.cBar; return empty(box); }
      if (!$('#cBar')) box.innerHTML = '<canvas id="cBar"></canvas>';
      box.style.height = Math.max(240, n * 27 + 56) + 'px';
      const tot = agg.reduce((a, b) => a + b.tahunan, 0);
      Eco.chart('cBar', {
        type: 'bar',
        data: { labels: agg.map(a => nameShort(a.nama)), datasets: [{ label: 'Timbulan tahunan (ton/tahun)', data: agg.map(a => a.tahunan), backgroundColor: agg.map((_, i) => (i === 0 ? '#064E3B' : '#059669')), borderRadius: 5, maxBarThickness: 20 }] },
        options: { indexAxis: 'y', scales: { x: { title: { display: true, text: 'ton/tahun (' + basisLabel() + ')' }, ticks: { callback: v => Eco.axis(v) } }, y: { grid: { display: false } } },
          plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.x)} ton/tahun`, afterLabel: c => `${fmt(agg[c.dataIndex].tahunan / tot * 100, 1)}% dari total · ${Eco.CLASSES[Eco.classOf(agg[c.dataIndex].tahunan)].k}${c.dataIndex === 0 ? ' · TERTINGGI' : ''}` } } } }
      });
    },
    donut() {
      const agg = Eco.regionAgg(Eco.filtered()), n = agg.length, tot = agg.reduce((a, b) => a + b.tahunan, 0);
      const box = $('#donutBox');
      if (!n) { Eco.charts.cDonut && Eco.charts.cDonut.destroy(); delete Eco.charts.cDonut; return empty(box); }
      if (!$('#cDonut')) box.innerHTML = '<div class="donut-c"><canvas id="cDonut"></canvas></div><ul class="donut-l" id="donutL"></ul>';
      const col = agg.map((_, i) => Eco.PALETTE[i % Eco.PALETTE.length]);
      const center = { id: 'ctr', afterDraw(ch) { const { ctx, chartArea: a } = ch, x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = '#0F172A'; ctx.font = "800 17px 'Plus Jakarta Sans',sans-serif"; ctx.fillText(Eco.compact(tot), x, y + 2); ctx.fillStyle = '#64748B'; ctx.font = "500 11px 'Plus Jakarta Sans',sans-serif"; ctx.fillText('ton/tahun', x, y + 18); ctx.restore(); } };
      Eco.chart('cDonut', {
        type: 'doughnut', plugins: [center],
        data: { labels: agg.map(a => nameShort(a.nama)), datasets: [{ data: agg.map(a => a.tahunan), backgroundColor: col, borderWidth: 2, borderColor: '#fff' }] },
        options: { cutout: '64%', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.parsed)} ton/tahun (${fmt(c.parsed / tot * 100, 1)}%)` } } } }
      });
      $('#donutL').innerHTML = agg.map((a, i) => `<li><i style="background:${col[i]}"></i><span>${esc(nameShort(a.nama))}</span><b>${fmt(a.tahunan / tot * 100, 1)}%</b><em>${Eco.compact(a.tahunan)}</em></li>`).join('');
    },
    rank() {
      const agg = Eco.regionAgg(Eco.filtered()), n = agg.length, box = $('#rankBox');
      if (!n) { ['cTop', 'cBot'].forEach(k => { Eco.charts[k] && Eco.charts[k].destroy(); delete Eco.charts[k]; }); return empty(box); }
      if (!$('#cTop')) box.innerHTML = '<h4 class="mini-h"><i class="bi bi-arrow-up-circle-fill text-danger"></i> 5 Tertinggi</h4><div class="rk"><canvas id="cTop"></canvas></div><h4 class="mini-h mt-2"><i class="bi bi-arrow-down-circle-fill text-success"></i> 5 Terendah</h4><div class="rk" id="botWrap"><canvas id="cBot"></canvas></div>';
      const top = agg.slice(0, 5), bot = agg.slice(Math.max(5, n - 5)).reverse();
      const mk = (id, list, color) => Eco.chart(id, { type: 'bar', data: { labels: list.map(a => nameShort(a.nama)), datasets: [{ data: list.map(a => a.tahunan), backgroundColor: color, borderRadius: 4, maxBarThickness: 16 }] },
        options: { indexAxis: 'y', scales: { x: { ticks: { callback: v => Eco.axis(v) }, title: { display: true, text: 'ton/tahun' } }, y: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${fmt(c.parsed.x)} ton/tahun` } } } } });
      mk('cTop', top, '#EF4444');
      if (bot.length) mk('cBot', bot, '#059669');
      else { Eco.charts.cBot && Eco.charts.cBot.destroy(); delete Eco.charts.cBot; $('#botWrap').innerHTML = '<div class="empty small">Hanya ' + n + ' wilayah terdata, seluruhnya sudah tampil pada daftar tertinggi.</div>'; }
      if (bot.length && !$('#cBot')) { $('#botWrap').innerHTML = '<canvas id="cBot"></canvas>'; mk('cBot', bot, '#059669'); }
    },
    dh() {
      const agg = Eco.regionAgg(Eco.filtered()).sort((a, b) => b.harian - a.harian), box = $('#dhBox');
      if (!agg.length) { Eco.charts.cDH && Eco.charts.cDH.destroy(); delete Eco.charts.cDH; return empty(box); }
      if (!$('#cDH')) box.innerHTML = '<div class="dh-c"><canvas id="cDH"></canvas></div>';
      Eco.chart('cDH', {
        data: { labels: agg.map(a => nameShort(a.nama)), datasets: [
          { type: 'bar', label: 'Timbulan harian (ton/hari) – sumbu kiri', data: agg.map(a => a.harian), backgroundColor: '#F59E0B', borderRadius: 4, yAxisID: 'y', order: 2 },
          { type: 'line', label: 'Timbulan tahunan (ton/tahun) – sumbu kanan', data: agg.map(a => a.tahunan), borderColor: '#2563EB', backgroundColor: '#2563EB', pointRadius: 3, tension: .25, yAxisID: 'y1', order: 1 }
        ] },
        options: { interaction: { mode: 'index', intersect: false }, scales: {
          y: { position: 'left', beginAtZero: true, title: { display: true, text: 'ton/hari', color: '#B45309' }, ticks: { color: '#B45309' } },
          y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'ton/tahun', color: '#1D4ED8' }, ticks: { color: '#1D4ED8', callback: v => Eco.axis(v) } },
          x: { ticks: { maxRotation: 60, minRotation: 40, font: { size: 10 } } } },
          plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label.split(' – ')[0]}: ${fmt(c.parsed.y, c.datasetIndex ? 0 : 2)}` } } } }
      });
      const r = agg.map(a => a.tahunan / a.harian);
      $('#dhNote').innerHTML = `<i class="bi bi-info-circle"></i> Dua indikator berbeda satuan, maka memakai dua sumbu (kiri: ton/hari, kanan: ton/tahun). Pada dataset, tahunan ÷ harian ≈ <b>${fmt(Math.min(...r), 2)}–${fmt(Math.max(...r), 2)}</b> (≈ 365 hari), sehingga keduanya konsisten.`;
    },
    ins() {
      const I = insights(), lim = 2;
      $('#insBox').innerHTML =
        `<div class="ins-grp"><h4><i class="bi bi-info-circle-fill"></i> Informasi</h4>${I.info.slice(0, lim).map(x => insItem(x, 'ins-info')).join('')}</div>` +
        `<div class="ins-grp"><h4><i class="bi bi-exclamation-triangle-fill"></i> Perhatian</h4>${(I.warn.slice(0, lim).map(x => insItem(x, 'ins-warn')).join('')) || '<div class="ins ins-warn"><span>Tidak ada catatan perhatian pada filter ini.</span></div>'}</div>` +
        `<div class="ins-grp"><h4><i class="bi bi-lightbulb-fill"></i> Rekomendasi</h4>${(I.rec.slice(0, lim).map(x => insItem(x, 'ins-rec')).join('')) || '<div class="ins ins-rec"><span>Belum ada rekomendasi untuk filter ini.</span></div>'}</div>`;
    },
    render() {
      this.cards(); this.trend(); this.bar(); this.donut(); this.rank(); this.dh(); this.ins();
      this.mv && this.mv.update();
    }
  };

  /* =====================================================================
     DATA / TABEL
     ===================================================================== */
  const tbl = {
    sort: { k: 'tahun', dir: -1 }, pg: 1, per: 15, list: [],
    init() {
      const self = this;
      $$('#tbl th.sortable').forEach(th => th.addEventListener('click', () => {
        const k = th.dataset.k;
        self.sort = self.sort.k === k ? { k, dir: -self.sort.dir } : { k, dir: (k === 'harian' || k === 'tahunan' || k === 'tahun') ? -1 : 1 };
        self.pg = 1; self.render();
      }));
      $('#tPer').addEventListener('change', e => { self.per = +e.target.value; self.pg = 1; self.render(); });
      const ts = $('#tSearch'); let dt;
      ts.addEventListener('input', () => { clearTimeout(dt); dt = setTimeout(() => Eco.set({ q: ts.value.trim().slice(0, 60) }), 250); });
      $('#btnCsv').addEventListener('click', () => self.exportCsv());
      $('#btnXlsx').addEventListener('click', () => self.exportXlsx());
      $('#btnPdf').addEventListener('click', () => self.exportPdf());
      const ii = $('#importInfo'); if (ii && Eco.meta.import_terakhir) ii.textContent = 'Import terakhir: ' + Eco.meta.import_terakhir.imported_at + ' (' + Eco.meta.import_terakhir.source + ')';
    },
    sorted() {
      const { k, dir } = this.sort, rows = Eco.filtered();
      const cmp = (a, b) => (typeof a[k] === 'number' ? a[k] - b[k] : String(a[k]).localeCompare(String(b[k]), 'id'));
      return rows.sort((a, b) => cmp(a, b) * dir || a.tahun - b.tahun || a.kabkota.localeCompare(b.kabkota, 'id'));
    },
    render() {
      const list = (this.list = this.sorted()), total = list.length, pages = Math.max(1, Math.ceil(total / this.per));
      this.pg = Math.min(this.pg, pages);
      const st = (this.pg - 1) * this.per, cur = list.slice(st, st + this.per);
      $$('#tbl th.sortable').forEach(th => { th.classList.remove('asc', 'desc'); if (th.dataset.k === this.sort.k) th.classList.add(this.sort.dir === 1 ? 'asc' : 'desc'); });
      const s = Eco.state;
      $('#tblBody').innerHTML = cur.length ? cur.map((r, i) => `<tr><td>${st + i + 1}</td><td>${r.tahun}</td><td>${esc(r.periode)}</td><td>${esc(r.provinsi)}</td><td>${esc(r.kabkota)}</td><td class="text-end">${fmt(r.harian, 2)}</td><td class="text-end">${fmt(r.tahunan, 2)}</td></tr>`).join('')
        : `<tr><td colspan="7" class="text-center py-5 text-muted"><i class="bi bi-inbox fs-3 d-block"></i>Data tidak tersedia untuk filter ini${s.kab !== 'all' && s.tahun !== 'all' ? ` (${esc(s.kab)} belum memiliki data tahun ${s.tahun})` : ''}.</td></tr>`;
      $('#tblInfo').textContent = total ? `Menampilkan ${st + 1}–${st + cur.length} dari ${total} data` : '0 data';
      const pg = this.pg, items = [];
      const add = (p, l, dis, act) => items.push(`<li class="page-item ${dis ? 'disabled' : ''} ${act ? 'active' : ''}"><a class="page-link" href="#" data-p="${p}">${l}</a></li>`);
      add(pg - 1, '&laquo;', pg <= 1);
      const win = new Set([1, pages, pg - 1, pg, pg + 1]);
      let last = 0;
      [...win].filter(p => p >= 1 && p <= pages).sort((a, b) => a - b).forEach(p => { if (p - last > 1) items.push('<li class="page-item disabled"><span class="page-link">…</span></li>'); add(p, p, false, p === pg); last = p; });
      add(pg + 1, '&raquo;', pg >= pages);
      const pager = $('#tblPager'); pager.innerHTML = items.join('');
      $$('a', pager).forEach(a => a.addEventListener('click', e => { e.preventDefault(); const p = +a.dataset.p; if (p >= 1 && p <= pages) { this.pg = p; this.render(); } }));
      /* wilayah tanpa data */
      const mb = $('#missBox');
      if (s.tahun !== 'all') {
        const miss = Eco.missing(s.tahun);
        mb.hidden = !miss.length;
        mb.innerHTML = miss.length ? `<b><i class="bi bi-exclamation-circle text-warning"></i> Wilayah tanpa data pada tahun ${s.tahun}</b><p class="small text-muted mb-2 mt-1">Wilayah berikut tidak memiliki data pada SIPSN untuk tahun ini. Ditampilkan sebagai <b>data tidak tersedia</b>, bukan nol.</p><div class="chips">${miss.map(m => `<span class="chip">${esc(m)} <em>Data tidak tersedia</em></span>`).join('')}</div>` : '';
      } else mb.hidden = true;
    },
    rowsForExport() { return this.list.map((r, i) => [i + 1, r.tahun, r.periode, r.provinsi, r.kabkota, r.harian, r.tahunan]); },
    head: ['No', 'Tahun', 'Periode', 'Provinsi', 'Kabupaten/Kota', 'Timbulan Harian (ton/hari)', 'Timbulan Tahunan (ton/tahun)'],
    filterText() { const s = Eco.state; return `Tahun: ${s.tahun === 'all' ? 'Semua' : s.tahun} | Wilayah: ${s.kab === 'all' ? 'Semua' : s.kab}${s.q ? ' | Pencarian: ' + s.q : ''}`; },
    save(blob, name) { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); },
    exportCsv() {
      const q = v => { v = String(v); return /[",\n;]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v; };
      const csv = '\uFEFF' + [this.head, ...this.rowsForExport()].map(r => r.map(q).join(',')).join('\r\n');
      this.save(new Blob([csv], { type: 'text/csv;charset=utf-8' }), 'timbulan_sampah_sipsn.csv');
    },
    exportXlsx() {
      if (!window.XLSX) return alert('Pustaka Excel belum termuat. Periksa koneksi internet lalu coba lagi.');
      const ws = XLSX.utils.aoa_to_sheet([this.head, ...this.rowsForExport()]);
      ws['!cols'] = [{ wch: 6 }, { wch: 8 }, { wch: 9 }, { wch: 12 }, { wch: 26 }, { wch: 26 }, { wch: 28 }];
      const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Timbulan Sampah');
      XLSX.writeFile(wb, 'timbulan_sampah_sipsn.xlsx');
    },
    exportPdf() {
      if (!window.jspdf || !window.jspdf.jsPDF) return alert('Pustaka PDF belum termuat. Periksa koneksi internet lalu coba lagi.');
      const doc = new jspdf.jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      doc.setFontSize(15); doc.setTextColor(6, 78, 59); doc.text('EcoTrack Lampung – Data Timbulan Sampah', 40, 40);
      doc.setFontSize(9); doc.setTextColor(100, 116, 139);
      doc.text('Sumber: SIPSN KLHK, periode 2021–2025 | ' + this.filterText() + ' | ' + this.list.length + ' baris', 40, 56);
      doc.autoTable({ head: [this.head], body: this.rowsForExport().map(r => [r[0], r[1], r[2], r[3], r[4], fmt(r[5], 2), fmt(r[6], 2)]), startY: 68, styles: { fontSize: 8.5, cellPadding: 4 }, headStyles: { fillColor: [5, 150, 105] }, alternateRowStyles: { fillColor: [248, 250, 252] }, columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' } } });
      doc.save('timbulan_sampah_sipsn.pdf');
    }
  };

  /* =====================================================================
     PETA (halaman penuh) + layer laporan masyarakat
     ===================================================================== */
  const norm = n => String(n || '').replace(/^Kab\. |^Kota /, '').trim().toLowerCase();
  const petaPg = {
    async init() {
      this.mv = await Eco.mapView('bigMap', { wheel: true, labels: true });
      const reps = window.ECO_REPORTS || [];
      this.rep = L.layerGroup();
      const col = s => (s === 'Selesai' ? '#059669' : s === 'Menunggu' ? '#EF4444' : s === 'Ditolak' ? '#64748B' : '#F59E0B');
      this.markers = reps.map(r => ({ r, m: L.marker([+r.lat, +r.lng], { icon: dot(col(r.status)) }).bindPopup(`<div class="pop"><b>${esc(r.title)}</b><div class="pop-sub">${esc(r.cat)} · ${esc(r.kabupaten)}, ${esc(r.kecamatan || '')}</div>${esc(String(r.created_at).slice(0, 10))}<br>Status: <b>${esc(r.status)}</b>${r.is_demo == 1 ? '<br><small class="text-muted">Data simulasi</small>' : ''}</div>`) }));
      $('#layerRep').addEventListener('change', () => this.reports());
      $('#repStatus').addEventListener('change', () => this.reports());
      this.mv && $('#layerRep').checked && this.rep.addTo(this.mv.map);
    },
    reports() {
      if (!this.mv) return;
      const on = $('#layerRep').checked, st = $('#repStatus').value, s = Eco.state;
      this.rep.clearLayers();
      const vis = this.markers.filter(x => (st === '' || x.r.status === st) && (s.kab === 'all' || norm(x.r.kabupaten) === norm(s.kab)) && (!s.q || norm(x.r.kabupaten).includes(s.q.toLowerCase().trim())));
      vis.forEach(x => this.rep.addLayer(x.m));
      on ? this.rep.addTo(this.mv.map) : this.mv.map.removeLayer(this.rep);
      $('#repCount').textContent = vis.length + ' laporan' + (on ? '' : ' (layer nonaktif)');
      $('#repList').innerHTML = vis.length ? vis.slice(0, 30).map(x => `<div class="rep-i"><b>${esc(x.r.title)}</b><small>${esc(x.r.cat)} · ${esc(x.r.kabupaten)} · ${esc(String(x.r.created_at).slice(0, 10))}</small><span class="badge" style="background:${x.r.status === 'Selesai' ? '#059669' : x.r.status === 'Menunggu' ? '#EF4444' : x.r.status === 'Ditolak' ? '#64748B' : '#F59E0B'}">${esc(x.r.status)}</span>${x.r.is_demo == 1 ? ' <small class="text-muted">simulasi</small>' : ''}</div>`).join('') : '<div class="empty small">Tidak ada laporan yang cocok.</div>';
    },
    side() {
      const s = Eco.state, rows = Eco.rows.filter(r => s.tahun === 'all' || r.tahun === +s.tahun), agg = Eco.regionAgg(rows), have = new Set(agg.map(a => a.nama));
      const miss = Eco.regionNames().filter(n => !have.has(n));
      $('#regList').innerHTML = agg.map((a, i) => `<li data-n="${esc(a.nama)}"><span class="rk-n">${i + 1}</span><i style="background:${Eco.CLASSES[Eco.classOf(a.tahunan)].c}"></i><span class="rk-t">${esc(nameShort(a.nama))}</span><b>${fmt(a.tahunan)}</b></li>`).join('') +
        miss.map(n => `<li class="nd" data-n="${esc(n)}"><span class="rk-n">–</span><i style="background:${Eco.NODATA}"></i><span class="rk-t">${esc(nameShort(n))}</span><em>Data tidak tersedia</em></li>`).join('');
      $$('#regList li').forEach(li => li.addEventListener('click', () => { const ly = this.mv && this.mv.byName[li.dataset.n]; if (ly) { this.mv.map.fitBounds(ly.getBounds(), { maxZoom: 10, padding: [20, 20] }); ly.openPopup(); } }));
      $('#mapBasis').textContent = 'Basis: ' + (s.tahun === 'all' ? 'rata-rata tahunan 2021–2025 (tahun yang tersedia)' : 'tahun ' + s.tahun) + ' · ' + agg.length + ' dari ' + Eco.regions.length + ' kab/kota';
      const rt = rangeText();
      $('#classBox').innerHTML = Eco.CLASSES.map((c, i) => `<div><i style="background:${c.c}"></i><b>${c.k}</b><small>${rt[i]} ton/tahun</small></div>`).join('') + `<div><i style="background:${Eco.NODATA}"></i><b>Data tidak tersedia</b><small>tidak dianggap nol</small></div>`;
    },
    render() { this.mv && this.mv.update(); this.side(); this.reports && this.markers && this.reports(); }
  };

  /* =====================================================================
     ANALISIS DATA
     ===================================================================== */
  const analisis = {
    init() {},
    render() {
      const I = insights();
      const col = (t, ic, cls, arr, emptyMsg) => `<div class="col-lg-4"><div class="ins-grp"><h4><i class="bi ${ic}"></i> ${t}</h4>${arr.length ? arr.map(x => insItem(x, cls)).join('') : `<div class="ins ${cls}"><span>${emptyMsg}</span></div>`}</div></div>`;
      $('#insFull').innerHTML = col('Informasi', 'bi-info-circle-fill', 'ins-info', I.info, 'Tidak ada informasi.') + col('Perhatian', 'bi-exclamation-triangle-fill', 'ins-warn', I.warn, 'Tidak ada catatan perhatian pada filter ini.') + col('Rekomendasi', 'bi-lightbulb-fill', 'ins-rec', I.rec, 'Belum ada rekomendasi untuk filter ini.');
      /* perbandingan antarwilayah */
      const agg = Eco.regionAgg(Eco.filtered()), tot = agg.reduce((a, b) => a + b.tahunan, 0), avg = agg.length ? tot / agg.length : 0;
      $('#cmpBasis').textContent = 'Basis: ' + basisLabel();
      $('#cmpBody').innerHTML = agg.length ? agg.map((a, i) => `<tr><td>${i + 1}</td><td>${esc(a.nama)}</td><td class="text-end">${fmt(a.harian, 2)}</td><td class="text-end">${fmt(a.tahunan)}</td><td class="text-end">${fmt(a.tahunan / tot * 100, 1)}%</td><td class="text-end">${fmt(a.tahunan / avg, 2)}×</td><td>${classBadge(a.tahunan)}</td></tr>`).join('') : '<tr><td colspan="7" class="text-center text-muted py-4">Data tidak tersedia untuk filter ini</td></tr>';
      /* tren per wilayah */
      const base = Eco.filtered({ ignoreYear: true });
      const names = Eco.state.kab !== 'all' ? [Eco.state.kab] : Eco.regionAgg(base).slice(0, 6).map(a => a.nama);
      const labels = Eco.years;
      const box = $('#regTrendBox');
      if (!names.length) { Eco.charts.cReg && Eco.charts.cReg.destroy(); delete Eco.charts.cReg; empty(box); }
      else {
        if (!$('#cReg')) box.innerHTML = '<canvas id="cReg"></canvas>';
        Eco.chart('cReg', { type: 'line', data: { labels, datasets: names.map((n, i) => ({ label: nameShort(n), data: labels.map(y => (Eco.key[n + '|' + y] ? Eco.key[n + '|' + y].tahunan : null)), borderColor: Eco.PALETTE[i % Eco.PALETTE.length], backgroundColor: Eco.PALETTE[i % Eco.PALETTE.length], tension: .25, spanGaps: false, pointRadius: 4 })) },
          options: { interaction: { mode: 'nearest', intersect: false }, scales: { y: { beginAtZero: true, title: { display: true, text: 'ton/tahun' }, ticks: { callback: v => Eco.axis(v) } }, x: { title: { display: true, text: 'Tahun' } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.parsed.y === null ? 'Data tidak tersedia' : fmt(c.parsed.y) + ' ton/tahun'}` } } } } });
      }
      $('#regTrendNote').textContent = 'Garis terputus berarti data tidak tersedia pada tahun tersebut (bukan nol). ' + (Eco.state.kab === 'all' ? 'Menampilkan 6 wilayah dengan timbulan terbesar.' : '');
      /* perubahan nilai tiap wilayah antar tahun */
      const rn = [...new Set(base.map(r => r.kabkota))].sort((a, b) => a.localeCompare(b, 'id'));
      $('#chgHead').innerHTML = '<th>Kabupaten/Kota</th>' + labels.map(y => `<th class="text-end">${y}</th>`).join('');
      $('#chgBody').innerHTML = rn.length ? rn.map(n => `<tr><td>${esc(n)}</td>${labels.map(y => {
        const r = Eco.key[n + '|' + y], p = Eco.key[n + '|' + (y - 1)];
        if (!r) return '<td class="text-end nd">Tidak tersedia</td>';
        const ch = p ? (r.tahunan / p.tahunan - 1) * 100 : null;
        return `<td class="text-end">${fmt(r.tahunan)}${ch === null ? '<small class="d-block text-muted">—</small>' : `<small class="d-block ${ch > 0.005 ? 'up' : ch < -0.005 ? 'dn' : 'text-muted'}">${ch > 0.005 ? '▲' : ch < -0.005 ? '▼' : '='} ${Eco.fmt(Math.abs(ch), 1)}%</small>`}</td>`;
      }).join('')}</tr>`).join('') : `<tr><td colspan="${labels.length + 1}" class="text-center text-muted py-4">Data tidak tersedia untuk filter ini</td></tr>`;
    }
  };

  /* =====================================================================
     STATISTIK TAHUNAN
     ===================================================================== */
  const stat = {
    init() {},
    render() {
      const s = Eco.state, base = Eco.filtered({ ignoreYear: true }), ya = Eco.yearAgg(base), by = {};
      ya.forEach(y => (by[y.tahun] = y));
      $('#yrBody').innerHTML = Eco.years.map(y => {
        const o = by[y], sel = s.tahun !== 'all' && +s.tahun === y;
        return o ? `<tr class="${sel ? 'sel' : ''}"><td><b>${y}</b></td><td class="text-end">${o.n}<small class="text-muted"> / ${Eco.regions.length}</small></td><td class="text-end">${fmt(o.sumT)}</td><td class="text-end">${fmt(o.sumH, 1)}</td><td class="text-end">${fmt(o.avgT)}</td><td class="text-end">${fmt(o.medT)}</td><td>${esc(nameShort(o.max.kabkota))} <small class="text-muted">${fmt(o.max.tahunan)}</small></td><td>${esc(nameShort(o.min.kabkota))} <small class="text-muted">${fmt(o.min.tahunan)}</small></td></tr>`
          : `<tr class="${sel ? 'sel' : ''}"><td><b>${y}</b></td><td colspan="7" class="nd">Data tidak tersedia untuk filter ini</td></tr>`;
      }).join('');
      const labels = Eco.years;
      Eco.chart('cTot', { data: { labels, datasets: [
        { type: 'bar', label: 'Total timbulan terlapor (ton/tahun) – sumbu kiri', data: labels.map(y => (by[y] ? by[y].sumT : null)), backgroundColor: labels.map(y => (s.tahun !== 'all' && +s.tahun === y ? '#064E3B' : '#059669')), borderRadius: 6, yAxisID: 'y', order: 2 },
        { type: 'line', label: 'Jumlah kab/kota terdata – sumbu kanan', data: labels.map(y => (by[y] ? by[y].n : null)), borderColor: '#F59E0B', backgroundColor: '#F59E0B', pointRadius: 5, tension: .2, yAxisID: 'y1', order: 1 }
      ] }, options: { scales: { y: { beginAtZero: true, title: { display: true, text: 'ton/tahun' }, ticks: { callback: v => Eco.axis(v) } }, y1: { position: 'right', beginAtZero: true, grid: { drawOnChartArea: false }, title: { display: true, text: 'jumlah kab/kota' }, ticks: { stepSize: 2 }, suggestedMax: Eco.regions.length }, x: { title: { display: true, text: 'Tahun' } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, usePointStyle: true } }, tooltip: { callbacks: { label: c => ` ${c.dataset.label.split(' – ')[0]}: ${c.parsed.y === null ? 'Data tidak tersedia' : fmt(c.parsed.y)}` } } } } });
      const lfl = Eco.likeForLike(base);
      const box = $('#lflBox');
      if (!lfl.length) { Eco.charts.cLfl && Eco.charts.cLfl.destroy(); delete Eco.charts.cLfl; empty(box, 'Belum ada pasangan tahun berurutan dengan wilayah sebanding untuk filter ini'); }
      else {
        if (!$('#cLfl')) box.innerHTML = '<canvas id="cLfl"></canvas>';
        Eco.chart('cLfl', { type: 'bar', data: { labels: lfl.map(p => p.dari + '→' + p.ke), datasets: [{ label: 'Perubahan (%)', data: lfl.map(p => +p.pct.toFixed(2)), backgroundColor: lfl.map(p => (p.pct >= 0 ? '#F59E0B' : '#059669')), borderRadius: 6 }] }, options: { scales: { y: { title: { display: true, text: 'perubahan total (%)' }, ticks: { callback: v => v + '%' } }, x: { title: { display: true, text: 'Pasangan tahun (hanya wilayah yang ada di kedua tahun)' } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${Eco.pct(c.parsed.y, 2)}`, afterLabel: c => `${lfl[c.dataIndex].n} wilayah sebanding · ${fmt(lfl[c.dataIndex].A)} → ${fmt(lfl[c.dataIndex].B)} ton` } } } } });
      }
      $('#lflBody').innerHTML = lfl.length ? lfl.map(p => `<tr><td>${p.dari}→${p.ke}</td><td class="text-end">${p.n}</td><td class="text-end">${fmt(p.A)}</td><td class="text-end">${fmt(p.B)}</td><td class="text-end ${p.pct > 0 ? 'up' : 'dn'}">${Eco.pct(p.pct, 2)}</td></tr>`).join('') : '<tr><td colspan="5" class="nd text-center">Data tidak tersedia</td></tr>';
      /* heatmap wilayah × tahun */
      const rn = [...new Set(base.map(r => r.kabkota))].sort((a, b) => a.localeCompare(b, 'id'));
      $('#heatHead').innerHTML = '<th>Kabupaten/Kota</th>' + labels.map(y => `<th class="text-end ${s.tahun !== 'all' && +s.tahun === y ? 'sel' : ''}">${y}</th>`).join('');
      $('#heatBody').innerHTML = rn.length ? rn.map(n => `<tr><td>${esc(n)}</td>${labels.map(y => { const r = Eco.key[n + '|' + y]; return r ? `<td class="text-end heat" style="--c:${Eco.CLASSES[Eco.classOf(r.tahunan)].c}">${fmt(r.tahunan)}</td>` : '<td class="text-end nd">Tidak tersedia</td>'; }).join('')}</tr>`).join('') : `<tr><td colspan="${labels.length + 1}" class="nd text-center py-3">Data tidak tersedia untuk filter ini</td></tr>`;
      const rt = rangeText();
      $('#heatLeg').innerHTML = Eco.CLASSES.map((c, i) => `<span><i style="background:${c.c}"></i>${c.k} (${rt[i]})</span>`).join('') + `<span><i style="background:${Eco.NODATA}"></i>Tidak tersedia</span>`;
    }
  };

  const mods = { dash, data: tbl, peta: petaPg, analisis, stat };
  const mod = mods[page];
  if (mod) {
    const wrap = { init: () => mod.init && mod.init(), render: () => mod.render() };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => Eco.start(wrap)); else Eco.start(wrap);
  }
  Eco.insights = insights;
})();
