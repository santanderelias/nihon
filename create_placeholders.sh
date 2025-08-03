#!/bin/bash

# This script creates empty placeholder files for all audio assets.
# This is necessary for the service worker to be able to precache them.

AUDIO_DIR="audio"
mkdir -p "$AUDIO_DIR"

# --- Asset Lists ---
hiragana_audio="a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n ga gi gu ge go za ji zu ze zo da dji dzu de do ba bi bu be bo pa pi pu pe po"
katakana_audio="A I U E O KA KI KU KE KO SA SHI SU SE SO TA CHI TSU TE TO NA NI NU NE NO HA HI FU HE HO MA MI MU ME MO YA YU YO RA RI RU RE RO WA WO N_k GA GI GU GE GO ZA JI ZU ZE ZO DA DJI DZU DE DO BA BI BU BE BO PA PI PU PE PO"
kanji_audio="ichi ni san shi go roku shichi hachi kyuu juu hyaku sen man en ji nichi getsu ka sui moku kin do you ue shita naka han yama kawa gen ki ten watashi ima ta onna otoko mi i ta_eat no_drink"
words_audio="neko inu sushi sensei gakkou pen hon tsukue isu kuruma tabemasu nomimasu ikimasu mimasu oishii ookii chiisai hayai aka ao shiro kuro"
sentences_audio=(
    "kore wa pen desu" "sore wa hon desu"
    "eki wa doko desu ka" "watashi wa gakusei desu"
    "kore wa ikura desu ka" "menyuu o kudasai" "itadakimasu"
)
grammar_audio=(
    "Watashi wa ringo o tabemasu" "Ohayou gozaimasu" "Konnichiwa" "Konbanwa" "Sayounara" "Oyasuminasai"
    "Hajimemashite" "Douzo yoroshiku" "Ima nanji desu ka?" "Kyou wa nannichi desu ka?" "Ashita wa nanyoubi desu ka?"
    "Kinou" "Ashita" "Hai" "Iie" "Onegaishimasu" "Arigatou gozaimasu" "Sumimasen" "Gomennasai"
    "Menyuu o kudasai" "Kore o kudasai" "Okanjou o onegaishimasu" "Itadakimasu" "Gochisousama deshita"
    "Kore wa ikura desu ka?" "Kurejitto kaado wa tsukaemasu ka?" "Fukuro o kudasai" "Eki wa doko desu ka?"
    "Massugu itte kudasai" "Migi ni magatte kudasai" "Hidari ni magatte kudasai" "Kyou no tenki wa dou desu ka?"
    "Hare desu" "Kumori desu" "Ame desu" "Yuki desu" "Tasukete" "Kyuukyuusha o yonde kudasai"
    "Byouin wa doko desu ka?" "Kibun ga warui desu"
)

# --- Create Placeholders ---
echo "Creating placeholder audio files..."

for item in $hiragana_audio $katakana_audio $kanji_audio $words_audio; do
    touch "${AUDIO_DIR}/${item}.mp3"
done

for item in "${sentences_audio[@]}"; do
    touch "${AUDIO_DIR}/${item}.mp3"
done

for item in "${grammar_audio[@]}"; do
    filename=$(echo "$item" | tr '[:upper:]' '[:lower:]' | sed 's/ /_/g' | sed 's/?//g')
    touch "${AUDIO_DIR}/${filename}.mp3"
done

echo "Placeholder file creation complete."
