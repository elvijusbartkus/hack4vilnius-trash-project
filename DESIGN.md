---
name: Trage
description: On-demand household waste pickup for Vilnius private houses; the resident's one decision, confirmed in place.
colors:
  green: "#1f5a3c"
  green-muted: "#3f6b52"
  ink: "#1d211e"
  clay-deep: "#57534c"
  clay: "#a39e95"
  ground: "#d9d8d5"
  sheet: "#dcead2"
  sheet-hi: "#e9f2e3"
  sheet-lo: "#cfe2c3"
  rule: "#9bb38f"
typography:
  display:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "clamp(3rem, 7.5vw, 5.5rem)"
    fontWeight: 600
    lineHeight: 0.92
    letterSpacing: "-0.015em"
    fontFeature: "\"tnum\", \"lnum\""
  headline:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.75rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "\"tnum\", \"lnum\""
  title:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  value:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 600
    lineHeight: 1.5
    fontFeature: "\"tnum\", \"lnum\""
  body:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "\"tnum\", \"lnum\""
  caption:
    fontFamily: "Barlow, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.375
  stamp:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.5
    letterSpacing: "0.08em"
  wordmark:
    fontFamily: "Barlow Semi Condensed, Barlow, ui-sans-serif, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "0.14em"
rounded:
  stamp: "2px"
  control: "3px"
  panel: "4px"
spacing:
  ledger-gap: "4px"
  stack: "16px"
  panel: "20px"
  gutter: "24px"
  hero: "36px"
components:
  panel:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "20px 24px"
  hero:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
    padding: "28px 36px"
  button-on-green-primary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.green}"
    typography: "{typography.title}"
    rounded: "{rounded.panel}"
    padding: "0 28px"
    height: "56px"
  button-on-green-primary-hover:
    backgroundColor: "#ffffff"
    textColor: "{colors.green}"
  button-on-green-secondary:
    textColor: "{colors.sheet}"
    typography: "{typography.title}"
    rounded: "{rounded.panel}"
    padding: "0 28px"
    height: "56px"
  button-primary:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.panel}"
    padding: "0 24px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "#184a31"
    textColor: "{colors.sheet}"
  chip:
    backgroundColor: "{colors.sheet-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 14px"
    height: "44px"
  chip-selected:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
  day-cell:
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    height: "88px"
  day-cell-scheduled:
    backgroundColor: "{colors.sheet-lo}"
  day-cell-selected:
    backgroundColor: "{colors.green}"
    textColor: "{colors.sheet}"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    width: "28rem"
  address-switcher:
    backgroundColor: "{colors.sheet-hi}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 12px"
    height: "44px"
---

# Design System: Trage

## Overview

**Creative North Star: "The Route Manifest"**

Trage looks like the paperwork of a well-run collection service: light-green carbon-copy sheets laid separately on a neutral grey-clay desk, one deep-green slip on top that asks the evening question, and rubber stamps that press a status onto a date. It is calm logistics, not a dashboard. The resident's next pickup is one clear decision, answered in place and reversible from a toast, never through a dialog.

Density is moderate and legible for older house owners: values and dates in a semi-condensed transport grotesk at generous sizes, tabular figures everywhere, 44px minimum touch targets. Panels stay separate (their own surface, heading, and gap); only the hero is allowed to pop. Depth comes from tone, not shadow. Motion is mechanical and short: a stamp pressing down, a panel sliding in.

The user explicitly rejected merged manifest sheets, modal popups ("feel like scam ads"), the white-card SaaS dashboard, a stiff government portal, playful/gamified treatments, and eco clichés (leaves, recycling arrows, planets).

**Key Characteristics:**
- Grey-clay ground with separate light-green panels; exactly one deep-green hero per page.
- Barlow Semi Condensed for values, dates and headings; Barlow for running text; tabular lining figures site-wide.
- Status as a rotated rectangular stamp, never a pill badge.
- Shape-coded markers: shape carries meaning, colour only reinforces it.
- No modals; inline confirmation and an undo toast with a draining 8s bar.
- Small, consistent corners (2/3/4px); flat panels with a 1px green-grey rule.
- Authored 24px-grid SVG icons with 2px square-capped strokes.

