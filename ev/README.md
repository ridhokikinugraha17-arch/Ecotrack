# EcoTrack Lampung — Environmental Data Analytics Dashboard

Platform visualisasi dan analisis data lingkungan Provinsi Lampung (data timbulan sampah SIPSN KLHK 2021–2025).
Tetap **PHP + MySQL di Vercel** (`vercel-php@0.9.0`), tanpa mengganti arsitektur.

## Struktur
```
api/                      <- 11 file (batas maksimal Vercel Anda), termasuk 1 pustaka
  _lib/app.php            pustaka inti: DB (lazy), sesi, dataset SIPSN, layout sidebar/header/footer
  index.php               Dashboard (kartu statistik, tren, bar, doughnut, ranking, harian vs tahunan, mini-peta, insight)
  sipsn.php               Data Timbulan Sampah + API JSON/CSV tunggal + import CSV (admin)
  peta.php                Peta Persebaran (choropleth) + layer laporan masyarakat
  analisis.php            Analisis Data (Environmental Data Insights & Recommendations)
  statistik.php           Statistik Tahunan (ringkasan, cakupan, wilayah sebanding, heatmap)
  info.php                Informasi Lingkungan (/lingkungan) & Tentang EcoTrack (/tentang)
  lapor.php               Lapor masalah + Cek status tiket (/cek)  [gabungan lapor+cek lama]
  banksampah.php          Bank sampah (fitur lama)
  login.php               Login petugas/admin + logout (/logout)    [gabungan login+logout lama]
  dashboard.php           Panel petugas/admin (fitur lama)
public/assets/
  style.css  eco.js  pages.js        antarmuka & logika dashboard
  data/lampung-kabkota.geojson       batas 15 kab/kota (Kemendagri, disederhanakan, 81 KB)
  img/                               hero/about/cta (sudah dikompres)
tools/ (tidak ikut deploy)
  database.sql seed.sql sipsn.sql sipsn.csv install.php
  xlsx_to_sql.py                     Excel -> sipsn.sql + sipsn.csv (validasi, tanpa duplikasi)
  dev-router.php                     server lokal yang meniru vercel.json
vercel.json
```

## Alur data (satu sumber)
`Excel SIPSN → tools/xlsx_to_sql.py → tabel waste_generation_sipsn (MySQL) → GET /sipsn?format=json → browser`.
Semua halaman memuat data **sekali** dari endpoint yang sama; kartu, grafik, peta, tabel, dan insight dihitung dari array yang sama di browser,
sehingga selalu konsisten dan filter bekerja instan tanpa request berulang.

### API `GET /sipsn?format=json|csv`
Parameter (semua opsional, divalidasi; salah → HTTP 400 JSON): `tahun`, `kab`, `q`, `urut` (`tahun_desc|tahun_asc|harian_desc|harian_asc|tahunan_desc|tahunan_asc|nama`), `limit` (1–500), `page`.
Respons: `{ok, meta:{sumber, tahun[], cakupan{tahun:jumlah}, wilayah[], satuan, import_terakhir, total, filter...}, data:[{tahun,periode,provinsi,kabkota,kode,harian,tahunan}]}`.
DB tidak terhubung → HTTP 503 JSON; halaman publik tetap tampil dan menampilkan pesan error dengan tombol "Coba lagi".

## Menjalankan lokal
```bash
export DB_HOST=127.0.0.1 DB_USER=root DB_PASS= DB_NAME=ecotrack     # buat database kosong "ecotrack" dulu
php tools/install.php                                              # skema + data demo laporan + dataset SIPSN 44 baris
php -S 127.0.0.1:8080 -t public tools/dev-router.php               # buka http://127.0.0.1:8080
```
Akun demo (ganti segera): `admin@ecotrack.test` / `password123`.
Memperbarui dataset dari Excel baru: `python3 tools/xlsx_to_sql.py file.xlsx` lalu impor `tools/sipsn.sql`, atau unggah `tools/sipsn.csv` lewat halaman *Data Timbulan Sampah* (login admin). Import bersifat upsert (tidak menggandakan).

## Deploy ke Vercel
1. Siapkan MySQL yang bisa diakses dari internet (mis. TiDB Cloud/PlanetScale/Aiven). Jalankan `php tools/install.php` **sekali dari komputer Anda** dengan `DB_*` mengarah ke database tersebut.
2. Push proyek ke GitHub → *Import Project* di Vercel (root = folder ini).
3. Environment Variables: `DB_HOST DB_PORT DB_NAME DB_USER DB_PASS` (+ `DB_SSL=1` bila provider mewajibkan TLS), opsional `CLOUDINARY_CLOUD/KEY/SECRET` untuk foto laporan (Vercel tidak menyimpan file lokal).
4. Deploy. Pastikan `/sipsn?format=json` mengembalikan `"ok":true`.
Password tidak ada di source code; semua konfigurasi lewat environment variable.

## Catatan data
- Dataset: 44 baris, 15 kab/kota, tahun 2021–2025. Cakupan wilayah berbeda tiap tahun (2021: 4, 2022: 6, 2023: 12, 2024: 10, 2025: 12). Wilayah tanpa data tampil "tidak tersedia", tidak pernah nol.
- Kategori peta (rendah/sedang/tinggi/sangat tinggi) = kuartil seluruh nilai timbulan tahunan dataset (tetap untuk semua tahun).
- "Semua Tahun": angka per wilayah = rata-rata tahun yang tersedia; kartu total = akumulasi (diberi label).
- Satuan mengikuti SIPSN (ton/hari, ton/tahun); tidak tertera pada berkas Excel.
- Batas wilayah: Kemendagri (data batas administrasi kabupaten/kota, repo Alf-Anas/batas-administrasi-indonesia), disederhanakan; peta dasar © OpenStreetMap.
