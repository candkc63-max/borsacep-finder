import { useState, useCallback } from "react";

const STORAGE_KEY = "borsacep-favorites";

function loadFavorites(): Set<string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function saveFavorites(favorites: Set<string>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);

  const toggleFavorite = useCallback((symbol: string) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(symbol)) next.delete(symbol);
      else next.add(symbol);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((symbol: string) => favorites.has(symbol), [favorites]);

  return { favorites, toggleFavorite, isFavorite };
}
