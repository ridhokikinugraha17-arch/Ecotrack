<?php
/* Data Timbulan Sampah (SIPSN): halaman tabel + endpoint JSON/CSV tunggal untuk seluruh dashboard.
   GET /sipsn?format=json|csv  [tahun=2025] [kab=Kab. Tanggamus] [q=teks] [urut=...] [limit=1..500&page=1]  */
require __DIR__.'/_lib/app.php';
const SORTS=['tahun_desc','tahun_asc','harian_desc','harian_asc','tahunan_desc','tahunan_asc','nama'];
$NEED=['tahun','periode','nama_provinsi','nama_kabkota','jml_timbulan_harian','jml_timbulan_tahun'];

$fmt=$_GET['format']??'';
if($fmt!==''){
 if(!in_array($_SERVER['REQUEST_METHOD'],['GET','HEAD']))json_out(['ok'=>false,'error'=>'Metode tidak didukung'],405);
 if(!in_array($fmt,['json','csv'],true))json_out(['ok'=>false,'error'=>'Parameter format harus json atau csv'],400);
 try{$rows=sipsn_all();}catch(Throwable $x){json_out(['ok'=>false,'error'=>'Database tidak dapat diakses. Periksa variabel DB_* dan import tools/sipsn.sql.'],503);}
 $meta=sipsn_meta($rows);$bad=[];$f=[];
 $t=trim((string)($_GET['tahun']??''));if($t!==''&&$t!=='all'){if(ctype_digit($t)&&in_array((int)$t,$meta['tahun'],true))$f['tahun']=(int)$t;else $bad[]='tahun';}
 $k=trim((string)($_GET['kab']??''));if($k!==''&&$k!=='all'){if(in_array($k,array_column($rows,'kabkota'),true)||isset(WILAYAH[$k]))$f['kab']=$k;else $bad[]='kab';}
 $qq=mb_substr(trim(preg_replace('/[\x00-\x1F\x7F]/u','',(string)($_GET['q']??''))),0,60);
 $so=(string)($_GET['urut']??'tahun_desc');if(!in_array($so,SORTS,true)){$bad[]='urut';$so='tahun_desc';}
 $lim=0;$pg=1;if(isset($_GET['limit'])){if(ctype_digit((string)$_GET['limit'])&&$_GET['limit']>=1&&$_GET['limit']<=500)$lim=(int)$_GET['limit'];else $bad[]='limit';}
 if(isset($_GET['page'])){if(ctype_digit((string)$_GET['page'])&&$_GET['page']>=1)$pg=(int)$_GET['page'];else $bad[]='page';}
 if($bad)json_out(['ok'=>false,'error'=>'Parameter tidak valid: '.implode(', ',$bad),'tahun_tersedia'=>$meta['tahun']],400);
 $out=array_values(array_filter($rows,fn($r)=>(!isset($f['tahun'])||$r['tahun']===$f['tahun'])&&(!isset($f['kab'])||$r['kabkota']===$f['kab'])&&($qq===''||mb_stripos($r['kabkota'].' '.$r['tahun'],$qq)!==false)));
 usort($out,match($so){'tahun_asc'=>fn($a,$b)=>[$a['tahun'],$a['kabkota']]<=>[$b['tahun'],$b['kabkota']],'harian_desc'=>fn($a,$b)=>$b['harian']<=>$a['harian'],'harian_asc'=>fn($a,$b)=>$a['harian']<=>$b['harian'],'tahunan_desc'=>fn($a,$b)=>$b['tahunan']<=>$a['tahunan'],'tahunan_asc'=>fn($a,$b)=>$a['tahunan']<=>$b['tahunan'],'nama'=>fn($a,$b)=>[$a['kabkota'],$a['tahun']]<=>[$b['kabkota'],$b['tahun']],default=>fn($a,$b)=>[$b['tahun'],$a['kabkota']]<=>[$a['tahun'],$b['kabkota']]});
 $total=count($out);if($lim)$out=array_slice($out,($pg-1)*$lim,$lim);
 if($fmt==='csv'){while(ob_get_level())ob_end_clean();header('Content-Type: text/csv; charset=utf-8');header('Content-Disposition: attachment; filename="timbulan_sampah_sipsn.csv"');echo "\xEF\xBB\xBF";$o=fopen('php://output','w');fputcsv($o,$NEED);foreach($out as $r)fputcsv($o,[$r['tahun'],$r['periode'],$r['provinsi'],$r['kabkota'],$r['harian'],$r['tahunan']]);exit;}
 json_out(['ok'=>true,'meta'=>$meta+['filter'=>$f+['q'=>$qq,'urut'=>$so],'total'=>$total,'halaman'=>$lim?$pg:null,'per_halaman'=>$lim?:null],'data'=>$out],200,'public, max-age=0, s-maxage=60, must-revalidate');
}

