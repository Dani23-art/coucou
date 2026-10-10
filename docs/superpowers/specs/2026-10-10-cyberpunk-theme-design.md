# Cyberpunk 2077 theme for Coucou (Windows)

Date: 2026-10-10. Branch: `theme/cyberpunk-2077`, based on `feat/draggable-island`, pushed to `origin` (`Dani23-art/coucou`). Never pushed to `upstream`, no pull request.

## Intent

The owner runs Windows Terminal and herdr with a Cyberpunk 2077 look (near-black base, yellow, cyan, pink, red, light glitch effect) and wants Coucou for Windows to match. The theme is permanent on this branch, not a setting. The original look stays one `git checkout main` plus a rebuild away, and the currently installed `coucou.exe` is kept as `coucou.exe.bak`.

This is an explicit request to restyle shipped views, which `CLAUDE.md` allows ("only when explicitly asked"). The scope is the Windows/Linux Tauri app in `windows/` only. `NotchBuddy/` (macOS, iPhone) is not touched.

## Success criteria

1. Island, cards, pills, tabs, chat, diff and Settings use the Cyberpunk palette and font. No view keeps the old grey look by accident.
2. A short glitch plays on the island about every 5 seconds, plus faint scanlines. Text is readable at all other times.
3. Mochi wears a new `cyberpunk` outfit by default.
4. Idle cost does not rise: no CSS animation runs while the island is hidden, and `prefers-reduced-motion` turns the glitch off.
5. `npm run build` (tsc and vite), `npm test` and the Rust tests in `src-tauri` pass.
6. The new installer installs over the existing per-user install, and the user's `settings.json` in `%APPDATA%\Coucou` is untouched.

## Design

### 1. Palette and font (`src/style.css`, `src/settings/settings.css`)

- Redefine the `:root` tokens: `--ink`, `--dim*`, `--card`, `--card-flat`, `--tab-on`, `--hairline`, `--red`, `--cyan`, `--pink`, `--amber`. Add `--accent` (yellow `#fcee0a`) for the active tab, focus rings and primary buttons.
- Base `#050508`, cards a step lighter (`#0b0b12`), cyan `#00f0ff`, pink `#ff2e97`, red `#ff003c`, yellow `#fcee0a`. Text stays light (`--ink` near `#f2f2f5`); dimmed text is checked for contrast against the new cards.
- The roughly 170 hardcoded colors in the two CSS files are moved onto tokens where they carry meaning (status colors, borders, buttons) and left alone where they are neutral shadows or overlays.
- `--font` and `--mono` start with `"JetBrains Mono"`, then the existing stacks. The font is not bundled (no new dependency, installer size unchanged); machines without it fall back to Cascadia Mono.
- Pill IDs and their catalog colors are contract values and are not renamed. Pill colors may be tinted by CSS only.

### 2. Glitch layer (new section at the end of `src/style.css`)

- Burst: about 0.2 s every 5 s on `#island`: a few horizontal slices shift sideways using `clip-path` keyframes, with a red/cyan `text-shadow` split. A second, rarer micro-glitch is one thin slice.
- Scanlines: a fixed `repeating-linear-gradient` overlay at very low alpha, `pointer-events: none`.
- Neon edge: a thin accent border and glow on the island and active tab.
- The animation is attached only while the island is shown. The exact selector is chosen after reading `src/island/island.ts` and `fsm.ts`; the acceptance check is that `getAnimations()` is empty while the island is hidden.
- `@media (prefers-reduced-motion: reduce)` disables the burst and the micro-glitch; scanlines and colors stay.

### 3. Mochi outfit (`src/mochi/outfits.ts`, `wardrobe.ts`, `src/i18n/extra.json`)

- New outfit `cyberpunk`: a neon visor over the eyes (yellow with a cyan edge) and a small glitch tear line on the head, drawn with Canvas like the other outfits. Below `SIMPLIFY_BELOW_R` the details are dropped, as for the other outfits. It follows the existing front/behind drawing split.
- Added to `OUTFIT_SELECTIONS`, `OUTFIT_KEYS` and `OUTFIT_LABELS`. The new key `"Cyberpunk"` gets all nine translations in `extra.json`; `i18n.test.mjs` fails without them.
- The default changes: `seasonalOutfit` returns `cyberpunk` instead of `none` outside the seasonal windows, so the stored value `"auto"` keeps working. Christmas, Halloween, Easter, summer and New Year outfits still win on their dates. `tests/wardrobe.test.mjs` is updated for the new fallback.
- The Rust settings default (`"auto"`) and the stored-value handling do not change.
- Mochi's body stays light so the dark eyes remain readable.

### 4. Build and delivery

- Create `theme/cyberpunk-2077` from `feat/draggable-island`.
- Copy `%LOCALAPPDATA%\Coucou\coucou.exe` to `coucou.exe.bak`.
- Build with `npm run tauri build` in `windows/`; the NSIS installer is per-user and needs no admin.
- Stop the running `coucou.exe`, run the new installer, start Coucou again.
- Commit in small steps with plain messages, no AI attribution. Push the branch to `origin` only.

### 5. Verification

- `npm run build`, `npm test`, `cargo test` in `src-tauri`.
- Check the glitch gate: run the built frontend and confirm no running animation while hidden.
- The final look is judged by the owner on screen. Claude does not move the mouse or send keys to the desktop.

## Out of scope

- A theme switch in Settings, bundling fonts, any change to `NotchBuddy/`, release notes or version bump, pull requests to upstream.

## Risks

- Large CSS diff makes future merges from upstream noisy. Accepted because the branch is permanent.
- If `prefers-reduced-motion` is on in Windows, the owner will see no glitch. The setting is reported back after the build.
- A first release `tauri build` can take several minutes.
