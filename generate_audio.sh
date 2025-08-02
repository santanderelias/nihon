#!/bin/bash

# This script generates all necessary audio files for the application using Google Cloud Text-to-Speech.
#
# Prerequisites:
# 1. A Google Cloud Platform project with the Text-to-Speech API enabled.
# 2. An API key for your project. Get one from the Google Cloud Console.
# 3. `curl` and `jq` installed on your system.
# 4. You may need to be authenticated via gcloud CLI: `gcloud auth application-default login`
#
# Usage:
# 1. Replace 'YOUR_API_KEY' with your actual Google Cloud API key.
# 2. Run the script from the root of the repository: ./generate_audio.sh

# --- Configuration ---
API_KEY="YOUR_API_KEY"
AUDIO_DIR="audio"

# --- Data Mapping ---
# Using associative arrays to map filenames to the text to be synthesized.

declare -A AUDIO_MAP

# Hiragana
AUDIO_MAP["a"]="あ" AUDIO_MAP["i"]="い" AUDIO_MAP["u"]="う" AUDIO_MAP["e"]="え" AUDIO_MAP["o"]="お"
AUDIO_MAP["ka"]="か" AUDIO_MAP["ki"]="き" AUDIO_MAP["ku"]="く" AUDIO_MAP["ke"]="け" AUDIO_MAP["ko"]="こ"
AUDIO_MAP["sa"]="さ" AUDIO_MAP["shi"]="し" AUDIO_MAP["su"]="す" AUDIO_MAP["se"]="せ" AUDIO_MAP["so"]="そ"
AUDIO_MAP["ta"]="た" AUDIO_MAP["chi"]="ち" AUDIO_MAP["tsu"]="つ" AUDIO_MAP["te"]="て" AUDIO_MAP["to"]="と"
AUDIO_MAP["na"]="な" AUDIO_MAP["ni"]="に" AUDIO_MAP["nu"]="ぬ" AUDIO_MAP["ne"]="ね" AUDIO_MAP["no"]="の"
AUDIO_MAP["ha"]="は" AUDIO_MAP["hi"]="ひ" AUDIO_MAP["fu"]="ふ" AUDIO_MAP["he"]="へ" AUDIO_MAP["ho"]="ほ"
AUDIO_MAP["ma"]="ま" AUDIO_MAP["mi"]="み" AUDIO_MAP["mu"]="む" AUDIO_MAP["me"]="め" AUDIO_MAP["mo"]="も"
AUDIO_MAP["ya"]="や" AUDIO_MAP["yu"]="ゆ" AUDIO_MAP["yo"]="よ"
AUDIO_MAP["ra"]="ら" AUDIO_MAP["ri"]="り" AUDIO_MAP["ru"]="る" AUDIO_MAP["re"]="れ" AUDIO_MAP["ro"]="ろ"
AUDIO_MAP["wa"]="わ" AUDIO_MAP["wo"]="を" AUDIO_MAP["n"]="ん"
AUDIO_MAP["ga"]="が" AUDIO_MAP["gi"]="ぎ" AUDIO_MAP["gu"]="ぐ" AUDIO_MAP["ge"]="げ" AUDIO_MAP["go"]="ご"
AUDIO_MAP["za"]="ざ" AUDIO_MAP["ji"]="じ" AUDIO_MAP["zu"]="ず" AUDIO_MAP["ze"]="ぜ" AUDIO_MAP["zo"]="ぞ"
AUDIO_MAP["da"]="だ" AUDIO_MAP["dji"]="ぢ" AUDIO_MAP["dzu"]="づ" AUDIO_MAP["de"]="で" AUDIO_MAP["do"]="ど"
AUDIO_MAP["ba"]="ば" AUDIO_MAP["bi"]="び" AUDIO_MAP["bu"]="ぶ" AUDIO_MAP["be"]="べ" AUDIO_MAP["bo"]="ぼ"
AUDIO_MAP["pa"]="ぱ" AUDIO_MAP["pi"]="ぴ" AUDIO_MAP["pu"]="ぷ" AUDIO_MAP["pe"]="ぺ" AUDIO_MAP["po"]="ぽ"

