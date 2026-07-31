# Sabah Yapılacaklar / Your Next Steps

Oyun tamamlandı, doğrulandı ve commit'lendi. Senin yapman gerekenler kısa:

## 1. Oyunu dene (2 dk)

```bash
cd ~/Documents/ClaudeProjects/five-nights-rubble
npm run dev
```

→ http://localhost:8452 — tarayıcıda TR otomatik seçilir (tarayıcın Türkçe ise).
Kulaklıkla dene; kalp atışı ve yön ipuçları (sol/sağ) oynanışın parçası.

Hızlı test için: `http://localhost:8452/?night=5&t=90` (5. gece, 90 saniyelik).

## 2. Karar ver: yayınlamak istiyor musun?

Production build hazır ve test edildi (`npm run build` → `dist/`).
Seçenekler — hangisini istersen söyle, kurulumunu yaparım:

- **itch.io**: `dist/` klasörünü zip'leyip yüklemek yeterli (ücretsiz, en hızlı).
- **CrazyGames**: Exit Interview'da yaptığımız gibi SDK entegrasyonu gerekir
  (~yarım günlük iş; istersen ben eklerim).
- **Kendi domain'in / Vercel-Netlify**: statik dosya, tek komutla çıkar.

⚠️ Not: Bu bir FNaF hayran oyunu (Bonnie/Chica/Freddy/Foxy isimleri ve
William Afton göndermesi). Scott Cawthon'un hayran oyunu politikası gereği
**ücretsiz + "unofficial fan game" ibaresiyle** yayınlanmalı (oyun başlığı
ekranında bu ibare zaten var). Ticari kullanma.

## 3. İsteğe bağlı iyileştirmeler (söylemen yeterli)

- Jumpscare'lere kamera-önü özel animasyon varyantları (şu an ortak lunge +
  kol/çene animasyonu var)
- Gece 6 ("Nightmare" tek gece, hepsi 10) hikâye modu
- Ses için gerçek kayıt/AI ses (şu an %100 sentez — bilinçli tercih, sıfır asset)

## Teknik durum özeti

- 5 gece + Özel Gece, TR+EN, kayıt sistemi, 13 başarım, pause, ayarlar,
  mobil dokunmatik — hepsi çalışıyor.
- Otopilot botu 5 geceyi de optimal stratejiyle kazanabiliyor (denge doğrulandı);
  sonuçlar README'de ve aşağıdaki komutla tekrarlanabilir:
  `await FN.autoplay(5, {speed: 8})`
- Git: `five-nights-rubble/` kendi repo'su; `main` branch, temiz working tree.
