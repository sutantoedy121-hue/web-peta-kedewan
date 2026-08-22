# Catatan Setup — Fitur Background Hero (Slide Otomatis)

Fitur baru: bagian hero (paling atas beranda publik) sekarang bisa
punya gambar latar belakang yang diunggah admin lewat **Panel Admin ->
Pengaturan Situs -> Background Hero**. Bisa unggah lebih dari 1
gambar — kalau lebih dari 1, otomatis bergantian (slide/crossfade)
tiap 10 detik. Kalau belum ada gambar diunggah, hero tetap tampil
polos seperti sebelumnya (tidak ada yang rusak).

Sebelum dipakai, jalankan **migration_hero_background.sql** di
Supabase SQL Editor (sekali saja) — ini membuat tabel `hero_background`
dan bucket storage `hero-bg` beserta izin (RLS)-nya.

File terkait:
- `js/hero-bg.js` — menampilkan slideshow di beranda publik.
- `css/style.css` (bagian "Hero background slideshow") — style slide & overlay gelap supaya teks tetap terbaca di atas foto.
- `admin/pengaturan.html` + `admin/js/hero-background.js` — form unggah/hapus gambar di Panel Admin (tersimpan otomatis, tanpa tombol "Simpan" terpisah).

---

# Catatan Setup — Fitur Titik Lokasi

Berhubung tabel `lokasi` di project Supabase kamu sudah ada SEBELUM
fitur ini dibuatkan (dari setup awal project), beberapa file SQL di
sini dibuat bertahap untuk menyesuaikan skema lama ke skema baru.

Kalau kamu setup dari 0 (project Supabase baru, belum ada tabel
`lokasi` sama sekali), CUKUP jalankan:
  1. migration_pengaturan.sql
  2. migration_logo.sql
  3. migration_logo_storage.sql
  4. migration_lokasi.sql
selesai, tidak perlu file "perbaikan_*" / "diagnosa_*".

---

## Kalau kamu melanjutkan project yang SUDAH ADA tabel `lokasi`
(seperti kasus kamu), jalankan urut seperti ini di Supabase SQL
Editor:

1. **migration_lokasi.sql**
   Membuat tabel `desa`, `kategori_lokasi`, bucket storage `lokasi`.
   (Tabel `lokasi` sendiri kemungkinan sudah ada & akan dilewati
   oleh "create table if not exists".)

2. **perbaikan_kolom_lokasi.sql**
   Menambal kolom yang kurang di tabel `lokasi` lama: `kategori_id`,
   `desa_id`, `deskripsi`, `embed_code`, `gambar_url`, `gambar_urls`,
   `created_at`, `updated_at`. Juga refresh schema cache.

3. **perbaikan_relasi_lokasi.sql**
   Memastikan foreign key `kategori_id` -> `kategori_lokasi.id` dan
   `desa_id` -> `desa.id` benar-benar ada (kadang terlewat kalau
   kolomnya sudah ada sebelumnya).

4. **diagnosa_rls_lokasi.sql**
   Berisi query untuk: (a) memperbaiki manual data lama yang
   kategori_id/desa_id-nya masih NULL, dan (b) melihat semua
   kebijakan RLS yang aktif di tabel `lokasi` — dipakai untuk
   menelusuri kenapa update dari Panel Admin sempat tidak
   tersimpan meski tampil "berhasil".

   ⚠️ Status terakhir: kebijakan RLS-nya sudah benar (ada policy
   "Admin manage lokasi" & "lokasi_write_admin" yang mengizinkan
   update untuk user yang login). Kalau update dari Panel Admin
   masih belum tersimpan, kemungkinan penyebabnya di sesi login
   (token) — cek dengan script test di Console browser yang ada di
   percakapan terakhir kita, atau coba logout lalu login ulang di
   Panel Admin sebelum edit data.

---

## File aplikasi

Semua file website (situs publik + Panel Admin) ada di folder ini
seperti biasa — `index.html`, `admin/`, `css/`, `js/`, dst.
Halaman Titik Lokasi ada di `admin/lokasi.html`.

## Header & footer situs publik

