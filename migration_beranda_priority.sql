-- migration_beranda_priority.sql
-- Fitur: Pilih & prioritaskan Titik Lokasi / UMKM mana saja yang tampil
-- di preview Beranda situs publik, diatur admin lewat Panel Admin ->
-- Titik Lokasi / UMKM (kolom baru "Tampil di Beranda" & "Urutan
-- Prioritas Beranda" di form tambah/ubah, serta switch cepat + input
-- angka langsung di tabel).
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan berkali-kali (pakai IF NOT EXISTS), jadi tidak akan
-- error kalau tidak sengaja dijalankan ulang.

-- 1) Tabel `lokasi` ------------------------------------------------------
alter table public.lokasi
  add column if not exists tampil_beranda boolean not null default true,
  add column if not exists urutan_beranda integer;

comment on column public.lokasi.tampil_beranda is
  'Kalau true, titik lokasi ini ikut jadi kandidat tampil di preview Beranda situs publik. Kalau false, tidak akan pernah muncul di Beranda (tetap ada di halaman Titik Lokasi).';
comment on column public.lokasi.urutan_beranda is
  'Angka lebih kecil = tampil lebih dulu di Beranda (mis. 1 tampil sebelum 2). Kosong (NULL) = tidak diprioritaskan, diurutkan berdasarkan yang terbaru ditambahkan dan ditaruh setelah yang punya angka prioritas.';

create index if not exists lokasi_beranda_idx on public.lokasi (tampil_beranda, urutan_beranda);

-- 2) Tabel `umkm` --------------------------------------------------------
alter table public.umkm
  add column if not exists tampil_beranda boolean not null default true,
  add column if not exists urutan_beranda integer;

comment on column public.umkm.tampil_beranda is
  'Kalau true, produk UMKM ini ikut jadi kandidat tampil di preview Beranda situs publik. Kalau false, tidak akan pernah muncul di Beranda (tetap ada di halaman UMKM).';
comment on column public.umkm.urutan_beranda is
  'Angka lebih kecil = tampil lebih dulu di Beranda (mis. 1 tampil sebelum 2). Kosong (NULL) = tidak diprioritaskan, diurutkan berdasarkan yang terbaru ditambahkan dan ditaruh setelah yang punya angka prioritas.';

create index if not exists umkm_beranda_idx on public.umkm (tampil_beranda, urutan_beranda);
