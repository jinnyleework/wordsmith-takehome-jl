import csv,re,collections,sys
rows=list(csv.DictReader(open(sys.argv[1])))
CPS=['Acme Corp','Ashworth Textiles','Bluewave Logistics','Brightpath Health','Cobalt Freight','Corvus Data','Crestline','Elmtree Realty','Foxglove Marketing','Granite','Greymoor Logistics','Halden','Harbourline Shipping','Marlin','Northgate','Pinnacle Insurance','Riverstone Capital','Silvergate','Solara Energy','Tandem','Vantage Retail Group','Meridian Cloud Systems','Lumen Analytics','Oakridge Manufacturing','Falcon Security','Ferrow Industries','Anchor Point Bank','Whitfield Legal Services']
def norm(s): return re.sub(r'[^a-z]','',s.lower())
TYPES=[('Employment',r'employment|offer letter'),('NDA',r'nda|non-?disclosure|confidentiality'),('DPA',r'dpa|data processing'),('SOW',r'sow|statement of work|work order'),('MSA',r'msa|master (services )?agreement|framework'),('Lease',r'lease'),('Licence',r'licen[cs]e'),('Partnership',r'joint venture|collab|partnership'),('Amendment',r'amendment|addendum'),('Purchase',r'purchase|supply')]
def dtype(f,e):
    for t,p in TYPES:
        if re.search(p,f,re.I): return t
    for t,p in TYPES:
        if re.search(p,e,re.I): return t
    return 'Unknown'
def cp(f,e,ty):
    nf=norm(f)
    for c in CPS:
        if norm(c.split()[0]) in nf: return c,'filename'
    if ty!='Employment':
        ne=norm(e)
        for c in CPS:
            if norm(c) in ne: return c,'excerpt'
    return None,None
def status(f):
    s=f.lower()
    if 'unsigned' in s or 'not final' in s: return 'Conflicting'
    if 'pending signature' in s: return 'Pending'
    if re.search(r'signed|executed',s): return 'Signed'
    if re.search(r'draft|redline|for review',s): return 'Draft'
    if re.search(r'final',s): return 'Final'
    return 'Unlabelled'
def year(f):
    m=re.search(r'(20[12]\d)',f)
    if m: return m.group(1)
    m=re.search(r'\b\d\d[-.]\d\d[-.](\d\d)\b',f)
    if m: return '20'+m.group(1)
    return None
for r in rows:
    f,e=r['filename'],r['content_excerpt']
    r['type']=dtype(f,e); r['cp'],r['cpsrc']=cp(f,e,r['type']); r['status']=status(f); r['year']=year(f)
FMAP={'counterparty':lambda r:r['cp'] or '_Unidentified','type':lambda r:r['type'],'status':lambda r:r['status'],'year':lambda r:r['year'] or 'No date'}
def tree(order,depth=None):
    c=collections.Counter(' / '.join(FMAP[k](r) for k in order) for r in rows); return c
def show(name,order,samples):
    c=tree(order); top=collections.Counter(FMAP[order[0]](r) for r in rows)
    print(f'\n## {name}  ({" → ".join(order)})')
    print(f'   {len(top)} top-level folders, {len(c)} leaf folders, largest leaf {c.most_common(1)[0][1]} files, {sum(1 for v in c.values() if v==1)} single-file leaves')
    for fid in samples:
        r=next(x for x in rows if x['file_id']==fid)
        print(f'   {r["filename"][:55]:55} → /{" / ".join(FMAP[k](r) for k in order)}/')
print('# Step 1 — read and report')
print('files',len(rows),'| counterparty found:',sum(1 for r in rows if r['cp']),'(from excerpt:',sum(1 for r in rows if r['cpsrc']=='excerpt'),') | none:',sum(1 for r in rows if not r['cp']))
print('types',collections.Counter(r['type'] for r in rows).most_common())
print('status',collections.Counter(r['status'] for r in rows).most_common())
print('no year',sum(1 for r in rows if not r['year']))
def principle(p):
    s=p.lower()
    if any(k in s for k in ['unsorted','downloads','to review','misc']) or s.rstrip('/') in ('/legal/contracts','/shared/legal docs'): return 'none / holding'
    if re.search(r'20\d\d',s): return 'year'
    if any(k in s for k in ['signed','archive','backup','templates']): return 'status'
    if 'by vendor' in s or 'vendors' in s: return 'counterparty'
    return 'type'