## Colors

A pinned two-family palette: light green for paper and a deep forest green for action, laid on neutral grey clay, with clay greys for stamps and secondary text.

### Primary
- **Forest Waybill Green** (`green`): the only action colour. Hero surface, primary buttons, selected day cell, selected chip, focus rings, text selection, strong values (6.47:1 on sheet, 5.70:1 on ground; sheet on green 6.47:1, white on green 8.12:1). Its pressed/hover shade is the literal #184a31 on primary buttons.
- **Muted Ledger Green** (`green-muted`): captions, sub-headings and weekday labels on the sheet (4.87:1 on sheet, 5.32:1 on sheet-hi). Not for small text on sheet-lo (4.46:1).

### Neutral
- **Grey Clay Ground** (`ground`): page and header background; the desk the panels sit on.
- **Carbon-Copy Sheet** (`sheet`): every panel surface; also the text colour on green and on the ink toast.
- **Sheet Highlight** (`sheet-hi`): hovered fields, the address switcher, unselected chips, error notices.
- **Sheet Pressed** (`sheet-lo`): scheduled/booked day cells, the active listbox option, toast check and timer bar.
- **Field Rule** (`rule`): 1px panel borders (at 70%) and row dividers (at 60%). Decorative only, 1.81:1 on sheet; never text.
- **Stamp Clay** (`clay`): header bottom border, scrollbar, strike decoration, notice borders. Marks and borders only, never text (1.87:1 on ground).
- **Clay Deep** (`clay-deep`): secondary text, row labels, skipped-state strokes (6.10:1 on sheet, 5.36:1 on ground, 5.58:1 on sheet-lo).
- **Ink** (`ink`): body text (12.99:1 on sheet, 11.43:1 on ground) and the toast surface (sheet on ink 12.99:1).

`sand` survives in the stylesheet only as a legacy alias of `ground`; do not use it in new work.

### Named Rules
**The One Green Rule.** Deep green is the only action colour and the only saturated surface. One green hero per page; inside panels, green appears as a single primary button, a selected state, or a strong value.

**The Marks-Not-Text Rule.** `clay` and `rule` draw borders, strikes and dividers. Any text that must be read uses `ink`, `green`, `green-muted` or `clay-deep`.

## Typography

**Display Font:** Barlow Semi Condensed (with Barlow, ui-sans-serif)
**Body Font:** Barlow (with ui-sans-serif, system-ui)

**Character:** Barlow is modelled on highway and transport signage: low contrast, open, plain. The semi-condensed cut carries dates and numbers like a waybill; the regular cut carries sentences. Both load `latin-ext` for Lithuanian.

### Hierarchy
- **Display** (600, clamp(3rem, 7.5vw, 5.5rem), 0.92, -0.015em): the hero date only. While the evening question is open it steps down to clamp(2.5rem, 6vw, 4.25rem).
- **Headline** (600, 1.5rem rising to 1.75rem, leading-tight): the hero question "Rytoj išvežimas. Ar konteineris pilnas?"; the "Kitas: …" follow-up runs at 1.875rem; hero sublines at 1.25 to 1.5rem weight 500; day-panel date at 1.5rem.
- **Title** (600, 1.25rem): panel headings, hero buttons (1.25rem), panel primary buttons (1.125rem).
- **Value** (600, 1.05rem): right-aligned values in label/value rows; day numbers in the strip at 1.6rem with line-height 1.
- **Body** (Barlow 400, 1rem, 1.5): running text, row labels, notices.
- **Caption** (Barlow 500 to 600, 0.875rem): weekday labels, legend, small sub-headings, footnotes.
- **Stamp** (700, 1rem to 1.125rem, 0.08em, uppercase): status stamps only.
- **Wordmark** (700, 1.35rem, 0.14em, uppercase): "TRAGE" beside the mark, in green.

### Named Rules
**The Waybill Figures Rule.** `tabular-nums lining-nums` is set on the body; every date, count, price and kg value aligns in columns. Numbers and dates are set in Barlow Semi Condensed.

