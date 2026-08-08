// main.js — logic halaman Beranda Web Peta Kecamatan Kedewan
// Mengambil data desa, titik lokasi, UMKM, dan peta kecamatan dari Supabase.

const iconMapPin = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';
const iconStore = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v11h16V9M2 9l2-5h16l2 5M2 9h20M9 13v3M15 13v3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const iconArrow = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const iconVillage = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 20V10l8-6 8 6v10" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const iconWhatsapp = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.7 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.2-.2-.5-.3Z"/><path d="M12 2a10 10 0 0 0-8.6 15l-1 3.7 3.8-1A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.5.7.7-2.4-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- Mobile nav toggle ----------
// Dipindah ke js/partials.js (fungsi initNavToggle) supaya tidak lagi
// bergantung pada event 'partials:loaded' yang sudah lewat duluan.

// ---------- Titik Lokasi preview ----------
async function loadLokasiPreview() {
  const grid = document.getElementById('lokasi-grid');
  const { data, error } = await supabaseClient
    .from('lokasi')
    .select(`id, nama_lokasi, gambar_url, deskripsi, desa:desa_id ( nama_desa ), kategori:kategori_id ( nama_kategori )`)
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-state"><strong>Gagal memuat titik lokasi</strong>${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><strong>Belum ada titik lokasi</strong>Data akan muncul di sini setelah admin menambahkannya lewat Panel Admin / Table Editor.</div>`;
    return;
  }

  grid.innerHTML = data.map((loc) => {
    const jumlahFoto = loc.gambar_urls?.length || (loc.gambar_url ? 1 : 0);
    return `
    <a class="loc-card" href="lokasi.html?id=${loc.id}">
      <div class="loc-card__media">
        <span class="badge loc-card__badge">${escapeHtml(loc.kategori?.nama_kategori || 'Lokasi')}</span>
        ${loc.gambar_url ? `<img src="${escapeHtml(loc.gambar_url)}" alt="${escapeHtml(loc.nama_lokasi)}" />` : iconMapPin}
      </div>
      <div class="loc-card__overlay">
        <h3 class="loc-card__title">${escapeHtml(loc.nama_lokasi)}</h3>
        <span class="loc-card__loc">${iconMapPin} ${escapeHtml(loc.kategori?.nama_kategori || 'Titik Lokasi')}</span>
        <div class="loc-card__stats">
          <span class="loc-card__stat">${escapeHtml(loc.desa?.nama_desa || '-')}</span>
          <span class="loc-card__stat">${jumlahFoto || '-'} Foto</span>
        </div>
        <div class="loc-card__footer">
          <span class="loc-card__price">Lihat Detail</span>
          <span class="loc-card__cta">${iconArrow}</span>
        </div>
      </div>
    </a>
  `;
  }).join('');
}

// ---------- UMKM preview ----------
async function loadUmkmPreview() {
  const grid = document.getElementById('umkm-grid');
  const { data, error } = await supabaseClient
    .from('umkm')
    .select(`id, nama_produk, gambar_url, deskripsi, no_wa, harga, desa:desa_id ( nama_desa ), kategori:kategori_id ( nama_kategori )`)
    .order('created_at', { ascending: false })
    .limit(4);

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-state"><strong>Gagal memuat UMKM</strong>${escapeHtml(error.message)}</div>`;
    return;
  }

  if (!data || data.length === 0) {
    grid.innerHTML = `<div class="empty-state"><strong>Belum ada produk UMKM</strong>Data akan muncul di sini setelah admin menambahkannya lewat Panel Admin / Table Editor.</div>`;
    return;
  }

  grid.innerHTML = data.map((item) => {
    const waNumber = (item.no_wa || '').replace(/[^\d]/g, '');
    const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

    return `
    <a class="umkm-card" href="umkm.html?id=${item.id}">
      <div class="umkm-card__media">
        <span class="badge umkm-card__badge">${escapeHtml(item.kategori?.nama_kategori || 'UMKM')}</span>
        ${item.gambar_url ? `<img src="${escapeHtml(item.gambar_url)}" alt="${escapeHtml(item.nama_produk)}" />` : iconStore}
      </div>
      <div class="umkm-card__overlay">
        <h3 class="umkm-card__title">${escapeHtml(item.nama_produk)}</h3>
        <span class="umkm-card__loc">${iconVillage} ${escapeHtml(item.desa?.nama_desa || 'Kedewan')}</span>
        <div class="umkm-card__footer">
          <span class="umkm-card__price">${escapeHtml(item.harga || 'Hubungi')}</span>
          ${waHref
            ? `<span class="umkm-card__cta">${iconWhatsapp} WA</span>`
            : `<span class="umkm-card__cta" aria-disabled="true">${iconWhatsapp} WA</span>`}
        </div>
      </div>
    </a>
  `;
  }).join('');
}

// ---------- Peta kecamatan ----------
async function loadPetaKecamatan() {
  const frame = document.getElementById('map-frame');
  const { data, error } = await supabaseClient.from('peta_kecamatan').select('embed_code').limit(1).maybeSingle();

  if (error) {
    console.error(error);
    return; // biarkan placeholder default tampil
  }

  if (data && data.embed_code) {
    const raw = data.embed_code.trim();
    // Admin panel menyimpan LINK saja (bukan tag <iframe> lengkap), jadi
    // di sini kita bungkus jadi <iframe> yang valid. Kalau suatu saat ada
    // data lama yang kebetulan sudah berupa tag <iframe>, tetap didukung.
    frame.innerHTML = /^<iframe/i.test(raw)
      ? raw
      : `<iframe src="${escapeHtml(raw)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe>`;
  } else {
    frame.querySelector('.map-placeholder strong').textContent = 'Peta kecamatan belum diatur';
    frame.querySelector('.map-placeholder span').textContent = 'Admin bisa menambahkan kode embed Google Maps lewat Panel Admin.';
  }
}

loadLokasiPreview();
loadUmkmPreview();
loadPetaKecamatan();