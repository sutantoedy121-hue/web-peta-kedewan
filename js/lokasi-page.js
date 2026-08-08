// lokasi-page.js — logic halaman publik "Titik Lokasi" (lokasi.html)
// Ambil semua titik lokasi dari Supabase, tampilkan sebagai grid kartu,
// dengan filter kategori (chip) & desa (dropdown), plus modal detail
// saat kartu diklik. Sengaja dibuat sederhana: filter dilakukan di sisi
// browser (client-side) karena jumlah data titik lokasi masih kecil.

const lokasiIconPin = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';
const lokasiIconArrow = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function lokasiEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

let allLokasi = [];
let currentFilteredLokasi = [];
let activeKategori = '';
let activeDesa = '';

// ---------- Ambil semua titik lokasi ----------
async function loadAllLokasi() {
  const grid = document.getElementById('lokasi-grid');
  const { data, error } = await supabaseClient
    .from('lokasi')
    .select(`id, nama_lokasi, deskripsi, gambar_url, gambar_urls, embed_code, desa:desa_id ( id, nama_desa ), kategori:kategori_id ( id, nama_kategori )`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-state"><strong>Gagal memuat titik lokasi</strong>${lokasiEscapeHtml(error.message)}</div>`;
    return;
  }

  allLokasi = data || [];
  renderFilterChips();
  renderDesaOptions();
  applyUrlParams();
  renderLokasiGrid();
}

// ---------- Filter chip kategori (dibuat otomatis dari data yang ada) ----------
function renderFilterChips() {
  const wrap = document.getElementById('filterChips');
  const kategoriMap = new Map();
  allLokasi.forEach((loc) => {
    if (loc.kategori) kategoriMap.set(loc.kategori.nama_kategori, true);
  });

  const chips = ['<button type="button" class="filter-chip" data-kategori="">Semua</button>']
    .concat([...kategoriMap.keys()].sort().map((nama) =>
      `<button type="button" class="filter-chip" data-kategori="${lokasiEscapeHtml(nama)}">${lokasiEscapeHtml(nama)}</button>`
    ));
  wrap.innerHTML = chips.join('');

  wrap.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeKategori = btn.dataset.kategori;
      wrap.querySelectorAll('.filter-chip').forEach((b) => b.classList.toggle('active', b === btn));
      renderLokasiGrid();
    });
  });
}

// ---------- Dropdown filter desa ----------
function renderDesaOptions() {
  const select = document.getElementById('filterDesa');
  const desaMap = new Map();
  allLokasi.forEach((loc) => {
    if (loc.desa) desaMap.set(loc.desa.nama_desa, true);
  });

  select.innerHTML = '<option value="">Semua Desa</option>' +
    [...desaMap.keys()].sort().map((nama) => `<option value="${lokasiEscapeHtml(nama)}">${lokasiEscapeHtml(nama)}</option>`).join('');

  select.addEventListener('change', () => {
    activeDesa = select.value;
    renderLokasiGrid();
  });
}

// ---------- Terapkan ?kategori= dari URL (dipakai link "Titik Lokasi" di beranda) ----------
function applyUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const kategori = params.get('kategori');
  if (kategori) {
    activeKategori = kategori;
    const chip = document.querySelector(`.filter-chip[data-kategori="${CSS.escape(kategori)}"]`);
    document.querySelectorAll('.filter-chip').forEach((b) => b.classList.remove('active'));
    if (chip) {
      chip.classList.add('active');
    } else {
      // Kategori dari URL tidak ada di data — tetap tampilkan "Semua" aktif
      // supaya tidak menampilkan grid kosong tanpa penjelasan.
      activeKategori = '';
      document.querySelector('.filter-chip[data-kategori=""]')?.classList.add('active');
    }
  } else {
    document.querySelector('.filter-chip[data-kategori=""]')?.classList.add('active');
  }
}

