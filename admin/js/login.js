// admin/js/login.js
// Login admin memakai Supabase Auth (email + password).
// Kalau sesi sudah aktif, langsung lempar ke dashboard.

const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const loginError = document.getElementById('loginError');

function showLoginError(message) {
  loginError.textContent = message;
  loginError.classList.add('is-visible');
}

function resetLoginButton() {
  loginBtn.disabled = false;
  loginBtn.textContent = 'Masuk';
}

(async () => {
  try {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (session && session.user) {
      window.location.replace('index.html');
    }
  } catch (err) {
    console.error('Gagal cek sesi awal:', err);
  }
})();

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('TIMEOUT')), ms)
    ),
  ]);
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('is-visible');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Memeriksa…';

  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;

  try {
    const { data, error } = await withTimeout(
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

    loginBtn.textContent = 'Berhasil! Mengalihkan…';
    setTimeout(() => {
      window.location.replace('index.html');
    }, 150);

  } catch (err) {
    console.error(err);
    showLoginError(
      err.message === 'TIMEOUT'
        ? 'Server tidak merespons. Cek koneksi internet atau status project Supabase kamu.'
        : 'Terjadi kesalahan tak terduga. Cek console (F12) untuk detail.'
    );
    resetLoginButton();
  }
});
