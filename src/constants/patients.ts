export type PatientType =
  | "GOLEM"
  | "HARPY"
  | "EMBER_KITTEN"
  | "ICE_YETI"
  | "MUSHROOM_SPRITE"
  | "MINI_DRAGON"
  | "CRYSTAL_DEER"
  | "LAVA_BLOB"
  | "MOON_BUNNY";

export type AilmentType = "TEETH" | "HEAD" | "NECK" | "CHEST" | "BACK" | "LEG" | "STOMACH" | "EYE";
export type GestureType = "DRAG_UP" | "DRAG_DOWN" | "DRAG_HORIZONTAL" | "TAP_RAPID";
export type MiniGameType = "DENTAL_CHECK" | "XRAY_SCAN" | "HEART_PUMP" | "NERVE_LINK" | "SWELLING" | "FIND_PATH" | "EYE_TEST";

const ALL_MINI_GAMES: MiniGameType[] = [
  "DENTAL_CHECK", "XRAY_SCAN", "HEART_PUMP", "NERVE_LINK", "SWELLING", "FIND_PATH", "EYE_TEST",
];

/** Fixed mapping: each ailment type → allowed mini-games */
const AILMENT_GAME_MAP: Record<AilmentType, MiniGameType[]> = {
  TEETH:   ["DENTAL_CHECK"],
  HEAD:    ["NERVE_LINK", "XRAY_SCAN"],
  NECK:    ["NERVE_LINK", "XRAY_SCAN"],
  CHEST:   ["HEART_PUMP"],
  BACK:    ["XRAY_SCAN", "SWELLING"],
  LEG:     ["XRAY_SCAN"],
  STOMACH: ["FIND_PATH"],
  EYE:     ["EYE_TEST"],
};

/** Pick a random valid mini-game for a given ailment type */
function gameForAilment(type: AilmentType): MiniGameType {
  const pool = AILMENT_GAME_MAP[type];
  return pool[Math.floor(Math.random() * pool.length)];
}

export interface Ailment {
  id: string;
  type: AilmentType;
  label: string;
  description: string;
  gesture: GestureType;
  miniGame: MiniGameType;
  dragThreshold: number;
  tapCount?: number;
  bodyZone: { x: number; y: number; size: number };
  crunchLabel: string;
}

export interface PatientConfig {
  type: PatientType;
  name: string;
  kingdom: string;
  bodyColor: string;
  glowColor: string;
  accentColor: string;
  image: any;
  stiffness: number;
  patienceDuration: number;
  rewardMultiplier: number;
  baseReward: number;
  ailments: Ailment[];
  description: string;
  entrySound: string;
  /** Patient difficulty level (1-5). Set dynamically by getRandomPatients. */
  level: number;
}

