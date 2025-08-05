import os
from gtts import gTTS

# This script generates all audio assets for the application using the gTTS library.
#
# Prerequisites:
# 1. Python 3
# 2. gTTS library installed (`pip install gTTS`)
#
# Usage:
# 1. Delete all files in the `audio/` directory.
# 2. Run this script from the root of the repository: `python create_audio.py`

# --- Configuration ---
AUDIO_DIR = "audio"
SILENT_PAUSE = "... " # Prepended to add a brief pause before the audio starts

# --- Data Mapping ---
# Using a dictionary to map filenames to the text to be synthesized.
AUDIO_MAP = {}

# --- Data from the App (js/script.js) ---
# This data is now synchronized with the data used in the main application.

# Hiragana (h_ prefix)
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

# Katakana (k_ prefix)
katakana_chars_upper = {
    'A': 'ア', 'I': 'イ', 'U': 'ウ', 'E': 'エ', 'O': 'オ', 'KA': 'カ', 'KI': 'キ', 'KU': 'ク', 'KE': 'ケ', 'KO': 'コ',
    'SA': 'サ', 'SHI': 'シ', 'SU': 'ス', 'SE': 'セ', 'SO': 'ソ', 'TA': 'タ', 'CHI': 'チ', 'TSU': 'ツ', 'TE': 'テ', 'TO': 'ト',
    'NA': 'ナ', 'NI': 'ニ', 'NU': 'ヌ', 'NE': 'ネ', 'NO': 'ノ', 'HA': 'ハ', 'HI': 'ヒ', 'FU': 'フ', 'HE': 'ヘ', 'HO': 'ホ',
    'MA': 'マ', 'MI': 'ミ', 'MU': 'ム', 'ME': 'メ', 'MO': 'モ', 'YA': 'ヤ', 'YU': 'ユ', 'YO': 'ヨ', 'RA': 'ラ', 'RI': 'リ',
    'RU': 'ル', 'RE': 'レ', 'RO': 'ロ', 'WA': 'ワ', 'WO': 'ヲ', 'N_k': 'ン', 'GA': 'ガ', 'GI': 'ギ', 'GU': 'グ', 'GE': 'ゲ',
    'GO': 'ゴ', 'ZA': 'ザ', 'JI': 'ジ', 'ZU': 'ズ', 'ZE': 'ゼ', 'ZO': 'ゾ', 'DA': 'ダ', 'DJI': 'ヂ', 'DZU': 'ヅ', 'DE': 'デ',
    'DO': 'ド', 'BA': 'バ', 'BI': 'ビ', 'BU': 'ブ', 'BE': 'ベ', 'BO': 'ボ', 'PA': 'パ', 'PI': 'ピ', 'PU': 'プ', 'PE': 'ペ', 'PO': 'ポ'
}
for key, value in katakana_chars_upper.items():
    AUDIO_MAP[f"k_{key}"] = value

# Numbers (num_ prefix)
numbers = {
    'ichi': '一', 'ni': '二', 'san': '三', 'shi': '四', 'go': '五', 'roku': '六', 'shichi': '七', 'hachi': '八', 'kyuu': '九', 'juu': '十',
    'juuichi': '十一', 'juuni': '十二', 'juusan': '十三', 'juushi': '十四', 'juugo': '十五', 'juuroku': '十六', 'juushichi': '十七', 'juuhachi': '十八', 'juukyuu': '十九', 'nijuu': '二十',
    'nijuuichi': '二十一', 'nijuuni': '二十二', 'nijuusan': '二十三', 'nijuushi': '二十四', 'nijuugo': '二十五', 'nijuuroku': '二十六', 'nijuushichi': '二十七', 'nijuuhachi': '二十八', 'nijuukyuu': '二十九', 'sanjuu': '三十',
    'yonjuu': '四十', 'gojuu': '五十', 'rokujuu': '六十', 'nanajuu': '七十', 'hachijuu': '八十', 'kyuujuu': '九十', 'hyaku': '百'
}
for key, value in numbers.items():
    AUDIO_MAP[f"num_{key}"] = value

# Kanji (kanji_ prefix)
kanji_chars = {
    'ichi': '一', 'ni': '二', 'san': '三', 'shi': '四', 'go': '五', 'roku': '六', 'shichi': '七', 'hachi': '八', 'kyuu': '九', 'juu': '十',
    'hyaku': '百', 'sen': '千', 'man': '万', 'en': '円', 'ji': '時', 'nichi': '日', 'getsu': '月', 'ka': '火', 'sui': '水', 'moku': '木',
    'kin': '金', 'do': '土', 'you': '曜', 'ue': '上', 'shita': '下', 'naka': '中', 'han': '半', 'yama': '山', 'kawa': '川', 'gen': '元',
    'ki': '気', 'ten': '天', 'watashi': '私', 'ima': '今', 'ta': '田', 'onna': '女', 'otoko': '男', 'mi': '見', 'i': '行', 'ta_eat': '食', 'no_drink': '飲'
}
for key, value in kanji_chars.items():
    AUDIO_MAP[f"kanji_{key}"] = value

