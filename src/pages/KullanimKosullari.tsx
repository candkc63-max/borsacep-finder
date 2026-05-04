import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

const KullanimKosullari = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">Kullanım Koşulları</h1>
        <p className="text-xs text-muted-foreground mb-8">Son güncelleme: 14 Nisan 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Hizmet Tanımı</h2>
            <p>BORSA101 (borsa101.com), BIST100 hisselerini teknik indikatörlerle tarayan ve AL/SAT/NÖTR sinyalleri üreten bir web uygulamasıdır. Platform yalnızca bilgilendirme amacıyla hizmet vermektedir.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Yatırım Tavsiyesi Değildir</h2>
            <p>Bu sitede sunulan tüm bilgiler, analizler ve sinyaller yalnızca bilgilendirme amaçlıdır. <strong>BORSA101 yatırım tavsiyesi vermez.</strong> Sitede yer alan hiçbir içerik, herhangi bir finansal aracın alım-satım önerisi olarak değerlendirilmemelidir.</p>
            <p>Yatırım kararlarınız tamamen size aittir. Yatırım yapmadan önce lisanslı bir yatırım danışmanına başvurmanızı öneririz. BORSA101, kullanıcıların yatırım kararlarından doğabilecek zararlardan sorumlu tutulamaz.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Kullanım Şartları</h2>
            <p>Siteyi kullanarak aşağıdaki şartları kabul etmiş sayılırsınız:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Siteyi yalnızca kişisel ve ticari olmayan amaçlarla kullanacağınızı</li>
              <li>Hesap bilgilerinizin güvenliğinden sorumlu olduğunuzu</li>
              <li>Siteye zarar verecek herhangi bir girişimde bulunmayacağınızı</li>
              <li>Sunulan verilerin gecikmeli veya hatalı olabileceğini kabul ettiğinizi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Veri Doğruluğu</h2>
            <p>Hisse senedi fiyat verileri üçüncü taraf kaynaklardan (Yahoo Finance) alınmaktadır. Bu verilerin doğruluğunu, tamlığını veya güncelliğini garanti etmiyoruz. Veriler gecikmeli olabilir veya teknik nedenlerle hatalı gösterilebilir.</p>
            <p>Canlı veri alınamadığı durumlarda simülasyon verileri gösterilebilir. Bu durum site üzerinde açıkça belirtilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Teknik Analiz Sinyalleri</h2>
            <p>Sitede sunulan AL/SAT/NÖTR sinyalleri, matematiksel formüllere (EMA, SMA) dayanan otomatik hesaplamalardır. Bu sinyaller:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Geçmiş fiyat hareketlerine dayanır, gelecek performansı garanti etmez</li>
              <li>Piyasa koşullarına göre hatalı olabilir</li>
              <li>Tek başına yatırım kararı vermek için yeterli değildir</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Sorumluluk Sınırlaması</h2>
            <p>BORSA101, siteyi kullanmanız sonucunda doğrudan veya dolaylı olarak oluşabilecek herhangi bir zarardan sorumlu değildir. Bu sınırlama, finansal kayıplar, veri kaybı ve hizmet kesintileri dahil ancak bunlarla sınırlı olmamak üzere tüm zarar türlerini kapsar.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Fikri Mülkiyet</h2>
            <p>Site içeriği, tasarım, logo ve yazılım BORSA101'e aittir. İzinsiz kopyalama, dağıtma veya değiştirme yasaktır.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Değişiklikler</h2>
            <p>Bu kullanım koşullarını önceden haber vermeksizin değiştirme hakkımızı saklı tutarız. Güncel koşullar her zaman bu sayfada yayınlanacaktır.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">9. Uygulanacak Hukuk</h2>
            <p>Bu kullanım koşulları Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">10. İletişim</h2>
            <p>Kullanım koşulları hakkında sorularınız için <a href="mailto:info@borsa101.com" className="text-primary hover:underline">info@borsa101.com</a> adresinden bize ulaşabilirsiniz.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default KullanimKosullari;