const PATIENTS: PatientConfig[] = [
  {
    type: "GOLEM",
    name: "Pebble",
    kingdom: "Rock Kingdom",
    bodyColor: "#8B7B5E",
    glowColor: "#C9B08A",
    accentColor: "#6B5B40",
    image: require("../assets/images/sit_golem.png"),
    stiffness: 0.4,
    patienceDuration: 45,
    rewardMultiplier: 1.2,
    baseReward: 80,
    description: "A chubby rock golem with petrified posture issues.",
    entrySound: "thud",
    level: 1,
    ailments: [
      {
        id: "golem_neck",
        type: "NECK",
        label: "Stone Neck Crick",
        description: "Reconnect the pinched nerves!",
        gesture: "DRAG_DOWN",
        miniGame: "NERVE_LINK",
        dragThreshold: 120,
        bodyZone: { x: 0.5, y: 0.22, size: 55 },
        crunchLabel: "CRUNCH!",
      },
      {
        id: "golem_back",
        type: "BACK",
        label: "Granite Spine Lock",
        description: "X-ray the spine!",
        gesture: "DRAG_UP",
        miniGame: "XRAY_SCAN",
        dragThreshold: 100,
        bodyZone: { x: 0.5, y: 0.55, size: 60 },
        crunchLabel: "CRACK!",
      },
    ],
  },
  {
    type: "HARPY",
    name: "Wispy",
    kingdom: "Wind Kingdom",
    bodyColor: "#C8E8F5",
    glowColor: "#A8D8EA",
    accentColor: "#6EB5D0",
    image: require("../assets/images/sit_harpy.png"),
    stiffness: 1.8,
    patienceDuration: 25,
    rewardMultiplier: 1.5,
    baseReward: 100,
    description: "A feathery little harpy with delicate wing joints.",
    entrySound: "flutter",
    level: 1,
    ailments: [
      {
        id: "harpy_chest",
        type: "CHEST",
        label: "Fluttering Heartbeat",
        description: "Pump to steady the heart!",
        gesture: "TAP_RAPID",
        miniGame: "HEART_PUMP",
        dragThreshold: 80,
        tapCount: 5,
        bodyZone: { x: 0.5, y: 0.38, size: 50 },
        crunchLabel: "THUMP!",
      },
      {
        id: "harpy_neck",
        type: "NECK",
        label: "Tweaked Birdie Neck",
        description: "X-ray the neck bones!",
        gesture: "DRAG_HORIZONTAL",
        miniGame: "XRAY_SCAN",
        dragThreshold: 80,
        bodyZone: { x: 0.5, y: 0.2, size: 48 },
        crunchLabel: "POP!",
      },
    ],
  },
  {
    type: "EMBER_KITTEN",
    name: "Cinder",
    kingdom: "Fire Kingdom",
    bodyColor: "#FF8C00",
    glowColor: "#FFB347",
    accentColor: "#CC5500",
    image: require("../assets/images/sit_kitten.png"),
    stiffness: 1.0,
    patienceDuration: 20,
    rewardMultiplier: 1.8,
    baseReward: 120,
    description: "An energetic ember kitten with a fiery posture.",
    entrySound: "sizzle",
    level: 1,
    ailments: [
      {
        id: "kitten_leg",
        type: "LEG",
        label: "Scorched Leg Lock",
        description: "X-ray the leg bones!",
        gesture: "DRAG_DOWN",
        miniGame: "XRAY_SCAN",
        dragThreshold: 100,
        bodyZone: { x: 0.35, y: 0.72, size: 48 },
        crunchLabel: "POP!",
      },
      {
        id: "kitten_back",
        type: "BACK",
        label: "Fiery Spine Twist",
        description: "Press the swelling down!",
        gesture: "DRAG_UP",
        miniGame: "SWELLING",
        dragThreshold: 110,
        bodyZone: { x: 0.5, y: 0.5, size: 55 },
        crunchLabel: "CRACK!",
      },
    ],
  },
  {
    type: "ICE_YETI",
    name: "Flurry",
    kingdom: "Ice Kingdom",
    bodyColor: "#B8E8FF",
    glowColor: "#DCF4FF",
    accentColor: "#5BBFDF",
    image: require("../assets/images/sit_yeti.png"),
    stiffness: 0.6,
    patienceDuration: 35,
    rewardMultiplier: 1.3,
    baseReward: 90,
    description: "A big fluffy snowball yeti with frozen joints.",
    entrySound: "ice",
    level: 1,
    ailments: [
      {
        id: "yeti_teeth",
        type: "TEETH",
        label: "Frozen Fang Ache",
        description: "Check the frozen teeth!",
        gesture: "TAP_RAPID",
        miniGame: "DENTAL_CHECK",
        dragThreshold: 70,
        tapCount: 7,
        bodyZone: { x: 0.5, y: 0.18, size: 50 },
        crunchLabel: "SHATTER!",
      },
      {
        id: "yeti_neck",
        type: "NECK",
        label: "Icy Neck Freeze",
        description: "Reconnect the neck nerves!",
        gesture: "DRAG_UP",
        miniGame: "NERVE_LINK",
        dragThreshold: 90,
        bodyZone: { x: 0.5, y: 0.22, size: 52 },
        crunchLabel: "CRACK!",
      },
    ],
  },
  {
    type: "MUSHROOM_SPRITE",
    name: "Spore",
    kingdom: "Forest Kingdom",
    bodyColor: "#D4A8C8",
    glowColor: "#EAC8DE",
    accentColor: "#A870A8",
    image: require("../assets/images/sit_mushroom.png"),
    stiffness: 0.7,
    patienceDuration: 30,
    rewardMultiplier: 1.4,
    baseReward: 95,
    description: "A tiny mushroom sprite with a stiff little stem.",
    entrySound: "poof",
    level: 1,
    ailments: [
      {
        id: "mushroom_stomach",
        type: "STOMACH",
        label: "Spore Belly Bloat",
        description: "Find the path to release!",
        gesture: "DRAG_UP",
        miniGame: "FIND_PATH",
        dragThreshold: 95,
        bodyZone: { x: 0.5, y: 0.52, size: 55 },
        crunchLabel: "POOF!",
      },
      {
        id: "mushroom_leg",
        type: "LEG",
        label: "Rooted Foot",
        description: "X-ray the leg!",
        gesture: "DRAG_DOWN",
        miniGame: "XRAY_SCAN",
        dragThreshold: 90,
        bodyZone: { x: 0.38, y: 0.8, size: 45 },
        crunchLabel: "SNAP!",
      },
    ],
  },
  {
    type: "MINI_DRAGON",
    name: "Zappy",
    kingdom: "Storm Kingdom",
    bodyColor: "#7B5EA7",
    glowColor: "#A88AD4",
    accentColor: "#FFD700",
    image: require("../assets/images/sit_dragon.png"),
    stiffness: 1.5,
    patienceDuration: 22,
    rewardMultiplier: 1.6,
    baseReward: 110,
    description: "A sparky little dragon with neck kinks from flying.",
    entrySound: "zap",
    level: 1,
    ailments: [
      {
        id: "dragon_head",
        type: "HEAD",
        label: "Zapped Dragon Skull",
        description: "Reconnect the head nerves!",
        gesture: "DRAG_DOWN",
        miniGame: "NERVE_LINK",
        dragThreshold: 100,
        bodyZone: { x: 0.5, y: 0.15, size: 50 },
        crunchLabel: "ZAP!",
      },
      {
        id: "dragon_back",
        type: "BACK",
        label: "Wing Root Tension",
        description: "X-ray the spine!",
        gesture: "DRAG_UP",
        miniGame: "XRAY_SCAN",
        dragThreshold: 105,
        bodyZone: { x: 0.5, y: 0.55, size: 60 },
        crunchLabel: "CRACK!",
      },
    ],
  },
  {
    type: "CRYSTAL_DEER",
    name: "Prism",
    kingdom: "Crystal Kingdom",
    bodyColor: "#9CC8E8",
    glowColor: "#C8E8F8",
    accentColor: "#60A0C8",
    image: require("../assets/images/sit_deer.png"),
    stiffness: 1.1,
    patienceDuration: 38,
    rewardMultiplier: 1.4,
    baseReward: 95,
    description: "An elegant crystal deer with frozen neck joints.",
    entrySound: "chime",
    level: 1,
    ailments: [
      {
        id: "deer_head",
        type: "HEAD",
        label: "Crystallized Antlers",
        description: "X-ray the skull!",
        gesture: "DRAG_HORIZONTAL",
        miniGame: "XRAY_SCAN",
        dragThreshold: 80,
        bodyZone: { x: 0.5, y: 0.15, size: 48 },
        crunchLabel: "TINK!",
      },
      {
        id: "deer_leg",
        type: "LEG",
        label: "Locked Hoof",
        description: "X-ray the hoof bones!",
        gesture: "DRAG_DOWN",
        miniGame: "XRAY_SCAN",
        dragThreshold: 95,
        bodyZone: { x: 0.38, y: 0.72, size: 48 },
        crunchLabel: "CRACK!",
      },
    ],
  },
  {
    type: "LAVA_BLOB",
    name: "Magma",
    kingdom: "Volcano Kingdom",
    bodyColor: "#3D1A00",
    glowColor: "#FF6B35",
    accentColor: "#CC3300",
    image: require("../assets/images/sit_lava.png"),
    stiffness: 0.8,
    patienceDuration: 28,
    rewardMultiplier: 1.7,
    baseReward: 115,
    description: "A molten lava blob with pressurized joints.",
    entrySound: "rumble",
    level: 1,
    ailments: [
      {
        id: "lava_chest",
        type: "CHEST",
        label: "Lava Core Overload",
        description: "Pump the lava core!",
        gesture: "TAP_RAPID",
        miniGame: "HEART_PUMP",
        dragThreshold: 70,
        tapCount: 6,
        bodyZone: { x: 0.5, y: 0.38, size: 55 },
        crunchLabel: "BLORP!",
      },
      {
        id: "lava_stomach",
        type: "STOMACH",
        label: "Magma Gut Pressure",
        description: "Find the path to release pressure!",
        gesture: "DRAG_UP",
        miniGame: "FIND_PATH",
        dragThreshold: 110,
        bodyZone: { x: 0.5, y: 0.58, size: 65 },
        crunchLabel: "BOOM!",
      },
    ],
  },
  {
    type: "MOON_BUNNY",
    name: "Lunar",
    kingdom: "Moon Kingdom",
    bodyColor: "#C8C0E8",
    glowColor: "#E8E0F8",
    accentColor: "#8878C0",
    image: require("../assets/images/sit_bunny.png"),
    stiffness: 0.9,
    patienceDuration: 42,
    rewardMultiplier: 1.3,
    baseReward: 88,
    description: "A fluffy moon bunny with droopy ear tendons.",
    entrySound: "boing",
    level: 1,
    ailments: [
      {
        id: "bunny_eye",
        type: "EYE",
        label: "Moonblind Haze",
        description: "Focus the blurry vision!",
        gesture: "DRAG_DOWN",
        miniGame: "EYE_TEST",
        dragThreshold: 100,
        bodyZone: { x: 0.5, y: 0.12, size: 55 },
        crunchLabel: "BLINK!",
      },
      {
        id: "bunny_leg",
        type: "LEG",
        label: "Hop Leg Stiffness",
        description: "X-ray the leg bones!",
        gesture: "DRAG_DOWN",
        miniGame: "XRAY_SCAN",
        dragThreshold: 95,
        bodyZone: { x: 0.62, y: 0.72, size: 48 },
        crunchLabel: "BOING!",
      },
    ],
  },
];

