// admin/js/tim-inti.js
// Logic halaman "Tim Inti (Dev Team)": CRUD tabel `tim_inti` (nama,
// jabatan, prodi, deskripsi, media sosial, urutan tampil) + upload 1
// foto profil per anggota ke Supabase Storage (bucket "tim-inti").
//
// Tabel ini TERPISAH dari `tim_pengembang` (daftar umum anggota KKM di
// admin/js/tim-pengembang.js) — ini khusus 5 anggota "Development Team"
// yang tampil di section baru bawah hero halaman publik
// tim-pengembang.html lewat js/tim-inti-page.js. Polanya sengaja
// disamakan dengan admin/js/tim-pengembang.js supaya konsisten.

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

function initials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const TIM_BUCKET = 'tim-inti';
const MAX_IMAGE_SIZE_MB = 3;
const iconTeam = '<svg viewBox="0 0 24 24" fill="none" width="20" height="20"><path d="M12 2.5 14.9 8.3l6.4.9-4.6 4.5 1.1 6.3L12 16.9l-5.8 3.1 1.1-6.3-4.6-4.5 6.4-.9L12 2.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';

// ---------- State ----------
let timList = [];        // cache data mentah dari server, dipakai untuk filter di client
let currentImage = null; // {url, path} — foto yang sudah terunggah untuk anggota yang sedang diedit
let editingId = null;

// ---------- Alert ----------
let alertTimer = null;
function showAlert(message, type) {
  const box = document.getElementById('timAlert');
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

// ---------- Load & render tabel tim_inti ----------
async function loadTim() {
  const tbody = document.getElementById('timTableBody');
  tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">Memuat data…</div></td></tr>`;

  try {
    const { data, error } = await withTimeout(
      supabaseClient
        .from('tim_inti')
        .select('id, nama, jabatan, prodi, deskripsi, foto_url, instagram, whatsapp, linkedin, email, urutan')
        .order('urutan', { ascending: true })
        .order('created_at', { ascending: true }),
      8000
    );
    if (error) throw error;
    timList = data || [];
    renderTable();
  } catch (err) {
    console.error('Gagal memuat data Tim Inti:', err);
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state" style="color:#c94040;">Gagal memuat data. ${
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis.'
        : 'Pastikan tabel "tim_inti" sudah dibuat (lihat migration_tim_inti.sql).'
    }</div></td></tr>`;
  }
}

function renderTable() {
  const tbody = document.getElementById('timTableBody');
  const q = document.getElementById('searchInput').value.trim().toLowerCase();

  const filtered = timList.filter(row => {
    if (!q) return true;
    return (`${row.nama || ''} ${row.jabatan || ''} ${row.prodi || ''}`).toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6"><div class="empty-state">
      <div class="ic">⭐</div>${timList.length === 0
        ? 'Belum ada anggota Development Team. Klik "Tambah Anggota" untuk menambahkan.'
        : 'Tidak ada anggota yang cocok dengan pencarian.'}
    </div></td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map(row => `
    <tr>
      <td>
        <div class="thumb">${row.foto_url ? `<img src="${escapeHtml(row.foto_url)}" alt="">` : iconTeam}</div>
      </td>
      <td><strong>${escapeHtml(row.nama)}</strong></td>
      <td>${row.jabatan ? `<span class="badge badge--amber">${escapeHtml(row.jabatan)}</span>` : '<span class="badge badge--gray">–</span>'}</td>
      <td>${escapeHtml(row.prodi || '–')}</td>
      <td>${escapeHtml(String(row.urutan ?? 0))}</td>
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
      const row = timList.find(r => String(r.id) === btn.dataset.edit);
      if (row) openModal('edit', row);
    });
  });
  tbody.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', () => deleteTim(btn.dataset.delete));
  });
}

// ---------- Upload foto profil ----------
function renderImageGrid() {
  const grid = document.getElementById('imageGrid');
  if (!currentImage) {
    grid.innerHTML = '';
    return;
  }
  grid.innerHTML = `
    <div class="image-grid__item">
      <img src="${escapeHtml(currentImage.url)}" alt="">
      <button type="button" class="image-grid__remove" data-remove-image title="Hapus foto">×</button>
    </div>
  `;
  grid.querySelectorAll('[data-remove-image]').forEach(btn => {
    btn.addEventListener('click', () => removeImage());
  });
}

async function removeImage() {
  const img = currentImage;
  if (!img) return;
  currentImage = null;
  renderImageGrid();
  if (img.path) {
    try { await supabaseClient.storage.from(TIM_BUCKET).remove([img.path]); }
    catch (err) { console.error('Gagal menghapus file lama dari storage:', err); }
  }
}

