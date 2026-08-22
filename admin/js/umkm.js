// admin/js/umkm.js
// Logic halaman UMKM: CRUD tabel `umkm`, kategori (tabel `kategori_umkm`,
// bisa tambah kategori baru langsung dari modal), letak desa (tabel
// `desa`, dipakai bareng dengan halaman Titik Lokasi), rapi-rapi nomor
// WhatsApp, tombol "Hubungi via WhatsApp" langsung dari tabel, dan
// upload beberapa foto sekaligus ke Supabase Storage (bucket "umkm").
//
// Nama tabel/kolom disamakan dengan yang sudah dipakai js/main.js di
// beranda publik (lihat migration_umkm.sql), jadi data yang ditambahkan
// di sini otomatis tampil di beranda publik juga.

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// Rapikan nomor WhatsApp jadi format internasional tanpa "+"/spasi/strip
// supaya bisa langsung dipakai di link wa.me/<nomor>.
// Menerima: 08123456789, +6281234567, 6281234567, 0812-3456-789, dll.
function normalizeWaNumber(raw) {
  let digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62')) digits = '62' + digits;
  return digits;
}

const UMKM_BUCKET = 'umkm';
const MAX_IMAGE_SIZE_MB = 3;
const iconStore = '<svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M4 9v11h16V9M2 9l2-5h16l2 5M2 9h20M9 13v3M15 13v3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const iconWhatsapp = '<svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.7 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.2-.2-.5-.3Z"/><path d="M12 2a10 10 0 0 0-8.6 15l-1 3.7 3.8-1A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.5.7.7-2.4-.2-.3A8.2 8.2 0 1 1 12 20.2Z"/></svg>';

// ---------- State ----------
let kategoriList = [];
let desaList = [];
let umkmList = [];        // cache data mentah dari server, dipakai untuk filter di client
let currentImages = [];   // [{url, path}] — foto yang sudah terunggah untuk UMKM yang sedang diedit
let editingId = null;

// ---------- Alert ----------
let alertTimer = null;
function showAlert(message, type) {
  const box = document.getElementById('umkmAlert');
  if (alertTimer) clearTimeout(alertTimer);
  box.className = `alert alert--${type}`;
  box.style.opacity = '1';
  box.style.display = 'flex';
  box.textContent = (type === 'success' ? '✅ ' : '⚠️ ') + message;
  alertTimer = setTimeout(() => {
    box.style.transition = 'opacity .4s';
    box.style.opacity = '0';
    setTimeout(() => { box.style.display = 'none'; }, 400);
  }, 4500);
}

// ---------- Load kategori & desa (dipakai select filter + select modal) ----------
async function loadKategori() {
  try {
    const { data, error } = await withTimeout(
      supabaseClient.from('kategori_umkm').select('*').order('nama_kategori'),
      8000
    );
    if (error) throw error;
    kategoriList = data || [];
  } catch (err) {
    console.error('Gagal memuat kategori:', err);
    showAlert('Gagal memuat daftar kategori. Pastikan tabel "kategori_umkm" sudah dibuat (lihat migration_umkm.sql).', 'error');
    kategoriList = [];
  }

  const filterSel = document.getElementById('filterKategori');
  const modalSel = document.getElementById('kategori_id');
  const filterCurrent = filterSel.value;
  const modalCurrent = modalSel.value;

  filterSel.innerHTML = '<option value="">Semua Kategori</option>' +
    kategoriList.map(k => `<option value="${k.id}">${escapeHtml(k.nama_kategori)}</option>`).join('');
  modalSel.innerHTML = '<option value="">Pilih kategori…</option>' +
    kategoriList.map(k => `<option value="${k.id}">${escapeHtml(k.nama_kategori)}</option>`).join('');

  filterSel.value = filterCurrent;
  modalSel.value = modalCurrent;
}