export default PATIENTS;

// Extra ailment templates for generating additional ailments at higher levels
const EXTRA_AILMENT_POOL: Omit<Ailment, "id" | "miniGame">[] = [
  { type: "TEETH", label: "Cracked Fang", description: "Check the cracked tooth!", gesture: "TAP_RAPID", dragThreshold: 90, bodyZone: { x: 0.5, y: 0.18, size: 50 }, crunchLabel: "CRUNCH!" },
  { type: "HEAD", label: "Dizzy Skull", description: "Reconnect head nerves!", gesture: "TAP_RAPID", dragThreshold: 90, bodyZone: { x: 0.5, y: 0.12, size: 50 }, crunchLabel: "BONK!" },
  { type: "NECK", label: "Stiff Neck", description: "X-ray the neck!", gesture: "DRAG_DOWN", dragThreshold: 100, bodyZone: { x: 0.5, y: 0.25, size: 48 }, crunchLabel: "CRACK!" },
  { type: "CHEST", label: "Weak Heartbeat", description: "Pump the heart!", gesture: "TAP_RAPID", dragThreshold: 85, tapCount: 6, bodyZone: { x: 0.5, y: 0.38, size: 52 }, crunchLabel: "THUMP!" },
  { type: "BACK", label: "Sore Spine", description: "X-ray the spine!", gesture: "DRAG_UP", dragThreshold: 110, bodyZone: { x: 0.5, y: 0.52, size: 55 }, crunchLabel: "POP!" },
  { type: "LEG", label: "Wobbly Leg", description: "X-ray the leg!", gesture: "DRAG_DOWN", dragThreshold: 100, bodyZone: { x: 0.4, y: 0.78, size: 45 }, crunchLabel: "SNAP!" },
  { type: "STOMACH", label: "Tummy Trouble", description: "Find the path to relief!", gesture: "DRAG_HORIZONTAL", dragThreshold: 95, bodyZone: { x: 0.5, y: 0.6, size: 50 }, crunchLabel: "GURGLE!" },
  { type: "EYE", label: "Blurry Vision", description: "Focus the blurry eye!", gesture: "TAP_RAPID", dragThreshold: 85, tapCount: 5, bodyZone: { x: 0.5, y: 0.14, size: 40 }, crunchLabel: "BLINK!" },
];

