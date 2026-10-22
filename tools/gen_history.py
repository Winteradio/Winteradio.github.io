"""Regenerates activity-data.js (monthly commit counts) and commits.js (per-commit details).

Usage:
    python tools/gen_history.py [path/to/Game-Engine]

Reads the local clones only — run `git fetch` inside Game-Engine and its external/* submodules
first if the remotes may have moved. Game-Engine is read from its current HEAD (the work
branch, which contains master); every library is read from its own origin/HEAD. Merge commits
are skipped and months are bucketed in KST, matching how the site labels dates.
"""
import collections
import datetime
import json
import os
import re
import subprocess
import sys

SITE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENGINE = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else os.path.join(SITE, '..', 'Game-Engine'))
KST = datetime.timezone(datetime.timedelta(hours=9))
START = (2023, 3)

REPOS = [
    dict(key='engine', name='Game-Engine', href='engine.html', gh='Winteradio/Game-Engine', path='.', ref='HEAD', kind='engine'),
    dict(key='ecs', name='ECS', href='ecs.html', gh='Winteradio/ECS-with-Scene-and-Node', path='external/ECS', ref='origin/HEAD', kind='lib'),
    dict(key='memory', name='Memory', href='memory.html', gh='Winteradio/MemoryPool', path='external/Memory', ref='origin/HEAD', kind='lib'),
    dict(key='reflection', name='Reflection', href='reflection.html', gh='Winteradio/Reflection', path='external/Reflection', ref='origin/HEAD', kind='lib'),
    dict(key='container', name='Container', href='container.html', gh='Winteradio/Container', path='external/Container', ref='origin/HEAD', kind='lib'),
    dict(key='log', name='Log', href='https://github.com/Winteradio/Log', gh='Winteradio/Log', path='external/Log', ref='origin/HEAD', kind='lib'),
    dict(key='cmake', name='CMake', href='https://github.com/Winteradio/CMake', gh='Winteradio/CMake', path='external/CMake', ref='origin/HEAD', kind='lib'),
]
ERAS = [
    dict(n='01', frm='2023-03', to='2023-10'),
    dict(n='02', frm='2023-11', to='2025-09'),
    dict(n='03', frm='2025-10', to='2025-12'),
    dict(n='04', frm='2026-01', to='2026-03'),
    dict(n='05', frm='2026-04', to='2026-06'),
    dict(n='06', frm='2026-07', to=None),          # open-ended: runs to the last month
]

TEMPLATE_LINE = re.compile(
    r'^\s*(\[(Author|Date|Type/Branch|Auther/Data|Title|Titile)\]|#|'
    r'Co-Authored-By:|Signed-off-by:)', re.I)
TITLE_PREFIX = re.compile(r'^\s*\[(Title|Titile|Desc)\]\s*', re.I)
SENTENCE_END = ('.', '!', '?', ':', ')', '다', '함', '음', '임', '됨')


def git(path, *args):
    out = subprocess.run(['git', '-c', 'core.quotepath=off', '-c', 'i18n.logOutputEncoding=UTF-8', *args],
                         cwd=path, capture_output=True, check=True)
    return out.stdout.decode('utf-8', errors='replace')


def clean_title(raw):
    t = raw.strip()
    while True:
        stripped = TITLE_PREFIX.sub('', t, count=1)
        if stripped == t:
            break
        t = stripped
    t = re.sub(r'^-\s*', '', t).strip()
    return t or '(메시지 없음)'


def bullets(body, title):
    out = []
    for raw in body.splitlines():
        if not raw.strip() or TEMPLATE_LINE.match(raw):
            continue
        text = re.sub(r'^\s*\[Desc\]\s*', '', raw, flags=re.I).strip()
        if not text or clean_title(text) == title:
            continue
        sub = text.startswith('->')
        marker = re.match(r'^(->>|->|-|\*|•)\s*', text)
        text = re.sub(r'^(->>|->|-|\*|•)\s*', '', text).strip()
        if not text:
            continue
        # a wrapped line (no bullet marker) continues the previous bullet unless that one already ended
        if not marker and out and not out[-1].endswith(SENTENCE_END):
            out[-1] = out[-1] + ' ' + text
            continue
        out.append(('↳ ' if sub else '') + text)
    trimmed = []
    for line in out[:8]:
        trimmed.append(line if len(line) <= 300 else line[:299].rstrip() + '…')
    return trimmed


def area_engine(path):
    p = path.split('/')
    if p[0] == 'Docs' or path in ('README.md', 'HISTORY.md'):
        return 'Docs'
    if path == 'CMakeLists.txt' or path.endswith('.cmake'):
        return 'Build'
    if p[0] == 'external':
        return 'Submodule'
    if p[0] in ('Client', 'Editor'):
        return p[0]
    if p[0] == 'asset':
        return 'Shader' if len(p) > 1 and p[1] == 'shader' else 'Asset 파일'
    if p[0] == 'Engine' and len(p) >= 4 and p[1] in ('Public', 'Private'):
        module = p[2]
        if module == 'RHI' and p[3] in ('Vulkan', 'OpenGL'):
            return 'RHI · ' + p[3]
        if module == 'Renderer' and p[3] in ('RenderPass', 'Proxy'):
            return 'Renderer · ' + ('Pass' if p[3] == 'RenderPass' else 'Proxy')
        return module
    if p[0].startswith('.') or p[0] == 'LICENSE':
        return 'Config'
    return p[0] if len(p) > 1 else 'Root'


