import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

const Gizlilik = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">Gizlilik Politikası</h1>
        <p className="text-xs text-muted-foreground mb-8">Son güncelleme: 14 Nisan 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Genel Bilgi</h2>
            <p>BORSACEP ("biz", "bizim" veya "Site"), borsacep.com adresi üzerinden hizmet veren bir BIST100 teknik analiz tarama platformudur. Kullanıcılarımızın gizliliğine saygı duyuyor ve kişisel verilerinizi korumayı taahhüt ediyoruz.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. Toplanan Veriler</h2>
            <p>Sitemizi kullanırken aşağıdaki veriler toplanabilir:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Hesap Bilgileri:</strong> Kayıt sırasında sağladığınız e-posta adresi ve ad-soyad bilgisi.</li>
              <li><strong>Google Hesap Bilgileri:</strong> Google ile giriş yapmanız halinde Google tarafından paylaşılan temel profil bilgileri (ad, e-posta, profil fotoğrafı).</li>
              <li><strong>Kullanım Verileri:</strong> Tercih edilen stratejiler ve favori hisseler gibi site içi tercihler (yalnızca tarayıcınızda saklanır).</li>
              <li><strong>Teknik Veriler:</strong> IP adresi, tarayıcı türü, cihaz bilgisi ve erişim zamanı.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Verilerin Kullanım Amacı</h2>
            <p>Toplanan veriler aşağıdaki amaçlarla kullanılır:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Hesabınızı oluşturmak ve yönetmek</li>
              <li>Hizmetlerimizi sunmak ve iyileştirmek</li>
              <li>Site güvenliğini sağlamak</li>
              <li>Yasal yükümlülüklerimizi yerine getirmek</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Verilerin Saklanması</h2>
            <p>Hesap verileriniz Supabase altyapısında güvenli şekilde saklanır. Strateji tercihleri ve favori hisseler yalnızca tarayıcınızın yerel depolama alanında (localStorage) tutulur ve sunucularımıza gönderilmez.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Üçüncü Taraf Hizmetler</h2>
            <p>Sitemiz aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase:</strong> Kimlik doğrulama ve veritabanı hizmetleri</li>
              <li><strong>Google OAuth:</strong> Google ile giriş yapma özelliği</li>
              <li><strong>Yahoo Finance:</strong> Hisse senedi fiyat verileri</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Çerezler</h2>
            <p>Sitemiz oturum yönetimi için gerekli çerezleri kullanır. Bu çerezler hizmetin çalışması için zorunludur.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. Haklarınız</h2>
            <p>KVKK kapsamında kişisel verilerinizle ilgili haklarınız için KVKK Aydınlatma Metni sayfamızı inceleyebilirsiniz. Hesabınızı istediğiniz zaman silebilir ve verilerinizin kaldırılmasını talep edebilirsiniz.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. İletişim</h2>
            <p>Gizlilik politikamız hakkında sorularınız için <a href="mailto:info@borsacep.com" className="text-primary hover:underline">info@borsacep.com</a> adresinden bize ulaşabilirsiniz.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Gizlilik;
