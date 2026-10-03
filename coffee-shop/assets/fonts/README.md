# Fonts (self-hosted subsets)

| File | Family | Weight | License |
| --- | --- | --- | --- |
| serif-700.woff2, serif-900.woff2 | Noto Serif SC | 700 / 900 | SIL Open Font License 1.1 |
| sign-500/600/700.woff2 | Barlow Semi Condensed | 500 / 600 / 700 | SIL Open Font License 1.1 |

Provenance: downloaded from the Google Fonts css2 API with the `text=` parameter, so each file contains only the characters used in `index.html` (all CJK characters on the page plus printable ASCII). Self-hosted because fonts.googleapis.com is unreliable for visitors in mainland China.

When you change any Chinese text on the page, regenerate the serif subsets, or new characters will fall back to the system Song face.
