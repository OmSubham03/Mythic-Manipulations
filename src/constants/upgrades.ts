export interface UpgradeConfig {
  id: string;
  name: string;
  description: string;
  effect: string;
  cost: number;
  iconName: string;
  color: string;
}

const UPGRADES: UpgradeConfig[] = [
  {
    id: "plush_table",
    name: "Plush Exam Table",
    description: "Extra-comfy padding for your patients.",
    effect: "+15 seconds patience for Fire patients",
    cost: 200,
    iconName: "bed",
    color: "#FF9BB0",
  },
  {
    id: "incense",
    name: "Soothing Incense",
    description: "Calming lavender scent fills the room.",
    effect: "+10 seconds patience for all patients",
    cost: 300,
    iconName: "flower",
    color: "#C3A6FF",
  },
  {
    id: "squeaky_toys",
    name: "Squeaky Toy Collection",
    description: "Distracts patients so they wait longer.",
    effect: "+20% bonus coins per treatment",
    cost: 400,
    iconName: "star",
    color: "#FFD166",
  },
  {
    id: "crystal_ball",
    name: "Diagnosis Crystal Ball",
    description: "Shows the correct ailment order upfront.",
    effect: "Always reveals correct treatment order",
    cost: 500,
    iconName: "radio-button-on",
    color: "#7ECEC4",
  },
];

export default UPGRADES;
