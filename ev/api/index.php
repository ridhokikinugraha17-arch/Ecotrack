<?php
/* Dashboard Lingkungan Provinsi Lampung (beranda). Seluruh angka & grafik dihitung di browser dari /sipsn?format=json. */
require __DIR__.'/_lib/app.php';
$rep=null;try{$rep=q("SELECT COUNT(*) a,SUM(status='Selesai') b,SUM(status IN('Diverifikasi','Ditugaskan','Dalam Proses')) c,SUM(status='Menunggu') d,SUM(is_demo=1) demo,COUNT(DISTINCT location_id) pts FROM reports")->fetch();$bk=(int)q('SELECT COUNT(*) c FROM waste_banks WHERE active=1')->fetch()['c'];}catch(Throwable $x){$rep=null;$bk=0;}
shell_head('Dashboard Lingkungan Lampung','dash',['page'=>'dash','filters'=>true,'libs'=>['chart','leaflet'],'h1'=>'Dashboard Lingkungan Provinsi Lampung','sub'=>'Pantau, analisis, dan pahami kondisi timbulan sampah di Provinsi Lampung melalui visualisasi data.']);?>
<div class="stat-grid" id="cards" data-skel><?php for($i=0;$i<5;$i++):?><div class="stat-card skel"><div class="sc-i"></div><div class="sc-b"><div class="sk l1"></div><div class="sk l2"></div></div></div><?php endfor?></div>
<div class="dash-grid">
 <section class="card-eco p-card g-map"><div class="card-h"><h3>Peta Sebaran Timbulan Sampah</h3><a href="/peta" data-keep="1">Lihat Semua</a></div><div id="miniMap" class="mini-map" data-skel></div><div class="mini-leg" id="miniLeg"></div><p class="note mb-0">Kategori berdasarkan kuartil seluruh data SIPSN. Wilayah abu-abu = data tidak tersedia (bukan nol).</p></section>
 <section class="card-eco p-card g-donut"><div class="card-h"><h3>Komposisi Timbulan per Kab/Kota</h3></div><div id="donutBox" class="donut-box" data-skel></div></section>
 <section class="card-eco p-card g-ins"><div class="card-h"><h3>Environmental Data Insights &amp; Recommendations</h3><a href="/analisis" data-keep="1">Lihat Semua</a></div><div id="insBox" data-skel></div></section>
 <section class="card-eco p-card g-trend"><div class="card-h"><h3>Tren Timbulan Sampah 2021&ndash;2025</h3></div><div class="chart-h"><canvas id="cTrend"></canvas></div><p class="note" id="trendNote"></p></section>
 <section class="card-eco p-card g-bar"><div class="card-h"><h3>Timbulan Sampah per Kabupaten/Kota</h3><span class="tag">Peringkat tertinggi &rarr; terendah</span></div><div id="barWrap" class="bar-wrap"><canvas id="cBar"></canvas></div></section>
 <section class="card-eco p-card g-rank"><div class="card-h"><h3>Ranking Wilayah</h3></div><div id="rankBox" data-skel></div></section>
 <section class="card-eco p-card g-dh"><div class="card-h"><h3>Perbandingan Timbulan Harian &amp; Tahunan</h3></div><div id="dhBox" data-skel></div><p class="note mb-0" id="dhNote"></p></section>
 <section class="card-eco p-card g-svc"><div class="card-h"><h3>Laporan Masyarakat</h3><a href="/lapor">Buat laporan</a></div>
 <?php if($rep):?><div class="svc-stats"><div><b><?=(int)$rep['a']?></b><small>Total laporan</small></div><div><b><?=(int)$rep['d']?></b><small>Menunggu</small></div><div><b><?=(int)$rep['c']?></b><small>Diproses</small></div><div><b><?=(int)$rep['b']?></b><small>Selesai</small></div><div><b><?=(int)$rep['pts']?></b><small>Titik lokasi</small></div><div><b><?=$bk?></b><small>Bank sampah aktif</small></div></div><?php if((int)$rep['demo']>0):?><p class="note mb-0">Sebagian laporan pada instalasi ini adalah data simulasi, terpisah dari data SIPSN.</p><?php endif;else:?><p class="note">Statistik laporan masyarakat belum tersedia.</p><?php endif?>
 <div class="d-flex gap-2 flex-wrap mt-2"><a class="btn btn-eco btn-sm" href="/lapor"><i class="bi bi-megaphone"></i> Laporkan</a><a class="btn btn-outline-success btn-sm" href="/lapor?tab=cek"><i class="bi bi-search"></i> Cek status</a><a class="btn btn-outline-success btn-sm" href="/banksampah"><i class="bi bi-recycle"></i> Bank sampah</a></div></section>
</div>
<section class="strip"><b>EcoTrack Lampung &ndash; Data lingkungan yang mudah dipahami untuk keputusan yang lebih baik</b><div class="strip-g">
 <div><i class="bi bi-database-check"></i><span><b>Data Resmi</b>Bersumber dari SIPSN KLHK 2021&ndash;2025</span></div>
 <div><i class="bi bi-funnel"></i><span><b>Filter Interaktif</b>Tahun &amp; wilayah memperbarui semua grafik</span></div>
 <div><i class="bi bi-map"></i><span><b>Peta Persebaran</b>Kategori berdasar kuartil data aktual</span></div>
 <div><i class="bi bi-lightbulb"></i><span><b>Insight Otomatis</b>Analisis dihitung dari data, sadar cakupan</span></div>
 <div><i class="bi bi-download"></i><span><b>Ekspor Data</b>CSV, Excel, dan PDF</span></div></div></section>
<?php shell_foot();
