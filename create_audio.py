import os
from gtts import gTTS

# This script generates all audio assets for the application using the gTTS library.
#
# Prerequisites:
# 1. Python 3
# 2. gTTS library installed (`pip install gTTS`)
#
# Usage:
# Run the script from the root of the repository: python create_audio.py

# --- Configuration ---
AUDIO_DIR = "audio"
SILENT_PAUSE = "... " # Prepended to add a brief pause before the audio starts

# --- Data Mapping ---
# Using a dictionary to map filenames to the text to be synthesized.
AUDIO_MAP = {}

# --- Data from the App (js/script.js) ---

# Hiragana (Basic + Dakuten/Handakuten)
hiragana_chars = {
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お', 'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ', 'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の', 'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も', 'ya': 'や', 'yu': 'ゆ', 'yo': 'よ', 'ra': 'ら', 'ri': 'り',
    'ru': 'る', 're': 'れ', 'ro': 'ろ', 'wa': 'わ', 'wo': 'を', 'n': 'ん', 'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ',
    'go': 'ご', 'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ', 'da': 'だ', 'dji': 'ぢ', 'dzu': 'づ', 'de': 'で',
    'do': 'ど', 'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ', 'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ'
}
for key, value in hiragana_chars.items():
    AUDIO_MAP[f"h_{key}"] = value

# Katakana (Basic + Dakuten/Handakuten)
katakana_chars = {
    'A': 'ア', 'I': 'イ', 'U': 'ウ', 'E': 'エ', 'O': 'オ', 'KA': 'カ', 'KI': 'キ', 'KU': 'ク', 'KE': 'ケ', 'KO': 'コ',
    'SA': 'サ', 'SHI': 'シ', 'SU': 'ス', 'SE': 'セ', 'SO': 'ソ', 'TA': 'タ', 'CHI': 'チ', 'TSU': 'ツ', 'TE': 'テ', 'TO': 'ト',
    'NA': 'ナ', 'NI': 'ニ', 'NU': 'ヌ', 'NE': 'ネ', 'NO': 'ノ', 'HA': 'ハ', 'HI': 'ヒ', 'FU': 'フ', 'HE': 'ヘ', 'HO': 'ホ',
    'MA': 'マ', 'MI': 'ミ', 'MU': 'ム', 'ME': 'メ', 'MO': 'モ', 'YA': 'ヤ', 'YU': 'ユ', 'YO': 'ヨ', 'RA': 'ラ', 'RI': 'リ',
    'RU': 'ル', 'RE': 'レ', 'RO': 'ロ', 'WA': 'ワ', 'WO': 'ヲ', 'N_k': 'ン', 'GA': 'ガ', 'GI': 'ギ', 'GU': 'グ', 'GE': 'ゲ',
    'GO': 'ゴ', 'ZA': 'ザ', 'JI': 'ジ', 'ZU': 'ズ', 'ZE': 'ゼ', 'ZO': 'ゾ', 'DA': 'ダ', 'DJI': 'ヂ', 'DZU': 'ヅ', 'DE': 'デ',
    'DO': 'ド', 'BA': 'バ', 'BI': 'ビ', 'BU': 'ブ', 'BE': 'ベ', 'BO': 'ボ', 'PA': 'パ', 'PI': 'ピ', 'PU': 'プ', 'PE': 'ペ', 'PO': 'ポ'
}
for key, value in katakana_chars.items():
    AUDIO_MAP[f"k_{key}"] = value


