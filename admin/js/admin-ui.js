// admin/js/admin-ui.js — interaksi ringan dashboard admin (tanpa dependency)

document.addEventListener('partials:loaded', function () {
  // Toggle sidebar di layar kecil
  var toggle = document.getElementById('menuToggle');
  var sidebar = document.getElementById('sidebar');
  if (toggle && sidebar) {
    toggle.addEventListener('click', function () {
      sidebar.classList.toggle('is-open');
    });
  }
});

document.addEventListener('DOMContentLoaded', function () {
  // Auto-hide flash message setelah beberapa detik
  var alertBox = document.querySelector('.alert');
  if (alertBox) {
    setTimeout(function () {
      alertBox.style.transition = 'opacity .4s';
      alertBox.style.opacity = '0';
      setTimeout(function () { alertBox.style.display = 'none'; }, 400);
    }, 4500);
  }
});
