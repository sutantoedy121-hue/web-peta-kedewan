// partials.js — mengisi data dinamis (logo, nama situs, footer) ke header &
// footer.

// Auto-load efek 3D interaktif
if (!document.querySelector('script[src*="3d-effects.js"]')) {
  const s3d = document.createElement('script');
  s3d.src = 'js/3d-effects.js';
  document.head.appendChild(s3d);
}

function escapeHtmlPartial(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// Isi nama kelompok, media sosial, dan jam layanan di footer dari
// tabel `pengaturan` (diatur admin lewat Panel Admin -> Pengaturan
// Situs). Kalau tabel belum ada / gagal diambil, teks bawaan di
// footer/footer.html tetap tampil dan ikon sosial tetap tersembunyi.
function buildWaLink(raw) {
  let digits = (raw || '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (!digits.startsWith('62')) digits = '62' + digits;
  return `https://wa.me/${digits}`;
}

async function loadFooterSettings() {
  const kelompokEl = document.getElementById('footerKelompokNama');
  const emailEl = document.getElementById('footerEmail');
  const igEl = document.getElementById('footerInstagram');
  const ttEl = document.getElementById('footerTiktok');
  const waEl = document.getElementById('footerWhatsapp');
  const jamEl = document.getElementById('footerJam');
  if (!kelompokEl && !emailEl && !igEl && !ttEl && !waEl && !jamEl) return;
  if (typeof supabaseClient === 'undefined') return;

  try {
    const { data, error } = await supabaseClient
      .from('pengaturan')
      .select('kelompok_nama, email, instagram_url, tiktok_url, telepon_wa, jam_layanan')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return;

    if (kelompokEl && data.kelompok_nama) kelompokEl.textContent = data.kelompok_nama;

    if (emailEl) {
      if (data.email) { emailEl.href = `mailto:${data.email}`; emailEl.style.display = ''; }
      else emailEl.style.display = 'none';
    }
    if (igEl) {
      if (data.instagram_url) { igEl.href = data.instagram_url; igEl.style.display = ''; }
      else igEl.style.display = 'none';
    }
    if (ttEl) {
      if (data.tiktok_url) { ttEl.href = data.tiktok_url; ttEl.style.display = ''; }
      else ttEl.style.display = 'none';
    }
    if (waEl) {
      const waLink = buildWaLink(data.telepon_wa);
      if (waLink) { waEl.href = waLink; waEl.style.display = ''; }
      else waEl.style.display = 'none';
    }

    if (jamEl && data.jam_layanan) {
      jamEl.innerHTML = data.jam_layanan
        .split('\n')
        .map((line) => `<p>${escapeHtmlPartial(line)}</p>`)
        .join('');
    }
  } catch (err) {
    console.error('Gagal memuat pengaturan footer:', err);
  }
}

// Cache logo/nama situs di localStorage supaya saat pindah halaman
// (reload penuh, bukan SPA) logo asli bisa langsung dipasang dari cache
// tanpa menunggu round-trip ke Supabase — ini yang sebelumnya bikin logo
// "kedip" balik ke ikon default sesaat setiap pindah menu. Diterapkan
// oleh inline script kecil di setiap halaman (lihat header di *.html),
// yang jalan lebih dulu daripada script ini.
const BRAND_CACHE_KEY = 'kedewanBrand';

function applyBrandData(data) {
  const logoTargets = [document.getElementById('brandLogo'), document.getElementById('footerBrandLogo')];
  if (data.logo_url) {
    logoTargets.forEach((el) => {
      if (!el) return;
      const img = new Image();
      img.onload = () => { el.innerHTML = ''; el.appendChild(img); };
      img.onerror = () => { /* URL rusak/tidak bisa diakses: biarkan ikon default */ };
      img.src = data.logo_url;
      img.alt = data.site_name || 'Logo';
    });

    // Favicon tab browser ikut logo yang sama. setKedewanFavicon()
    // didefinisikan di js/header.js (dipanggil lebih dulu dari cache);
    // di sini dipanggil lagi dengan data TERBARU dari Supabase, supaya
    // favicon otomatis ikut berubah begitu admin ganti logo di
    // Pengaturan Situs, tanpa perlu tunggu cache lama kedaluwarsa.
    if (typeof window.setKedewanFavicon === 'function') {
      window.setKedewanFavicon(data.logo_url);
    }
  }

  const nameTargets = [document.getElementById('brandName'), document.getElementById('footerBrandName')];
  if (data.site_name) {
    nameTargets.forEach((el) => { if (el) el.textContent = data.site_name; });
    document.title = document.title.replace(/^Kedewan/, data.site_name);
  }

  const taglineEl = document.getElementById('brandTagline');
  if (taglineEl && data.site_tagline) taglineEl.textContent = data.site_tagline;
}

// Terapkan logo & nama situs (tabel `pengaturan`, kolom logo_url /
// site_name / site_tagline) ke header & footer. Diatur admin lewat
// Panel Admin -> Pengaturan Situs -> "Logo Situs". Kalau logo_url
// kosong / gagal dimuat, ikon SVG bawaan tetap tampil (tidak error).
async function loadBrandSettings() {
  if (typeof supabaseClient === 'undefined') return;

  try {
    const { data, error } = await supabaseClient
      .from('pengaturan')
      .select('site_name, site_tagline, logo_url')
      .eq('id', 1)
      .maybeSingle();
    if (error || !data) return;

    applyBrandData(data);

    try {
      localStorage.setItem(BRAND_CACHE_KEY, JSON.stringify(data));
    } catch (e) { /* localStorage penuh/nonaktif: abaikan, tidak fatal */ }
  } catch (err) {
    console.error('Gagal memuat pengaturan logo/nama situs:', err);
  }
}

// Tombol hamburger (3 garis) untuk buka/tutup menu di mobile.
// CATATAN PERBAIKAN: sebelumnya logic ini ada di main.js/lokasi-page.js/
// umkm-page.js, menunggu event 'partials:loaded'. Tapi karena header
// sekarang ditulis sinkron oleh js/header.js (document.write, dieksekusi
// di awal <body>, jauh sebelum script ini dimuat di akhir <body>), event
// 'partials:loaded' yang di-dispatch di sini sudah lewat saat listener di
// main.js/lokasi-page.js/umkm-page.js sempat dipasang. Akibatnya tombol
// jadi tidak merespons klik sama sekali. Solusinya: pasang listener-nya
// langsung di sini, tidak lagi bergantung pada event 'partials:loaded'.
function initNavToggle() {
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.querySelector('.main-nav');
  const backdrop = document.getElementById('navBackdrop');
  if (!navToggle || !mainNav) return;

  function setOpen(open) {
    mainNav.classList.toggle('is-open', open);
    navToggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (backdrop) {
      backdrop.hidden = !open;
      // requestAnimationFrame supaya transisi opacity di CSS sempat jalan
      // (kalau class 'is-open' & hidden dilepas di frame yang sama, browser
      // tidak sempat animasikan transisinya).
      if (open) requestAnimationFrame(() => backdrop.classList.add('is-open'));
      else backdrop.classList.remove('is-open');
    }
  }

  navToggle.addEventListener('click', () => {
    setOpen(!mainNav.classList.contains('is-open'));
  });

  // Menu dropdown mobile sebelumnya melayang tanpa latar di atas konten
  // halaman (terlihat "menumpuk" dengan judul/hero di belakangnya). Sekarang
  // ada .nav-backdrop yang menggelapkan konten di belakang menu, dan bisa
  // ditutup dengan tap di area gelap itu.
  if (backdrop) backdrop.addEventListener('click', () => setOpen(false));

  // Tutup juga saat salah satu link menu di-tap, supaya tidak ada jeda
  // menu/backdrop masih kelihatan terbuka pas halaman baru mulai dimuat.
  mainNav.querySelectorAll('a').forEach((link) => {
    link.addEventListener('click', () => setOpen(false));
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') setOpen(false);
  });

  // Tutup menu otomatis kalau layar dilebarkan balik ke ukuran desktop,
  // biar tidak "nyangkut" kebuka waktu balik dari mobile ke desktop.
  window.addEventListener('resize', () => {
    if (window.innerWidth > 860) setOpen(false);
  });
}

// ---------- Lightbox foto: klik gambar di galeri modal (Titik Lokasi /
// UMKM) atau foto profil di modal detail Tim Inti (Development Team)
// untuk melihatnya penuh & besar. Dibuat sekali di sini (bukan di
// lokasi-page.js / umkm-page.js / tim-inti-page.js) karena
// halaman-halaman itu memuat file ini, dan galeri/modalnya dirender
// ulang tiap kali modal dibuka — jadi listener-nya dipasang lewat event
// delegation di document, bukan per-img.
function initImageLightbox() {
  if (document.getElementById('imgLightbox')) return; // sudah pernah dibuat

  const lightbox = document.createElement('div');
  lightbox.className = 'img-lightbox';
  lightbox.id = 'imgLightbox';
  lightbox.innerHTML = `
    <button type="button" class="img-lightbox__close" id="imgLightboxClose" aria-label="Tutup">
      <svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
    </button>
    <img id="imgLightboxImg" src="" alt="" />
    <span class="img-lightbox__hint">Klik di luar foto atau tekan Esc untuk menutup</span>
  `;
  document.body.appendChild(lightbox);

  const imgEl = document.getElementById('imgLightboxImg');

  function openLightbox(src, alt) {
    imgEl.src = src;
    imgEl.alt = alt || '';
    lightbox.classList.add('is-open');
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
  }

  // Delegasi: tangkap klik pada foto di dalam galeri modal, di mana pun
  // modalnya berada (id="lokasiModalBody" atau id="umkmModalBody").
  document.addEventListener('click', (e) => {
    const galleryImg = e.target.closest('.lokasi-modal__gallery img, .person-modal__photo img');
    if (galleryImg) {
      openLightbox(galleryImg.src, galleryImg.alt);
      return;
    }
    // Klik foto besar itu sendiri, atau area gelap di sekitarnya -> tutup.
    if (e.target === lightbox || e.target === imgEl) closeLightbox();
  });

  document.getElementById('imgLightboxClose').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeLightbox();
  });
}

function initPartials() {
  // Header & footer sudah ada di HTML sejak awal, jadi langsung ambil
  // elemennya di sini — tidak perlu menunggu fetch lagi. Event
  // 'partials:loaded' tetap di-dispatch untuk jaga-jaga kalau ada script
  // lama yang masih memakainya, tapi tidak lagi jadi satu-satunya jalan.
  initNavToggle();
  initImageLightbox();
  document.dispatchEvent(new Event('partials:loaded'));

  if (typeof window.initHeaderSearch === 'function') window.initHeaderSearch();

  loadFooterSettings();
  loadBrandSettings();
}

initPartials();
