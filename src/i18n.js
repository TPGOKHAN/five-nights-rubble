// Bilingual string table (EN + TR). Every user-facing string lives here.
// Camera names stay in English on purpose — they are diegetic CCTV labels.

export let lang = 'en';

export function setLang(l) {
  lang = l === 'tr' ? 'tr' : 'en';
  document.documentElement.lang = lang;
  document.title = t('doc_title');
}

export function t(key, ...args) {
  const table = STR[lang] || STR.en;
  let v = table[key] !== undefined ? table[key] : STR.en[key];
  if (v === undefined) return key;
  return typeof v === 'function' ? v(...args) : v;
}

const STR = {
  // ---------------------------------------------------------------- ENGLISH
  en: {
    title: 'FIVE NIGHTS<br>IN THE RUBBLE',
    tagline: 'an unofficial FNaF-inspired fan game',
    story1: 'The ceiling came down during the evening show. You woke up pinned under debris, tasting plaster and blood. Your phone got one call out.',
    story2: '&ldquo;Half the county is buried, sir. We will reach you in <b>five days</b>. Stay where you are. Stay quiet.&rdquo;',
    story3: 'Somewhere in the dark, the animatronics are still on stage.<br>And at night… they walk.',
    titleTip: 'Survive 5 nights. Each night lasts 5 minutes (12 AM – 6 AM).<br>Headphones strongly recommended.',

    btnContinue: (n) => 'CONTINUE — NIGHT ' + n,
    btnNew: 'NEW GAME',
    btnCustom: 'CUSTOM NIGHT',
    btnCustomLocked: 'CUSTOM NIGHT 🔒',
    btnAchievements: 'ACHIEVEMENTS',
    btnSettings: 'SETTINGS',
    btnStartNight: (n) => 'START NIGHT ' + n,
    btnRetry: (n) => 'TRY NIGHT ' + n + ' AGAIN',
    btnNight: (n) => 'NIGHT ' + n,
    btnBack: 'BACK',
    newGameConfirm: 'Starting a new game erases your current progress (unlocked night ' +
      '%N). Continue?',

    brief1: `<h2>NIGHT 1 &mdash; THE RABBIT</h2>
      <p>Your phone is at 4%. The dispatcher's voice was flat: <em>&ldquo;Everyone's buried tonight, sir.
      Hold on. Five days, maybe less.&rdquo;</em></p>
      <p>Something big just moved backstage. The rabbit. Its servos still work &mdash; and it's looking for warm things in the rubble.</p>
      <p class="tip">&#9656; When you hear it close, <b>SHINE YOUR LIGHT INTO ITS EYES</b> and hold it there until it recoils.<br>
      &#9656; SPACE or LEFT CLICK toggles the flashlight. Move the mouse to look around.</p>`,
    brief2: `<h2>NIGHT 2 &mdash; THE CHICK</h2>
      <p>Digging through the debris you found a torn bag of kitchen stock &mdash; <b>10 pieces</b> of rotten, reeking food. That's all there is. It has to last.</p>
      <p>The chick is awake now, and it is <em>hungry</em>.</p>
      <p class="tip">&#9656; When she comes close, <b>KILL YOUR LIGHT</b>, then press <b>F</b> to toss food. Feed her without her noticing you &mdash; if your beam is on her, she snaps.<br>
      &#9656; The faster you feed her, the longer she stays away. Food is all you have.<br>
      &#9656; The rabbit still hates light in its eyes. Juggle both.</p>`,
    brief3: `<h2>NIGHT 3 &mdash; THE FOX</h2>
      <p>You pried a cracked <b>security monitor</b> out of the wreck. The camera grid still answers.</p>
      <p>The fox doesn't creep like the others. It waits behind its curtain, and then it <em>runs</em>.</p>
      <p class="tip">&#9656; <b>TAB / C / right-click</b> opens the cameras. Keys 1&ndash;8 switch feeds.<br>
      &#9656; Watch Pirate Cove. Find the fox on camera and hit <b>FLASH</b> (or F, in the monitor) to burn its eyes &mdash; stuns it for 30 seconds.<br>
      &#9656; If you hear sprinting, it's already too late to be slow.</p>`,
    brief4: `<h2>NIGHT 4 &mdash; THE BEAR</h2>
      <p>The big one is moving now. Light doesn't stop him. Food doesn't interest him. Nothing stops him.</p>
      <p>But his ears still work.</p>
      <p class="tip">&#9656; Find the bear on the cameras and press <b>AUDIO</b> (or Q) on <em>his</em> camera to lure him backwards.<br>
      &#9656; It only buys time. Keep buying it until 6 AM.<br>
      &#9656; While digging you found <b>3 more pieces of food</b> wedged under a counter.</p>`,
    brief5: `<h2>NIGHT 5 &mdash; THE SKELETON</h2>
      <p>Last night. They are all faster, all angrier. And something else woke up in Parts &amp; Service &mdash; a bare <b>endoskeleton</b>. No suit. No eyes that need light. <em>It sees in the dark.</em></p>
      <p class="tip">&#9656; Find ENDO-01 on the cameras and press <b>PROGRAM</b> (or P) to order it back to Parts &amp; Service.<br>
      &#9656; You've wired a <b>CONTROLLED SHOCK [X]</b>: stuns every animatronic for 60 seconds. The battery holds <b>two charges</b> — spend them well.<br>
      &#9656; Survive until dawn. They're coming at first light.</p>`,

    dirLeft: 'to your LEFT',
    dirRight: 'to your RIGHT',
    dirFront: 'RIGHT IN FRONT of you',

    sub_nightStart: '12 AM. The building settles. Something on the stage just turned its head.',
    sub_bonnieNear: (dir) => 'Heavy servos whir ' + dir + '. Shine your light into its eyes!',
    sub_bonnieRepel: 'The rabbit recoils, screeching, and drags itself back into the dark.',
    sub_chicaNear: (dir) => 'Wet clicking ' + dir + '. She is hungry. Kill your light and press F to toss food.',
    sub_chicaNoticed: 'She saw the light. She is coming FASTER. Turn it off and feed her!',
    sub_chicaFed: 'You lob the rotten food into the dark. Wet crunching… then dragging footsteps, leaving.',
    sub_chicaEmpty: 'You claw at the empty bag. Nothing left.',
    sub_chicaLightOn: "Your light is ON — she'll see the throw. Kill it first.",
    sub_freddyNear: (dir) => 'A deep chuckle ' + dir + '. The bear. Lure him with AUDIO — fast.',
    sub_freddyLure: 'The bear turns toward the sound and lumbers away. It only buys time.',
    sub_freddyWrong: 'A tinny jingle plays from a far speaker. The bear ignores it — wrong camera.',
    sub_foxyStir: 'Behind its curtain, the fox stirs again.',
    sub_foxyRun: 'SPRINTING FOOTSTEPS — the fox is coming! Flash it on the cameras!',
    sub_foxyFlash: 'The flash burns its eyes — the fox seizes up. (30s)',
    sub_flashMiss: 'The camera flash pops. Nothing was there to blind.',
    sub_endoNear: (dir) => 'Bare metal feet on tile, ' + dir + '. ENDO-01 has found the debris. PROGRAM it or SHOCK it!',
    sub_endoProg: '> ENDO-01 :: OVERRIDE ACCEPTED :: RETURNING TO PARTS/SERVICE',
    sub_progFail: '> UPLINK FAILED :: TARGET NOT ON THIS FEED',
    sub_shock: 'CONTROLLED SHOCK DISCHARGED. Every machine in the building locks up. (60s)',
    sub_shockEnd: 'The machines shudder back to life.',
    sub_kitchen: 'Pots and pans clatter in the kitchen. Something is in there.',

    death_title: (name) => name.toUpperCase() + ' FOUND YOU',
    death_body: 'Cold hands close around you, and the rubble goes quiet again.',
    death_sub: (n) => 'Night ' + n + ' — failed',

    dawn_title: '6 AM',
    dawn_body: 'Grey light leaks through the broken roof. One by one, the machines freeze mid-step, heads drooping, and power down where they stand.',
    dawn_sub: (n, left) => 'Night ' + n + ' survived. ' + left + ' to go.',

    cut1: '6 AM. Real flashlight beams cut through the dust.',
    cut2: 'OFFICER: "Sweet mother of— they\'re ACTIVE. Get behind me."',
    cut3: 'The man with him says nothing. He just smiles at the machines.',
    cut4: 'OFFICER: "All units — they\'re down. We\'ve got a live one in the rubble!"',

    end_title: 'YOU SURVIVED',
    end_body1: 'Five nights under the rubble. Five nights of servo whine and dragging feet. The paramedics pull you out into daylight that feels unreal.',
    end_body2: 'Behind you, sparks still spit from five broken machines.',
    end_sub: "As they carry you out, the man in purple is writing something on a clipboard.<br>He doesn't look at you. He looks at the parts.",
    end_tip: 'THE END — thanks for playing',
    end_custom_hint: 'CUSTOM NIGHT unlocked in the main menu.',

    cn_title: 'CUSTOM NIGHT',
    cn_desc: 'Set each animatronic\'s aggression (0 = off, 10 = merciless). All tools are unlocked: monitor, audio, program, two shock charges — and 10 food.',
    cn_start: 'START CUSTOM NIGHT',
    cn_result_win: 'CUSTOM NIGHT SURVIVED',
    cn_result_body: 'The sun rises on your own private nightmare.',
    cn_max_hint: 'Survive with everything at 10 to earn GOLDEN RUBBLE.',

    pause_title: 'PAUSED',
    btnResume: 'RESUME',
    btnRestartNight: 'RESTART NIGHT',
    btnQuitTitle: 'QUIT TO MENU',

    set_title: 'SETTINGS',
    set_volume: 'Volume',
    set_sens: 'Mouse sensitivity',
    set_lang: 'Language / Dil',
    set_static: 'Camera static intensity',
    set_subs: 'Subtitles / captions',
    set_fxflash: 'Screen flash effects',
    set_on: 'ON',
    set_off: 'OFF',

    ach_title: 'ACHIEVEMENTS',
    achName_night1: 'First Dawn', achDesc_night1: 'Survive Night 1.',
    achName_night3: 'Halfway Home', achDesc_night3: 'Survive Night 3.',
    achName_win: 'Rescued', achDesc_win: 'Survive all five nights.',
    achName_nodeath: 'Untouchable', achDesc_nodeath: 'Beat the game without dying once.',
    achName_frugal: 'Rationed', achDesc_frugal: 'Beat the game with 4+ food left over.',
    achName_bonnie: 'Blinded by the Light', achDesc_bonnie: 'Repel the rabbit 10 times.',
    achName_chica: 'Soup Kitchen', achDesc_chica: 'Feed the chick 8 times.',
    achName_foxy: 'Paparazzi', achDesc_foxy: 'Stun the fox with the flash 6 times.',
    achName_freddy: 'Pied Piper', achDesc_freddy: 'Lure the bear with audio 8 times.',
    achName_endo: 'It Obeys', achDesc_endo: 'Send ENDO-01 back to Parts & Service 3 times.',
    achName_shock: 'High Voltage', achDesc_shock: 'Use the controlled shock 3 times.',
    achName_deaths: 'Occupational Hazard', achDesc_deaths: 'Die 10 times. It happens.',
    achName_custom: 'Golden Rubble', achDesc_custom: 'Survive a Custom Night with every animatronic at 10.',

    hud_night: (n) => 'NIGHT ' + n,
    hud_custom: 'CUSTOM NIGHT',
    hud_food: (n) => '🍕 FOOD × ' + n,
    hud_shock: (n) => '⚡ SHOCK ×' + n + ' [X]',
    hud_shock_empty: '⚡ SHOCK SPENT',
    hud_stun: (s) => 'SYSTEMS STUNNED ' + s + 's',
    hud_cams: '▲ CAMERAS ▲',
    hud_torch_on: '🔦 ON',
    hud_torch_off: '🔦 OFF',
    hint_lock: 'Click to take control of the view — or drag to look around',

    mon_flash: '⚡ FLASH [F]',
    mon_audio: '♪ AUDIO [Q]',
    mon_program: '▚ PROGRAM [P]',
    mon_close: '▼ CLOSE ▼',

    mon_pause: '❚❚ PAUSE',
    sub_shockEmpty: 'The shock rig is dead. No charges left tonight.',
    sub_freddyHome: 'The bear is already on the stage. The jingle changes nothing.',
    sub_endoHome: '> ENDO-01 ALREADY DOCKED IN PARTS/SERVICE',
    deathTip_bonnie: 'The rabbit hates light. When servos whir close, keep your beam on its EYES until it recoils.',
    deathTip_chica: 'Light OFF, then F — she has to eat without seeing you. Feed her fast: a quick meal keeps her away longer.',
    deathTip_foxy: 'Check Pirate Cove often. The moment you hear sprinting, find the fox on a camera and FLASH it.',
    deathTip_freddy: 'Find the bear on the cameras and play AUDIO on his feed. Keep pushing him back all night.',
    deathTip_endo: 'ENDO-01 sees in the dark. Find it on a camera and PROGRAM it home — or spend a SHOCK.',
    ctl_look: 'MOUSE look',
    ctl_torch: 'SPACE / CLICK light',
    ctl_feed: 'F feed',
    ctl_cams: 'TAB / RIGHT-CLICK cameras',
    ctl_shock: 'X shock',
    ctl_pause: 'ESC / P pause',
    touchTip: 'On a touchscreen: drag anywhere to look around, and use the round buttons — 🔦 light · 🍕 feed · 📹 cameras · ⚡ shock · ❚❚ pause.',
    doc_title: 'Five Nights in the Rubble'
  },

  // ---------------------------------------------------------------- TURKISH
  tr: {
    title: 'ENKAZDA<br>BEŞ GECE',
    tagline: 'resmî olmayan, FNaF esintili bir hayran oyunu',
    story1: 'Akşam gösterisi sırasında tavan çöktü. Enkazın altında sıkışmış halde uyandın; ağzında alçı ve kan tadı var. Telefonun tek bir arama yapabildi.',
    story2: '&ldquo;İlçenin yarısı göçük altında beyefendi. Size <b>beş gün</b> içinde ulaşacağız. Olduğunuz yerde kalın. Sessiz olun.&rdquo;',
    story3: 'Karanlığın bir yerinde animatronikler hâlâ sahnede.<br>Ve geceleri… yürüyorlar.',
    titleTip: '5 gece hayatta kal. Her gece 5 dakika sürer (00:00 – 06:00).<br>Kulaklık şiddetle tavsiye edilir.',

    btnContinue: (n) => 'DEVAM ET — ' + n + '. GECE',
    btnNew: 'YENİ OYUN',
    btnCustom: 'ÖZEL GECE',
    btnCustomLocked: 'ÖZEL GECE 🔒',
    btnAchievements: 'BAŞARIMLAR',
    btnSettings: 'AYARLAR',
    btnStartNight: (n) => n + '. GECEYİ BAŞLAT',
    btnRetry: (n) => n + '. GECEYİ TEKRAR DENE',
    btnNight: (n) => n + '. GECE',
    btnBack: 'GERİ',
    newGameConfirm: 'Yeni oyun başlatmak mevcut ilerlemeni siler (açılan gece: %N). Devam edilsin mi?',

    brief1: `<h2>1. GECE &mdash; TAVŞAN</h2>
      <p>Telefonun %4'te. Santraldeki sesin tonu düzdü: <em>&ldquo;Bu gece herkes göçük altında beyefendi.
      Dayanın. Beş gün, belki daha az.&rdquo;</em></p>
      <p>Kuliste büyük bir şey kımıldadı. Tavşan. Servoları hâlâ çalışıyor &mdash; ve enkazda sıcak şeyler arıyor.</p>
      <p class="tip">&#9656; Yaklaştığını duyduğunda <b>FENERİNİ GÖZLERİNE TUT</b> ve geri çekilene kadar üzerinde tut.<br>
      &#9656; BOŞLUK veya SOL TIK feneri açıp kapatır. Etrafa bakmak için fareyi hareket ettir.</p>`,
    brief2: `<h2>2. GECE &mdash; CİVCİV</h2>
      <p>Enkazı eşelerken yırtık bir mutfak torbası buldun &mdash; <b>10 parça</b> çürümüş, kokuşmuş yiyecek. Elindekinin hepsi bu. Yetmek zorunda.</p>
      <p>Civciv artık uyanık ve <em>aç</em>.</p>
      <p class="tip">&#9656; Yaklaştığında <b>IŞIĞINI SÖNDÜR</b> ve yiyecek fırlatmak için <b>F</b>'ye bas. Onu, seni fark etmeden besle &mdash; ışığın üzerindeyse saldırır.<br>
      &#9656; Onu ne kadar çabuk beslersen o kadar uzun süre uzak kalır. Elindeki tek şey yiyecek.<br>
      &#9656; Tavşan hâlâ gözüne ışık tutulmasından nefret ediyor. İkisini birden idare et.</p>`,
    brief3: `<h2>3. GECE &mdash; TİLKİ</h2>
      <p>Enkazdan çatlak bir <b>güvenlik monitörü</b> söktün. Kamera ağı hâlâ cevap veriyor.</p>
      <p>Tilki diğerleri gibi sinsice yaklaşmaz. Perdesinin arkasında bekler ve sonra <em>koşar</em>.</p>
      <p class="tip">&#9656; <b>TAB / C / sağ tık</b> kameraları açar. 1&ndash;8 tuşları görüntü değiştirir.<br>
      &#9656; Korsan Koyu'nu izle. Tilkiyi kamerada bul ve gözlerini yakmak için <b>FLAŞ</b>'a (monitördeyken F) bas &mdash; 30 saniye sersemletir.<br>
      &#9656; Koşu sesi duyuyorsan, yavaş olmak için çoktan geç kalmışsın demektir.</p>`,
    brief4: `<h2>4. GECE &mdash; AYI</h2>
      <p>Büyük olan artık hareket halinde. Işık onu durdurmaz. Yiyecek ilgisini çekmez. Hiçbir şey onu durduramaz.</p>
      <p>Ama kulakları hâlâ çalışıyor.</p>
      <p class="tip">&#9656; Ayıyı kameralarda bul ve <em>onun</em> kamerasında <b>SES</b>'e (veya Q) basarak onu geriye çek.<br>
      &#9656; Bu sadece zaman kazandırır. 06:00'ya kadar zaman kazanmaya devam et.<br>
      &#9656; Eşelenirken tezgâhın altına sıkışmış <b>3 parça yiyecek</b> daha buldun.</p>`,
    brief5: `<h2>5. GECE &mdash; İSKELET</h2>
      <p>Son gece. Hepsi daha hızlı, hepsi daha öfkeli. Ve Parça &amp; Servis'te başka bir şey uyandı &mdash; çıplak bir <b>endoskelet</b>. Kostümü yok. Işık isteyen gözleri yok. <em>Karanlıkta görüyor.</em></p>
      <p class="tip">&#9656; ENDO-01'i kameralarda bul ve <b>PROGRAM</b>'a (veya P) basarak Parça &amp; Servis'e geri gönder.<br>
      &#9656; Bir <b>KONTROLLÜ ŞOK [X]</b> düzeneği kurdun: tüm animatronikleri 60 saniye sersemletir. Akü yalnızca <b>iki şarj</b> taşıyor — iyi kullan.<br>
      &#9656; Şafağa kadar hayatta kal. Gün ışığıyla birlikte geliyorlar.</p>`,

    dirLeft: 'SOLUNDA',
    dirRight: 'SAĞINDA',
    dirFront: 'TAM ÖNÜNDE',

    sub_nightStart: '00:00. Bina gıcırdıyor. Sahnedeki bir şey az önce kafasını çevirdi.',
    sub_bonnieNear: (dir) => 'Ağır servo sesleri ' + dir + '. Fenerini gözlerine tut!',
    sub_bonnieRepel: 'Tavşan çığlık atarak geriliyor ve kendini karanlığa sürüklüyor.',
    sub_chicaNear: (dir) => 'Islak tıkırtılar ' + dir + '. Aç. Işığını söndür ve yiyecek atmak için F\'ye bas.',
    sub_chicaNoticed: 'Işığı gördü. Daha HIZLI geliyor. Işığı kapat ve onu besle!',
    sub_chicaFed: 'Çürük yiyeceği karanlığa fırlatıyorsun. Islak çıtırtılar… sonra uzaklaşan sürüklenme sesleri.',
    sub_chicaEmpty: 'Boş torbayı tırmalıyorsun. Hiçbir şey kalmamış.',
    sub_chicaLightOn: 'Işığın AÇIK — attığını görür. Önce ışığı söndür.',
    sub_freddyNear: (dir) => 'Derin bir kahkaha ' + dir + '. Ayı. Onu SES ile uzaklaştır — çabuk.',
    sub_freddyLure: 'Ayı sese dönüyor ve ağır adımlarla uzaklaşıyor. Bu sadece zaman kazandırır.',
    sub_freddyWrong: 'Uzak bir hoparlörden cılız bir melodi çalıyor. Ayı umursamıyor — yanlış kamera.',
    sub_foxyStir: 'Perdesinin arkasında tilki yeniden kıpırdanıyor.',
    sub_foxyRun: 'KOŞU SESLERİ — tilki geliyor! Kameralardan flaşla!',
    sub_foxyFlash: 'Flaş gözlerini yakıyor — tilki kaskatı kesiliyor. (30 sn)',
    sub_flashMiss: 'Kamera flaşı patlıyor. Kör edecek kimse yoktu.',
    sub_endoNear: (dir) => 'Fayansta çıplak metal ayak sesleri, ' + dir + '. ENDO-01 enkazı buldu. PROGRAMLA ya da ŞOKLA!',
    sub_endoProg: '> ENDO-01 :: KOMUT KABUL EDİLDİ :: PARÇA/SERVİS\'E DÖNÜYOR',
    sub_progFail: '> BAĞLANTI HATASI :: HEDEF BU KAMERADA DEĞİL',
    sub_shock: 'KONTROLLÜ ŞOK BOŞALTILDI. Binadaki her makine kilitleniyor. (60 sn)',
    sub_shockEnd: 'Makineler titreyerek yeniden canlanıyor.',
    sub_kitchen: 'Mutfakta tencere tava sesleri. İçeride bir şey var.',

    death_title: (name) => name.toUpperCase() + ' SENİ BULDU',
    death_body: 'Soğuk eller etrafını sarıyor ve enkaz yeniden sessizliğe gömülüyor.',
    death_sub: (n) => n + '. gece — başarısız',

    dawn_title: '06:00',
    dawn_body: 'Kırık çatıdan gri bir ışık sızıyor. Makineler birer birer adım ortasında donuyor, başları öne düşüyor ve oldukları yerde kapanıyorlar.',
    dawn_sub: (n, left) => n + '. gece atlatıldı. ' + left + ' gece kaldı.',

    cut1: '06:00. Gerçek fener ışıkları tozun içinden süzülüyor.',
    cut2: 'POLİS: "Yüce Tanrım… bunlar AKTİF. Arkamda dur."',
    cut3: 'Yanındaki adam tek kelime etmiyor. Sadece makinelere gülümsüyor.',
    cut4: 'POLİS: "Tüm birimler — hepsi devre dışı. Enkazda canlı biri var!"',

    end_title: 'HAYATTA KALDIN',
    end_body1: 'Enkaz altında beş gece. Beş gece boyunca servo iniltileri ve sürüklenen ayak sesleri. Sağlık ekipleri seni gerçek dışı gelen bir gün ışığına çekip çıkarıyor.',
    end_body2: 'Arkanda, beş parçalanmış makineden hâlâ kıvılcımlar saçılıyor.',
    end_sub: 'Seni taşırlarken mor giysili adam panosuna bir şeyler yazıyor.<br>Sana bakmıyor. Parçalara bakıyor.',
    end_tip: 'SON — oynadığın için teşekkürler',
    end_custom_hint: 'Ana menüde ÖZEL GECE açıldı.',

    cn_title: 'ÖZEL GECE',
    cn_desc: 'Her animatroniğin saldırganlığını ayarla (0 = kapalı, 10 = acımasız). Tüm araçlar açık: monitör, ses, program, iki şok şarjı — ve 10 yiyecek.',
    cn_start: 'ÖZEL GECEYİ BAŞLAT',
    cn_result_win: 'ÖZEL GECE ATLATILDI',
    cn_result_body: 'Güneş, kendi ellerinle kurduğun kâbusun üzerine doğuyor.',
    cn_max_hint: 'ALTIN ENKAZ için hepsi 10 ayarında hayatta kal.',

    pause_title: 'DURAKLATILDI',
    btnResume: 'DEVAM ET',
    btnRestartNight: 'GECEYİ YENİDEN BAŞLAT',
    btnQuitTitle: 'ANA MENÜYE DÖN',

    set_title: 'AYARLAR',
    set_volume: 'Ses düzeyi',
    set_sens: 'Fare hassasiyeti',
    set_lang: 'Language / Dil',
    set_static: 'Kamera paraziti yoğunluğu',
    set_subs: 'Altyazılar',
    set_fxflash: 'Ekran flaş efektleri',
    set_on: 'AÇIK',
    set_off: 'KAPALI',

    ach_title: 'BAŞARIMLAR',
    achName_night1: 'İlk Şafak', achDesc_night1: '1. geceyi atlat.',
    achName_night3: 'Yolun Yarısı', achDesc_night3: '3. geceyi atlat.',
    achName_win: 'Kurtarıldın', achDesc_win: 'Beş gecenin hepsini atlat.',
    achName_nodeath: 'Dokunulmaz', achDesc_nodeath: 'Oyunu hiç ölmeden bitir.',
    achName_frugal: 'Tayınlama', achDesc_frugal: 'Oyunu 4+ yiyecek artırarak bitir.',
    achName_bonnie: 'Işıkla Kör Oldu', achDesc_bonnie: 'Tavşanı 10 kez geri püskürt.',
    achName_chica: 'Aşevi', achDesc_chica: 'Civcivi 8 kez besle.',
    achName_foxy: 'Paparazzi', achDesc_foxy: 'Tilkiyi flaşla 6 kez sersemlet.',
    achName_freddy: 'Fareli Köyün Kavalcısı', achDesc_freddy: 'Ayıyı sesle 8 kez kandır.',
    achName_endo: 'İtaat Ediyor', achDesc_endo: 'ENDO-01\'i 3 kez Parça & Servis\'e geri gönder.',
    achName_shock: 'Yüksek Voltaj', achDesc_shock: 'Kontrollü şoku 3 kez kullan.',
    achName_deaths: 'Meslek Hastalığı', achDesc_deaths: '10 kez öl. Olur böyle şeyler.',
    achName_custom: 'Altın Enkaz', achDesc_custom: 'Tüm animatronikler 10 ayarındayken Özel Gece\'yi atlat.',

    hud_night: (n) => n + '. GECE',
    hud_custom: 'ÖZEL GECE',
    hud_food: (n) => '🍕 YİYECEK × ' + n,
    hud_shock: (n) => '⚡ ŞOK ×' + n + ' [X]',
    hud_shock_empty: '⚡ ŞOK BİTTİ',
    hud_stun: (s) => 'SİSTEMLER SERSEMLEDİ ' + s + ' sn',
    hud_cams: '▲ KAMERALAR ▲',
    hud_torch_on: '🔦 AÇIK',
    hud_torch_off: '🔦 KAPALI',
    hint_lock: 'Görüşü kontrol etmek için tıkla — ya da sürükleyerek bak',

    mon_flash: '⚡ FLAŞ [F]',
    mon_audio: '♪ SES [Q]',
    mon_program: '▚ PROGRAM [P]',
    mon_close: '▼ KAPAT ▼',

    mon_pause: '❚❚ DURAKLAT',
    sub_shockEmpty: 'Şok düzeneği tükendi. Bu gece hiç şarj kalmadı.',
    sub_freddyHome: 'Ayı zaten sahnede. Melodi hiçbir şeyi değiştirmiyor.',
    sub_endoHome: '> ENDO-01 ZATEN PARÇA/SERVİS\'TE',
    deathTip_bonnie: 'Tavşan ışıktan nefret eder. Servo sesleri yaklaşınca fenerini geri çekilene kadar GÖZLERİNDE tut.',
    deathTip_chica: 'Önce ışığı KAPAT, sonra F — seni görmeden yemeli. Çabuk besle: hızlı bir öğün onu daha uzun uzak tutar.',
    deathTip_foxy: 'Korsan Koyu\'nu sık kontrol et. Koşu sesini duyduğun an tilkiyi bir kamerada bul ve FLAŞLA.',
    deathTip_freddy: 'Ayıyı kameralarda bul ve onun görüntüsünde SES çal. Bütün gece onu geri itmeye devam et.',
    deathTip_endo: 'ENDO-01 karanlıkta görür. Onu bir kamerada bulup PROGRAMLA — ya da bir ŞOK harca.',
    ctl_look: 'FARE bak',
    ctl_torch: 'BOŞLUK / TIK fener',
    ctl_feed: 'F besle',
    ctl_cams: 'TAB / SAĞ TIK kameralar',
    ctl_shock: 'X şok',
    ctl_pause: 'ESC / P duraklat',
    touchTip: 'Dokunmatik ekranda: bakmak için ekranı sürükle, yuvarlak butonları kullan — 🔦 fener · 🍕 besle · 📹 kameralar · ⚡ şok · ❚❚ duraklat.',
    doc_title: 'Enkazda Beş Gece'
  }
};

// Clock label: EN uses 12 AM style, TR uses 00:00 style.
export function clockLabel(elapsedFrac) {
  const h = Math.min(5, Math.floor(elapsedFrac * 6));
  if (lang === 'tr') return '0' + h + ':00';
  return (h === 0 ? 12 : h) + ' AM';
}
