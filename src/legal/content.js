// Terms of Use and KVKK Privacy Notice in Turkish, English and Arabic.
// {controller} and {contact} are filled in from src/lib/legal.js.
// This is a starting draft: the café should have it checked by a lawyer before launch.

export const LEGAL_CONTENT = {
  tr: {
    updated: 'Son güncelleme: 13 Ekim 2026',
    terms: {
      title: 'Kullanım Koşulları',
      sections: [
        { h: '1. Hizmet', p: ['Bu uygulama, Istanbul Gelişim Üniversitesi kafesinden önceden sipariş verip tezgâhtan teslim almanızı sağlar. Hizmeti {controller} sunar.'] },
        { h: '2. Hesap', p: ['Sipariş vermek için üniversite e-posta adresinizle giriş yaparsınız. Hesabınızı başkasıyla paylaşmayın; hesabınızla verilen siparişlerden siz sorumlusunuz.'] },
        { h: '3. Sipariş ve ödeme', p: [
          'Ödeme, siparişi teslim alırken tezgâhta yapılır. Fiyatlar sistem tarafından hesaplanır ve uygulamada gösterilen tutar geçerlidir.',
          'Aynı anda en fazla 2 aktif siparişiniz olabilir. Ürün tükenirse veya kafe kapanırsa kafe siparişi iptal edebilir.',
        ] },
        { h: '4. Teslim alma', p: ['Siparişinizi seçtiğiniz saatte alın. Uzun süre alınmayan siparişler iptal edilebilir.'] },
        { h: '5. Adil kullanım', p: ['Sahte sipariş vermek, sistemi kötüye kullanmak veya bozmaya çalışmak yasaktır. Bu durumda kafe hesabınızın sipariş vermesini engelleyebilir.'] },
        { h: '6. Alerjenler', p: ['Alerjen bilgileri kafe tarafından girilir. Ciddi bir alerjiniz varsa sipariş vermeden önce lütfen personele sorun.'] },
        { h: '7. Hizmetin sürekliliği', p: ['Kafe yoğun saatlerde online siparişleri durdurabilir. Uygulamanın her zaman kesintisiz çalışacağı garanti edilmez.'] },
        { h: '8. Değişiklikler', p: ['Bu koşullar değişebilir. Değiştiğinde, bir sonraki siparişinizden önce yeniden onay istenir.'] },
        { h: '9. İletişim', p: ['Sorularınız için: {contact}.'] },
      ],
    },
    privacy: {
      title: 'KVKK Aydınlatma Metni',
      sections: [
        { h: 'Veri sorumlusu', p: ['6698 sayılı Kişisel Verilerin Korunması Kanunu (KVKK) kapsamında veri sorumlusu {controller}’dir.'] },
        { h: 'Hangi verileri işliyoruz?', p: [
          '• Kimlik ve iletişim: üniversite e-posta adresiniz.',
          '• Sipariş bilgileri: ürünler, seçenekler, notunuz, teslim saati, ödeme durumu ve sipariş zamanları.',
          '• Onay kaydı: Kullanım Koşulları’nı kabul ettiğiniz tarih.',
          '• Hata bildirimleri: yazdığınız mesaj, uygulamadaki sayfa, dil ve tarayıcı/cihaz bilgisi.',
          '• Personel için: ad, şifrelenmiş PIN ve yapılan işlemlerin kaydı (kim, ne zaman, hangi vardiya).',
          'Kart bilgisi toplamıyoruz; ödeme tezgâhta yapılır.',
        ] },
        { h: 'Neden işliyoruz?', p: [
          'Siparişinizi almak, hazırlamak ve durumunu size göstermek; kötüye kullanımı önlemek (ör. sipariş limitleri); kafenin satışlarını raporlamak ve uygulamadaki hataları düzeltmek için.',
        ] },
        { h: 'Hukuki sebep', p: [
          'Verileriniz KVKK md. 5/2-c (sözleşmenin kurulması ve ifası), md. 5/2-ç (hukuki yükümlülük) ve md. 5/2-f (meşru menfaat) kapsamında işlenir.',
        ] },
        { h: 'Kimlere aktarılır?', p: [
          'Veriler, hizmeti çalıştırmak için kullanılan altyapı sağlayıcılarında saklanır: Supabase (veritabanı ve giriş, sunucular Almanya/Frankfurt’ta), Vercel (web sitesi barındırma) ve Google (giriş kodu e-postalarının gönderimi). Bu sağlayıcıların sunucuları yurt dışında olabilir; aktarım KVKK md. 9’a uygun şekilde yapılır.',
          'Verileriniz satılmaz ve reklam amacıyla kullanılmaz.',
        ] },
        { h: 'Ne kadar süre saklanır?', p: ['Veriler, yukarıdaki amaçlar için gerekli olduğu sürece veya kanunların öngördüğü süre boyunca saklanır; sonra silinir ya da anonim hâle getirilir.'] },
        { h: 'Haklarınız (KVKK md. 11)', p: [
          'Verilerinizin işlenip işlenmediğini öğrenme, bilgi talep etme, amacını öğrenme, aktarıldığı kişileri bilme, düzeltilmesini veya silinmesini isteme, itiraz etme ve zarara uğramanız hâlinde tazminat talep etme hakkına sahipsiniz.',
          'Başvuru için: {contact}.',
        ] },
        { h: 'Tarayıcıda saklananlar', p: ['Dil ve tema tercihiniz ile oturum bilgileriniz tarayıcınızda saklanır. Reklam veya takip çerezi kullanmıyoruz.'] },
      ],
    },
  },

  en: {
    updated: 'Last updated: 13 October 2026',
    terms: {
      title: 'Terms of Use',
      sections: [
        { h: '1. The service', p: ['This app lets you order ahead from the Istanbul Gelişim University café and pick up at the counter. It is run by {controller}.'] },
        { h: '2. Your account', p: ['You sign in with your university email to order. Don’t share your account; you are responsible for orders placed with it.'] },
        { h: '3. Orders and payment', p: [
          'You pay at the counter when you pick up. Prices are calculated by the system, and the amount shown in the app applies.',
          'You can have at most 2 active orders at a time. The café may cancel an order if an item runs out or the café closes.',
        ] },
        { h: '4. Pickup', p: ['Pick up your order at the time you chose. Orders that are not collected for a long time may be cancelled.'] },
        { h: '5. Fair use', p: ['Fake orders, misuse, or attempts to break the system are not allowed. If this happens, the café may stop your account from ordering.'] },
        { h: '6. Allergens', p: ['Allergen information is entered by the café. If you have a serious allergy, please ask the staff before ordering.'] },
        { h: '7. Availability', p: ['The café may pause online orders at busy times. We can’t promise the app will always work without interruption.'] },
        { h: '8. Changes', p: ['These terms may change. When they do, you’ll be asked to accept them again before your next order.'] },
        { h: '9. Contact', p: ['Questions: {contact}.'] },
      ],
    },
    privacy: {
      title: 'KVKK Privacy Notice',
      sections: [
        { h: 'Data controller', p: ['Under Turkey’s Personal Data Protection Law No. 6698 (KVKK), the data controller is {controller}.'] },
        { h: 'What we process', p: [
          '• Identity and contact: your university email address.',
          '• Order details: items, options, your note, pickup time, payment status, and order times.',
          '• Acceptance record: when you accepted the Terms of Use.',
          '• Bug reports: your message, the page in the app, language, and browser/device info.',
          '• For staff: name, encrypted PIN, and a log of actions (who, when, which shift).',
          'We don’t collect card details; you pay at the counter.',
        ] },
        { h: 'Why', p: ['To take and prepare your order and show you its status, to prevent misuse (for example order limits), to report the café’s sales, and to fix problems in the app.'] },
        { h: 'Legal basis', p: ['Your data is processed under KVKK Article 5/2-c (making and performing a contract), 5/2-ç (legal obligation), and 5/2-f (legitimate interest).'] },
        { h: 'Who it’s shared with', p: [
          'Data is stored with the infrastructure providers that run the service: Supabase (database and sign-in, servers in Frankfurt, Germany), Vercel (website hosting), and Google (sending sign-in code emails). Their servers may be outside Turkey; transfers follow KVKK Article 9.',
          'Your data is never sold or used for advertising.',
        ] },
        { h: 'How long we keep it', p: ['As long as needed for the purposes above or as long as the law requires, then it is deleted or anonymized.'] },
        { h: 'Your rights (KVKK Article 11)', p: [
          'You can ask whether your data is processed, request information about it and its purpose, learn who it was shared with, ask for it to be corrected or deleted, object, and claim compensation if you are harmed.',
          'To make a request: {contact}.',
        ] },
        { h: 'Stored in your browser', p: ['Your language and theme choice and your sign-in session are saved in your browser. We don’t use advertising or tracking cookies.'] },
      ],
    },
  },

  ar: {
    updated: 'آخر تحديث: 13 أكتوبر 2026',
    terms: {
      title: 'شروط الاستخدام',
      sections: [
        { h: '1. الخدمة', p: ['يتيح لك هذا التطبيق الطلب مسبقًا من مقهى جامعة إسطنبول غيليشيم والاستلام من الكاونتر. يدير الخدمة {controller}.'] },
        { h: '2. حسابك', p: ['تسجّل الدخول ببريدك الجامعي للطلب. لا تشارك حسابك مع أحد؛ فأنت مسؤول عن الطلبات التي تتم من خلاله.'] },
        { h: '3. الطلبات والدفع', p: [
          'يتم الدفع عند الكاونتر وقت الاستلام. يحسب النظام الأسعار، ويُعتمد المبلغ الظاهر في التطبيق.',
          'يمكن أن يكون لديك طلبان نشطان كحد أقصى في الوقت نفسه. قد يلغي المقهى الطلب إذا نفد منتج أو أُغلق المقهى.',
        ] },
        { h: '4. الاستلام', p: ['استلم طلبك في الوقت الذي اخترته. قد تُلغى الطلبات التي لا تُستلم لفترة طويلة.'] },
        { h: '5. الاستخدام العادل', p: ['يُمنع تقديم طلبات وهمية أو إساءة استخدام النظام أو محاولة تعطيله. وفي هذه الحالة قد يمنع المقهى حسابك من الطلب.'] },
        { h: '6. مسببات الحساسية', p: ['يُدخل المقهى معلومات مسببات الحساسية. إذا كانت لديك حساسية شديدة فاسأل الموظفين قبل الطلب.'] },
        { h: '7. توفر الخدمة', p: ['قد يوقف المقهى الطلبات عبر الإنترنت في أوقات الازدحام. لا نضمن أن يعمل التطبيق دائمًا دون انقطاع.'] },
        { h: '8. التغييرات', p: ['قد تتغير هذه الشروط. وعند تغييرها سيُطلب منك قبولها مرة أخرى قبل طلبك التالي.'] },
        { h: '9. التواصل', p: ['للاستفسارات: {contact}.'] },
      ],
    },
    privacy: {
      title: 'إشعار الخصوصية (KVKK)',
      sections: [
        { h: 'المسؤول عن البيانات', p: ['وفق قانون حماية البيانات الشخصية التركي رقم 6698 (KVKK)، المسؤول عن البيانات هو {controller}.'] },
        { h: 'البيانات التي نعالجها', p: [
          '• الهوية والتواصل: بريدك الجامعي.',
          '• تفاصيل الطلب: المنتجات والخيارات وملاحظتك ووقت الاستلام وحالة الدفع وأوقات الطلب.',
          '• سجل الموافقة: تاريخ قبولك لشروط الاستخدام.',
          '• بلاغات الأخطاء: رسالتك والصفحة في التطبيق واللغة ومعلومات المتصفح/الجهاز.',
          '• للموظفين: الاسم ورمز PIN مشفّر وسجل الإجراءات (من، ومتى، وأي وردية).',
          'لا نجمع بيانات البطاقات؛ يتم الدفع عند الكاونتر.',
        ] },
        { h: 'لماذا', p: ['لاستلام طلبك وتحضيره وعرض حالته لك، ولمنع إساءة الاستخدام (مثل حدود الطلبات)، ولإعداد تقارير مبيعات المقهى، ولإصلاح مشكلات التطبيق.'] },
        { h: 'الأساس القانوني', p: ['تُعالج بياناتك بموجب المادة 5/2-c من KVKK (إبرام العقد وتنفيذه)، و5/2-ç (الالتزام القانوني)، و5/2-f (المصلحة المشروعة).'] },
        { h: 'مع من تُشارك', p: [
          'تُحفظ البيانات لدى مزوّدي البنية التحتية الذين يشغّلون الخدمة: Supabase (قاعدة البيانات وتسجيل الدخول، الخوادم في فرانكفورت بألمانيا)، وVercel (استضافة الموقع)، وGoogle (إرسال رسائل رمز الدخول). قد تكون خوادمهم خارج تركيا، ويتم النقل وفق المادة 9 من KVKK.',
          'لا تُباع بياناتك ولا تُستخدم للإعلانات.',
        ] },
        { h: 'مدة الحفظ', p: ['طالما كانت ضرورية للأغراض المذكورة أو للمدة التي يفرضها القانون، ثم تُحذف أو تُجعل مجهولة الهوية.'] },
        { h: 'حقوقك (المادة 11 من KVKK)', p: [
          'يحق لك معرفة ما إذا كانت بياناتك تُعالج، وطلب معلومات عنها وعن غرضها، ومعرفة من شوركت معه، وطلب تصحيحها أو حذفها، والاعتراض، والمطالبة بالتعويض إذا تضررت.',
          'لتقديم طلب: {contact}.',
        ] },
        { h: 'ما يُحفظ في متصفحك', p: ['يُحفظ اختيارك للغة والمظهر وجلسة تسجيل الدخول في متصفحك. لا نستخدم ملفات تعريف ارتباط إعلانية أو للتتبع.'] },
      ],
    },
  },
}
