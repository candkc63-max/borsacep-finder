import { useState, useCallback } from "react";

export interface PortfolioItem {
  symbol: string;
  name: string;
  buyPrice: number;
  quantity: number;
  addedAt: string;
}

const STORAGE_KEY = "borsacep-portfolio";

function loadPortfolio(): PortfolioItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function savePortfolio(items: PortfolioItem[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch {}
}

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>(loadPortfolio);

  const addToPortfolio = useCallback((item: Omit<PortfolioItem, "addedAt">) => {
    setPortfolio(prev => {
      const existing = prev.findIndex(p => p.symbol === item.symbol);
      let next: PortfolioItem[];
      if (existing >= 0) {
        // Update existing: average buy price
        const old = prev[existing];
        const totalQty = old.quantity + item.quantity;
        const avgPrice = (old.buyPrice * old.quantity + item.buyPrice * item.quantity) / totalQty;
        next = [...prev];
        next[existing] = { ...old, buyPrice: avgPrice, quantity: totalQty };
      } else {
        next = [...prev, { ...item, addedAt: new Date().toISOString() }];
      }
      savePortfolio(next);
      return next;
    });
  }, []);

  const removeFromPortfolio = useCallback((symbol: string) => {
    setPortfolio(prev => {
      const next = prev.filter(p => p.symbol !== symbol);
      savePortfolio(next);
      return next;
    });
  }, []);

  const isInPortfolio = useCallback((symbol: string) => portfolio.some(p => p.symbol === symbol), [portfolio]);

  return { portfolio, addToPortfolio, removeFromPortfolio, isInPortfolio };
}
