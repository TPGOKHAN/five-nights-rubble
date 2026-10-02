# Senin Yapacakların / Your Next Steps

**Oyun canlıda:** https://tpgokhan.github.io/five-nights-rubble/
Repo (public): https://github.com/TPGOKHAN/five-nights-rubble

Yapılması zorunlu bir şey yok — oyun yayında ve çalışıyor. Aşağıdakiler senin
kararın olan konular.

## 1. Oyna ve hisset (10 dk)

Canlı linki aç, kulaklık tak, 1. geceyi oyna. Özellikle şunlara bak:
- Bonnie sola yaklaştığında gözlerini görebiliyor musun, fenerle geri püskürtmek
  "adil" hissettiriyor mu?
- 3. gecede Foxy koşarken kameradan bulup flaşlamak yetişilebilir mi?

Hızlı test için (sadece sende çalışır, normal oyuncularda kapalı):
`https://tpgokhan.github.io/five-nights-rubble/?debug&night=5&t=90`

## 2. Karar: daha fazla platform?

- **itch.io**: `npm run build` → `dist/` klasörünü zip'le, "HTML oyunu" olarak yükle.
  Ayarlarda "Fullscreen button" ve "Mobile friendly" işaretle. (Hesap senin.)
- **CrazyGames / Poki**: SDK entegrasyonu gerekir; istersen ben eklerim.
  ⚠️ Bu portallar genelde **fan oyunlarını** (başkasının markası) kabul etmez.

## 3. Yasal not (önemli)

Bu bir **FNaF hayran oyunu** (Freddy/Bonnie/Chica/Foxy isimleri, William Afton
göndermesi). Scott Cawthon hayran oyunlarına genel olarak izin veriyor, ama:
- **Ücretsiz** kalmalı — reklam, bağış duvarı, satış yok.
- "Unofficial fan game" ibaresi kalmalı (başlık ekranında var).
Ticari bir sürüm istersen karakterleri özgün tasarımlara çevirmemiz gerekir
(sadece model/isim değişikliği; mekanikler aynen kalır).

## 4. Bilgisayar disk alanı

Gece çalışırken diskin bir an tamamen dolduğunu gördüm (%99 dolu, ~11 GB boş).
Claude uygulamasının konuşma geçmişi 6.5 GB, tarayıcı önbellekleri ~3 GB yer
tutuyor. Ayarlar › Desktop app › Storage'dan önbelleği temizlemeni öneririm.

## Teknik durum

- `npm test` → 32 kontrol (metin tabloları, kayıt kuralları, depolama hataları).
- `FN.audit()` (debug) → her karakter her konumda bir kamerada görünür, saldırı
  noktalarında gözler oyuncudan görünür, iki karakter üst üste binmez.
- `FN.autoplay(n)` → bot 5 geceyi ve tüm-10 Özel Gece'yi kazanabiliyor
  (sonuçlar commit mesajlarında).
- Yayın: `npm run deploy` (önce testleri çalıştırır, kırmızıysa yayınlamaz).
