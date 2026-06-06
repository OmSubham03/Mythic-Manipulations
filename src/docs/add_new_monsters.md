# Adding New Monster Patients

This guide walks through every file and integration point required to add a new monster patient to **Mythic Manipulations**. Follow each step in order — skipping any will result in crashes or missing content.

---

## Overview

Adding a new monster touches **5 source files** and requires **1 image asset**:

| # | File | What to add |
|---|------|-------------|
| 1 | `src/constants/patients.ts` | Type + config + ailments |
| 2 | `src/components/PatientSVGModel.tsx` | SVG render function + zone keys |
| 3 | `src/screens/LobbyScreen.tsx` | Sitting sprite image mapping |
| 4 | `src/components/XrayOverlay.tsx` | X-ray silhouette outline |
| 5 | `src/screens/MonsterCollectionScreen.tsx` | Collection emoji icon |
| — | `src/assets/images/sit_<name>.png` | Lobby sitting sprite (PNG) |

---

## Step 1 — Define the Patient Type and Config

**File:** `src/constants/patients.ts`

### 1a. Add to the `PatientType` union

Add your monster's type string at the end of the union (use `UPPER_SNAKE_CASE`):

```ts
export type PatientType =
  | "GOLEM"
  | "HARPY"
  // ... existing types ...
  | "MOON_BUNNY"
  | "YOUR_MONSTER";    // ← add here
```

### 1b. Add a `PatientConfig` entry to the `PATIENTS` array

Insert a new object in the `PATIENTS` array (before the closing `];`). Follow this template:

```ts
{
  type: "YOUR_MONSTER",
  name: "DisplayName",              // Short friendly name shown in-game
  kingdom: "Theme Kingdom",         // Lore text for collection screen
  bodyColor: "#RRGGBB",             // Primary body fill color
  glowColor: "#RRGGBB",             // Lighter glow / highlight color
  accentColor: "#RRGGBB",           // Darker accent for details
  image: require("../assets/images/sit_yourmonster.png"),
  stiffness: 0.8,                   // 0.4 (easy) – 1.8 (hard) drag resistance
  patienceDuration: 30,             // 20 – 45 seconds patience bar
  rewardMultiplier: 1.4,            // 1.2 – 1.8 coin multiplier
  baseReward: 95,                   // 80 – 120 base coins
  description: "A short flavor text for the collection screen.",
  entrySound: "chime",              // One of: "thud" | "flutter" | "sizzle" | "ice" | "poof" | "zap" | "chime" | "rumble" | "boing"
  level: 1,                         // Always 1 (randomized at runtime by getRandomPatients)
  ailments: [
    {
      id: "yourmonster_ailment1",   // Unique, snake_case
      type: "NECK",                 // One of: TEETH | HEAD | NECK | CHEST | BACK | LEG | STOMACH | EYE
      label: "Ailment Display Name",
      description: "Instruction text shown to player",
      gesture: "DRAG_DOWN",         // DRAG_UP | DRAG_DOWN | DRAG_HORIZONTAL | TAP_RAPID
      miniGame: "NERVE_LINK",       // Assigned by gameForAilment() at runtime — this is a default
      dragThreshold: 100,           // Pixels needed to complete gesture (70-120)
      tapCount: 6,                  // Only needed for TAP_RAPID gesture
      bodyZone: { x: 0.5, y: 0.22, size: 50 },  // Normalized 0-1 coords for glow position
      crunchLabel: "CRACK!",        // Text shown on successful adjustment
    },
    {
      id: "yourmonster_ailment2",
      type: "BACK",
      label: "Second Ailment Name",
      description: "X-ray the spine!",
      gesture: "DRAG_UP",
      miniGame: "XRAY_SCAN",
      dragThreshold: 105,
      bodyZone: { x: 0.5, y: 0.55, size: 60 },
      crunchLabel: "POP!",
    },
  ],
},
```

### Key rules for ailments

- Every monster must have **exactly 2 base ailments** (extra ailments are generated at higher levels from `EXTRA_AILMENT_POOL`).
- The `miniGame` field is overridden at runtime by `gameForAilment()` using the `AILMENT_GAME_MAP` — but still provide a sensible default.
- The `type` field determines which mini-game pool is used:

| AilmentType | Allowed MiniGames |
|-------------|------------------|
| `TEETH` | `DENTAL_CHECK` |
| `HEAD` | `NERVE_LINK`, `XRAY_SCAN` |
| `NECK` | `NERVE_LINK`, `XRAY_SCAN` |
| `CHEST` | `HEART_PUMP` |
| `BACK` | `XRAY_SCAN`, `SWELLING` |
| `LEG` | `XRAY_SCAN` |
| `STOMACH` | `FIND_PATH` |
| `EYE` | `EYE_TEST` |

