# Riff Redesign: Tiered UX + Liquid Glass

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Redesign Riff into a two-tier product (Smart consumer / Manual prosumer) with lyrics preview before generation, and liquid glass design language throughout.

**Architecture:** Rewrite page.tsx into a multi-step flow with new state `preview-lyrics`. Extract compose form into a dedicated component. Add new API params for musical controls. Update Modal backend to accept prosumer params. Apply liquid glass CSS system via globals.css + component classes.

**Tech Stack:** Next.js 16, React 19, Tailwind v4 (CSS-first), Motion (Framer Motion v12), xAI Grok API, Modal + ACE-Step v1.5

---

### Task 1: Liquid Glass CSS Foundation

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`

**Step 1: Add animated gradient mesh background and glass utilities to globals.css**

Replace the entire globals.css with:

```css
@import "tailwindcss";
@import "tw-animate-css";

:root {
  --background: #0A0A0A;
  --foreground: #fafafa;
  --muted: #27272a;
  --muted-foreground: #a1a1aa;
  --accent: #f97316;
  --accent-foreground: #fff7ed;
  --border: rgba(255, 255, 255, 0.08);
  --ring: #f97316;
  --destructive: #ef4444;
  --glass-bg: rgba(255, 255, 255, 0.04);
  --glass-border: rgba(255, 255, 255, 0.08);
  --glass-active: rgba(255, 255, 255, 0.12);
  --glass-hover: rgba(255, 255, 255, 0.06);
}

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-ring: var(--ring);
  --color-destructive: var(--destructive);
  --font-sans: var(--font-geist-sans);
  --font-mono: var(--font-geist-mono);
}

body {
  background: var(--background);
  color: var(--foreground);
  font-family: var(--font-sans), system-ui, sans-serif;
}