# Words (no prefix)
words_data = {
    '人': 'hito', '男': 'otoko', '女': 'onna', '家族': 'kazoku', '日本': 'nihon', '東京': 'tokyo', '店': 'mise',
    '食べ物': 'tabemono', '飲み物': 'nomimono', 'ご飯': 'gohan', 'パン': 'pan', '水': 'mizu', 'お茶': 'ocha', '牛乳': 'gyuunyuu',
    '家': 'ie', '部屋': 'heya', '椅子': 'isu', '机': 'tsukue', '本': 'hon', '鉛筆': 'enpitsu', '時計': 'tokei',
    '今日': 'kyou', '明日': 'ashita', '昨日': 'kinou', '時間': 'jikan', '天気': 'tenki', '雨': 'ame', '晴れ': 'hare',
    '見ます': 'mimasu', '食べます': 'tabemasu', '飲みます': 'nomimasu', '買います': 'kaimasu', '行きます': 'ikimasu', '帰ります': 'kaerimasu',
    '読みます': 'yomimasu', '書きます': 'kakimasu', '聞きます': 'kikimasu', '話します': 'hanashimasu', '寝ます': 'nemasu', '起きます': 'okimasu',
    '新しい': 'atarashii', '古い': 'furui', '良い': 'ii', '悪い': 'warui', '大きい': 'ookii', '小さい': 'chiisai',
    '高い': 'takai', '安い': 'yasui', '面白い': 'omoshiroi', '美味しい': 'oishii', '忙しい': 'isogashii', '楽しい': 'tanoshii',
    '元気': 'genki', '綺麗': 'kirei', '親切': 'shinsetsu', '有名': 'yuumei', '便利': 'benri', '好き': 'suki',
    '頭': 'atama', '顔': 'kao', '目': 'me', '耳': 'mimi', '鼻': 'hana', '口': 'kuchi', '手': 'te', '足': 'ashi',
    '電車': 'densha', '車': 'kuruma', '飛行機': 'hikouki', '地下鉄': 'chikatetsu', '駅': 'eki', '空港': 'kuukou',
    '仕事': 'shigoto', '電話': 'denwa', '映画': 'eiga', '音楽': 'ongaku', '写真': 'shashin', '友達': 'tomodachi'
}
for japanese, romaji in words_data.items():
    filename = romaji.lower().replace(" ", "_").replace("...", "desu").replace("?", "")
    AUDIO_MAP[filename] = japanese

# Sentences (no prefix)
sentences_data = {
    'おはようございます': 'ohayou gozaimasu', 'こんにちは': 'konnichiwa', 'こんばんは': 'konbanwa', 'さようなら': 'sayounara', 'おやすみなさい': 'oyasuminasai',
    'ありがとうございます': 'arigatou gozaimasu', 'すみません': 'sumimasen', 'ごめんなさい': 'gomennasai', 'お願いします': 'onegaishimasu',
    'はじめまして': 'hajimemashite', '私の名前は...です': 'watashi no namae wa ... desu', 'どうぞよろしく': 'douzo yoroshiku',
    'お元気ですか': 'ogenki desu ka', 'これは何ですか': 'kore wa nan desu ka', '今何時ですか': 'ima nanji desu ka',
    'どこですか': 'doko desu ka', 'いくらですか': 'ikura desu ka', 'どうしてですか': 'doushite desu ka',
    'メニューをください': 'menyuu o kudasai', 'お勘定をお願いします': 'okanjou o onegaishimasu', '美味しかったです': 'oishikatta desu',
    'これをください': 'kore o kudasai', '試着してもいいですか': 'shichaku shite mo ii desu ka', 'クレジットカードは使えますか': 'kurejittokaado wa tsukaemasu ka',
    '駅はどこですか': 'eki wa doko desu ka', 'まっすぐ行ってください': 'massugu itte kudasai', '右に曲がってください': 'migi ni magatte kudasai',
    '私は猫が好きです': 'watashi wa neko ga suki desu', '私はブロッコリーが嫌いです': 'watashi wa burokkorii ga kirai desu',
    'この本は面白いです': 'kono hon wa omoshiroi desu', 'その車は高いです': 'sono kuruma wa takai desu',
    '明日映画を見に行きます': 'ashita eiga o mi ni ikimasu', '週末に何をしますか': 'shuumatsu ni nani o shimasu ka'
}
for japanese, romaji in sentences_data.items():
    # For TTS, replace '...' with a pause (Japanese comma)
    text_to_speak = japanese.replace('...', '、')
    # For filename, follow the JS logic
    filename = romaji.lower().replace(" ", "_").replace("...", "desu").replace("?", "")
    AUDIO_MAP[filename] = text_to_speak

# Also add grammar examples from the old script to be safe
grammar_examples = {
    "Watashi wa ringo o tabemasu": "私はリンゴを食べます",
    "yomimasu": "読みます",
    "tabemasu": "食べます",
    "shimasu": "します",
    "atarashii": "新しい",
    "atarashikunai": "新しくない",
    "atarashikatta": "新しかった",
    "kirei desu": "きれいです",
    "kirei janai desu": "きれいじゃないです",
    "kirei deshita": "きれいでした"
}
for romaji, japanese in grammar_examples.items():
    filename = romaji.lower().replace(" ", "_").replace("?", "")
    # Avoid overwriting existing entries
    if filename not in AUDIO_MAP:
        AUDIO_MAP[filename] = japanese

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
