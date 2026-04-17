// BIST endeks üyelikleri (resmi listelere dayalı, yaklaşık güncel)
export type IndexMembership = "BIST30" | "BIST50" | "BIST100" | "YILDIZ";

// BIST30 — en yüksek piyasa değerli 30 hisse
const BIST30 = new Set([
  "THYAO","GARAN","AKBNK","EREGL","KCHOL","SAHOL","SISE","TUPRS","YKBNK","BIMAS",
  "ASELS","PGSUS","TCELL","TOASO","FROTO","ARCLK","HEKTS","KOZAL","SASA","ENKAI",
  "MGROS","TTKOM","ISCTR","VAKBN","HALKB","AEFES","CCOLA","KORDS","GUBRF","TKFEN",
]);

// BIST50 = BIST30 + ek 20
const BIST50_EXTRA = new Set([
  "KOZAA","PETKM","TAVHL","VESTL","DOHOL","EKGYO","SOKM","ULKER","OTKAR","AKSA",
  "ALARK","AYGAZ","BRISA","CIMSA","DOAS","ENJSA","LOGO","MAVI","SMRTG","TTRAK",
]);

// BIST100 = BIST50 + ek 50 (kalan tüm semboller varsayılan olarak BIST100 kabul ediliyor)
// Yıldız Pazar — büyük ölçüde BIST100 ile örtüşür; pratik amaçla BIST100 üyeleri = Yıldız Pazar.

export function getIndexMemberships(symbol: string): IndexMembership[] {
  const memberships: IndexMembership[] = [];
  const inBist30 = BIST30.has(symbol);
  const inBist50 = inBist30 || BIST50_EXTRA.has(symbol);
  // Tüm BIST100 evrenindeki semboller veri setimizde olduğu için hepsi BIST100 kabul edilir.
  if (inBist30) memberships.push("BIST30");
  if (inBist50) memberships.push("BIST50");
  memberships.push("BIST100");
  memberships.push("YILDIZ");
  return memberships;
}

export function isInIndex(symbol: string, idx: IndexMembership): boolean {
  return getIndexMemberships(symbol).includes(idx);
}
