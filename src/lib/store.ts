import { Series, Episode } from '@/types/video';
import { INITIAL_SERIES } from '@/data/seed';
import { getSafeThumbnail } from '@/lib/thumbnailHelper';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'database.json');

/** Chuẩn hóa toàn bộ đường dẫn thumbnail sang /api/thumbnail/{id} ngay tại tầng đọc CSDL. */
function normalizeSeriesList(list: Series[]): Series[] {
  return list.map((s) => {
    const seed = s.id || s.title || '';
    const safeThumb = getSafeThumbnail(s.thumbnail || (s as any).coverImage, seed);
    const normalizedEpisodes = Array.isArray(s.episodes)
      ? s.episodes.map((ep) => ({
          ...ep,
          thumbnail: getSafeThumbnail(ep.thumbnail || safeThumb, ep.id || ep.originalUrl || seed),
        }))
      : [];

    return {
      ...s,
      thumbnail: safeThumb,
      ...((s as any).coverImage !== undefined ? { coverImage: safeThumb } : {}),
      episodes: normalizedEpisodes,
    };
  });
}

function readData(): Series[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return normalizeSeriesList(parsed);
      }
    }
  } catch (error) {
    console.error('Error reading data file:', error);
  }
  return normalizeSeriesList(INITIAL_SERIES);
}

function writeData(data: Series[]) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.error('Error writing data file:', error);
  }
}

// Global in-memory cache
let seriesList: Series[] = readData();

export function getAllSeries(): Series[] {
  seriesList = readData();
  return seriesList;
}

export function getSeriesBySlug(slug: string): Series | undefined {
  seriesList = readData();
  return seriesList.find((s) => s.slug === slug);
}

export function addSeries(newSeries: Series): Series {
  seriesList.unshift(newSeries);
  writeData(seriesList);
  return newSeries;
}

export function addEpisodeToSeries(seriesId: string, episode: Episode): boolean {
  const series = seriesList.find((s) => s.id === seriesId);
  if (!series) return false;

  series.episodes.push(episode);
  // Sắp xếp tự động các tập từ nhỏ đến lớn (Part 1, Part 2, Part 3...)
  series.episodes.sort((a, b) => a.partNumber - b.partNumber);
  series.totalEpisodes = series.episodes.length;
  series.updatedAt = new Date().toISOString().split('T')[0];
  writeData(seriesList);
  return true;
}

export function deleteSeries(seriesId: string): boolean {
  const prevLen = seriesList.length;
  seriesList = seriesList.filter((s) => s.id !== seriesId);
  if (seriesList.length !== prevLen) {
    writeData(seriesList);
    return true;
  }
  return false;
}

export function updateAllSeries(newList: Series[]): void {
  seriesList = newList;
  writeData(seriesList);
}

export function updateSeries(seriesId: string, updates: Partial<Series>): Series | null {
  seriesList = readData();
  const index = seriesList.findIndex((s) => s.id === seriesId);
  if (index === -1) return null;

  seriesList[index] = {
    ...seriesList[index],
    ...updates,
    updatedAt: new Date().toISOString().split('T')[0],
  };

  if (updates.title && seriesList[index].episodes?.length) {
    seriesList[index].episodes.forEach((ep) => {
      ep.title = updates.title!;
    });
  }

  writeData(seriesList);
  return seriesList[index];
}
