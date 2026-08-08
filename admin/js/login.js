// admin/js/login.js
// Login admin memakai Supabase Auth (email + password).
// Kalau sesi sudah aktif (misal buka lagi tab lama), langsung lempar ke dashboard.

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.add('is-visible');
}

(async () => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session) window.location.href = 'index.html';
  } catch (err) {
    console.error('Gagal cek sesi awal:', err);
  }
})();

// Bungkus request dengan batas waktu 10 detik supaya tombol tidak
// menggantung selamanya kalau Supabase tidak merespons (mis. project
// sedang paused / koneksi internet putus).
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

function resetLoginButton() {
  loginBtn.disabled = false;
  loginBtn.textContent = 'Masuk';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('is-visible');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Memeriksa…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { error } = await withTimeout(
      supabaseClient.auth.signInWithPassword({ email, password }),
      10000
    );

    if (error) {
      showLoginError(
        error.message === 'Invalid login credentials'
          ? 'Email atau kata sandi salah.'
          : error.message
      );
      resetLoginButton();
      return;
    }

    window.location.href = 'index.html';
  } catch (err) {
    console.error(err);
    showLoginError(
      err.message === 'TIMEOUT'
        ? 'Server tidak merespons. Cek koneksi internet atau status project Supabase kamu (kemungkinan sedang paused).'
        : 'Terjadi kesalahan tak terduga. Cek console (F12) untuk detail.'
    );
    resetLoginButton();
  }
});
