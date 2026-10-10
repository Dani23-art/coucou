# Cyberpunk 2077 theme for Coucou (Windows) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the Windows/Linux Coucou app with a Cyberpunk 2077 look (palette, font, glitch, Mochi outfit) on branch `theme/cyberpunk-2077`, then build and install it.

**Architecture:** Colors move to the `:root` tokens plus a scripted replacement of hardcoded colors; a glitch layer is plain CSS gated by a `data-mode` attribute that `island.ts` sets; the `cyberpunk` outfit is a new Canvas function in `outfits.ts` registered like the other face outfits.

**Tech Stack:** TypeScript, Vite, Tauri 2 (Rust), plain CSS, node:test.

**Spec:** `docs/superpowers/specs/2026-10-10-cyberpunk-theme-design.md`

## Global Constraints

- Work only in `windows/`; `NotchBuddy/` is not touched.
- No new dependency. The font is not bundled.
- Pill IDs and `mochiOutfit` raw values already stored stay valid; unknown stored values still mean `"auto"`.
- 0 % CPU when the island is hidden: no running CSS animation then.
- `prefers-reduced-motion: reduce` disables the glitch.
- Palette: base `#050508`, card `#0c0c14`, yellow `#fcee0a`, cyan `#00f0ff`, pink `#ff2e97`, red `#ff003c`.
- Commits: plain messages, no AI attribution. Push only to `origin`.
- `npm test` includes `i18n.test.mjs`: every key in every one of the 10 languages.

## Review Focus

- Head turned away (one eye visible): `cyberpunk` must draw without throwing (Task 1 test).
- Tiny mini-Mochi (`R < 16`): simplified drawing must not throw (Task 1 test).
- Stored `mochiOutfit` of `"auto"`, `"topHat"` or garbage still resolves (existing tests plus Task 1).
- Island hidden: no animation on `#island` (Task 3 check on the attribute and CSS selector).
- Reduced motion: no glitch animation (Task 3 CSS contains the media query).

---

### Task 1: `cyberpunk` outfit and default

**Files:**
- Modify: `windows/src/mochi/wardrobe.ts`, `windows/src/mochi/outfits.ts`, `windows/src/i18n/extra.json`
- Modify: `windows/tests/wardrobe.test.mjs`
- Create: `windows/tests/outfit-draw.test.mjs`

**Interfaces:**
- Produces: `Outfit` includes `"cyberpunk"`; `OUTFIT_SELECTIONS` has `"cyberpunk"` after `"none"`; `seasonalOutfit()` returns `"cyberpunk"` outside the seasonal windows.

- [ ] **Step 1: Update wardrobe tests to the new behavior (failing)**

In `tests/wardrobe.test.mjs` replace every season-fallback `"none"` with `"cyberpunk"` in lines using `season(...)` / `seasonalOutfit(...)`, `cache.get("auto", ...)` and `wardrobeHeader(null, "auto", day(2026, 5, 1))` (`"Auto · Cyberpunk"`). Leave `resolveOutfit("none", d)` as `"none"`. Change the order test to:

```js
  assert.deepEqual([...OUTFIT_SELECTIONS], [
    "auto", "none", "cyberpunk", "partyHat", "beanie", "crown", "sunglasses", "roundGlasses",
    "bow", "scarf", "witchHat", "pumpkin", "santaHat", "bunnyEars",
  ]);
```

- [ ] **Step 2: Add a draw smoke test (failing)**

Create `tests/outfit-draw.test.mjs`:

