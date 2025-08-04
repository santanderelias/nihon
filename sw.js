importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.0/workbox-sw.js');

if (workbox) {
    console.log('Workbox is loaded!');

    // Set the cache name prefix for Workbox
    workbox.core.setCacheNameDetails({
        prefix: 'nihon',
        suffix: 'v1.4.1' // New version for Workbox cache
    });

    // --- Asset Lists ---
    const core_assets = [
        { url: '/nihon/index.html', revision: null },
        { url: '/nihon/css/style.css', revision: null },
        { url: '/nihon/css/bootstrap.min.css', revision: null },
        { url: '/nihon/js/script.js', revision: null },
        { url: '/nihon/js/bootstrap.bundle.min.js', revision: null },
        { url: '/nihon/js/popper.min.js', revision: null },
        { url: '/nihon/js/wanakana.min.js', revision: null },
        { url: '/nihon/js/sql-wasm.js', revision: null },
        { url: '/nihon/js/sql-wasm.wasm', revision: null },
        { url: '/nihon/manifest.json', revision: null },
        { url: '/nihon/db/db_manifest.json', revision: null },
        { url: '/nihon/favicon.ico', revision: null },
        { url: '/nihon/fonts/NotoSansJP.woff2', revision: null },
        { url: '/nihon/icons/back.png', revision: null },
        { url: '/nihon/icons/audio.png', revision: null },
        { url: '/nihon/icons/history.png', revision: null },
        { url: '/nihon/icons/reference.png', revision: null },
        { url: '/nihon/icons/theme_dark.png', revision: null },
        { url: '/nihon/icons/theme_light.png', revision: null }
    ];

    const hiragana_audio = "a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n ga gi gu ge go za ji zu ze zo da dji dzu de do ba bi bu be bo pa pi pu pe po".split(" ");
    const katakana_audio = "A I U E O KA KI KU KE KO SA SHI SU SE SO TA CHI TSU TE TO NA NI NU NE NO HA HI FU HE HO MA MI MU ME MO YA YU YO RA RI RU RE RO WA WO N_k GA GI GU GE GO ZA JI ZU ZE ZO DA DJI DZU DE DO BA BI BU BE BO PA PI PU PE PO".split(" ");
    const kanji_audio = "ichi ni san shi go roku shichi hachi kyuu juu hyaku sen man en ji nichi getsu ka sui moku kin do you ue shita naka han yama kawa gen ki ten watashi ima ta onna otoko mi i ta_eat no_drink".split(" ");
    const words_audio = "neko inu sushi sensei gakkou pen hon tsukue isu kuruma tabemasu nomimasu ikimasu mimasu oishii ookii chiisai hayai aka ao shiro kuro".split(" ");
    const sentences_audio = [
        "kore wa pen desu", "sore wa hon desu",
        "eki wa doko desu ka", "watashi wa gakusei desu",
        "kore wa ikura desu ka", "menyuu o kudasai", "itadakimasu"
    ];
    const grammar_audio = [
        "Watashi wa ringo o tabemasu", "Ohayou gozaimasu", "Konnichiwa", "Konbanwa", "Sayounara", "Oyasuminasai",
        "Hajimemashite", "Douzo yoroshiku", "Ima nanji desu ka?", "Kyou wa nannichi desu ka?", "Ashita wa nanyoubi desu ka?",
        "Kinou", "Ashita", "Hai", "Iie", "Onegaishimasu", "Arigatou gozaimasu", "Sumimasen", "Gomennasai",
        "Menyuu o kudasai", "Kore o kudasai", "Okanjou o onegaishimasu", "Itadakimasu", "Gochisousama deshita",
        "Kore wa ikura desu ka?", "Kurejitto kaado wa tsukaemasu ka?", "Fukuro o kudasai", "Eki wa doko desu ka?",
        "Massugu itte kudasai", "Migi ni magatte kudasai", "Hidari ni magatte kudasai", "Kyou no tenki wa dou desu ka?",
        "Hare desu", "Kumori desu", "Ame desu", "Yuki desu", "Tasukete", "Kyuukyuusha o yonde kudasai",
        "Byouin wa doko desu ka?", "Kibun ga warui desu"
    ];

    const all_audio_keys = [...hiragana_audio, ...katakana_audio, ...kanji_audio, ...words_audio, ...sentences_audio];
    grammar_audio.forEach(text => all_audio_keys.push(text.toLowerCase().replace(/\s/g, '_').replace('?', '')));

    const audio_assets = all_audio_keys.map(key => ({ url: `/nihon/audio/${key}.mp3`, revision: null }));

    const assetsToPrecache = [...core_assets, ...audio_assets];

    workbox.precaching.precacheAndRoute(assetsToPrecache);

    // Runtime caching for SQLite database files
    workbox.routing.registerRoute(
        ({ url }) => url.pathname.startsWith('/nihon/db/jmdict_') && url.pathname.endsWith('.sqlite'),
        new workbox.strategies.CacheFirst({
            cacheName: 'nihon-db-cache',
            plugins: [
                new workbox.expiration.ExpirationPlugin({
                    maxEntries: 50,
                    maxAgeSeconds: 30 * 24 * 60 * 60, // 30 Days
                }),
                new workbox.cacheableResponse.CacheableResponsePlugin({
                    statuses: [0, 200],
                }),
            ],
        })
    );

    // Handle messages from the main thread
    self.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SKIP_WAITING') {
            self.skipWaiting();
        }
    });

} else {
    console.log('Workbox did not load.');
}
