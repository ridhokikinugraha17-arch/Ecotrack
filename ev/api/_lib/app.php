<?php
/* EcoTrack Lampung - pustaka inti (satu file agar jumlah file di api/ tetap <= 11):
   koneksi DB (lazy), sesi, helper, akses dataset SIPSN, dan layout aplikasi (sidebar + header + footer). */
error_reporting(E_ALL&~E_DEPRECATED);ini_set('display_errors','0');
ob_start(); /* selalu buffer sendiri agar header/sesi/redirect aman walau output_buffering server berbeda */
const ASSET_V='20261125';
const STATUS=['Menunggu','Diverifikasi','Ditugaskan','Dalam Proses','Selesai','Ditolak'];
const KAB=['Bandar Lampung','Lampung Selatan','Lampung Tengah','Lampung Utara','Pesawaran','Metro','Lampung Timur','Lampung Barat','Tanggamus','Way Kanan','Tulang Bawang','Pringsewu','Mesuji','Pesisir Barat','Tulang Bawang Barat'];
/* 15 kabupaten/kota Provinsi Lampung beserta kode wilayah Kemendagri (acuan batas peta). Ini daftar administratif, bukan data timbulan. */
const WILAYAH=['Kab. Lampung Selatan'=>'1801','Kab. Lampung Tengah'=>'1802','Kab. Lampung Utara'=>'1803','Kab. Lampung Barat'=>'1804','Kab. Tulang Bawang'=>'1805','Kab. Tanggamus'=>'1806','Kab. Lampung Timur'=>'1807','Kab. Way Kanan'=>'1808','Kab. Pesawaran'=>'1809','Kab. Pringsewu'=>'1810','Kab. Mesuji'=>'1811','Kab. Tulang Bawang Barat'=>'1812','Kab. Pesisir Barat'=>'1813','Kota Bandar Lampung'=>'1871','Kota Metro'=>'1872'];
const UNIT_NOTE='Satuan mengikuti SIPSN: ton/hari dan ton/tahun (satuan tidak tertera pada berkas Excel). Kode periode ditampilkan apa adanya.';

function env($k,$d=null){$v=getenv($k);return $v===false?($_SERVER[$k]??$d):$v;}
function e($s){return htmlspecialchars((string)$s,ENT_QUOTES);}
function nf($n,$d=0){return number_format((float)$n,$d,',','.');}

/* ---------- Database (lazy: halaman publik tetap tampil walau DB bermasalah) ---------- */
function db(){static $d=null;if($d)return $d;
 $o=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC,PDO::ATTR_TIMEOUT=>8];
 if(env('DB_SSL'))$o[class_exists('Pdo\\Mysql')?Pdo\Mysql::ATTR_SSL_CA:PDO::MYSQL_ATTR_SSL_CA]=env('DB_SSL_CA','/etc/ssl/certs/ca-certificates.crt');
 return $d=new PDO('mysql:host='.env('DB_HOST','localhost').';port='.env('DB_PORT',3306).';dbname='.env('DB_NAME','ecotrack').';charset=utf8mb4',env('DB_USER','root'),env('DB_PASS',''),$o);}
function q($sql,$p=[]){$s=db()->prepare($sql);$s->execute($p);return $s;}

/* ---------- Sesi (hanya dimulai bila dibutuhkan; disimpan di DB karena Vercel stateless) ---------- */
class DbSess implements SessionHandlerInterface{function __construct(private PDO $d){}
 function open($p,$n):bool{$this->d->exec('CREATE TABLE IF NOT EXISTS sessions(id VARCHAR(128) PRIMARY KEY,data MEDIUMTEXT,ts INT,INDEX(ts))');return true;}
 function close():bool{return true;}
 function read($id):string|false{$s=$this->d->prepare('SELECT data FROM sessions WHERE id=? AND ts>?');$s->execute([$id,time()-86400]);return (string)$s->fetchColumn();}
 function write($id,$data):bool{$this->d->prepare('REPLACE INTO sessions(id,data,ts) VALUES(?,?,?)')->execute([$id,$data,time()]);return true;}
 function destroy($id):bool{$this->d->prepare('DELETE FROM sessions WHERE id=?')->execute([$id]);return true;}
 function gc($m):int|false{$this->d->prepare('DELETE FROM sessions WHERE ts<?')->execute([time()-86400]);return 1;}}
