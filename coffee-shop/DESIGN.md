---
name: 十二号咖啡 No.12 Coffee
description: The street wall the shop hangs on; cobalt enamel door plates and street signs on grey-blue brick and limewash.
colors:
  cobalt-enamel: "#1d3c94"
  cobalt-deep: "#142c70"
  white-enamel: "#f5f6f2"
  signal-red: "#c42a1f"
  dark-iron: "#2a2d33"
  street-ink: "#172036"
  street-ink-soft: "#3b4866"
  limewash: "#e7eae6"
  mortar: "#b7bab4"
typography:
  display:
    fontFamily: "Plate Song, Songti SC, STSong, SimSun, serif"
    fontSize: "clamp(2.6rem, 6.2vw, 5.4rem)"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "0.32em"
  numeral:
    fontFamily: "Sign Gothic, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "clamp(6.5rem, 17vw, 12rem)"
    fontWeight: 700
    lineHeight: 0.9
    letterSpacing: "-0.02em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Plate Song, Songti SC, STSong, SimSun, serif"
    fontSize: "clamp(2.2rem, 4.2vw, 3.6rem)"
    fontWeight: 900
    lineHeight: 1.15
    letterSpacing: "0.06em"
  title:
    fontFamily: "Plate Song, Songti SC, STSong, SimSun, serif"
    fontSize: "clamp(1.7rem, 3vw, 2.4rem)"
    fontWeight: 900
    lineHeight: 1.2
    letterSpacing: "0.16em"
  subtitle:
    fontFamily: "Plate Song, Songti SC, STSong, SimSun, serif"
    fontSize: "1.3rem"
    fontWeight: 900
    lineHeight: 1.3
    letterSpacing: "0.2em"
  body:
    fontFamily: "PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans CJK SC, Source Han Sans SC, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Sign Gothic, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "0.3em"
  price:
    fontFamily: "Sign Gothic, PingFang SC, Microsoft YaHei, sans-serif"
    fontSize: "20px"
    fontWeight: 700
    fontFeature: "tnum"
rounded:
  focus: "6px"
  tag: "6px"
  button: "12px"
  plate-sm: "14px"
  plate: "22px"
  plate-board: "26px"
  plate-door: "30px"
spacing:
  gutter: "clamp(16px, 4vw, 48px)"
  section: "clamp(72px, 11vw, 140px)"
  plate-inset-sm: "8px"
  plate-inset: "14px"
  plate-inset-door: "18px"
  container: "1240px"
components:
  plate-cobalt:
    backgroundColor: "{colors.cobalt-enamel}"
    textColor: "{colors.white-enamel}"
    rounded: "{rounded.plate}"
  plate-white:
    backgroundColor: "{colors.white-enamel}"
    textColor: "{colors.cobalt-enamel}"
    rounded: "{rounded.plate}"
  plate-red-open:
    backgroundColor: "{colors.signal-red}"
    textColor: "{colors.white-enamel}"
    rounded: "{rounded.plate-sm}"
  plate-iron-closed:
    backgroundColor: "{colors.dark-iron}"
    textColor: "{colors.white-enamel}"
    rounded: "{rounded.plate-sm}"
  title-plate:
    backgroundColor: "{colors.cobalt-enamel}"
    textColor: "{colors.white-enamel}"
    typography: "{typography.title}"
    rounded: "{rounded.plate-sm}"
    padding: "14px 26px 12px"
  arrow-sign:
    backgroundColor: "{colors.cobalt-enamel}"
    textColor: "{colors.white-enamel}"
    padding: "22px 52px 20px 24px"
  arrow-sign-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-blue:
    backgroundColor: "{colors.cobalt-enamel}"
    textColor: "{colors.white-enamel}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
    height: "48px"
  button-blue-hover:
    backgroundColor: "{colors.cobalt-deep}"
  button-line:
    backgroundColor: "transparent"
    textColor: "{colors.cobalt-enamel}"
    rounded: "{rounded.button}"
    padding: "10px 20px"
    height: "48px"
  tag:
    backgroundColor: "transparent"
    textColor: "{colors.cobalt-enamel}"
    rounded: "{rounded.tag}"
    padding: "2px 10px"
---

# Design System: 十二号咖啡 No.12 Coffee

## Overview

**Creative North Star: "The Street Wall"**

The shop's address is its brand, so the page is the wall the shop hangs on. Every piece of key content is lettered onto a vitreous-enamel plate: a cobalt door plate for the address, white enamel boards for the price list and the address card, a two-sided red/iron hanging sign for live status, a street-sign arrow for the way in. Plates are physical objects: rounded corners, a white inner rule, four slotted screws, chipped edges showing dark iron and rust, and a soft cast shadow on the wall behind them.

