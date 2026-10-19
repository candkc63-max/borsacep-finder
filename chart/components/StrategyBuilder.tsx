import { useEffect, useState } from "react";
import { backtestRules, describeCondition, type Condition, type Join, type StrategyRules } from "../lib/strategyRules";
import { loadStrategies, saveStrategies, type SavedStrategy } from "../lib/strategyStore";
import type { StrategyReport } from "../lib/emaCross";
import type { OhlcBar } from "../lib/parseOhlcv";

const field = { background: "#111", color: "#f2f2f2", border: "1px solid #3a3a3a", borderRadius: 8, minHeight: 32, padding: "0 8px" };

function newId() {
  return `k-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function blank(kind: Condition["kind"]): Condition {
  const id = newId();
  if (kind === "ema-cross") return { id, kind, fast: 20, slow: 50, direction: "up" };
  if (kind === "price-ema") return { id, kind, period: 200, direction: "above" };
  if (kind === "rsi-cross") return { id, kind, period: 14, level: 30, direction: "up" };
  if (kind === "adx-level") return { id, kind, period: 14, level: 25, relation: "above" };
  return { id, kind: "atr-level", period: 14, level: 1, relation: "above" };
}

function initial(): SavedStrategy {
  const now = new Date().toISOString();
  return {
    id: "",
    name: "EMA 20/50",
    createdAt: now,
    updatedAt: now,
    direction: "long",
    buyJoin: "and",
    sellJoin: "and",
    buy: [{ id: "buy-ema", kind: "ema-cross", fast: 20, slow: 50, direction: "up" }],
    sell: [{ id: "sell-ema", kind: "ema-cross", fast: 20, slow: 50, direction: "down" }],
    capital: 100000,
    allocation: 100,
    fee: 0.05,
    slippage: 0,
  };
}

function numberChange(value: string) {
  return value.trim() === "" ? Number.NaN : Number(value);
}

function ConditionRow({
  condition,
  onChange,
  onRemove,
}: {
  condition: Condition;
  onChange: (next: Condition) => void;
  onRemove: () => void;
}) {
  function changeKind(kind: Condition["kind"]) {
    onChange({ ...blank(kind), id: condition.id });
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
      <select aria-label="Koşul türü" value={condition.kind} onChange={(event) => changeKind(event.target.value as Condition["kind"])} style={{ ...field, width: 180 }}>
        <option value="ema-cross">EMA kesişimi</option>
        <option value="price-ema">Kapanış ve EMA</option>
        <option value="rsi-cross">RSI kesişimi</option>
        <option value="adx-level">ADX eşik</option>
        <option value="atr-level">ATR eşik</option>
      </select>
      {condition.kind === "ema-cross" && (
        <>
          <label>Hızlı<input aria-label="Hızlı EMA" value={condition.fast} onChange={(event) => onChange({ ...condition, fast: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <label>Yavaş<input aria-label="Yavaş EMA" value={condition.slow} onChange={(event) => onChange({ ...condition, slow: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <select aria-label="Kesişim yönü" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "up" | "down" })} style={field}>
            <option value="up">Yukarı keser</option>
            <option value="down">Aşağı keser</option>
          </select>
        </>
      )}
      {condition.kind === "price-ema" && (
        <>
          <label>Periyot<input aria-label="EMA periyodu" value={condition.period} onChange={(event) => onChange({ ...condition, period: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <select aria-label="Fiyat EMA ilişkisi" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "above" | "below" | "cross-up" | "cross-down" })} style={{ ...field, width: 180 }}>
            <option value="above">Kapanış EMA üzerinde</option>
            <option value="below">Kapanış EMA altında</option>
            <option value="cross-up">EMA'yı yukarı keser</option>
            <option value="cross-down">EMA'yı aşağı keser</option>
          </select>
        </>
      )}
      {condition.kind === "rsi-cross" && (
        <>
          <label>Periyot<input aria-label="RSI periyodu" value={condition.period} onChange={(event) => onChange({ ...condition, period: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <label>Seviye<input aria-label="RSI seviyesi" value={condition.level} onChange={(event) => onChange({ ...condition, level: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <select aria-label="RSI yönü" value={condition.direction} onChange={(event) => onChange({ ...condition, direction: event.target.value as "up" | "down" })} style={field}>
            <option value="up">Yukarı keser</option>
            <option value="down">Aşağı keser</option>
          </select>
        </>
      )}
      {(condition.kind === "adx-level" || condition.kind === "atr-level") && (
        <>
          <label>Periyot<input aria-label={`${condition.kind === "adx-level" ? "ADX" : "ATR"} periyodu`} value={condition.period} onChange={(event) => onChange({ ...condition, period: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
          <label>Eşik<input aria-label={`${condition.kind === "adx-level" ? "ADX" : "ATR"} eşiği`} value={condition.level} onChange={(event) => onChange({ ...condition, level: numberChange(event.target.value) })} style={{ ...field, width: 64 }} /></label>
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

  useEffect(() => {
    setSaved(loadStrategies(window.localStorage));
  }, []);

  function persist(list: SavedStrategy[]) {
    setSaved(list);
    saveStrategies(window.localStorage, list);
  }

  function updateBuy(index: number, condition: Condition) {
    setDraft({ ...draft, buy: draft.buy.map((item, itemIndex) => itemIndex === index ? condition : item) });
  }
  function updateSell(index: number, condition: Condition) {
    setDraft({ ...draft, sell: draft.sell.map((item, itemIndex) => itemIndex === index ? condition : item) });
  }

  function rules(): StrategyRules {
    return {
      name: draft.name.trim() || "Adsız strateji",
      capital: draft.capital,
      allocation: draft.allocation / 100,
      feeRate: draft.fee / 100,
      slippageRate: draft.slippage / 100,
      buyJoin: draft.buyJoin,
      sellJoin: draft.sellJoin,
      buy: draft.buy,
      sell: draft.sell,
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
    const record: SavedStrategy = { ...draft, name, direction: "long", updatedAt: now, createdAt: draft.id ? draft.createdAt : now, id: draft.id || newId() };
    const list = saved.some((item) => item.id === record.id)
      ? saved.map((item) => item.id === record.id ? record : item)
      : [record, ...saved];
    persist(list);
    setDraft(record);
    setFormError("");
  }

  function copy(item: SavedStrategy) {
    const now = new Date().toISOString();
    const record: SavedStrategy = {
      ...item,
      id: newId(),
      name: `${item.name} kopya`,
      createdAt: now,
      updatedAt: now,
      buy: item.buy.map((condition) => ({ ...condition, id: newId() })),
      sell: item.sell.map((condition) => ({ ...condition, id: newId() })),
    };
    persist([record, ...saved]);
    setDraft(record);
  }

  return (
    <div data-testid="strategy-builder" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <p style={{ margin: 0, color: "#9a9a9a" }}>
        EMA kapanıştan üsteldir. RSI, ADX ve ATR Wilder yöntemidir. Sinyal kapanmış mumda oluşur, emir sonraki açılışta dolar. Kayıtlar yalnızca bu tarayıcıda tutulur.
      </p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "end" }}>
        <label>Strateji adı<input data-testid="strategy-name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} style={{ ...field, width: 180 }} /></label>
        <label>Yön<select value="long" disabled style={{ ...field, width: 120 }}><option value="long">Only Long</option></select></label>
        <label>Sermaye<input aria-label="Strateji sermayesi" value={draft.capital} onChange={(event) => setDraft({ ...draft, capital: numberChange(event.target.value) })} style={{ ...field, width: 100 }} /></label>
        <label>Büyüklük %<input aria-label="Strateji büyüklüğü" value={draft.allocation} onChange={(event) => setDraft({ ...draft, allocation: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
        <label>Komisyon %<input aria-label="Strateji komisyonu" value={draft.fee} onChange={(event) => setDraft({ ...draft, fee: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
        <label>Kayma %<input aria-label="Strateji kayması" value={draft.slippage} onChange={(event) => setDraft({ ...draft, slippage: numberChange(event.target.value) })} style={{ ...field, width: 72 }} /></label>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong style={{ color: "#16c47a" }}>AL koşulları</strong>
        <select data-testid="buy-join" aria-label="AL birleştirme" value={draft.buyJoin} onChange={(event) => setDraft({ ...draft, buyJoin: event.target.value as Join })} style={field}>
          <option value="and">VE</option>
          <option value="or">VEYA</option>
        </select>
        <button type="button" onClick={() => setDraft({ ...draft, buy: [...draft.buy, blank("price-ema")] })} style={{ ...field, cursor: "pointer" }}>Koşul ekle</button>
      </div>
      {draft.buy.map((condition, index) => (
        <ConditionRow key={condition.id} condition={condition} onChange={(next) => updateBuy(index, next)} onRemove={() => setDraft({ ...draft, buy: draft.buy.filter((_, itemIndex) => itemIndex !== index) })} />
      ))}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <strong style={{ color: "#e10600" }}>SAT koşulları</strong>
        <select data-testid="sell-join" aria-label="SAT birleştirme" value={draft.sellJoin} onChange={(event) => setDraft({ ...draft, sellJoin: event.target.value as Join })} style={field}>
          <option value="and">VE</option>
          <option value="or">VEYA</option>
        </select>
        <button type="button" onClick={() => setDraft({ ...draft, sell: [...draft.sell, blank("ema-cross")] })} style={{ ...field, cursor: "pointer" }}>Koşul ekle</button>
      </div>
      {draft.sell.map((condition, index) => (
        <ConditionRow key={condition.id} condition={condition} onChange={(next) => updateSell(index, next)} onRemove={() => setDraft({ ...draft, sell: draft.sell.filter((_, itemIndex) => itemIndex !== index) })} />
      ))}
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
            <span style={{ color: "#8d8d8d" }}>{item.buy.map(describeCondition).join(item.buyJoin === "and" ? " VE " : " VEYA ") || "AL yok"}</span>
            <button type="button" onClick={() => setDraft(item)} style={{ ...field, cursor: "pointer" }}>Aç</button>
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
