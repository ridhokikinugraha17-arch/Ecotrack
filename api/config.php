<?php
error_reporting(E_ALL&~E_DEPRECATED);ini_set('display_errors','0');ob_start();
function env($k,$d=null){$v=getenv($k);return $v===false?($_SERVER[$k]??$d):$v;}
$o=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION,PDO::ATTR_DEFAULT_FETCH_MODE=>PDO::FETCH_ASSOC];
if(env('DB_SSL'))$o[class_exists('Pdo\\Mysql')?Pdo\Mysql::ATTR_SSL_CA:PDO::MYSQL_ATTR_SSL_CA]=env('DB_SSL_CA','/etc/ssl/certs/ca-certificates.crt');
$db=new PDO('mysql:host='.env('DB_HOST','localhost').';port='.env('DB_PORT',3306).';dbname='.env('DB_NAME','ecotrack').';charset=utf8mb4',env('DB_USER','root'),env('DB_PASS',''),$o);
class DbSess implements SessionHandlerInterface{function __construct(private PDO $d){}
function open($p,$n):bool{$this->d->exec('CREATE TABLE IF NOT EXISTS sessions(id VARCHAR(128) PRIMARY KEY,data MEDIUMTEXT,ts INT,INDEX(ts))');return true;}
function close():bool{return true;}
function read($id):string|false{$s=$this->d->prepare('SELECT data FROM sessions WHERE id=? AND ts>?');$s->execute([$id,time()-86400]);return (string)$s->fetchColumn();}
function write($id,$data):bool{$this->d->prepare('REPLACE INTO sessions(id,data,ts) VALUES(?,?,?)')->execute([$id,$data,time()]);return true;}
function destroy($id):bool{$this->d->prepare('DELETE FROM sessions WHERE id=?')->execute([$id]);return true;}
function gc($m):int|false{$this->d->prepare('DELETE FROM sessions WHERE ts<?')->execute([time()-86400]);return 1;}}
session_set_save_handler(new DbSess($db),true);ini_set('session.cookie_httponly',1);ini_set('session.cookie_samesite','Lax');if(env('VERCEL'))ini_set('session.cookie_secure',1);session_start();
function img($f){return preg_match('#^https?://#',$f)?$f:'uploads/'.$f;}
function save_img($tmp,$ext){$c=env('CLOUDINARY_CLOUD');if($c){$ts=time();$ch=curl_init("https://api.cloudinary.com/v1_1/$c/image/upload");curl_setopt_array($ch,[CURLOPT_POST=>1,CURLOPT_RETURNTRANSFER=>1,CURLOPT_TIMEOUT=>25,CURLOPT_POSTFIELDS=>['file'=>new CURLFile($tmp),'api_key'=>env('CLOUDINARY_KEY'),'timestamp'=>$ts,'signature'=>sha1("timestamp=$ts".env('CLOUDINARY_SECRET'))]]);$r=json_decode((string)curl_exec($ch),true);return $r['secure_url']??null;}
@mkdir('uploads');$fn=bin2hex(random_bytes(8)).".$ext";return move_uploaded_file($tmp,"uploads/$fn")?$fn:null;}
const STATUS=['Menunggu','Diverifikasi','Ditugaskan','Dalam Proses','Selesai','Ditolak'];
const KAB=['Bandar Lampung','Lampung Selatan','Lampung Tengah','Lampung Utara','Pesawaran','Metro','Lampung Timur','Lampung Barat','Tanggamus','Way Kanan','Tulang Bawang','Pringsewu','Mesuji','Pesisir Barat','Tulang Bawang Barat'];
function e($s){return htmlspecialchars((string)$s,ENT_QUOTES);}
function q($sql,$p=[]){global $db;$s=$db->prepare($sql);$s->execute($p);return $s;}
function user(){return $_SESSION['u']??null;}
function need($roles=null){$u=user();if(!$u||($roles&&!in_array($u['role'],$roles))){header('Location: login.php');exit;}}
function color($s){return ['Menunggu'=>'#EF4444','Diverifikasi'=>'#F59E0B','Ditugaskan'=>'#F59E0B','Dalam Proses'=>'#F59E0B','Selesai'=>'#10B981','Ditolak'=>'#6B7280'][$s];}
function badge($s){return '<span class="badge" style="background:'.color($s).'">'.e($s).'</span>';}
function csrf(){return $_SESSION['t']??($_SESSION['t']=bin2hex(random_bytes(16)));}
function chk(){if(($_POST['t']??'')!==csrf())die('Token tidak valid');}
function head($t){$u=user();$cur=basename($_SERVER['SCRIPT_NAME']);$nav=['index.php'=>'Beranda','peta.php'=>'Peta Lingkungan','lapor.php'=>'Laporan Masyarakat','banksampah.php'=>'Bank Sampah','index.php#tentang'=>'Tentang Kami'];?><!doctype html><html lang="id"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title><?=e($t)?> | EcoTrack Lampung</title>
<link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet"><link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.css" rel="stylesheet"><link href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" rel="stylesheet"><link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;800&display=swap" rel="stylesheet"><link href="assets/style.css" rel="stylesheet"></head><body>
<nav class="navbar navbar-expand-lg sticky-top eco-nav"><div class="container"><a class="navbar-brand" href="index.php"><i class="bi bi-tree-fill"></i> EcoTrack <b>Lampung</b></a><button class="navbar-toggler" data-bs-toggle="collapse" data-bs-target="#n" aria-label="Menu"><i class="bi bi-list fs-3"></i></button><div class="collapse navbar-collapse" id="n"><ul class="navbar-nav mx-auto"><?php foreach($nav as $h=>$l):?><li class="nav-item"><a class="nav-link <?=$cur==$h?'active':''?>" href="<?=$h?>"><?=$l?></a></li><?php endforeach?></ul>
<?php if($u&&$u['role']!='masyarakat'):?><a class="btn btn-sm btn-outline-success me-2" href="dashboard.php">Dashboard</a><a class="btn btn-sm btn-link text-muted" href="logout.php">Keluar</a><?php endif?><a class="btn btn-eco" href="lapor.php"><i class="bi bi-megaphone"></i> Laporkan Sekarang</a></div></div></nav>
<?php }
function foot($js=''){?><footer class="eco-foot pt-5 pb-3 mt-5"><div class="container"><div class="row g-4"><div class="col-md-5"><h5><i class="bi bi-tree-fill"></i> EcoTrack Lampung</h5><p class="small opacity-75">Platform digital untuk memantau kondisi lingkungan, melaporkan masalah sampah, dan mewujudkan Lampung yang bersih dan berkelanjutan.</p></div><div class="col-6 col-md-3"><b>Navigasi</b><ul class="list-unstyled small mt-2"><li><a href="index.php">Beranda</a></li><li><a href="peta.php">Peta Lingkungan</a></li><li><a href="lapor.php">Laporan Masyarakat</a></li><li><a href="cek.php">Cek Status Laporan</a></li><li><a href="banksampah.php">Bank Sampah</a></li></ul></div><div class="col-6 col-md-4"><b>Kontak</b><ul class="list-unstyled small mt-2"><li><i class="bi bi-geo-alt"></i> Bandar Lampung, Lampung</li><li><i class="bi bi-envelope"></i> info@ecotrack.example</li><li><a href="login.php"><i class="bi bi-shield-lock"></i> Login Petugas &amp; Admin</a></li></ul></div></div><hr><p class="small text-center opacity-75 mb-0">&copy; <?=date('Y')?> EcoTrack Lampung. Data demo adalah <b>data simulasi</b>, bukan data resmi pemerintah.</p></div></footer>
<script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script><script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script><script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.3/dist/chart.umd.min.js"></script><script>
const LL=[-5.0,105.1];function dot(c){return L.divIcon({className:'',html:'<div style="width:16px;height:16px;border-radius:50%;background:'+c+';border:2px solid #fff;box-shadow:0 0 4px #0006"></div>'})}
const io=new IntersectionObserver(es=>es.forEach(x=>{if(!x.isIntersecting)return;const el=x.target;el.classList.add('in');if(el.dataset.count){const n=+el.dataset.count;let s=null;const f=t=>{s=s||t;const p=Math.min((t-s)/900,1);el.textContent=Math.round(n*p);if(p<1)requestAnimationFrame(f)};requestAnimationFrame(f)}io.unobserve(el)}),{threshold:.15});document.querySelectorAll('.fade,[data-count]').forEach(e=>io.observe(e));
document.querySelectorAll('form[data-load]').forEach(f=>f.addEventListener('submit',()=>{const b=f.querySelector('button.btn-eco');if(b&&f.checkValidity()){setTimeout(()=>{b.disabled=true;b.innerHTML='<span class="spinner-border spinner-border-sm"></span> Mengirim...'},0)}}));
<?=$js?></script></body></html><?php }
