(function () {
  var root = document.documentElement;
  var toggle = document.getElementById('themeToggle');
  function apply(mode) {
    if (mode) { root.setAttribute('data-theme', mode); }
    else { root.removeAttribute('data-theme'); }
  }
  var saved = null;
  try { saved = localStorage.getItem('theme'); } catch (e) {}
  apply(saved);
  if (toggle) {
    toggle.addEventListener('click', function () {
      var current = root.getAttribute('data-theme');
      var prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      var effectiveNow = current || (prefersDark ? 'dark' : 'light');
      var next = effectiveNow === 'dark' ? 'light' : 'dark';
      apply(next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }
}());

(function () {
  var ruler = document.getElementById('ruler');
  if (!ruler) { return; }
  var count = Math.ceil(window.innerWidth / 64) + 2;
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<span>0x' + (i * 0x40).toString(16).toUpperCase().padStart(4, '0') + '</span>';
  }
  ruler.innerHTML = html;
}());