async function loadDesa() {
  try {
    const { data, error } = await withTimeout(
      supabaseClient.from('desa').select('*').order('nama_desa'),
      8000
    );
    if (error) throw error;
    desaList = data || [];
  } catch (err) {
    console.error('Gagal memuat desa:', err);
    showAlert('Gagal memuat daftar desa. Pastikan tabel "desa" sudah dibuat (lihat migration_lokasi.sql).', 'error');
    desaList = [];
  }

  const filterSel = document.getElementById('filterDesa');
  const modalSel = document.getElementById('desa_id');
  const filterCurrent = filterSel.value;
  const modalCurrent = modalSel.value;

  filterSel.innerHTML = '<option value="">Semua Desa</option>' +
    desaList.map(d => `<option value="${d.id}">${escapeHtml(d.nama_desa)}</option>`).join('');
  modalSel.innerHTML = '<option value="">Pilih desa…</option>' +
    desaList.map(d => `<option value="${d.id}">${escapeHtml(d.nama_desa)}</option>`).join('');

  filterSel.value = filterCurrent;
  modalSel.value = modalCurrent;
}

async function addKategoriBaru() {
  const input = document.getElementById('newKategoriInput');
  const nama = input.value.trim();
  if (!nama) {
    showAlert('Ketik dulu nama kategori baru sebelum klik "Tambah Kategori".', 'error');
    return;
  }
  try {
    const { data, error } = await supabaseClient
      .from('kategori_umkm')
      .insert({ nama_kategori: nama })
      .select()
      .maybeSingle();
    if (error) throw error;
    await loadKategori();
    if (data) document.getElementById('kategori_id').value = data.id;
    input.value = '';
    showAlert(`Kategori "${nama}" berhasil ditambahkan.`, 'success');
  } catch (err) {
    console.error('Gagal menambah kategori:', err);
    const isDup = /duplicate|unique/i.test(err.message || '');
    showAlert(isDup ? `Kategori "${nama}" sudah ada.` : 'Gagal menambah kategori: ' + (err.message || err), 'error');
  }
}

// ---------- Load & render tabel umkm ----------
async function loadUmkm() {
  const tbody = document.getElementById('umkmTableBody');
  tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">Memuat data…</div></td></tr>`;

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('umkm')
        .select('id, nama_produk, nama_pemilik, harga, deskripsi, alamat, no_wa, gambar_url, gambar_urls, kategori_id, desa_id, tampil_beranda, urutan_beranda, kategori:kategori_id ( nama_kategori ), desa:desa_id ( nama_desa )')
        .order('created_at', { ascending: false }),
      8000
    );
    if (error) throw error;
    umkmList = data || [];
    renderTable();
  } catch (err) {
    console.error('Gagal memuat data UMKM:', err);
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state" style="color:#c94040;">Gagal memuat data. ${
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis.'
        : 'Pastikan tabel "umkm" sudah dibuat (lihat migration_umkm.sql).'
    }</div></td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('umkmTableBody');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const kategoriFilter = document.getElementById('filterKategori').value;
  const desaFilter = document.getElementById('filterDesa').value;

  const filtered = umkmList.filter(row => {
    if (q && !(`${row.nama_produk || ''} ${row.nama_pemilik || ''}`).toLowerCase().includes(q)) return false;
    if (kategoriFilter && String(row.kategori_id) !== kategoriFilter) return false;
    if (desaFilter && String(row.desa_id) !== desaFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state">
      <div class="ic">🏪</div>${umkmList.length === 0
        ? 'Belum ada produk UMKM. Klik "Tambah UMKM" untuk menambahkan.'
        : 'Tidak ada produk UMKM yang cocok dengan pencarian/filter.'}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => {
    const waNumber = normalizeWaNumber(row.no_wa);
    return `
    <tr>
      <td>
        <div class="thumb">${row.gambar_url ? `<img src="${escapeHtml(row.gambar_url)}" alt="">` : iconStore}</div>
      </td>
      <td>
        <strong>${escapeHtml(row.nama_produk)}</strong>
        ${row.nama_pemilik ? `<div style="color:var(--ink-soft); font-size:.78rem;">${escapeHtml(row.nama_pemilik)}</div>` : ''}
      </td>
      <td>${row.kategori?.nama_kategori ? `<span class="badge badge--amber">${escapeHtml(row.kategori.nama_kategori)}</span>` : '<span class="badge badge--gray">–</span>'}</td>
      <td>${escapeHtml(row.desa?.nama_desa || '–')}</td>
      <td>${escapeHtml(row.harga || '–')}</td>
      <td>${waNumber ? `<span class="badge badge--green">${escapeHtml(waNumber)}</span>` : '<span class="badge badge--gray">Belum ada</span>'}</td>
      <td>
        <div class="beranda-cell" title="Tampil di Beranda Publik">
          <label class="switch">
            <input type="checkbox" data-beranda-toggle="${row.id}" ${row.tampil_beranda !== false ? 'checked' : ''}>
            <span class="switch__slider"></span>
          </label>
          <input type="number" class="beranda-cell__order" data-beranda-urutan="${row.id}" value="${row.urutan_beranda ?? ''}" placeholder="–" min="0" step="1" title="Urutan prioritas (kosong = terbaru dulu)" ${row.tampil_beranda === false ? 'disabled' : ''}>
        </div>
      </td>
      <td>
        <div class="row-actions">
          <button type="button" class="icon-btn ${waNumber ? 'icon-btn--whatsapp' : 'icon-btn--disabled'}" data-wa="${waNumber}" title="${waNumber ? 'Hubungi via WhatsApp' : 'Nomor WhatsApp belum diisi'}" ${waNumber ? '' : 'disabled'}>
            ${iconWhatsapp}
          </button>
          <button type="button" class="icon-btn" data-edit="${row.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete="${row.id}" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `;
  }).join('');

  tbody.querySelectorAll('[data-wa]').forEach(btn => {
    if (!btn.dataset.wa) return;
    btn.addEventListener('click', () => {
      window.open(`https://wa.me/${btn.dataset.wa}`, '_blank', 'noopener');
    });
  });
  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = umkmList.find(r => String(r.id) === btn.dataset.edit);
      if (row) openModal('edit', row);
    });
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteUmkm(btn.dataset.delete));
  });
  tbody.querySelectorAll('[data-beranda-toggle]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.berandaToggle;
      const orderInput = tbody.querySelector(`[data-beranda-urutan="${id}"]`);
      if (orderInput) orderInput.disabled = !input.checked;
      updateBerandaField(id, { tampil_beranda: input.checked });
    });
  });
  tbody.querySelectorAll('[data-beranda-urutan]').forEach(input => {
    input.addEventListener('change', () => {
      const id = input.dataset.berandaUrutan;
      const raw = input.value.trim();
      updateBerandaField(id, { urutan_beranda: raw === '' ? null : parseInt(raw, 10) });
    });
  });
}

