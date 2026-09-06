// admin/js/admin-auth.js
// Wajib di-load SETELAH js/config.js (butuh variabel `supabaseClient` global).
// Melindungi halaman admin: kalau belum login, redirect ke login.html.
// Juga mengisi avatar/nama admin di topbar dan menangani tombol keluar.

function showAuthError(message) {
  document.body.classList.add('auth-ready');
  const main = document.querySelector('.main') || document.body;
  const box = document.createElement('div');
  box.style.cssText = 'margin:28px; padding:16px 18px; border-radius:10px; background:#fbeaea; color:#d64545; font-family:sans-serif; font-size:.9rem; font-weight:600;';
  box.textContent = message;
  main.prepend(box);
}

function applyAdminUser(user) {
  if (!user) return;
  document.body.classList.add('auth-ready');
  const email = user.email || '';
  const initial = email.charAt(0).toUpperCase() || 'A';

  document.querySelectorAll('[data-admin-initial]').forEach(el => el.textContent = initial);
  document.querySelectorAll('[data-admin-email]').forEach(el => el.textContent = email);
}

async function requireAdminSession() {
  if (typeof supabaseClient === 'undefined') {
    console.error('supabaseClient belum dimuat');
    return null;
  }

  // 1. Coba baca sesi langsung
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      applyAdminUser(session.user);
      return session.user;
    }
  } catch (err) {
    console.warn('Gagal getSession tahap 1:', err);
  }

  // 2. Beri waktu toleransi untuk Supabase auth hydration dari localStorage
  return new Promise((resolve) => {
    let resolved = false;

    // Pasang listener auth state change jika sesi sedang dimuat
    let subscription = null;
    try {
      const res = supabaseClient.auth.onAuthStateChange((event, session) => {
        if (session && session.user) {
          resolved = true;
          applyAdminUser(session.user);
          resolve(session.user);
        }
      });
      subscription = res.data ? res.data.subscription : null;
    } catch (e) {
      console.warn('onAuthStateChange error:', e);
    }

    // Fallback timer: jika setelah 700ms tetap tidak ada sesi, redirect ke login
    setTimeout(async () => {
      if (resolved) return;
      try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        if (session && session.user) {
          applyAdminUser(session.user);
          resolve(session.user);
          return;
        }
      } catch (e) {}

      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
      window.location.replace('login.html');
      resolve(null);
    }, 700);
  });
}

function bindLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.confirm('Keluar dari Panel Admin sekarang?')) return;
      await supabaseClient.auth.signOut();
      window.location.replace('login.html');
    });
  });
}

document.addEventListener('partials:loaded', () => {
  bindLogout();
});

requireAdminSession();
