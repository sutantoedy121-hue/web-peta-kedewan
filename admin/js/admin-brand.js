// admin/js/admin-brand.js
// Menerapkan logo & nama situs (tabel `pengaturan`, kolom logo_url /
// site_name) yang diatur admin lewat Panel Admin -> Pengaturan Situs ->
// "Logo Situs", supaya sidebar Panel Admin dan halaman login ikut
// memakai logo yang sama seperti situs publik (bukan ikon bawaan lagi).
// Logikanya sama seperti js/partials.js di situs publik, hanya target
// elemennya beda (sidebar Panel Admin & kartu login), dan cache
// localStorage-nya dibagi bersama (key 'kedewanBrand') supaya kalau
// situs publik sudah pernah dibuka di browser yang sama, logo langsung
// tampil tanpa menunggu fetch ke Supabase.
(function () {
  const BRAND_CACHE_KEY = 'kedewanBrand';

  function applyBrandData(data) {
    const iconTargets = [
      document.getElementById('sidebarBrandIcon'),
      document.getElementById('loginBrandIcon'),
    ];
    if (data.logo_url) {
      iconTargets.forEach((el) => {
        if (!el) return;
        const img = new Image();
        img.onload = () => { el.innerHTML = ''; el.appendChild(img); };
        img.onerror = () => { /* URL rusak/tidak bisa diakses: biarkan ikon default */ };
        img.src = data.logo_url;
        img.alt = data.site_name || 'Logo';
      });
    }

    const nameTargets = [
      document.getElementById('sidebarBrandName'),
      document.getElementById('loginBrandName'),
    ];
    if (data.site_name) {
      nameTargets.forEach((el) => { if (el) el.textContent = data.site_name; });
    }
  }

  // Tampilkan dulu dari cache localStorage (kalau ada) supaya logo asli
  // langsung kelihatan tanpa nunggu round-trip ke Supabase.
  try {
    const raw = localStorage.getItem(BRAND_CACHE_KEY);
    if (raw) applyBrandData(JSON.parse(raw));
  } catch (e) { /* localStorage nonaktif/rusak: biarkan default tampil dulu */ }

  async function loadBrandSettings() {
    if (typeof supabaseClient === 'undefined') return;

    try {
      const { data, error } = await supabaseClient
        .from('pengaturan')
        .select('site_name, site_tagline, logo_url')
        .eq('id', 1)
        .maybeSingle();
      if (error || !data) return;

      applyBrandData(data);

      try {
        localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
      } catch (e) { /* localStorage penuh/nonaktif: abaikan, tidak fatal */ }
    } catch (err) {
      console.error('Gagal memuat pengaturan logo/nama situs:', err);
    }
  }

  loadBrandSettings();
})();
