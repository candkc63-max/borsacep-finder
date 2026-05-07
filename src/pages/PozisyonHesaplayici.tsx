import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Calculator, LineChart, Loader2, Save, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Footer } from "@/components/Footer";
import { TradingViewWidget } from "@/components/TradingViewWidget";
import { hasBackend, supabase } from "@/lib/backend";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionTier } from "@/hooks/useSubscriptionTier";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const trCurrency = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const trNum = new Intl.NumberFormat("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** TR: 1.234,56 veya 100.000 (binlik nokta) veya 42,5 */
function parseInputNumber(raw: string): number | null {
  let s = raw.trim().replace(/\s/g, "");
  if (s === "" || s === "-" || s === ".") return null;

  const lastComma = s.lastIndexOf(",");
  const lastDot = s.lastIndexOf(".");

  if (lastComma > lastDot) {
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > lastComma) {
    s = s.replace(/,/g, "");
    if (/^\d{1,3}(\.\d{3})+(\.\d+)?$/.test(s)) {
      const parts = s.split(".");
      const frac = parts[parts.length - 1].length <= 2 && parts.length > 1 ? parts.pop() : null;
      s = parts.join("") + (frac !== null && frac !== undefined ? `.${frac}` : "");
    }
  } else if (lastComma === -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  } else {
    s = s.replace(",", ".");
  }

  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type Side = "long" | "short";

type CalcOk = {
  ok: true;
  side: Side;
  riskAmount: number;
  shares: number;
  positionNotional: number;
  stopDistancePct: number;
  rewardRisk: number;
  perShareRisk: number;
};

type CalcErr = { ok: false; message: string };

function compute(
  account: number,
  riskPct: number,
  entry: number,
  stop: number,
  target: number,
): CalcOk | CalcErr {
  if (account <= 0) return { ok: false, message: "Hesap büyüklüğü pozitif olmalı." };
  if (riskPct <= 0 || riskPct > 100) return { ok: false, message: "Risk yüzdesi 0–100 arasında olmalı." };
  if (entry <= 0) return { ok: false, message: "Giriş fiyatı pozitif olmalı." };

  const perShareRisk = Math.abs(entry - stop);
  if (perShareRisk < 1e-9) return { ok: false, message: "Stop, girişten farklı bir fiyat olmalı." };

  let side: Side;
  if (stop < entry) side = "long";
  else if (stop > entry) side = "short";
  else return { ok: false, message: "Stop ve giriş aynı olamaz." };

  const riskAmount = account * (riskPct / 100);
  const shares = Math.floor(riskAmount / perShareRisk);
  if (shares <= 0) return { ok: false, message: "Bu parametrelerle en az 1 lot/lot hisse çıkmıyor; risk veya hesabı artırın ya da stop mesafesini daraltın." };

  const positionNotional = shares * entry;
  const stopDistancePct = (perShareRisk / entry) * 100;

  let rewardRisk: number;
  if (side === "long") {
    const riskUnit = entry - stop;
    const rewardUnit = target - entry;
    if (Math.abs(riskUnit) < 1e-9) return { ok: false, message: "Risk birimi hesaplanamadı." };
    rewardRisk = rewardUnit / riskUnit;
  } else {
    const riskUnit = stop - entry;
    const rewardUnit = entry - target;
    if (Math.abs(riskUnit) < 1e-9) return { ok: false, message: "Risk birimi hesaplanamadı." };
    rewardRisk = rewardUnit / riskUnit;
  }

  return {
    ok: true,
    side,
    riskAmount,
    shares,
    positionNotional,
    stopDistancePct,
    rewardRisk,
    perShareRisk,
  };
}

const PozisyonHesaplayici = () => {
  const { user } = useAuth();
  const { isPro, loading: tierLoading } = useSubscriptionTier();

  const [accountStr, setAccountStr] = useState("100000");
  const [riskStr, setRiskStr] = useState("1");
  const [entryStr, setEntryStr] = useState("42,50");
  const [stopStr, setStopStr] = useState("40");
  const [targetStr, setTargetStr] = useState("48");
  const [symbol, setSymbol] = useState("");
  const [showChart, setShowChart] = useState(false);
  const [saving, setSaving] = useState(false);

  const parsed = useMemo(() => {
    return {
      account: parseInputNumber(accountStr),
      riskPct: parseInputNumber(riskStr),
      entry: parseInputNumber(entryStr),
      stop: parseInputNumber(stopStr),
      target: parseInputNumber(targetStr),
    };
  }, [accountStr, riskStr, entryStr, stopStr, targetStr]);

  const result = useMemo((): CalcOk | CalcErr | null => {
    const { account, riskPct, entry, stop, target } = parsed;
    if (
      account === null ||
      riskPct === null ||
      entry === null ||
      stop === null ||
      target === null
    ) {
      return null;
    }
    return compute(account, riskPct, entry, stop, target);
  }, [parsed]);

  const riskPctValue = parsed.riskPct;
  const showRiskBanner =
    result?.ok === true &&
    riskPctValue !== null &&
    (riskPctValue > 2 || result.rewardRisk < 1);

  const chartSymbol = symbol.trim().toUpperCase().replace(/^BIST:/i, "");

  const handleSave = async () => {
    if (!hasBackend || !user || !isPro) return;
    if (result?.ok !== true) {
      toast.error("Önce geçerli bir hesaplama girin.");
      return;
    }
    const { account, riskPct, entry, stop, target } = parsed;
    if (
      account === null ||
      riskPct === null ||
      entry === null ||
      stop === null ||
      target === null
    ) {
      toast.error("Eksik alanlar var.");
      return;
    }

    setSaving(true);
    const { error } = await supabase.from("position_calculator_saves").insert({
      user_id: user.id,
      account_size: account,
      risk_pct: riskPct,
      entry,
      stop,
      target,
      symbol: chartSymbol || null,
      results: {
        side: result.side,
        shares: result.shares,
        positionNotional: result.positionNotional,
        riskAmount: result.riskAmount,
        stopDistancePct: result.stopDistancePct,
        rewardRisk: result.rewardRisk,
      },
    });
    setSaving(false);

    if (error) {
      toast.error("Kaydedilemedi", { description: error.message });
      return;
    }
    toast.success("Hesaplamanız hesabınıza kaydedildi.");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="container mx-auto px-3 py-3 flex-1 max-w-[1200px]">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Anasayfa
            </Link>
            <h1 className="text-lg font-bold flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              Pozisyon hesaplayıcı
            </h1>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4 max-w-2xl">
          Hesap büyüklüğü ve işlem başına risk yüzdesinden yola çıkarak lot büyüklüğü, nominal pozisyon,
          risk tutarı, stop mesafesi ve kar/zarar oranını (R) anında hesaplar.{" "}
          <span className="text-foreground/80">Bu araç yatırım tavsiyesi değildir.</span>
        </p>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Parametreler</CardTitle>
            <CardDescription>Değerleri Türkçe ondalık biçiminde girebilirsiniz (ör. 42,50).</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="pc-account">Hesap büyüklüğü (₺)</Label>
                <Input
                  id="pc-account"
                  inputMode="decimal"
                  value={accountStr}
                  onChange={(e) => setAccountStr(e.target.value)}
                  placeholder="100000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-risk">Risk (%)</Label>
                <Input
                  id="pc-risk"
                  inputMode="decimal"
                  value={riskStr}
                  onChange={(e) => setRiskStr(e.target.value)}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-entry">Giriş (₺)</Label>
                <Input
                  id="pc-entry"
                  inputMode="decimal"
                  value={entryStr}
                  onChange={(e) => setEntryStr(e.target.value)}
                  placeholder="42,50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pc-stop">Stop (₺)</Label>
                <Input
                  id="pc-stop"
                  inputMode="decimal"
                  value={stopStr}
                  onChange={(e) => setStopStr(e.target.value)}
                  placeholder="40"
                />
              </div>
              <div className="space-y-2 sm:col-span-2 lg:col-span-1">
                <Label htmlFor="pc-target">Hedef (₺)</Label>
                <Input
                  id="pc-target"
                  inputMode="decimal"
                  value={targetStr}
                  onChange={(e) => setTargetStr(e.target.value)}
                  placeholder="48"
                />
              </div>
            </div>

            {showRiskBanner && (
              <Alert
                className="mt-4 border-amber-500/50 bg-amber-500/10 text-amber-950 dark:text-amber-50 [&>svg]:text-amber-600 dark:[&>svg]:text-amber-400"
              >
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Risk uyarısı</AlertTitle>
                <AlertDescription>
                  {riskPctValue !== null && riskPctValue > 2 && (
                    <p>İşlem başına risk yüzdesi %2&apos;den yüksek — çoğu disiplinli kuralla uyumlu değil.</p>
                  )}
                  {result?.ok === true && result.rewardRisk < 1 && (
                    <p>Kar/zarar oranı (R) 1&apos;in altında — hedef, riske göre düşük.</p>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-4">
              <div className="flex flex-wrap items-center gap-2">
                <Checkbox
                  id="pc-chart"
                  checked={showChart}
                  onCheckedChange={(c) => setShowChart(c === true)}
                />
                <Label htmlFor="pc-chart" className="flex items-center gap-1.5 font-normal cursor-pointer">
                  <LineChart className="h-3.5 w-3.5 text-muted-foreground" />
                  TradingView grafiği göster (opsiyonel)
                </Label>
              </div>
              {showChart && (
                <div className="space-y-2">
                  <Label htmlFor="pc-symbol">BIST sembolü (ör. THYAO)</Label>
                  <Input
                    id="pc-symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="THYAO"
                    className="max-w-xs uppercase"
                  />
                  <p className="text-xs text-muted-foreground">
                    Gömülü grafikte çizgi çizmek için TradingView araç çubuğundan yatay çizgi ekleyip giriş, stop ve
                    hedef fiyatlarını işaretleyebilirsiniz.
                  </p>
                </div>
              )}
            </div>

            {hasBackend && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {isPro && user && (
                  <Button
                    type="button"
                    size="sm"
                    className="gap-1.5"
                    onClick={handleSave}
                    disabled={saving || result?.ok !== true}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Hesabıma kaydet
                  </Button>
                )}
                {tierLoading && hasBackend && (
                  <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Üyelik durumu…
                  </span>
                )}
                {!tierLoading && !isPro && (
                  <p className="text-xs text-muted-foreground">
                    Anlık kayıt <span className="text-foreground font-medium">Pro</span> üyelik ile hesabınıza
                    yazılır.{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      Giriş yap
                    </Link>
                  </p>
                )}
                {isPro && !user && (
                  <p className="text-xs text-muted-foreground">
                    Kaydetmek için{" "}
                    <Link to="/auth" className="text-primary hover:underline">
                      oturum açın
                    </Link>
                    .
                  </p>
                )}
              </div>
            )}
            {!hasBackend && (
              <p className="mt-4 text-xs text-muted-foreground">Supabase yapılandırılmadığı için kayıt devre dışı.</p>
            )}
          </CardContent>
        </Card>

        {result?.ok === false && (
          <Alert variant="destructive" className="mt-4">
            <AlertTitle>Hesaplanamadı</AlertTitle>
            <AlertDescription>{result.message}</AlertDescription>
          </Alert>
        )}

        <h2 className="text-sm font-semibold mt-6 mb-3 text-foreground">Sonuçlar</h2>
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5">
          <ResultMiniCard
            title="Hisse adedi"
            value={result?.ok === true ? trNum.format(result.shares) : "—"}
            hint={result?.ok === true ? (result.side === "long" ? "Uzun yön" : "Kısa yön") : undefined}
          />
          <ResultMiniCard
            title="Pozisyon büyüklüğü"
            value={result?.ok === true ? trCurrency.format(result.positionNotional) : "—"}
            hint="Giriş × adet"
          />
          <ResultMiniCard
            title="Risk tutarı (hedef)"
            value={result?.ok === true ? trCurrency.format(result.riskAmount) : "—"}
            hint="Hesap × risk %"
          />
          <ResultMiniCard
            title="Stop mesafesi"
            value={result?.ok === true ? `${trNum.format(result.stopDistancePct)} %` : "—"}
            hint="Girişe göre"
          />
          <ResultMiniCard
            title="Kar / zarar (R)"
            value={result?.ok === true ? `1 : ${trNum.format(result.rewardRisk)}` : "—"}
            hint="Hedef / birim risk"
          />
        </div>

        {showChart && chartSymbol.length >= 2 && (
          <div className="mt-6">
            <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <LineChart className="h-4 w-4" />
              Grafik — BIST:{chartSymbol}
            </h2>
            <TradingViewWidget symbol={chartSymbol} height={420} />
            {result?.ok === true && parsed.entry !== null && parsed.stop !== null && parsed.target !== null && (
              <Alert className="mt-3">
                <AlertTitle>Çizim için seviyeler</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5 text-foreground/90">
                    <li>Giriş: {trCurrency.format(parsed.entry)}</li>
                    <li>Stop: {trCurrency.format(parsed.stop)}</li>
                    <li>Hedef: {trCurrency.format(parsed.target)}</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

function ResultMiniCard({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card className={cn("shadow-none")}>
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0">
        <p className="text-lg font-semibold tabular-nums break-all">{value}</p>
        {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default PozisyonHesaplayici;
