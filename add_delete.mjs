import fs from 'fs';
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');
code = code.replace('const [epStatus, setEpStatus] = useState<string | null>(null);', 'const [epStatus, setEpStatus] = useState<string | null>(null);\n  const [deleteStatus, setDeleteStatus] = useState<string | null>(null);');
const deleteFunc = `
  const handleDeleteSeries = async () => {
    if (!selectedSeriesId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa nguyên bộ phim này không?')) return;
    setDeleteStatus('Đang xóa...');
    try {
      const res = await fetch('/api/delete-series', { method: 'POST', body: JSON.stringify({ seriesId: selectedSeriesId }) });
      if (res.ok) {
        setDeleteStatus('Đã xóa thành công!');
        setSeriesList(seriesList.filter(s => s.id !== selectedSeriesId));
        setSelectedSeriesId('');
      } else {
        setDeleteStatus('Lỗi khi xóa');
      }
    } catch (err) {
      setDeleteStatus('Lỗi kết nối');
    }
  };
`;
code = code.replace('  const handleAddEpisode = async (e: React.FormEvent) => {', deleteFunc + '  const handleAddEpisode = async (e: React.FormEvent) => {');
const btn = `{deleteStatus && <p className="text-xs text-rose-500">{deleteStatus}</p>}\n<button type="button" onClick={handleDeleteSeries} className="w-full mt-2 bg-rose-900/40 hover:bg-rose-900/80 border border-rose-700/50 text-rose-400 font-bold py-2 rounded-xl transition text-xs">🗑️ XÓA TOÀN BỘ PHIM NÀY</button>`;
code = code.replace('</select>\n            </div>', '</select>\n            ' + btn + '\n            </div>');
fs.writeFileSync('src/app/admin/page.tsx', code);