print('\n# Step 2 — how you file today')
print(collections.Counter(principle(r['folder_path']) for r in rows).most_common())
S=['F0011','F0004','F0002']
show('A: Counterparty first',['counterparty','type'],S)
show('B: Type first',['type','counterparty'],S)
show('C: Type → status → year (the team\'s old habit)',['type','status','year'],S)
show('User reorders: type → counterparty → year',['type','counterparty','year'],S)
print('\nstatus-as-folder watch-out: files that would move on signing =',sum(1 for r in rows if r['status'] in ('Draft','Pending','Final','Conflicting')))
print('\n# Tree for chosen convention A (counterparty → type), top 12')
for k,v in sorted(collections.Counter(FMAP['counterparty'](r) for r in rows).items(),key=lambda x:-x[1])[:12]:
    sub=collections.Counter(r['type'] for r in rows if FMAP['counterparty'](r)==k)
    print(f'  {k} ({v}): '+', '.join(f'{t} {n}' for t,n in sub.most_common()))

# --- Recommended default: folders Counterparty → Type; filename "Counterparty – Type – ISO date".
# Carve-out: employment files go to one flat /Employment folder (HR, personal data), because the
# company in their filename is probably not the signatory.
MON={m:i+1 for i,m in enumerate(['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'])}
def iso(f):
    """Return (date, note). Day-first (the addresses point to a UK team) unless the day-first reading is impossible."""
    m=re.search(r'(?<!\d)(20[12]\d)(\d\d)(\d\d)(?!\d)',f)
    if m: return f'{m[1]}-{m[2]}-{m[3]}',''
    m=re.search(r'(?<!\d)(\d\d)[-.](\d\d)[-.](\d{4}|\d\d)(?!\d)',f)
    if m:
        a,b,y=int(m[1]),int(m[2]),m[3]; y=y if len(y)==4 else '20'+y
        if a>12: return f'{y}-{b:02}-{a:02}',''
        if b>12: return f'{y}-{a:02}-{b:02}',''
        return f'{y}-{b:02}-{a:02}', 'ambiguous, read day-first' if a!=b else ''
    m=re.search(r'(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s*(20[12]\d)',f,re.I)
    if m: return f'{m[2]}-{MON[m[1].lower()]:02}',''
    m=re.search(r'(20[12]\d)',f)
    if m: return m[1],''
    return None,'no date'
for r in rows:
    r['date'],r['datenote']=iso(r['filename'])
    ext=r['filename'].rsplit('.',1)[1]
    parts=[r['cp'] or 'Unidentified',r['type']]+([r['date']] if r['date'] else [])
    r['newname']=' – '.join(parts)+'.'+ext
    r['newpath']='/Employment/' if r['type']=='Employment' else f"/{r['cp'] or '_Unidentified'}/{r['type']}/"
if len(sys.argv)>2:
    with open(sys.argv[2],'w') as out:
        out.write('| ID | Current file | Current folder | New folder | New name | Status label | Note |\n|---|---|---|---|---|---|---|\n')
        for r in sorted(rows,key=lambda r:(r['newpath'].replace('/_','/~'),r['date'] or '')):
            note='; '.join(x for x in [r['datenote'], 'counterparty from excerpt' if r['cpsrc']=='excerpt' else '', 'no counterparty' if not r['cp'] else '', 'personal data, flag to HR' if r['type']=='Employment' else ''] if x)
            esc=lambda s:s.replace('|','\\|').replace('_','\\_')
            out.write(f"| {r['file_id']} | {esc(r['filename'])} | {r['folder_path']} | {r['newpath']} | {r['newname']} | {r['status']} | {note} |\n")