/* Animated gradient mesh background */
.gradient-mesh {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.gradient-mesh::before,
.gradient-mesh::after {
  content: "";
  position: absolute;
  border-radius: 50%;
  filter: blur(120px);
  opacity: 0.15;
  animation: mesh-drift 20s ease-in-out infinite alternate;
}

.gradient-mesh::before {
  width: 600px;
  height: 600px;
  background: radial-gradient(circle, #f97316, transparent 70%);
  top: -200px;
  right: -100px;
}

.gradient-mesh::after {
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, #ea580c, transparent 70%);
  bottom: -150px;
  left: -100px;
  animation-delay: -10s;
}

@keyframes mesh-drift {
  0% { transform: translate(0, 0) scale(1); }
  50% { transform: translate(30px, -40px) scale(1.1); }
  100% { transform: translate(-20px, 30px) scale(0.95); }
}

/* Glass card */
.glass {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
}

.glass-active {
  background: var(--glass-active);
  border-color: rgba(255, 255, 255, 0.15);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.glass-hover:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.12);
}

/* Glass input */
.glass-input {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  transition: all 0.2s;
}

.glass-input:focus {
  border-color: rgba(249, 115, 22, 0.4);
  box-shadow: 0 0 0 2px rgba(249, 115, 22, 0.1);
  background: rgba(255, 255, 255, 0.05);
}

/* Glass button (primary CTA) */
.btn-primary {
  background: linear-gradient(135deg, #f97316 0%, #ea580c 100%);
  box-shadow:
    0 0 20px rgba(249, 115, 22, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.15);
  transition: all 0.2s;
}

.btn-primary:hover {
  box-shadow:
    0 0 30px rgba(249, 115, 22, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.btn-primary:active {
  transform: scale(0.98) translateY(0);
}

.btn-primary:disabled {
  opacity: 0.4;
  pointer-events: none;
  box-shadow: none;
}

/* Glass pill (segment control) */
.glass-pill {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  border-radius: 12px;
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  padding: 4px;
}

.glass-pill-segment {
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s;
  color: var(--muted-foreground);
}

.glass-pill-segment.active {
  background: var(--glass-active);
  color: var(--foreground);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

/* Glass chip (vibe/genre pills) */
.glass-chip {
  background: var(--glass-bg);
  border: 1px solid var(--glass-border);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 999px;
  padding: 6px 14px;
  font-size: 13px;
  font-weight: 500;
  color: var(--muted-foreground);
  transition: all 0.2s;
}

.glass-chip:hover {
  background: var(--glass-hover);
  border-color: rgba(255, 255, 255, 0.12);
  color: var(--foreground);
}

.glass-chip.selected {
  background: rgba(249, 115, 22, 0.12);
  border-color: rgba(249, 115, 22, 0.3);
  color: var(--accent);
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: var(--muted);
  border-radius: 3px;
}

/* Range slider (glass-style) */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
}

input[type="range"]::-webkit-slider-runnable-track {
  height: 4px;
  background: rgba(255, 255, 255, 0.08);
  border-radius: 2px;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--accent);
  margin-top: -6px;
  box-shadow: 0 0 10px rgba(249, 115, 22, 0.4);
}

/* Keyframes for generating state */
@keyframes pulse-dot {
  0%, 100% { opacity: 0.3; transform: scale(0.8); }
  50% { opacity: 1; transform: scale(1); }
}
```

**Step 2: Add gradient mesh div to layout.tsx body**

In `layout.tsx`, add `<div className="gradient-mesh" />` as first child of `<body>`, and add `relative z-10` to the `{children}` wrapper so content sits above the mesh.

**Step 3: Verify** — Run `npm run dev`, confirm the animated gradient mesh is visible behind the dark background. Confirm glass utility classes compile.

**Step 4: Commit** — `feat: add liquid glass CSS foundation with animated gradient mesh`

---

### Task 2: Smart Mode Redesign — Step 1 (Compose)

**Files:**
- Modify: `src/app/page.tsx`

**Changes to Smart mode compose form:**

1. Add new state variables:
   - `vibe: string | null` — selected mood (Chill, Hype, Sad, Romantic, Epic, Fun, Dark, Dreamy)
   - `isInstrumental: boolean` — false by default
   - `lyricsDensity: "light" | "moderate" | "heavy"` — defaults to "moderate"

2. Replace the Smart mode section (lines 312-338) with:
   - **Vibe pills row**: Chill, Hype, Sad, Romantic, Epic, Fun, Dark, Dreamy — using `glass-chip` / `glass-chip selected` classes
   - **Vocal/Instrumental segment toggle**: two-segment `glass-pill` control
   - **Lyrics density** (shown only when Vocal): three-segment `glass-pill` — Light / Moderate / Heavy
   - **Text prompt textarea**: Same hero input but with `glass-input` class
   - **CTA button**: "Write Lyrics & Preview" (vocal) or "Generate" (instrumental) — using `btn-primary` class

3. Apply `glass` class to the mode toggle (Smart/Manual) and form card container.

4. Change the AppState type to include `"preview-lyrics"`:
   ```ts
   type AppState = "compose" | "writing-lyrics" | "preview-lyrics" | "queued" | "generating" | "player";
   ```

5. Update `handleGenerate` for Smart mode:
   - If vocal: after lyrics API returns, go to `"preview-lyrics"` state instead of directly to queue
   - If instrumental: skip lyrics step, go straight to queue
   - Pass `vibe` and `lyricsDensity` to the lyrics API

**Step 5: Verify** — Smart mode shows vibe pills, vocal/instrumental toggle, lyrics density selector. All glass-styled.

**Step 6: Commit** — `feat: redesign Smart mode with vibe pills, vocal toggle, lyrics density`

---

### Task 3: Lyrics Preview Screen (Smart Mode Step 2)

**Files:**
- Modify: `src/app/page.tsx`

**Add a new render branch for `state === "preview-lyrics"`:**

This screen shows:
- The genre/style the AI picked (from `caption`) — displayed as a small glass chip at top
- Editable lyrics textarea — large, monospace, `glass-input` styled, pre-filled with AI-generated lyrics
- Two buttons at bottom:
  - "Generate Track" (`btn-primary`) — proceeds to queue with current lyrics/caption
  - "Back" (glass secondary button) — returns to compose state

**Implementation:**
```tsx
state === "preview-lyrics" ? (
  <div className="space-y-5">
    {/* AI-picked genre badge */}
    <div className="flex items-center gap-2">
      <span className="glass-chip selected text-xs">
        {caption.slice(0, 60)}...
      </span>
    </div>

    {/* Editable lyrics */}
    <div className="space-y-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Review & edit lyrics
      </label>
      <textarea
        value={lyrics}
        onChange={(e) => setLyrics(e.target.value)}
        rows={12}
        maxLength={4096}
        className="w-full rounded-2xl glass-input px-4 py-3 text-sm font-mono resize-none"
      />
      <p className="text-xs text-muted-foreground">
        Edit anything you'd like before generating.
      </p>
    </div>

    {/* Action buttons */}
    <div className="flex gap-3">
      <button onClick={() => setState("compose")}
        className="flex-1 glass glass-hover rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground">
        Back
      </button>
      <button onClick={submitToQueue}
        className="flex-1 btn-primary rounded-xl px-4 py-3 text-sm font-semibold text-white">
        Generate Track
      </button>
    </div>
  </div>
)
```

**Also:** Extract `submitToQueue` function from `handleGenerate` so both the compose form and lyrics preview can call it with the current caption/lyrics/duration.

**Step 3: Verify** — Type a prompt in Smart mode, click "Write Lyrics & Preview", see the lyrics preview screen with editable lyrics, then click "Generate Track" to proceed.

**Step 4: Commit** — `feat: add lyrics preview step before generation in Smart mode`

---

### Task 4: Update `/api/lyrics` to Accept Vibe & Density

**Files:**
- Modify: `src/app/api/lyrics/route.ts`

**Changes:**

1. Accept `vibe` (string | null) and `lyricsDensity` ("light" | "moderate" | "heavy") from request body.

2. Update the Grok system prompt to incorporate these:
   - Include vibe in the description: "The mood/vibe should be: {vibe}"
   - Adjust lyrics density instruction:
     - Light: "Write minimal lyrics — just a verse and short chorus, with instrumental sections. Suitable for a 20-30 second snippet."
     - Moderate: "Write 2 verses and a chorus. Balanced between vocals and instrumentals. Suitable for a 30-60 second song."
     - Heavy: "Write dense, lyric-heavy content — 3 verses, chorus, bridge. Lots of vocal content. Suitable for 60-120 seconds."
   - Have Grok also return a suggested `duration` that matches the density.

3. Update the JSON parsing to handle the new fields.

**Step 3: Verify** — Test the endpoint with curl, passing different vibes and densities, confirm lyrics vary.

**Step 4: Commit** — `feat: lyrics API accepts vibe and density params for better generation`

---

### Task 5: Manual Mode Redesign (Prosumer)

**Files:**
- Modify: `src/app/page.tsx`
- Modify: `src/components/genre-pills.tsx`

**Changes to Manual mode form (replace lines 339-424):**

**Section 1: Music Description** (kept, restyled with `glass-input`)
- Caption textarea with better placeholder: "A gritty boom-bap hip-hop track with heavy 808s, vinyl crackle, and a soulful piano sample..."

**Section 2: Genre**
- Keep `GenrePills` but expand to 12: Lo-fi, Pop, Hip-Hop, Rock, Jazz, Electronic, R&B, Classical, Ambient, Cinematic, Metal, Folk
- Restyle pills with `glass-chip` / `glass-chip selected`
- Add a searchable text input above pills: "Search genres..." — filters from a larger list
- New state: `genreSearch: string`

**Section 3: Musical Controls** (collapsible, new)
- Add a `<details>` or toggle-expandable section "Musical Controls"
- **BPM**: number input (30-300) or empty for Auto. Glass-input styled.
- **Key**: `<select>` dropdown with common keys (C Major, C minor, D Major, D minor, ... G# minor) + "Auto" option. Glass-input styled.
- **Time Signature**: segment control (Auto, 2/4, 3/4, 4/4, 6/8). Glass-pill styled.
- New state: `bpm: number | null`, `musicalKey: string`, `timeSignature: string`

**Section 4: Vocals** (redesigned)
- **Vocal/Instrumental** toggle: glass-pill segment control (same as Smart mode)
- **Language** dropdown (shown only when Vocal): English, Spanish, Japanese, Korean, Hindi, French, German, Portuguese, Chinese, Arabic, Auto. Glass-input select.
- **Lyrics editor** (shown only when Vocal): large textarea with `glass-input`, monospace
- **Section marker buttons** above the lyrics textarea: [Verse], [Chorus], [Bridge], [Outro] — clicking inserts the tag at cursor position
- New state: `vocalLanguage: string`

**Step 5: Verify** — Manual mode shows all controls, genre search filters, musical controls expand/collapse, section marker buttons insert tags.

**Step 6: Commit** — `feat: redesign Manual mode with genre search, musical controls, lyrics editor`

---

### Task 6: Update API & Modal Backend for New Params

**Files:**
- Modify: `src/app/api/generate/route.ts`
- Modify: `ace_step_modal.py` (one directory up)

**Changes to `/api/generate/route.ts`:**

Pass through new params to Modal:
```ts
const payload = {
  caption: body.caption || "upbeat electronic dance music",
  lyrics: body.lyrics || "[Instrumental]",
  duration: Math.min(Math.max(body.duration || 30, 10), 120),
  bpm: body.bpm || null,
  keyscale: body.keyscale || null,
  timesignature: body.timesignature || null,
  instrumental: body.instrumental || false,
  vocal_language: body.vocal_language || null,
};
```

**Changes to `ace_step_modal.py`:**

1. Update `SubmitRequest` model:
```python
class SubmitRequest(BaseModel):
    caption: str = "upbeat electronic dance music"
    lyrics: str = "[Instrumental]"
    duration: float = Field(30, ge=10, le=120)
    bpm: int | None = None
    keyscale: str | None = None
    timesignature: str | None = None
    instrumental: bool = False
    vocal_language: str | None = None
```

2. Update `_process_job` to pass new params to `GenerationParams`:
```python
gen_params = GenerationParams(
    caption=params["caption"],
    lyrics=params.get("lyrics", "[Instrumental]"),
    duration=params.get("duration", 30),
    bpm=params.get("bpm"),
    keyscale=params.get("keyscale", ""),
    timesignature=params.get("timesignature", ""),
    instrumental=params.get("instrumental", False),
    vocal_language=params.get("vocal_language", "unknown"),
    seed=-1,
    inference_steps=8,
    thinking=True,
    shift=3.0,
)
```

3. Do the same for the legacy `generate_file_legacy` endpoint.

**Step 3: Verify** — Deploy Modal with `modal deploy ace_step_modal.py`. Test with curl passing keyscale="C Major" and bpm=120.

**Step 4: Commit** — `feat: pass musical controls (key, BPM, time sig, language) through to ACE-Step`

---

### Task 7: Glass-ify Remaining Components

**Files:**
- Modify: `src/components/audio-player.tsx`
- Modify: `src/components/queue-status.tsx`
- Modify: `src/components/generating-state.tsx`

**AudioPlayer:**
- Visualizer container: add `glass rounded-2xl` class
- Play/pause button: keep orange but add glass sheen (`box-shadow: inset 0 1px 0 rgba(255,255,255,0.15)`)
- Seek bar: already glass-styled via globals.css range input styles
- Download/Make Another buttons: Download = `btn-primary rounded-xl`, Make Another = `glass glass-hover rounded-xl`

**QueueStatus:**
- Container: `glass rounded-3xl p-8` card
- Fix the "-1 people" bug: position is 1-based from the backend, so when position=0 (shouldn't happen) or position=1, show "You're next". The bug is that the initial `queuePosition` state is 0, so `0 - 1 = -1`. Fix: default queuePosition to 1 instead of 0, or guard the display.

**GeneratingState:**
- Wrap in a `glass rounded-3xl p-8` card
- Waveform bars: keep accent color

**Step 5: Verify** — All states (queue, generating, player) render with glass styling. No "-1 people" bug.

**Step 6: Commit** — `feat: apply liquid glass design to player, queue, and generating states`

---

### Task 8: Glass Header & Footer + Final Polish

**Files:**
- Modify: `src/app/page.tsx`

**Header:**
- Apply `glass` styling: `backdrop-blur-xl bg-white/[0.02] border-b border-white/[0.06]`
- Logo icon: keep orange accent

**Footer:**
- Match header glass style: `backdrop-blur-xl bg-white/[0.02] border-t border-white/[0.06]`

**Form container:**
- Wrap the entire form area in a `glass rounded-3xl p-6` card

**Hero text:**
- Keep white, add subtle text-shadow for depth against the glass

**Final checks:**
- All `bg-muted/50` references should be replaced with glass equivalents
- All `border-border` references should use glass-border
- All `rounded-lg` on major containers should be `rounded-2xl` or `rounded-3xl`
- Remove any old non-glass styling remnants

**Step 5: Verify** — Full app flow looks cohesive with liquid glass. Test on mobile viewport too.

**Step 6: Commit** — `feat: glass header, footer, and final polish`

---

### Task 9: Deploy & Test

**Step 1:** Run `npm run build` to verify no build errors.

**Step 2:** Deploy Modal backend: `modal deploy ace_step_modal.py`

**Step 3:** Commit and push all changes to `zonko-ai/riff` main branch.

**Step 4:** Verify Vercel auto-deploys (or trigger `vercel --prod`).

**Step 5:** Test on live site:
- Smart mode: type prompt, select vibe, choose vocal with moderate density → preview lyrics → edit → generate → play
- Smart mode instrumental: type prompt → generate directly → play
- Manual mode: search genre, set BPM/key, write lyrics with section markers → generate → play
- Download MP3
- Mobile viewport

**Step 6: Commit** — `chore: final deploy and verification`