The wall itself changes with the visitor's position. Outside (the hero and 怎么来) it is grey-blue 青砖 brick with recessed mortar. Inside (价目 / 豆单 / 店里) it is a limewashed 粉墙 interior whose plaster has fallen away in places to show the same brick beneath, so the two grounds read as one building. Nothing floats on a blank field; every plate hangs on a wall.

Lettering follows real Chinese street signage: a heavy Song face for the characters, a condensed highway-sign gothic for pinyin, numerals and plate codes, and the system CJK sans for anything that is meant to be read rather than seen. Density is low and signage-like; the page is legible on a phone in daylight.

**Key Characteristics:**
- Cobalt enamel is the voice; white enamel is the secondary board; signal red appears only for the live open state and "you are here".
- Every content block is a plate with an inner rule, or sits on one.
- Two wall grounds only: brick for the street, limewash with plaster losses for the interior.
- Heavy Song characters with widely tracked Latin sign lettering beside or under them.
- Motion is physical and once: plates settle with a pendulum swing; the hours sign flips on its hook.

## Colors

A cobalt-and-white enamel palette on cool grey masonry, with one signal red reserved for live status.

### Primary
- **Cobalt Enamel** (`cobalt-enamel`): the default plate color, the street-name nav strip, title plates, the arrow sign, the primary button, price numerals and blue headings on white boards. Also the theme color, selection, scrollbar thumb, caret and accent color.
- **Deep Cobalt** (`cobalt-deep`): hover state for cobalt actions (arrow sign, primary button). Never a resting surface.

### Secondary
- **Signal Red** (`signal-red`): the open face of the hanging hours sign, today's row in the hours list, the "本站" stop on the bean route and its tag, and the "示范页面" label. It always means "now" or "here".

### Neutral
- **White Enamel** (`white-enamel`): lettering on cobalt, red and iron plates; the ground of white plates; the focus ring's inner outline.
- **Dark Iron** (`dark-iron`): the closed face of the hours sign, and the exposed metal in chips.
- **Street Ink** (`street-ink`): body text on white plates and limewash.
- **Street Ink Soft** (`street-ink-soft`): secondary text (ledes, item notes, metadata).
- **Limewash** (`limewash`): page background colour and scrollbar track; the plaster tile itself sits at a slightly darker `#e2e5e0` base.
- **Mortar** (`mortar`): base colour under the brick tile, showing through the joints.

The brick tones (`#727a7f` to `#8f9699`) and plaster tones live in the generator scripts `assets/brick.py` and `assets/plaster.py`, not in CSS. Change them there and regenerate the SVGs.

### Named Rules
**The Live Red Rule.** Signal red marks only live state or location: open now, today, this stop. It is never decoration and never a second brand color.

**The Closed Is Iron Rule.** The hours sign shows signal red when open and dark iron when closed (before opening, after closing, rest day). Do not show a red plate when the shop is closed.

## Typography

**Display Font:** Plate Song, a self-hosted subset of Noto Serif SC at 700 and 900 (fallback Songti SC, STSong, SimSun, serif)
**Sign Font:** Sign Gothic, a self-hosted subset of Barlow Semi Condensed at 500, 600 and 700 (fallback PingFang SC, Microsoft YaHei, sans-serif)
**Body Font:** the system CJK sans (PingFang SC, Hiragino Sans GB, Microsoft YaHei, Noto Sans CJK SC, Source Han Sans SC)

**Character:** Heavy Song characters read as painted enamel lettering; the condensed gothic carries the bilingual sign line, numerals and plate codes the way municipal signs do. Reading text stays in the system sans so it renders crisply at small sizes outdoors.

Both lettering faces are subsets in `assets/fonts/` (see its README), cut with the Google Fonts `text=` parameter to the characters used on the page. Any new or changed Chinese text requires regenerating the serif subsets; otherwise new characters silently fall back to the system Song face.

### Hierarchy
- **Display** (Plate Song 900, `display`): the road name on the door plate, tracked 0.32em with matching text-indent so it centres optically.
- **Numeral** (Sign Gothic 700, `numeral`, tabular): the house number. Paired with a Plate Song 900 "号" at about 40% of its size.
- **Headline** (Plate Song 900, `headline`): the H1 shop name on the white signboard.
- **Title** (Plate Song 900, `title`): section names on title plates.
- **Subtitle** (Plate Song 900, around 1.15 to 1.5rem, tracking 0.04 to 0.2em): board column heads, stop names, notice heads, street-sign names.
- **Hook** (Plate Song 700, 1.15 to 1.4rem, line-height 1.55): the one-line promise on the signboard.
- **Body** (system sans 400, 17px, line-height 1.7): reading text. Ledes cap at 34em; secondary text drops to 13 to 16px in `street-ink-soft`.
- **Label** (Sign Gothic 600 or 700, 11 to 17px, tracking 0.2 to 0.42em, uppercase): pinyin and English sign lines (WUTONG LU, PRICE LIST, OPEN).
- **Price** (Sign Gothic 700, 17 to 26px, tabular): prices, hours, stop numbers.

