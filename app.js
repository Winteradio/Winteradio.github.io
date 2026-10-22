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

// Live open-issue list — separate from the hand-curated bug cards above.
// Renders every currently-open issue straight from the GitHub API, so the
// page always reflects the real tracker without needing a manual update.
// data-gh-issues-list="owner/repo" on an empty container.
(function () {
  function escapeHtml(s) {
    var div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  var lists = document.querySelectorAll('[data-gh-issues-list]');
  lists.forEach(function (el) {
    var repo = el.getAttribute('data-gh-issues-list');

    fetch('https://api.github.com/repos/' + repo + '/issues?state=open&per_page=20')
      .then(function (res) { return res.ok ? res.json() : []; })
      .then(function (issues) {
        issues = (issues || []).filter(function (i) { return !i.pull_request; });

        if (!issues.length) {
          el.innerHTML = '<p class="foot-line" style="font-size:13px;">지금 열려 있는 이슈 없음.</p>';
          return;
        }

        el.innerHTML = issues.map(function (i) {
          return '<div class="issue-card"><div class="issue-head">' +
            '<span class="issue-num mono">#' + i.number + '</span>' +
            '<span class="issue-title"><a href="' + i.html_url + '" target="_blank" rel="noopener">' +
              escapeHtml(i.title) + '</a></span>' +
            '<span class="issue-state open mono">미해결</span>' +
            '</div></div>';
        }).join('');
      })
      .catch(function () {
        el.innerHTML = '<p class="foot-line" style="font-size:13px;">GitHub에서 못 불러옴 — ' +
          '<a href="https://github.com/' + repo + '/issues" target="_blank" rel="noopener">직접 보기 →</a></p>';
      });
  });
}());