# Numbers (with num_ prefix to avoid conflicts)
numbers = {
    'num_ichi': '一', 'num_ni': '二', 'num_san': '三', 'num_shi': '四', 'num_go': '五',
    'num_roku': '六', 'num_shichi': '七', 'num_hachi': '八', 'num_kyuu': '九', 'num_juu': '十',
    'num_juuichi': '十一', 'num_juuni': '十二', 'num_juusan': '十三', 'num_juushi': '十四', 'num_juugo': '十五',
    'num_juuroku': '十六', 'num_juushichi': '十七', 'num_juuhachi': '十八', 'num_juukyuu': '十九', 'num_nijuu': '二十',
    'num_nijuuichi': '二十一', 'num_nijuuni': '二十二', 'num_nijuusan': '二十三', 'num_nijuushi': '二十四', 'num_nijuugo': '二十五',
    'num_nijuuroku': '二十六', 'num_nijuushichi': '二十七', 'num_nijuuhachi': '二十八', 'num_nijuukyuu': '二十九', 'num_sanjuu': '三十',
    'num_yonjuu': '四十', 'num_gojuu': '五十', 'num_rokujuu': '六十', 'num_nanajuu': '七十', 'num_hachijuu': '八十', 'num_kyuujuu': '九十', 'num_hyaku': '百'
}
for key, value in numbers.items():
    AUDIO_MAP[f"num_{key}"] = value

# Kanji (with kanji_ prefix to avoid conflicts)
kanji_chars = {
    'ichi': '一', 'ni': '二', 'san': '三', 'shi': '四', 'go': '五', 'roku': '六', 'shichi': '七', 'hachi': '八', 'kyuu': '九', 'juu': '十',
    'hyaku': '百', 'sen': '千', 'man': '万', 'en': '円', 'ji': '時', 'nichi': '日', 'getsu': '月', 'ka': '火', 'sui': '水', 'moku': '木',
    'kin': '金', 'do': '土', 'you': '曜', 'ue': '上', 'shita': '下', 'naka': '中', 'han': '半', 'yama': '山', 'kawa': '川', 'gen': '元',
    'ki': '気', 'ten': '天', 'watashi': '私', 'ima': '今', 'ta': '田', 'onna': '女', 'otoko': '男', 'mi': '見', 'i': '行', 'ta_eat': '食', 'no_drink': '飲'
}
for key, value in kanji_chars.items():
    AUDIO_MAP[f"kanji_{key}"] = value


# Words and Sentences from the app (no prefix needed)
words_and_sentences = [
    "neko", "inu", "sushi", "sensei", "gakkou", "pen", "hon", "tsukue", "isu", "kuruma",
    "tabemasu", "nomimasu", "ikimasu", "mimasu", "oishii", "ookii", "chiisai", "hayai",
    "kore wa pen desu", "sore wa hon desu", "eki wa doko desu ka", "watashi wa gakusei desu",
    "hito", "kazoku", "nihon", "tokyo", "mise", "tabemono", "nomimono", "gohan", "pan", "mizu", "ocha", "gyuunyuu",
    "ie", "heya", "enpitsu", "tokei", "kyou", "ashita", "kinou", "jikan", "tenki", "ame", "hare",
    "mimasu", "kaimasu", "kaerimasu", "yomimasu", "kakimasu", "kikimasu", "hanashimasu", "nemasu", "okimasu",
    "atarashii", "furui", "ii", "warui", "takai", "yasui", "omoshiroi", "isogashii", "tanoshii",
    "kirei", "shinsetsu", "yuumei", "benri", "suki",
    "ohayou gozaimasu", "konnichiwa", "konbanwa", "sayounara", "oyasuminasai",
    "arigatou gozaimasu", "sumimasen", "gomennasai", "onegaishimasu",
    "hajimemashite", "watashi no namae wa ... desu", "douzo yoroshiku",
    "ogenki desu ka", "kore wa nan desu ka", "ima nanji desu ka",
    "doko desu ka", "ikura desu ka", "doushite desu ka",
    "menyuu o kudasai", "okanjou o onegaishimasu", "oishikatta desu",
    "kore o kudasai", "shichaku shite mo ii desu ka", "kurejittokaado wa tsukaemasu ka",
    "eki wa doko desu ka", "massugu itte kudasai", "migi ni magatte kudasai",
    "watashi wa neko ga suki desu", "kono hon wa omoshiroi desu", "ashita eiga o mi ni ikimasu",
    "shimasu", "atarashikunai", "atarashikatta", "kirei desu", "kirei janai desu", "kirei deshita",
    "Watashi wa ringo o tabemasu"
]
for item in words_and_sentences:
    filename = item.lower().replace(" ", "_").replace("...",