---

## Step 2 — Create the SVG Model

**File:** `src/components/PatientSVGModel.tsx`

This is the largest step. You need to create the in-game SVG character that players interact with.

### 2a. Add zone keys for touch targets

Find the `zones` record (search for `const zones: Record<string,`) and add entries for your monster. You need one zone per ailment type, using the naming convention `MONSTER_TYPE_ZONE`:

```ts
const zones: Record<string, { x: number; y: number; w: number; h: number }> = {
  // ... existing entries ...
  YOUR_MONSTER_NECK:  { x: 80*sx,  y: 100*sy, w: 40*sx,  h: 60*sy  },
  YOUR_MONSTER_BACK:  { x: 30*sx,  y: 150*sy, w: 140*sx, h: 120*sy },
};
```

**Zone key naming rules:**

The zone suffix is determined by the ailment's **gesture group**, not the ailment type directly:

| Ailment Types | Gesture Group | Zone Suffix |
|--------------|---------------|-------------|
| NECK, TEETH, EYE, HEAD | `isNeck` | `_NECK` |
| BACK, CHEST, STOMACH | `isBack` | `_BACK` |
| LEG | `isKnee` | `_KNEE` |
| HAND | `isHand` | `_HAND` |

So a monster with a **CHEST** ailment needs a `_BACK` zone key (because CHEST is in the `isBack` group), **not** a `_CHEST` key.

**Coordinates** are in the 200×320 SVG viewBox, scaled by `sx`/`sy`. The zone defines the touch-target rectangle:
- `x`, `y` — top-left corner
- `w`, `h` — width and height

### 2b. Add special gesture handling (if needed)

Search for `makeNeckPR` — inside the `onPanResponderMove` handler, there is special-case logic for monsters whose NECK gesture is not the default `DRAG_DOWN`:

```ts
if (pt === "HARPY" || pt === "CRYSTAL_DEER" || pt === "GREEN_DEER") {
  delta = Math.min(1, Math.abs(gs.dx) / 90);     // DRAG_HORIZONTAL
} else if (pt === "ICE_YETI") {
  delta = Math.min(1, Math.max(0, -gs.dy) / 90);  // DRAG_UP
} else {
  delta = Math.min(1, Math.max(0, gs.dy) / 100);  // DRAG_DOWN (default)
}
```

If your monster's neck/head ailment uses `DRAG_HORIZONTAL` or `DRAG_UP`, add its type to the appropriate branch.

### 2c. Create the SVG render function

Add a new render function before the `renderers` record. The function has access to all component props and animation values via closure.

**Template:**

```tsx
// ─── YOUR MONSTER ───────────────────────────────────────────────────────
const renderYourMonster = () => (
  <Svg width={width} height={height} viewBox="0 0 200 320">
    <Defs>
      <RadialGradient id="ymBody" cx="36%" cy="26%" r="68%">
        <Stop offset="0%" stopColor={glowColor} />
        <Stop offset="100%" stopColor={bodyColor} />
      </RadialGradient>
      <RadialGradient id="ymHead" cx="38%" cy="28%" r="68%">
        <Stop offset="0%" stopColor="#FFFFFF" />
        <Stop offset="100%" stopColor={bodyColor} />
      </RadialGradient>
    </Defs>

    {/* Body — animated for BACK/CHEST/STOMACH ailments */}
    <AnimatedG style={{ transform: [{ rotate: backRotate }, { scaleY: backScaleY }] }}>
      <Ellipse cx="100" cy="200" rx="60" ry="70" fill="url(#ymBody)" />
      {isBack && <Ellipse cx="100" cy="200" rx="63" ry="73"
        fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
    </AnimatedG>

    {/* Legs — animated for LEG ailment */}
    <AnimatedG style={{ transform: [{ translateY: kneeTY }] }}>
      <Rect x="70" y="270" width="24" height="50" rx="12" fill="url(#ymBody)" />
      {isKnee && <Rect x="66" y="265" width="32" height="58" rx="16"
        fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2.5" />}
    </AnimatedG>

    {/* Neck — animated for NECK/TEETH/EYE/HEAD ailments */}
    <AnimatedG style={{ transform: [{ scaleY: neckScaleY }] }}>
      <Rect x="88" y="130" width="24" height="40" rx="12" fill="url(#ymBody)" />
      {isNeck && <Rect x="86" y="128" width="28" height="44" rx="14"
        fill="rgba(255,215,0,0.28)" stroke="#FFD700" strokeWidth="2" />}
    </AnimatedG>

    {/* Head — moves with neck stretch */}
    <AnimatedG style={{ transform: [{ translateY: neckHeadTY }] }}>
      <Circle cx="100" cy="100" r="45" fill="url(#ymHead)" />
      {/* Eyes */}
      <Circle cx="86" cy="98" r="8" fill="#1A1A2E" />
      <Circle cx="114" cy="98" r="8" fill="#1A1A2E" />
      <Circle cx="84" cy="96" r="3.5" fill="white" />
      <Circle cx="112" cy="96" r="3.5" fill="white" />
      {/* Mood overlays — REQUIRED for expressions to work */}
      {renderMoodMouth(mood, 100, 112, 12, accentColor)}
      {renderMoodEyes(mood, 86, 114, 98, 8, bodyColor, accentColor)}
    </AnimatedG>
  </Svg>
);
```

