// admin/js/dashboard.js — mengisi stat card & aktivitas terbaru di dashboard.

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function timeAgoId(dateStr) {
  if (!dateStr) return '';
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} jam lalu`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} hari lalu`;
  return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

const iconLokasi = '<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="9.5" r="2.4" stroke="currentColor" stroke-width="1.6"/></svg>';
const iconUmkm = '<svg viewBox="0 0 24 24" fill="none"><path d="M4 9v11h16V9M2 9l2-5h16l2 5M2 9h20M9 13v3M15 13v3" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>';
const iconTim = '<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="8" r="3.2" stroke="currentColor" stroke-width="1.6"/><path d="M3.5 20c.6-3.4 3-5.4 5.5-5.4S14.4 16.6 15 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="17.5" cy="8.5" r="2.4" stroke="currentColor" stroke-width="1.6"/><path d="M15.8 14.3c2.3.2 4 1.9 4.5 4.9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';

// Ambil satu count dengan aman: kalau gagal (tabel belum ada / RLS nolak),
// tampilkan "!" di kartu itu saja, bukan bikin seluruh dashboard mogok.
async function loadCount(table, elId) {
  const el = document.getElementById(elId);
  try {
    const { count, error } = await withTimeout(
      supabaseClient.from(table).select('*', { count: 'exact', head: true }),
      8000
    );
    if (error) throw error;
    el.textContent = count ?? 0;
  } catch (err) {
    console.error(`Gagal memuat jumlah dari tabel "${table}":`, err);
    el.textContent = '!';
    el.title = err.message === 'TIMEOUT'
      ? 'Waktu tunggu habis saat mengambil data.'
      : `Gagal memuat: ${err.message || err}`;
    el.style.color = '#c94040';
    el.style.cursor = 'help';
  }
}

function loadStats() {
  loadCount('desa', 'statDesa');
  loadCount('lokasi', 'statLokasi');
  loadCount('umkm', 'statUmkm');
  loadCount('kategori_lokasi', 'statKategori');
  loadCount('tim_pengembang', 'statTim');
}

async function loadRecentActivity() {
  const list = document.getElementById('activityList');

  try {
    const [lokasiRes, umkmRes, timRes] = await withTimeout(
      Promise.all([
        supabaseClient.from('lokasi').select('id, nama_lokasi, created_at').order('created_at', { ascending: false }).limit(5),
        supabaseClient.from('umkm').select('id, nama_produk, created_at').order('created_at', { ascending: false }).limit(5),
        supabaseClient.from('tim_pengembang').select('id, nama, created_at').order('created_at', { ascending: false }).limit(5),
      ]),
      8000
    );

    if (lokasiRes.error) throw lokasiRes.error;
    if (umkmRes.error) throw umkmRes.error;
    if (timRes.error) throw timRes.error;

    const items = [
      ...(lokasiRes.data || []).map(r => ({ title: r.nama_lokasi, type: 'Titik Lokasi', icon: iconLokasi, time: r.created_at })),
      ...(umkmRes.data || []).map(r => ({ title: r.nama_produk, type: 'UMKM', icon: iconUmkm, time: r.created_at })),
      ...(timRes.data || []).map(r => ({ title: r.nama, type: 'Tim Pengembang', icon: iconTim, time: r.created_at })),
    ]
      .sort((a, b) => new Date(b.time) - new Date(a.time))
      .slice(0, 6);

    if (items.length === 0) {
      list.innerHTML = `<div class="empty-state"><div class="ic">🗂️</div>Belum ada aktivitas. Data akan muncul di sini setelah kamu menambahkan titik lokasi atau produk UMKM.</div>`;
      return;
    }

    list.innerHTML = items.map(item => `
      <div class="activity-item">
        <div class="activity-item__icon">${item.icon}</div>
        <div>
          <div class="activity-item__title">${escapeHtml(item.title || '(tanpa nama)')}</div>
          <div class="activity-item__meta">${item.type} · ${timeAgoId(item.time)}</div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Gagal memuat aktivitas terbaru:', err);
    list.innerHTML = `<div class="empty-state" style="color:#c94040;"><div class="ic">⚠️</div>Gagal memuat aktivitas. ${
      err.message === 'TIMEOUT'
        ? 'Waktu tunggu habis. Cek koneksi internet atau status project Supabase.'
        : 'Kemungkinan tabel "lokasi"/"umkm" belum ada, atau RLS memblokir akses baca. Cek Console (F12) untuk detail.'
    }</div>`;
  }
}

loadStats();
loadRecentActivity();
