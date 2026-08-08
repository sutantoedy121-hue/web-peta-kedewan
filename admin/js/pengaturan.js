// admin/js/pengaturan.js
// Logic halaman Pengaturan Situs: identitas & kontak (tabel `pengaturan`)
// + kode iframe peta kecamatan (tabel `peta_kecamatan`, sudah dipakai
// oleh js/main.js di beranda publik lewat loadPetaKecamatan()).

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

// Kalau admin menempel seluruh kode <iframe ...></iframe> (bukan cuma
// link-nya), ambil otomatis isi src="..."-nya biar tidak bingung.
function extractIframeSrc(raw) {
  const value = (raw || '').trim();
  if (!value) return '';
  if (/<iframe/i.test(value)) {
    const m = value.match(/src=(["'])(.*?)\1/i);
    if (m) return m[2].trim();
  }
  return value;
}

// Tampilkan preview logo (di kotak kecil dekat field Logo Situs) tiap
// kali admin pilih/upload file baru, supaya tahu gambar yang dipakai
// sudah benar sebelum disimpan. Kalau kosong / gagal dimuat, tampilkan
// ikon default.
const defaultLogoSvg = `<svg viewBox="0 0 40 40" fill="none" width="30" height="30"><circle cx="20" cy="20" r="19" stroke="currentColor" stroke-width="1.4"/><path d="M20 8v24M8 20h24" stroke="currentColor" stroke-width="1.4"/><circle cx="20" cy="20" r="4" fill="currentColor"/></svg>`;

function updateLogoPreview(url) {
  const box = document.getElementById('logoPreviewBox');
  const removeBtn = document.getElementById('removeLogoBtn');
  if (!box) return;
  const trimmed = (url || '').trim();
  if (!trimmed) {
    box.innerHTML = defaultLogoSvg;
    if (removeBtn) removeBtn.style.display = 'none';
    return;
  }

  const img = new Image();
  img.onload = () => { box.innerHTML = ''; box.style.objectFit = 'contain'; img.style.width = '100%'; img.style.height = '100%'; img.style.objectFit = 'contain'; box.appendChild(img); };
  img.onerror = () => { box.innerHTML = defaultLogoSvg; };
  img.src = trimmed;
  img.alt = 'Preview logo';
  if (removeBtn) removeBtn.style.display = 'inline-flex';
}

// --- Upload file logo ke Supabase Storage (bucket "logo") ---
// Lihat migration_logo_storage.sql untuk membuat bucket & izin (RLS)-nya
// di Supabase sebelum fitur ini bisa dipakai.
const LOGO_BUCKET = 'logo';
const MAX_LOGO_SIZE_MB = 2;

async function uploadLogoFile(file) {
  const statusEl = document.getElementById('logoUploadStatus');
  const hiddenInput = document.getElementById('logo_url');
  const setStatus = (msg, isError) => {
    if (!statusEl) return;
    statusEl.textContent = msg;
    statusEl.style.color = isError ? 'var(--red-500, #d64545)' : '';
  };

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  if (!allowedTypes.includes(file.type)) {
    setStatus('Format tidak didukung. Gunakan PNG, JPG, WEBP, atau SVG.', true);
    return;
  }
  if (file.size > MAX_LOGO_SIZE_MB * 1024 * 1024) {
    setStatus(`Ukuran file maksimal ${MAX_LOGO_SIZE_MB}MB.`, true);
    return;
  }

  setStatus('Mengunggah logo…', false);

  try {
    const ext = (file.name.split('.').pop() || 'png').toLowerCase();
    const path = `site-logo-${Date.now()}.${ext}`;

    const { error: uploadError } = await withTimeout(
      supabaseClient.storage.from(LOGO_BUCKET).upload(path, file, {
        cacheControl: '3600',
        upsert: true,
      }),
      20000
    );
    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabaseClient.storage.from(LOGO_BUCKET).getPublicUrl(path);
    const publicUrl = publicUrlData && publicUrlData.publicUrl;
    if (!publicUrl) throw new Error('Gagal mendapatkan URL publik logo.');

    if (hiddenInput) hiddenInput.value = publicUrl;
    updateLogoPreview(publicUrl);
    setStatus('Logo siap. Klik "Simpan Identitas Situs" untuk menyimpan.', false);
  } catch (err) {
    console.error('Gagal mengunggah logo:', err);
    setStatus(
      err.message === 'TIMEOUT'
        ? 'Waktu unggah habis. Coba lagi.'
        : 'Gagal mengunggah logo: ' + (err.message || err) + '. Pastikan bucket "logo" sudah dibuat (lihat migration_logo_storage.sql).',
      true
    );
  }
}

let alertTimer = null;
function showAlert(message, type) {
  const box = document.getElementById('settingsAlert');
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

// Baris peta_kecamatan yang sedang dimuat (dipakai lagi saat menyimpan,
// supaya tahu harus UPDATE baris yang sudah ada atau INSERT baris baru).
let petaRow = null;

async function loadSettings() {
  // --- Identitas & kontak ---
  try {
    const { data, error } = await withTimeout(
      supabaseClient.from('pengaturan').select('*').eq('id', 1).maybeSingle(),
      8000
    );
    if (error) throw error;
    if (data) {
      document.getElementById('site_name').value = data.site_name || '';
      document.getElementById('site_tagline').value = data.site_tagline || '';
      document.getElementById('kelompok_nama').value = data.kelompok_nama || '';
      document.getElementById('email').value = data.email || '';
      document.getElementById('instagram_url').value = data.instagram_url || '';
      document.getElementById('tiktok_url').value = data.tiktok_url || '';
      document.getElementById('telepon_wa').value = data.telepon_wa || '';
      document.getElementById('jam_layanan').value = data.jam_layanan || '';
      document.getElementById('logo_url').value = data.logo_url || '';
      updateLogoPreview(data.logo_url || '');
    }
  } catch (err) {
    console.error('Gagal memuat pengaturan identitas:', err);
    showAlert(
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis saat memuat pengaturan identitas.'
        : 'Gagal memuat pengaturan identitas. Pastikan tabel "pengaturan" sudah dibuat (lihat migration_pengaturan.sql).',
      'error'
    );
  }

  // --- Peta kecamatan (iframe) ---
  try {
    const { data, error } = await withTimeout(
      supabaseClient.from('peta_kecamatan').select('*').limit(1).maybeSingle(),
      8000
    );
    if (error) throw error;
    petaRow = data || null;
    if (data && data.embed_code) {
      document.getElementById('map_embed_url').value = data.embed_code;
      document.getElementById('mapStatus').style.display = 'flex';
    }
  } catch (err) {
    console.error('Gagal memuat peta kecamatan:', err);
  }
}

async function saveIdentitas(e) {
  e.preventDefault();
  const btn = document.getElementById('saveIdentitasBtn');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const siteName = document.getElementById('site_name').value.trim();
  if (!siteName) {
    showAlert('Nama situs wajib diisi.', 'error');
    btn.disabled = false;
    btn.textContent = originalLabel;
    return;
  }

  const payload = {
    id: 1,
    site_name: siteName,
    site_tagline: document.getElementById('site_tagline').value.trim() || null,
    kelompok_nama: document.getElementById('kelompok_nama').value.trim() || null,
    email: document.getElementById('email').value.trim() || null,
    instagram_url: document.getElementById('instagram_url').value.trim() || null,
    tiktok_url: document.getElementById('tiktok_url').value.trim() || null,
    telepon_wa: document.getElementById('telepon_wa').value.trim() || null,
    jam_layanan: document.getElementById('jam_layanan').value.trim() || null,
    logo_url: document.getElementById('logo_url').value.trim() || null,
    updated_at: new Date().toISOString(),
  };

  try {
    const { error } = await supabaseClient.from('pengaturan').upsert(payload, { onConflict: 'id' });
    if (error) throw error;
    showAlert('Identitas & kontak situs berhasil disimpan.', 'success');
  } catch (err) {
    console.error('Gagal menyimpan identitas situs:', err);
    showAlert('Gagal menyimpan: ' + (err.message || err), 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

async function saveMap(e) {
  e.preventDefault();
  const btn = document.getElementById('saveMapBtn');
  const originalLabel = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Menyimpan…';

  const raw = document.getElementById('map_embed_url').value;
  const src = extractIframeSrc(raw);

  if (src && !/^https:\/\//i.test(src)) {
    showAlert('Link embed peta tidak valid. Harus berupa link yang diawali https://', 'error');
    btn.disabled = false;
    btn.textContent = originalLabel;
    return;
  }

  try {
    let error;
    if (petaRow && petaRow.id !== undefined) {
      ({ error } = await supabaseClient
        .from('peta_kecamatan')
        .update({ embed_code: src || null })
        .eq('id', petaRow.id));
    } else {
      let data;
      ({ data, error } = await supabaseClient
        .from('peta_kecamatan')
        .insert({ embed_code: src || null })
        .select()
        .maybeSingle());
      if (!error) petaRow = data;
    }
    if (error) throw error;

    document.getElementById('map_embed_url').value = src;
    document.getElementById('mapStatus').style.display = src ? 'flex' : 'none';
    showAlert(
      src
        ? 'Peta berhasil disimpan & aktif di beranda publik.'
        : 'Kode peta dikosongkan — peta akan disembunyikan dari beranda publik.',
      'success'
    );
  } catch (err) {
    console.error('Gagal menyimpan peta kecamatan:', err);
    showAlert(
      'Gagal menyimpan peta: ' + (err.message || err) + '. Kalau ini error izin/RLS, lihat catatan di migration_pengaturan.sql.',
      'error'
    );
  } finally {
    btn.disabled = false;
    btn.textContent = originalLabel;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  document.getElementById('formIdentitas').addEventListener('submit', saveIdentitas);
  document.getElementById('formMap').addEventListener('submit', saveMap);

  const logoFileInput = document.getElementById('logo_file');
  if (logoFileInput) {
    logoFileInput.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) uploadLogoFile(file);
    });
  }

  const removeLogoBtn = document.getElementById('removeLogoBtn');
  if (removeLogoBtn) {
    removeLogoBtn.addEventListener('click', () => {
      const hiddenInput = document.getElementById('logo_url');
      const statusEl = document.getElementById('logoUploadStatus');
      if (hiddenInput) hiddenInput.value = '';
      if (logoFileInput) logoFileInput.value = '';
      if (statusEl) { statusEl.textContent = 'Logo akan dihapus setelah Anda klik "Simpan Identitas Situs".'; statusEl.style.color = ''; }
      updateLogoPreview('');
    });
  }
});