```js
// The cyberpunk outfit draws without throwing for every head pose it can meet.
import test from "node:test";
import assert from "node:assert/strict";

globalThis.Path2D = class { moveTo() {} lineTo() {} bezierCurveTo() {} quadraticCurveTo() {} ellipse() {} arc() {} closePath() {} rect() {} addPath() {} };
const ctx = new Proxy({}, {
  get: (t, k) => (k in t ? t[k] : k === "createLinearGradient" || k === "createRadialGradient" ? () => ({ addColorStop() {} }) : () => {}),
  set: (t, k, v) => { t[k] = v; return true; },
});

const { makeHead, drawOutfitFront, drawOutfitBehind } = await import("../src/mochi/outfits.ts");

for (const [name, R, yaw] of [["front", 30, 0], ["small", 8, 0], ["turned away", 30, Math.PI], ["side", 30, 1.2]]) {
  test(`cyberpunk draws: ${name}`, () => {
    const H = makeHead(R, yaw, 0);
    const st = { presence: 1, morph: 0 };
    assert.doesNotThrow(() => { drawOutfitBehind(ctx, "cyberpunk", H, st); drawOutfitFront(ctx, "cyberpunk", H, st); });
  });
}
```

- [ ] **Step 3: Run tests, see them fail**

Run: `cd windows && npm test`
Expected: FAIL (order list, fallback values, `cyberpunk` not a known outfit / not drawn).

- [ ] **Step 4: Implement in `wardrobe.ts`**

`OUTFIT_SELECTIONS`: insert `"cyberpunk"` after `"none"`. `OUTFIT_KEYS`: add `cyberpunk: N_("Cyberpunk"),`. In `seasonalOutfit`, change the final `return "none";` to `return "cyberpunk";` and the doc line to `... > sunglasses > cyberpunk.`

- [ ] **Step 5: Implement in `outfits.ts`**

Add `"cyberpunk"` to `ON_FACE`; in `drawFace` add `case "cyberpunk": cyberpunk(ctx, H, body, simple); break;`; in `drawOutfitFront` extend the slide-in branch to `outfit === "sunglasses" || outfit === "roundGlasses" || outfit === "cyberpunk"`. Add after `roundGlasses`:

```ts
/** Neon visor: dark glass, yellow rim, cyan scan line, and a short glitch tear. */
function cyberpunk(ctx: Ctx, H: Head, body: Path2D, simple: boolean) {
  const eyes = eyeFrames(H);
  const [l, r] = eyes;
  const w = H.R * 0.62;
  const h = H.R * 0.42;
  // About one frame in sixty, for a few frames, the visor jumps sideways and splits red/cyan.
  const glitch = Math.floor(performance.now() / 83) % 60 === 0;
  const jx = glitch ? H.R * 0.1 : 0;
  ctx.save();
  ctx.clip(body);
  ctx.lineCap = "round";
  let x0: number;
  let x1: number;
  let yc: number;
  let hh: number;
  if (l.visible && r.visible) {
    x0 = l.x - (w / 2) * l.fx;
    x1 = r.x + (w / 2) * r.fx;
    yc = (l.y + r.y) / 2;
    hh = (h * (l.fy + r.fy)) / 2;
  } else {
    const e = l.visible ? l : r;
    x0 = e.x - (w / 2) * e.fx;
    x1 = e.x + (w / 2) * e.fx;
    yc = e.y;
    hh = h * e.fy;
  }
  if (!l.visible && !r.visible) { ctx.restore(); return; }
  const path = (dx: number) => roundRect(ctx, x0 + dx, yc - hh / 2, x1 - x0, hh, hh * 0.42);
  if (glitch && !simple) {
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = "#FF2E97";
    path(-jx * 1.4);
    ctx.fill();
    ctx.fillStyle = "#00F0FF";
    path(jx * 1.4);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  path(jx);
  ctx.fillStyle = "rgba(6,6,12,0.9)";
  ctx.fill();
  ctx.lineWidth = H.R * 0.05;
  ctx.strokeStyle = "#FCEE0A";
  ctx.stroke();
  if (!simple) {
    ctx.beginPath();
    ctx.moveTo(x0 + hh * 0.35 + jx, yc - hh * 0.1);
    ctx.lineTo(x1 - hh * 0.35 + jx, yc - hh * 0.1);
    ctx.lineWidth = H.R * 0.03;
    ctx.strokeStyle = "#00F0FF";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + (x1 - x0) * 0.55 + jx, yc + hh * 0.72);
    ctx.lineTo(x1 + w * 0.18 + jx, yc + hh * 0.72);
    ctx.lineWidth = H.R * 0.04;
    ctx.strokeStyle = "#FF2E97";
    ctx.stroke();
  }
  ctx.restore();
}
```

