// Commit activity per repository, one number per month (KST), starting at `start`.
// Non-merge commits only; Game-Engine includes the update/vulkan-rhi work branch.
// To refresh, recount and replace the `counts` arrays — the heatmap, the table view
// and the per-library strips all derive from this one object.
window.ACTIVITY = {
  start: [2023, 3],
  asOf: '2026-10-22',
  repos: [
    { key: 'engine', name: 'Game-Engine', href: 'engine.html',
      counts: [4,3,8,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,6,2,5,7,38,29,14,6,3,3,10] },
    { key: 'ecs', name: 'ECS', href: 'ecs.html',
      counts: [0,0,0,4,0,1,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,9,1,1,2,5,2,0,0,2,0,0] },
    { key: 'memory', name: 'Memory', href: 'memory.html',
      counts: [0,0,31,17,11,3,5,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,8,1,1,2,3,2,0,1,1,0,0] },
    { key: 'reflection', name: 'Reflection', href: 'reflection.html',
      counts: [0,0,0,0,0,0,0,0,0,0,3,0,0,1,0,0,0,0,0,0,0,0,0,6,0,0,0,0,0,0,0,6,6,16,0,0,0,2,0,0,0,1,0,0] },
    { key: 'container', name: 'Container', href: 'container.html',
      counts: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1,9,0,0,0,0,0,0,0,10,2,1,2,2,1,0,1,3,0,0] },
    { key: 'log', name: 'Log', href: 'https://github.com/Winteradio/Log',
      counts: [0,0,2,14,2,0,2,0,0,0,1,1,0,0,0,0,0,0,0,0,0,3,2,1,5,0,0,0,0,0,0,33,12,4,1,0,0,0,0,0,0,2,0,0] },
    { key: 'cmake', name: 'CMake', href: 'https://github.com/Winteradio/CMake',
      counts: [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,4,2,1,0,0,0,0,0,0,0,1,0,0] }
  ],
  eras: [
    { n: '01', from: '2023-03', to: '2023-10' },
    { n: '02', from: '2023-11', to: '2025-09' },
    { n: '03', from: '2025-10', to: '2025-12' },
    { n: '04', from: '2026-01', to: '2026-03' },
    { n: '05', from: '2026-04', to: '2026-06' },
    { n: '06', from: '2026-07', to: '2026-10' }
  ]
};

