// search.js — pencarian langsung (live search) untuk ikon cari di header.
// Header ditulis oleh js/header.js lewat document.write() SINKRON, jadi
// elemennya (#searchToggle dkk) sudah ada di DOM begitu script ini
// dijalankan. initHeaderSearch() tetap dipanggil dari partials.js
// (event 'partials:loaded') sebagai titik pemicu yang konsisten dengan
// urutan <script> di HTML, bukan karena masih menunggu header dimuat.

const searchIconLokasi = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';
const searchIconUmkm = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v11h16V9M2 9l2-5h16l2 5M2 9h20M9 13v3M15 13v3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

function searchEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function initHeaderSearch() {
  const wrap = document.getElementById('headerSearch');
  const toggle = document.getElementById('searchToggle');
  const panel = document.getElementById('searchPanel');
  const input = document.getElementById('searchInput');
  const closeBtn = document.getElementById('searchClose');
  const results = document.getElementById('searchResults');

  if (!wrap || !toggle || !panel || !input || !results) {
    console.warn('[search.js] Elemen search di header tidak ditemukan — cek apakah js/header.js berhasil dijalankan.');
    return; // header search belum ada di halaman ini
  }

  // Cegah listener dobel kalau initHeaderSearch() ke-panggil lebih dari sekali
  // (mis. karena partials:loaded ikut dipertahankan sebagai fallback).
  if (toggle.dataset.searchBound === '1') return;
  toggle.dataset.searchBound = '1';

  let debounceTimer = null;
  let requestToken = 0; // biar hasil query lama yang telat tidak menimpa hasil query terbaru

  function openPanel() {
    panel.hidden = false;
    toggle.setAttribute('aria-expanded', 'true');
    setTimeout(() => input.focus(), 0);
  }

  function closePanel() {
    panel.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
  }

  function togglePanel() {
    if (panel.hidden) openPanel();
    else closePanel();
  }

  function renderHint(message, cssClass) {
    results.innerHTML = `<p class="${cssClass || 'search-panel__hint'}">${searchEscapeHtml(message)}</p>`;
  }

  function renderResults(lokasiRows, umkmRows) {
    if (lokasiRows.length === 0 && umkmRows.length === 0) {
      renderHint('Tidak ada hasil yang cocok. Coba kata kunci lain.', 'search-panel__empty');
      return;
    }

    let html = '';

    if (lokasiRows.length > 0) {
      html += '<p class="search-panel__group-label">Titik Lokasi</p>';
      html += lokasiRows.map((row) => `
        <a class="search-result-item" href="lokasi.html?id=${row.id}">
          <span class="search-result-item__thumb">
            ${row.gambar_url ? `<img src="${searchEscapeHtml(row.gambar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />` : searchIconLokasi}
          </span>
          <span class="search-result-item__text">
            <strong>${searchEscapeHtml(row.nama_lokasi)}</strong>
            <span>${searchEscapeHtml(row.desa?.nama_desa || 'Kedewan')}</span>
          </span>
        </a>
      `).join('');
    }

    if (umkmRows.length > 0) {
      html += '<p class="search-panel__group-label">UMKM</p>';
      html += umkmRows.map((row) => `
        <a class="search-result-item" href="umkm.html?id=${row.id}">
          <span class="search-result-item__thumb">
            ${row.gambar_url ? `<img src="${searchEscapeHtml(row.gambar_url)}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px;" />` : searchIconUmkm}
          </span>
          <span class="search-result-item__text">
            <strong>${searchEscapeHtml(row.nama_produk)}</strong>
            <span>${searchEscapeHtml(row.desa?.nama_desa || 'Kedewan')}</span>
          </span>
        </a>
      `).join('');
    }

    results.innerHTML = html;
  }

  async function runSearch(query) {
    const myToken = ++requestToken;

    if (!window.supabaseClient) {
      renderHint('Pencarian belum bisa dipakai (koneksi database belum siap).', 'search-panel__error');
      return;
    }

    renderHint('Mencari…', 'search-panel__loading');

    // Timeout jaga-jaga: kalau query Supabase nggantung/gagal konek dan
    // tidak pernah resolve, jangan biarkan panel nyangkut di "Mencari…" terus.
    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Waktu pencarian habis (timeout). Cek koneksi internet kamu.')), ms)
    );

    let lokasiRes;
    let umkmRes;

    try {
      [lokasiRes, umkmRes] = await Promise.race([
        Promise.all([
          window.supabaseClient
            .from('lokasi')
            .select('id, nama_lokasi, gambar_url, desa:desa_id ( nama_desa )')
            .ilike('nama_lokasi', `%${query}%`)
            .limit(5),
          window.supabaseClient
            .from('umkm')
            .select('id, nama_produk, gambar_url, desa:desa_id ( nama_desa )')
            .ilike('nama_produk', `%${query}%`)
            .limit(5),
        ]),
        timeout(8000),
      ]);
    } catch (err) {
      if (myToken !== requestToken) return;
      console.error('Pencarian gagal:', err);
      renderHint(`Gagal memuat hasil pencarian: ${err.message || 'terjadi kesalahan.'}`, 'search-panel__error');
      return;
    }

    if (myToken !== requestToken) return; // sudah ada pencarian yang lebih baru, buang hasil ini

    if (lokasiRes.error || umkmRes.error) {
      console.error(lokasiRes.error || umkmRes.error);
      const msg = (lokasiRes.error || umkmRes.error).message || 'Gagal memuat hasil pencarian.';
      renderHint(`Gagal memuat hasil pencarian: ${msg}`, 'search-panel__error');
      return;
    }

    renderResults(lokasiRes.data || [], umkmRes.data || []);
  }

  toggle.addEventListener('click', togglePanel);
  closeBtn.addEventListener('click', closePanel);

  input.addEventListener('input', () => {
    const query = input.value.trim();
    clearTimeout(debounceTimer);

    if (query.length < 2) {
      requestToken++; // batalkan query yang mungkin masih berjalan
      renderHint('Ketik minimal 2 huruf untuk mulai mencari.');
      return;
    }

    debounceTimer = setTimeout(() => runSearch(query), 300);
  });

  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) closePanel();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      closePanel();
      toggle.focus();
    }
  });
}

// Dipanggil langsung oleh partials.js setelah header selesai dimuat ke DOM
// (lihat js/partials.js -> loadPartials()). Dibuat global (window.initHeaderSearch)
// supaya tidak bergantung pada urutan/timing custom event antar file.
window.initHeaderSearch = initHeaderSearch;

// Fallback: kalau search.js kebetulan dimuat setelah header sudah lebih dulu
// selesai (mis. urutan script berubah di kemudian hari), tetap coba jalan
// lewat event lama supaya tidak diam-diam gagal.
document.addEventListener('partials:loaded', initHeaderSearch);