// ---------- Update cepat "Tampil di Beranda" / urutan prioritas dari tabel ----------
async function updateBerandaField(id, patch) {
  try {
    const { error } = await supabaseClient.from('umkm').update(patch).eq('id', id);
    if (error) throw error;
    const row = umkmList.find(r => String(r.id) === String(id));
    if (row) Object.assign(row, patch);
    showAlert(
      'tampil_beranda' in patch
        ? (patch.tampil_beranda ? 'Produk UMKM akan tampil di Beranda.' : 'Produk UMKM disembunyikan dari Beranda.')
        : 'Urutan prioritas Beranda berhasil diperbarui.',
      'success'
    );
  } catch (err) {
    console.error('Gagal memperbarui pengaturan Beranda:', err);
    showAlert('Gagal memperbarui pengaturan Beranda: ' + (err.message || err), 'error');
    loadUmkm();
  }
}

// ---------- Upload gambar ----------
function renderImageGrid() {
  const grid = document.getElementById('imageGrid');
  if (currentImages.length === 0) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = currentImages.map((img, idx) => `
    <div class="image-grid__item">
      <img src="${escapeHtml(img.url)}" alt="">
      ${idx === 0 ? '<span class="image-grid__cover">Sampul</span>' : ''}
      <button type="button" class="image-grid__remove" data-remove-image="${idx}" title="Hapus foto">×</button>
    </div>
  `).join('');

  grid.querySelectorAll('[data-remove-image]').forEach(btn => {
    btn.addEventListener('click', () => removeImage(parseInt(btn.dataset.removeImage, 10)));
  });
}

async function removeImage(idx) {
  const img = currentImages[idx];
  if (!img) return;
  currentImages.splice(idx, 1);
  renderImageGrid();
  if (img.path) {
    try { await supabaseClient.storage.from(UMKM_BUCKET).remove([img.path]); }
    catch (err) { console.error('Gagal menghapus file lama dari storage:', err); }
  }
}