function boot_session(){if(session_status()===PHP_SESSION_ACTIVE)return;session_set_save_handler(new DbSess(db()),true);ini_set('session.cookie_httponly',1);ini_set('session.cookie_samesite','Lax');if(env('VERCEL'))ini_set('session.cookie_secure',1);session_start();}
function user(){if(session_status()!==PHP_SESSION_ACTIVE){if(!isset($_COOKIE[session_name()]))return null;try{boot_session();}catch(Throwable $x){return null;}}return $_SESSION['u']??null;}
function need($roles=null){$u=user();if(!$u||($roles&&!in_array($u['role'],$roles))){header('Location: /login');exit;}}
function csrf(){boot_session();return $_SESSION['t']??($_SESSION['t']=bin2hex(random_bytes(16)));}
function chk(){boot_session();$t=(string)($_SESSION['t']??'');if($t===''||!hash_equals($t,(string)($_POST['t']??''))){http_response_code(403);die('Token tidak valid. Muat ulang halaman lalu coba lagi.');}}

/* ---------- Helper lama yang dipertahankan ---------- */
function img($f){return preg_match('#^https?://#',$f)?$f:'uploads/'.$f;}
function save_img($tmp,$ext){$c=env('CLOUDINARY_CLOUD');if($c){$ts=time();$ch=curl_init("https://api.cloudinary.com/v1_1/$c/image/upload");curl_setopt_array($ch,[CURLOPT_POST=>1,CURLOPT_RETURNTRANSFER=>1,CURLOPT_TIMEOUT=>25,CURLOPT_POSTFIELDS=>['file'=>new CURLFile($tmp),'api_key'=>env('CLOUDINARY_KEY'),'timestamp'=>$ts,'signature'=>sha1("timestamp=$ts".env('CLOUDINARY_SECRET'))]]);$r=json_decode((string)curl_exec($ch),true);return $r['secure_url']??null;}
 @mkdir('uploads');$fn=bin2hex(random_bytes(8)).".$ext";return move_uploaded_file($tmp,"uploads/$fn")?$fn:null;}
function color($s){return ['Menunggu'=>'#EF4444','Diverifikasi'=>'#F59E0B','Ditugaskan'=>'#F59E0B','Dalam Proses'=>'#F59E0B','Selesai'=>'#059669','Ditolak'=>'#64748B'][$s]??'#64748B';}
function badge($s){return '<span class="badge" style="background:'.color($s).'">'.e($s).'</span>';}

/* ---------- JSON ---------- */
function json_out($a,$code=200,$cache=''){while(ob_get_level())ob_end_clean();http_response_code($code);header('Content-Type: application/json; charset=utf-8');header('Cache-Control: '.($cache?:'no-store'));header('X-Content-Type-Options: nosniff');echo json_encode($a,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES|JSON_PARTIAL_OUTPUT_ON_ERROR);exit;}

/* ---------- Dataset SIPSN (satu-satunya sumber data timbulan sampah) ---------- */
function sipsn_ensure(){$d=db();
 $d->exec("CREATE TABLE IF NOT EXISTS waste_generation_sipsn(id INT AUTO_INCREMENT PRIMARY KEY,tahun SMALLINT NOT NULL,periode VARCHAR(10) NOT NULL,nama_provinsi VARCHAR(60) NOT NULL,nama_kabkota VARCHAR(80) NOT NULL,jml_timbulan_harian DECIMAL(14,4) NOT NULL,jml_timbulan_tahun DECIMAL(16,4) NOT NULL,imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq(tahun,periode,nama_kabkota))");
 $d->exec("CREATE TABLE IF NOT EXISTS sipsn_imports(id INT AUTO_INCREMENT PRIMARY KEY,source VARCHAR(150),rows_read INT,rows_saved INT,rows_rejected INT,user_id INT NULL,imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)");}
function sipsn_upsert($rows){$st=db()->prepare('INSERT INTO waste_generation_sipsn(tahun,periode,nama_provinsi,nama_kabkota,jml_timbulan_harian,jml_timbulan_tahun) VALUES(?,?,?,?,?,?) ON DUPLICATE KEY UPDATE nama_provinsi=VALUES(nama_provinsi),jml_timbulan_harian=VALUES(jml_timbulan_harian),jml_timbulan_tahun=VALUES(jml_timbulan_tahun)');foreach($rows as $r)$st->execute($r);}
function sipsn_all(){
 $sql='SELECT tahun,periode,nama_provinsi p,nama_kabkota k,jml_timbulan_harian h,jml_timbulan_tahun t FROM waste_generation_sipsn ORDER BY tahun,nama_kabkota';
 try{$r=q($sql)->fetchAll();}catch(PDOException $x){sipsn_ensure();$r=q($sql)->fetchAll();}
 return array_map(fn($x)=>['tahun'=>(int)$x['tahun'],'periode'=>(string)$x['periode'],'provinsi'=>$x['p'],'kabkota'=>$x['k'],'kode'=>WILAYAH[$x['k']]??null,'harian'=>(float)$x['h'],'tahunan'=>(float)$x['t']],$r);}
