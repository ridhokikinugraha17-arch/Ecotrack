<?php
/* Analisis Data: insight otomatis, perbandingan antarwilayah, tren per wilayah, perubahan antar tahun. */
require __DIR__.'/_lib/app.php';
shell_head('Analisis Data','analisis',['page'=>'analisis','filters'=>true,'libs'=>['chart'],'h1'=>'Analisis Data Timbulan Sampah','sub'=>'Environmental Data Insights & Recommendations: temuan, perhatian, dan saran pengelolaan yang dihitung otomatis dari data SIPSN dengan memperhatikan perbedaan cakupan wilayah.']);?>
<section class="card-eco p-card mb-3"><div class="card-h"><h3>Environmental Data Insights &amp; Recommendations</h3><span class="tag">dihitung dari data aktual</span></div><div class="row g-3" id="insFull" data-skel></div></section>
<div class="row g-3 mb-3">
 <div class="col-xl-7"><section class="card-eco p-card h-100"><div class="card-h"><h3>Perbandingan Antarwilayah</h3><span class="tag" id="cmpBasis"></span></div><div class="table-responsive"><table class="table eco-table align-middle"><thead><tr><th>#</th><th>Kabupaten/Kota</th><th class="text-end">Harian<small>ton/hari</small></th><th class="text-end">Tahunan<small>ton/tahun</small></th><th class="text-end">Kontribusi</th><th class="text-end">vs rata-rata</th><th>Kategori</th></tr></thead><tbody id="cmpBody"></tbody></table></div></section></div>
 <div class="col-xl-5"><section class="card-eco p-card h-100"><div class="card-h"><h3>Tren per Wilayah</h3></div><div id="regTrendBox" class="chart-h"><canvas id="cReg"></canvas></div><p class="note mb-0" id="regTrendNote"></p></section></div>
</div>
<section class="card-eco p-card mb-3"><div class="card-h"><h3>Perubahan Nilai Tiap Wilayah dari Tahun ke Tahun</h3><span class="tag">ton/tahun &middot; % vs tahun sebelumnya</span></div><div class="table-responsive"><table class="table eco-table align-middle"><thead><tr id="chgHead"></tr></thead><tbody id="chgBody"></tbody></table></div><p class="note mb-0">Persentase hanya dihitung bila data tahun sebelumnya (berurutan) tersedia. “Tidak tersedia” berarti wilayah tidak melapor pada tahun itu dan tidak dianggap nol.</p></section>
<?php shell_foot();
