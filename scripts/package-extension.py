#!/usr/bin/env python3
"""Build a deterministic, loadable Chrome extension ZIP from extension/."""
import argparse,json,re,zipfile
from pathlib import Path
root=Path(__file__).resolve().parent.parent
extension=root/'extension'
manifest=json.loads((extension/'manifest.json').read_text())
version=manifest['version']
assert re.fullmatch(r'\d+\.\d+\.\d+',version),'invalid version'
assert f'v{version}</span>' in (extension/'popup.html').read_text(),'popup version mismatch'
parser=argparse.ArgumentParser();parser.add_argument('--output',type=Path,default=root/f'przetargimiejskie-extension-{version}.zip');args=parser.parse_args()
references=[manifest['background']['service_worker'],manifest['action']['default_popup'],*manifest['icons'].values()]
for script in manifest.get('content_scripts',[]):references+=script.get('js',[])+script.get('css',[])
for file in references:assert (extension/file).is_file(),f'missing referenced file: {file}'
files=sorted(p for p in extension.rglob('*')if p.is_file() and p.suffix in {'.js','.css','.html','.json','.png','.svg'})
assert not any(p.name.startswith('.')for p in files),'hidden package file'
args.output.parent.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.output,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9)as archive:
 for file in files:
  info=zipfile.ZipInfo(file.relative_to(extension).as_posix(),date_time=(2026,10,19,0,0,0));info.compress_type=zipfile.ZIP_DEFLATED;info.external_attr=0o100644<<16;archive.writestr(info,file.read_bytes())
with zipfile.ZipFile(args.output)as archive:
 assert archive.testzip()is None,'corrupt ZIP'
 assert json.loads(archive.read('manifest.json'))==manifest,'built manifest mismatch'
 assert all(file in archive.namelist()for file in references),'missing package references'
 assert not any('node_modules' in file or file.endswith(('.log','.pem','.env'))for file in archive.namelist()),'unexpected package content'
print(f'{args.output}: v{version}, {len(files)} files, {args.output.stat().st_size} bytes; manifest/assets verified')
