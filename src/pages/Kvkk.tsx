import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";

const Kvkk = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </Link>

        <h1 className="text-2xl font-bold text-foreground mb-6">KVKK Aydınlatma Metni</h1>
        <p className="text-xs text-muted-foreground mb-2">6698 Sayılı Kişisel Verilerin Korunması Kanunu Kapsamında</p>
        <p className="text-xs text-muted-foreground mb-8">Son güncelleme: 14 Nisan 2026</p>

        <div className="prose prose-sm prose-invert max-w-none space-y-6 text-muted-foreground">
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">1. Veri Sorumlusu</h2>
            <p>BORSACEP (borsacep.com) olarak, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında veri sorumlusu sıfatıyla, kişisel verilerinizi aşağıda açıklanan çerçevede işlemekteyiz.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">2. İşlenen Kişisel Veriler</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-border rounded-lg">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-3 border-b border-border text-foreground">Veri Kategorisi</th>
                    <th className="text-left p-3 border-b border-border text-foreground">Veri Türleri</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-border/50">
                    <td className="p-3">Kimlik Bilgileri</td>
                    <td className="p-3">Ad, soyad</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3">İletişim Bilgileri</td>
                    <td className="p-3">E-posta adresi</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3">İşlem Güvenliği</td>
                    <td className="p-3">IP adresi, oturum bilgileri, şifreli parola</td>
                  </tr>
                  <tr className="border-b border-border/50">
                    <td className="p-3">Kullanım Verileri</td>
                    <td className="p-3">Tarayıcı türü, cihaz bilgisi, erişim zamanı</td>
                  </tr>
                  <tr>
                    <td className="p-3">AI Sohbet İçerikleri</td>
                    <td className="p-3">Eğitmen ve Koç ile yaptığınız sohbet metinleri (yatırımcı psikolojisi, teknik analiz soruları)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">3. Kişisel Verilerin İşlenme Amaçları</h2>
            <p>Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Üyelik hesabınızın oluşturulması ve yönetilmesi</li>
              <li>Kimlik doğrulama ve oturum yönetimi</li>
              <li>Hizmetlerimizin sunulması ve iyileştirilmesi</li>
              <li>Bilgi güvenliği süreçlerinin yürütülmesi</li>
              <li>Yasal yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">4. Kişisel Verilerin İşlenme Hukuki Sebepleri</h2>
            <p>Kişisel verileriniz KVKK'nın 5. maddesi kapsamında aşağıdaki hukuki sebeplere dayanılarak işlenmektedir:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Açık rızanız (hesap oluşturma)</li>
              <li>Bir sözleşmenin kurulması veya ifasıyla doğrudan ilgi olması (hizmet sunumu)</li>
              <li>Veri sorumlusunun meşru menfaatleri (güvenlik, hizmet iyileştirme)</li>
              <li>Hukuki yükümlülüklerin yerine getirilmesi</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">5. Kişisel Verilerin Aktarılması</h2>
            <p>Kişisel verileriniz, hizmet sunumu kapsamında aşağıdaki taraflara aktarılabilmektedir:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li><strong>Supabase Inc.</strong> — Kimlik doğrulama ve veritabanı hizmetleri (ABD merkezli, sunucular AWS altyapısında)</li>
              <li><strong>Google LLC</strong> — Google ile giriş yapmanız halinde (yalnızca sizin onayınızla)</li>
              <li><strong>Anthropic PBC</strong> — Eğitmen ve Koç AI sohbet özellikleri (Claude modeli). AI sohbeti açtığınızda yazdığınız mesajlar Anthropic sunucularına iletilir, eğitim amacıyla saklanmaz, yalnızca yanıt üretmek için işlenir. Hassas finansal kimlik bilgisi (TCKN, hesap numarası vb.) yazmamanızı öneririz.</li>
              <li><strong>Vercel Inc.</strong> — Web sitesi barındırma ve CDN hizmetleri (ABD merkezli)</li>
              <li><strong>Yahoo Finance</strong> — Anonim BIST fiyat verisi okuma (kişisel veri aktarılmaz)</li>
            </ul>
            <p>Yurt dışına veri aktarımı, KVKK'nın 9. maddesi kapsamında açık rızanıza dayanılarak gerçekleştirilmektedir. AI sohbet özelliklerini kullandığınızda bu veri aktarımına onay vermiş sayılırsınız.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">6. Veri Saklama Süresi</h2>
            <p>Kişisel verileriniz, üyeliğiniz devam ettiği sürece saklanır. Hesabınızı silmeniz halinde verileriniz makul süre içinde sistemlerimizden kaldırılır. Yasal zorunluluk bulunan hallerde ilgili mevzuatın öngördüğü süre boyunca saklanmaya devam edebilir.</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">7. KVKK Kapsamındaki Haklarınız</h2>
            <p>KVKK'nın 11. maddesi kapsamında aşağıdaki haklara sahipsiniz:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
              <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
              <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
              <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
              <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması halinde bunların düzeltilmesini isteme</li>
              <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
              <li>Düzeltme ve silme işlemlerinin, kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
              <li>İşlenen verilerinizin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
              <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız halinde zararın giderilmesini talep etme</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-foreground mb-3">8. Başvuru Yöntemi</h2>
            <p>Yukarıda belirtilen haklarınızı kullanmak için <a href="mailto:info@borsacep.com" className="text-primary hover:underline">info@borsacep.com</a> adresine kimliğinizi tespit edici bilgiler ile birlikte yazılı olarak başvurabilirsiniz.</p>
            <p>Başvurunuz en geç 30 (otuz) gün içinde ücretsiz olarak sonuçlandırılacaktır. İşlemin ayrıca bir maliyet gerektirmesi halinde, Kişisel Verileri Koruma Kurulu tarafından belirlenen tarifedeki ücret alınabilir.</p>
          </section>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Kvkk;
