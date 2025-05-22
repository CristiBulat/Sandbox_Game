// Game constants and data

export const resourceTypes = ["ironScraps", "arcaneDust", "alchemicalReagents"] as const;

export type ResourceType = (typeof resourceTypes)[number];

export type Recipe = {
  name: string;
  cost: {
    [key in ResourceType]?: number;
  };
  description: string;
};

export const recipes: Recipe[] = [
  {
    name: "Greater Healing Potion",
    description: "Restores full health",
    cost: { ironScraps: 1, alchemicalReagents: 1 },
  },
  {
    name: "Enchanted Armor Piece",
    description: "+50% shadow resistance",
    cost: { ironScraps: 2, arcaneDust: 2, alchemicalReagents: 2 },
  },
  {
    name: "Quiver of Bolts",
    description: "Refills crossbow bolts",
    cost: { ironScraps: 2, arcaneDust: 1 },
  },
  {
    name: "Boots of Swiftness",
    description: "+1 player speed",
    cost: { ironScraps: 2, alchemicalReagents: 1 },
  },
  {
    name: "Skeleton Key",
    description: "Unlocks any enchanted portal once", // Changed from door
    cost: { arcaneDust: 3 },
  },
  {
    name: "Heavy Crossbow",
    description: "Powerful weapon that can vanquish foes",
    cost: { ironScraps: 4, arcaneDust: 3, alchemicalReagents: 2 },
  },
  {
    name: "Amulet of Shielding",
    description: "Temporary invulnerability",
    cost: { ironScraps: 3, arcaneDust: 4, alchemicalReagents: 2 },
  },
  {
    name: "Orb of Revealing",
    description: "Reveals nearby cursed areas",
    cost: { arcaneDust: 2, alchemicalReagents: 1 },
  },
  {
    name: "Berserker's Draught",
    description: "Temporary damage boost",
    cost: { ironScraps: 1, alchemicalReagents: 3 },
  },
  {
    name: "Rune of Paralysis",
    description: "Stuns all enemies in the area",
    cost: { ironScraps: 2, arcaneDust: 2, alchemicalReagents: 1 },
  },
];

export type Room = {
  name: string;
  doors: Door[]; // Doors are now portals
  walls: Wall[];
  hazards: Hazard[];
  items: Item[];
  enemies: Enemy[];
  spawn: { x: number; y: number };
  bgColor1: string;
  bgColor2: string;
  bgType: "gradient" | "skyline" | "forest" | "dungeon";
  skylineColor?: string;
  fgColor?: string;
};

export type Door = { // Represents portals
  x: number;
  y: number;
  w: number; // Width of the portal image
  h: number; // Height of the portal image
  target: number;
  dest: { x: number; y: number };
  lock: false | "key"; // 'key' now refers to 'ornateKey' for portals
};

export type Wall = {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
};

export type Hazard = {
  x: number;
  y: number;
  w: number;
  h: number;
  dmg: number;
  type?: "cursedGround" | "spikeTrap";
};

export type Item = {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "healthPotion" | "ornateKey" | "ironScraps" | "arcaneDust" | "alchemicalReagents" | "anvil";
};

export type EnemyAttackType = "melee" | "shoot" | "lunge" | "bossPattern";

export type Enemy = {
  x: number;
  y: number;
  size: number;
  speed: number;
  damage: number;
  hp: number;
  hpMax: number;
  sprite: string; // Sprite name (e.g., "shadowMinion")
  attackType: EnemyAttackType;
  attackCooldown?: number; // Frames between attacks
  lastAttackTime?: number; // Frame timestamp of last attack
  projectileType?: "shadowBolt"; // Type of projectile
  shootRange?: number; // Max distance to start shooting
  lungeRange?: number; // Max distance for lunge
  lungeSpeed?: number;
  isLunging?: boolean;
  lungeTargetX?: number;
  lungeTargetY?: number;
  color?: string; // Fallback if sprite fails, but ideally sprites always work
};

// Define enemy types
const shadowMinion: Omit<Enemy, 'x' | 'y' | 'lastAttackTime'> = {
  size: 36, speed: 1.8, damage: 12, hp: 50, hpMax: 50,
  sprite: "shadowMinion", attackType: "melee",
};

const shadowSorcerer: Omit<Enemy, 'x' | 'y' | 'lastAttackTime'> = {
  size: 40, speed: 1.2, damage: 8, hp: 70, hpMax: 70,
  sprite: "shadowSorcerer", attackType: "shoot",
  attackCooldown: 120, projectileType: "shadowBolt", shootRange: 350,
};

