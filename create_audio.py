import os
import sys
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
# 3. To generate a specific category: `python create_audio.py [hiragana|katakana|numbers|kanji|words|sentences|grammar]`
# 4. To generate a slice of a category: `python create_audio.py [category] --start [start_index] --end [end_index]`

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
    'da': 'だ', 'de': 'で', 'do': 'ど',
    'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
    'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ'
}

# Katakana (k_ prefix)
katakana_chars = {
    'a': 'ア', 'i': 'イ', 'u': 'ウ', 'e': 'エ', 'o': 'オ',
    'ka': 'カ', 'ki': 'キ', 'ku': 'ク', 'ke': 'ケ', 'ko': 'コ',
    'sa': 'サ', 'shi': 'シ', 'su': 'ス', 'se': 'セ', 'so': 'ソ',
    'ta': 'タ', 'chi': 'チ', 'tsu': 'ツ', 'te': 'テ', 'to': 'ト',
    'na': 'ナ', 'ni': 'ニ', 'nu': 'ヌ', 'ne': 'ネ', 'no': 'ノ',
    'ha': 'ハ', 'hi': 'ヒ', 'fu': 'フ', 'he': 'ヘ', 'ho': 'ホ',
    'ma': 'マ', 'mi': 'ミ', 'mu': 'ム', 'me': 'メ', 'mo': 'モ',
    'ya': 'ヤ', 'yu': 'ユ', 'yo': 'ヨ',
    'ra': 'ラ', 'ri': 'リ', 'ru': 'ル', 're': 'レ', 'ro': 'ロ',
    'wa': 'ワ', 'wo': 'ヲ', 'n': 'ン',
    'ga': 'ガ', 'gi': 'ギ', 'gu': 'グ', 'ge': 'ゲ', 'go': 'ゴ',
    'za': 'ザ', 'ji': 'ジ', 'zu': 'ズ', 'ze': 'ゼ', 'zo': 'ゾ',
    'da': 'ダ', 'de': 'デ', 'do': 'ド',
    'ba': 'バ', 'bi': 'ビ', 'bu': 'ブ', 'be': 'ベ', 'bo': 'ボ',
    'pa': 'パ', 'pi': 'ピ', 'pu': 'プ', 'pe': 'ペ', 'po': 'ポ'
}

# Numbers (num_ prefix)
numbers = {
    'ichi': '一', 'ni': '二', 'san': '三', 'shi': '四', 'go': '五', 'roku': '六', 'shichi': '七', 'hachi': '八', 'kyuu': '九', 'juu': '十',
    'juuichi': '十一', 'juuni': '十二', 'juusan': '十三', 'juushi': '十四', 'juugo': '十五', 'juuroku': '十六', 'juushichi': '十七', 'juuhachi': '十八', 'juukyuu': '十九', 'nijuu': '二十',
    'nijuuichi': '二十一', 'nijuuni': '二十二', 'nijuusan': '二十三', 'nijuushi': '二十四', 'nijuugo': '二十五', 'nijuuroku': '二十六', 'nijuushichi': '二十七', 'nijuuhachi': '二十八', 'nijuukyuu': '二十九', 'sanjuu': '三十',
    'sanjuuichi': '三十一', 'sanjuuni': '三十二', 'sanjuusan': '三十三', 'sanjuushi': '三十四', 'sanjuugo': '三十五', 'sanjuuroku': '三十六', 'sanjuushichi': '三十七', 'sanjuuhachi': '三十八', 'sanjuukyuu': '三十九', 'yonjuu': '四十',
    'yonjuuichi': '四十一', 'yonjuuni': '四十二', 'yonjuusan': '四十三', 'yonjuushi': '四十四', 'yonjuugo': '四十五', 'yonjuuroku': '四十六', 'yonjuushichi': '四十七', 'yonjuuhachi': '四十八', 'yonjuukyuu': '四十九', 'gojuu': '五十',
    'gojuuichi': '五十一', 'gojuuni': '五十二', 'gojuusan': '五十三', 'gojuushi': '五十四', 'gojuugo': '五十五', 'gojuuroku': '五十六', 'gojuushichi': '五十七', 'gojuuhachi': '五十八', 'gojuukyuu': '五十九', 'rokujuu': '六十',
    'rokujuuichi': '六十一', 'rokujuuni': '六十二', 'rokujuusan': '六十三', 'rokujuushi': '六十四', 'rokujuugo': '六十五', 'rokujuuroku': '六十六', 'rokujuushichi': '六十七', 'rokujuuhachi': '六十八', 'rokujuukyuu': '六十九', 'nanajuu': '七十',
    'nanajuuichi': '七十一', 'nanajuuni': '七十二', 'nanajuusan': '七十三', 'nanajuushi': '七十四', 'nanajuugo': '七十五', 'nanajuuroku': '七十六', 'nanajuushichi': '七十七', 'nanajuuhachi': '七十八', 'nanajuukyuu': '七十九', 'hachijuu': '八十',
    'hachijuuichi': '八十一', 'hachijuuni': '八十二', 'hachijuusan': '八十三', 'hachijuushi': '八十四', 'hachijuugo': '八十五', 'hachijuuroku': '八十六', 'hachijuushichi': '八十七', 'hachijuuhachi': '八十八', 'hachijuukyuu': '八十九', 'kyuujuu': '九十',
    'kyuujuuichi': '九十一', 'kyuujuuni': '九十二', 'kyuujuusan': '九十三', 'kyuujuushi': '九十四', 'kyuujuugo': '九十五', 'kyuujuuroku': '九十六', 'kyuujuushichi': '九十七', 'kyuujuuhachi': '九十八', 'kyuujuukyuu': '九十九', 'hyaku': '百'
}

