<?php
/* Laporan Masyarakat (tanpa login) + Cek Status Laporan (?tab=cek) - menggabungkan lapor.php dan cek.php lama. */
require __DIR__.'/_lib/app.php';boot_session();
$tab=($_GET['tab']??'')==='cek'?'cek':'lapor';$err='';$ok=$_SESSION['ok']??null;unset($_SESSION['ok']);
if($tab==='lapor'&&$_SERVER['REQUEST_METHOD']=='POST'){chk();if(!empty($_POST['website']))die();$f=fn($k)=>trim($_POST[$k]??'');
 if(!$f('name')||!$f('title')||!$f('description')||!in_array($f('kab'),KAB)||!is_numeric($f('lat'))||!is_numeric($f('lng'))||!preg_match('/^[0-9+ ]{8,16}$/',$f('phone')))$err='Lengkapi nama, judul, deskripsi, kabupaten/kota, nomor telepon yang valid, dan pilih titik lokasi di peta.';
 else{$db=db();try{$db->beginTransaction();q('INSERT INTO locations(kabupaten,kecamatan,address,lat,lng) VALUES(?,?,?,?,?)',[$f('kab'),$f('kec'),$f('addr'),$f('lat'),$f('lng')]);$lid=$db->lastInsertId();
  $tk='ECO-'.date('Ymd').'-'.strtoupper(bin2hex(random_bytes(3)));
  q('INSERT INTO reports(ticket,user_id,category_id,location_id,title,description,reporter_name,phone) VALUES(?,NULL,?,?,?,?,?,?)',[$tk,(int)$f('cat'),$lid,$f('title'),$f('description'),$f('name'),$f('phone')]);$rid=$db->lastInsertId();$n=0;
  foreach(($_FILES['photos']['tmp_name']??[]) as $i=>$tmp){if(!is_uploaded_file($tmp)||$n>=3)continue;$g=@getimagesize($tmp);$ext=['image/jpeg'=>'jpg','image/png'=>'png','image/webp'=>'webp'][$g?$g['mime']:'']??null;if(!$ext||$_FILES['photos']['size'][$i]>1.2e6)continue;$fn=save_img($tmp,$ext);if(!$fn)continue;q('INSERT INTO report_images(report_id,file) VALUES(?,?)',[$rid,$fn]);$n++;}
  q('INSERT INTO report_updates(report_id,user_id,status,note) VALUES(?,NULL,?,?)',[$rid,'Menunggu','Laporan diterima']);$db->commit();$_SESSION['ok']=$tk;header('Location: /lapor');exit;}catch(Exception $x){if($db->inTransaction())$db->rollBack();$err='Laporan belum tersimpan karena terjadi kesalahan. Coba kirim lagi.';}}}
