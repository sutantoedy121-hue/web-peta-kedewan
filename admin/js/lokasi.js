// admin/js/lokasi.js
// Logic halaman Titik Lokasi: CRUD tabel `lokasi`, kategori (tabel
// `kategori_lokasi`, bisa tambah kategori baru langsung dari modal),
// letak desa (tabel `desa`), kode iframe per lokasi, dan upload
// beberapa foto sekaligus ke Supabase Storage (bucket "lokasi").
//
// Nama tabel/kolom disamakan dengan yang sudah dipakai js/main.js di
// beranda publik (lihat migration_lokasi.sql), jadi data yang
// ditambahkan di sini otomatis tampil di beranda publik juga.

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

// Sama seperti admin/js/pengaturan.js: kalau admin menempel seluruh
// kode <iframe ...></iframe>, ambil otomatis isi src="..."-nya.
function extractIframeSrc(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/<iframe/i.test(value)) {
    const m = value.match(/src=(["'])(.*?)\1/i);
    if (m) return m[2].trim();
  }
  return value;
}

const LOKASI_BUCKET = 'lokasi';
const MAX_IMAGE_SIZE_MB = 3;
const iconMapPin = '<svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';

// ---------- State ----------
let kategoriList = [];
let desaList = [];
let lokasiList = [];      // cache data mentah dari server, dipakai untuk filter di client
let currentImages = [];   // [{url, path}] — foto yang sudah terunggah untuk lokasi yang sedang diedit
let editingId = null;

// ---------- Alert ----------
let alertTimer = null;
function showAlert(message, type) {
  const box = document.getElementById('lokasiAlert');
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
      supabaseClient.from('kategori_lokasi').select('*').order('nama_kategori'),
      8000
    );
    if (error) throw error;
    kategoriList = data || [];
  } catch (err) {
    console.error('Gagal memuat kategori:', err);
    showAlert('Gagal memuat daftar kategori. Pastikan tabel "kategori_lokasi" sudah dibuat (lihat migration_lokasi.sql).', 'error');
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
      .from('kategori_lokasi')
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

// ---------- Load & render tabel lokasi ----------
async function loadLokasi() {
  const tbody = document.getElementById('lokasiTableBody');
  tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">Memuat data…</div></td></tr>`;

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('lokasi')
        .select('id, nama_lokasi, deskripsi, embed_code, gambar_url, gambar_urls, kategori_id, desa_id, tampil_beranda, urutan_beranda, kategori:kategori_id ( nama_kategori ), desa:desa_id ( nama_desa )')
        .order('created_at', { ascending: false }),
      8000
    );
    if (error) throw error;
    lokasiList = data || [];
    renderTable();
  } catch (err) {
    console.error('Gagal memuat titik lokasi:', err);
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state" style="color:#c94040;">Gagal memuat data. ${
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis.'
        : 'Pastikan tabel "lokasi" sudah dibuat (lihat migration_lokasi.sql).'
    }</div></td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('lokasiTableBody');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();
  const kategoriFilter = document.getElementById('filterKategori').value;
  const desaFilter = document.getElementById('filterDesa').value;

  const filtered = lokasiList.filter(row => {
    if (q && !(row.nama_lokasi || '').toLowerCase().includes(q)) return false;
    if (kategoriFilter && String(row.kategori_id) !== kategoriFilter) return false;
    if (desaFilter && String(row.desa_id) !== desaFilter) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7"><div class="empty-state">
      <div class="ic">📍</div>${lokasiList.length === 0
        ? 'Belum ada titik lokasi. Klik "Tambah Titik Lokasi" untuk menambahkan.'
        : 'Tidak ada titik lokasi yang cocok dengan pencarian/filter.'}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td>
        <div class="thumb">${row.gambar_url ? `<img src="${escapeHtml(row.gambar_url)}" alt="">` : iconMapPin}</div>
      </td>
      <td><strong>${escapeHtml(row.nama_lokasi)}</strong></td>
      <td>${row.kategori?.nama_kategori ? `<span class="badge badge--blue">${escapeHtml(row.kategori.nama_kategori)}</span>` : '<span class="badge badge--gray">–</span>'}</td>
      <td>${escapeHtml(row.desa?.nama_desa || '–')}</td>
      <td class="col-deskripsi">${escapeHtml((row.deskripsi || '').slice(0, 80)) || '<span style="color:var(--ink-soft)">–</span>'}${(row.deskripsi || '').length > 80 ? '…' : ''}</td>
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
          <button type="button" class="icon-btn" data-edit="${row.id}" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5Z" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
          </button>
          <button type="button" class="icon-btn icon-btn--danger" data-delete="${row.id}" title="Hapus">
            <svg viewBox="0 0 24 24" fill="none" width="16" height="16"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', () => {
      const row = lokasiList.find(r => String(r.id) === btn.dataset.edit);
      if (row) openModal('edit', row);
    });
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteLokasi(btn.dataset.delete));
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
    const { error } = await supabaseClient.from('lokasi').update(patch).eq('id', id);
    if (error) throw error;
    const row = lokasiList.find(r => String(r.id) === String(id));
    if (row) Object.assign(row, patch);
    showAlert(
      'tampil_beranda' in patch
        ? (patch.tampil_beranda ? 'Titik lokasi akan tampil di Beranda.' : 'Titik lokasi disembunyikan dari Beranda.')
        : 'Urutan prioritas Beranda berhasil diperbarui.',
      'success'
    );
  } catch (err) {
    console.error('Gagal memperbarui pengaturan Beranda:', err);
    showAlert('Gagal memperbarui pengaturan Beranda: ' + (err.message || err), 'error');
    loadLokasi();
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
    try { await supabaseClient.storage.from(LOKASI_BUCKET).remove([img.path]); }
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
      const path = `lokasi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

      const { error: uploadError } = await withTimeout(
        supabaseClient.storage.from(LOKASI_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false }),
        20000
      );
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from(LOKASI_BUCKET).getPublicUrl(path);
      const publicUrl = publicUrlData && publicUrlData.publicUrl;
      if (!publicUrl) throw new Error('Gagal mendapatkan URL publik foto.');

      currentImages.push({ url: publicUrl, path });
      renderImageGrid();
    } catch (err) {
      console.error('Gagal mengunggah foto:', err);
      showAlert(
        'Gagal mengunggah ' + file.name + ': ' + (err.message === 'TIMEOUT' ? 'waktu unggah habis.' : (err.message || err)) +
        ' Pastikan bucket "lokasi" sudah dibuat (lihat migration_lokasi.sql).',
        'error'
      );
    }
  }
  statusEl.textContent = 'Bisa unggah lebih dari 1 foto sekaligus (maks. 3MB / foto). Foto pertama jadi foto sampul.';
}

// ---------- Modal ----------
function openModal(mode, row) {
  editingId = mode === 'edit' ? row.id : null;
  document.getElementById('modalTitle').textContent = mode === 'edit' ? 'Ubah Titik Lokasi' : 'Tambah Titik Lokasi';
  document.getElementById('lokasi_id').value = row ? row.id : '';
  document.getElementById('nama_lokasi').value = row ? row.nama_lokasi || '' : '';
  document.getElementById('kategori_id').value = row ? (row.kategori_id || '') : '';
  document.getElementById('desa_id').value = row ? (row.desa_id || '') : '';
  document.getElementById('deskripsi').value = row ? row.deskripsi || '' : '';
  document.getElementById('embed_code').value = row ? row.embed_code || '' : '';
  document.getElementById('tampil_beranda').checked = row ? row.tampil_beranda !== false : true;
  document.getElementById('urutan_beranda').value = row && row.urutan_beranda != null ? row.urutan_beranda : '';
  document.getElementById('newKategoriInput').value = '';
  document.getElementById('gambar_file').value = '';
  document.getElementById('gambarUploadStatus').textContent = 'Bisa unggah lebih dari 1 foto sekaligus (maks. 3MB / foto). Foto pertama jadi foto sampul.';

  currentImages = (row && Array.isArray(row.gambar_urls) && row.gambar_urls.length > 0)
    ? row.gambar_urls.map(url => ({ url, path: null })) // path null = foto lama, tombol hapus hanya lepas dari daftar
    : (row && row.gambar_url ? [{ url: row.gambar_url, path: null }] : []);
  renderImageGrid();

  document.getElementById('lokasiModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('lokasiModal').style.display = 'none';
  editingId = null;
  currentImages = [];
}

async function saveLokasi(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveLokasi');
  const originalLabel = btn.textContent;

  const namaLokasi = document.getElementById('nama_lokasi').value.trim();
  const kategoriId = document.getElementById('kategori_id').value;
  const desaId = document.getElementById('desa_id').value;

  if (!namaLokasi) { showAlert('Nama lokasi wajib diisi.', 'error'); return; }
  if (!kategoriId) { showAlert('Kategori wajib dipilih.', 'error'); return; }
  if (!desaId) { showAlert('Letak desa wajib dipilih.', 'error'); return; }

  const embedRaw = document.getElementById('embed_code').value;
  const embedSrc = extractIframeSrc(embedRaw);
  if (embedSrc && !/^https:\/\//i.test(embedSrc)) {
    showAlert('Kode/link embed iframe tidak valid. Harus berupa link yang diawali https://', 'error');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const gambarUrls = currentImages.map(img => img.url);
  const urutanBerandaRaw = document.getElementById('urutan_beranda').value.trim();
  const payload = {
    nama_lokasi: namaLokasi,
    kategori_id: kategoriId,
    desa_id: desaId,
    deskripsi: document.getElementById('deskripsi').value.trim() || null,
    embed_code: embedSrc || null,
    gambar_url: gambarUrls[0] || null,
    gambar_urls: gambarUrls,
    tampil_beranda: document.getElementById('tampil_beranda').checked,
    urutan_beranda: urutanBerandaRaw === '' ? null : parseInt(urutanBerandaRaw, 10),
    updated_at: new Date().toISOString(),
  };

  try {
    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from('lokasi').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabaseClient.from('lokasi').insert(payload));
    }
    if (error) throw error;

    showAlert(editingId ? 'Titik lokasi berhasil diperbarui.' : 'Titik lokasi berhasil ditambahkan.', 'success');
    closeModal();
    loadLokasi();
  } catch (err) {
    console.error('Gagal menyimpan titik lokasi:', err);
    showAlert('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteLokasi(id) {
  const row = lokasiList.find(r => String(r.id) === String(id));
  if (!window.confirm(`Hapus titik lokasi "${row ? row.nama_lokasi : ''}"? Tindakan ini tidak bisa dibatalkan.`)) return;

  try {
    const { error } = await supabaseClient.from('lokasi').delete().eq('id', id);
    if (error) throw error;
    showAlert('Titik lokasi berhasil dihapus.', 'success');
    loadLokasi();
  } catch (err) {
    console.error('Gagal menghapus titik lokasi:', err);
    showAlert('Gagal menghapus: ' + (err.message || err), 'error');
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  await Promise.all([loadKategori(), loadDesa()]);
  loadLokasi();

  document.getElementById('btnAddLokasi').addEventListener('click', () => openModal('add', null));
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('lokasiModal').addEventListener('click', (e) => {
    if (e.target.id === 'lokasiModal') closeModal();
  });
  document.getElementById('formLokasi').addEventListener('submit', saveLokasi);
  document.getElementById('btnAddKategori').addEventListener('click', addKategoriBaru);

  document.getElementById('gambar_file').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadImages(files);
    e.target.value = '';
  });

  document.getElementById('searchInput').addEventListener('input', renderTable);
  document.getElementById('filterKategori').addEventListener('change', renderTable);
  document.getElementById('filterDesa').addEventListener('change', renderTable);

  // Dipanggil dari Akses Cepat di Dashboard: index.html?... -> lokasi.html?action=new
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'new') openModal('add', null);
});
