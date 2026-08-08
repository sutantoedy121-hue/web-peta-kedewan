// admin/js/hero-background.js
// Kelola gambar background hero (tabel `hero_background`, bucket
// storage `hero-bg`) di halaman Pengaturan Situs. Beda dari kartu
// Identitas & Peta: tiap perubahan (unggah / hapus) langsung
// tersimpan ke Supabase saat itu juga, tidak perlu tombol "Simpan".
//
// Jalankan migration_hero_background.sql di Supabase SQL Editor dulu
// sebelum fitur ini dipakai (membuat tabel + bucket + RLS-nya).

const HERO_BG_BUCKET = 'hero-bg';
const MAX_HERO_BG_SIZE_MB = 5;
const HERO_BG_ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

function heroBgSetStatus(msg, isError) {
  const el = document.getElementById('heroBgUploadStatus');
  if (!el) return;
  el.textContent = msg || '';
  el.style.color = isError ? 'var(--red-500, #d64545)' : '';
}

// publicUrl Supabase Storage berbentuk:
// https://xxxx.supabase.co/storage/v1/object/public/hero-bg/<path>
// Ambil <path>-nya lagi supaya bisa hapus file storage-nya juga saat
// gambar dihapus (bukan cuma baris tabelnya).
function heroBgPathFromUrl(url) {
  const marker = `/object/public/${HERO_BG_BUCKET}/`;
  const idx = (url || '').indexOf(marker);
  if (idx === -1) return null;
  return decodeURIComponent(url.slice(idx + marker.length));
}

async function loadHeroBackgrounds() {
  const grid = document.getElementById('heroBgGrid');
  if (!grid) return;
  grid.innerHTML = '<span class="hint">Memuat…</span>';

  try {
    const { data, error } = await supabaseClient
      .from('hero_background')
      .select('id, gambar_url, urutan')
      .order('urutan', { ascending: true });
    if (error) throw error;

    if (!data || data.length === 0) {
      grid.innerHTML = '<span class="hint">Belum ada gambar background. Hero akan tampil polos (tanpa foto) di beranda publik.</span>';
      return;
    }

    grid.innerHTML = data.map((row, i) => `
      <div class="image-grid__item" data-id="${row.id}" data-url="${encodeURIComponent(row.gambar_url)}">
        <img src="${row.gambar_url}" alt="Background hero ${i + 1}" loading="lazy">
        <span class="image-grid__cover" title="Urutan tampil">${i + 1}</span>
        <button type="button" class="image-grid__remove" data-action="hapus-hero-bg" title="Hapus gambar ini">&times;</button>
      </div>
    `).join('');
  } catch (err) {
    console.error('Gagal memuat background hero:', err);
    grid.innerHTML = `<span class="hint" style="color:var(--red-500, #d64545)">Gagal memuat: ${err.message || err}. Pastikan tabel "hero_background" &amp; bucket "${HERO_BG_BUCKET}" sudah dibuat (lihat migration_hero_background.sql).</span>`;
  }
}

async function uploadHeroBackgroundFiles(fileList) {
  const files = Array.from(fileList || []);
  if (!files.length) return;

  for (const file of files) {
    if (!HERO_BG_ALLOWED_TYPES.includes(file.type)) {
      heroBgSetStatus(`Format "${file.name}" tidak didukung. Gunakan PNG, JPG, atau WEBP.`, true);
      continue;
    }
    if (file.size > MAX_HERO_BG_SIZE_MB * 1024 * 1024) {
      heroBgSetStatus(`"${file.name}" lebih dari ${MAX_HERO_BG_SIZE_MB}MB.`, true);
      continue;
    }

    heroBgSetStatus(`Mengunggah "${file.name}"…`, false);

    try {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const path = `hero-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

      const { error: uploadError } = await supabaseClient.storage
        .from(HERO_BG_BUCKET)
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabaseClient.storage.from(HERO_BG_BUCKET).getPublicUrl(path);
      const publicUrl = publicUrlData && publicUrlData.publicUrl;
      if (!publicUrl) throw new Error('Gagal mendapatkan URL publik gambar.');

      // Cari urutan terbesar saat ini supaya gambar baru masuk ke akhir slideshow.
      const { data: maxRow } = await supabaseClient
        .from('hero_background')
        .select('urutan')
        .order('urutan', { ascending: false })
        .limit(1)
        .maybeSingle();
      const nextUrutan = maxRow ? (maxRow.urutan || 0) + 1 : 0;

      const { error: insertError } = await supabaseClient
        .from('hero_background')
        .insert({ gambar_url: publicUrl, urutan: nextUrutan });
      if (insertError) throw insertError;

      heroBgSetStatus(`"${file.name}" berhasil diunggah & aktif di beranda publik.`, false);
    } catch (err) {
      console.error('Gagal mengunggah background hero:', err);
      heroBgSetStatus(
        `Gagal mengunggah "${file.name}": ${err.message || err}. Pastikan bucket "${HERO_BG_BUCKET}" sudah dibuat (lihat migration_hero_background.sql).`,
        true
      );
    }
  }

  await loadHeroBackgrounds();
}

async function deleteHeroBackground(id, encodedUrl) {
  if (!window.confirm('Hapus gambar background ini?')) return;
  const url = decodeURIComponent(encodedUrl || '');

  try {
    const path = heroBgPathFromUrl(url);
    if (path) {
      await supabaseClient.storage.from(HERO_BG_BUCKET).remove([path]);
    }
    const { error } = await supabaseClient.from('hero_background').delete().eq('id', id);
    if (error) throw error;
    heroBgSetStatus('Gambar berhasil dihapus.', false);
    await loadHeroBackgrounds();
  } catch (err) {
    console.error('Gagal menghapus background hero:', err);
    heroBgSetStatus('Gagal menghapus: ' + (err.message || err), true);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadHeroBackgrounds();

  const input = document.getElementById('hero_bg_file');
  if (input) {
    input.addEventListener('change', (e) => {
      uploadHeroBackgroundFiles(e.target.files);
      e.target.value = ''; // supaya bisa pilih file yang sama lagi kalau perlu
    });
  }

  const grid = document.getElementById('heroBgGrid');
  if (grid) {
    grid.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action="hapus-hero-bg"]');
      if (!btn) return;
      const item = btn.closest('.image-grid__item');
      if (!item) return;
      deleteHeroBackground(item.dataset.id, item.dataset.url);
    });
  }
});