**Available animation values** (use these in `AnimatedG` transforms):

| Value | Use For | Effect |
|-------|---------|--------|
| `neckScaleY` | NECK zone | Stretches neck vertically |
| `neckHeadTY` | Head group | Translates head down with neck |
| `neckTiltDeg` | Head rotation | Tilts head (for horizontal drag) |
| `backRotate` | BACK zone | Rotates body |
| `backScaleY` | BACK zone | Scales body vertically |
| `kneeTY` | LEG zone | Translates leg down |
| `handTX` | HAND zone | Translates hand/arm sideways |
| `breathScale` | Idle animation | Subtle breathing (apply to body) |

**Required mood helpers** (must be called inside the head group):
- `renderMoodMouth(mood, cx, y, halfWidth, color)` — draws mouth based on mood
- `renderMoodEyes(mood, leftX, rightX, eyeY, eyeRadius, faceColor, browColor)` — draws eyebrow/tear overlays

**Glow highlight pattern**: When an ailment zone is active, render a semi-transparent gold overlay:
```tsx
{isBack && <Ellipse cx="100" cy="200" rx="63" ry="73"
  fill="rgba(255,215,0,0.2)" stroke="#FFD700" strokeWidth="2.5" />}
```

### 2d. Register in the renderers record

Find the `renderers` object and add your monster:

```ts
const renderers: Partial<Record<PatientType, () => JSX.Element>> = {
  GOLEM: renderGolem,
  // ... existing entries ...
  YOUR_MONSTER: renderYourMonster,  // ← add here
};
```

---

## Step 3 — Add the Lobby Sitting Sprite

**File:** `src/screens/LobbyScreen.tsx`  
**Asset:** `src/assets/images/sit_yourmonster.png`

### 3a. Create the sitting sprite image

Place a PNG image at `src/assets/images/sit_yourmonster.png`. This is the sprite shown in the waiting room lobby. Existing sprites are approximately **256×256px** with transparent backgrounds.

### 3b. Add the image mapping

Find the `SIT_IMAGES` record and add your entry:

```ts
const SIT_IMAGES: Record<string, any> = {
  GOLEM: require("../assets/images/sit_golem.png"),
  // ... existing entries ...
  YOUR_MONSTER: require("../assets/images/sit_yourmonster.png"),  // ← add here
};
```

> **Note:** No other changes are needed in LobbyScreen. The thought bubble phrases are keyed by `AilmentType` (not monster type), so they work automatically for any monster.

---

## Step 4 — Add X-ray Silhouette Outline

**File:** `src/components/XrayOverlay.tsx`

Find the `getMonsterOutline()` function (a big `switch` statement) and add a case for your monster:

```ts
case "YOUR_MONSTER":
  return "M 0.50 0.08 C 0.38 0.08, ..."  // Normalized 0-1 SVG path
    + "M 0.44 0.32 L 0.56 0.32 "
    + "M 0.34 0.34 C 0.28 0.40, ...";
```

**Path format:**
- All coordinates are **normalized 0–1** (scaled at render time by `scalePath()`)
- Even-indexed numbers = X, odd-indexed = Y
- Draw head → neck → body → limbs → tail
- The `default` case provides a generic silhouette, so this step is optional but recommended for visual polish

> **Note:** The `zoneFor()` function in this file is keyed by `AilmentType`, not monster type — no changes needed there.

---

## Step 5 — Add Collection Screen Icon

**File:** `src/screens/MonsterCollectionScreen.tsx`