### Named Rules
**The Bilingual Sign Rule.** A lettered plate pairs Plate Song characters with a smaller tracked Sign Gothic line (pinyin or English) beside or below, as on real street signs. Wide tracking is reserved for this short uppercase Latin line and for display characters; reading text is never tracked.

**The Numbers Are Sign Gothic Rule.** Prices, hours, house and stop numbers are set in Sign Gothic with tabular figures.

## Layout

A single centred container (`container`, up to 1240px) with fluid side gutters (`gutter`) and generous fluid section padding (`section`). Each section opens with a small cobalt title plate, optionally a lede, then one or two large plates.

- **Hero:** full-bleed brick, at least one small viewport tall (`100svh`). A street-name sign strip spans the top as navigation. Below, a 7:5 grid places the door plate on the left across two rows, with the white signboard and a two-column "signs" row (hanging hours sign plus arrow sign) on the right.
- **Price list:** 8:4 grid of a white board (two columns of dotted-leader price rows) and the hanging signature plate.
- **Beans:** a white "bus-stop" board with a cobalt band and a four-stop route line.
- **Visit:** brick again; a 5:7 grid of a signpost (pole with three offset street signs) and the white address card.

### Responsive rules
- **≤900px:** hero, price, and visit grids collapse to one column in reading order door plate, signboard, signs. The signature plate moves above the price board. The bean route turns vertical with the line running down the left. The signpost moves below the address card and shortens to 330px. The door plate tightens to 24px radius, 14px inset, 3px rule.
- **≤720px:** house notes go to one column.
- **≤640px:** the nav strip drops the 梧桐路 brand block and spreads the four section links across the strip; the price board goes to one column with an 11px inset.
- **≤560px:** fixed sizes replace the hero clamps (door road 2.2rem, numeral 5.4rem, H1 2rem) so door plate, signboard and both signs fit the first viewport; chips shrink (edge 62×24, corner 46×46).
- **≤420px:** the hours sign and arrow sign stay side by side at equal width; the arrow tip shortens from 44px to 30px; street signs on the post shrink.

## Elevation & Depth

Depth is physical: plates are objects mounted on a wall and cast one soft shadow onto it. There is no tonal layering and no stacked card hierarchy; the only depth levels are wall, plate, and hardware (screws, nails, chips) on the plate.