const shadowOverlord: Omit<Enemy, 'x' | 'y' | 'lastAttackTime' | 'isLunging' | 'lungeTargetX' | 'lungeTargetY'> = {
  size: 80, speed: 1.0, damage: 25, hp: 500, hpMax: 500,
  sprite: "shadowOverlord", attackType: "bossPattern",
  attackCooldown: 150, projectileType: "shadowBolt", shootRange: 400,
  lungeRange: 200, lungeSpeed: 10,
};


export const rooms: Room[] = [
  /* 0 — Whispering Woods Entrance */
  {
    name: "Whispering Woods Entrance",
    bgType: "forest", bgColor1: "#223822", bgColor2: "#112211", fgColor: "#001100",
    doors: [
      { x: 550, y: 170, w: 50, h: 80, target: 1, dest: { x: 80, y: 200 }, lock: false },
      { x: 280, y: 40, w: 50, h: 80, target: 6, dest: { x: 560, y: 60 }, lock: false },
    ],
    walls: [{ x: 230, y: 260, w: 180, h: 24, color: "#4a3b2a" }],
    hazards: [{ x: 120, y: 120, w: 90, h: 90, dmg: 0.05, type: "cursedGround" }],
    items: [
      { x: 300, y: 320, w: 30, h: 30, type: "healthPotion" },
      { x: 450, y: 420, w: 56, h: 56, type: "ironScraps" },
    ],
    enemies: [
      { ...shadowMinion, x: 420, y: 100 },
      { ...shadowMinion, x: 150, y: 280 },
    ],
    spawn: { x: 50, y: 200 },
  },
  /* 1 — Ancient Grove */
  {
    name: "Ancient Grove",
    bgType: "forest", bgColor1: "#1e421e", bgColor2: "#0f2f0f", fgColor: "#342a1e",
    doors: [
      { x: -10, y: 170, w: 50, h: 80, target: 0, dest: { x: 500, y: 200 }, lock: false },
      { x: 550, y: 40, w: 50, h: 80, target: 2, dest: { x: 80, y: 50 }, lock: "key" },
      { x: 10, y: 320, w: 50, h: 80, target: 4, dest: { x: 400, y: 280 }, lock: false },
      { x: 550, y: 120, w: 50, h: 80, target: 8, dest: { x: 80, y: 120 }, lock: false },
    ],
    walls: [{ x: 200, y: 180, w: 100, h: 20, color: "#605040" }],
    hazards: [],
    items: [
      { x: 260, y: 80, w: 38, h: 38, type: "ornateKey" },
      { x: 320, y: 300, w: 36, h: 36, type: "alchemicalReagents" },
    ],
    enemies: [
      { ...shadowSorcerer, x: 380, y: 260 },
      { ...shadowMinion, x: 140, y: 60 },
    ],
    spawn: { x: 70, y: 200 },
  },
  /* 2 — Castle Outer Wall */
  {
    name: "Castle Outer Wall",
    bgType: "dungeon", bgColor1: "#4a525a", bgColor2: "#303840", skylineColor: "#15181c",
    doors: [
      { x: -10, y: 40, w: 60, h: 90, target: 1, dest: { x: 500, y: 40 }, lock: false }, // Portals can be larger
      { x: 280, y: 350, w: 60, h: 90, target: 3, dest: { x: 300, y: 250 }, lock: false },
      { x: 550, y: 310, w: 60, h: 90, target: 5, dest: { x: 80, y: 300 }, lock: "key" },
      { x: 550, y: 140, w: 60, h: 90, target: 7, dest: { x: 20, y: 320 }, lock: false },
    ],
    walls: [{ x: 260, y: 0, w: 80, h: 140, color: "#202428" }],
    hazards: [{ x: 150, y: 210, w: 160, h: 100, dmg: 0.08, type: "spikeTrap" }],
    items: [{ x: 120, y: 60, w: 36, h: 36, type: "arcaneDust" }],
    enemies: [
      { ...shadowSorcerer, x: 100, y: 260, speed: 1.0, hp: 90, hpMax: 90 },
      { ...shadowMinion, x: 400, y: 100 },
    ],
    spawn: { x: 60, y: 60 },
  },
  /* 3 — Castle Dungeon */
  {
    name: "Castle Dungeon",
    bgType: "dungeon", bgColor1: "#302828", bgColor2: "#1a1414",
    doors: [
      { x: 280, y: 400, w: 50, h: 80, target: 2, dest: { x: 280, y: 340 }, lock: false },
    ],
    walls: [
      { x: 200, y: 0, w: 20, h: 200, color: "#403838" },
      { x: 380, y: 200, w: 20, h: 200, color: "#403838" },
    ],
    hazards: [{ x: 0, y: 0, w: 600, h: 400, dmg: 0.12, type: "cursedGround" }],
    items: [{ x: 290, y: 190, w: 20, h: 20, type: "healthPotion" }],
    enemies: [
      { ...shadowSorcerer, x: 270, y: 180, damage: 15, hp: 120, hpMax: 120 },
      { ...shadowMinion, x: 100, y: 100 },
      { ...shadowMinion, x: 450, y: 100 },
    ],
    spawn: { x: 300, y: 250 },
  },
  /* 4 — Hidden Forge (safe) */
  {
    name: "Hidden Forge",
    bgType: "dungeon", bgColor1: "#3a3a3a", bgColor2: "#2a2a2a",
    doors: [
      { x: 560, y: 320, w: 50, h: 80, target: 1, dest: { x: 70, y: 200 }, lock: false },
    ],
    walls: [{ x: 300, y: 150, w: 120, h: 20, color: "#504030" }],
    hazards: [],
    items: [
      { x: 282, y: 152, w: 56, h: 56, type: "anvil" },
      { x: 180, y: 300, w: 16, h: 16, type: "ironScraps" },
      { x: 500, y: 120, w: 16, h: 16, type: "alchemicalReagents" },
    ],
    enemies: [],
    spawn: { x: 400, y: 280 },
  },
  /* 5 — King's Armory (safe advanced) */
  {
    name: "King's Armory",
    bgType: "dungeon", bgColor1: "#2c2c2c", bgColor2: "#1a1a1a",
    doors: [
      { x: -10, y: 320, w: 50, h: 80, target: 2, dest: { x: 500, y: 300 }, lock: false },
      { x: 560, y: 120, w: 50, h: 80, target: 9, dest: { x: 60, y: 100 }, lock: "key" },
    ],
    walls: [{ x: 240, y: 240, w: 200, h: 20, color: "#444" }],
    hazards: [],
    items: [
      { x: 282, y: 182, w: 56, h: 56, type: "anvil" },
      { x: 140, y: 200, w: 36, h: 36, type: "arcaneDust" },
      { x: 520, y: 380, w: 36, h: 36, type: "ironScraps" },
      { x: 300, y: 60, w: 36, h: 36, type: "alchemicalReagents" },
    ],
    enemies: [],
    spawn: { x: 60, y: 280 },
  },
  /* 6 — Ruined Chapel */
  {
    name: "Ruined Chapel",
    bgType: "dungeon", bgColor1: "#3a3a3e", bgColor2: "#28282c",
    doors: [
      { x: -10, y: 60, w: 50, h: 80, target: 0, dest: { x: 560, y: 80 }, lock: false },
      { x: 560, y: 180, w: 50, h: 80, target: 7, dest: { x: 20, y: 180 }, lock: "key" },
    ],
    walls: [
      { x: 240, y: 120, w: 120, h: 20, color: "#505058" },
      { x: 100, y: 300, w: 200, h: 20, color: "#505058" },
    ],
    hazards: [{ x: 300, y: 200, w: 100, h: 80, dmg: 0.06, type: "cursedGround" }],
    items: [
      { x: 200, y: 140, w: 30, h: 30, type: "healthPotion" },
      { x: 120, y: 340, w: 30, h: 30, type: "ironScraps" },
      { x: 460, y: 260, w: 30, h: 30, type: "alchemicalReagents" },
    ],
    enemies: [
      { ...shadowSorcerer, x: 320, y: 60 },
      { ...shadowMinion, x: 420, y: 320, speed: 2.0 },
      { ...shadowMinion, x: 100, y: 200 },
    ],
    spawn: { x: 300, y: 80 },
  },
  /* 7 — Forgotten Catacombs */
  {
    name: "Forgotten Catacombs",
    bgType: "dungeon", bgColor1: "#2a2a2a", bgColor2: "#181818",
    doors: [
      { x: -10, y: 180, w: 50, h: 80, target: 6, dest: { x: 540, y: 180 }, lock: false },
      { x: 560, y: 320, w: 50, h: 80, target: 2, dest: { x: 20, y: 320 }, lock: false },
      { x: 280, y: -10, w: 60, h: 90, target: 9, dest: { x: 280, y: 360 }, lock: "key" },
    ],
    walls: [{ x: 200, y: 200, w: 200, h: 20, color: "#3c3c3c" }],
    hazards: [{ x: 140, y: 240, w: 160, h: 60, dmg: 0.09, type: "spikeTrap" }],
    items: [
      { x: 280, y: 100, w: 20, h: 20, type: "arcaneDust" },
      { x: 100, y: 300, w: 20, h: 20, type: "ironScraps" },
    ],
    enemies: [
      { ...shadowMinion, x: 340, y: 240 },
      { ...shadowSorcerer, x: 150, y: 150 },
    ],
    spawn: { x: 280, y: 180 },
  },
  /* 8 — Ruined Watchtower */
  {
    name: "Ruined Watchtower",
    bgType: "skyline", bgColor1: "#3a4852", bgColor2: "#202830", skylineColor: "#0e1217",
    doors: [
      { x: -10, y: 40, w: 50, h: 80, target: 1, dest: { x: 540, y: 40 }, lock: false },
      { x: 560, y: 260, w: 50, h: 80, target: 9, dest: { x: 20, y: 260 }, lock: false },
    ],
    walls: [{ x: 240, y: 60, w: 120, h: 20, color: "#454545" }],
    hazards: [{ x: 80, y: 180, w: 160, h: 100, dmg: 0.07, type: "cursedGround" }],
    items: [
      { x: 300, y: 100, w: 20, h: 20, type: "arcaneDust" },
      { x: 460, y: 320, w: 20, h: 20, type: "ironScraps" },
    ],
    enemies: [
      { ...shadowSorcerer, x: 260, y: 220, hp:100, hpMax: 100 },
      { ...shadowMinion, x: 100, y: 100 },
    ],
    spawn: { x: 300, y: 80 },
  },
  /* 9 — Treasure Hoard */
  {
    name: "Treasure Hoard",
    bgType: "dungeon", bgColor1: "#4b3822", bgColor2: "#3a2812",
    doors: [
      { x: -10, y: 260, w: 50, h: 80, target: 8, dest: { x: 540, y: 260 }, lock: false },
      { x: 560, y: 60, w: 50, h: 80, target: 10, dest: { x: 80, y: 60 }, lock: "key" }, // Portal to Boss Lair
      { x: 280, y: 410, w: 60, h: 90, target: 7, dest: { x: 280, y: 20 }, lock: false },
    ],
    walls: [{ x: 160, y: 180, w: 280, h: 20, color: "#654321" }],
    hazards: [{ x: 260, y: 240, w: 80, h: 100, dmg: 0.05, type: "cursedGround" }],
    items: [
      { x: 200, y: 140, w: 56, h: 56, type: "anvil" },
      { x: 120, y: 320, w: 20, h: 20, type: "ironScraps" },
      { x: 420, y: 320, w: 20, h: 20, type: "arcaneDust" },
      { x: 320, y: 60, w: 20, h: 20, type: "alchemicalReagents" },
      { x: 480, y: 150, w: 38, h: 38, type: "ornateKey" }, // Key for the boss lair
    ],
    enemies: [
      { ...shadowSorcerer, x: 300, y: 280, hp: 130, hpMax: 130 },
      { ...shadowMinion, x: 380, y: 140, speed: 2.2 },
    ],
    spawn: { x: 300, y: 300 },
  },
  /* 10 — The Shadow Lord's Lair (Boss Room) */
  {
    name: "The Shadow Lord's Lair",
    bgType: "dungeon",
    bgColor1: "#1a0000", // Very dark red
    bgColor2: "#000000", // Black
    skylineColor: "#400000", // Dim ominous glow
    doors: [
      { x: -10, y: 60, w: 50, h: 80, target: 9, dest: { x: 540, y: 60 }, lock: false }, // Exit portal
    ],
    walls: [ // Confine the boss area
      { x: 0, y: 0, w: 20, h: 400, color: "#111" },
      { x: 580, y: 0, w: 20, h: 400, color: "#111" },
      { x: 0, y: 0, w: 600, h: 20, color: "#111" },
      { x: 0, y: 380, w: 600, h: 20, color: "#111" },
    ],
    hazards: [{ x: 50, y: 50, w: 500, h: 300, dmg: 0.15, type: "cursedGround" }], // Entire arena is mildly damaging
    items: [
        // Maybe a final health potion or nothing to make it harder
        { x: 290, y: 20, w:30, h:30, type: "healthPotion"}
    ],
    enemies: [
      { ...shadowOverlord, x: 260, y: 150 },
    ],
    spawn: { x: 80, y: 60 }, // Spawn near the exit portal
  },
];