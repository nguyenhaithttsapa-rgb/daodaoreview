import { Series, Episode } from '@/types/video';
import { INITIAL_SERIES } from '@/data/seed';
import fs from 'fs';
import path from 'path';

const DATA_FILE = path.join(process.cwd(), 'src', 'data', 'database.json');

function readData(): Series[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (error) {
    console.error('Error reading data file:', error);
  }
  return INITIAL_SERIES;
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
