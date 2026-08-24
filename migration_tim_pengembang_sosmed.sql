-- migration_tim_pengembang_sosmed.sql
-- Fitur: Box "Tim Pengembang" di halaman publik tim-pengembang.html
-- (kartu foto bulat + jabatan, klik untuk lihat detail profil & media
-- sosial), diatur admin lewat Panel Admin -> Tim Pengembang (field baru
-- "Jabatan", "Bio/Data Diri", dan tautan Instagram/WhatsApp/LinkedIn/Email).
--
-- Jalankan file ini SEKALI di Supabase Dashboard -> SQL Editor.
-- Aman dijalankan berkali-kali (pakai IF NOT EXISTS), jadi tidak akan
-- error kalau tidak sengaja dijalankan ulang. Kalau tabel `tim_pengembang`
-- belum pernah dibuat sama sekali, blok CREATE TABLE di bawah akan
-- membuatnya dulu sebelum kolom baru ditambahkan.

create table if not exists public.tim_pengembang (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  nim text,
  prodi text,
  devisi text not null,
  foto_url text,
  urutan integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tim_pengembang
  add column if not exists jabatan text,
  add column if not exists bio text,
  add column if not exists instagram text,
  add column if not exists whatsapp text,
  add column if not exists linkedin text,
  add column if not exists email text;

comment on column public.tim_pengembang.jabatan is
  'Jabatan/peran yang ditampilkan besar di kartu, mis. "Project Coordinator", "Web Developer". Kalau kosong, halaman publik memakai isi kolom Divisi sebagai gantinya.';
comment on column public.tim_pengembang.bio is
  'Deskripsi singkat/data diri anggota, ditampilkan di modal detail saat kartu anggota diklik.';
comment on column public.tim_pengembang.instagram is 'Link profil Instagram (URL lengkap), opsional.';
comment on column public.tim_pengembang.whatsapp is 'Nomor WhatsApp (format 62xxxxxxxxxx, tanpa +/spasi) atau link wa.me lengkap, opsional.';
comment on column public.tim_pengembang.linkedin is 'Link profil LinkedIn (URL lengkap), opsional.';
comment on column public.tim_pengembang.email is 'Alamat email pribadi/kontak anggota, opsional.';

-- RLS: kalau RLS aktif di tabel ini dan belum ada policy select publik,
-- baris di bawah membuka akses baca (SELECT) untuk semua orang, sama
-- seperti tabel `lokasi`/`umkm` lain di proyek ini. Aman dijalankan
-- ulang karena dibungkus pengecekan "if not exists" lewat DO block.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'tim_pengembang' and policyname = 'tim_pengembang_public_select'
  ) then
    create policy tim_pengembang_public_select on public.tim_pengembang
      for select using (true);
  end if;
end $$;
