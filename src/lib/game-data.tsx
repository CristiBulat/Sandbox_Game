// Game constants and data

export const resourceTypes = ["scrap", "circuits", "chemicals"] as const;

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
    name: "Medkit+",
    description: "Restores full health",
    cost: { scrap: 1, chemicals: 1 },
  },
  {
    name: "Radiation Suit",
    description: "+50% rad resistance",
    cost: { scrap: 2, circuits: 2, chemicals: 2 },
  },
  {
    name: "Ammo Pack",
    description: "Refills railgun ammo",
    cost: { scrap: 2, circuits: 1 },
  },
  {
    name: "Speed Boots",
    description: "+1 player speed",
    cost: { scrap: 2, chemicals: 1 },
  },
  {
    name: "Keycard",
    description: "Unlocks any key door once",
    cost: { circuits: 3 },
  },
  {
    name: "Rail Gun",
    description: "Powerful weapon that can defeat enemies",
    cost: { scrap: 4, circuits: 3, chemicals: 2 },
  },
  {
    name: "Shield Generator",
    description: "Temporary invincibility",
    cost: { scrap: 3, circuits: 4, chemicals: 2 },
  },
  {
    name: "Radiation Scanner",
    description: "Reveals nearby hazards",
    cost: { circuits: 2, chemicals: 1 },
  },
  {
    name: "Combat Stim",
    description: "Temporary damage boost",
    cost: { scrap: 1, chemicals: 3 },
  },
  {
    name: "EMP Grenade",
    description: "Stuns all enemies in the room",
    cost: { scrap: 2, circuits: 2, chemicals: 1 },
  },
  // New advanced recipes


];

export type Room = {
  name: string;
  doors: Door[];
  walls: Wall[];
  hazards: Hazard[];
  items: Item[];
  enemies: Enemy[];
  spawn: { x: number; y: number };
  bgColor1: string;
  bgColor2: string;
  bgType: "gradient" | "skyline";
  skylineColor?: string;
};

export type Door = {
  x: number;
  y: number;
  w: number;
  h: number;
  target: number;
  dest: { x: number; y: number };
  lock: false | "key";
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
};

export type Item = {
  x: number;
  y: number;
  w: number;
  h: number;
  type: "medkit" | "key" | "scrap" | "circuits" | "chemicals" | "bench";
};

export type Enemy = {
  x: number;
  y: number;
  size: number;
  speed: number;
  damage: number;
  color: string;
  hp: number;
  hpMax: number;
};

