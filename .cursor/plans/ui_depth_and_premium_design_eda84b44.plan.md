---
name: UI depth and premium design
overview: "Add depth, elevation, and premium styling across the app: theme tokens for shadows and depth, a lifted bottom island with a bottom-edge gradient, headers that pop on every tab, and a more dimensional boot screen—while keeping muted pastel matte colors and purple highlights in both dark and light modes."
todos: []
isProject: false
---

# UI depth and premium design

## Current state

- **Theme:** [constants/colors.ts](constants/colors.ts) defines `LightTheme` and `DarkTheme` with muted greys/blacks and purple accents (`accent`, `accentLight`, etc.). Shadow tokens exist (`shadow`, `shadowCard`, `cardDepth`) but are minimal and not used consistently for depth.
- **Boot screen:** [app/_layout.tsx](app/_layout.tsx) – `BootSequence` uses flat background, simple logo text, terminal area, progress bar, and ENTER button with one shadow; no elevation or layering.
- **Bottom island:** [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx) – `CustomTabBar` has a single full-width `View` with `barStyles.island` (rounded, border, one shadow) and a flat `barStyles.gradient` behind it (solid `fadeBg`). It reads flat; no “lift” or bottom gradient.
- **Headers:** Each tab implements its own header inline (no shared component):
  - **Collect:** [app/(tabs)/index.tsx](app/(tabs)/index.tsx) – `styles.header` (row, border-bottom, logo).
  - **Live:** [app/(tabs)/live/index.tsx](app/(tabs)/live/index.tsx) – `liveStyles.topBar` / `brandRow` (TASKFLOW + LIVE badge).
  - **Stats:** [app/(tabs)/stats/index.tsx](app/(tabs)/stats/index.tsx) – `styles.pageHeader` (row, border-bottom, logo).
  - **Tools:** [app/(tabs)/tools/index.tsx](app/(tabs)/tools/index.tsx) – `styles.pageHeader` and `adminStyles.headerRow` for SYSTEM OVERVIEW.

No shared header component; headers are flat (border only, no background or shadow).

---

## 1. Extend theme with depth and light-mode parity

**File:** [constants/colors.ts](constants/colors.ts)

- Add optional depth tokens used across the app, e.g.:
  - **Shadow:** stronger `shadowCard` / elevation values for “lifted” surfaces (cards, island, header).
  - **Header:** optional `headerBg` / `headerBorder` so headers can have a subtle tint and border (light: very light grey/purple tint; dark: elevated dark + purple tint).
- Keep existing muted pastel matte palette; ensure **light theme** has complementary shadow and accent usage (e.g. light mode shadows that read as soft depth, not harsh black) so both modes feel premium and consistent.

No new files; only extend the existing `ThemeColors` and both theme objects.

---

## 2. Boot screen (initial load) – add depth

**File:** [app/_layout.tsx](app/_layout.tsx)

- **Logo block:** Wrap “TASKFLOW” / “COLLECTION SYSTEM” in a container with:
  - Soft shadow (theme-aware: darker in light mode, subtle in dark) and optional very subtle border so it feels slightly raised.
- **Terminal / progress area:** Give the terminal block and progress strip a subtle “recessed” or “card” feel (e.g. soft inner shadow or slightly darker background + border) so the content feels layered.
- **ENTER SYSTEM button:** Slightly stronger shadow and optional subtle gradient (accent to slightly darker) so it feels more tactile and premium, matching the reference “lifted” look.
- Use `colors.shadow` / `colors.shadowCard` and theme-aware shadow color so it works in both light and dark.

All changes stay inside `BootSequence` and `bootStyles`; no new components required.

---

## 3. Bottom island – lifted look and bottom gradient

**File:** [app/(tabs)/_layout.tsx](app/(tabs)/_layout.tsx)

- **Lift:**
  - Increase elevation and shadow on `barStyles.island`: larger `shadowOffset` (e.g. `height: 8–12`), `shadowRadius`, and `shadowOpacity` (theme-based: slightly stronger in light, softer in dark) so the bar clearly floats above the content.
  - Optionally add a second, softer shadow layer (different offset/radius) for a more premium feel.
