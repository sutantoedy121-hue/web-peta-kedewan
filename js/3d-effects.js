/**
 * 3d-effects.js — Neobrutalism 3D Tilt & Interactive Motion Engine
 * Memberikan animasi tilt 3D, depth parallax, dan pantulan cahaya real-time
 * pada kartu, tombol, badge, dan elemen interaktif website Peta Kedewan.
 */

(function () {
  'use strict';

  // Cek apakah user mengaktifkan reduce motion atau perangkat touch-only
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  if (prefersReducedMotion) return;

  const TILT_CONFIG = {
    maxTilt: 12,        // Derajat tilt maksimal
    perspective: 900,   // Perspektif 3D
    scale: 1.03,        // Skala saat hover
    speed: 400,         // Durasi transisi kembali (ms)
    easing: 'cubic-bezier(.03,.98,.52,.99)',
    glare: true,        // Efek pantulan cahaya specular 3D
    maxGlare: 0.25      // Opacity maksimal pantulan
  };

  const processedElements = new WeakSet();

  function init3DTilt(el) {
    if (!el || processedElements.has(el)) return;
    processedElements.add(el);

    // Siapkan styling dasar 3D
    el.style.transformStyle = 'preserve-3d';
    el.style.willChange = 'transform';
    el.style.transition = `transform ${TILT_CONFIG.speed}ms ${TILT_CONFIG.easing}`;

    // Buat layer pantulan specular jika aktif
    let glareEl = null;
    if (TILT_CONFIG.glare && !isTouchDevice) {
      glareEl = document.createElement('div');
      glareEl.className = 'neo-3d-glare';
      glareEl.style.position = 'absolute';
      glareEl.style.inset = '0';
      glareEl.style.borderRadius = 'inherit';
      glareEl.style.pointerEvents = 'none';
      glareEl.style.background = 'radial-gradient(circle at 50% 50%, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0) 70%)';
      glareEl.style.opacity = '0';
      glareEl.style.mixBlendMode = 'overlay';
      glareEl.style.transition = 'opacity 0.2s ease';
      glareEl.style.zIndex = '10';
      el.appendChild(glareEl);
    }

    let isHovered = false;
    let bounds = null;

    function onMouseEnter() {
      if (isTouchDevice) return;
      isHovered = true;
      bounds = el.getBoundingClientRect();
      el.style.transition = 'none'; // Instant tracking saat mouse bergerak
      if (glareEl) glareEl.style.opacity = String(TILT_CONFIG.maxGlare);
    }

    function onMouseMove(e) {
      if (!isHovered || isTouchDevice) return;
      if (!bounds) bounds = el.getBoundingClientRect();

      const mouseX = e.clientX - bounds.left;
      const mouseY = e.clientY - bounds.top;

      const percentX = (mouseX / bounds.width) * 2 - 1;   // -1 ke 1
      const percentY = (mouseY / bounds.height) * 2 - 1;  // -1 ke 1

      const tiltX = (percentY * -TILT_CONFIG.maxTilt).toFixed(2);
      const tiltY = (percentX * TILT_CONFIG.maxTilt).toFixed(2);

      el.style.transform = `perspective(${TILT_CONFIG.perspective}px) rotateX(${tiltX}deg) rotateY(${tiltY}deg) scale3d(${TILT_CONFIG.scale}, ${TILT_CONFIG.scale}, 1.05) translateZ(8px)`;

      if (glareEl) {
        const glareX = (mouseX / bounds.width) * 100;
        const glareY = (mouseY / bounds.height) * 100;
        glareEl.style.background = `radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 65%)`;
      }
    }

    function onMouseLeave() {
      if (isTouchDevice) return;
      isHovered = false;
      bounds = null;
      el.style.transition = `transform ${TILT_CONFIG.speed}ms ${TILT_CONFIG.easing}`;
      el.style.transform = `perspective(${TILT_CONFIG.perspective}px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1) translateZ(0px)`;
      if (glareEl) glareEl.style.opacity = '0';
    }

    el.addEventListener('mouseenter', onMouseEnter, { passive: true });
    el.addEventListener('mousemove', onMouseMove, { passive: true });
    el.addEventListener('mouseleave', onMouseLeave, { passive: true });
  }

  // Target selektor untuk efek 3D
  const TARGET_SELECTORS = [
    '.loc-card',
    '.umkm-card',
    '.team-card',
    '.core-team-card',
    '.stat-card',
    '.quick-link',
    '.umkm-cta'
  ];

  function scanAndApply() {
    TARGET_SELECTORS.forEach(sel => {
      document.querySelectorAll(sel).forEach(init3DTilt);
    });
  }

  // Scan saat DOM siap
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scanAndApply);
  } else {
    scanAndApply();
  }

  // Observer untuk kartu-kartu yang dimuat secara asinkron dari Supabase
  const observer = new MutationObserver((mutations) => {
    let shouldScan = false;
    for (const mutation of mutations) {
      if (mutation.addedNodes.length > 0) {
        shouldScan = true;
        break;
      }
    }
    if (shouldScan) scanAndApply();
  });

  observer.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });

  // Re-scan berkala saat awal load
  setTimeout(scanAndApply, 400);
  setTimeout(scanAndApply, 1200);
  setTimeout(scanAndApply, 2500);

})();
