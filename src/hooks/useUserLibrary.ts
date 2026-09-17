import { useState, useEffect } from 'react';
import { Series } from '@/types/video';

export interface SavedItem {
  seriesId: string;
  slug: string;
  title: string;
  thumbnail: string;
  savedAt: number;
  lastPart?: number;
}

export function useUserLibrary() {
  const [favorites, setFavorites] = useState<SavedItem[]>([]);
  const [history, setHistory] = useState<SavedItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const favs = localStorage.getItem('dao_favorites');
    const hist = localStorage.getItem('dao_history');
    if (favs) setFavorites(JSON.parse(favs));
    if (hist) setHistory(JSON.parse(hist));
  }, []);

  const saveToLocalStorage = (key: string, data: SavedItem[]) => {
    localStorage.setItem(key, JSON.stringify(data));
  };

  const toggleFavorite = (series: Series) => {
    const exists = favorites.some(f => f.seriesId === series.id);
    let newFavs;
    if (exists) {
      newFavs = favorites.filter(f => f.seriesId !== series.id);
    } else {
      newFavs = [{ seriesId: series.id, slug: series.slug, title: series.title, thumbnail: series.thumbnail || series.coverImage || '', savedAt: Date.now() }, ...favorites];
    }
    setFavorites(newFavs);
    saveToLocalStorage('dao_favorites', newFavs);
  };

  const isFavorite = (seriesId: string) => {
    return favorites.some(f => f.seriesId === seriesId);
  };

  const addToHistory = (series: Series, part: number) => {
    const filtered = history.filter(h => h.seriesId !== series.id);
    const newHist = [{ seriesId: series.id, slug: series.slug, title: series.title, thumbnail: series.thumbnail || series.coverImage || '', savedAt: Date.now(), lastPart: part }, ...filtered].slice(0, 50);
    setHistory(newHist);
    saveToLocalStorage('dao_history', newHist);
  };

  const clearHistory = () => {
    setHistory([]);
    localStorage.removeItem('dao_history');
  };

  return { favorites, history, toggleFavorite, isFavorite, addToHistory, clearHistory, mounted };
}