- **Gradient at bottom:**
  - Add a **bottom-edge gradient** so the island has a subtle gradient at the bottom (e.g. bar color → slightly darker/richer at the very bottom) to keep it visually “at the forefront” and grounded.
  - Implementation: add **expo-linear-gradient** (not currently in [package.json](package.json)) and render a `LinearGradient` either as the island background (vertical gradient) or as a thin overlay along the bottom edge of the island. Use theme colors (e.g. `tabBar` → darker shade, or accent tint in dark mode).
- **Theme:** Keep using `colors.tabBar` / `isDark` for fill; gradient should use the same muted palette and optional purple hint so it complements both modes.

Result: the bar reads as a clear, lifted surface with a defined bottom edge.

---

## 4. Headers that pop (all tabs)

**Approach:** Reuse existing header structure on each tab but add shared depth styling so headers feel consistent and “pop” without introducing a heavy shared component. Optionally introduce a small shared `PageHeader` or a shared style helper later if desired.

- **Collect** [app/(tabs)/index.tsx](app/(tabs)/index.tsx):  
  - Give the header row a subtle **background** (e.g. `colors.bgSecondary` or a new `headerBg`) and **soft shadow** under the strip (shadowOffset height 2–4, low opacity).  
  - Slightly increase prominence of the left title (e.g. weight/letterSpacing) and keep accent for pills; ensure logo has a bit of shadow/depth (already has some; can align with new shadow token).
- **Live** [app/(tabs)/live/index.tsx](app/(tabs)/live/index.tsx):  
  - Apply the same idea to `topBar`: subtle background tint and a soft shadow below the top bar so it feels like a distinct layer.  
  - Keep TASKFLOW + LIVE badge as the focal point; optional very subtle gradient or border along the bottom of the top bar.
- **Stats** [app/(tabs)/stats/index.tsx](app/(tabs)/stats/index.tsx):  
  - `pageHeader`: add same header background and soft shadow so it matches Collect/Live and feels elevated.
- **Tools** [app/(tabs)/tools/index.tsx](app/(tabs)/tools/index.tsx):  
  - `pageHeader` and the SYSTEM OVERVIEW `headerRow`: same treatment (background + soft shadow) so Tools feels consistent.

Use theme colors everywhere (including a `headerBg` or `bgSecondary` in [constants/colors.ts](constants/colors.ts) if added) so **light mode** gets a complementary look (e.g. light grey header strip with soft grey shadow; purple used for accents only), preserving muted pastel matte with purple highlights in both modes.

---

## 5. Optional: card and content depth

- In [constants/colors.ts](constants/colors.ts), define slightly stronger `shadowCard` (and optionally elevation presets) for light and dark.
- Apply these tokens to main cards where they already use shadows (e.g. Collect form card, Stats hero cards, Tools cards) so the whole app feels a bit more dimensional and premium without changing layout.

---

## Implementation order

1. **Theme** – Add/update depth and header tokens in `colors.ts` (and light-mode shadow values).
2. **Bottom island** – Add `expo-linear-gradient`, then update `CustomTabBar` with stronger shadow and bottom gradient.
3. **Boot screen** – Add depth to logo, terminal/progress area, and ENTER button in `_layout.tsx`.
4. **Headers** – Apply background + shadow to header/topBar/pageHeader on index, live, stats, and tools.
5. **Cards** – Optionally switch card shadows to new theme tokens for consistency.

---

## Dependencies

- **expo-linear-gradient:** Add for the bottom island gradient (Expo’s standard approach). Command: `npx expo install expo-linear-gradient`.

---

## Summary


| Area                   | Change                                                                          |
| ---------------------- | ------------------------------------------------------------------------------- |
| **Theme**              | Depth/shadow and optional header tokens; light mode parity with muted + purple. |
| **Boot screen**        | Logo raised (shadow); terminal/progress layered; ENTER button more tactile.     |
| **Bottom island**      | Stronger lift (shadow/elevation); bottom-edge gradient via LinearGradient.      |
| **Headers (all tabs)** | Subtle header background + soft shadow so each page header pops.                |
| **Cards**              | Optional: use theme shadow tokens for consistent depth.                         |


All styling remains theme-driven so dark mode keeps muted greys/blacks with purple highlights, and light mode is complemented with the same philosophy (muted pastel matte + purple accents and appropriate shadows).