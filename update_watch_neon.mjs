import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/watch/[slug]/page.tsx', 'utf8');
  content = content.replace(/text-rose-400/g, 'text-cyan-400 neon-text-blue');
  content = content.replace(/text-rose-500/g, 'text-cyan-400');
  content = content.replace(/fill-rose-500/g, 'fill-cyan-400');
  content = content.replace(/bg-rose-600\/20 border border-rose-500\/40 text-rose-300/g, 'bg-purple-600/20 border border-purple-500/40 text-fuchsia-300 shadow-[inset_0_0_15px_rgba(168,85,247,0.2)]');
  content = content.replace(/bg-rose-600 text-white/g, 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white shadow-[0_0_10px_rgba(168,85,247,0.5)] border-transparent');
  content = content.replace(/bg-rose-600 hover:bg-rose-500/g, 'bg-gradient-to-r from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_15px_rgba(6,182,212,0.4)]');
  content = content.replace(/bg-rose-500/g, 'bg-fuchsia-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]');
  content = content.replace(/text-amber-400/g, 'text-fuchsia-400');
  content = content.replace(/border-slate-800/g, 'border-purple-900/40');
  content = content.replace(/bg-slate-900\/60/g, 'bg-[#0a0514]/60 backdrop-blur-md');
  content = content.replace(/bg-slate-900\/40/g, 'bg-[#0a0514]/40 backdrop-blur-md');
  content = content.replace(/bg-slate-900\/80/g, 'bg-[#0a0514]/80 backdrop-blur-md');
  content = content.replace(/bg-slate-800\/60/g, 'bg-purple-900/20');
  content = content.replace(/bg-slate-800 hover:bg-slate-700/g, 'bg-purple-900/30 hover:bg-cyan-900/40 border border-purple-500/20 hover:border-cyan-500/40 hover:shadow-[0_0_10px_rgba(6,182,212,0.3)]');
  content = content.replace(/bg-slate-800/g, 'bg-purple-900/30 border border-purple-500/20');

  await fs.writeFile('src/app/watch/[slug]/page.tsx', content);
}
run().catch(console.error);
