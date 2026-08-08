// header.js — satu sumber markup header untuk 4 halaman publik (index.html,
// lokasi.html, umkm.html, tim-pengembang.html). Ditulis lewat
// document.write() yang berjalan SINKRON di tempat <script src="js/header.js">
// diletakkan di <body> — bukan lewat fetch(). Dulu header/footer sempat
// dimuat lewat fetch ke header/header.html & sempat bikin header
// kosong/berkedip tiap pindah menu, terutama di hosting InfinityFree
// (lihat CATATAN_SETUP.md). document.write() tidak melakukan request
// jaringan untuk markup-nya sendiri, jadi tidak ada jeda/loading dan
// tidak bisa gagal karena masalah hosting.
//
// CATATAN LOGO: cache logo/nama situs (localStorage, key 'kedewanBrand',
// diisi oleh loadBrandSettings() di js/partials.js setelah ambil data
// dari Supabase) dibaca DI SINI, SEBELUM document.write() dipanggil —
// supaya <img> logo asli langsung ditulis di markup awal. Sebelumnya
// ikon SVG default ditulis dulu, baru diganti ke logo asli lewat script
// terpisah setelah gambar selesai dimuat (img.onload) — itu yang bikin
// logo sempat "berkedip": ikon default kelihatan sekilas, baru berubah
// jadi logo asli. Dengan cache dibaca lebih dulu, kalau logo sudah
// pernah dimuat sebelumnya (ada di cache), logo asli itu yang langsung
// ditulis dari awal, tanpa lewat ikon default sama sekali. Ikon default
// cuma muncul kalau memang belum ada cache sama sekali (mis. kunjungan
// pertama kali / localStorage kosong) — sama seperti dulu.

(function () {
  var page = (location.pathname.split('/').pop() || 'index.html').toLowerCase();

  function navItem(href, label) {
    var isActive = href === page;
    var attrs = isActive ? ' class="active" aria-current="page"' : '';
    return '<li><a href="' + href + '"' + attrs + '>' + label + '</a></li>';
  }

  function escAttr(str) {
    return String(str).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }

  function escText(str) {
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  }

  // Baca cache logo/nama situs SEKARANG (sebelum menulis HTML sama sekali).
  var brand = null;
  try {
    var raw = localStorage.getItem('kedewanBrand');
    if (raw) brand = JSON.parse(raw);
  } catch (e) { /* localStorage nonaktif/rusak: pakai default */ }

  var defaultLogoSvg = '<svg viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="19" stroke="currentColor" stroke-width="1.4"/><path d="M20 8v24M8 20h24" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>';

  var brandLogoInner = defaultLogoSvg;
  if (brand && brand.logo_url) {
    brandLogoInner = '<img src="' + escAttr(brand.logo_url) + '" alt="' + escAttr(brand.site_name || 'Logo') + '" />';
  }

  var brandNameText = (brand && brand.site_name) ? brand.site_name : 'Peta Kedewan';
  var brandTaglineHtml = (brand && brand.site_tagline) ? escText(brand.site_tagline) : 'Portal Peta &amp; UMKM Kecamatan Kedewan';

  // Judul tab juga langsung disesuaikan dari cache (kalau ada), jadi tidak
  // perlu menunggu partials.js selesai fetch Supabase untuk kasus normal.
  if (brand && brand.site_name) {
    document.title = document.title.replace(/^Kedewan/, brand.site_name);
  }

  document.write('\
<header class="site-header">\
  <div class="container">\
    <a href="index.html" class="brand">\
      <span class="brand-logo" id="brandLogo">' + brandLogoInner + '</span>\
      <span><span id="brandName">' + escAttr(brandNameText) + '</span><small id="brandTagline">' + brandTaglineHtml + '</small></span>\
    </a>\
    <nav class="main-nav">\
      <ul>\
        ' + navItem('index.html', 'Beranda') + '\
        ' + navItem('lokasi.html', 'Titik Lokasi') + '\
        ' + navItem('umkm.html', 'UMKM') + '\
        ' + navItem('tim-pengembang.html', 'Tim Pengembang') + '\
      </ul>\
    </nav>\
    <div class="header-actions">\
      <div class="header-search" id="headerSearch">\
        <button type="button" class="icon-btn" id="searchToggle" aria-label="Cari lokasi &amp; UMKM" aria-expanded="false">\
          <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>\
        </button>\
        <div class="search-panel" id="searchPanel" hidden>\
          <div class="search-panel__field">\
            <svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3.5-3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>\
            <input type="text" id="searchInput" placeholder="Cari titik lokasi atau UMKM…" autocomplete="off" />\
            <button type="button" class="search-panel__close" id="searchClose" aria-label="Tutup pencarian">\
              <svg viewBox="0 0 24 24" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>\
            </button>\
          </div>\
          <div class="search-panel__results" id="searchResults">\
            <p class="search-panel__hint">Ketik minimal 2 huruf untuk mulai mencari.</p>\
          </div>\
        </div>\
      </div>\
    </div>\
    <button class="nav-toggle" aria-label="Menu">\
      <svg viewBox="0 0 24 24" fill="none"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>\
    </button>\
  </div>\
</header>\
<div class="nav-backdrop" id="navBackdrop" hidden></div>\
');
})();
