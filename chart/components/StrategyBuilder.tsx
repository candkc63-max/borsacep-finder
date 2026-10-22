import { useEffect, useState } from "react";
import { backtestRules, describeGroups, type CompareOp, type Condition, type ConditionGroup, type Join, type LineSpec, type Operand, type StrategyRules } from "../lib/strategyRules";
import { CATEGORIES, filterCatalog, type Category } from "../lib/indicatorCatalog";
import { defaultRiskDraft, settingsFromDraft, type RiskDraft } from "../lib/riskPlan";
import { defaultScaleDraft, settingsFromScaleDraft, type ScaleDraft } from "../lib/scalePlan";
import { loadStrategies, saveStrategies, type SavedStrategy } from "../lib/strategyStore";
import type { StrategyReport } from "../lib/emaCross";
import type { OhlcBar } from "../lib/parseOhlcv";

const field = { background: "#111", color: "#f2f2f2", border: "1px solid #3a3a3a", borderRadius: 8, minHeight: 32, padding: "0 8px" };

function newId() {
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function stamp(condition: Condition): Condition {
  return { ...condition, id: condition.id || newId() };
}

function initial(): SavedStrategy {
  const now = new Date().toISOString();
  const buy: Condition = { id: "buy-ema", kind: "ema-cross", fast: 20, slow: 50, direction: "up" };
  const sell: Condition = { id: "sell-ema", kind: "ema-cross", fast: 20, slow: 50, direction: "down" };
  return {
    id: "",
    name: "EMA 20/50",
    createdAt: now,
    updatedAt: now,
    direction: "long",
    buyJoin: "and",
    sellJoin: "and",
    buy: [buy],
    sell: [sell],
    buyGroups: [{ id: "buy-1", join: "and", conditions: [buy] }],
    sellGroups: [{ id: "sell-1", join: "and", conditions: [sell] }],
    capital: 100000,
    allocation: 100,
    fee: 0.05,
    slippage: 0,
  };
}

function withGroups(item: SavedStrategy): SavedStrategy {
  if (item.buyGroups?.length && item.sellGroups?.length) return item;
  return {
    ...item,
    buyGroups: item.buyGroups?.length ? item.buyGroups : [{ id: newId(), join: item.buyJoin, conditions: item.buy }],
    sellGroups: item.sellGroups?.length ? item.sellGroups : [{ id: newId(), join: item.sellJoin, conditions: item.sell }],
    buyJoin: item.buyGroups?.length ? item.buyJoin : "and",
    sellJoin: item.sellGroups?.length ? item.sellJoin : "and",
  };
}

function numberChange(value: string) {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function numberField(label: string, value: number, onChange: (value: number) => void) {
  return (
    <label>{label}<input aria-label={label} value={Number.isFinite(value) ? value : ""} onChange={(event) => onChange(numberChange(event.target.value))} style={{ ...field, width: 72 }} /></label>
  );
}

function SpecFields({ spec, onChange }: { spec: LineSpec; onChange: (spec: LineSpec) => void }) {
  const set = (patch: Partial<LineSpec>) => onChange({ ...spec, ...patch });
  const period = spec.name !== "macd" && spec.name !== "obv" && spec.name !== "vwap";
  return (
    <>
      {period && numberField("Periyot", spec.period, (value) => set({ period: value }))}
      {spec.name === "macd" && (
        <>
          {numberField("Hızlı", spec.fast, (value) => set({ fast: value }))}
          {numberField("Yavaş", spec.slow, (value) => set({ slow: value }))}
          {numberField("Sinyal", spec.signal, (value) => set({ signal: value }))}
          <select aria-label="MACD çizgisi" value={spec.line} onChange={(event) => set({ line: event.target.value })} style={field}>
            <option value="macd">MACD</option>
            <option value="signal">Sinyal</option>
            <option value="histogram">Histogram</option>
          </select>
        </>
      )}
      {spec.name === "stoch" && (
        <>
          {numberField("Yumuşatma", spec.smooth, (value) => set({ smooth: value }))}
          <select aria-label="Stochastic çizgisi" value={spec.line} onChange={(event) => set({ line: event.target.value })} style={field}>
            <option value="k">%K</option>
            <option value="d">%D</option>
          </select>
        </>
      )}
      {(spec.name === "bb" || spec.name === "keltner" || spec.name === "supertrend") && numberField("Çarpan", spec.mult, (value) => set({ mult: value }))}
      {spec.name === "keltner" && numberField("ATR", spec.atrPeriod, (value) => set({ atrPeriod: value }))}
      {(spec.name === "bb" || spec.name === "keltner" || spec.name === "donchian") && (
        <select aria-label="Bant çizgisi" value={spec.line} onChange={(event) => set({ line: event.target.value })} style={field}>
          <option value="upper">Üst</option>
          <option value="middle">Orta</option>
          <option value="lower">Alt</option>
        </select>
      )}
    </>
  );
}

function OperandFields({ operand, onChange }: { operand: Operand; onChange: (operand: Operand) => void }) {
  return (
    <>
      <select aria-label="Karşılaştırılan değer" value={operand.source === "price" ? operand.field : operand.source} onChange={(event) => {
        const value = event.target.value;
        if (value === "constant") onChange({ source: "constant", value: 0 });
        else if (value === "indicator") onChange({ source: "indicator", spec: { name: "sma", period: 20, fast: 12, slow: 26, signal: 9, mult: 2, atrPeriod: 10, smooth: 3, line: "line" } });
        else onChange({ source: "price", field: value as "open" | "high" | "low" | "close" });
      }} style={field}>
        <option value="close">Kapanış</option>
        <option value="open">Açılış</option>
        <option value="high">Yüksek</option>
        <option value="low">Düşük</option>
        <option value="constant">Sabit sayı</option>
        <option value="indicator">Gösterge</option>
      </select>
      {operand.source === "constant" && numberField("Sayı", operand.value, (value) => onChange({ source: "constant", value }))}
      {operand.source === "indicator" && <SpecFields spec={operand.spec} onChange={(spec) => onChange({ source: "indicator", spec })} />}
    </>
  );
}

function ConditionEditor({ condition, onChange, onRemove }: { condition: Condition; onChange: (next: Condition) => void; onRemove: () => void }) {
  if (condition.kind !== "compare") {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
        <span>{condition.kind === "ema-cross" ? "EMA kesişimi" : condition.kind === "price-ema" ? "Kapanış ve EMA" : condition.kind === "rsi-cross" ? "RSI" : condition.kind === "adx-level" ? "ADX" : "ATR"}</span>
        {condition.kind === "ema-cross" && (
          <>
            {numberField("Hızlı EMA", condition.fast, (fast) => onChange({ ...condition, fast }))}
            {numberField("Yavaş EMA", condition.slow, (slow) => onChange({ ...condition, slow }))}
            <select aria-label="Kesişim yönü" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "up" | "down" })} style={field}>
              <option value="up">Yukarı keser</option>
              <option value="down">Aşağı keser</option>
            </select>
          </>
        )}
        {condition.kind === "price-ema" && (
          <>
            {numberField("EMA periyodu", condition.period, (period) => onChange({ ...condition, period }))}
            <select aria-label="Fiyat EMA ilişkisi" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "above" | "below" | "cross-up" | "cross-down" })} style={field}>
              <option value="above">Üzerinde</option>
              <option value="below">Altında</option>
              <option value="cross-up">Yukarı keser</option>
              <option value="cross-down">Aşağı keser</option>
            </select>
          </>
        )}
        {condition.kind === "rsi-cross" && (
          <>
            {numberField("RSI periyodu", condition.period, (period) => onChange({ ...condition, period }))}
            {numberField("RSI seviyesi", condition.level, (level) => onChange({ ...condition, level }))}
            <select aria-label="RSI yönü" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "up" | "down" })} style={field}>
              <option value="up">Yukarı keser</option>
              <option value="down">Aşağı keser</option>
            </select>
          </>
        )}
        {(condition.kind === "adx-level" || condition.kind === "atr-level") && (
          <>
            {numberField("Periyot", condition.period, (period) => onChange({ ...condition, period }))}
            {numberField("Eşik", condition.level, (level) => onChange({ ...condition, level }))}
            <select aria-label="Eşik ilişkisi" value={condition.relation} onChange={(event) => onChange({ ...condition, relation: event.target.value as "above" | "below" })} style={field}>
              <option value="above">Üzerinde</option>
              <option value="below">Altında</option>
            </select>
          </>
        )}
        <button type="button" onClick={onRemove} style={{ ...field, cursor: "pointer" }}>Sil</button>
      </div>
    );
  }
  const breaking = condition.op.startsWith("break-");
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <OperandFields operand={condition.left} onChange={(left) => onChange({ ...condition, left })} />
      <select aria-label="Karşılaştırma" value={condition.op} onChange={(event) => onChange({ ...condition, op: event.target.value as CompareOp })} style={{ ...field, width: 220 }}>
        <option value="above">Üzerinde</option>
        <option value="below">Altında</option>
        <option value="gt">Büyük</option>
        <option value="lt">Küçük</option>
        <option value="cross-up">Yukarı kesiyor</option>
        <option value="cross-down">Aşağı kesiyor</option>
        <option value="break-prev-high">Önceki mumun yükseğini kırıyor</option>
        <option value="break-prev-low">Önceki mumun düşüğünü kırıyor</option>
        <option value="break-highest">Son N mumun yükseğini kırıyor</option>
        <option value="break-lowest">Son N mumun düşüğünü kırıyor</option>
      </select>
      {!breaking && <OperandFields operand={condition.right} onChange={(right) => onChange({ ...condition, right })} />}
      {(condition.op === "break-highest" || condition.op === "break-lowest") && numberField("N mum", condition.length, (length) => onChange({ ...condition, length }))}
      <button type="button" onClick={onRemove} style={{ ...field, cursor: "pointer" }}>Sil</button>
    </div>
  );
}