def area_lib(path):
    p = path.split('/')
    if p[0] in ('include', 'src') and len(p) >= 2:
        return os.path.splitext(p[1])[0] if len(p) == 2 else p[1]
    if p[0].lower() in ('demofile', 'externaldemofile', 'demo'):
        return 'Demo'
    if p[0] == 'external':
        return 'Submodule'
    if p[0].lower() == 'cmakelists.txt' or path.endswith('.cmake'):
        return 'Build'
    if p[0].lower().startswith('readme') or path.endswith('.md'):
        return 'Docs'
    if p[0].startswith('.') or p[0] == 'LICENSE':
        return 'Config'
    return p[0] if len(p) > 1 else os.path.splitext(p[0])[0]


def new_path(path):
    path = re.sub(r'\{[^{}]* => ([^{}]*)\}', r'\1', path)
    if ' => ' in path:
        path = path.split(' => ')[1]
    return path.replace('//', '/')


def read_repo(repo):
    path = os.path.join(ENGINE, repo['path'])
    pushed = set(git(path, 'rev-list', '--remotes').split()) if repo['kind'] == 'engine' else None
    log = git(path, 'log', repo['ref'], '--no-merges', '--numstat', '--format=%x1e%H%x1f%aI%x1f%B%x1d')
    commits = []
    for rec in log.split('\x1e')[1:]:
        head, _, stat = rec.partition('\x1d')
        sha, date, body = head.split('\x1f', 2)
        when = datetime.datetime.fromisoformat(date).astimezone(KST)
        lines = body.strip().splitlines()
        title = clean_title(lines[0] if lines else '')
        areas = collections.OrderedDict()
        files = []
        for row in stat.strip().splitlines():
            parts = row.split('\t')
            if len(parts) != 3:
                continue
            add = int(parts[0]) if parts[0].isdigit() else 0
            dele = int(parts[1]) if parts[1].isdigit() else 0
            fp = new_path(parts[2])
            name = area_engine(fp) if repo['kind'] == 'engine' else area_lib(fp)
            a = areas.setdefault(name, [0, 0])
            a[0] += add
            a[1] += dele
            files.append((add + dele, fp))
        files.sort(key=lambda x: -x[0])
        ranked = sorted(areas.items(), key=lambda kv: -(kv[1][0] + kv[1][1]))
        c = dict(s=sha[:7], t=when.strftime('%Y-%m-%d %H:%M'), m=title,
                 b=bullets('\n'.join(lines[1:]), title),
                 a=[[k, v[0], v[1]] for k, v in ranked[:5]],
                 f=len(files),
                 x=['/'.join(fp.split('/')[-2:]) for _, fp in files[:3]])
        if pushed is not None and sha not in pushed:
            c['p'] = 0
        commits.append(c)
    commits.sort(key=lambda c: c['t'])
    return commits


def month_index(ym):
    y, m = map(int, ym.split('-'))
    return (y * 12 + m - 1) - (START[0] * 12 + START[1] - 1)


def main():
    today = datetime.datetime.now(KST)
    count = month_index(today.strftime('%Y-%m')) + 1
    data, act_repos, total = {}, [], 0
    for repo in REPOS:
        commits = read_repo(repo)
        data[repo['key']] = commits
        counts = [0] * count
        for c in commits:
            i = month_index(c['t'][:7])
            if 0 <= i < count:
                counts[i] += 1
        total += len(commits)
        act_repos.append(dict(key=repo['key'], name=repo['name'], href=repo['href'],
                              url='https://github.com/' + repo['gh'], counts=counts))
        print(f"{repo['name']:12s} {len(commits):4d} commits")
    last = f'{(START[0] * 12 + START[1] - 1 + count - 1) // 12}-{(START[1] - 1 + count - 1) % 12 + 1:02d}'
    eras = [dict(n=e['n'], **{'from': e['frm'], 'to': e['to'] or last}) for e in ERAS]
    activity = dict(start=list(START), asOf=today.strftime('%Y-%m-%d'), repos=act_repos, eras=eras)
    stamp = '// Generated by tools/gen_history.py — do not edit by hand.\n'
    with open(os.path.join(SITE, 'activity-data.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(stamp + 'window.ACTIVITY = ' + json.dumps(activity, ensure_ascii=False, indent=1) + ';\n')
    with open(os.path.join(SITE, 'commits.js'), 'w', encoding='utf-8', newline='\n') as f:
        f.write(stamp + 'window.COMMITS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('total', total)


if __name__ == '__main__':
    main()