**Header** (`index.html`, `lokasi.html`, `umkm.html`,
`tim-pengembang.html`) sekarang satu sumber di `js/header.js`,
ditulis ke halaman lewat `document.write()` yang berjalan SINKRON
(dieksekusi langsung di tempat `<script src="js/header.js">`
diletakkan di `<body>`), BUKAN lewat `fetch()`. Jadi kalau mau ubah
isi header (tambah menu, ubah ikon, dst), cukup edit satu file:
`js/header.js`.

Sebelumnya header sempat dimuat dari `header/header.html` lewat
`fetch()` (via `js/partials.js`), tapi itu menyebabkan header sempat
kosong/berkedip setiap pindah menu karena harus menunggu request
selesai dulu (mirip kasus sidebar admin di InfinityFree). Lalu
sempat ditulis LANGSUNG di keempat file HTML (duplikat 4x) supaya
tidak ada request sama sekali — itu menghilangkan flicker tapi
berarti tiap ubah header harus edit 4 file. Solusi sekarang
(`document.write()` sinkron) menggabungkan keduanya: satu file
sumber, tanpa request jaringan, jadi tetap tidak ada flicker.

**Footer** masih ditulis langsung di tiap file HTML (belum
dipisah). Kalau mau footer juga dipisah dengan cara yang sama,
tinggal minta — polanya sama seperti `js/header.js`.

Folder `header/` dan `partials/` (kalau masih ada) cuma disimpan
sebagai referensi lama, tidak lagi dipakai. `js/partials.js`
sekarang cuma mengisi data dinamis (logo, nama situs, jam layanan,
sosial media di footer) ke markup yang sudah ada — tidak lagi
nge-fetch HTML apa pun, dan tidak lagi menulis markup header
(itu sekarang tugas `js/header.js`).

---

# Catatan Setup — Fitur Prioritas/Pilih Tampil di Beranda (Titik Lokasi & UMKM)

Sebelumnya, preview Titik Lokasi & UMKM di Beranda publik SELALU
menampilkan 4 data yang terbaru ditambahkan (`order by created_at
desc limit 4`) — admin tidak bisa memilih atau mengatur urutannya.

Sekarang admin bisa:
- **Memilih** titik lokasi/UMKM mana saja yang boleh tampil di
  Beranda (switch "Tampil di Beranda" — bisa langsung diklik dari
  kolom **Beranda** di tabel `admin/lokasi.html` & `admin/umkm.html`,
  atau lewat checkbox di form Tambah/Ubah).
- **Memprioritaskan urutan tampil** lewat angka "Urutan Prioritas
  Beranda" (juga bisa diisi langsung dari tabel) — angka lebih kecil
  tampil lebih dulu. Kalau dikosongkan, item tsb tetap jadi kandidat
  (asal switch-nya nyala) dan diurutkan berdasarkan yang terbaru,
  ditaruh setelah semua item yang sudah punya angka prioritas.

Jalankan **migration_beranda_priority.sql** di Supabase SQL Editor
(sekali saja) sebelum pakai fitur ini — ini menambah kolom
`tampil_beranda` (boolean, default `true` supaya data lama tidak
tiba-tiba hilang dari Beranda) dan `urutan_beranda` (angka, boleh
kosong) ke tabel `lokasi` dan `umkm`.

File terkait:
- `migration_beranda_priority.sql` — migrasi kolom di atas.
- `js/main.js` (`loadLokasiPreview`, `loadUmkmPreview`) — query
  Beranda publik sekarang filter `tampil_beranda = true` lalu urutkan
  berdasarkan `urutan_beranda` (kosong ditaruh belakang), baru
  `created_at`.
- `admin/lokasi.html` + `admin/js/lokasi.js`, `admin/umkm.html` +
  `admin/js/umkm.js` — kolom "Beranda" di tabel (switch + input
  angka, langsung tersimpan ke Supabase tiap diubah) dan field
  checkbox + angka prioritas di form Tambah/Ubah.
- `admin/css/admin.css` (bagian "TOGGLE 'TAMPIL DI BERANDA'") —
  style switch & input angka di tabel.
