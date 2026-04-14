import { Activity } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-border bg-card/50 mt-12">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
                <Activity className="w-4 h-4 text-primary-foreground" />
              </div>
              <span className="font-bold text-foreground tracking-tight">BORSACEP</span>
              <span className="text-xs text-muted-foreground font-mono">.COM</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              BIST100 hisselerini teknik indikatörlerle tarayın. EMA, RSI, MACD ve Bollinger bantları ile AL/SAT sinyalleri alın.
            </p>
          </div>

          {/* Yasal */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Yasal</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="#gizlilik" className="hover:text-foreground transition-colors">Gizlilik Politikası</a>
              </li>
              <li>
                <a href="#kullanim-kosullari" className="hover:text-foreground transition-colors">Kullanım Koşulları</a>
              </li>
              <li>
                <a href="#kvkk" className="hover:text-foreground transition-colors">KVKK Aydınlatma Metni</a>
              </li>
            </ul>
          </div>

          {/* İletişim */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">İletişim</h3>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li>
                <a href="mailto:info@borsacep.com" className="hover:text-foreground transition-colors">info@borsacep.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-border mt-8 pt-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground font-mono">
            © {new Date().getFullYear()} BORSACEP. Tüm hakları saklıdır.
          </p>
          <p className="text-xs text-muted-foreground">
            ⚠ Bu site yatırım tavsiyesi vermez. Yatırım kararlarınız tamamen size aittir.
          </p>
        </div>
      </div>
    </footer>
  );
}