/* ---------- Import CSV (khusus admin) ---------- */
$u=user();$adm=$u&&$u['role']=='admin';$msg='';$errs=[];
if($_SERVER['REQUEST_METHOD']=='POST'){need(['admin']);chk();$f=$_FILES['csv']??null;
 if(!$f||$f['error']||$f['size']>1048576||strtolower(pathinfo($f['name'],PATHINFO_EXTENSION))!='csv')$errs[]='Pilih file .csv (maksimal 1 MB).';
 else{$h=fopen($f['tmp_name'],'r');$first=(string)fgets($h);rewind($h);$d=substr_count($first,';')>substr_count($first,',')?';':',';
  $hd=array_map(fn($x)=>strtolower(trim(preg_replace('/^\xEF\xBB\xBF/','',(string)$x))),(array)fgetcsv($h,0,$d));
  if(array_diff($NEED,$hd))$errs[]='Kolom wajib: '.implode(', ',$NEED);
  else{$ix=array_flip($hd);$n=0;$ok=[];$seen=[];$num=fn($v)=>preg_match('/^\d+([.,]\d+)?$/',trim((string)$v))?(float)str_replace(',','.',trim($v)):null;
   while(($r=fgetcsv($h,0,$d))!==false){if(!array_filter($r,fn($v)=>trim((string)$v)!==''))continue;$n++;$g=fn($k)=>trim((string)($r[$ix[$k]]??''));
    $th=$g('tahun');$pr=$g('periode');$pv=$g('nama_provinsi');$kb=$g('nama_kabkota');$hr=$num($g('jml_timbulan_harian'));$tt=$num($g('jml_timbulan_tahun'));$key="$th|$pr|$kb";
    if(!ctype_digit($th)||$th<2000||$th>2100||$pr===''||strlen($pr)>10||$pv===''||$kb===''||strlen($kb)>80||strlen($pv)>60||$hr===null||$tt===null)$errs[]="Baris data ke-$n tidak valid.";
    elseif(isset($seen[$key]))$errs[]="Baris data ke-$n duplikat di dalam file ($kb, $th).";
    else{$seen[$key]=1;$ok[]=[(int)$th,$pr,$pv,$kb,$hr,$tt];}}
   if(!$n)$errs[]='File tidak berisi data.';
   if(!$errs){try{sipsn_ensure();$db=db();$db->beginTransaction();sipsn_upsert($ok);q('INSERT INTO sipsn_imports(source,rows_read,rows_saved,rows_rejected,user_id) VALUES(?,?,?,0,?)',[substr($f['name'],0,150),$n,count($ok),$u['id']]);$db->commit();$msg="Import berhasil: $n baris divalidasi dan disimpan. Data yang sama diperbarui, bukan digandakan.";}catch(Exception $x){if(isset($db)&&$db->inTransaction())$db->rollBack();$errs[]='Gagal menyimpan ke database.';}}
   else $errs=array_slice($errs,0,6);}
  fclose($h);}}