async function uploadImage(file) {
  const statusEl = document.getElementById('fotoUploadStatus');
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

  if (!allowedTypes.includes(file.type)) {
    showAlert(`Format "${file.name}" tidak didukung. Gunakan PNG, JPG, atau WEBP.`, 'error');
    return;
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    showAlert(`Ukuran "${file.name}" melebihi ${MAX_IMAGE_SIZE_MB}MB.`, 'error');
    return;
  }

  // Foto lama (kalau ada, dan baru diunggah sebelumnya) dihapus dulu supaya
  // tidak menumpuk file yatim di storage.
  if (currentImage && currentImage.path) {
    try { await supabaseClient.storage.from(TIM_BUCKET).remove([currentImage.path]); }
    catch (err) { console.error('Gagal menghapus foto lama:', err); }
  }

  statusEl.textContent = `Mengunggah ${file.name}…`;
  try {
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const path = `tim-inti-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error: uploadError } = await withTimeout(
      supabaseClient.storage.from(TIM_BUCKET).upload(path, file, { cacheControl: '3600', upsert: false }),
      20000
    );
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage.from(TIM_BUCKET).getPublicUrl(path);
    const publicUrl = publicUrlData && publicUrlData.publicUrl;
    if (!publicUrl) throw new Error('Gagal mendapatkan URL publik foto.');

    currentImage = { url: publicUrl, path };
    renderImageGrid();
  } catch (err) {
    console.error('Gagal mengunggah foto:', err);
    showAlert(
      'Gagal mengunggah ' + file.name + ': ' + (err.message === 'TIMEOUT' ? 'waktu unggah habis.' : (err.message || err)) +
      ' Pastikan bucket "tim-inti" sudah dibuat (lihat migration_tim_inti.sql).',
      'error'
    );
  }
  statusEl.textContent = 'Unggah 1 foto profil (maks. 3MB), sebaiknya persegi/kotak — akan ditampilkan bulat. Kosongkan kalau belum ada foto — akan ditampilkan inisial nama.';
}

// ---------- Modal ----------
function openModal(mode, row) {
  editingId = mode === 'edit' ? row.id : null;
  document.getElementById('modalTitle').textContent = mode === 'edit' ? 'Ubah Anggota Development Team' : 'Tambah Anggota Development Team';
  document.getElementById('tim_id').value = row ? row.id : '';
  document.getElementById('nama').value = row ? row.nama || '' : '';
  document.getElementById('jabatan').value = row ? row.jabatan || '' : '';
  document.getElementById('prodi').value = row ? row.prodi || '' : '';
  document.getElementById('deskripsi').value = row ? row.deskripsi || '' : '';
  document.getElementById('instagram').value = row ? row.instagram || '' : '';
  document.getElementById('whatsapp').value = row ? row.whatsapp || '' : '';
  document.getElementById('linkedin').value = row ? row.linkedin || '' : '';
  document.getElementById('email').value = row ? row.email || '' : '';
  document.getElementById('urutan').value = row ? (row.urutan ?? 0) : (timList.length || 0);
  document.getElementById('foto_file').value = '';
  document.getElementById('fotoUploadStatus').textContent = 'Unggah 1 foto profil (maks. 3MB), sebaiknya persegi/kotak — akan ditampilkan bulat. Kosongkan kalau belum ada foto — akan ditampilkan inisial nama.';

  currentImage = row && row.foto_url ? { url: row.foto_url, path: null } : null;
  renderImageGrid();

  document.getElementById('timModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('timModal').style.display = 'none';
  editingId = null;
  currentImage = null;
}

async function saveTim(e) {
  e.preventDefault();
  const btn = document.getElementById('btnSaveTim');
  const originalLabel = btn.textContent;

  const nama = document.getElementById('nama').value.trim();
  const jabatan = document.getElementById('jabatan').value.trim();

  if (!nama) { showAlert('Nama lengkap wajib diisi.', 'error'); return; }
  if (!jabatan) { showAlert('Jabatan/peran wajib diisi.', 'error'); return; }

  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const urutanRaw = document.getElementById('urutan').value.trim();
  const payload = {
    nama,
    jabatan,
    prodi: document.getElementById('prodi').value.trim() || null,
    deskripsi: document.getElementById('deskripsi').value.trim() || null,
    instagram: document.getElementById('instagram').value.trim() || null,
    whatsapp: document.getElementById('whatsapp').value.trim() || null,
    linkedin: document.getElementById('linkedin').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    urutan: urutanRaw === '' ? 0 : parseInt(urutanRaw, 10) || 0,
    foto_url: currentImage ? currentImage.url : null,
    updated_at: new Date().toISOString(),
  };

  try {
    let error;
    if (editingId) {
      ({ error } = await supabaseClient.from('tim_inti').update(payload).eq('id', editingId));
    } else {
      ({ error } = await supabaseClient.from('tim_inti').insert(payload));
    }
    if (error) throw error;

    showAlert(editingId ? 'Anggota Development Team berhasil diperbarui.' : 'Anggota Development Team berhasil ditambahkan.', 'success');
    closeModal();
    loadTim();
  } catch (err) {
    console.error('Gagal menyimpan anggota tim inti:', err);
    showAlert('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function deleteTim(id) {
  const row = timList.find(r => String(r.id) === String(id));
  if (!window.confirm(`Hapus anggota "${row ? row.nama : ''}" dari Development Team? Tindakan ini tidak bisa dibatalkan.`)) return;

  try {
    const { error } = await supabaseClient.from('tim_inti').delete().eq('id', id);
    if (error) throw error;
    showAlert('Anggota berhasil dihapus.', 'success');
    loadTim();
  } catch (err) {
    console.error('Gagal menghapus anggota tim inti:', err);
    showAlert('Gagal menghapus: ' + (err.message || err), 'error');
  }
}

// ---------- Init ----------
document.addEventListener('DOMContentLoaded', async () => {
  loadTim();

  document.getElementById('btnAddAnggota').addEventListener('click', () => openModal('add', null));
  document.getElementById('btnCloseModal').addEventListener('click', closeModal);
  document.getElementById('btnCancelModal').addEventListener('click', closeModal);
  document.getElementById('timModal').addEventListener('click', (e) => {
    if (e.target.id === 'timModal') closeModal();
  });
  document.getElementById('formTim').addEventListener('submit', saveTim);

  document.getElementById('foto_file').addEventListener('change', (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) uploadImage(files[0]);
    e.target.value = '';
  });

  document.getElementById('searchInput').addEventListener('input', renderTable);

  // Dipanggil dari Akses Cepat di Dashboard: index.html?... -> tim-inti.html?action=new
  const params = new URLSearchParams(window.location.search);
  if (params.get('action') === 'new') openModal('add', null);
});