// Renders every [data-activity] host: "all" draws the repo × month grid with era
// brackets, a repo key draws that repo's single strip. Sequential one-hue ramp,
// per-cell hover tooltip, and a <details> table view so no value is hover-only.
(function () {
  var A = window.ACTIVITY;
  var hosts = document.querySelectorAll('[data-activity]');
  if (!A || !hosts.length) { return; }

  var NS = 'http://www.w3.org/2000/svg';
  var LOWER = [0, 1, 3, 6, 11, 21];
  var FILL = ['#efefef', '#d0d0d0', '#a0a0a0', '#6b6b6b', '#3b3b3b', '#111111'];
  var RANGE = ['0', '1–2', '3–5', '6–10', '11–20', '21+'];
  var COUNT = A.repos[0].counts.length;
  var BASE = A.start[0] * 12 + (A.start[1] - 1);

  function monthLabel(i) {
    var t = BASE + i, m = t % 12 + 1;
    return Math.floor(t / 12) + '.' + (m < 10 ? '0' : '') + m;
  }
  function indexOf(ym) {
    var p = ym.split('-');
    return (+p[0] * 12 + (+p[1] - 1)) - BASE;
  }
  function level(n) {
    for (var i = LOWER.length - 1; i > 0; i--) { if (n >= LOWER[i]) { return i; } }
    return 0;
  }
  function svgNode(name, attrs, parent) {
    var e = document.createElementNS(NS, name);
    for (var k in attrs) { e.setAttribute(k, attrs[k]); }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function svgText(parent, x, y, cls, str, anchor) {
    var t = svgNode('text', { x: x, y: y, 'class': cls }, parent);
    if (anchor) { t.setAttribute('text-anchor', anchor); }
    t.textContent = str;
    return t;
  }
  function htmlNode(name, cls, str, parent) {
    var e = document.createElement(name);
    if (cls) { e.className = cls; }
    if (str !== undefined) { e.textContent = str; }
    if (parent) { parent.appendChild(e); }
    return e;
  }
  function sum(arr) { return arr.reduce(function (a, b) { return a + b; }, 0); }

  hosts.forEach(function (host) {
    var key = host.getAttribute('data-activity');
    var all = key === 'all';
    var rows = all ? A.repos : A.repos.filter(function (r) { return r.key === key; });
    if (!rows.length) { return; }

    var LW = all ? 104 : 16, CELL = 15, STEP = 18;
    var top = all ? 48 : 24;
    var W = LW + COUNT * STEP;
    var H = top + rows.length * STEP;

    host.textContent = '';
    host.classList.add('hm');
    if (!all) { host.classList.add('single'); }

    var scroll = htmlNode('div', 'hm-scroll', undefined, host);
    var svg = svgNode('svg', { viewBox: '0 0 ' + W + ' ' + H, role: 'img' }, scroll);
    svg.setAttribute('aria-label', all
      ? '저장소 7개의 월별 커밋 수 히트맵, ' + monthLabel(0) + '부터 ' + monthLabel(COUNT - 1) + '까지. 아래 표에 같은 값이 있음.'
      : rows[0].name + ' 저장소의 월별 커밋 수, ' + monthLabel(0) + '부터 ' + monthLabel(COUNT - 1) + '까지.');

    for (var i = 0; i < COUNT; i++) {
      var t = BASE + i;
      if (i === 0 || t % 12 === 0) {
        var x = LW + i * STEP;
        svgText(svg, x, top - 9, 'yr mono', String(Math.floor(t / 12)));
        if (i > 0) { svgNode('line', { x1: x - 1.5, x2: x - 1.5, y1: top - 20, y2: H, 'class': 'ysep' }, svg); }
      }
    }

    if (all) {
      A.eras.forEach(function (e) {
        var x1 = LW + indexOf(e.from) * STEP, x2 = LW + indexOf(e.to) * STEP + CELL;
        svgNode('path', { d: 'M' + x1 + ',18V12H' + x2 + 'V18', 'class': 'era-line' }, svg);
        svgText(svg, x1, 8, 'era-n mono', e.n);
      });
    }

    rows.forEach(function (r, ri) {
      var y = top + ri * STEP;
      if (all) {
        var link = svgNode('a', { href: r.href }, svg);
        if (r.href.indexOf('http') === 0) { link.setAttribute('target', '_blank'); link.setAttribute('rel', 'noopener'); }
        svgText(link, 0, y + 12, 'rowlbl', r.name);
      }
      r.counts.forEach(function (n, ci) {
        svgNode('rect', {
          x: LW + ci * STEP, y: y, width: CELL, height: CELL, rx: 2,
          fill: FILL[level(n)], 'class': 'cell',
          'data-n': n, 'data-m': monthLabel(ci), 'data-r': r.name
        }, svg);
      });
    });

    // Hover tooltip — value first, then repo · month.
    var tip = htmlNode('div', 'hm-tip', undefined, host);
    var tipValue = htmlNode('b', '', '', tip);
    var tipLabel = htmlNode('span', '', '', tip);
    var hot = null;
    svg.addEventListener('pointerover', function (ev) {
      var c = ev.target;
      if (!c.classList || !c.classList.contains('cell')) { return; }
      if (hot) { hot.classList.remove('hot'); }
      hot = c; c.classList.add('hot');
      tipValue.textContent = '커밋 ' + c.getAttribute('data-n') + '개';
      tipLabel.textContent = c.getAttribute('data-r') + ' · ' + c.getAttribute('data-m');
      var hr = host.getBoundingClientRect(), cr = c.getBoundingClientRect();
      var half = tip.offsetWidth / 2;
      var left = Math.min(Math.max(cr.left + cr.width / 2 - hr.left, half), hr.width - half);
      tip.style.left = left + 'px';
      tip.style.top = (cr.top - hr.top) + 'px';
      tip.classList.add('show');
    });
    svg.addEventListener('pointerleave', function () {
      tip.classList.remove('show');
      if (hot) { hot.classList.remove('hot'); hot = null; }
    });

    // Legend + totals.
    var foot = htmlNode('div', 'hm-foot', undefined, host);
    var legend = htmlNode('div', 'hm-legend mono', undefined, foot);
    htmlNode('span', '', '월별 커밋', legend);
    FILL.forEach(function (f, li) {
      var sw = htmlNode('i', '', undefined, legend);
      sw.style.background = f;
      sw.title = RANGE[li];
    });
    htmlNode('span', '', '0 → 21+', legend);
    var total = sum(rows.map(function (r) { return sum(r.counts); }));
    var active = 0, first = -1;
    for (var mi = 0; mi < COUNT; mi++) {
      var any = rows.some(function (r) { return r.counts[mi] > 0; });
      if (any) { active++; if (first < 0) { first = mi; } }
    }
    htmlNode('span', 'mono', (all ? '저장소 7개 · ' : '') + '커밋 ' + total + '개 · 활동한 달 ' + active + '개 · ' +
      A.asOf + ' 기준, 머지 커밋 제외', foot);

    // Table view twin (months with no commits are omitted).
    var details = htmlNode('details', 'collapse', undefined, host);
    var summary = htmlNode('summary', '', '표로 보기 — 월별 커밋 수', details);
    htmlNode('span', 'count', '커밋이 있는 달만', summary);
    var wrap = htmlNode('div', 'tbl-wrap', undefined, details);
    var table = htmlNode('table', 'spec compact', undefined, wrap);
    var thead = htmlNode('thead', '', undefined, table);
    var hr = htmlNode('tr', '', undefined, thead);
    htmlNode('th', '', '월', hr);
    rows.forEach(function (r) { htmlNode('th', 'num', r.name, hr); });
    if (all) { htmlNode('th', 'num', '합계', hr); }
    var tbody = htmlNode('tbody', '', undefined, table);
    for (var ti = 0; ti < COUNT; ti++) {
      var vals = rows.map(function (r) { return r.counts[ti]; });
      var rowSum = sum(vals);
      if (!rowSum) { continue; }
      var tr = htmlNode('tr', '', undefined, tbody);
      htmlNode('td', 'mono', monthLabel(ti), tr);
      vals.forEach(function (v) { htmlNode('td', 'num mono', v ? String(v) : '·', tr); });
      if (all) { htmlNode('td', 'num mono', String(rowSum), tr); }
    }
  });
}());