function CatalogPicker({ onPick, onClose }: { onPick: (condition: Condition) => void; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "Tümü">("Tümü");
  const entries = filterCatalog(query, category);
  return (
    <div data-testid="indicator-catalog" style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid #2c2c2c", borderRadius: 8, padding: 8 }}>
      <input data-testid="indicator-search" aria-label="Gösterge ara" placeholder="Gösterge ara" value={query} onChange={(event) => setQuery(event.target.value)} style={{ ...field, width: 220 }} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {(["Tümü", ...CATEGORIES] as const).map((item) => (
          <button key={item} type="button" onClick={() => setCategory(item)} style={{ ...field, cursor: "pointer", background: category === item ? "#f2f2f2" : "#111", color: category === item ? "#111" : "#f2f2f2" }}>{item}</button>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(148px, 1fr))", gap: 6, width: "100%" }}>
        {entries.map((entry) => (
          <button key={entry.id} type="button" onClick={() => { onPick(stamp(entry.create())); onClose(); }} style={{ ...field, cursor: "pointer" }}>{entry.label}</button>
        ))}
        {entries.length === 0 && <span style={{ color: "#9a9a9a" }}>Eşleşen gösterge yok.</span>}
      </div>
    </div>
  );
}

function entryMode(scale: ScaleDraft) {
  if (scale.entryPercents.length <= 1) return "off";
  const key = scale.entryPercents.join(",");
  if (key === "50,50") return "2";
  if (key === "25,50,25") return "3";
  return "custom";
}

function exitMode(scale: ScaleDraft) {
  if (!scale.exitPercents.length) return "off";
  if (scale.exitPercents.join(",") === "3,6" && scale.exitSellPercents.join(",") === "50,50") return "2";
  if (scale.exitPercents.join(",") === "3,6,10" && scale.exitSellPercents.join(",") === "25,35,40") return "3";
  return "custom";
}

function ScaleSection({ scale, onChange }: { scale: ScaleDraft; onChange: (scale: ScaleDraft) => void }) {
  const set = (patch: Partial<ScaleDraft>) => {
    const next = { ...scale, ...patch };
    next.enabled = next.entryPercents.length > 1 || next.exitPercents.length > 0;
    onChange(next);
  };
  const entries = entryMode(scale);
  const exits = exitMode(scale);
  return (
    <div data-testid="scale-panel" style={{ display: "flex", flexDirection: "column", gap: 8, borderTop: "1px solid #2c2c2c", paddingTop: 8 }}>
      <strong>Kademeli işlemler</strong>
      <p style={{ margin: 0, color: "#9a9a9a" }}>Varsayılan kapalıdır. Artırma sinyali kapanmış mumda oluşur, emir sonraki açılışta dolar. Satış oranları ilk satış öncesi referans adede göredir. Son hedef kalanı kapatır.</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label>Giriş
          <select data-testid="scale-entry" aria-label="Kademeli giriş" value={entries} onChange={(event) => {
            const value = event.target.value;
            if (value === "off") set({ entryPercents: [100] });
            else if (value === "2") set({ entryPercents: [50, 50] });
            else if (value === "3") set({ entryPercents: [25, 50, 25] });
            else set({ entryPercents: scale.entryPercents.length > 1 ? scale.entryPercents : [25, 50, 25] });
          }} style={field}>
            <option value="off">Tek seferde giriş</option>
            <option value="2">2 aşamalı giriş</option>
            <option value="3">3 aşamalı giriş</option>
            <option value="custom">Kullanıcı tanımlı</option>
          </select>
        </label>
        {entries !== "off" && scale.entryPercents.map((percent, index) => (
          <span key={`entry-${index}`}>{numberField(`Giriş ${index + 1} %`, percent, (value) => set({ entryPercents: scale.entryPercents.map((item, itemIndex) => itemIndex === index ? value : item) }))}</span>
        ))}
        {entries === "custom" && <button type="button" onClick={() => set({ entryPercents: [...scale.entryPercents, 10] })} style={{ ...field, cursor: "pointer" }}>Aşama ekle</button>}
      </div>
      {entries !== "off" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
          <label>Pozisyon artırma
            <select data-testid="scale-trigger" aria-label="Pozisyon artırma" value={scale.trigger} onChange={(event) => set({ trigger: event.target.value as ScaleDraft["trigger"] })} style={field}>
              <option value="percent">Fiyat yüzdesi</option>
              <option value="ema">EMA kesişimi</option>
              <option value="break-high">Önceki zirve</option>
              <option value="atr">ATR hareketi</option>
            </select>
          </label>
          {scale.trigger === "percent" && numberField("Artış %", scale.triggerPercent, (triggerPercent) => set({ triggerPercent }))}
          {scale.trigger === "ema" && (
            <>
              {numberField("Hızlı EMA", scale.emaFast, (emaFast) => set({ emaFast }))}
              {numberField("Yavaş EMA", scale.emaSlow, (emaSlow) => set({ emaSlow }))}
            </>
          )}
          {scale.trigger === "atr" && (
            <>
              {numberField("ATR periyodu", scale.atrPeriod, (atrPeriod) => set({ atrPeriod }))}
              {numberField("ATR çarpanı", scale.atrMult, (atrMult) => set({ atrMult }))}
            </>
          )}
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label>Kâr alma
          <select data-testid="scale-exit" aria-label="Kademeli kâr" value={exits} onChange={(event) => {
            const value = event.target.value;
            if (value === "off") set({ exitPercents: [], exitSellPercents: [] });
            else if (value === "2") set({ exitPercents: [3, 6], exitSellPercents: [50, 50] });
            else if (value === "3") set({ exitPercents: [3, 6, 10], exitSellPercents: [25, 35, 40] });
            else set({
              exitPercents: scale.exitPercents.length ? scale.exitPercents : [3, 6, 10],
              exitSellPercents: scale.exitSellPercents.length ? scale.exitSellPercents : [25, 35, 40],
            });
          }} style={field}>
            <option value="off">Tek hedef</option>
            <option value="2">2 aşamalı kâr alma</option>
            <option value="3">3 aşamalı kâr alma</option>
            <option value="custom">Kullanıcı tanımlı</option>
          </select>
        </label>
        {scale.exitPercents.map((percent, index) => (
          <span key={`exit-${index}`}>
            {numberField(`Hedef ${index + 1} %`, percent, (value) => set({ exitPercents: scale.exitPercents.map((item, itemIndex) => itemIndex === index ? value : item) }))}
            {numberField(`Satış ${index + 1} %`, scale.exitSellPercents[index] ?? 0, (value) => set({ exitSellPercents: scale.exitPercents.map((_, itemIndex) => itemIndex === index ? value : (scale.exitSellPercents[itemIndex] ?? 0)) }))}
          </span>
        ))}
      </div>
      <label>Toplam risk sınırı %
        <input data-testid="scale-risk" aria-label="Toplam risk sınırı" value={scale.maxRiskPercent ?? ""} onChange={(event) => {
          const text = event.target.value.trim();
          set({ maxRiskPercent: text === "" ? null : Number(text) });
        }} style={{ ...field, width: 88 }} />
      </label>
      <p style={{ margin: 0, color: "#9a9a9a" }}>Boş risk sınırı, ek tavan koymaz. Risk yüzdesiyle adet seçiliyse o bütçe tavan olarak kalır.</p>
    </div>
  );
}

function RiskSection({ risk, onChange, scale, onScale }: { risk: RiskDraft; onChange: (risk: RiskDraft) => void; scale: ScaleDraft; onScale: (scale: ScaleDraft) => void }) {
  const set = (patch: Partial<RiskDraft>) => {
    const next = { ...risk, ...patch };
    if (next.stop === "none" && next.target === "rr") next.target = "none";
    if (next.stop === "none" && next.size === "risk") next.size = "equity";
    onChange(next);
  };
  const stopOff = risk.stop === "none";
  return (
    <details data-testid="risk-panel" style={{ border: "1px solid #2c2c2c", borderRadius: 8, padding: "6px 8px" }}>
      <summary style={{ cursor: "pointer", color: "#f2f2f2" }}>Risk yönetimi</summary>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
        <p style={{ margin: 0, color: "#9a9a9a" }}>Stop ve hedef, girişten sonraki mumlarda yüksek ve düşük ile kontrol edilir. Aynı mumda ikisi birden görülürse stop önce kabul edilir. Açılış stopun ötesindeyse satış açılış fiyatındadır.</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
          <label>Stop Loss
            <select data-testid="risk-stop" aria-label="Stop Loss" value={risk.stop} onChange={(event) => set({ stop: event.target.value as RiskDraft["stop"] })} style={field}>
              <option value="none">Stop yok</option>
              <option value="percent">Sabit yüzde</option>
              <option value="price">Sabit fiyat</option>
              <option value="atr">ATR çarpanı</option>
              <option value="swing">Son N mumun düşüğü</option>
            </select>
          </label>
          {risk.stop === "percent" && numberField("Stop %", risk.stopPercent, (stopPercent) => set({ stopPercent }))}
          {risk.stop === "price" && numberField("Stop fiyatı", risk.stopPrice, (stopPrice) => set({ stopPrice }))}
          {risk.stop === "atr" && (
            <>
              {numberField("ATR periyodu", risk.atrPeriod, (atrPeriod) => set({ atrPeriod }))}
              {numberField("ATR çarpanı", risk.atrMult, (atrMult) => set({ atrMult }))}
            </>
          )}
          {risk.stop === "swing" && numberField("Mum sayısı", risk.swingBars, (swingBars) => set({ swingBars }))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
          <label>Take Profit
            <select data-testid="risk-target" aria-label="Take Profit" value={risk.target} onChange={(event) => set({ target: event.target.value as RiskDraft["target"] })} style={field}>
              <option value="none">Hedef yok</option>
              <option value="percent">Sabit yüzde</option>
              <option value="price">Sabit fiyat</option>
              <option value="rr" disabled={stopOff}>Risk/ödül</option>
            </select>
          </label>
          {risk.target === "percent" && numberField("Hedef %", risk.targetPercent, (targetPercent) => set({ targetPercent }))}
          {risk.target === "price" && numberField("Hedef fiyatı", risk.targetPrice, (targetPrice) => set({ targetPrice }))}
          {risk.target === "rr" && (
            <>
              <select data-testid="risk-reward" aria-label="Risk ödül" value={[1, 2, 3].includes(risk.rewardMultiple) ? String(risk.rewardMultiple) : "custom"} onChange={(event) => {
                const value = event.target.value;
                if (value === "custom") set({ rewardMultiple: [1, 2, 3].includes(risk.rewardMultiple) ? 1.5 : risk.rewardMultiple });
                else set({ rewardMultiple: Number(value) });
              }} style={field}>
                <option value="1">1'e 1</option>
                <option value="2">1'e 2</option>
                <option value="3">1'e 3</option>
                <option value="custom">Kullanıcı tanımlı</option>
              </select>
              {![1, 2, 3].includes(risk.rewardMultiple) && numberField("Ödül çarpanı", risk.rewardMultiple, (rewardMultiple) => set({ rewardMultiple }))}
            </>
          )}
          {stopOff && <span style={{ color: "#9a9a9a" }}>Risk/ödül için başlangıç stopu gerekli.</span>}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
          <label>Trailing Stop
            <select data-testid="risk-trail" aria-label="Trailing Stop" value={risk.trail} onChange={(event) => set({ trail: event.target.value as RiskDraft["trail"] })} style={field}>
              <option value="off">Kapalı</option>
              <option value="percent">Yüzde</option>
              <option value="atr">ATR</option>
            </select>
          </label>
          {risk.trail === "percent" && numberField("İz süren %", risk.trailPercent, (trailPercent) => set({ trailPercent }))}
          {risk.trail === "atr" && (
            <>
              {numberField("İz süren ATR", risk.trailAtrPeriod, (trailAtrPeriod) => set({ trailAtrPeriod }))}
              {numberField("İz süren çarpan", risk.trailAtrMult, (trailAtrMult) => set({ trailAtrMult }))}
            </>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
          <label>Pozisyon büyüklüğü
            <select data-testid="risk-size" aria-label="Pozisyon büyüklüğü" value={risk.size} onChange={(event) => set({ size: event.target.value as RiskDraft["size"] })} style={field}>
              <option value="equity">Sermaye yüzdesi</option>
              <option value="shares">Sabit adet</option>
              <option value="risk" disabled={stopOff}>İşlem riski %</option>
            </select>
          </label>
          {risk.size === "shares" && numberField("Adet", risk.shares, (shares) => set({ shares }))}
          {risk.size === "equity" && <span style={{ color: "#9a9a9a" }}>Üstteki büyüklük yüzdesi kullanılır.</span>}
          {risk.size === "risk" && numberField("İşlem riski %", risk.riskPercent, (riskPercent) => set({ riskPercent }))}
          {stopOff && <span style={{ color: "#9a9a9a" }}>Risk yüzdesi için başlangıç stopu gerekli.</span>}
        </div>
        <ScaleSection scale={scale} onChange={onScale} />
      </div>
    </details>
  );
}

export function StrategyBuilder({
  rows,
  adjustment,
  onReport,
}: {
  rows: OhlcBar[] | null;
  adjustment: string;
  onReport: (report: StrategyReport) => void;
}) {
  const [draft, setDraft] = useState<SavedStrategy>(initial);
  const [saved, setSaved] = useState<SavedStrategy[]>([]);
  const [formError, setFormError] = useState("");
  const [picker, setPicker] = useState<{ side: "buy" | "sell"; index: number } | null>(null);

  useEffect(() => {
    setSaved(loadStrategies(window.localStorage));
  }, []);

  function persist(list: SavedStrategy[]) {
    setSaved(list);
    saveStrategies(window.localStorage, list);
  }

  function groupsOf(side: "buy" | "sell") {
    return side === "buy" ? draft.buyGroups ?? [] : draft.sellGroups ?? [];
  }

  function setGroups(side: "buy" | "sell", groups: ConditionGroup[]) {
    const flat = groups.flatMap((group) => group.conditions);
    setDraft(side === "buy" ? { ...draft, buyGroups: groups, buy: flat } : { ...draft, sellGroups: groups, sell: flat });
  }

  function rules(): StrategyRules {
    const current = withGroups(draft);
    return {
      name: current.name.trim() || "Adsız strateji",
      capital: current.capital,
      allocation: current.allocation / 100,
      feeRate: current.fee / 100,
      slippageRate: current.slippage / 100,
      buyJoin: current.buyJoin,
      sellJoin: current.sellJoin,
      buy: current.buyGroups?.flatMap((group) => group.conditions) ?? current.buy,
      sell: current.sellGroups?.flatMap((group) => group.conditions) ?? current.sell,
      buyGroups: current.buyGroups,
      sellGroups: current.sellGroups,
      risk: settingsFromDraft(current.risk ?? defaultRiskDraft()),
      scale: settingsFromScaleDraft(current.scale ?? defaultScaleDraft()),
    };
  }

  function run() {
    if (!rows?.length) {
      setFormError("Grafik verisi yok.");
      return;
    }
    const next = rules();
    if (![next.capital, next.allocation, next.feeRate, next.slippageRate].every(Number.isFinite)) {
      setFormError("Sermaye, büyüklük, komisyon ve kayma sayı olmalı.");
      return;
    }
    setFormError("");
    onReport(backtestRules(rows, next, adjustment));
  }

  function save() {
    const name = draft.name.trim();
    if (!name) {
      setFormError("Strateji adı gerekli.");
      return;
    }
    const now = new Date().toISOString();
    const current = withGroups({ ...draft, name });
    const record: SavedStrategy = { ...current, direction: "long", updatedAt: now, createdAt: current.id ? current.createdAt : now, id: current.id || newId() };
    const list = saved.some((item) => item.id === record.id)
      ? saved.map((item) => item.id === record.id ? record : item)
      : [record, ...saved];
    persist(list);
    setDraft(record);
    setFormError("");
  }

  function copy(item: SavedStrategy) {
    const now = new Date().toISOString();
    const source = withGroups(item);
    const record: SavedStrategy = {
      ...source,
      id: newId(),
      name: `${item.name} kopya`,
      createdAt: now,
      updatedAt: now,
      buyGroups: source.buyGroups?.map((group) => ({ ...group, id: newId(), conditions: group.conditions.map((condition) => ({ ...condition, id: newId() })) })),
      sellGroups: source.sellGroups?.map((group) => ({ ...group, id: newId(), conditions: group.conditions.map((condition) => ({ ...condition, id: newId() })) })),
    };
    record.buy = record.buyGroups?.flatMap((group) => group.conditions) ?? [];
    record.sell = record.sellGroups?.flatMap((group) => group.conditions) ?? [];
    persist([record, ...saved]);
    setDraft(record);
  }

  function renderSide(side: "buy" | "sell", title: string, color: string) {
    const groups = groupsOf(side);
    const outer = side === "buy" ? draft.buyJoin : draft.sellJoin;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
          <strong style={{ color }}>{title}</strong>
          <select data-testid={side === "buy" ? "buy-join" : "sell-join"} aria-label={side === "buy" ? "AL grupları arası" : "SAT grupları arası"} value={outer} onChange={(event) => setDraft({ ...draft, [side === "buy" ? "buyJoin" : "sellJoin"]: event.target.value as Join })} style={field}>
            <option value="and">Gruplar arası VE</option>
            <option value="or">Gruplar arası VEYA</option>
          </select>
          <button type="button" onClick={() => setGroups(side, [...groups, { id: newId(), join: "and", conditions: [] }])} style={{ ...field, cursor: "pointer" }}>Grup ekle</button>
        </div>
        {groups.map((group, groupIndex) => (
          <div key={group.id} style={{ display: "flex", flexDirection: "column", gap: 6, border: "1px solid #2c2c2c", borderRadius: 8, padding: 8 }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <span>Grup {groupIndex + 1}</span>
              <select aria-label={`Grup ${groupIndex + 1} içi`} value={group.join} onChange={(event) => setGroups(side, groups.map((item, index) => index === groupIndex ? { ...item, join: event.target.value as Join } : item))} style={field}>
                <option value="and">Grup içi VE</option>
                <option value="or">Grup içi VEYA</option>
              </select>
              <button type="button" onClick={() => setPicker({ side, index: groupIndex })} style={{ ...field, cursor: "pointer" }}>Koşul ekle</button>
              <button type="button" disabled={groupIndex === 0} onClick={() => {
                const next = groups.slice();
                [next[groupIndex - 1], next[groupIndex]] = [next[groupIndex], next[groupIndex - 1]];
                setGroups(side, next);
              }} style={{ ...field, cursor: "pointer" }}>Yukarı</button>
              {groups.length > 1 && <button type="button" onClick={() => setGroups(side, groups.filter((_, index) => index !== groupIndex))} style={{ ...field, cursor: "pointer" }}>Grubu sil</button>}
            </div>
            {picker?.side === side && picker.index === groupIndex && (
              <CatalogPicker onClose={() => setPicker(null)} onPick={(condition) => setGroups(side, groups.map((item, index) => index === groupIndex ? { ...item, conditions: [...item.conditions, condition] } : item))} />
            )}
            {group.conditions.map((condition, conditionIndex) => (
              <ConditionEditor key={condition.id} condition={condition} onChange={(next) => setGroups(side, groups.map((item, index) => index === groupIndex ? { ...item, conditions: item.conditions.map((row, rowIndex) => rowIndex === conditionIndex ? next : row) } : item))} onRemove={() => setGroups(side, groups.map((item, index) => index === groupIndex ? { ...item, conditions: item.conditions.filter((_, rowIndex) => rowIndex !== conditionIndex) } : item))} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div data-testid="strategy-builder" style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 0, maxWidth: "100%" }}>
      <p style={{ margin: 0, color: "#9a9a9a" }}>
        EMA kapanıştan üsteldir. RSI, ADX ve ATR Wilder yöntemidir. SMA, WMA ve HMA kapanıştandır. VWAP serinin başından birikir, seans sıfırlaması yoktur. Sinyal kapanmış mumda oluşur, emir sonraki açılışta dolar. Bölünme ve temettü düzeltmesi veri kaynağının notuna bağlıdır. Kayıtlar yalnızca bu tarayıcıda tutulur.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label>Strateji adı<input data-testid="strategy-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={{ ...field, width: 180 }} /></label>
        <label>Yön<select value="long" disabled style={{ ...field, width: 120 }}><option value="long">Only Long</option></select></label>
        <label>Sermaye<input aria-label="Strateji sermayesi" value={draft.capital} onChange={(event) => setDraft({ ...draft, capital: numberChange(event.target.value) })} style={{ ...field, width: 100 }} /></label>
        <label>Büyüklük %<input aria-label="Strateji büyüklüğü" value={draft.allocation} onChange={(event) => setDraft({ ...draft, allocation: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
        <label>Komisyon %<input aria-label="Strateji komisyonu" value={draft.fee} onChange={(event) => setDraft({ ...draft, fee: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
        <label>Kayma %<input aria-label="Strateji kayması" value={draft.slippage} onChange={(event) => setDraft({ ...draft, slippage: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
      </div>
      {renderSide("buy", "AL koşulları", "#16c47a")}
      {renderSide("sell", "SAT koşulları", "#e10600")}
      <RiskSection risk={draft.risk ?? defaultRiskDraft()} onChange={(risk) => setDraft({ ...draft, risk })} scale={draft.scale ?? defaultScaleDraft()} onScale={(scale) => setDraft({ ...draft, scale })} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" data-testid="strategy-run-rules" onClick={run} disabled={!rows?.length} style={{ minHeight: 32, padding: "0 12px", borderRadius: 8, border: "1px solid #f2f2f2", background: "#f2f2f2", color: "#111", cursor: "pointer" }}>Testi Başlat</button>
        <button type="button" data-testid="strategy-save" onClick={save} style={{ ...field, cursor: "pointer" }}>Kaydet</button>
      </div>
      {formError && <p role="alert" style={{ margin: 0, color: "#e10600" }}>{formError}</p>}
      <div data-testid="saved-strategies" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {saved.length === 0 && <span style={{ color: "#9a9a9a" }}>Kayıtlı strateji yok. Kayıt bu cihazda kalır.</span>}
        {saved.map((item) => (
          <div key={item.id} style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", border: "1px solid #2c2c2c", borderRadius: 8, padding: "6px 8px" }}>
            <span style={{ minWidth: 140 }}>{item.name}</span>
            <span style={{ color: "#8d8d8d" }}>{describeGroups(item.buyGroups, item.buy, item.buyGroups?.length ? item.buyJoin : item.buyJoin)}</span>
            <button type="button" onClick={() => setDraft(withGroups(item))} style={{ ...field, cursor: "pointer" }}>Aç</button>
            <button type="button" onClick={() => copy(item)} style={{ ...field, cursor: "pointer" }}>Kopyala</button>
            <button type="button" onClick={() => {
              persist(saved.filter((row) => row.id !== item.id));
              if (draft.id === item.id) setDraft(initial());
            }} style={{ ...field, cursor: "pointer" }}>Sil</button>
          </div>
        ))}
      </div>
    </div>
  );
}
