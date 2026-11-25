<?php
/* Server lokal yang meniru routing vercel.json. Jalankan dari folder proyek:
   DB_HOST=127.0.0.1 DB_USER=root DB_NAME=ecotrack php -S 127.0.0.1:8080 -t public tools/dev-router.php */
$cfg=json_decode(file_get_contents(__DIR__.'/../vercel.json'),true);
$u=parse_url($_SERVER['REQUEST_URI']);$path=$u['path'];$query=$u['query']??'';
foreach($cfg['routes'] as $r){
 if(($r['handle']??'')==='filesystem'){$f=__DIR__.'/../public'.$path;if($path!=='/'&&is_file($f))return false;continue;}
 if(!preg_match('#^'.$r['src'].'$#',$path,$m))continue;
 if(isset($r['status'])){http_response_code($r['status']);foreach($r['headers']??[] as $k=>$v)header("$k: $v");exit;}
 $dest=$r['dest'];foreach($m as $i=>$g)$dest=str_replace('$'.$i,$g,$dest);
 [$file,$dq]=array_pad(explode('?',$dest,2),2,'');
 parse_str($dq,$a);parse_str($query,$b);$_GET=$b+$a;$_GET=array_merge($_GET,$a?array_diff_key($a,$b):[]);
 $_SERVER['SCRIPT_NAME']=$file;chdir(__DIR__.'/..'.dirname($file));require __DIR__.'/..'.$file;exit;}
http_response_code(404);echo '404';
