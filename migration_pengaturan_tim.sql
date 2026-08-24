-- migration_pengaturan_tim.sql
-- Fitur: judul section "Development Team" dan teks "Tentang Proyek" di
-- halaman publik tim-pengembang.html sekarang bisa diubah lewat Panel
-- Admin -> Pengaturan Situs -> "Halaman Tim Pengembang", tidak perlu
-- edit HTML lagi.
--
-- Menambah 4 kolom baru ke tabel `pengaturan` yang sudah ada (dibuat
-- oleh migration_pengaturan.sql), lalu mengisi nilai bawaan (sama
-- seperti teks yang sebelumnya hardcode di tim-pengembang.html) supaya
-- halaman publik tidak pernah tampil kosong.
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor. Aman
-- dijalankan berkali-kali (pakai ADD COLUMN IF NOT EXISTS).

alter table public.pengaturan
  add column if not exists dev_team_eyebrow text,
  add column if not exists dev_team_title text,
  add column if not exists tentang_proyek_judul text,
  add column if not exists tentang_proyek_teks text;

-- Isi nilai bawaan HANYA kalau baris id=1 sudah ada (dibuat oleh
-- migration_pengaturan.sql) dan kolomnya masih kosong (null) —
-- supaya tidak menimpa isi yang mungkin sudah diubah admin.
update public.pengaturan
set
  dev_team_eyebrow = coalesce(dev_team_eyebrow, 'Tim Inti'),
  dev_team_title = coalesce(dev_team_title, 'Development Team'),
  tentang_proyek_judul = coalesce(tentang_proyek_judul, 'Tentang Proyek'),
  tentang_proyek_teks = coalesce(
    tentang_proyek_teks,
    'Peta Kedewan dibuat untuk membantu warga, pengunjung, dan pemerintah desa mengakses informasi titik lokasi, fasilitas, serta produk UMKM dari 5 desa di Kecamatan Kedewan: Kedewan, Hargomulyo, Wonocolo, Beji, dan Kawengan. Website ini merupakan luaran (output) dari program Kuliah Kerja Mahasiswa (KKM Kelompok 05) IKIP PGRI Bojonegoro dan dikelola bersama oleh tim mahasiswa dan perangkat kecamatan/desa.'
  )
where id = 1;

-- Kalau baris id=1 belum ada sama sekali (instalasi baru yang belum
-- pernah menjalankan migration_pengaturan.sql), buat baris minimal di
-- sini juga supaya bagian ini tetap berfungsi.
insert into public.pengaturan (id, site_name, dev_team_eyebrow, dev_team_title, tentang_proyek_judul, tentang_proyek_teks)
select
  1, 'Kedewan', 'Tim Inti', 'Development Team', 'Tentang Proyek',
  'Peta Kedewan dibuat untuk membantu warga, pengunjung, dan pemerintah desa mengakses informasi titik lokasi, fasilitas, serta produk UMKM dari 5 desa di Kecamatan Kedewan: Kedewan, Hargomulyo, Wonocolo, Beji, dan Kawengan. Website ini merupakan luaran (output) dari program Kuliah Kerja Mahasiswa (KKM Kelompok 05) IKIP PGRI Bojonegoro dan dikelola bersama oleh tim mahasiswa dan perangkat kecamatan/desa.'
where not exists (select 1 from public.pengaturan where id = 1);
