<?php
/* Peta Persebaran: choropleth timbulan sampah kab/kota (SIPSN) + layer laporan masyarakat (fitur lama dipertahankan). */
require __DIR__.'/_lib/app.php';
$rows=[];$cats=[];try{$rows=q('SELECT r.id,r.title,r.status,r.is_demo,r.created_at,c.name cat,l.kabupaten,l.kecamatan,l.lat,l.lng FROM reports r JOIN locations l ON l.id=r.location_id JOIN report_categories c ON c.id=r.category_id ORDER BY r.id DESC LIMIT 500')->fetchAll();}catch(Throwable $x){}
shell_head('Peta Persebaran','peta',['page'=>'peta','filters'=>true,'libs'=>['leaflet'],'h1'=>'Peta Persebaran Timbulan Sampah','sub'=>'Sebaran timbulan sampah kabupaten/kota Provinsi Lampung berdasarkan data SIPSN. Klik wilayah untuk melihat detail.']);?>
<div class="map-grid">
 <section class="card-eco p-card"><div class="card-h"><h3>Peta Timbulan Sampah</h3><span class="tag" id="mapBasis"></span></div><div id="bigMap" class="big-map" data-skel></div>
  <div class="class-box" id="classBox"></div>
  <p class="note mb-0">Klasifikasi: kuartil (25/50/75%) dari seluruh nilai timbulan tahunan SIPSN 2021&ndash;2025, sehingga kategori konsisten antar tahun. Wilayah tanpa data ditampilkan abu-abu (bukan nol). Batas wilayah: Kemendagri; peta dasar &copy; OpenStreetMap.</p></section>
 <aside class="map-side">
  <section class="card-eco p-card"><div class="card-h"><h3>Peringkat Wilayah</h3><span class="tag">ton/tahun</span></div><ul class="reg-list" id="regList"></ul></section>
  <section class="card-eco p-card"><div class="card-h"><h3>Laporan Masyarakat</h3><span class="tag" id="repCount"></span></div>
   <div class="d-flex gap-2 align-items-center flex-wrap mb-2"><div class="form-check form-switch m-0"><input class="form-check-input" type="checkbox" id="layerRep" checked><label class="form-check-label small" for="layerRep">Tampilkan di peta</label></div><select id="repStatus" class="form-select form-select-sm w-auto ms-auto" aria-label="Status laporan"><option value="">Semua status</option><?php foreach(STATUS as $s):?><option><?=e($s)?></option><?php endforeach?></select></div>
   <div class="rep-list" id="repList"></div><a class="btn btn-eco btn-sm mt-2" href="/lapor"><i class="bi bi-megaphone"></i> Laporkan permasalahan</a></section>
 </aside>
</div>
<?php shell_foot('window.ECO_REPORTS='.json_encode($rows,JSON_HEX_TAG|JSON_HEX_AMP|JSON_UNESCAPED_UNICODE).';');
