#!/usr/bin/env bash
set -eu

FONTS=./public/fonts

if [[ -d "$FONTS" ]]; then
    exit 0
fi

mkdir -p "$FONTS"

echo "Downloading fonts... -> $(pwd)/public/fonts"

# Noto Sans JP - CJK統合漢字 CJK Unified Ideographs 日本語が描画可能に
curl -o "$FONTS/NotoSansJP.ttf" "https://cdn.jsdelivr.net/gh/googlefonts/noto-cjk@9241cec4a41a3832dfaaa75cd61d8f3be9c906fc/google-fonts/NotoSansJP\[wght\].ttf"
# Noto Sans Math - 数学用英数字記号 Mathematical Alphanumeric Symbols 𝒜𝓃𝓃𝒶ℳℴ𝒸𝒽𝒾𝓏 などが描画可能に
curl -o "$FONTS/NotoSansMath-Regular.ttf" "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@55773c3eb233b5a0eaa07de6226da189b136b4f0/fonts/NotoSansMath/hinted/ttf/NotoSansMath-Regular.ttf"
# Noto Sans Math - 基本ラテン文字 Basic Latin で下付き文字などが描画可能に
curl -o "$FONTS/NotoSans-Regular.ttf" "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@edf6e37d38c619d271397b01cb464f8976fac5a8/fonts/NotoSans/hinted/ttf/NotoSans-Regular.ttf"
# Noto Sans Symbols - boxed and circled letters, astronomical, chemical, and alchemical symbols https://notofonts.github.io/noto-docs/website/use/#:~:text=boxed%20and%20circled%20letters%2C%20astronomical%2C%20chemical%2C%20and%20alchemical%20symbols
curl -o "$FONTS/NotoSansSymbols-Regular.ttf" "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@1b2fe62733b83bdb2018a77978be2d7aa424fd43/fonts/NotoSansSymbols/hinted/ttf/NotoSansSymbols-Regular.ttf"
# Noto Sans Symbols 2 - Braille letters, dingbats, arrows, and chess symbols https://notofonts.github.io/noto-docs/website/use/#:~:text=Braille%20letters%2C%20dingbats%2C%20arrows%2C%20and%20chess%20symbols
curl -o "$FONTS/NotoSansSymbols2-Regular.ttf" "https://cdn.jsdelivr.net/gh/notofonts/notofonts.github.io@1b2fe62733b83bdb2018a77978be2d7aa424fd43/fonts/NotoSansSymbols2/hinted/ttf/NotoSansSymbols2-Regular.ttf"
