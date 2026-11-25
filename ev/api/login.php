<?php
/* Login petugas/admin; ?out=1 = logout (menggantikan logout.php). */
require __DIR__.'/_lib/app.php';
boot_session();
if(isset($_GET['out'])){session_destroy();header('Location: /');exit;}
$err='';
if($_SERVER['REQUEST_METHOD']=='POST'){chk();$u=q('SELECT * FROM users WHERE email=?',[trim($_POST['email']??'')])->fetch();
 if($u&&password_verify($_POST['password']??'',$u['password'])){session_regenerate_id(true);$_SESSION['u']=['id'=>$u['id'],'name'=>$u['name'],'role'=>$u['role']];header('Location: '.($u['role']=='masyarakat'?'/':'/dashboard'));exit;}
 $err='Email atau kata sandi salah. Periksa lagi lalu coba masuk.';}
shell_head('Masuk','login',[]);?>
<div class="auth-wrap"><div class="card-eco p-4"><h1 class="h4 mb-1">Login Petugas &amp; Admin</h1><p class="text-muted small">Halaman ini khusus petugas dan admin. Warga tidak perlu login untuk melapor.</p><?php if($err):?><div class="alert alert-danger"><?=e($err)?></div><?php endif?>
<form method="post"><input type="hidden" name="t" value="<?=csrf()?>"><label class="form-label mt-2" for="em">Email</label><input id="em" class="form-control" type="email" name="email" required><label class="form-label mt-2" for="pw">Kata sandi</label><input id="pw" class="form-control" type="password" name="password" required><button class="btn btn-eco w-100 mt-3">Masuk</button></form></div></div>
<?php shell_foot();
