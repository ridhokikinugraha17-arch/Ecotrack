<?php // Jalankan SEKALI dari komputer Anda (bukan di Vercel): php tools/install.php  (atur DB_* dulu)
$e=fn($k,$d='')=>getenv($k)!==false?getenv($k):$d;$o=[PDO::ATTR_ERRMODE=>PDO::ERRMODE_EXCEPTION];
if($e('DB_SSL'))$o[PDO::MYSQL_ATTR_SSL_CA]=$e('DB_SSL_CA','/etc/ssl/certs/ca-certificates.crt');
$p=new PDO('mysql:host='.$e('DB_HOST','localhost').';port='.$e('DB_PORT',3306).';dbname='.$e('DB_NAME','ecotrack').';charset=utf8mb4',$e('DB_USER','root'),$e('DB_PASS'),$o);
$p->exec(file_get_contents(__DIR__.'/database.sql'));$h=password_hash('password123',PASSWORD_DEFAULT);
$p->prepare("INSERT INTO users(id,name,email,password,role) VALUES(1,'Admin EcoTrack','admin@ecotrack.test',?,'admin'),(2,'Petugas Lapangan','petugas@ecotrack.test',?,'petugas'),(3,'Petugas 2','petugas2@ecotrack.test',?,'petugas'),(4,'Warga Demo','warga@ecotrack.test',?,'masyarakat')")->execute([$h,$h,$h,$h]);
$p->exec("INSERT INTO officers(id,user_id,area) VALUES(1,2,'Bandar Lampung'),(2,3,'Lampung Selatan')");$p->exec(file_get_contents(__DIR__.'/seed.sql'));$p->exec(file_get_contents(__DIR__.'/sipsn.sql')); // dataset SIPSN 2021-2025 (hasil xlsx_to_sql.py)
echo "Selesai. Segera ganti password admin (password123).\n";