shell_head('Data Timbulan Sampah','data',['page'=>'data','filters'=>true,'libs'=>['xlsx','pdf'],'h1'=>'Data Timbulan Sampah','sub'=>'Tabel data timbulan sampah kabupaten/kota Provinsi Lampung (SIPSN KLHK, 2021–2025). Gunakan filter, pencarian, dan urutan untuk menelusuri data.']);
if($msg):?><div class="alert alert-success"><?=e($msg)?></div><?php endif;foreach($errs as $x):?><div class="alert alert-danger py-2"><?=e($x)?></div><?php endforeach?>
<section class="card-eco p-3 p-md-4 mb-3">
 <div class="tbl-tools"><div class="tt-search"><i class="bi bi-search"></i><input id="tSearch" type="search" class="form-control form-control-sm" placeholder="Cari kabupaten/kota atau tahun..." aria-label="Cari di tabel" maxlength="60"></div>
  <div class="tt-right"><label class="small text-muted" for="tPer">Baris</label><select id="tPer" class="form-select form-select-sm"><option>10</option><option selected>15</option><option>25</option><option>50</option></select>
  <div class="btn-group btn-group-sm" role="group" aria-label="Ekspor data"><button class="btn btn-outline-success" id="btnCsv" type="button"><i class="bi bi-filetype-csv"></i> CSV</button><button class="btn btn-outline-success" id="btnXlsx" type="button"><i class="bi bi-file-earmark-excel"></i> Excel</button><button class="btn btn-outline-success" id="btnPdf" type="button"><i class="bi bi-file-earmark-pdf"></i> PDF</button></div></div></div>
 <div class="table-responsive"><table class="table eco-table align-middle" id="tbl"><thead><tr><th data-k="no">No</th><th data-k="tahun" class="sortable">Tahun</th><th data-k="periode" class="sortable">Periode</th><th data-k="provinsi" class="sortable">Provinsi</th><th data-k="kabkota" class="sortable">Kabupaten/Kota</th><th data-k="harian" class="sortable text-end">Timbulan Harian<small>ton/hari</small></th><th data-k="tahunan" class="sortable text-end">Timbulan Tahunan<small>ton/tahun</small></th></tr></thead><tbody id="tblBody"><tr><td colspan="7" class="text-center py-5 text-muted"><span class="spinner-border spinner-border-sm"></span> Memuat data...</td></tr></tbody></table></div>
 <div class="tbl-foot"><small class="text-muted" id="tblInfo"></small><nav aria-label="Halaman tabel"><ul class="pagination pagination-sm mb-0" id="tblPager"></ul></nav></div>
 <p class="small text-muted mt-3 mb-0"><i class="bi bi-info-circle"></i> <?=e(UNIT_NOTE)?></p>
</section>
<section class="card-eco p-3 p-md-4 mb-3" id="missBox" hidden></section>
<?php if($adm):?><section class="card-eco p-3 p-md-4 mb-3"><div class="d-flex justify-content-between flex-wrap gap-2"><b>Import dataset (CSV) &ndash; admin</b><small class="text-muted" id="importInfo"></small></div><form method="post" enctype="multipart/form-data" class="row g-2 mt-1 align-items-center"><input type="hidden" name="t" value="<?=csrf()?>"><div class="col-md-8"><input class="form-control form-control-sm" type="file" name="csv" accept=".csv" required></div><div class="col-md-4"><button class="btn btn-eco btn-sm w-100">Validasi &amp; import</button></div></form><p class="small text-muted mt-2 mb-0">Kolom wajib: <?=e(implode(', ',$NEED))?>. Seluruh file divalidasi dulu; bila ada baris salah, tidak ada yang disimpan. Import ulang tidak menggandakan data. Contoh berkas: <code>tools/sipsn.csv</code>.</p></section><?php endif?>
<?php shell_foot();
