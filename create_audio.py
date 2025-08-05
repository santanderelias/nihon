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
    'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
    'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
    'sa': 'さ', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
    'ta': 'た', 'chi': 'ち', 'tsu': 'つ', 'te': 'て', 'to': 'と',
    'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
    'ha': 'は', 'hi': 'ひ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
    'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
    'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
    'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
    'wa': 'わ', 'wo': 'を', 'n': 'ん',
    'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
    'za': 'ざ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
    'da': 'だ', 'dji': 'ぢ', 'dzu': 'づ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'パ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ'
}
AUDIO_MAP.update(hiragana_chars)

# Katakana (Basic + Dakuten/Handakuten)
katakana_chars = {
    'A': 'ア', 'I': 'イ', 'U': 'ウ', 'E': 'エ', 'O': 'オ',
    'KA': 'カ', 'KI': 'キ', 'KU': 'ク', 'KE': 'ケ', 'KO': 'コ',
    'SA': 'サ', 'SHI': 'シ', 'SU': 'ス', 'SE': 'セ', 'SO': 'ソ',
    'TA': 'タ', 'CHI': 'チ', 'TSU': 'ツ', 'TE': 'テ', 'TO': 'ト',
    'NA': 'ナ', 'NI': 'ニ', 'NU': 'ヌ', 'NE': 'ネ', 'NO': 'ノ',
    'HA': 'ハ', 'HI': 'ヒ', 'FU': 'フ', 'HE': 'ヘ', 'HO': 'ホ',
    'MA': 'マ', 'MI': 'ミ', 'MU': 'ム', 'ME': 'メ', 'MO': 'モ',
    'YA': 'ヤ', 'YU': 'ユ', 'YO': 'ヨ',
    'RA': 'ラ', 'RI': 'リ', 'RU': 'ル', 'RE': 'レ', 'RO': 'ロ',
    'WA': 'ワ', 'WO': 'ヲ', 'N_k': 'ン',
    'GA': 'ガ', 'GI': 'ギ', 'GU': 'グ', 'GE': 'ゲ', 'GO': 'ゴ',
    'ZA': 'ザ', 'JI': 'ジ', 'ZU': 'ズ', 'ZE': 'ゼ', 'ZO': 'ゾ',
    'DA': 'ダ', 'DJI': 'ヂ', 'DZU': 'ヅ', 'DE': 'デ', 'DO': 'ド',
    'BA': 'バ', 'BI': 'ビ', 'BU': 'ブ', 'BE': 'ベ', 'BO': 'ボ',
    'PA': 'パ', 'PI': 'ピ', 'PU': 'プ', 'PE': 'ペ', 'PO': 'ポ'
}
AUDIO_MAP.update(katakana_chars)

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
AUDIO_MAP.update(numbers)

# Kanji
kanji_chars = {
    'sen': '千', 'man': '万', 'en': '円', 'toki': '時', 'nichi': '日', 'getsu': '月', 'ka': '火', 'sui': '水', 'moku': '木',
    'kin': '金', 'do': '土', 'you': '曜', 'ue': '上', 'shita': '下', 'naka': '中', 'han': '半', 'yama': '山', 'kawa': '川', 'gen': '元',
    'ki': '気', 'ten': '天', 'watashi': '私', 'ima': '今', 'ta': '田', 'onna': '女', 'otoko': '男', 'mi': '見', 'i': '行', 'ta_eat': '食', 'no_drink': '飲'
}
AUDIO_MAP.update(kanji_chars)


# Words and Sentences from the app
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
    "watashi wa neko ga suki desu", "kono hon wa omoshiroi desu", "ashita eiga o mi ni ikimasu"
]
for item in words_and_sentences:
    # Create a safe filename by replacing spaces with underscores
    filename = item.lower().replace(" ", "_").replace("...". "desu").replace("?", "")
    AUDIO_MAP[filename] = item

# Grammar examples
grammar_examples = [
    "Watashi wa ringo o tabemasu"
]
for item in grammar_examples:
    filename = item.lower().replace(" ", "_").replace("?", "")
    AUDIO_MAP[filename] = item


# --- Script Logic ---

def generate_audio(text_to_speak, filename):
    """Generates an MP3 file for a given text using gTTS."""
    filepath = os.path.join(AUDIO_DIR, f"{filename}.mp3")

    if os.path.exists(filepath):
        # print(f"Skipping {filename}.mp3 (already exists).")
        return

    print(f"Generating audio for: '{text_to_speak}' -> {filepath}")
    try:
        # Prepend the silent pause
        text_with_pause = SILENT_PAUSE + text_to_speak
        
        # Create a gTTS object with Japanese language
        tts = gTTS(text=text_with_pause, lang='ja', slow=False)
        
        # Save the audio file
        tts.save(filepath)
    except Exception as e:
        print(f"ERROR: Failed to generate audio for '{text_to_speak}': {e}")


def main():
    """Main function to orchestrate the audio generation."""
    # Create the audio directory if it doesn't exist
    os.makedirs(AUDIO_DIR, exist_ok=True)

    # Iterate over the map and generate audio
    for filename, text in AUDIO_MAP.items():
        generate_audio(text, filename)

    print("\nAudio generation script finished.")
    print(f"Please check the '{AUDIO_DIR}' directory for the generated MP3 files.")

if __name__ == "__main__":
    main()