function sipsn_meta($rows){$cov=[];foreach($rows as $r)$cov[$r['tahun']][$r['kabkota']]=1;ksort($cov);
 $last=null;try{$last=q('SELECT source,imported_at FROM sipsn_imports ORDER BY id DESC LIMIT 1')->fetch()?:null;}catch(Throwable $x){}
 $w=[];foreach(WILAYAH as $n=>$k)$w[]=['nama'=>$n,'kode'=>$k];
 return ['sumber'=>'Sistem Informasi Pengelolaan Sampah Nasional (SIPSN) - KLHK','provinsi'=>'Lampung','satuan'=>['harian'=>'ton/hari','tahunan'=>'ton/tahun'],'catatan_satuan'=>UNIT_NOTE,
  'tahun'=>array_map('intval',array_keys($cov)),'periode'=>array_values(array_unique(array_column($rows,'periode'))),'jumlah_baris'=>count($rows),
  'jumlah_wilayah_terdata'=>count(array_unique(array_column($rows,'kabkota'))),'jumlah_wilayah_provinsi'=>count(WILAYAH),
  'cakupan'=>array_map('count',$cov),'wilayah'=>$w,'import_terakhir'=>$last];}

/* ---------- Layout aplikasi ---------- */
function nav_items(){return [
 ['Utama',[['dash','/','Dashboard','bi-grid-1x2-fill'],['data','/sipsn','Data Timbulan Sampah','bi-table'],['peta','/peta','Peta Persebaran','bi-map-fill'],['analisis','/analisis','Analisis Data','bi-graph-up-arrow'],['stat','/statistik','Statistik Tahunan','bi-bar-chart-line-fill'],['info','/lingkungan','Informasi Lingkungan','bi-tree-fill'],['tentang','/tentang','Tentang EcoTrack','bi-info-circle-fill']]],
 ['Layanan Masyarakat',[['lapor','/lapor','Laporkan Masalah','bi-megaphone-fill'],['cek','/lapor?tab=cek','Cek Status Laporan','bi-search'],['bank','/banksampah','Bank Sampah','bi-recycle']]]];}
