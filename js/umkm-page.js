// umkm-page.js — logic halaman publik "UMKM" (umkm.html)
// Ambil semua produk UMKM dari Supabase, tampilkan sebagai grid kartu,
// dengan filter kategori (chip) & desa (dropdown), plus modal detail
// saat kartu diklik. Sengaja dibuat sederhana: filter dilakukan di sisi
// browser (client-side) karena jumlah data UMKM masih kecil.
// Polanya sengaja disamakan dengan js/lokasi-page.js supaya konsisten.

const umkmIconStore = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v11h16V9M2 9l2-5h16l2 5M2 9h20M9 13v3M15 13v3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const umkmIconArrow = '<svg viewBox="0 0 24 24" fill="none"><path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const umkmIconWhatsapp = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.7 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.2-.2-.5-.3Z"/><path d="M12 2a10 10 0 0 0-8.6 15l-1 3.7 3.8-1A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.5.7.7-2.4-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';

function umkmEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

let allUmkm = [];
let currentFilteredUmkm = [];
let activeUmkmKategori = '';
let activeUmkmDesa = '';

// ---------- Ambil semua produk UMKM ----------
async function loadAllUmkm() {
  const grid = document.getElementById('umkm-grid');
  const { data, error } = await supabaseClient
    .from('umkm')
    .select(`id, nama_produk, nama_pemilik, harga, deskripsi, alamat, no_wa, gambar_url, gambar_urls, desa:desa_id ( id, nama_desa ), kategori:kategori_id ( id, nama_kategori )`)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    grid.innerHTML = `<div class="empty-state"><strong>Gagal memuat UMKM</strong>${umkmEscapeHtml(error.message)}</div>`;
    return;
  }

  allUmkm = data || [];
  renderUmkmFilterChips();
  renderUmkmDesaOptions();
  applyUmkmUrlParams();
  renderUmkmGrid();
}

// ---------- Filter chip kategori (dibuat otomatis dari data yang ada) ----------
function renderUmkmFilterChips() {
  const wrap = document.getElementById('filterChips');
  const kategoriMap = new Map();
  allUmkm.forEach((item) => {
    if (item.kategori) kategoriMap.set(item.kategori.nama_kategori, true);
  });

  const chips = ['<button type="button" class="filter-chip" data-kategori="">Semua</button>']
    .concat([...kategoriMap.keys()].sort().map((nama) =>
      `<button type="button" class="filter-chip" data-kategori="${umkmEscapeHtml(nama)}">${umkmEscapeHtml(nama)}</button>`
    ));
  wrap.innerHTML = chips.join('');

  wrap.querySelectorAll('.filter-chip').forEach((btn) => {
    btn.addEventListener('click', () => {
      activeUmkmKategori = btn.dataset.kategori;
      wrap.querySelectorAll('.filter-chip').forEach((b) => b.classList.toggle('active', b === btn));
      renderUmkmGrid();
    });
  });
}

// ---------- Dropdown filter desa ----------
function renderUmkmDesaOptions() {
  const select = document.getElementById('filterDesa');
  const desaMap = new Map();
  allUmkm.forEach((item) => {
    if (item.desa) desaMap.set(item.desa.nama_desa, true);
  });

  select.innerHTML = '<option value="">Semua Desa</option>' +
    [...desaMap.keys()].sort().map((nama) => `<option value="${umkmEscapeHtml(nama)}">${umkmEscapeHtml(nama)}</option>`).join('');

  select.addEventListener('change', () => {
    activeUmkmDesa = select.value;
    renderUmkmGrid();
  });
}

// ---------- Terapkan ?kategori= dari URL (dipakai link "UMKM" di beranda) ----------
function applyUmkmUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const kategori = params.get('kategori');
  if (kategori) {
    activeUmkmKategori = kategori;
    const chip = document.querySelector(`.filter-chip[data-kategori="${CSS.escape(kategori)}"]`);
    document.querySelectorAll('.filter-chip').forEach((b) => b.classList.remove('active'));
    if (chip) {
      chip.classList.add('active');
    } else {
      // Kategori dari URL tidak ada di data — tetap tampilkan "Semua" aktif
      // supaya tidak menampilkan grid kosong tanpa penjelasan.
      activeUmkmKategori = '';
      document.querySelector('.filter-chip[data-kategori=""]')?.classList.add('active');
    }
  } else {
    document.querySelector('.filter-chip[data-kategori=""]')?.classList.add('active');
  }
}