**The Uppercase-Is-Ink-On-Rubber Rule.** Uppercase letterspacing belongs to two things only: the stamp and the wordmark. Headings, labels and captions stay sentence case.

## Layout

A 1200px max container (12px side padding on phones, 32px from 768px). On desktop a 12-column grid: the left 8 columns stack the hero then the 14-day strip panel; the right 4 columns stack history, container, impact and help panels. Gaps are 24px between panels on desktop and 16px on phones, where the columns collapse to one source-ordered stack (hero, strip, history, container, impact, help). Panels pad 20px (24px horizontal from 768px); the hero pads 24px, then 36px by 28px on desktop. The 14-day strip is a 14-column grid with 4px gaps and a 620px minimum width; on phones it scrolls horizontally with a right-edge fade mask. Bottom padding of 128px keeps the toast from covering the last panel. Breakpoints are Tailwind's `sm` (640px) and `md` (768px).

## Elevation & Depth

Flat by default, depth by tone: ground is the desk, sheet panels sit on it with a 1px rule border, and the green hero lifts by colour. Only three shadows exist, each tied to a surface that genuinely floats or must pop.

### Shadow Vocabulary
- **Hero lift** (`box-shadow: 0 20px 40px -24px rgb(31 90 60 / 0.8)`): the deep-green hero only.
- **Dropdown float** (`box-shadow: 0 16px 32px -12px rgb(29 33 30 / 0.35)`): the address switcher's listbox.
- **Toast float** (`box-shadow: 0 16px 32px -12px rgb(29 33 30 / 0.5)`): the undo toast.

### Named Rules
**The Desk Rule.** Panels never carry a shadow. If a panel needs emphasis, it is the hero; there is only one.

## Shapes

Small, near-square corners, consistent by role: 2px on stamps, 3px on controls (chips, address switcher, toast and its button, listbox, day cells, avatar tile, notices), 4px on panels, the hero, and large buttons. The logo tile uses the same 4-in-32 corner. Borders are 1px for fields and panels, 2px for secondary buttons on green, 3px for the hero stamp. Stamps rotate -4deg; nothing else rotates. Strikethrough is a first-class shape: a skipped date is struck (6px on the hero, 2px elsewhere), not hidden.

Icons are authored on a 24px grid with a 2px stroke and square caps, matching the ruled lines; default size 20px.

## Components

### Buttons
Large, plain, and few: one primary per region.
- **Shape:** 4px corners; heights 56px (hero) and 52px (panel).
- **On-green primary:** sheet fill, green text, Barlow Semi Condensed 1.25rem 600, 28px horizontal padding; hover to white.
- **On-green secondary:** transparent with a 2px sheet border at 70%, sheet text; hover adds a white 10% wash.
- **Panel primary:** green fill, sheet text, 1.125rem 600, 24px padding; hover to #184a31.
- **Icon button:** 44px square, 4px corners, green-muted icon, sheet-hi hover.
- **Focus:** a 2px green outline at 2px offset everywhere; inside `.on-green` surfaces the ring turns sheet-coloured at 3px offset.
- When a previous pickup failed, the hero reorders its question buttons so "Taip, vežkite" becomes the primary.

### Chips
- **Style:** 44px tall, 3px corners, 14px padding, semibold Barlow; unselected is sheet-hi with a 1px rule border and ink text, hover border green-muted.
- **State:** selected is a green fill with sheet text and `aria-pressed`. Used for optional time windows.

### Cards / Containers
Panels are separate sheets: never merged, never nested.
- **Corner Style:** 4px.
- **Background:** sheet.
- **Shadow Strategy:** none (see The Desk Rule).
- **Border:** 1px rule at 70%.
- **Internal Padding:** 20px, 24px horizontal from 768px.
- **Heading:** each panel has its own `h2` in the title style; an optional action aligns on the heading baseline.
- **Rows:** label/value definition rows divided by 1px rule at 60%, label in clay-deep body, value right-aligned in the value style; green for done, clay-deep for skipped or failed.

### Inputs / Fields
- **Address switcher:** 44px trigger, sheet-hi fill, 1px clay border (green-muted on hover), 3px corners, chevron in green-muted. Opens a 22rem listbox on sheet with a rule border and the dropdown shadow; search input 48px tall, active option sheet-lo; arrow keys, Enter and Escape operate it. It is a combobox anchored to its trigger, not a modal.

