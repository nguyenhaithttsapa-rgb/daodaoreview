import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/admin/page.tsx', 'utf8');
  content = content.replace(/text-rose-500/g, 'text-cyan-400');
  content = content.replace(/text-amber-500/g, 'text-fuchsia-400');
  content = content.replace(/border-rose-500\/50/g, 'border-cyan-500/50');
  content = content.replace(/bg-rose-500\/20/g, 'bg-cyan-500/20');
  content = content.replace(/from-rose-600/g, 'from-cyan-600');
  content = content.replace(/to-amber-600/g, 'to-purple-600');
  content = content.replace(/hover:from-rose-500/g, 'hover:from-cyan-500');
  content = content.replace(/hover:to-amber-500/g, 'hover:to-purple-500');
  content = content.replace(/text-rose-400/g, 'text-cyan-300');
  content = content.replace(/bg-rose-600/g, 'bg-cyan-600');
  content = content.replace(/text-amber-400/g, 'text-purple-400');
  await fs.writeFile('src/app/admin/page.tsx', content);
}
run().catch(console.error);
