export type Metrik = {
  baslangic?: number | null;
  bitis?: number | null;
  net_pnl?: number | null;
  getiri?: number | null;
  cagr?: number | null;
  islem_sayisi?: number | null;
  kazanma_orani?: number | null;
  max_drawdown?: number | null;
  profit_factor?: number | null;
  ortalama_r?: number | null;
  sharpe?: number | null;
  uzun_pnl?: number | null;
  kisa_pnl?: number | null;
};

export type Islem = {
  yon: string;
  giris_zaman: string;
  cikis_zaman: string;
  giris: number | null;
  cikis: number | null;
  adet: number | null;
  pnl: number | null;
  r: number | null;
  neden: string;
};

export type Mum = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

export type EquityNokta = { time: string; equity: number | null };

export type Donem = { donem: string; equity: number; getiri: number };

export type Sonuc = {
  ad: string;
  sembol: string;
  sermaye: number;
  risk_yuzde: number;
  metrik: Metrik;
  islemler: Islem[];
  equity: EquityNokta[];
  aylik: Donem[];
  yillik: Donem[];
  mumlar: Mum[];
  uyari: string;
};

export type OptSatir = {
  parametre: Record<string, number>;
  net_pnl: number | null;
  cagr: number | null;
  max_drawdown: number | null;
  profit_factor: number | null;
  kazanma_orani: number | null;
  islem_sayisi: number | null;
  sharpe: number | null;
};
