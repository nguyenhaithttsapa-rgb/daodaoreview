import fs from 'fs/promises';

async function run() {
  let content = await fs.readFile('src/app/page.tsx', 'utf8');

  // 1. Search Section
  content = content.replace(
    'bg-gradient-to-r from-slate-900/90 via-slate-900 to-slate-900/90 border border-slate-800 rounded-3xl',
    'bg-[#0a0514]/70 border border-cyan-500/20 rounded-3xl shadow-[0_0_25px_rgba(6,182,212,0.1)]'
  );
  content = content.replace('text-rose-500 absolute left-4 top-3.5', 'text-cyan-400 neon-text-blue absolute left-4 top-3.5');
  content = content.replace(
    'hover:border-rose-500/50 focus:border-rose-500 rounded-2xl pl-12 pr-12 py-3 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 transition shadow-inner font-medium',
    'hover:border-cyan-500/50 focus:border-cyan-400 rounded-2xl pl-12 pr-12 py-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/30 transition shadow-[inset_0_0_15px_rgba(0,0,0,0.5)] font-medium'
  );
  content = content.replace('<Filter className="w-3.5 h-3.5 text-rose-400" />', '<Filter className="w-3.5 h-3.5 text-cyan-400" />');
  content = content.replace('text-amber-400 font-semibold', 'text-fuchsia-400 font-semibold neon-text-purple');
  content = content.replace(
    "isActive\n                    ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-950/50'",
    "isActive\n                    ? 'bg-gradient-to-r from-cyan-600 to-purple-600 text-white font-bold shadow-[0_0_15px_rgba(168,85,247,0.5)] border-transparent'"
  );

  // 2. Direct Play Section
  content = content.replace('text-rose-500 fill-rose-500', 'text-cyan-400 fill-cyan-400 neon-text-blue');
  content = content.replace('text-rose-400 font-medium', 'text-cyan-400 font-medium');
  content = content.replace(
    'border-2 border-rose-500/50 rounded-3xl',
    'border border-cyan-500/40 rounded-3xl shadow-[0_0_30px_rgba(6,182,212,0.15)]'
  );
  content = content.replace(
    'bg-rose-500/20 text-rose-400 border border-rose-500/30',
    'bg-cyan-500/10 text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
  );
  content = content.replace('bg-slate-950 hover:bg-rose-600 border border-slate-800 hover:border-rose-500', 'bg-slate-950/50 hover:bg-cyan-600 border border-purple-900/50 hover:border-cyan-400 hover:shadow-[0_0_15px_rgba(6,182,212,0.4)]');
  content = content.replace(
    'from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500',
    'from-cyan-600 to-purple-600 hover:from-cyan-500 hover:to-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
  );

  // 3. Reels Section
  content = content.replace('text-amber-400"', 'text-fuchsia-400 neon-text-purple"');
  content = content.replace(
    "['from-rose-900/60 to-purple-950/80',\n                'from-amber-900/60 to-slate-950/80',\n                'from-blue-900/60 to-indigo-950/80',\n                'from-emerald-900/60 to-slate-950/80',\n                'from-purple-900/60 to-pink-950/80',\n                'from-cyan-900/60 to-blue-950/80',]",
    "['from-cyan-900/40 to-[#05010a]',\n                'from-purple-900/40 to-[#05010a]',\n                'from-fuchsia-900/40 to-[#05010a]',\n                'from-indigo-900/40 to-[#05010a]',]"
  );
  content = content.replace('hover:border-rose-500/50 transition', 'hover:border-fuchsia-500/60 transition hover:shadow-[0_0_20px_rgba(168,85,247,0.3)]');
  content = content.replace('text-rose-400 border border-rose-500/30', 'text-cyan-300 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.3)]');
  content = content.replace('bg-rose-600 text-[10px]', 'bg-fuchsia-600 text-[10px] shadow-[0_0_10px_rgba(168,85,247,0.6)]');
  content = content.replace('group-hover:text-rose-400 transition', 'group-hover:text-cyan-300 transition group-hover:neon-text-blue');
  content = content.replace('<Eye className="w-3 h-3 text-rose-400" />', '<Eye className="w-3 h-3 text-cyan-400" />');

  // 4. Series Grid
  content = content.replace('<Layers className="w-5 h-5 text-rose-500" />', '<Layers className="w-5 h-5 text-fuchsia-500 neon-text-purple" />');
  content = content.replace('hover:border-rose-500/50 overflow-hidden shadow-lg transition duration-200 hover:-translate-y-1', 'border-purple-900/30 hover:border-cyan-500/50 overflow-hidden shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-[0_0_25px_rgba(6,182,212,0.2)]');
  content = content.replace('text-amber-300 border border-amber-400/20', 'text-cyan-200 border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]');
  content = content.replace('<Play className="w-3 h-3 fill-rose-500 text-rose-500" />', '<Play className="w-3 h-3 fill-fuchsia-500 text-fuchsia-500" />');
  content = content.replace('group-hover:text-rose-400 line-clamp-2 transition', 'group-hover:text-fuchsia-300 line-clamp-2 transition');

  await fs.writeFile('src/app/page.tsx', content);
}
run().catch(console.error);