// ---------- Render grid kartu sesuai filter aktif ----------
function renderUmkmGrid() {
  const grid = document.getElementById('umkm-grid');
  const filtered = allUmkm.filter((item) => {
    const matchKategori = !activeUmkmKategori || item.kategori?.nama_kategori === activeUmkmKategori;
    const matchDesa = !activeUmkmDesa || item.desa?.nama_desa === activeUmkmDesa;
    return matchKategori && matchDesa;
  });

  if (filtered.length === 0) {
    currentFilteredUmkm = [];
    grid.innerHTML = `<div class="empty-state"><strong>Belum ada produk UMKM</strong>Coba ubah filter, atau tunggu admin menambahkan data baru.</div>`;
    return;
  }

  currentFilteredUmkm = filtered;

  grid.innerHTML = filtered.map((item, idx) => {
    const waNumber = (item.no_wa || '').replace(/[^\d]/g, '');
    return `
    <div class="loc-card" data-index="${idx}">
      <div class="loc-card__media">
        <span class="badge loc-card__badge">${umkmEscapeHtml(item.kategori?.nama_kategori || 'UMKM')}</span>
        ${item.gambar_url ? `<img src="${umkmEscapeHtml(item.gambar_url)}" alt="${umkmEscapeHtml(item.nama_produk)}" />` : umkmIconStore}
      </div>
      <div class="loc-card__overlay">
        <h3 class="loc-card__title">${umkmEscapeHtml(item.nama_produk)}</h3>
        <span class="loc-card__loc">${umkmIconStore} ${umkmEscapeHtml(item.desa?.nama_desa || 'Kedewan')}</span>
        <div class="loc-card__footer">
          <span class="loc-card__price">${umkmEscapeHtml(item.harga || 'Hubungi')}</span>
          ${waNumber
            ? `<a class="loc-card__cta umkm-card__cta" href="https://wa.me/${waNumber}" target="_blank" rel="noopener" aria-label="Chat WhatsApp: ${umkmEscapeHtml(item.nama_produk)}" data-wa-action="1">${umkmIconWhatsapp} WA</a>`
            : `<span class="loc-card__cta umkm-card__cta" aria-disabled="true">${umkmIconWhatsapp} WA</span>`}
        </div>
      </div>
    </div>
  `;
  }).join('');

  grid.querySelectorAll('.loc-card').forEach((card) => {
    card.classList.add('card-clickable');
  });

  // Kalau ada ?id= di URL (link dari kartu preview beranda), langsung buka modalnya.
  const idParam = new URLSearchParams(window.location.search).get('id');
  const targetFromUrl = idParam && filtered.find((u) => String(u.id) === idParam);
  if (targetFromUrl) {
    openUmkmModal(targetFromUrl);
  }
}

// ---------- Klik kartu / tombol WA (event delegation) ----------
// Dipasang SEKALI di container grid (bukan per-kartu setiap render),
// supaya tidak ada risiko listener "hilang"/telat terpasang saat grid
// di-render ulang gara-gara ganti filter kategori/desa. Kartu dicocokkan
// lewat data-index (posisi di grid saat ini), BUKAN lewat data-id yang
// di-bolak-balik lewat Number() — supaya tidak rawan NaN kalau id-nya
// bertipe bukan angka biasa.
function initUmkmGridClicks() {
  const grid = document.getElementById('umkm-grid');
  if (!grid) return;

  grid.addEventListener('click', (event) => {
    // Tombol WA: biarkan link-nya jalan (buka wa.me di tab baru),
    // tapi jangan sampai ikut membuka modal detail.
    if (event.target.closest('[data-wa-action]')) return;

    const card = event.target.closest('.loc-card');
    if (!card) return;
    const idx = Number(card.dataset.index);
    const item = currentFilteredUmkm[idx];
    if (!item) {
      console.warn('[umkm-page.js] Tidak menemukan data untuk kartu index', idx);
      return;
    }
    openUmkmModal(item);
  });
}

