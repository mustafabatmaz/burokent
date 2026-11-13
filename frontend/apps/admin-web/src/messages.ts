/** All user-facing texts of the admin panel (Turkish only). */
export const messages = {
  appName: "BüroKent Panel",
  loading: "Yükleniyor…",
  login: {
    title: "Panele giriş",
    username: "Kullanıcı adı",
    password: "Şifre",
    submit: "Giriş yap",
    submitting: "Giriş yapılıyor…",
    errors: {
      invalidCredentials: "Kullanıcı adı veya şifre hatalı.",
      tooManyAttempts: (minutes: number) => `Çok fazla başarısız deneme. ${minutes} dakika sonra tekrar deneyin.`,
      unexpected: "Giriş yapılamadı. Bağlantınızı kontrol edip tekrar deneyin.",
    },
  },
  dashboard: {
    title: "Gösterge Paneli",
    welcome: (name: string) => `Hoş geldiniz, ${name}`,
    empty: "Modüller eklendikçe günlük özetler burada görünecek.",
  },
  layout: {
    navigation: "Ana menü",
    tabs: "Alt menü",
    dashboardTab: "Panel",
    menu: "Menü",
    closeMenu: "Menüyü kapat",
    collapse: "Menüyü daralt",
    expand: "Menüyü genişlet",
    userMenu: (name: string) => `Kullanıcı menüsü: ${name}`,
    logout: "Çıkış yap",
    theme: "Tema",
    themes: { light: "Açık", dark: "Koyu", system: "Cihaza göre" },
  },
  notFound: {
    title: "Sayfa bulunamadı",
    description: "Aradığınız sayfa taşınmış ya da hiç olmamış olabilir.",
    back: "Gösterge paneline dön",
  },
  forbidden: {
    title: "Bu sayfayı görme yetkiniz yok",
    description: "Gerekirse yetki için Süper Admin'e başvurun.",
  },
} as const;
