#!/usr/bin/env python3
"""Baca Gabungan_Data_Timbulan_Sampah_SIPSN_2021-2025.xlsx -> tools/sipsn.sql dan tools/sipsn.csv (validasi + tanpa duplikasi).
Pemakaian: python3 tools/xlsx_to_sql.py path/ke/file.xlsx   (butuh: pip install openpyxl)"""
import sys, csv, os
from openpyxl import load_workbook
NEED = ['tahun','periode','nama_provinsi','nama_kabkota','jml_timbulan_harian','jml_timbulan_tahun']
src = sys.argv[1] if len(sys.argv) > 1 else 'Gabungan_Data_Timbulan_Sampah_SIPSN_2021-2025.xlsx'
ws = load_workbook(src, read_only=True, data_only=True).active
rows = [r for r in ws.iter_rows(values_only=True)]
hi = next(i for i, r in enumerate(rows) if r and [str(c).strip().lower() if c is not None else '' for c in r[:6]] == NEED)  # baris header (judul/baris kosong di atasnya dilewati)
out, seen = [], set()
for n, r in enumerate(rows[hi+1:], 1):
    if not r or all(c is None or str(c).strip() == '' for c in r): continue
    t, p, pv, kb, h, y = r[:6]
    assert isinstance(t, (int, float)) and 2000 <= t <= 2100, f'baris {n}: tahun tidak valid'
    assert kb and pv, f'baris {n}: nama kosong'
    key = (int(t), str(p), str(kb).strip())
    assert key not in seen, f'baris {n}: duplikat {key}'; seen.add(key)
    out.append((int(t), str(p), str(pv).strip(), str(kb).strip(), float(h), float(y)))
d = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(d, 'sipsn.csv'), 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f); w.writerow(NEED); w.writerows(out)
vals = ',\n'.join("(%d,'%s','%s','%s',%s,%s)" % (t, p, pv, kb.replace("'", "''"), repr(h), repr(y)) for t, p, pv, kb, h, y in out)
open(os.path.join(d, 'sipsn.sql'), 'w', encoding='utf-8').write(f"""
-- Sumber: {'Gabungan_Data_Timbulan_Sampah_SIPSN_2021-2025.xlsx'} ({len(out)} baris). Aman dijalankan ulang (upsert, tanpa duplikasi).
CREATE TABLE IF NOT EXISTS waste_generation_sipsn(id INT AUTO_INCREMENT PRIMARY KEY,tahun SMALLINT NOT NULL,periode VARCHAR(10) NOT NULL,nama_provinsi VARCHAR(60) NOT NULL,nama_kabkota VARCHAR(80) NOT NULL,jml_timbulan_harian DECIMAL(14,4) NOT NULL,jml_timbulan_tahun DECIMAL(16,4) NOT NULL,imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,UNIQUE KEY uq(tahun,periode,nama_kabkota));
CREATE TABLE IF NOT EXISTS sipsn_imports(id INT AUTO_INCREMENT PRIMARY KEY,source VARCHAR(150),rows_read INT,rows_saved INT,rows_rejected INT,user_id INT NULL,imported_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP);
INSERT INTO waste_generation_sipsn(tahun,periode,nama_provinsi,nama_kabkota,jml_timbulan_harian,jml_timbulan_tahun) VALUES
{vals}
ON DUPLICATE KEY UPDATE nama_provinsi=VALUES(nama_provinsi),jml_timbulan_harian=VALUES(jml_timbulan_harian),jml_timbulan_tahun=VALUES(jml_timbulan_tahun);
""")
print(f'OK: {len(out)} baris -> tools/sipsn.sql & tools/sipsn.csv')