### Navigation
- **Header:** ground background with a 1px clay bottom border. Left: the brand lockup and the address switcher. Right: resident name in clay-deep (hidden under 640px) and a 40px initials tile with a 1px green border, 3px corners, green Barlow Semi Condensed.
- **Brand lockup:** the 30px LogoMark (a bin with its lid lifted by a check, on a green 4px-corner tile) beside the wordmark "TRAGE" in the wordmark style.

### Hero (signature)
The one deep-green panel that pops. It carries the evening question itself while open ("Rytoj išvežimas. Ar konteineris pilnas?"), so the page asks it exactly once. Below the question: the date in Display, a stamp to its right, a plain sentence subline in sheet-lo, then actions above a 1px sheet rule at 25%. Skipped state strikes the date (sheet at 55%, 6px decoration) and states "Kitas: …" in white. A previous-failure note sits in a sheet-at-10% box with a sheet-at-40% border. State changes are announced through a polite live region.

### Status Stamp (signature)
Rectangular, 2px corners, uppercase stamp type, rotated -4deg. On green: 3px sheet border at 80%, sheet text. Keyed on status so each change re-presses: `stamp-press` 420ms on the expo-out curve, scale 1.35 to 0.96 to 1 with opacity in.

### Day Strip and Markers (signature)
Fourteen equal day cells (88px min height, 3px corners): weekday caption, day number in the value face at 1.6rem, marker. Scheduled and booked cells are sheet-lo; others are transparent with sheet-hi hover; today and unbookable days are disabled in clay-deep at reduced weight. The selected cell turns green with inverted markers. Left/right arrows move focus along the strip. A legend sits below in caption type.
- **Markers (14px):** filled square = scheduled; filled circle = booked extra; crossed square outline (clay-deep, 1.6px) = skipped; plus (green-muted, 1.8px, square caps) = bookable. Shape carries the meaning; colour only reinforces it.
- **Bookable pulse:** "Užsakyti papildomai" scrolls to the strip and pulses bookable cells twice with a 2px inset green ring (1.2s); reduced motion shows the ring statically.
- **Day panel:** selecting a day opens its detail under a 1px rule inside the same panel (not a nested card), sliding in over 220ms; one action, a close button, Escape closes.

### Toast (signature)
Ink surface, sheet text, 3px corners, max 28rem, bottom-centred on phones and bottom-right from 768px, with the toast shadow. A sheet-lo check icon, the message, an "Atšaukti" button (1px sheet border at 60%) and a Cmd/Ctrl+Z hint. A 4px sheet-lo bar drains over 8s and dismisses the toast when it ends; hover or focus pauses it. Cmd/Ctrl+Z undoes while the toast is visible, except inside text inputs. Undoing confirms with a short "Atšaukta. Viskas kaip buvo." toast. Reduced motion keeps the 8s timing but hides the bar.

### Motion
One curve, expo-out `cubic-bezier(0.16, 1, 0.3, 1)`: stamp-press 420ms; slip-in 220ms (opacity, 10px rise, 0.985 scale) for the day panel, listbox and desktop toast; slip-up 280ms from below for the toast on phones. Under `prefers-reduced-motion` every one of these becomes a 120ms fade.

## Do's and Don'ts

### Do:
- **Do** keep every panel a separate sheet on the grey-clay ground with its own heading and a 16px/24px gap.
- **Do** reserve deep green for actions, selection, focus and the single hero.
- **Do** confirm actions in place and offer undo through the toast (8s, pauses on hover/focus, Cmd/Ctrl+Z).
- **Do** ask the resident's question once, in the hero, in plain Lithuanian.
- **Do** set dates and numbers in Barlow Semi Condensed with tabular figures.
- **Do** encode status by shape (square, circle, crossed square, plus) and by stamp text, never by colour alone.
- **Do** switch focus rings to sheet colour inside `.on-green` surfaces.
- **Do** give every motion a 120ms fade fallback under reduced motion.

