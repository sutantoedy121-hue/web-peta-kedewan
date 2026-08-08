// admin/js/admin-partials.js
// Sidebar sekarang ditulis langsung di setiap halaman admin (index.html,
// pengaturan.html, dst) supaya tidak bergantung pada fetch() ke
// partials/sidebar.html — beberapa hosting statis/gratisan kadang gagal
// atau memotong response fetch untuk file kecil, yang membuat sidebar
// tampil kosong/setengah jadi.
//
// File ini tetap ada (dan tetap men-dispatch event 'partials:loaded')
// supaya admin-ui.js & admin-auth.js yang menunggu event ini tetap jalan
// seperti biasa tanpa perlu diubah.

document.addEventListener('DOMContentLoaded', function () {
  document.dispatchEvent(new Event('partials:loaded'));
});
