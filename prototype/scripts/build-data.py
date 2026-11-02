"""Build the register rows for every counterparty.

Reads the per-file table in convention-simulation.md (new folder, new name, status label, note)
and the dataset CSV (excerpt, original path), then sets a version role on each file.
A version chain is files in the same counterparty/type folder with an identical excerpt.

    python3 scripts/build-data.py "~/Downloads/contract repository dataset (2).csv"
"""
import csv, json, os, re, sys, collections

HERE = os.path.dirname(os.path.abspath(__file__))
SIM = os.path.join(HERE, '..', '..', 'convention-simulation.md')
OUT = os.path.join(HERE, '..', 'src', 'generated.json')

csv_rows = {r['file_id']: r for r in csv.DictReader(open(os.path.expanduser(sys.argv[1])))}

files = []
for line in open(SIM):
    if not line.startswith('| F0'):
        continue
    c = [x.strip().replace('\\_', '_') for x in line.strip().strip('|').split('|')]
    fid, filename, folder, newpath, newname, status, note = c
    m = re.search(r' – ((?:19|20)\d\d(?:-\d\d)?(?:-\d\d)?)\.\w+$', newname)
    files.append({
        'id': fid,
        'name': newname,
        'original': f'{folder}/{filename}',
        'folder': newpath.strip('/').split('/')[0],
        'type': newpath.strip('/').split('/')[-1],
        'status': status,
        'date': m[1] if m else None,
        'modified': csv_rows[fid]['date_modified'],
        'sizeKb': int(csv_rows[fid]['size_kb']),
        'simNote': note,
        'excerpt': csv_rows[fid]['content_excerpt'],
    })

# Evidence order: signed beats final beats everything else.
# Conflicting names still say FINAL; pending signature means not in force yet.
RANK = {'Signed': 3, 'Final': 2, 'Conflicting': 2, 'Pending': -1}

# Hand-written notes where the subject tells look-alike agreements apart.
NOTES = {
    'F0042': 'Only version; 17 Exchange Square',
    'F0206': 'Revenue-share agreement',
    'F0120': 'Joint venture; separate agreement',
}

def strength(f):
    return (RANK.get(f['status'], 0), f['date'] or '')

# Employment and unidentified excerpts are generic boilerplate, so matching them
# would merge different people's contracts. Each of those files stands alone.
chains = collections.defaultdict(list)
for f in files:
    alone = f['folder'] in ('Employment', '_Unidentified')
    chains[(f['folder'], f['type'], f['id'] if alone else f['excerpt'])].append(f)

for chain in chains.values():
    chain.sort(key=strength, reverse=True)
    head = chain[0]
    notes = [head['simNote']] if head['simNote'] else []
    if len(chain) == 1:
        head['version'] = 'Current'
        notes.insert(0, 'Only version')
    elif head['status'] == 'Signed':
        head['version'] = 'Current'
        notes.insert(0, f'Signed; {len(chain) - 1} older')
    else:
        head['version'] = 'Current (assumed)'
        label = 'FINAL' if head['status'] in ('Final', 'Conflicting') else head['status'].lower()
        notes.insert(0, f'Latest {label}; none signed')
    head['note'] = '; '.join(notes)
    for f in chain[1:]:
        f['version'] = 'Archived'
        f['versionOf'] = head['id']
        first = 'Pending signature; not in force' if f['status'] == 'Pending' else 'Superseded'
        f['note'] = '; '.join([first] + ([f['simNote']] if f['simNote'] else []))
for f in files:
    f['note'] = NOTES.get(f['id'], f['note'])

def summary(rows):
    current = [r for r in rows if r['version'] != 'Archived']
    years = sorted(r['date'][:4] for r in rows if r['date'])
    span = f', {years[0]}–{years[-1]}' if years and years[0] != years[-1] else (f', {years[0]}' if years else '')
    n = len(current)
    parts = [f'{n} agreement{"s" if n != 1 else ""}{span}.']
    signed = [r['type'] for r in current if r['status'] == 'Signed']
    if signed:
        parts.append(f'{len(signed)} signed ({", ".join(sorted(set(signed)))}).')
    else:
        parts.append('None signed.')
    for r in current:
        older = [x for x in rows if x.get('versionOf') == r['id']]
        if older:
            tail = 'none is signed' if r['version'] == 'Current (assumed)' else 'the latest is signed'
            parts.append(f'The {r["type"]} has {len(older) + 1} versions and {tail}.')
    return ' '.join(parts)

TYPE_ORDER = lambda r: (r['type'], r['version'] == 'Archived', r['date'] or '')
by_folder = collections.defaultdict(list)
for f in files:
    by_folder[f['folder']].append(f)
out = {}
for folder in sorted(by_folder, key=lambda s: (s.startswith('_') or s == 'Employment', s)):
    rows = sorted(by_folder[folder], key=TYPE_ORDER)
    for r in rows:
        r.pop('simNote'); r.pop('folder')
    out[folder] = {'summary': summary(rows), 'rows': rows}

json.dump(out, open(OUT, 'w'), indent=1, ensure_ascii=False)
total_chains = sum(1 for c in chains.values() if len(c) > 1)
print(f'{len(files)} files, {len(out)} folders, {total_chains} chains '
      f'({sum(len(c) for c in chains.values() if len(c) > 1)} files) -> {OUT}')
