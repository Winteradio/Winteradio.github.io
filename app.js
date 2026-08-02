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

// Live GitHub issue state — the 원인/해결 writeups on each issue-card are
// hand-curated and stay as-is; only the open/closed badge is kept in sync
// with the real issue so a later fix on GitHub doesn't leave the site saying
// "미해결" forever. data-gh-issue="owner/repo#123" on the .issue-state span.
// Falls back to whatever state is already written in the markup on failure.
(function () {
  var badges = document.querySelectorAll('[data-gh-issue]');
  if (!badges.length) { return; }

  badges.forEach(function (el) {
    var match = (el.getAttribute('data-gh-issue') || '').match(/^(.+)#(\d+)$/);
    if (!match) { return; }

    fetch('https://api.github.com/repos/' + match[1] + '/issues/' + match[2])
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.state) { return; }
        var closed = data.state === 'closed';
        el.textContent = closed ? '해결' : '미해결';
        el.classList.toggle('closed', closed);
        el.classList.toggle('open', !closed);
        el.title = 'GitHub에서 실시간으로 가져온 상태 (' + new Date().toLocaleDateString('ko-KR') + ' 기준)';
      })
      .catch(function () { /* keep the static fallback state already in the markup */ });
  });
}());
