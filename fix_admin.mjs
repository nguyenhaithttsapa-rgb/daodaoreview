import fs from 'fs';
let code = fs.readFileSync('src/app/admin/page.tsx', 'utf8');

const funcs = `
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

  const handleDeleteEpisode = async (epId: string) => {
    if (!selectedSeriesId) return;
    if (!confirm('Bạn có chắc chắn muốn xóa tập này?')) return;
    setEpDelStatus('Đang xóa tập...');
    try {
      const res = await fetch('/api/delete-episode', { method: 'POST', body: JSON.stringify({ seriesId: selectedSeriesId, episodeId: epId }) });
      if (res.ok) {
        setEpDelStatus('Xóa tập thành công!');
        const updatedList = seriesList.map(s => {
          if (s.id === selectedSeriesId) {
            return { ...s, episodes: s.episodes.filter(e => e.id !== epId) };
          }
          return s;
        });
        setSeriesList(updatedList);
      } else {
        setEpDelStatus('Lỗi khi xóa tập');
      }
    } catch (err) {
      setEpDelStatus('Lỗi kết nối');
    }
  };
`;

if (!code.includes('const handleDeleteSeries')) {
  code = code.replace('  async function handleAddEpisode', funcs + '\n  async function handleAddEpisode');
  fs.writeFileSync('src/app/admin/page.tsx', code);
}