### Don't:
- **Don't** open modal dialogs or overlays for decisions or confirmations; the user found popups ad-like.
- **Don't** merge panels into one sheet or nest cards inside panels.
- **Don't** add a second green hero or shadows on ordinary panels.
- **Don't** use `clay` or `rule` for text.
- **Don't** show route jargon (stop counts, stop numbers, manifests) on the resident page `/`; route views belong to the separate driver app.
- **Don't** use pill badges for status; status is a rotated rectangular stamp.
- **Don't** use eco clichés (leaves, recycling arrows, planets), gamification, or generic SaaS white cards.
- **Don't** use icon fonts or stock icon packs; draw icons on the 24px, 2px square-cap grid.

## Palette update (2026-10-10): clay accent

The grey clay tokens were renamed `stone` (`#a39e95`, marks and borders) and `stone-deep` (`#57534c`, secondary text). `clay` now names the terracotta accent, used only for "the truck won't come" states, extra bookings and warnings. Green stays the primary action colour.

- **Clay** (`clay`, `#b0603d`): booked-day marker, crossed-square "nevažiuos" marker outline, clay outline buttons on light panels. 3.6:1 on sheet (graphics only).
- **Clay Deep** (`clay-deep`, `#96491f`): clay text on light surfaces (history "Nevažiuos", failed-pickup reasons, error notices). 5.1:1 on sheet, 4.5:1 on ground.
- **Clay Light** (`clay-light`, `#edbb9e`): clay inside the deep-green hero ("Ne, nereikia" outline, struck "nevažiuos" date, stamp, failed-pickup warning). 4.7:1 on green.

Resident model: the hero asks "Rytoj išvežimas. Išstumsite konteinerį?" until answered. "Taip, išstumsiu" saves a `scheduled`/`planned` pickup (stamp PATVIRTINTA); "Ne, nereikia" saves `scheduled`/`skipped` (stamp NEVAŽIUOS, clay). No answer keeps the question and the "Atvažiuos pagal grafiką" status.

## Structure update (2026-10-10)

- One shared popup (`components/dashboard/Modal.tsx`) is back for exactly one flow: reporting an extra pickup (day chips, optional amount, price, "Pranešti"). Dimmed backdrop, centered on desktop, bottom sheet on phones, Esc/backdrop/X, focus trap.
- Hero has three states from today (`DEMO_TODAY`, or `?date=YYYY-MM-DD`): the evening question, the real VASA result for that day ("Ištuštinta …" green / "Neištuštinta: …" clay), or "Kitas išvežimas: …". The container is one line under the date.
- Layout: left = hero, 14-day calendar, "Papildomas išvežimas"; right = history, impact. No container or help panels.

## Rebrand (2026-10-10): WasteWise

The product is now **WasteWise** (logo sheet: `logos.docx`). Colours are sampled from the logo and replace the Trage palette in both apps (`app/globals.css`, `driver-app/src/styles.css`); layouts and interactions are unchanged.

- **Teal-green** `#0f5c4a` (primary actions, hero), hover `#0b4a3b`, captions `#3b6b5e`, logo grid `#256b5a` (hero texture only).
- **Mint panels** `#e3efe9` / `#f0f7f3` / `#cfe3dc`, rules `#87ada4`, cool grey ground `#dfe3e1`, ink `#13201c`, secondary text `#4a5853`.
- **Route orange** is the accent (replaces clay): `#e8890c` brand orange for the logo and fills with ink text (6.4:1, never as text); `#c26a00` marks/outlines/large text; `#9a5200` orange text (5:1 on mint); `#f9c27a` orange on the green hero (4.9:1). Driver app uses `#a85a00` where white text sits on orange (5.1:1).
- **Mark:** the "W route" icon (green tile, map grid, orange W road with dashed centre line, start dot, bin stop), drawn as inline SVG (`LogoMark`) and rendered to the PWA icons. **Wordmark:** "Waste" green + "Wise" orange, Barlow Semi Condensed 700 at 1.45rem (header) beside a 34px mark.
- **Orange accents in use:** active tab underline, unpaid-bill dot, bookable "+" days, extra-pickup dots, "not coming" states, warnings, toast check, driver navigation hand-off button.