// ---------- Modal detail ----------
function openUmkmModal(item) {
  if (!item) return;

  const modal = document.getElementById('umkmModal');
  const body = document.getElementById('umkmModalBody');

  const fotos = (item.gambar_urls && item.gambar_urls.length > 0) ? item.gambar_urls : (item.gambar_url ? [item.gambar_url] : []);

  const galeri = fotos.length > 0
    ? `<div class="lokasi-modal__gallery">${fotos.map((url) => `<img src="${umkmEscapeHtml(url)}" alt="${umkmEscapeHtml(item.nama_produk)}" />`).join('')}</div>`
    : `<div class="lokasi-modal__gallery lokasi-modal__gallery--empty">${umkmIconStore}</div>`;

  const waNumber = (item.no_wa || '').replace(/[^\d]/g, '');
  const waHref = waNumber ? `https://wa.me/${waNumber}` : null;

  body.innerHTML = `
    ${galeri}
    <div class="lokasi-modal__content">
      <div class="badge-row" style="position:static; margin-bottom:10px;">
        <span class="badge">${umkmEscapeHtml(item.kategori?.nama_kategori || 'UMKM')}</span>
        <span class="badge badge-outline">${umkmEscapeHtml(item.desa?.nama_desa || 'Kedewan')}</span>
      </div>
      <h2>${umkmEscapeHtml(item.nama_produk)}</h2>
      ${item.nama_pemilik ? `<p style="margin-bottom:6px;"><strong>Pemilik:</strong> ${umkmEscapeHtml(item.nama_pemilik)}</p>` : ''}
      ${item.harga ? `<p style="margin-bottom:6px;"><strong>Harga:</strong> ${umkmEscapeHtml(item.harga)}</p>` : ''}
      ${item.alamat ? `<p style="margin-bottom:6px;"><strong>Alamat:</strong> ${umkmEscapeHtml(item.alamat)}</p>` : ''}
      <p>${umkmEscapeHtml(item.deskripsi || 'Belum ada deskripsi.')}</p>
      ${waHref ? `<a class="btn btn-navy" style="margin-top:16px;" href="${waHref}" target="_blank" rel="noopener">${umkmIconWhatsapp} Hubungi via WhatsApp</a>` : ''}
    </div>
  `;

  modal.hidden = false;
  document.body.style.overflow = 'hidden';

  // Perbarui URL supaya link bisa dibagikan langsung ke produk ini,
  // tanpa reload halaman.
  const url = new URL(window.location);
  url.searchParams.set('id', item.id);
  window.history.replaceState({}, '', url);
}

function closeUmkmModal() {
  document.getElementById('umkmModal').hidden = true;
  document.body.style.overflow = '';
  const url = new URL(window.location);
  url.searchParams.delete('id');
  window.history.replaceState({}, '', url);
}

// Mobile nav toggle dipindah ke js/partials.js (fungsi initNavToggle).

document.getElementById('umkmModalClose').addEventListener('click', closeUmkmModal);
document.getElementById('umkmModalBackdrop').addEventListener('click', closeUmkmModal);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeUmkmModal();
});

// ---------- Box "Mau jual produkmu di sini?" ----------
// Ambil info biaya upload produk + nomor WA kontak dari tabel
// `pengaturan` (kolom umkm_fee, umkm_fee_wa), diisi admin lewat Panel
// Admin -> UMKM -> "Info Biaya Upload Produk" (lihat migration_umkm_fee.sql
// & admin/js/umkm.js). Box otomatis disembunyikan kalau kedua kolom kosong.
function umkmNormalizeWa(raw) {
  let digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62')) digits = '62' + digits;
  return digits;
}

async function loadUmkmCta() {
  const box = document.getElementById('umkmCtaBox');
  if (!box) return;

  const { data, error } = await supabaseClient
    .from('pengaturan')
    .select('umkm_fee, umkm_fee_wa')
    .eq('id', 1)
    .maybeSingle();

  if (error || !data) return;

  const fee = (data.umkm_fee || '').trim();
  const waDigits = umkmNormalizeWa(data.umkm_fee_wa || '');
  if (!fee && !waDigits) return; // belum diatur admin, box tetap disembunyikan

  const textEl = document.getElementById('umkmCtaText');
  const waBtn = document.getElementById('umkmCtaWaBtn');

  textEl.textContent = 'Publikasikan produk UMKM-mu di website Desa Kedewan dan bantu produk lokal semakin dikenal luas.';

  if (waDigits) {
    const pesan = encodeURIComponent(
      `Halo, saya ingin mempublikasikan produk UMKM di Peta Kedewan${fee ? ` (biaya ${fee})` : ''}.`
    );
    waBtn.href = `https://wa.me/${waDigits}?text=${pesan}`;
  } else {
    waBtn.style.display = 'none';
  }

  box.hidden = false;
}

initUmkmGridClicks();
loadAllUmkm();
loadUmkmCta();