(`roundRect(ctx, x, y, w, h, r)` is the existing helper used by `sunglasses`; it builds the path on `ctx`.)

- [ ] **Step 6: Translations in `extra.json`**

Append inside the `"strings"` object, before its closing brace (add a comma after the previous last entry):

```json
  "Cyberpunk": {
   "zh-Hans": "赛博朋克",
   "hi": "साइबरपंक",
   "es": "Cyberpunk",
   "ar": "سايبربانك",
   "fr": "Cyberpunk",
   "bn": "সাইবারপাঙ্ক",
   "pt-BR": "Cyberpunk",
   "ru": "Киберпанк",
   "id": "Cyberpunk"
  }
```

- [ ] **Step 7: Run tests, see them pass**

Run: `cd windows && npm test && npx tsc --noEmit`
Expected: all PASS, no type errors.

- [ ] **Step 8: Commit**

```bash
git add windows/src windows/tests
git commit -m "Windows: cyberpunk outfit for Mochi, worn by default"
```

### Task 2: Palette and font

**Files:**
- Modify: `windows/src/style.css`, `windows/src/settings/settings.css`
- Create: `windows/scripts/theme-colors.mjs` (one-off, deleted after use)

- [ ] **Step 1: Write the replacement script**

`scripts/theme-colors.mjs` reads both CSS files, lower-cases nothing, and applies this exact map (case-insensitive, whole-token for hex; `rgba(r,g,b,` prefix with any alpha for rgba):

| from | to |
|---|---|
| `#000` (whole token) | `#050508` |
| `#0b0c0e` | `#07070d` |
| `#141518` | `#0c0c14` |
| `#0e0f11` | `#08080d` |
| `#1d1f23` | `#14141f` |
| `#22c55e`, `#34d399` | `#00f0ff` |
| `#86efac` | `#8ffaff` |
| `rgba(34,197,94,`, `rgba(52,211,153,`, `rgba(110,231,183,` | `rgba(0,240,255,` |
| `#f4505e` | `#ff003c` |
| `#ff8d97` | `#ff5c7a` |
| `#ff6b5b` | `#ff3d5a` |
| `#fca5a5` | `#ff9db0` |
| `rgba(244,80,94,` | `rgba(255,0,60,` |
| `#f5a524`, `#f7b32b` | `#fcee0a` |
| `#fbc06a` | `#fff27a` |
| `rgba(245,165,36,` | `rgba(252,238,10,` |
| `#60a5fa` | `#00f0ff` |
| `#818cf8`, `#a78bfa`, `#f472b6`, `#6366f1` | `#ff2e97` |
| `#7c5cffd9` | `#ff2e97d9` |
| `#22d3ee` | `#00f0ff` |

White overlays `rgba(255,255,255,a)` and the grey text colors are left as they are.

- [ ] **Step 2: Run it and review the diff**

Run: `cd windows && node scripts/theme-colors.mjs && git diff --stat`
Expected: only `style.css` and `settings.css` change; skim `git diff` for text that became unreadable (dark text on dark).

- [ ] **Step 3: Add the accent token and font**

In both `:root` blocks add `--accent: #fcee0a;` and put `"JetBrains Mono", ` first in `--font` and `--mono`. Set `--hairline: rgba(252, 238, 10, 0.08);` in `style.css`. Make the active tab and primary button use the accent: add after the `.tab` rules

```css
.tab.on { box-shadow: inset 0 -2px 0 var(--accent); }
```

and for the focus ring of inputs `outline-color: var(--accent)` where an outline is defined.

- [ ] **Step 4: Remove the script, build**

Run: `rm windows/scripts/theme-colors.mjs && cd windows && npm run build`
Expected: tsc and vite succeed.

- [ ] **Step 5: Commit**

```bash
git add windows/src windows/scripts
git commit -m "Windows: Cyberpunk palette and JetBrains Mono for the island and Settings"
```

### Task 3: Glitch layer

