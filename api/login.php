<?php require __DIR__.'/_lib/config.php';$err='';
if($_SERVER['REQUEST_METHOD']=='POST'){chk();$u=q('SELECT * FROM users WHERE email=?',[trim($_POST['email'])])->fetch();
if($u&&password_verify($_POST['password'],$u['password'])){session_regenerate_id(true);$_SESSION['u']=['id'=>$u['id'],'name'=>$u['name'],'role'=>$u['role']];header('Location: '.($u['role']=='masyarakat'?'index.php':'dashboard.php'));exit;}
$err='Email atau kata sandi salah. Periksa lagi lalu coba masuk.';}
head('Masuk');?><div class="container py-5" style="max-width:440px"><div class="card card-eco p-4"><h3>Login Petugas &amp; Admin</h3><?php if($err):?><div class="alert alert-danger"><?=e($err)?></div><?php endif?>
<form method="post"><input type="hidden" name="t" value="<?=csrf()?>"><label class="mt-2">Email</label><input class="form-control" type="email" name="email" required><label class="mt-2">Kata sandi</label><input class="form-control" type="password" name="password" required><button class="btn btn-eco w-100 mt-3">Masuk</button></form><p class="small mt-3 mb-0 text-muted">Halaman ini khusus petugas dan admin. Warga tidak perlu login untuk melapor.</p></div></div><?php foot();
