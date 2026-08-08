// tim-pengembang-page.js — logic halaman publik "Tim Pengembang".
// Ambil semua anggota tim dari Supabase (tabel `tim_pengembang`, diisi
// lewat Panel Admin -> Tim Pengembang) dan tampilkan sebagai grid kartu.
// Kalau tabel belum dibuat/masih kosong, tampilkan pesan yang ramah
// (bukan error teknis) supaya halaman tetap enak dilihat.

function timPageEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function timPageInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

async function loadTimPengembang() {
  const grid = document.getElementById('team-grid');
  if (!grid) return;

  try {
    const { data, error } = await supabaseClient
      .from('tim_pengembang')
      .select('id, nama, nim, prodi, devisi, foto_url, urutan')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    const anggota = data || [];

    if (anggota.length === 0) {
      grid.innerHTML = `<div class="empty-state">Data anggota tim belum ditambahkan. Kelola lewat Panel Admin &rarr; Tim Pengembang.</div>`;
      return;
    }

    grid.innerHTML = anggota.map(row => `
      <article class="team-card">
        <div class="team-card__photo">${
          row.foto_url
            ? `<img src="${timPageEscapeHtml(row.foto_url)}" alt="${timPageEscapeHtml(row.nama)}" loading="lazy">`
            : `<div class="team-card__initials">${timPageEscapeHtml(timPageInitials(row.nama))}</div>`
        }</div>
        <div class="team-card__body">
          <div class="team-card__title">
            <h3 class="team-card__name">${timPageEscapeHtml(row.nama)}</h3>
            <span class="team-card__badge" title="Anggota Tim Resmi">
              <svg viewBox="0 0 24 24" fill="currentColor"><path d="m12 1.5 2.6 1.6 3-.7 1.3 2.8 2.8 1.3-.7 3 1.6 2.6-1.6 2.6.7 3-2.8 1.3-1.3 2.8-3-.7L12 22.5l-2.6-1.6-3 .7-1.3-2.8-2.8-1.3.7-3L1.5 12l1.6-2.6-.7-3 2.8-1.3L6.5 2.4l3 .7L12 1.5Z"/><path d="m8.8 12.3 2.2 2.2 4.2-4.6" stroke="var(--navy-deep)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>
            </span>
          </div>
          <p class="team-card__role">${timPageEscapeHtml(row.prodi || 'Anggota Tim Pengembang')}</p>
          <div class="team-card__meta">
            <div class="team-card__stats">
              ${row.nim ? `
              <span class="team-card__stat" title="NIM">
                <svg viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="14" rx="2.4" stroke="currentColor" stroke-width="1.6"/><circle cx="8.5" cy="11" r="1.8" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 16c.5-1.6 1.6-2.4 3-2.4s2.5.8 3 2.4M13.5 10h5M13.5 13.5h5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>
                ${timPageEscapeHtml(row.nim)}
              </span>` : ''}
            </div>
            ${row.devisi ? `<span class="team-card__tag">${timPageEscapeHtml(row.devisi)}</span>` : ''}
          </div>
        </div>
      </article>
    `).join('');
  } catch (err) {
    console.error('Gagal memuat Tim Pengembang:', err);
    grid.innerHTML = `<div class="empty-state"><strong>Gagal memuat data tim</strong>${timPageEscapeHtml(err.message || String(err))}</div>`;
  }
}

document.addEventListener('DOMContentLoaded', loadTimPengembang);