### Shadow Vocabulary
- **Plate on wall** (`0 1px 1px rgba(12,16,26,.35), 0 14px 26px -12px rgba(12,16,26,.6)`, plus `inset 0 0 0 1.5px rgba(0,0,0,.22)` as the enamel's pressed rim): every plate.
- **Arrow sign** (`drop-shadow(0 1px 1px rgba(12,16,26,.35)) drop-shadow(0 12px 14px rgba(12,16,26,.38))`): the clipped arrow, where box-shadow would be cut off.
- **Button** (`0 1px 1px rgba(12,16,26,.3), 0 8px 14px -8px rgba(12,16,26,.55)`): the primary button only.
- **Enamel sheen** (a 162deg white highlight to 34% plus a faint bottom darkening): painted over every plate face, above the lettering.

### Named Rules
**The One Wall Rule.** Shadows describe a plate hanging on a wall lit from above. Shadows are soft and drop downward. Nothing floats above another plate.

## Shapes

Enamel plates have generously rounded rectangles (`plate-sm` 14px to `plate-door` 30px), with an inner rule inset from the edge whose radius is the plate radius minus 4px. Larger plates get larger radius, inset and rule together: small (14 / 8 / 2px), default (22 / 14 / 3px), board (26 / 16 / 3px), door (30 / 18 / 4px). The arrow sign is the one non-rectangular plate: a clipped pentagon with a 44px point and two nested inner outlines. Hardware is round: screws (10px), nails (14px), route stop dots (38px). Interactive controls use smaller radii (buttons 12px, tags and focus rings 6px) so they read as fittings rather than plates.

## Components

### Enamel Plate (signature)
The single container of the system. Cobalt by default, with white (`plate--white`), signal red, and dark iron variants, and a small size.
- **Inner rule:** a continuous `currentColor` border inset from the edge, so it always matches the lettering (white on cobalt, cobalt on white).
- **Screws:** four slotted steel screws, one per corner, centred on the inner rule (inset minus 4px), each slot at a different angle, ringed with a thin rust halo. Large standalone plates get screws; title plates, the nav strip, footer plates, street signs and the hanging signs do not.
- **Chips:** occasional chipped edges or corners exposing dark iron with a rust core (an SVG noise "oxide" filter), at most one or two per plate and only on large plates. One plate carries a rust streak running down the wall below a chip.
- **Lettering:** Plate Song characters plus a Sign Gothic line, per the Bilingual Sign Rule.

### Title Plate
A small cobalt plate, inline-sized to its content, holding the section name in Plate Song and its English sign line in Sign Gothic. It opens every section.

### Street-Name Sign Nav
A full-width small cobalt plate: brand block 梧桐路 / WUTONG LU on the left, four section links on the right, each a character label over a tracked English line. Hover is a 12% white wash inside an 8px rounded hit area.

### Hanging Hours Sign
A small plate hung from a nail by a two-strand cord. It is a real two-sided button: the front shows live state (营业中 / 还没开门 / 已打烊 / 休息中 with OPEN or CLOSED and today's detail), red when open and iron when closed, re-rendered every minute; tapping flips it (0.8s rotateY with the standard ease) to a white back carrying the weekly hours. `aria-pressed` and per-face `aria-hidden` follow the flip. The same hanging mechanism holds the vertical signature-drink plate.

### Arrow Sign (primary action)
The cobalt street-direction sign "带我过去" with a pin icon line beneath, linking to the map. Hover darkens to deep cobalt and slides it 6px in the arrow's direction.

### Buttons
- **Shape:** fitted rounded rectangle (12px), at least 48px tall, 16px bold system sans with a 20px stroked icon.
- **Blue:** cobalt fill, white enamel text, button shadow; hover deep cobalt.
- **Line:** transparent with a 2px cobalt border and cobalt text; hover is an 8% cobalt wash.
- **Active:** 1px press down. **Focus:** the global ring, a 3px white-enamel outline plus a 6px cobalt halo.

### Tags
Small outlined cobalt labels (1.5px border, 6px radius, 13px medium) for drink options. A solid red variant marks "本站" on the route.

### Price Rows
Name, a 2px dotted cobalt leader at 45% opacity, and a Sign Gothic price in cobalt. A starred row sets the name in bold cobalt.

### Bus-Stop Route
White board with a cobalt band head; a 6px cobalt line joins numbered enamel dots (white fill, 4px cobalt ring, Sign Gothic number). The final stop is the shop, a red dot with a white centre and a soft red halo.

### Signpost
A steel pole with a cap carrying three offset small plates (two cobalt street names with arrows, one white metro sign), alternating left and right of the pole.

### Icons
Stroked inline SVG symbols, 24px grid, 2px round-capped stroke in `currentColor`: metro, bus, bike, car, pin, copy, arrow, turn.

### Motion
- **Swing:** hung plates (`data-swing`) swing once when 60% visible: a 1.8s damped pendulum (5°, -3°, 1.6°, -0.6°, 0) from a pivot 40px above the plate, with `cubic-bezier(.16,1,.3,1)`. It runs once per element and never loops.
- **Flip:** the hours sign's 0.8s rotateY described above.
- **State transitions:** 0.25s background and color transitions with the same ease; the arrow sign's slide is 0.35s.
- **Reduced motion:** no swing, instant flip, no transitions, no smooth scrolling.

## Do's and Don'ts

### Do:
- **Do** put every key fact on an enamel plate with its inner rule; choose cobalt for primary, white for secondary boards.
- **Do** scale the plate radius, inset and rule together using the four existing steps.
- **Do** pair Plate Song characters with a tracked Sign Gothic line on signs, and set all numbers in Sign Gothic with tabular figures.
- **Do** use brick for street-facing sections and limewash with plaster losses for interior sections.
- **Do** keep the hours sign driven by the live clock: red for open, iron for closed.
- **Do** regenerate the font subsets after editing Chinese text, and regenerate wall SVGs from their scripts rather than editing them by hand.
- **Do** honour `prefers-reduced-motion` for every new movement.

### Don't:
- **Don't** use signal red for anything except live state or location.
- **Don't** place a plate on a blank background; it always hangs on brick or limewash.
- **Don't** track body text or set reading paragraphs in Plate Song.
- **Don't** add looping or decorative motion; plates move only as hung objects settling or a sign being turned.
- **Don't** add more than one or two chips to a plate, or chip small plates; wear is evidence of age, not texture.
- **Don't** fabricate photos, reviews or ratings to fill a plate; demo content stays labelled as demo.
