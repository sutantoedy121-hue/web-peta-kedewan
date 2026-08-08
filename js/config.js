// config.js
// File konfigurasi koneksi ke Supabase — Web Peta Kecamatan Kedewan
//
// PENTING:
// - Pakai PUBLISHABLE KEY (sb_publishable_...), JANGAN pernah pakai
//   SECRET KEY (sb_secret_...) di file ini karena file ini ada di frontend
//   dan bisa dilihat siapa saja lewat "View Page Source" / DevTools.
// - Project URL harus POLOS, TANPA "/rest/v1/" atau path tambahan lain
//   di belakangnya — supabase-js sudah menambahkan path itu otomatis.
// - File ini WAJIB di-load SETELAH script CDN Supabase, dan SEBELUM
//   script halaman lain (main.js, lokasi.js, umkm.js, dll).

// ⚠️ Cek ulang project ref di bawah ini dengan copy-paste langsung dari
// Supabase Dashboard → Settings → API → tab "General" → kolom "Project URL"
(function () {
  // Dibungkus IIFE + dicek window.supabaseClient supaya file ini AMAN
  // kalau ke-load/ke-eksekusi lebih dari sekali di realm JS yang sama
  // (mis. karena live-reload dev server) — tidak akan error
  // "Identifier 'supabase' has already been declared" lagi.
  if (window.supabaseClient) return;

  const SUPABASE_URL = "https://wwjvrcalaviyidcodfmy.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_ydd0hhmlxOcc7jcqKghEWA_9sOo9d8x";

  window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
})();