// ---------- Render grid kartu sesuai filter aktif ----------
function renderLokasiGrid() {
  const grid = document.getElementById('lokasi-grid');
  const filtered = allLokasi.filter((loc) => {
    const matchKategori = !activeKategori || loc.kategori?.nama_kategori === activeKategori;
    const matchDesa = !activeDesa || loc.desa?.nama_desa === activeDesa;
    return matchKategori && matchDesa;
  });

  if (filtered.length === 0) {
    currentFilteredLokasi = [];
    grid.innerHTML = `<div class="empty-state"><strong>Belum ada titik lokasi</strong>Coba ubah filter, atau tunggu admin menambahkan data baru.</div>`;
    return;
  }

  currentFilteredLokasi = filtered;

  grid.innerHTML = filtered.map((loc, idx) => {
    const jumlahFoto = loc.gambar_urls?.length || (loc.gambar_url ? 1 : 0);
    return `
    <div class="loc-card" data-index="${idx}">
      <div class="loc-card__media">
        <span class="badge loc-card__badge">${lokasiEscapeHtml(loc.kategori?.nama_kategori || 'Lokasi')}</span>
        ${loc.gambar_url ? `<img src="${lokasiEscapeHtml(loc.gambar_url)}" alt="${lokasiEscapeHtml(loc.nama_lokasi)}" />` : lokasiIconPin}
      </div>
      <div class="loc-card__overlay">
        <h3 class="loc-card__title">${lokasiEscapeHtml(loc.nama_lokasi)}</h3>
        <span class="loc-card__loc">${lokasiIconPin} ${lokasiEscapeHtml(loc.kategori?.nama_kategori || 'Titik Lokasi')}</span>
        <div class="loc-card__stats">
          <span class="loc-card__stat">${lokasiEscapeHtml(loc.desa?.nama_desa || '-')}</span>
          <span class="loc-card__stat">${jumlahFoto || '-'} Foto</span>
        </div>
        <div class="loc-card__footer">
          <span class="loc-card__price">Lihat Detail</span>
          <span class="loc-card__cta">${lokasiIconArrow}</span>
        </div>
      </div>
    </div>
  `;
  }).join('');

  // Kalau ada ?id= di URL (link dari kartu preview beranda), langsung buka modalnya.
  const idParam = new URLSearchParams(window.location.search).get('id');
  const targetFromUrl = idParam && filtered.find((l) => String(l.id) === idParam);
  if (targetFromUrl) {
    openLokasiModal(targetFromUrl);
  }
}

// ---------- Klik kartu (event delegation) ----------
// Dipasang SEKALI di container grid (bukan per-kartu setiap render),
// supaya tidak ada risiko listener "hilang"/telat terpasang saat grid
// di-render ulang gara-gara ganti filter kategori/desa. Kartu dicocokkan
// lewat data-index (posisi di grid saat ini), BUKAN lewat data-id yang
// di-bolak-balik lewat Number() — supaya tidak rawan NaN kalau id-nya
// bertipe bukan angka biasa.
function initLokasiGridClicks() {
  const grid = document.getElementById('lokasi-grid');
  if (!grid) return;

  grid.addEventListener('click', (event) => {
    const card = event.target.closest('.loc-card');
    if (!card) return;
    const idx = Number(card.dataset.index);
    const loc = currentFilteredLokasi[idx];
    if (!loc) {
      console.warn('[lokasi-page.js] Tidak menemukan data untuk kartu index', idx);
      return;
    }
    openLokasiModal(loc);
  });
}

// ---------- Modal detail ----------
function openLokasiModal(loc) {
  if (!loc) return;

  const modal = document.getElementById('lokasiModal');
  const body = document.getElementById('lokasiModalBody');

  const fotos = (loc.gambar_urls && loc.gambar_urls.length > 0) ? loc.gambar_urls : (loc.gambar_url ? [loc.gambar_url] : []);

  const galeri = fotos.length > 0
    ? `<div class="lokasi-modal__gallery">${fotos.map((url) => `<img src="${lokasiEscapeHtml(url)}" alt="${lokasiEscapeHtml(loc.nama_lokasi)}" />`).join('')}</div>`
    : `<div class="lokasi-modal__gallery lokasi-modal__gallery--empty">${lokasiIconPin}</div>`;

  const peta = loc.embed_code
    ? `<div class="map-frame" style="margin-top:18px;"><iframe src="${lokasiEscapeHtml(loc.embed_code)}" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen></iframe></div>`
    : '';

  body.innerHTML = `
    ${galeri}
    <div class="lokasi-modal__content">
      <div class="badge-row" style="position:static; margin-bottom:10px;">
        <span class="badge">${lokasiEscapeHtml(loc.kategori?.nama_kategori || 'Lokasi')}</span>
        <span class="badge badge-outline">${lokasiEscapeHtml(loc.desa?.nama_desa || 'Kedewan')}</span>
      </div>
      <h2>${lokasiEscapeHtml(loc.nama_lokasi)}</h2>
      <p>${lokasiEscapeHtml(loc.deskripsi || 'Belum ada deskripsi.')}</p>
      ${peta}
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  // Perbarui URL supaya link bisa dibagikan langsung ke lokasi ini,
  // tanpa reload halaman.
  const url = new URL(window.location);
  url.searchParams.set('id', loc.id);
  window.history.replaceState({}, '', url);
}

function closeLokasiModal() {
  document.getElementById('lokasiModal').hidden = true;
  document.body.style.overflow = '';
  const url = new URL(window.location);
  url.searchParams.delete('id');
  window.history.replaceState({}, '', url);
}

// Mobile nav toggle dipindah ke js/partials.js (fungsi initNavToggle).

document.getElementById('lokasiModalClose').addEventListener('click', closeLokasiModal);
document.getElementById('lokasiModalBackdrop').addEventListener('click', closeLokasiModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeLokasiModal();
});

initLokasiGridClicks();
loadAllLokasi();