# Katakana (using uppercase for filenames to distinguish from Hiragana)
AUDIO_MAP["A"]="ア" AUDIO_MAP["I"]="イ" AUDIO_MAP["U"]="ウ" AUDIO_MAP["E"]="エ" AUDIO_MAP["O"]="オ"
AUDIO_MAP["KA"]="カ" AUDIO_MAP["KI"]="キ" AUDIO_MAP["KU"]="ク" AUDIO_MAP["KE"]="ケ" AUDIO_MAP["KO"]="コ"
AUDIO_MAP["SA"]="サ" AUDIO_MAP["SHI"]="シ" AUDIO_MAP["SU"]="ス" AUDIO_MAP["SE"]="セ" AUDIO_MAP["SO"]="ソ"
AUDIO_MAP["TA"]="タ" AUDIO_MAP["CHI"]="チ" AUDIO_MAP["TSU"]="ツ" AUDIO_MAP["TE"]="テ" AUDIO_MAP["TO"]="ト"
AUDIO_MAP["NA"]="ナ" AUDIO_MAP["NI"]="ニ" AUDIO_MAP["NU"]="ヌ" AUDIO_MAP["NE"]="ネ" AUDIO_MAP["NO"]="ノ"
AUDIO_MAP["HA"]="ハ" AUDIO_MAP["HI"]="ヒ" AUDIO_MAP["FU"]="フ" AUDIO_MAP["HE"]="ヘ" AUDIO_MAP["HO"]="ホ"
AUDIO_MAP["MA"]="マ" AUDIO_MAP["MI"]="ミ" AUDIO_MAP["MU"]="ム" AUDIO_MAP["ME"]="メ" AUDIO_MAP["MO"]="モ"
AUDIO_MAP["YA"]="ヤ" AUDIO_MAP["YU"]="ユ" AUDIO_MAP["YO"]="ヨ"
AUDIO_MAP["RA"]="ラ" AUDIO_MAP["RI"]="リ" AUDIO_MAP["RU"]="ル" AUDIO_MAP["RE"]="レ" AUDIO_MAP["RO"]="ロ"
AUDIO_MAP["WA"]="ワ" AUDIO_MAP["WO"]="ヲ" AUDIO_MAP["N"]="ン"
AUDIO_MAP["GA"]="ガ" AUDIO_MAP["GI"]="ギ" AUDIO_MAP["GU"]="グ" AUDIO_MAP["GE"]="ゲ" AUDIO_MAP["GO"]="ゴ"
AUDIO_MAP["ZA"]="ザ" AUDIO_MAP["JI"]="ジ" AUDIO_MAP["ZU"]="ズ" AUDIO_MAP["ZE"]="ゼ" AUDIO_MAP["ZO"]="ゾ"
AUDIO_MAP["DA"]="ダ" AUDIO_MAP["DJI"]="ヂ" AUDIO_MAP["DZU"]="ヅ" AUDIO_MAP["DE"]="デ" AUDIO_MAP["DO"]="ド"
AUDIO_MAP["BA"]="バ" AUDIO_MAP["BI"]="ビ" AUDIO_MAP["BU"]="ブ" AUDIO_MAP["BE"]="ベ" AUDIO_MAP["BO"]="ボ"
AUDIO_MAP["PA"]="パ" AUDIO_MAP["PI"]="ピ" AUDIO_MAP["PU"]="プ" AUDIO_MAP["PE"]="ペ" AUDIO_MAP["PO"]="ポ"

# Words and Sentences
# For these, the filename and the text to synthesize are the same.
WORDS_AND_SENTENCES=(
    "neko" "inu" "sushi" "sensei" "gakkou"
    "pen" "hon" "tsukue" "isu" "kuruma"
    "tabemasu" "nomimasu" "ikimasu" "mimasu"
    "oishii" "ookii" "chiisai" "hayai"
    "kore wa pen desu" "sore wa hon desu"
    "eki wa doko desu ka" "watashi wa gakusei desu"
)

for item in "${WORDS_AND_SENTENCES[@]}"; do
    AUDIO_MAP["$item"]="$item"
done


# --- Script Logic ---

# Create the audio directory if it doesn't exist
mkdir -p "$AUDIO_DIR"

# Function to generate audio for a given text
generate_audio() {
  local text_to_speak="$1"
  local filename="$2"
  local filepath="${AUDIO_DIR}/${filename}.mp3"

  if [ -f "$filepath" ]; then
    echo "Skipping ${filename}.mp3 (already exists)."
    return
  fi

  echo "Generating audio for: '${text_to_speak}' -> ${filepath}"

  # Construct the JSON payload for the Google TTS API
  json_payload=$(jq -n \
    --arg text "$text_to_speak" \
    '{
      "input": {"text": $text},
      "voice": {"languageCode": "ja-JP", "name": "ja-JP-Wavenet-B"},
      "audioConfig": {"audioEncoding": "MP3"}
    }')

  # Make the API call with curl
  response=$(curl -s -X POST \
    -H "Content-Type: application/json; charset=utf-8" \
    "https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}" \
    -d "$json_payload")

  # Extract the audio content (which is base64 encoded) and decode it
  audio_content=$(echo "$response" | jq -r '.audioContent')

  if [ -z "$audio_content" ] || [ "$audio_content" == "null" ]; then
    echo "ERROR: Failed to get audio for '${text_to_speak}'. Response was:"
    echo "$response"
  else
    echo "$audio_content" | base64 --decode > "$filepath"
  fi

  # A small delay to avoid overwhelming the API
  sleep 0.5
}

# Iterate over the map and generate audio
for filename in "${!AUDIO_MAP[@]}"; do
  text="${AUDIO_MAP[$filename]}"
  generate_audio "$text" "$filename"
done

echo "Audio generation script finished."