**Files:**
- Modify: `windows/src/island/island.ts` (`syncDom`), `windows/src/style.css` (end of file)

**Interfaces:**
- Produces: `#island[data-mode="compact"|"expanded"]` while shown; `data-mode="hidden"` while hidden.

- [ ] **Step 1: Set the attribute**

At the start of `syncDom()` in `island.ts` add `this.islandEl.dataset.mode = State.mode;`. Check `setMode` marks the island dirty: `grep -n "setMode" -A6 src/island/island.ts`; if it does not set `this.dirty = true`, add that.

- [ ] **Step 2: Append the CSS**

```css
/* ── Cyberpunk glitch ────────────────────────────────────────────────────────
   Runs only while the island is shown (data-mode set by island.ts), never when
   hidden, and not at all with reduced motion. */
#island[data-mode="compact"],
#island[data-mode="expanded"] {
  box-shadow: 0 0 0 1px rgba(252, 238, 10, 0.35), 0 0 14px rgba(0, 240, 255, 0.18);
}

#island[data-mode="compact"] #island-clip,
#island[data-mode="expanded"] #island-clip {
  animation: cp-glitch 5s steps(1, end) infinite;
}

#island-clip::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: repeating-linear-gradient(0deg, rgba(255, 255, 255, 0.035) 0 1px, transparent 1px 3px);
}

@keyframes cp-glitch {
  0%, 62%, 100% { transform: none; clip-path: none; text-shadow: none; }
  63% { transform: translateX(-4px); clip-path: inset(10% 0 62% 0); text-shadow: 2px 0 #ff2e97, -2px 0 #00f0ff; }
  64% { transform: translateX(5px); clip-path: inset(48% 0 22% 0); text-shadow: -2px 0 #ff2e97, 2px 0 #00f0ff; }
  65% { transform: translateX(-2px); clip-path: inset(0 0 80% 0); text-shadow: 2px 0 #00f0ff, -2px 0 #ff2e97; }
  66% { transform: none; clip-path: none; text-shadow: none; }
  88% { transform: translateX(3px); clip-path: inset(70% 0 12% 0); text-shadow: 1px 0 #ff2e97, -1px 0 #00f0ff; }
  89% { transform: none; clip-path: none; text-shadow: none; }
}

@media (prefers-reduced-motion: reduce) {
  #island[data-mode] #island-clip { animation: none; }
}
```

Note: `clip-path` on `#island-clip` clips its own children, so the slices show as gaps; the keyframe is short (3 steps of 1 % of 5 s = 0.05 s each, about 0.15 s) so text stays readable.

- [ ] **Step 3: Verify**

Run: `cd windows && npm run build && npm test`
Expected: PASS. Run `grep -n "data-mode" src/style.css src/island/island.ts` and confirm there is no `animation` rule that applies when `data-mode="hidden"` or when the attribute is missing.

- [ ] **Step 4: Commit**

```bash
git add windows/src
git commit -m "Windows: glitch burst and scanlines on the island, off when hidden or with reduced motion"
```

### Task 4: Build, install, push

**Files:** none (artifacts only)

- [ ] **Step 1: Backup the installed binary**

Run: `cp "$LOCALAPPDATA/Coucou/coucou.exe" "$LOCALAPPDATA/Coucou/coucou.exe.bak"`
Expected: file exists.

- [ ] **Step 2: Rust tests and release build**

Run: `cd windows/src-tauri && cargo test 2>&1 | tail -5` then `cd .. && npm run tauri build 2>&1 | tail -15`
Expected: tests pass, NSIS installer under `src-tauri/target/release/bundle/nsis/`.

- [ ] **Step 3: Install over the current app**

Stop `coucou.exe`, run the new `*-setup.exe` silently (`/S`), start `%LOCALAPPDATA%\Coucou\coucou.exe`.
Expected: process running; `%APPDATA%\Coucou\settings.json` unchanged.

- [ ] **Step 4: Push the branch**

Run: `git push -u origin theme/cyberpunk-2077`
Expected: branch visible on `Dani23-art/coucou`.
