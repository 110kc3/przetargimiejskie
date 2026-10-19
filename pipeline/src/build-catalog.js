import { readFile, writeFile, rename } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { buildCityCatalog } from './core/city-catalog.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
export async function buildCatalogFromDisk(index, { output = root+'data/catalog.json' } = {}) {
  const manifest=JSON.parse(await readFile(root+'spikes/master-cities.json','utf8'));
  const landByCity={};
  await Promise.all(index.cities.map(async c=>{
    try {landByCity[c.id]=JSON.parse(await readFile(root+`data/${c.id}/land.json`,'utf8'));}catch{/* unknown, never zero */}
  }));
  const catalog=buildCityCatalog(manifest,index,{landByCity});
  const bytes=JSON.stringify(catalog)+'\n';
  const temp=output+`.${process.pid}.tmp`;
  await writeFile(temp,bytes);
  if(await readFile(temp,'utf8')!==bytes || !bytes.endsWith('}\n'))throw new Error('catalogue write incomplete');
  await rename(temp,output);
  return catalog;
}
if(process.argv[1]&&import.meta.url===new URL('file://'+process.argv[1]).href){
  const index=JSON.parse(await readFile(root+'data/index.json','utf8'));
  await buildCatalogFromDisk(index);
}