export const rooms: Room[] = [
  /* 0 — Pripyat Street */
  {
    name: "Pripyat Street",
    bgType: "skyline",
    bgColor1: "#06131b",
    bgColor2: "#1b2631",
    skylineColor: "#0a0a0a",
    doors: [
      {
        x: 550,
        y: 170,
        w: 40,
        h: 60,
        target: 1,
        dest: { x: 80, y: 200 },
        lock: false,
      },
      // new connection to Hospital Ruins
      {
        x: 280,
        y: 40,
        w: 40,
        h: 60,
        target: 6,
        dest: { x: 560, y: 60 },
        lock: false,
      },
    ],
    walls: [{ x: 230, y: 260, w: 180, h: 24, color: "#444" }],
    hazards: [{ x: 120, y: 120, w: 90, h: 90, dmg: 0.05 }],
    items: [
      { x: 300, y: 320, w: 30, h: 30, type: "medkit" },
      { x: 450, y: 420, w: 56, h: 56, type: "scrap" },
    ],
    enemies: [
      {
        x: 420,
        y: 100,
        size: 28,
        speed: 1.5,
        damage: 10,
        color: "red",
        hp: 60,
        hpMax: 60,
      },
    ],
    spawn: { x: 50, y: 200 },
  },
  /* 1 — Pripyat Park */
  {
    name: "Pripyat Park",
    bgType: "gradient",
    bgColor1: "#152425",
    bgColor2: "#204040",
    doors: [
      {
        x: -10,
        y: 170,
        w: 40,
        h: 60,
        target: 0,
        dest: { x: 500, y: 200 },
        lock: false,
      },
      {
        x: 550,
        y: 40,
        w: 40,
        h: 60,
        target: 2,
        dest: { x: 80, y: 50 },
        lock: "key",
      },
      {
        x: 10,
        y: 320,
        w: 40,
        h: 60,
        target: 4,
        dest: { x: 400, y: 280 },
        lock: false,
      },
      // new connection to Radio Tower
      {
        x: 550,
        y: 120,
        w: 40,
        h: 60,
        target: 8,
        dest: { x: 80, y: 120 },
        lock: false,
      },
    ],
    walls: [{ x: 200, y: 180, w: 100, h: 20, color: "#555" }],
    hazards: [],
    items: [
      { x: 260, y: 80, w: 38, h: 38, type: "key" },
      { x: 320, y: 300, w: 36, h: 36, type: "chemicals" },
    ],
    enemies: [
      {
        x: 380,
        y: 260,
        size: 26,
        speed: 1.7,
        damage: 12,
        color: "red",
        hp: 70,
        hpMax: 70,
      },
      {
        x: 140,
        y: 60,
        size: 26,
        speed: 1.3,
        damage: 12,
        color: "red",
        hp: 70,
        hpMax: 70,
      },
    ],
    spawn: { x: 70, y: 200 },
  },
  /* 2 — Reactor Exterior */
  {
    name: "Reactor Exterior",
    bgType: "gradient",
    bgColor1: "#461010",
    bgColor2: "#220000",
    doors: [
      {
        x: -10,
        y: 40,
        w: 60,
        h: 80,
        target: 1,
        dest: { x: 500, y: 40 },
        lock: false,
      },
      {
        x: 280,
        y: 350,
        w: 60,
        h: 70,
        target: 3,
        dest: { x: 300, y: 250 },
        lock: false,
      },
      {
        x: 550,
        y: 310,
        w: 60,
        h: 80,
        target: 5,
        dest: { x: 80, y: 300 },
        lock: "key",
      },
      // connection to Underground Tunnel
      {
        x: 550,
        y: 140,
        w: 60,
        h: 70,
        target: 7,
        dest: { x: 20, y: 320 },
        lock: false,
      },
    ],
    walls: [{ x: 260, y: 0, w: 80, h: 140, color: "#333" }],
    hazards: [{ x: 150, y: 210, w: 160, h: 100, dmg: 0.08 }],
    items: [{ x: 120, y: 60, w: 36, h: 36, type: "circuits" }],
    enemies: [
      {
        x: 100,
        y: 260,
        size: 56,
        speed: 2,
        damage: 14,
        color: "crimson",
        hp: 90,
        hpMax: 90,
      },
    ],
    spawn: { x: 60, y: 60 },
  },
  /* 3 — Reactor Core */
  {
    name: "Reactor Core",
    bgType: "gradient",
    bgColor1: "#320303",
    bgColor2: "#460000",
    doors: [
      {
        x: 280,
        y: 400,
        w: 40,
        h: 40,
        target: 2,
        dest: { x: 280, y: 340 },
        lock: false,
      },
    ],
    walls: [
      { x: 200, y: 0, w: 20, h: 200, color: "#555" },
      { x: 380, y: 200, w: 20, h: 200, color: "#555" },
    ],
    hazards: [{ x: 0, y: 0, w: 600, h: 400, dmg: 0.12 }],
    items: [{ x: 290, y: 190, w: 20, h: 20, type: "medkit" }],
    enemies: [
      {
        x: 270,
        y: 180,
        size: 34,
        speed: 2.2,
        damage: 18,
        color: "crimson",
        hp: 140,
        hpMax: 140,
      },
    ],
    spawn: { x: 300, y: 250 },
  },
  /* 4 — Workshop (safe) */
  {
    name: "Workshop",
    bgType: "gradient",
    bgColor1: "#202024",
    bgColor2: "#3a3a40",
    doors: [
      {
        x: 560,
        y: 320,
        w: 40,
        h: 60,
        target: 1,
        dest: { x: 70, y: 200 },
        lock: false,
      },
    ],
    walls: [{ x: 300, y: 150, w: 120, h: 20, color: "#666" }],
    hazards: [],
    items: [
      { x: 282, y: 152, w: 36, h: 36, type: "bench" },
      { x: 180, y: 300, w: 16, h: 16, type: "scrap" },
      { x: 500, y: 120, w: 16, h: 16, type: "chemicals" },
    ],
    enemies: [],
    spawn: { x: 400, y: 280 },
  },
  /* 5 — Bunker Lab (safe advanced) */
  {
    name: "Bunker Lab",
    bgType: "gradient",
    bgColor1: "#090909",
    bgColor2: "#1c1c1c",
    doors: [
      {
        x: -10,
        y: 320,
        w: 40,
        h: 60,
        target: 2,
        dest: { x: 500, y: 300 },
        lock: false,
      },
      // hidden passage to Supply Depot (key required)
      {
        x: 560,
        y: 120,
        w: 40,
        h: 60,
        target: 9,
        dest: { x: 60, y: 100 },
        lock: "key",
      },
    ],
    walls: [{ x: 240, y: 240, w: 200, h: 20, color: "#444" }],
    hazards: [],
    items: [
      { x: 282, y: 182, w: 56, h: 56, type: "bench" },
      { x: 140, y: 200, w: 36, h: 36, type: "circuits" },
      { x: 520, y: 380, w: 36, h: 36, type: "scrap" },
      { x: 300, y: 60, w: 36, h: 36, type: "chemicals" },
    ],
    enemies: [],
    spawn: { x: 60, y: 280 },
  },
  /* 6 — Hospital Ruins */
  {
    name: "Hospital Ruins",
    bgType: "gradient",
    bgColor1: "#1b1b1d",
    bgColor2: "#303030",
    doors: [
      {
        x: -10,
        y: 60,
        w: 40,
        h: 60,
        target: 0,
        dest: { x: 560, y: 80 },
        lock: false,
      },
      {
        x: 560,
        y: 180,
        w: 40,
        h: 60,
        target: 7,
        dest: { x: 20, y: 180 },
        lock: "key",
      },
    ],
    walls: [
      { x: 240, y: 120, w: 120, h: 20, color: "#666" },
      { x: 100, y: 300, w: 200, h: 20, color: "#666" },
    ],
    hazards: [{ x: 300, y: 200, w: 100, h: 80, dmg: 0.06 }],
    items: [
      { x: 200, y: 140, w: 30, h: 30, type: "medkit" },
      { x: 120, y: 340, w: 30, h: 30, type: "scrap" },
      { x: 460, y: 260, w: 30, h: 30, type: "chemicals" },
    ],
    enemies: [
      {
        x: 320,
        y: 60,
        size: 28,
        speed: 1.4,
        damage: 12,
        color: "red",
        hp: 60,
        hpMax: 60,
      },
      {
        x: 420,
        y: 320,
        size: 28,
        speed: 1.6,
        damage: 12,
        color: "red",
        hp: 70,
        hpMax: 70,
      },
    ],
    spawn: { x: 300, y: 80 },
  },
  /* 7 — Underground Tunnel */
  {
    name: "Underground Tunnel",
    bgType: "gradient",
    bgColor1: "#0f0f0f",
    bgColor2: "#1b1b1b",
    doors: [
      {
        x: -10,
        y: 180,
        w: 40,
        h: 60,
        target: 6,
        dest: { x: 540, y: 180 },
        lock: false,
      },
      {
        x: 560,
        y: 320,
        w: 40,
        h: 60,
        target: 2,
        dest: { x: 20, y: 320 },
        lock: false,
      },
      {
        x: 280,
        y: -10,
        w: 60,
        h: 40,
        target: 9,
        dest: { x: 280, y: 360 },
        lock: "key",
      },
    ],
    walls: [{ x: 200, y: 200, w: 200, h: 20, color: "#444" }],
    hazards: [{ x: 140, y: 240, w: 160, h: 60, dmg: 0.09 }],
    items: [
      { x: 280, y: 100, w: 20, h: 20, type: "circuits" },
      { x: 100, y: 300, w: 20, h: 20, type: "scrap" },
    ],
    enemies: [
      {
        x: 340,
        y: 240,
        size: 30,
        speed: 1.8,
        damage: 14,
        color: "crimson",
        hp: 80,
        hpMax: 80,
      },
    ],
    spawn: { x: 280, y: 180 },
  },
  /* 8 — Radio Tower */
  {
    name: "Radio Tower",
    bgType: "skyline",
    bgColor1: "#0d1117",
    bgColor2: "#1c222a",
    skylineColor: "#070d13",
    doors: [
      {
        x: -10,
        y: 40,
        w: 40,
        h: 60,
        target: 1,
        dest: { x: 540, y: 40 },
        lock: false,
      },
      {
        x: 560,
        y: 260,
        w: 40,
        h: 60,
        target: 9,
        dest: { x: 20, y: 260 },
        lock: false,
      },
    ],
    walls: [{ x: 240, y: 60, w: 120, h: 20, color: "#555" }],
    hazards: [{ x: 80, y: 180, w: 160, h: 100, dmg: 0.07 }],
    items: [
      { x: 300, y: 100, w: 20, h: 20, type: "circuits" },
      { x: 460, y: 320, w: 20, h: 20, type: "scrap" },
    ],
    enemies: [
      {
        x: 260,
        y: 220,
        size: 30,
        speed: 1.6,
        damage: 14,
        color: "red",
        hp: 90,
        hpMax: 90,
      },
    ],
    spawn: { x: 300, y: 80 },
  },
  /* 9 — Supply Depot */
  {
    name: "Supply Depot",
    bgType: "gradient",
    bgColor1: "#202822",
    bgColor2: "#37463a",
    doors: [
      {
        x: -10,
        y: 260,
        w: 40,
        h: 60,
        target: 8,
        dest: { x: 540, y: 260 },
        lock: false,
      },
      {
        x: 560,
        y: 60,
        w: 40,
        h: 60,
        target: 10,
        dest: { x: 20, y: 60 },
        lock: "key",
      },
      {
        x: 280,
        y: 410,
        w: 60,
        h: 40,
        target: 7,
        dest: { x: 280, y: 20 },
        lock: false,
      },
    ],
    walls: [{ x: 160, y: 180, w: 280, h: 20, color: "#555" }],
    hazards: [{ x: 260, y: 240, w: 80, h: 100, dmg: 0.05 }],
    items: [
      { x: 200, y: 140, w: 36, h: 36, type: "bench" },
      { x: 120, y: 320, w: 20, h: 20, type: "scrap" },
      { x: 420, y: 320, w: 20, h: 20, type: "circuits" },
      { x: 320, y: 60, w: 20, h: 20, type: "chemicals" },
    ],
    enemies: [
      {
        x: 300,
        y: 280,
        size: 34,
        speed: 1.8,
        damage: 16,
        color: "crimson",
        hp: 110,
        hpMax: 110,
      },
      {
        x: 380,
        y: 140,
        size: 28,
        speed: 1.5,
        damage: 14,
        color: "red",
        hp: 80,
        hpMax: 80,
      },
    ],
    spawn: { x: 300, y: 300 },
  },
  /* 10 — Secret Vault */
  {
    name: "Secret Vault",
    bgType: "gradient",
    bgColor1: "#000000",
    bgColor2: "#2b0d0d",
    doors: [
      {
        x: -10,
        y: 60,
        w: 40,
        h: 60,
        target: 9,
        dest: { x: 540, y: 60 },
        lock: false,
      },
    ],
    walls: [
      { x: 200, y: 120, w: 200, h: 20, color: "#550000" },
      { x: 200, y: 260, w: 200, h: 20, color: "#550000" },
    ],
    hazards: [{ x: 0, y: 0, w: 600, h: 400, dmg: 0.1 }],
    items: [{ x: 290, y: 200, w: 20, h: 20, type: "key" }],
    enemies: [
      {
        x: 300,
        y: 180,
        size: 48,
        speed: 2.4,
        damage: 20,
        color: "darkred",
        hp: 200,
        hpMax: 200,
      },
    ],
    spawn: { x: 300, y: 300 },
  },
];
