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

# --- Data Mapping ---
# Using a dictionary to map filenames to the text to be synthesized.
AUDIO_MAP = {}

# --- Characters from characterLevels ---

# Hiragana
hiragana_chars = {
    "a": "あ", "i": "い", "u": "う", "e": "え", "o": "お", "ka": "か", "ki": "き", "ku": "く", "ke": "け", "ko": "こ",
    "sa": "さ", "shi": "し", "su": "す", "se": "せ", "so": "そ", "ta": "た", "chi": "ち", "tsu": "つ", "te": "て", "to": "と",
    "na": "な", "ni": "に", "nu": "ぬ", "ne": "ね", "no": "の", "ha": "は", "hi": "ひ", "fu": "ふ", "he": "へ", "ho": "ほ",
    "ma": "ま", "mi": "み", "mu": "む", "me": "め", "mo": "も", "ya": "や", "yu": "ゆ", "yo": "よ", "ra": "ら", "ri": "り",
    "ru": "る", "re": "れ", "ro": "ろ", "wa": "わ", "wo": "を", "n": "ん", "ga": "が", "gi": "ぎ", "gu": "ぐ", "ge": "げ",
    "go": "ご", "za": "ざ", "ji": "じ", "zu": "ず", "ze": "ぜ", "zo": "ぞ", "da": "だ", "dji": "ぢ", "dzu": "づ", "de": "で",
    "do": "ど", "ba": "ば", "bi": "び", "bu": "ぶ", "be": "べ", "bo": "ぼ", "pa": "ぱ", "pi": "ぴ", "pu": "ぷ", "pe": "ぺ", "po": "ぽ"
}
AUDIO_MAP.update(hiragana_chars)

# Katakana
katakana_chars = {
    "A": "ア", "I": "イ", "U": "ウ", "E": "エ", "O": "オ", "KA": "カ", "KI": "キ", "KU": "ク", "KE": "ケ", "KO": "コ",
    "SA": "サ", "SHI": "シ", "SU": "ス", "SE": "セ", "SO": "ソ", "TA": "タ", "CHI": "チ", "TSU": "ツ", "TE": "テ", "TO": "ト",
    "NA": "ナ", "NI": "ニ", "NU": "ヌ", "NE": "ネ", "NO": "ノ", "HA": "ハ", "HI": "ヒ", "FU": "フ", "HE": "ヘ", "HO": "ホ",
    "MA": "マ", "MI": "ミ", "MU": "ム", "ME": "メ", "MO": "モ", "YA": "ヤ", "YU": "ユ", "YO": "ヨ", "RA": "ラ", "RI": "リ",
    "RU": "ル", "RE": "レ", "RO": "ロ", "WA": "ワ", "WO": "ヲ", "N_k": "ン", "GA": "ガ", "GI": "ギ", "GU": "グ", "GE": "ゲ",
    "GO": "ゴ", "ZA": "ザ", "JI": "ジ", "ZU": "ズ", "ZE": "ゼ", "ZO": "ゾ", "DA": "ダ", "DJI": "ヂ", "DZU": "ヅ", "DE": "デ",
    "DO": "ド", "BA": "バ", "BI": "ビ", "BU": "ブ", "BE": "ベ", "BO": "ボ", "PA": "パ", "PI": "ピ", "PU": "プ", "PE": "ペ", "PO": "ポ"
}
AUDIO_MAP.update(katakana_chars)

# Kanji (Grade 1) - using romaji as key for filename
kanji_g1 = {
    "ichi": "一", "ni": "二", "san": "三", "shi": "四", "go": "五", "roku": "六", "shichi": "七", "hachi": "八", "kyuu": "九", "juu": "十",
    "hyaku": "百", "sen": "千", "man": "万", "en": "円", "ji": "時", "nichi": "日", "getsu": "月", "ka": "火", "sui": "水", "moku": "木",
    "kin": "金", "do": "土", "you": "曜", "ue": "上", "shita": "下", "naka": "中", "han": "半", "yama": "山", "kawa": "川", "gen": "元",
    "ki": "気", "ten": "天", "watashi": "私", "ima": "今", "ta": "田", "onna": "女", "otoko": "男", "mi": "見", "i": "行", "ta_eat": "食", "no_drink": "飲"
}
AUDIO_MAP.update(kanji_g1)


# --- Words and Sentences ---
words_and_sentences = [
    "neko", "inu", "sushi", "sensei", "gakkou", "pen", "hon", "tsukue", "isu", "kuruma",
    "tabemasu", "nomimasu", "ikimasu", "mimasu", "oishii", "ookii", "chiisai", "hayai",
    "aka", "ao", "shiro", "kuro",
    "kore wa pen desu", "sore wa hon desu", "eki wa doko desu ka", "watashi wa gakusei desu",
    "kore wa ikura desu ka", "menyuu o kudasai", "itadakimasu"
]
for item in words_and_sentences:
    AUDIO_MAP[item] = item

# --- Grammar Modal Examples ---
grammar_examples = [
    "Watashi wa ringo o tabemasu", "Ohayou gozaimasu", "Konnichiwa", "Konbanwa", "Sayounara", "Oyasuminasai",
    "Hajimemashite", "Douzo yoroshiku", "Ima nanji desu ka?", "Kyou wa nannichi desu ka?", "Ashita wa nanyoubi desu ka?",
    "Kinou", "Ashita", "Hai", "Iie", "Onegaishimasu", "Arigatou gozaimasu", "Sumimasen", "Gomennasai",
    "Menyuu o kudasai", "Kore o kudasai", "Okanjou o onegaishimasu", "Itadakimasu", "Gochisousama deshita",
    "Kore wa ikura desu ka?", "Kurejitto kaado wa tsukaemasu ka?", "Fukuro o kudasai", "Eki wa doko desu ka?",
    "Massugu itte kudasai", "Migi ni magatte kudasai", "Hidari ni magatte kudasai", "Kyou no tenki wa dou desu ka?",
    "Hare desu", "Kumori desu", "Ame desu", "Yuki desu", "Tasukete", "Kyuukyuusha o yonde kudasai",
    "Byouin wa doko desu ka?", "Kibun ga warui desu"
]
for item in grammar_examples:
    AUDIO_MAP[item.lower().replace(" ", "_").replace("?", "")] = item


# --- Script Logic ---

def generate_audio(text_to_speak, filename):
    """Generates an MP3 file for a given text using gTTS."""
    filepath = os.path.join(AUDIO_DIR, f"{filename}.mp3")

    if os.path.exists(filepath):
        print(f"Skipping {filename}.mp3 (already exists).")
        return

    print(f"Generating audio for: '{text_to_speak}' -> {filepath}")
    try:
        # Create a gTTS object with Japanese language
        tts = gTTS(text=text_to_speak, lang='ja', slow=False)
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

    print("Audio generation script finished.")

if __name__ == "__main__":
    main()
