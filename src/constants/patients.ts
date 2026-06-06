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

export type AilmentType = "NECK" | "BACK" | "KNEE" | "HAND";
export type GestureType = "DRAG_UP" | "DRAG_DOWN" | "DRAG_HORIZONTAL" | "TAP_RAPID";
export type MiniGameType = "BONE_CRACK" | "JOINT_POP" | "MUSCLE_KNOT" | "NERVE_PINCH" | "SWELLING" | "FIND_PATH";

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
    ailments: [
      {
        id: "golem_neck",
        type: "NECK",
        label: "Stone Neck Crick",
        description: "Tap when the ring hits the circle!",
        gesture: "DRAG_DOWN",
        miniGame: "BONE_CRACK",
        dragThreshold: 120,
        bodyZone: { x: 0.5, y: 0.22, size: 55 },
        crunchLabel: "CRUNCH!",
      },
      {
        id: "golem_back",
        type: "BACK",
        label: "Granite Spine Lock",
        description: "Find the path through the blockage!",
        gesture: "DRAG_UP",
        miniGame: "FIND_PATH",
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
    ailments: [
      {
        id: "harpy_wing",
        type: "HAND",
        label: "Ruffled Wing Feathers",
        description: "Tap fast to smooth them out!",
        gesture: "TAP_RAPID",
        miniGame: "MUSCLE_KNOT",
        dragThreshold: 80,
        tapCount: 5,
        bodyZone: { x: 0.25, y: 0.4, size: 50 },
        crunchLabel: "SNAP!",
      },
      {
        id: "harpy_neck",
        type: "NECK",
        label: "Tweaked Birdie Neck",
        description: "Tap when the ring hits the circle!",
        gesture: "DRAG_HORIZONTAL",
        miniGame: "BONE_CRACK",
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
    ailments: [
      {
        id: "kitten_knee",
        type: "KNEE",
        label: "Scorched Knee Lock",
        description: "Draw circles to massage!",
        gesture: "DRAG_DOWN",
        miniGame: "SWELLING",
        dragThreshold: 100,
        bodyZone: { x: 0.35, y: 0.72, size: 48 },
        crunchLabel: "POP!",
      },
      {
        id: "kitten_back",
        type: "BACK",
        label: "Fiery Spine Twist",
        description: "Trace the nerve path!",
        gesture: "DRAG_UP",
        miniGame: "NERVE_PINCH",
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
    ailments: [
      {
        id: "yeti_hand",
        type: "HAND",
        label: "Frozen Finger Joints",
        description: "Drag the bone into position!",
        gesture: "TAP_RAPID",
        miniGame: "JOINT_POP",
        dragThreshold: 70,
        tapCount: 7,
        bodyZone: { x: 0.72, y: 0.45, size: 50 },
        crunchLabel: "SHATTER!",
      },
      {
        id: "yeti_neck",
        type: "NECK",
        label: "Icy Neck Freeze",
        description: "Tap when the ring hits the circle!",
        gesture: "DRAG_UP",
        miniGame: "BONE_CRACK",
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
    ailments: [
      {
        id: "mushroom_back",
        type: "BACK",
        label: "Compressed Stem",
        description: "Find the path to release!",
        gesture: "DRAG_UP",
        miniGame: "FIND_PATH",
        dragThreshold: 95,
        bodyZone: { x: 0.5, y: 0.52, size: 55 },
        crunchLabel: "POOF!",
      },
      {
        id: "mushroom_knee",
        type: "KNEE",
        label: "Rooted Foot",
        description: "Draw circles to massage!",
        gesture: "DRAG_DOWN",
        miniGame: "SWELLING",
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
    ailments: [
      {
        id: "dragon_neck",
        type: "NECK",
        label: "Cricked Dragon Neck",
        description: "Trace the nerve path!",
        gesture: "DRAG_DOWN",
        miniGame: "NERVE_PINCH",
        dragThreshold: 100,
        bodyZone: { x: 0.5, y: 0.28, size: 50 },
        crunchLabel: "ZAP!",
      },
      {
        id: "dragon_back",
        type: "BACK",
        label: "Wing Root Tension",
        description: "Tap when the ring hits the circle!",
        gesture: "DRAG_UP",
        miniGame: "BONE_CRACK",
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
    ailments: [
      {
        id: "deer_neck",
        type: "NECK",
        label: "Crystallized Neck",
        description: "Drag the crystal into position!",
        gesture: "DRAG_HORIZONTAL",
        miniGame: "JOINT_POP",
        dragThreshold: 80,
        bodyZone: { x: 0.5, y: 0.22, size: 48 },
        crunchLabel: "TINK!",
      },
      {
        id: "deer_knee",
        type: "KNEE",
        label: "Locked Hoof",
        description: "Tap when the ring hits the circle!",
        gesture: "DRAG_DOWN",
        miniGame: "BONE_CRACK",
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
    ailments: [
      {
        id: "lava_hand",
        type: "HAND",
        label: "Lava Bubble Joints",
        description: "Tap fast to pop the bubbles!",
        gesture: "TAP_RAPID",
        miniGame: "MUSCLE_KNOT",
        dragThreshold: 70,
        tapCount: 6,
        bodyZone: { x: 0.75, y: 0.48, size: 50 },
        crunchLabel: "BLORP!",
      },
      {
        id: "lava_back",
        type: "BACK",
        label: "Core Pressure Lock",
        description: "Find the path to release pressure!",
        gesture: "DRAG_UP",
        miniGame: "FIND_PATH",
        dragThreshold: 110,
        bodyZone: { x: 0.5, y: 0.5, size: 65 },
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
    ailments: [
      {
        id: "bunny_neck",
        type: "NECK",
        label: "Droopy Ear Tendons",
        description: "Trace the nerve path!",
        gesture: "DRAG_DOWN",
        miniGame: "NERVE_PINCH",
        dragThreshold: 100,
        bodyZone: { x: 0.5, y: 0.15, size: 55 },
        crunchLabel: "PLOP!",
      },
      {
        id: "bunny_knee",
        type: "KNEE",
        label: "Hop Joint Stiffness",
        description: "Drag the bone into position!",
        gesture: "DRAG_DOWN",
        miniGame: "JOINT_POP",
        dragThreshold: 95,
        bodyZone: { x: 0.62, y: 0.72, size: 48 },
        crunchLabel: "BOING!",
      },
    ],
  },
];

export default PATIENTS;

export function getRandomPatients(count: number): PatientConfig[] {
  const shuffled = [...PATIENTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