# Kanji (kanji_ prefix)
kanji_data = {
    '金': 'kin', '土': 'do', '曜': 'you', '上': 'ue', '下': 'shita', '中': 'naka', '半': 'han', '山': 'yama', '川': 'kawa', '元': 'gen',
    '気': 'ki', '天': 'ten', '私': 'watashi', '今': 'ima', '田': 'ta', '女': 'onna', '男': 'otoko', '見': 'mi', '行': 'i', '食': 'ta', '飲': 'no',
    '語': 'go', '本': 'hon', '学生': 'gakusei', '学校': 'gakkou', '先生': 'sensei', '友': 'tomo', '達': 'dachi', '何': 'nan', '毎': 'mai', '朝': 'asa',
    '昼': 'hiru', '晩': 'ban', '時': 'toki', '分': 'fun', '国': 'kuni', '人': 'jin', '会': 'a', '社': 'sha', '員': 'in',
    '医': 'i', '者': 'sha', '大': 'dai', '学': 'gaku', '高': 'kou', '校': 'kou', '小': 'shou', '中': 'chuu', '電': 'den', '車': 'sha',
    '自': 'ji', '転': 'ten', '乗': 'no', '駅': 'eki', '銀': 'gin', '郵': 'yuu', '便': 'bin', '局': 'kyoku', '図': 'to',
    '書': 'sho', '館': 'kan', '映': 'ei', '画': 'ga', '右': 'migi', '左': 'hidari', '前': 'mae', '後': 'ushiro', '外': 'soto', '東': 'higashi',
    '西': 'nishi', '南': 'minami', '北': 'kita', '名': 'na', '父': 'chichi', '母': 'haha', '子': 'ko', '供': 'domo', '犬': 'inu',
    '猫': 'neko', '鳥': 'tori', '魚': 'sakana', '花': 'hana', '肉': 'niku', '野菜': 'yasai', '果物': 'kudamono', '水': 'mizu', '茶': 'cha', '牛': 'gyuu',
    '乳': 'nyuu', '来': 'ki', '帰': 'kae', '聞': 'ki', '読': 'yo', '書': 'ka', '話': 'hana', '買': 'ka', '起': 'o', '寝': 'ne',
    '勉': 'ben', '強': 'kyou', '働': 'hatara', '休': 'yasu', '言': 'i', '思': 'omo', '知': 'shi', '入': 'hai', '出': 'de',
    '待': 'ma', '作': 'tsuku', '使': 'tsuka', '同': 'ona', '楽': 'tano', '好': 'su', '嫌': 'kira', '上手': 'jouzu', '下手': 'heta',
    '病': 'byou', '院': 'in', '薬': 'kusuri', '速': 'haya', '遅': 'oso', '近': 'chika', '遠': 'too', '広': 'hiro',
    '狭': 'sema', '明': 'aka', '暗': 'kura', '暑': 'atsu', '寒': 'samu', '暖': 'atata', '涼': 'suzu', '静': 'shizu', '賑': 'nigi', '有名': 'yuumei',
    '親切': 'shinsetsu', '便利': 'benri', '不便': 'fuben', '元気': 'genki', '綺麗': 'kirei', '汚': 'kitana', '可愛': 'kawaii', '赤': 'aka', '青': 'ao', '白': 'shiro',
    '黒': 'kuro', '色': 'iro', '春': 'haru', '夏': 'natsu', '秋': 'aki', '冬': 'fuyu', '雨': 'ame', '雪': 'yuki', '風': 'kaze', '晴': 'ha',
    '曇': 'kumo', '空': 'sora', '海': 'umi', '池': 'ike', '庭': 'niwa', '店': 'mise', '道': 'michi',
    '部屋': 'heya', '家': 'ie', '会社': 'kaisha', '電話': 'denwa', '番号': 'bangou', '机': 'tsukue', '椅子': 'isu', '鞄': 'kaban', '靴': 'kutsu', '鉛筆': 'enpitsu',
    '時計': 'tokei', '写真': 'shashin', '自転車': 'jitensha', '飛行機': 'hikouki', '船': 'fune', '電車': 'densha', '地下鉄': 'chikatetsu', '新幹線': 'shinkansen', '切符': 'kippu',
    'お金': 'okane', '時間': 'jikan', '今日': 'kyou', '昨日': 'kinou', '今週': 'konshuu', '来週': 'raishuu', '先週': 'senshuu', '今年': 'kotoshi', '来年': 'rainen',
    '去年': 'kyonen', '誰': 'dare', '何処': 'doko', '何時': 'itsu', '何故': 'naze', '如何': 'dou', '一': 'hito'
}

