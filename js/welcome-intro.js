/**
 * welcome-intro.js — Animasi Sambutan Neobrutalism 3D (Welcome Screen)
 * Ditampilkan saat pengunjung pertama kali membuka website Peta Kedewan.
 */

(function () {
  'use strict';

  // Hanya jalankan di situs publik (bukan di dalam folder /admin/)
  if (location.pathname.includes('/admin/')) return;

  function createWelcomeModal() {
    // Cek jika sudah ada di DOM
    if (document.getElementById('welcomeOverlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'welcomeOverlay';
    overlay.className = 'welcome-overlay';
    overlay.innerHTML = `
      <div class="welcome-card" id="welcomeCard">
        <button type="button" class="welcome-close" id="welcomeClose" aria-label="Tutup Sambutan">&times;</button>
        
        <div class="welcome-mascots">
          <div class="welcome-mascot welcome-mascot--main">
            <img src="assets/3d/compass.png" alt="3D Compass Mascot" />
          </div>
          <div class="welcome-mascot welcome-mascot--sub">
            <img src="assets/3d/sparkles.png" alt="3D Sparkles" />
          </div>
        </div>

        <span class="eyebrow">✨ Selamat Datang di Portal Resmi</span>
        <h2 class="welcome-title">Kecamatan Kedewan</h2>
        
        <p class="welcome-desc">
          Peta interaktif titik lokasi, fasilitas umum, potensi wisata, dan produk UMKM warga dari <strong>5 desa</strong> di Kabupaten Bojonegoro.
        </p>

        <div class="welcome-villages">
          <span class="village-pill">📍 Kedewan</span>
          <span class="village-pill">📍 Hargomulyo</span>
          <span class="village-pill">📍 Wonocolo</span>
          <span class="village-pill">📍 Beji</span>
          <span class="village-pill">📍 Kawengan</span>
        </div>

        <div class="welcome-actions">
          <button type="button" class="btn btn-primary welcome-enter-btn" id="welcomeEnterBtn">
            Mulai Jelajahi Peta 🚀
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    function closeWelcome() {
      overlay.classList.add('is-closing');
      setTimeout(() => {
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      }, 400);
      try {
        sessionStorage.setItem('kedewan_welcome_seen', 'true');
      } catch (e) {}
    }

    const enterBtn = document.getElementById('welcomeEnterBtn');
    const closeBtn = document.getElementById('welcomeClose');

    if (enterBtn) enterBtn.addEventListener('click', closeWelcome);
    if (closeBtn) closeBtn.addEventListener('click', closeWelcome);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeWelcome();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && document.getElementById('welcomeOverlay')) {
        closeWelcome();
      }
    });
  }

  // Tampilkan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(createWelcomeModal, 150);
    });
  } else {
    setTimeout(createWelcomeModal, 150);
  }

})();