$tk=strtoupper(trim($_GET['tiket']??''));$r=null;
if($tab==='cek'&&$tk)$r=q('SELECT r.*,c.name cat,l.kabupaten,l.kecamatan FROM reports r JOIN report_categories c ON c.id=r.category_id JOIN locations l ON l.id=r.location_id WHERE r.ticket=?',[$tk])->fetch();
$cats=$tab==='lapor'?q('SELECT * FROM report_categories')->fetchAll():[];
shell_head($tab==='cek'?'Cek Status Laporan':'Laporan Masyarakat',$tab==='cek'?'cek':'lapor',['libs'=>$tab==='lapor'?['leaflet']:[],'h1'=>$tab==='cek'?'Cek Status Laporan':'Laporkan Permasalahan Lingkungan','sub'=>$tab==='cek'?'Masukkan nomor tiket untuk melihat perkembangan penanganan laporan Anda.':'Tidak perlu akun. Sudah punya tiket? Gunakan menu Cek Status Laporan.']);?>
<div class="narrow">
<ul class="nav nav-pills mb-3"><li class="nav-item"><a class="nav-link <?=$tab=='lapor'?'active':''?>" href="/lapor">Buat laporan</a></li><li class="nav-item"><a class="nav-link <?=$tab=='cek'?'active':''?>" href="/lapor?tab=cek">Cek status</a></li></ul>
<?php if($tab==='cek'):?>
<form class="input-group mb-3" method="get" action="/lapor"><input type="hidden" name="tab" value="cek"><input class="form-control" name="tiket" placeholder="Contoh: ECO-20261124-A1B2C3" value="<?=e($tk)?>" required><button class="btn btn-eco">Cek status</button></form>
<?php if($tk&&!$r):?><div class="alert alert-warning">Nomor tiket tidak ditemukan. Periksa penulisannya lalu coba lagi.</div><?php endif;if($r):?><div class="card-eco p-3"><div class="d-flex justify-content-between flex-wrap"><h5><?=e($r['title'])?></h5><?=badge($r['status'])?></div><p class="small text-muted mb-2"><?=e($r['ticket'])?> &middot; <?=e($r['cat'])?> &middot; <?=e($r['kecamatan'])?>, <?=e($r['kabupaten'])?> &middot; <?=date('d M Y',strtotime($r['created_at']))?></p><p><?=nl2br(e($r['description']))?></p>
<div class="d-flex gap-2 flex-wrap mb-3"><?php foreach(q('SELECT file FROM report_images WHERE report_id=?',[$r['id']])->fetchAll() as $im):?><a href="<?=e(img($im['file']))?>" target="_blank" rel="noopener"><img src="<?=e(img($im['file']))?>" alt="Foto bukti" style="height:90px;border-radius:8px"></a><?php endforeach?></div>
<b>Perkembangan penanganan</b><?php foreach(q('SELECT * FROM report_updates WHERE report_id=? ORDER BY id',[$r['id']])->fetchAll() as $u):?><div class="small mt-2"><i class="bi bi-dot"></i> <?=e($u['created_at'])?> &ndash; <b><?=e($u['status'])?></b> <?=e($u['note'])?></div><?php endforeach?></div><?php endif?>
<?php else:
if($ok):?><div class="alert alert-success"><i class="bi bi-check-circle-fill"></i> Laporan berhasil dikirim. Simpan nomor tiket Anda: <b class="fs-5"><?=e($ok)?></b><br><a href="/lapor?tab=cek&amp;tiket=<?=e($ok)?>">Lihat status laporan ini</a></div><?php endif;if($err):?><div class="alert alert-danger"><i class="bi bi-exclamation-triangle-fill"></i> <?=e($err)?></div><?php endif?>
<form method="post" enctype="multipart/form-data" class="row g-3 card-eco p-3 m-0" data-load><input type="hidden" name="t" value="<?=csrf()?>"><input name="website" class="d-none" tabindex="-1" autocomplete="off">
<div class="col-md-6"><label class="form-label">Nama pelapor</label><input class="form-control" name="name" required></div><div class="col-md-6"><label class="form-label">Nomor telepon</label><input class="form-control" name="phone" inputmode="tel" required></div>
<div class="col-12"><label class="form-label">Judul laporan</label><input class="form-control" name="title" required></div>
<div class="col-12"><label class="form-label">Kategori permasalahan</label><select class="form-select" name="cat"><?php foreach($cats as $c):?><option value="<?=$c['id']?>"><?=e($c['name'])?></option><?php endforeach?></select></div>
<div class="col-12"><label class="form-label">Deskripsi</label><textarea class="form-control" name="description" rows="3" required></textarea></div>
<div class="col-md-6"><label class="form-label">Kabupaten/Kota</label><select class="form-select" name="kab"><?php foreach(KAB as $k):?><option><?=$k?></option><?php endforeach?></select></div><div class="col-md-6"><label class="form-label">Kecamatan</label><input class="form-control" name="kec"></div>
<div class="col-12"><label class="form-label">Alamat lokasi</label><input class="form-control" name="addr"></div>
<div class="col-12"><label class="form-label">Klik peta untuk menandai lokasi</label><div id="pick" class="map" style="height:280px"></div></div>
<div class="col-6"><input class="form-control" name="lat" id="lat" placeholder="Latitude" readonly required></div><div class="col-6"><input class="form-control" name="lng" id="lng" placeholder="Longitude" readonly required></div>
<div class="col-12"><label class="form-label">Foto bukti (maks. 3 foto JPG/PNG/WebP, 1,2 MB per foto)</label><input class="form-control" type="file" name="photos[]" accept="image/jpeg,image/png,image/webp" multiple></div>
<div class="col-12"><button class="btn btn-eco btn-lg w-100">Kirim laporan</button></div></form>
<?php endif?></div>
<?php shell_foot($tab==='lapor'?"if(window.L){const m=L.map('pick').setView(LL,9);L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap'}).addTo(m);let mk;m.on('click',ev=>{if(mk)mk.remove();mk=L.marker(ev.latlng).addTo(m);lat.value=ev.latlng.lat.toFixed(7);lng.value=ev.latlng.lng.toFixed(7)});}
document.querySelectorAll('form[data-load]').forEach(f=>f.addEventListener('submit',()=>{const b=f.querySelector('button.btn-eco');if(b&&f.checkValidity()){setTimeout(()=>{b.disabled=true;b.innerHTML='<span class=\"spinner-border spinner-border-sm\"></span> Mengirim...'},0)}}));":'');