# Words (word_ prefix)
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

# Sentences (sentence_ prefix)
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

# Grammar (no prefix)
grammar_data = {
    'watashi_wa_ringo_o_tabemasu': '私はリンゴを食べます',
    'yomimasu': '読みます',
    'tabemasu': '食べます',
    'shimasu': 'します',
    'atarashii': '新しい',
    'atarashikunai': '新しくない',
    'atarashikatta': '新しかった',
    'kirei_desu': 'きれいです',
    'kirei_janai_desu': 'きれいじゃないです',
    'kirei_deshita': 'きれいでした'
}


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

    target_category = None
    start_index = 0
    end_index = None

    if len(sys.argv) > 1:
        target_category = sys.argv[1]
        if '--start' in sys.argv:
            start_index = int(sys.argv[sys.argv.index('--start') + 1])
        if '--end' in sys.argv:
            end_index = int(sys.argv[sys.argv.index('--end') + 1])


    if target_category is None or target_category == 'hiragana':
        print("--- Generating Hiragana ---")
        items = list(hiragana_chars.items())[start_index:end_index]
        for key, value in items:
            generate_audio(value, f"h_{key}")
        if start_index == 0 and end_index is None:
            generate_audio('ぢ', 'h_dji')
            generate_audio('づ', 'h_dzu')

    if target_category is None or target_category == 'katakana':
        print("--- Generating Katakana ---")
        items = list(katakana_chars.items())[start_index:end_index]
        for key, value in items:
            generate_audio(value, f"k_{key}")
        if start_index == 0 and end_index is None:
            generate_audio('ヂ', 'k_dji')
            generate_audio('ヅ', 'k_dzu')

    if target_category is None or target_category == 'numbers':
        print("--- Generating Numbers ---")
        items = list(numbers.items())[start_index:end_index]
        for key, value in items:
            generate_audio(value, f"num_{key}")

    if target_category is None or target_category == 'kanji':
        print("--- Generating Kanji ---")
        items = list(kanji_data.items())[start_index:end_index]
        for japanese, romaji in items:
            generate_audio(japanese, f"kanji_{romaji}")

    if target_category is None or target_category == 'words':
        print("--- Generating Words ---")
        items = list(words_data.items())[start_index:end_index]
        for japanese, romaji in items:
            filename = romaji.lower().replace(" ", "_").replace("...", "desu").replace("?", "")
            generate_audio(japanese, f"word_{filename}")

    if target_category is None or target_category == 'sentences':
        print("--- Generating Sentences ---")
        items = list(sentences_data.items())[start_index:end_index]
        for japanese, romaji in items:
            text_to_speak = japanese.replace('...', '、')
            filename = romaji.lower().replace(" ", "_").replace("...", "desu").replace("?", "")
            generate_audio(text_to_speak, f"sentence_{filename}")

    if target_category is None or target_category == 'grammar':
        print("--- Generating Grammar ---")
        items = list(grammar_data.items())[start_index:end_index]
        for filename, japanese in items:
            generate_audio(japanese, filename)


    print("\nAudio generation script finished.")
    print(f"Please check the '{AUDIO_DIR}' directory for the generated MP3 files.")

if __name__ == "__main__":
    main()
