// js/hero-bg.js — Slide latar belakang hero (beranda publik)
// Mengambil daftar gambar dari tabel `hero_background` (diisi admin
// lewat Panel Admin -> Pengaturan Situs -> Background Hero) dan
// menampilkannya sebagai slideshow otomatis (crossfade tiap 10 detik).
// Kalau admin belum mengunggah gambar apa pun, hero tetap tampil
// seperti biasa (gradient polos) — tidak ada yang berubah.

const HERO_SLIDE_INTERVAL_MS = 10000; // 10 detik

async function loadHeroBackgrounds() {
  const heroSection = document.querySelector('.hero');
  const bgWrap = document.getElementById('heroBg');
  if (!heroSection || !bgWrap || !window.supabaseClient) return;

  try {
    const { data, error } = await supabaseClient
      .from('hero_background')
      .select('id, gambar_url')
      .order('urutan', { ascending: true });

    if (error) throw error;
    if (!data || data.length === 0) return; // biarkan hero tampil default (tanpa gambar)

    bgWrap.innerHTML = '';
    data.forEach((row, i) => {
      if (!row.gambar_url) return;
      const slide = document.createElement('div');
      slide.className = 'hero-bg__slide' + (i === 0 ? ' is-active' : '');
      slide.style.backgroundImage = `url("${row.gambar_url}")`;
      bgWrap.appendChild(slide);
    });

    heroSection.classList.add('hero--has-bg');

    const slides = Array.from(bgWrap.querySelectorAll('.hero-bg__slide'));
    if (slides.length > 1) {
      let current = 0;
      setInterval(() => {
        slides[current].classList.remove('is-active');
        current = (current + 1) % slides.length;
        slides[current].classList.add('is-active');
      }, HERO_SLIDE_INTERVAL_MS);
    }
  } catch (err) {
    console.error('Gagal memuat background hero:', err);
    // Diamkan di publik — hero tetap tampil default tanpa gambar.
  }
}

loadHeroBackgrounds();
