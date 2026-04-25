import { Link } from "react-router-dom";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { Footer } from "@/components/Footer";

const YasalUyari = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Anasayfaya dön
        </Link>

        <div className="rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-4 mb-6 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-500 shrink-0 mt-0.5" />
          <div className="text-sm">
            <strong className="text-yellow-700 dark:text-yellow-400">Önemli:</strong>{" "}
            Borsacep yatırım danışmanlığı veya aracılık hizmeti sunmaz. Site içeriği
            yalnızca <strong>eğitim ve bilgilendirme</strong> amaçlıdır. Yatırım kararlarınız
            tamamen size aittir.
          </div>
        </div>

        <h1 className="text-2xl font-bold text-foreground mb-2">Yasal Uyarı ve Sorumluluk Reddi</h1>
        <p className="text-xs text-muted-foreground mb-8">
          Son güncelleme: {new Date().toLocaleDateString("tr-TR", { year: "numeric", month: "long", day: "numeric" })}
        </p>

        <div className="space-y-6 text-sm text-muted-foreground leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Yatırım Tavsiyesi Kapsamı Dışındadır</h2>
            <p>
              Borsacep platformunda sunulan tüm bilgiler, sinyaller, AI yorumları, teknik
              analiz çıktıları, strateji önerileri, alarm bildirimleri ve sohbet asistanı
              cevapları <strong>SPK (Sermaye Piyasası Kurulu) tarafından düzenlenen yatırım
              danışmanlığı kapsamında değildir</strong>.
            </p>
            <p className="mt-2">
              6362 sayılı Sermaye Piyasası Kanunu uyarınca yatırım danışmanlığı; yalnızca
              SPK tarafından lisans almış aracı kurumlar ve yetkili kişiler tarafından
              <em> bireysel müşteri ile akdedilen yazılı sözleşme çerçevesinde</em> verilebilir.
              Borsacep böyle bir lisansa sahip değildir ve sahip olduğunu iddia etmez.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. AI Asistanları (Eğitmen ve Koç)</h2>
            <p>
              Site içerisindeki <strong>"Eğitmen"</strong> ve <strong>"Koç"</strong> adlı
              yapay zekâ asistanları:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Genel teknik analiz kavramları, yatırımcı psikolojisi ve risk yönetimi
                ilkeleri hakkında <strong>eğitim amacıyla</strong> bilgi verir.</li>
              <li>Hata yapabilir, yanlış veya eksik bilgi üretebilir. AI çıktıları
                <strong> doğrulanmadan kullanılmamalıdır</strong>.</li>
              <li>Belirli bir hisseyi "al" veya "sat" şeklinde kişisel tavsiye vermez.
                Vermesi durumunda dahi bu çıktı yatırım tavsiyesi sayılmaz.</li>
              <li>Geçmiş veriler üzerinden çalışır; gelecek fiyat hareketlerini garanti
                etmez ve etmeye çalışmaz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Sinyal ve Tarayıcı Çıktıları</h2>
            <p>
              Stratejilerin (EMA 5/22, Fibonacci, Golden Cross, Pullback vb.) ürettiği
              AL / SAT / NÖTR sinyalleri, geçmiş fiyat verisi üzerinde matematiksel
              kuralların uygulanmasıyla elde edilir.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Sinyaller geçmiş performansa dayanır; gelecek getirileri garanti etmez.</li>
              <li>"AL" sinyali = "satın al" tavsiyesi <strong>değildir</strong>; yalnızca
                seçtiğiniz strateji o anda matematiksel olarak alış koşullarını karşılıyor demektir.</li>
              <li>Komisyon, vergi (BSMV), kayma ve likidite riski sinyallerin
                gerçekleşen getirisini önemli ölçüde değiştirebilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Risk Bildirimi</h2>
            <p>
              Borsa yatırımları <strong>kayıp riski</strong> içerir. Yatırdığınız
              sermayenin tamamını veya bir kısmını kaybedebilirsiniz.
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Geçmiş performans, gelecek getiri için garanti değildir.</li>
              <li>Likidite, makro, kur, faiz, sektör ve şirket riski değişkenlik gösterir.</li>
              <li>Kaldıraçlı işlemler kayıp riskini katlar; bu platform kaldıraçlı işlem
                önermez ve önermez.</li>
              <li>Yatırım yapmadan önce kendi durumunuza göre lisanslı bir yatırım
                danışmanına ve/veya mali müşavire danışmanız önerilir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Veri Doğruluğu</h2>
            <p>
              Site, BIST hisse fiyatlarını üçüncü taraf veri sağlayıcılardan (Yahoo Finance)
              alır. Veriler genellikle <strong>15-20 dakika gecikmelidir</strong>, anlık değildir.
              Veri kesintisi, hatalı veri veya gecikme yaşanabilir. Bu nedenle:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Gerçek alım-satım kararlarınız öncesi <strong>brokerinizin canlı verisi</strong>
                ile teyit yapmanız zorunludur.</li>
              <li>Yanlış veriden doğan kayıplardan Borsacep sorumlu tutulamaz.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Üçüncü Taraf Bağlantılar</h2>
            <p>
              Sitede paylaşılan tweetler, makaleler, harici link veya gömülü içerikler
              ilgili yazarın görüşlerini yansıtır. Borsacep bu içeriklerin doğruluğunu,
              güncelliğini veya yatırım açısından uygunluğunu doğrulamaz, garantilemez ve
              <strong> sorumluluğunu üstlenmez</strong>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Scam / VIP Sinyal Filtresi</h2>
            <p>
              "Scam ve Guru Kontrolü" özelliği yalnızca <strong>genel risk eğitimi</strong> sunar.
              Bir kişi, grup veya teklif hakkında verilen "düşük / orta / yüksek risk" değerlendirmesi:
            </p>
            <ul className="list-disc pl-6 space-y-1 mt-2">
              <li>Hukuki bir suçlama veya tespit niteliği taşımaz.</li>
              <li>Belirli bir kişi veya kuruma yönelik kesin yargı bildirmez.</li>
              <li>Kullanıcının kendi sorumluluğunda değerlendirme yapması içindir.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Sorumluluk Sınırlaması</h2>
            <p>
              Borsacep ve geliştiricileri, sitenin kullanımı sonucu doğrudan veya dolaylı
              olarak ortaya çıkabilecek <strong>maddi veya manevi hiçbir kayıp, zarar veya
              fırsat maliyeti için sorumlu tutulamaz</strong>. Bu, sınırlama olmaksızın şunları
              içerir: yatırım kayıpları, fırsat kayıpları, veri kaybı, sistem kesintileri.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Mevzuat ve Yetkili Mahkeme</h2>
            <p>
              Bu site Türkiye Cumhuriyeti yasalarına tabidir. Borsacep ile kullanıcı arasında
              doğabilecek uyuşmazlıklarda <strong>İstanbul (Çağlayan) Mahkemeleri ve İcra
              Daireleri</strong> yetkilidir.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. İletişim</h2>
            <p>
              Bu yasal uyarıyla ilgili sorularınız için:{" "}
              <a href="mailto:info@borsacep.com" className="text-primary hover:underline">
                info@borsacep.com
              </a>
            </p>
          </section>

          <div className="rounded-md border border-border bg-muted/30 p-4 mt-6 text-xs">
            <strong className="text-foreground">Onay:</strong> Borsacep'i kullanmaya devam
            ederek yukarıdaki tüm maddeleri okuduğunuzu, anladığınızı ve kabul ettiğinizi
            beyan etmiş olursunuz.
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default YasalUyari;