/**
 * Rank index → max patient level unlocked:
 *   0 (Newbie)     → L1 only
 *   1 (Intern)     → L1-L2
 *   2 (Junior)     → L1-L3
 *   3 (Specialist) → L1-L4
 *   4+ (Master/Legend) → L1-L5
 */
function maxLevelForRank(rankIndex: number): number {
  return Math.min(5, rankIndex + 1);
}

/** Number of ailments for a given patient level */
function ailmentCountForLevel(level: number): number {
  if (level <= 1) return 1;
  if (level <= 3) return level; // L2→2, L3→3
  return 4; // L4 and L5 both get 4 ailments
}

export function getRandomPatients(count: number, rankIndex: number = 0): PatientConfig[] {
  const maxLevel = maxLevelForRank(rankIndex);
  const shuffled = [...PATIENTS].sort(() => Math.random() - 0.5);

  return shuffled.slice(0, count).map((patient) => {
    // Pick a random level from 1..maxLevel
    const level = Math.floor(Math.random() * maxLevel) + 1;
    const ailmentCount = ailmentCountForLevel(level);

    // Start with the patient's base ailments (up to ailmentCount)
    // Assign mini-game based on ailment type mapping
    const baseAilments = patient.ailments.slice(0, ailmentCount).map((ail) => ({
      ...ail,
      miniGame: gameForAilment(ail.type),
    }));

    // If we need more ailments than the base provides, generate extras
    if (baseAilments.length < ailmentCount) {
      const usedTypes = new Set(baseAilments.map(a => a.type));
      const extraPool = EXTRA_AILMENT_POOL
        .filter(a => !usedTypes.has(a.type))
        .sort(() => Math.random() - 0.5);

      for (let i = baseAilments.length; i < ailmentCount && extraPool.length > 0; i++) {
        const template = extraPool.shift()!;
        usedTypes.add(template.type);
        baseAilments.push({
          ...template,
          id: `${patient.type.toLowerCase()}_extra_${i}`,
          miniGame: gameForAilment(template.type),
        });
      }
    }

    // Scale rewards with level
    const rewardMult = 1 + (level - 1) * 0.25;

    return {
      ...patient,
      level,
      ailments: baseAilments,
      baseReward: Math.round(patient.baseReward * rewardMult),
      patienceDuration: Math.round(patient.patienceDuration * (1 + (level - 1) * 0.3)),
    };
  });
}