function shell_head($title,$active='',$o=[]){$GLOBALS['_shell']=$o+['libs'=>[],'page'=>'','filters'=>false];$u=user();$o=$GLOBALS['_shell'];?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=e($title)?> | EcoTrack Lampung</title><meta name="description" content="EcoTrack Lampung - Platform visualisasi dan analisis data lingkungan Provinsi Lampung berbasis data SIPSN KLHK.">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='8' fill='%23059669'/%3E%3Cpath d='M9 22c0-8 5-12 14-12 0 8-4 13-12 13' fill='%23fff'/%3E%3C/svg%3E">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
<?php if(in_array('leaflet',$o['libs'])):?><link href="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet"><?php endif?>
<link href="/assets/style.css?v=<?=ASSET_V?>" rel="stylesheet"></head>
<body class="eco-app" data-page="<?=e($o['page'])?>"><script>try{if(localStorage.getItem('eco.side')==='1')document.body.classList.add('collapsed')}catch(e){}</script>
<div class="eco-overlay" id="ecoOverlay"></div>
<aside class="eco-side" id="ecoSide" aria-label="Navigasi utama">
 <a class="brand" href="/"><span class="logo"><svg viewBox="0 0 32 32" width="30" height="30" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="none" stroke="#34D399" stroke-width="2"/><path d="M9 21c0-7 4.5-11 13-11 0 7.500-3.500 12-11 12" fill="#fff"/><path d="M10 24c3-5 6-8 10-10" stroke="#064E3B" stroke-width="1.600" fill="none" stroke-linecap="round"/></svg></span><span class="brand-text"><b>EcoTrack Lampung</b><small>Smart Environmental Monitoring &amp; Data Analytics</small></span></a>
 <nav class="side-nav"><?php foreach(nav_items() as $g):?><div class="nav-label"><?=e($g[0])?></div><?php foreach($g[1] as $n):?><a class="nav-i <?=$active==$n[0]?'on':''?>" href="<?=e($n[1])?>" title="<?=e($n[2])?>"<?=$g[0]=='Utama'?' data-keep="1"':''?>><i class="bi <?=$n[3]?>"></i><span><?=e($n[2])?></span></a><?php endforeach;endforeach?>
 <div class="nav-label">Petugas</div><?php if($u&&$u['role']!='masyarakat'):?><a class="nav-i <?=$active=='admin'?'on':''?>" href="/dashboard" title="Panel Petugas"><i class="bi bi-clipboard2-data-fill"></i><span>Panel Petugas</span></a><a class="nav-i" href="/logout" title="Keluar"><i class="bi bi-box-arrow-right"></i><span>Keluar</span></a><?php else:?><a class="nav-i <?=$active=='login'?'on':''?>" href="/login" title="Login Petugas"><i class="bi bi-shield-lock-fill"></i><span>Login Petugas</span></a><?php endif?></nav>
 <div class="side-card"><div class="sc-ico"><i class="bi bi-database-check"></i></div><div class="sc-t"><b>Sumber data</b><small>SIPSN KLHK &middot; 2021&ndash;2025</small></div><a href="/sipsn" class="btn btn-eco btn-sm" data-keep="1">Lihat data</a></div>
 <div class="side-foot">&copy; <?=date('Y')?> EcoTrack Lampung<button type="button" class="collapse-btn" id="ecoCollapse" aria-label="Perkecil atau perbesar sidebar" title="Perkecil/perbesar sidebar"><i class="bi bi-chevron-double-left"></i></button></div>
</aside>
<div class="eco-main">
<header class="eco-top"><button class="icon-btn d-lg-none" id="ecoBurger" aria-label="Buka menu"><i class="bi bi-list"></i></button><button class="icon-btn d-none d-lg-inline-flex" id="ecoCollapse2" aria-label="Perkecil atau perbesar sidebar"><i class="bi bi-layout-sidebar-inset"></i></button>
 <form class="top-search" id="ecoSearch" role="search" autocomplete="off"><i class="bi bi-search"></i><input type="search" id="ecoQ" placeholder="Cari kabupaten/kota, mis. Tanggamus..." aria-label="Cari kabupaten/kota" maxlength="60"></form>
 <span class="src-chip d-none d-xl-inline-flex" title="Sumber data"><i class="bi bi-patch-check-fill"></i> SIPSN KLHK &middot; 2021&ndash;2025</span>
 <div class="top-user"><span class="avatar"><?=e($u?strtoupper(substr($u['name'],0,1)):'T')?></span><span class="d-none d-md-block lh-sm"><b><?=e($u?$u['name']:'Pengunjung')?></b><small class="d-block text-muted"><?=e($u?ucfirst($u['role']):'EcoTrack Lampung')?></small></span></div></header>
<main class="eco-content" id="ecoContent">
<?php if(!empty($o['title_block'])||isset($o['sub'])):?><div class="page-head"><h1><?=e($o['h1']??$title)?></h1><p><?=e($o['sub']??'')?></p></div><?php endif?>
<?php if($o['filters']):?><section class="filter-bar" id="ecoFilters" aria-label="Filter global"><div class="fb-item"><label for="fTahun"><i class="bi bi-calendar3"></i> Tahun</label><select id="fTahun" class="form-select form-select-sm"><option value="all">Semua Tahun</option></select></div><div class="fb-item"><label for="fKab"><i class="bi bi-geo-alt"></i> Kabupaten/Kota</label><select id="fKab" class="form-select form-select-sm"><option value="all">Semua Kabupaten/Kota</option></select></div><div class="fb-item fb-grow"><span class="fb-info" id="fInfo"><i class="bi bi-info-circle"></i> Memuat data...</span></div><button class="btn btn-sm btn-outline-secondary" id="fReset" type="button"><i class="bi bi-arrow-counterclockwise"></i> Reset</button></section><div id="ecoNotice"></div><?php endif?>
<?php }
function shell_foot($js=''){$o=$GLOBALS['_shell']??['libs'=>[],'page'=>''];$L=$o['libs'];$v=ASSET_V;?>
</main>
<footer class="eco-foot"><div class="ef-grid"><div><b class="ef-brand"><i class="bi bi-tree-fill"></i> EcoTrack Lampung</b><p>Platform Visualisasi dan Analisis Data Lingkungan Provinsi Lampung.</p></div><div><b>Sumber data</b><p>Sistem Informasi Pengelolaan Sampah Nasional (SIPSN) &ndash; KLHK.</p></div><div><b>Periode data</b><p>2021&ndash;2025</p></div></div><div class="ef-copy">&copy; <?=date('Y')?> EcoTrack Lampung. Seluruh hak cipta dilindungi. Batas wilayah: Kemendagri (data batas administrasi kabupaten/kota).</div></footer>
</div>
<?php if(in_array('chart',$L)):?><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script><?php endif;if(in_array('leaflet',$L)):?><script src="https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js"></script><?php endif;if(in_array('xlsx',$L)):?><script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script><?php endif;if(in_array('pdf',$L)):?><script src="https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js"></script><script src="https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js"></script><?php endif?>
<script src="/assets/eco.js?v=<?=$v?>"></script><?php if($o['filters']):?><script src="/assets/pages.js?v=<?=$v?>"></script><?php endif?><?php if($js):?><script><?=$js?></script><?php endif?>
</body></html><?php }
