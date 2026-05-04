# BORSA101 - BIST100 Teknik Analiz Tarama Uygulaması

BIST100 hisselerini teknik indikatörlerle tarayan, AL/SAT/NÖTR sinyalleri üreten bir web uygulaması.

## Özellikler

- **5 Farklı Strateji**: EMA 5/22, EMA 9/SMA 20, Fibonacci EMA (5-8-13), SMA 50/200, Pullback Filtresi
- **Canlı Veri**: Yahoo Finance üzerinden gerçek zamanlı BIST100 verileri (Supabase Edge Functions)
- **Simülasyon Modu**: Canlı veri alınamadığında mock veriyle çalışma
- **Kimlik Doğrulama**: Supabase Auth (E-posta + Google OAuth)
- **Detay Modalı**: Hisse bazlı 60 günlük fiyat grafiği, tüm strateji sinyalleri
- **Favoriler**: Hisseleri favori olarak işaretleyip filtreleme
- **Responsive Tasarım**: Mobil ve masaüstü uyumlu

## Teknoloji Altyapısı

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS, shadcn/ui
- **State Management**: TanStack React Query
- **Backend**: Supabase (Auth, Edge Functions)
- **Data Source**: Yahoo Finance API
- **Charts**: Recharts
- **Testing**: Vitest

## Kurulum

```bash
# Bağımlılıkları yükle
npm install

# Geliştirme sunucusunu başlat
npm run dev

# Testleri çalıştır
npm run test

# Production build
npm run build
```

## Ortam Değişkenleri

`.env` dosyasında aşağıdaki değişkenler gereklidir:

- `VITE_SUPABASE_URL` - Supabase proje URL'i
- `VITE_SUPABASE_PUBLISHABLE_KEY` - Supabase anon key

## Stratejiler

| Strateji | Açıklama | Stil |
|----------|----------|------|
| 5 EMA / 22 EMA | Trend değişimlerini erken yakalar | Swing Trade |
| 9 EMA / 20 SMA | Güçlü trendlerde destek seviyelerini belirler | Momentum |
| 5-8-13 Fibonacci EMA | Fiyat hareketlerine çok duyarlıdır | Agresif Trade |
| 50 SMA / 200 SMA | Daha az hatalı sinyal üretir | Orta-Kısa Vade |
| Pullback Filtresi | Geri çekilme sonrası giriş noktası | Pullback |

## Proje Yapısı

```
src/
├── components/     # UI bileşenleri (StockTable, StrategySelector, vb.)
├── hooks/          # Custom hooks (useAuth, useBistStocks, useFavorites)
├── lib/            # Yardımcı fonksiyonlar (indicators.ts, stockData.ts)
├── pages/          # Sayfa bileşenleri (Index, Auth)
├── integrations/   # Supabase istemci yapılandırması
└── test/           # Test dosyaları
supabase/
└── functions/      # Edge Functions (bist-stocks)
```

## Yasal Uyarı

Bu uygulama yatırım tavsiyesi vermez. Teknik analiz sinyalleri bilgilendirme amaçlıdır.
Yatırım kararlarınız tamamen size aittir.
