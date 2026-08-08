// admin/js/admin-auth.js
// Wajib di-load SETELAH js/config.js (butuh variabel `supabaseClient` global).
// Melindungi halaman admin: kalau belum login, redirect ke login.html.
// Juga mengisi avatar/nama admin di topbar dan menangani tombol keluar.

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), ms)),
  ]);
}

function showAuthError(message) {
  document.body.classList.add('auth-ready'); // supaya pesan errornya kelihatan
  const main = document.querySelector('.main') || document.body;
  const box = document.createElement('div');
  box.style.cssText = 'margin:28px; padding:16px 18px; border-radius:10px; background:#fbeaea; color:#d64545; font-family:sans-serif; font-size:.9rem; font-weight:600;';
  box.textContent = message;
  main.prepend(box);
}

async function requireAdminSession() {
  let session, error;
  try {
    ({ data: { session }, error } = await withTimeout(supabaseClient.auth.getSession(), 8000));
  } catch (err) {
    console.error('Gagal cek sesi:', err);
    showAuthError(
      err.message === 'TIMEOUT'
        ? 'Koneksi ke server lambat/gagal saat memeriksa sesi login. Cek koneksi internet & status project Supabase, lalu muat ulang halaman.'
        : 'Terjadi kesalahan saat memeriksa sesi login. Buka Console (F12) untuk detail.'
    );
    return null;
  }

  if (error || !session) {
    window.location.href = 'login.html';
    return null;
  }

  document.body.classList.add('auth-ready');

  const user = session.user;
  const email = user.email || '';
  const initial = email.charAt(0).toUpperCase() || 'A';

  document.querySelectorAll('[data-admin-initial]').forEach(el => el.textContent = initial);
  document.querySelectorAll('[data-admin-email]').forEach(el => el.textContent = email);

  return user;
}

function bindLogout() {
  document.querySelectorAll('[data-logout]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      if (!window.confirm('Keluar dari Panel Admin sekarang?')) return;
      await supabaseClient.auth.signOut();
      window.location.href = 'login.html';
    });
  });
}

document.addEventListener('partials:loaded', () => {
  bindLogout();
});

requireAdminSession();
