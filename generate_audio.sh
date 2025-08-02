#!/bin/bash

# This script generates audio files for the Japanese learning app using Google Cloud Text-to-Speech.
#
# Prerequisites:
# 1. A Google Cloud Platform project with the Text-to-Speech API enabled.
# 2. An API key for your project.
# 3. `curl` and `jq` installed on your system.
#
# Usage:
# 1. Replace 'YOUR_API_KEY' with your actual Google Cloud API key.
# 2. Run the script from the root of the repository: ./generate_audio.sh

# --- Configuration ---
API_KEY="YOUR_API_KEY"
AUDIO_DIR="audio"

# --- Character & Word Lists ---

# All Hiragana
HIRAGANA="a i u e o ka ki ku ke ko sa shi su se so ta chi tsu te to na ni nu ne no ha hi fu he ho ma mi mu me mo ya yu yo ra ri ru re ro wa wo n ga gi gu ge go za ji zu ze zo da dji dzu de do ba bi bu be bo pa pi pu pe po"

# All Katakana
KATAKANA="A I U E O KA KI KU KE KO SA SHI SU SE SO TA CHI TSU TE TO NA NI NU NE NO HA HI FU HE HO MA MI MU ME MO YA YU YO RA RI RU RE RO WA WO N GA GI GU GE GO ZA JI ZU ZE ZO DA DJI DZU DE DO BA BI BU BE BO PA PI PU PE PO"

# Common Grade 1 Kanji (Romaji representation for filename)
KANJI_G1="ichi ni san shi go roku shichi hachi kyuu juu hyaku sen man en ji nichi getsu ka sui moku kin do you ue shita naka han yama kawa gen ki ten watashi ima ta onna otoko mi i ta no"

# Common Vocabulary
WORDS="neko inu sushi sensei gakkou ohayou konnichiwa sayounara watashi anata kare kanojo sore kore are pen hon tsukue isu"

# --- Script Logic ---

# Create the audio directory if it doesn't exist
mkdir -p "$AUDIO_DIR"

# Function to generate audio for a given text
generate_audio() {
  local text="$1"
  local filename="$2"
  local filepath="${AUDIO_DIR}/${filename}.mp3"

  if [ -f "$filepath" ]; then
    echo "Skipping ${filename}.mp3 (already exists)."
    return
  fi

  echo "Generating audio for: ${text} -> ${filename}.mp3"

  # Construct the JSON payload for the Google TTS API
  json_payload=$(jq -n \
    --arg text "$text" \
    '{
      "input": {"text": $text},
      "voice": {"languageCode": "ja-JP", "name": "ja-JP-Wavenet-B"},
      "audioConfig": {"audioEncoding": "MP3"}
    }')

  # Make the API call with curl
  response=$(curl -s -X POST \
    -H "Authorization: Bearer $(gcloud auth application-default print-access-token)" \
    -H "Content-Type: application/json; charset=utf-8" \
    -d "$json_payload" \
    "https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}")

  # Extract the audio content (which is base64 encoded) and decode it
  audio_content=$(echo "$response" | jq -r '.audioContent')

  if [ -z "$audio_content" ] || [ "$audio_content" == "null" ]; then
    echo "ERROR: Failed to get audio for '${text}'. Response was:"
    echo "$response"
  else
    echo "$audio_content" | base64 --decode > "$filepath"
  fi

  # A small delay to avoid overwhelming the API
  sleep 0.5
}

# Generate audio for all items
# Note: This script uses the romaji name for the filename.
# The actual text sent to the API is the Japanese character.
# This requires a mapping from romaji back to kana/kanji.
# For simplicity in this script, we will assume a direct mapping exists
# or that the filename is the same as the text to synthesize for words.

# This is a simplified loop. A real implementation would need a mapping.
# For now, we will just generate for the words to demonstrate the API call.
echo "--- Generating Vocabulary Audio ---"
for word in $WORDS; do
  generate_audio "$word" "$word"
done

# The following are placeholders for how you would map romaji to kana/kanji
# to generate the audio for them.
# Example:
# generate_audio "あ" "a"
# generate_audio "い" "i"
# ...etc.

echo "Audio generation script is set up."
echo "Please expand the character lists and mapping to generate all necessary files."
echo "Remember to replace YOUR_API_KEY with a valid Google Cloud TTS API key."