Find the `getMonsterIcon()` function and add your monster's emoji:

```ts
function getMonsterIcon(type: string): string {
  switch (type) {
    case "GOLEM": return "🪨";
    // ... existing entries ...
    case "YOUR_MONSTER": return "🎯";  // ← add here
    default: return "❓";
  }
}
```

---

## Quick Checklist

Copy this checklist when adding a new monster:

```
### New Monster: ____________

#### patients.ts
- [ ] Added to `PatientType` union
- [ ] Added `PatientConfig` to `PATIENTS[]` with 2 base ailments
- [ ] Verified ailment types have valid AILMENT_GAME_MAP entries

#### PatientSVGModel.tsx
- [ ] Added zone keys (`_NECK`, `_BACK`, `_KNEE`, or `_HAND`) to `zones` record
- [ ] Added special neck gesture handling (if DRAG_HORIZONTAL or DRAG_UP)
- [ ] Created `renderNewMonster()` SVG function with:
  - [ ] Gradient definitions in `<Defs>`
  - [ ] Body with `backRotate`/`backScaleY` animation
  - [ ] Neck with `neckScaleY` animation
  - [ ] Head with `neckHeadTY` translation
  - [ ] Mood helpers: `renderMoodMouth()` + `renderMoodEyes()`
  - [ ] Gold glow highlights for active ailment zones
- [ ] Registered in `renderers` record

#### LobbyScreen.tsx
- [ ] Created `sit_yourmonster.png` in `src/assets/images/`
- [ ] Added to `SIT_IMAGES` record

#### XrayOverlay.tsx
- [ ] Added case to `getMonsterOutline()` with normalized SVG path

#### MonsterCollectionScreen.tsx
- [ ] Added case to `getMonsterIcon()` with emoji

#### Testing
- [ ] Monster appears in lobby (may need multiple reloads due to randomization)
- [ ] Tapping opens TreatmentScreen with correct SVG model
- [ ] Both ailment zones highlight correctly (gold glow)
- [ ] Gesture interactions work (drag/tap to complete)
- [ ] Mini-games launch for each ailment
- [ ] Monster shows in collection after first treatment
- [ ] X-ray overlay shows correct silhouette
```

---

## Reference: Zone Key Mapping Table

This table shows which zone suffix to use based on the ailment type:

| Ailment Type | Gesture Group | Zone Suffix | PanResponder | Default Gesture |
|-------------|--------------|-------------|-------------|----------------|
| `TEETH` | `isNeck` | `_NECK` | neckPR | DRAG_DOWN |
| `HEAD` | `isNeck` | `_NECK` | neckPR | DRAG_DOWN |
| `NECK` | `isNeck` | `_NECK` | neckPR | DRAG_DOWN* |
| `EYE` | `isNeck` | `_NECK` | neckPR | DRAG_DOWN |
| `BACK` | `isBack` | `_BACK` | backPR | DRAG_UP |
| `CHEST` | `isBack` | `_BACK` | backPR | DRAG_UP |
| `STOMACH` | `isBack` | `_BACK` | backPR | DRAG_UP |
| `LEG` | `isKnee` | `_KNEE` | kneePR | DRAG_DOWN |
| `HAND` | `isHand` | `_HAND` | handPR | TAP_RAPID |

*NECK gesture can be overridden per-monster in `makeNeckPR()` — add to HARPY/CRYSTAL_DEER/GREEN_DEER branch for DRAG_HORIZONTAL, or ICE_YETI branch for DRAG_UP.

---

## Reference: Existing Monsters

| Type | Name | Kingdom | Ailment 1 | Ailment 2 |
|------|------|---------|-----------|-----------|
| `GOLEM` | Pebble | Rock | NECK | BACK |
| `HARPY` | Wispy | Wind | CHEST | NECK |
| `EMBER_KITTEN` | Cinder | Fire | LEG | BACK |
| `ICE_YETI` | Flurry | Ice | TEETH | NECK |
| `MUSHROOM_SPRITE` | Spore | Forest | STOMACH | LEG |
| `MINI_DRAGON` | Zappy | Storm | HEAD | BACK |
| `CRYSTAL_DEER` | Prism | Crystal | HEAD | LEG |
| `LAVA_BLOB` | Magma | Volcano | CHEST | STOMACH |
| `MOON_BUNNY` | Lunar | Moon | EYE | LEG |
| `SNOW_LION` | Frost | Glacier | TEETH | BACK |
| `GREEN_DEER` | Clover | Meadow | STOMACH | NECK |
