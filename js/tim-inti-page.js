// tim-inti-page.js — logic bagian "Development Team" (Tim Inti) di
// halaman publik tim-pengembang.html. BEDA dengan js/tim-pengembang-page.js
// (yang menampilkan daftar umum semua anggota KKM): bagian ini khusus
// menampilkan 5 anggota inti yang benar-benar mengerjakan pembangunan
// situs, lengkap dengan detail (klik kartu -> modal) berisi deskripsi
// dan tautan media sosial.
//
// Data diambil dari Supabase tabel `tim_inti` (lihat migration_tim_inti.sql)
// dan dikelola lewat Panel Admin -> Tim Inti (Dev Team). Kalau tabel
// belum dibuat / masih kosong, dipakai FALLBACK_CORE_TEAM di bawah supaya
// bagian ini tetap tampil (bukan kosong) sebelum admin sempat mengisi
// data lewat Supabase.

const FALLBACK_CORE_TEAM = [
  { nama: 'M. Sailendra Abimanyu', prodi: 'Pend. Pancasila dan Kewarganegaraan', jabatan: 'Project Coordinator', foto_url: 'assets/dev-abimanyu.png', deskripsi: null, instagram: null, whatsapp: null, linkedin: null, email: null },
  { nama: 'Johan Dwi Setyo Utomo', prodi: 'Pend. Matematika', jabatan: 'Lead Graphic Designer', foto_url: 'assets/dev-johan.png', deskripsi: null, instagram: null, whatsapp: null, linkedin: null, email: null },
  { nama: 'Dedy Indra Setiawan', prodi: 'Pend. Teknologi Informasi', jabatan: 'Graphic Designer & Data Researcher', foto_url: 'assets/dev-dedy.png', deskripsi: null, instagram: null, whatsapp: null, linkedin: null, email: null },
  { nama: 'Edy Sutanto', prodi: 'Pend. Teknologi Informasi', jabatan: 'Web Developer', foto_url: 'assets/dev-edy.png', deskripsi: null, instagram: null, whatsapp: null, linkedin: null, email: null },
  { nama: 'Muhammad Towil H.', prodi: 'Pend. Ekonomi', jabatan: 'Construction Coordinator', foto_url: 'assets/dev-towil.png', deskripsi: null, instagram: null, whatsapp: null, linkedin: null, email: null },
];

let coreTeamData = [];

function ctEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function ctInitials(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function ctSocialUrl(type, value) {
  if (!value) return null;
  const v = value.trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  if (type === 'instagram') return `https://instagram.com/${v.replace(/^@/, '')}`;
  if (type === 'whatsapp') return `https://wa.me/${v.replace(/[^0-9]/g, '')}`;
  if (type === 'linkedin') return `https://linkedin.com/in/${v.replace(/^\//, '')}`;
  if (type === 'email') return `mailto:${v}`;
  return v;
}

const ctIcons = {
  instagram: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="1.6"/><circle cx="17.2" cy="6.8" r="1.1" fill="currentColor"/></svg>',
  whatsapp: '<svg viewBox="0 0 24 24" fill="none"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.2-1.4-.8-.7-1.4-1.6-1.6-1.9-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.4.1-.2 0-.4 0-.5-.1-.1-.6-1.4-.8-1.9-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.3.3-1 1-1 2.4s1 2.8 1.2 3c.1.2 2 3 4.7 4.3.7.3 1.2.5 1.6.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.3.2-.6.2-1.1.2-1.3-.1-.1-.2-.2-.5-.3Z" fill="currentColor" stroke="none"/><path d="M12 2a10 10 0 0 0-8.6 15l-1 3.7 3.8-1A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-2.5.7.7-2.4-.2-.3A8.2 8.2 0 1 1 12 20.2Z" fill="currentColor" stroke="none"/></svg>',
  linkedin: '<svg viewBox="0 0 24 24" fill="none"><rect x="3.5" y="3.5" width="17" height="17" rx="3" stroke="currentColor" stroke-width="1.6"/><path d="M7.8 10v6.2M7.8 7.7v.1M12 16.2v-3.6c0-1.4.9-2.4 2.2-2.4s2 .9 2 2.3v3.7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  email: '<svg viewBox="0 0 24 24" fill="none"><path d="M4 6h16v12H4V6Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="m4.5 6.5 7.5 6 7.5-6" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg>',
};

function ctPhotoHtml(row, sizeClass) {
  return row.foto_url
    ? `<img src="${ctEscapeHtml(row.foto_url)}" alt="${ctEscapeHtml(row.nama)}" loading="lazy">`
    : `<div class="${sizeClass}">${ctEscapeHtml(ctInitials(row.nama))}</div>`;
}

const ctZoomIcon = '<svg viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="6.5" stroke="currentColor" stroke-width="1.8"/><path d="m20 20-3.7-3.7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M11 8.5v5M8.5 11h5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

function renderCoreTeamGrid() {
  const grid = document.getElementById('core-team-grid');
  if (!grid) return;

  if (coreTeamData.length === 0) {
    grid.innerHTML = `<div class="empty-state">Data Development Team belum ditambahkan. Kelola lewat Panel Admin &rarr; Tim Inti (Dev Team).</div>`;
    return;
  }

  grid.innerHTML = coreTeamData.map((row, idx) => `
    <button type="button" class="core-team-card" data-core-team-idx="${idx}" title="Lihat detail ${ctEscapeHtml(row.nama)}">
      <span class="core-team-card__photo">
        ${ctPhotoHtml(row, 'core-team-card__initials')}
        <span class="core-team-card__photo-hint">${ctZoomIcon}</span>
      </span>
      <span class="core-team-card__name">${ctEscapeHtml(row.nama)}</span>
      ${row.prodi ? `<span class="core-team-card__prodi">${ctEscapeHtml(row.prodi)}</span>` : ''}
      ${row.jabatan ? `<span class="core-team-card__role">${ctEscapeHtml(row.jabatan)}</span>` : ''}
    </button>
  `).join('');

  grid.querySelectorAll('[data-core-team-idx]').forEach(btn => {
    btn.addEventListener('click', () => openCoreTeamModal(coreTeamData[Number(btn.dataset.coreTeamIdx)]));
  });
}

function openCoreTeamModal(row) {
  const modal = document.getElementById('coreTeamModal');
  const body = document.getElementById('coreTeamModalBody');
  if (!modal || !body) return;

  const socials = [
    { type: 'instagram', value: row.instagram },
    { type: 'whatsapp', value: row.whatsapp },
    { type: 'linkedin', value: row.linkedin },
    { type: 'email', value: row.email },
  ].map(s => ({ ...s, url: ctSocialUrl(s.type, s.value) })).filter(s => s.url);

  body.innerHTML = `
    <div class="person-modal__photo">${ctPhotoHtml(row, 'person-modal__photo--initials')}</div>
    <h2 class="person-modal__name">${ctEscapeHtml(row.nama)}</h2>
    ${row.jabatan ? `<div class="person-modal__role">${ctEscapeHtml(row.jabatan)}</div>` : ''}
    ${row.prodi ? `<p class="person-modal__prodi">${ctEscapeHtml(row.prodi)}</p>` : ''}
    ${row.deskripsi ? `<p class="person-modal__desc">${ctEscapeHtml(row.deskripsi)}</p>` : ''}
    ${socials.length ? `
      <div class="person-modal__social">
        ${socials.map(s => `<a href="${ctEscapeHtml(s.url)}" target="_blank" rel="noopener" title="${s.type}" aria-label="${s.type}">${ctIcons[s.type]}</a>`).join('')}
      </div>` : ''}
  `;

  modal.hidden = false;
}

function closeCoreTeamModal() {
  const modal = document.getElementById('coreTeamModal');
  if (modal) modal.hidden = true;
}

async function loadCoreTeam() {
  try {
    const { data, error } = await supabaseClient
      .from('tim_inti')
      .select('id, nama, jabatan, prodi, foto_url, deskripsi, instagram, whatsapp, linkedin, email, urutan')
      .order('urutan', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) throw error;

    coreTeamData = (data && data.length > 0) ? data : FALLBACK_CORE_TEAM;
  } catch (err) {
    console.warn('Tabel tim_inti belum tersedia, memakai data bawaan:', err.message || err);
    coreTeamData = FALLBACK_CORE_TEAM;
  }
  renderCoreTeamGrid();
}

// Judul section "Development Team" + judul & teks "Tentang Proyek" di
// halaman ini bisa diubah lewat Panel Admin -> Pengaturan Situs ->
// "Halaman Tim Pengembang" (tabel `pengaturan`, kolom dev_team_eyebrow /
// dev_team_title / tentang_proyek_judul / tentang_proyek_teks). Kalau
// kolom belum ada / kosong, teks bawaan yang sudah tertulis di HTML
// tetap tampil (tidak pernah kosong).
async function loadPengaturanTimPage() {
  try {
    const { data, error } = await supabaseClient
      .from('pengaturan')
      .select('dev_team_eyebrow, dev_team_title, tentang_proyek_judul, tentang_proyek_teks')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return;

    const eyebrowEl = document.getElementById('devTeamEyebrow');
    const titleEl = document.getElementById('devTeamTitle');
    const judulEl = document.getElementById('tentangProyekJudul');
    const teksEl = document.getElementById('tentangProyekTeks');

    if (eyebrowEl && data.dev_team_eyebrow) eyebrowEl.textContent = data.dev_team_eyebrow;
    if (titleEl && data.dev_team_title) titleEl.textContent = data.dev_team_title;
    if (judulEl && data.tentang_proyek_judul) judulEl.textContent = data.tentang_proyek_judul;
    if (teksEl && data.tentang_proyek_teks) teksEl.textContent = data.tentang_proyek_teks;
  } catch (err) {
    console.warn('Gagal memuat pengaturan halaman Tim Pengembang, memakai teks bawaan:', err.message || err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadCoreTeam();
  loadPengaturanTimPage();

  const modalClose = document.getElementById('coreTeamModalClose');
  const modalBackdrop = document.getElementById('coreTeamModalBackdrop');
  if (modalClose) modalClose.addEventListener('click', closeCoreTeamModal);
  if (modalBackdrop) modalBackdrop.addEventListener('click', closeCoreTeamModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCoreTeamModal();
  });
});