async function uploadImages(files) {
  const statusEl = document.getElementById('gambarUploadStatus');
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  for (const file of files) {
    if (!allowedTypes.includes(file.type)) {
      showAlert(`Format "${file.name}" tidak didukung. Gunakan PNG, JPG, atau WEBP.`, 'error');
      continue;
    }
    if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
      showAlert(`Ukuran "${file.name}" melebihi ${MAX_IMAGE_SIZE_MB}MB.`, 'error');
      continue;
    }

    statusEl.textContent = `Mengunggah ${file.name}…`;
    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `umkm-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await withTimeout(
        supabaseClient.storage.from(UMKM_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false }),
        20000
      );
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from(UMKM_BUCKET).getPublicUrl(path);
      const publicUrl = publicUrlData && publicUrlData.publicUrl;
      if (!publicUrl) throw new Error('Gagal mendapatkan URL publik foto.');

      currentImages.push({ url: publicUrl, path });
      renderImageGrid();
    } catch (err) {
      console.error('Gagal mengunggah foto:', err);
      showAlert(
        'Gagal mengunggah ' + file.name + ': ' + (err.message === 'TIMEOUT' ? 'waktu unggah habis.' : (err.message || err)) +
        ' Pastikan bucket "umkm" sudah dibuat (lihat migration_umkm.sql).',
        'error'
      );
    }
  }
  statusEl.textContent = 'Bisa unggah lebih dari 1 foto sekaligus (maks. 3MB / foto). Foto pertama jadi foto sampul.';
}

// ---------- Modal ----------
function openModal(mode, row) {
  editingId = mode === 'edit' ? row.id : null;
  document.getElementById('modalTitle').textContent = mode === 'edit' ? 'Ubah Produk UMKM' : 'Tambah Produk UMKM';
  document.getElementById('umkm_id').value = row ? row.id : '';
  document.getElementById('nama_produk').value = row ? row.nama_produk || '' : '';
  document.getElementById('nama_pemilik').value = row ? row.nama_pemilik || '' : '';
  document.getElementById('harga').value = row ? row.harga || '' : '';
  document.getElementById('kategori_id').value = row ? (row.kategori_id || '') : '';
  document.getElementById('desa_id').value = row ? (row.desa_id || '') : '';
  document.getElementById('no_wa').value = row ? row.no_wa || '' : '';
  document.getElementById('alamat').value = row ? row.alamat || '' : '';
  document.getElementById('deskripsi').value = row ? row.deskripsi || '' : '';
  document.getElementById('tampil_beranda').checked = row ? row.tampil_beranda !== false : true;
  document.getElementById('urutan_beranda').value = row && row.urutan_beranda != null ? row.urutan_beranda : '';
  document.getElementById('newKategoriInput').value = '';
  document.getElementById('gambar_file').value = '';
  document.getElementById('gambarUploadStatus').textContent = 'Bisa unggah lebih dari 1 foto sekaligus (maks. 3MB / foto). Foto pertama jadi foto sampul.';

  currentImages = (row && Array.isArray(row.gambar_urls) && row.gambar_urls.length > 0)
    ? row.gambar_urls.map(url => ({ url, path: null })) // path null = foto lama, tombol hapus hanya lepas dari daftar
    : (row && row.gambar_url ? [{ url: row.gambar_url, path: null }] : []);
  renderImageGrid();

  document.getElementById('umkmModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('umkmModal').style.display = 'none';
  editingId = null;
  currentImages = [];
}

async function saveUmkm(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveUmkm');
  const originalLabel = btn.textContent;

  const namaProduk = document.getElementById('nama_produk').value.trim();
  const desaId = document.getElementById('desa_id').value;
  const noWaRaw = document.getElementById('no_wa').value.trim();

  if (!namaProduk) { showAlert('Nama produk/usaha wajib diisi.', 'error'); return; }
  if (!desaId) { showAlert('Letak desa wajib dipilih.', 'error'); return; }
  if (!noWaRaw) { showAlert('Nomor WhatsApp wajib diisi supaya pengunjung bisa menghubungi UMKM ini.', 'error'); return; }

  const noWa = normalizeWaNumber(noWaRaw);
  if (noWa.length < 10 || noWa.length > 15) {
    showAlert('Nomor WhatsApp sepertinya tidak valid. Contoh yang benar: 08123456789.', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const gambarUrls = currentImages.map(img => img.url);
  const urutanBerandaRaw = document.getElementById('urutan_beranda').value.trim();
  const payload = {
    nama_produk: namaProduk,
    nama_pemilik: document.getElementById('nama_pemilik').value.trim() || null,
    kategori_id: document.getElementById('kategori_id').value || null,
    desa_id: desaId,
    harga: document.getElementById('harga').value.trim() || null,
    deskripsi: document.getElementById('deskripsi').value.trim() || null,
    no_wa: noWa,
    alamat: document.getElementById('alamat').value.trim() || null,
    gambar_url: gambarUrls[0] || null,
    gambar_urls: gambarUrls,
    tampil_beranda: document.getElementById('tampil_beranda').checked,
    urutan_beranda: urutanBerandaRaw === '' ? null : parseInt(urutanBerandaRaw, 10),
    updated_at: new Date().toISOString(),
  };

  try {
    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from('umkm').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabaseClient.from('umkm').insert(payload));
    }
    if (error) throw error;

    showAlert(editingId ? 'Produk UMKM berhasil diperbarui.' : 'Produk UMKM berhasil ditambahkan.', 'success');
    closeModal();
    loadUmkm();
  } catch (err) {
    console.error('Gagal menyimpan produk UMKM:', err);
    showAlert('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteUmkm(id) {
  const row = umkmList.find(r => String(r.id) === String(id));
  if (!window.confirm(`Hapus produk UMKM "${row ? row.nama_produk : ''}"? Tindakan ini tidak bisa dibatalkan.`)) return;

  try {
    const { error } = await supabaseClient.from('umkm').delete().eq('id', id);
    if (error) throw error;
    showAlert('Produk UMKM berhasil dihapus.', 'success');
    loadUmkm();
  } catch (err) {
    console.error('Gagal menghapus produk UMKM:', err);
    showAlert('Gagal menghapus: ' + (err.message || err), 'error');
  }
}

// ---------- Info Biaya Upload Produk (tabel `pengaturan`, row id=1) ----------
// Field terpisah dari CRUD produk UMKM di atas — hanya menyimpan 2 kolom
// (umkm_fee, umkm_fee_wa) tanpa menyentuh kolom identitas situs lainnya
// (lihat migration_umkm_fee.sql). Ditampilkan di publik lewat
// js/umkm-page.js -> loadUmkmCta().
async function loadUmkmFeeSettings() {
  try {
    const { data, error } = await withTimeout(
      supabaseClient.from('pengaturan').select('umkm_fee, umkm_fee_wa').eq('id', 1).maybeSingle(),
      8000
    );
    if (error) throw error;
    if (data) {
      document.getElementById('umkm_fee').value = data.umkm_fee || '';
      document.getElementById('umkm_fee_wa').value = data.umkm_fee_wa || '';
    }
  } catch (err) {
    console.error('Gagal memuat info biaya upload produk:', err);
    showAlert(
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis saat memuat info biaya upload produk.'
        : 'Gagal memuat info biaya upload produk. Pastikan migration_umkm_fee.sql sudah dijalankan.',
      'error'
    );
  }
}

async function saveUmkmFeeSettings(e) {
  e.preventDefault();
  const btn = document.getElementById('saveUmkmFeeBtn');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const payload = {
    id: 1,
    umkm_fee: document.getElementById('umkm_fee').value.trim() || null,
    umkm_fee_wa: document.getElementById('umkm_fee_wa').value.trim() || null,
  };

  try {
    const { error } = await supabaseClient.from('pengaturan').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    showAlert('Info biaya upload produk berhasil disimpan.', 'success');
  } catch (err) {
    console.error('Gagal menyimpan info biaya upload produk:', err);
    showAlert(
      'Gagal menyimpan: ' + (err.message || err) + '. Pastikan migration_umkm_fee.sql sudah dijalankan.',
      'error'
    );
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadKategori(), loadDesa()]);
  loadUmkm();
  loadUmkmFeeSettings();

  document.getElementById('formUmkmFee').addEventListener('submit', saveUmkmFeeSettings);

  document.getElementById('btnAddUmkm').addEventListener('click', () => openModal('add', null));
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('umkmModal').addEventListener('click', (e) => {
    if (e.target.id === 'umkmModal') closeModal();
  });
  document.getElementById('formUmkm').addEventListener('submit', saveUmkm);
  document.getElementById('btnAddKategori').addEventListener('click', addKategoriBaru);

  document.getElementById('gambar_file').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadImages(files);
    e.target.value = '';
  });

  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('filterKategori').addEventListener('change', renderTable);
  document.getElementById('filterDesa').addEventListener('change', renderTable);

  // Dipanggil dari Akses Cepat di Dashboard: index.html?... -> umkm.html?action=new
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'new') openModal('add', null);
});
