import {
  rooms,
  recipes,
  resourceTypes,
  type Room,
  type Item,
} from "./game-data";

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  onRender?: (props: {
    player: {
      x: number;
      y: number;
      size: number;
      color: string;
      speed: number;
      room: number;
      hp: number;
      hpMax: number;
      keys: number;
      radRes: number;
      materials: { scrap: number; circuits: number; chemicals: number };
      inventory: Record<string, boolean>;
      railgunAmmo: number;
      isInvincible: boolean;
      damageMultiplier: number;
    };
    roomName: string;
    nearBench: boolean;
    itemCooldowns: Record<string, number>;
    selectedItem: number;
  }) => void;

  visitedRooms = new Set<number>();
  difficulty: "peaceful" | "easy" | "normal" | "hard" = "normal";
  enemyInitialPositions = new Map<number, { x: number; y: number; speed: number; hpMax: number }[]>();
  openedDoors = new Set<string>();

  doorCooldown = 0; // backup – dar „spawn-ul sigur” rezolvă 99 %

  /* ─────────────── PLAYER ─────────────── */
  player = {
    x: 50,
    y: 300,
    size: 50,
    color: "lime",
    speed: 4,
    room: 0,
    hp: 100,
    hpMax: 100,
    keys: 0,
    radRes: 0,
    materials: { scrap: 0, circuits: 0, chemicals: 0 },
    inventory: {} as Record<string, boolean>,
    railgunAmmo: 0,
    isInvincible: false,
    damageMultiplier: 1,
  };

  /* ─────────────── STATE ─────────────── */
  itemImages: Record<string, HTMLImageElement> = {};
  gameOver = false;
  transitionAlpha = 0;
  backgroundOffset = 0;
  craftingMode = false;
  craftSelection = 0;
  lastSaveTime = 0;
  keys: Record<string, boolean> = {};
  itemCooldowns: Record<string, number> = {};
  activeEffects: { type: string; x: number; y: number; time: number }[] = [];
  selectedItem = 0;
  dialogMessage = "";
  dialogTimer = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.W = canvas.width;
    this.H = canvas.height;

    // Store initial enemy positions
    rooms.forEach((room, idx) => {
      this.enemyInitialPositions.set(
        idx,
        room.enemies.map(e => ({ 
          x: e.x, 
          y: e.y,
          speed: e.speed,
          hpMax: e.hpMax
        }))
      );
    });

    if (typeof window !== "undefined") this.loadImages();
  }

  /* ────────── ASSETS ────────── */
  private loadImages() {
    ["medkit", "key", "scrap", "circuits", "chemicals", "bench", "player"].forEach(
      (name) => {
        const img = new Image();
        img.src = `/assets/${name}.png`;
        this.itemImages[name] = img;
      }
    );
  }

  /* ────────── INPUT ────────── */
  handleKeyDown(e: KeyboardEvent) {
    this.keys[e.key] = true;

    if (e.key.toLowerCase() === "c" && this.nearBench()) {
      this.toggleCrafting();
    }
    
    // Number keys 1-9 for inventory selection
    if (e.key >= "1" && e.key <= "9") {
      this.selectedItem = parseInt(e.key) - 1;
    }
    
    // E key to use selected item
    if (e.key.toLowerCase() === "e") {
      const inventoryItems = Object.entries(this.player.inventory)
        .filter(([_, hasItem]) => hasItem)
        .map(([item]) => item);
      
      const selectedItem = inventoryItems[this.selectedItem];
      if (selectedItem) {
        this.useItem(selectedItem);
      }
    }

    if (this.craftingMode) {
      if (e.key === "ArrowUp")
        this.craftSelection =
          (this.craftSelection - 1 + recipes.length) % recipes.length;
      if (e.key === "ArrowDown")
        this.craftSelection = (this.craftSelection + 1) % recipes.length;
      if (e.key === "Enter") this.attemptCraft();
    }
  }
  handleKeyUp(e: KeyboardEvent) {
    this.keys[e.key] = false;
  }

  /* ────────── UPDATE ────────── */
  update() {
    const room = this.getCurrentRoom();
    if (!room) return;

    // Update dialog timer
    if (this.dialogTimer > 0) {
      this.dialogTimer--;
      if (this.dialogTimer === 0) {
        this.dialogMessage = "";
      }
    }

    // Update cooldowns
    Object.keys(this.itemCooldowns).forEach(key => {
      if (this.itemCooldowns[key] > 0) {
        this.itemCooldowns[key]--;
      }
    });

    // Update effects
    this.activeEffects = this.activeEffects.filter(effect => {
      effect.time--;
      return effect.time > 0;
    });

    this.backgroundOffset += 0.2;

    /* ── deplasare player ── */
    const prev = { x: this.player.x, y: this.player.y };
    if (this.keys.ArrowUp) this.player.y -= this.player.speed;
    if (this.keys.ArrowDown) this.player.y += this.player.speed;
    if (this.keys.ArrowLeft) this.player.x -= this.player.speed;
    if (this.keys.ArrowRight) this.player.x += this.player.speed;

    this.player.x = this.clamp(this.player.x, 0, this.W - this.player.size);
    this.player.y = this.clamp(this.player.y, 0, this.H - this.player.size);

    /* pereți */
    room.walls.forEach((w) => {
      if (this.rectIntersect(this.player, w)) {
        this.player.x = prev.x;
        this.player.y = prev.y;
      }
    });

    /* uși */
    if (this.doorCooldown === 0) {
      room.doors.forEach((d, idx) => {
        if (!this.rectIntersect(this.player, d)) return;

        const doorKey = `${this.player.room}-${idx}`;
        const targetDoorKey = `${d.target}-${rooms[d.target].doors.findIndex(
          (door) =>
            door.target === this.player.room &&
            Math.abs(door.dest.x - this.player.x) < 60 &&
            Math.abs(door.dest.y - this.player.y) < 60
        )}`;

        const isOpened =
          this.openedDoors.has(doorKey) || this.openedDoors.has(targetDoorKey);

        if (d.lock === "key" && !isOpened && this.difficulty !== "peaceful") {
          if (this.player.keys === 0) return;
          this.player.keys--;
          this.openedDoors.add(doorKey);
          this.openedDoors.add(targetDoorKey);
        }

        this.changeRoom(d.target, d.dest);
      });
    } else {
      this.doorCooldown--;
    }

    /* hazarde */
    room.hazards.forEach((h) => {
      if (this.rectIntersect(this.player, h) && !this.player.isInvincible) {
        this.player.hp -= h.dmg * (1 - this.player.radRes);
        if (this.player.hp <= 0) this.triggerGameOver();
      }
    });

    /* items */
    const remaining: Item[] = [];
    for (const it of room.items) {
      if (this.rectIntersect(this.player, it)) {
        switch (it.type) {
          case "medkit":
            this.player.hp = Math.min(this.player.hpMax, this.player.hp + 40);
            this.showDialog("Found a medkit! Restored 40 HP.");
            break;
          case "key":
            this.player.keys++;
            this.showDialog("Picked up a key. You can now unlock doors.");
            break;
          case "scrap":
            this.player.materials[it.type]++;
            this.showDialog("Collected scrap metal. Useful for crafting.");
            break;
          case "circuits":
            this.player.materials[it.type]++;
            this.showDialog("Found electronic circuits. Essential for advanced crafting.");
            break;
          case "chemicals":
            this.player.materials[it.type]++;
            this.showDialog("Acquired chemicals. Handle with care!");
            break;
          case "bench":
            remaining.push(it);
            continue;
        }
      } else remaining.push(it);
    }
    room.items = remaining;

    /* inamici */
    room.enemies.forEach((e, i) => {
      if (e.hp <= 0 || this.difficulty === "peaceful") return;

      const mult =
        this.difficulty === "easy"
          ? 0.5
          : this.difficulty === "hard"
          ? 1.5
          : 1;

      const dx = this.player.x - e.x;
      const dy = this.player.y - e.y;
      const dist = Math.hypot(dx, dy) || 1;

      const origin = this.enemyInitialPositions.get(this.player.room)?.[i];
      if (!origin) return;

      if (dist < 300) {
        e.x += (dx / dist) * e.speed * mult;
        e.y += (dy / dist) * e.speed * mult;
      } else {
        const rx = origin.x - e.x;
        const ry = origin.y - e.y;
        const rdist = Math.hypot(rx, ry) || 1;
        if (rdist > 5) {
          e.x += (rx / rdist) * e.speed * mult * 0.5;
          e.y += (ry / rdist) * e.speed * mult * 0.5;
        }
      }

      e.x = this.clamp(e.x, 0, this.W - e.size);
      e.y = this.clamp(e.y, 0, this.H - e.size);

      if (this.rectIntersect(this.player, e) && !this.player.isInvincible) {
        this.player.hp -= e.damage;
        this.player.x -= Math.sign(dx) * 10;
        this.player.y -= Math.sign(dy) * 10;
        if (this.player.hp <= 0) this.triggerGameOver();
      }
    });

    if (this.transitionAlpha > 0) this.transitionAlpha -= 0.05;
  }

  /* ────────── RENDER ────────── */
  render() {
    const room = this.getCurrentRoom();
    const ctx = this.ctx;

    this.drawBackground(room);

    room.hazards.forEach((h) => {
      ctx.fillStyle = "rgba(0,255,0,0.08)";
      ctx.fillRect(h.x, h.y, h.w, h.h);
    });

    room.doors.forEach((d, i) => {
      const key = `${this.player.room}-${i}`;
      ctx.fillStyle =
        d.lock === "key" ? (this.openedDoors.has(key) ? "gold" : "purple") : "gold";
      ctx.fillRect(d.x, d.y, d.w, d.h);
    });

    room.walls.forEach((w) => {
      ctx.fillStyle = w.color;
      ctx.fillRect(w.x, w.y, w.w, w.h);
    });

    room.items.forEach((it) => {
      const img = this.itemImages[it.type];
      if (img?.complete) ctx.drawImage(img, it.x, it.y, it.w * 2, it.h * 2);
      else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(it.x, it.y, it.w, it.h);
      }
    });

    room.enemies.forEach((e) => {
      if (e.hp <= 0) return;
      ctx.fillStyle = e.color;
      ctx.fillRect(e.x, e.y, e.size, e.size);
      ctx.fillStyle = "black";
      ctx.fillRect(e.x, e.y - 6, e.size, 4);
      ctx.fillStyle = "red";
      ctx.fillRect(e.x, e.y - 6, (e.size * e.hp) / e.hpMax, 4);
    });

    const pImg = this.itemImages["player"];
    if (pImg?.complete)
      ctx.drawImage(pImg, this.player.x, this.player.y, this.player.size, this.player.size);
    else {
      ctx.fillStyle = this.player.color;
      ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size);
    }

    if (this.transitionAlpha > 0) {
      ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`;
      ctx.fillRect(0, 0, this.W, this.H);
    }

    // Render active effects
    this.activeEffects.forEach(effect => {
      ctx.save();
      switch (effect.type) {
        case "heal":
          ctx.fillStyle = `rgba(0, 255, 0, ${effect.time / 30})`;
          ctx.beginPath();
          ctx.arc(effect.x + this.player.size/2, effect.y + this.player.size/2, 30, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "railgun":
          ctx.strokeStyle = `rgba(0, 255, 255, ${effect.time / 30})`;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(this.player.x + this.player.size/2, this.player.y + this.player.size/2);
          ctx.lineTo(effect.x + 25, effect.y + 25);
          ctx.stroke();
          break;
        case "speed":
          ctx.fillStyle = `rgba(255, 255, 0, ${effect.time / 150})`;
          ctx.beginPath();
          ctx.arc(effect.x + this.player.size/2, effect.y + this.player.size/2, 20, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "shield":
          ctx.strokeStyle = `rgba(0, 255, 255, ${effect.time / 300})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(effect.x + this.player.size/2, effect.y + this.player.size/2, 35, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "scanner":
          ctx.strokeStyle = `rgba(255, 0, 255, ${effect.time / 180})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(effect.x + 45, effect.y + 45, 45, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "stim":
          ctx.fillStyle = `rgba(255, 0, 0, ${effect.time / 210})`;
          ctx.beginPath();
          ctx.arc(effect.x + this.player.size/2, effect.y + this.player.size/2, 25, 0, Math.PI * 2);
          ctx.fill();
          break;
        case "emp":
          ctx.strokeStyle = `rgba(0, 255, 0, ${effect.time / 180})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(effect.x + 14, effect.y + 14, 20, 0, Math.PI * 2);
          ctx.stroke();
          break;
        case "ammo":
          ctx.fillStyle = `rgba(255, 165, 0, ${effect.time / 30})`;
          ctx.beginPath();
          ctx.arc(effect.x + this.player.size/2, effect.y + this.player.size/2, 15, 0, Math.PI * 2);
          ctx.fill();
          break;
      }
      ctx.restore();
    });

    // Render dialog message
    if (this.dialogMessage) {
      ctx.save();
      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(0, this.H - 100, this.W, 100);
      
      ctx.fillStyle = "white";
      ctx.font = "20px Arial";
      ctx.textAlign = "center";
      ctx.fillText(this.dialogMessage, this.W / 2, this.H - 50);
      ctx.restore();
    }

    // Pass selectedItem to GameHUD
    if (this.onRender) {
      this.onRender({
        player: this.player,
        roomName: this.getCurrentRoom().name,
        nearBench: this.nearBench(),
        itemCooldowns: this.itemCooldowns,
        selectedItem: this.selectedItem
      });
    }
  }

  /* ────────── BACKGROUND ────────── */
  private drawBackground(room: Room) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, room.bgColor1);
    g.addColorStop(1, room.bgColor2);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, this.W, this.H);

    if (room.bgType === "skyline") {
      ctx.fillStyle = room.skylineColor || "#0a0a0a";
      for (let i = 0; i < 20; i++) {
        const w = this.rand(20, 40);
        const h = this.rand(60, 140);
        const x = ((i * 60 - this.backgroundOffset * 0.3) % (this.W + 60)) - 30;
        ctx.fillRect(x, this.H - h, w, h);
      }
    }
  }

  /* ────────── UTIL ────────── */
  private rectIntersect(a: any, b: any) {
    return (
      a.x < b.x + (b.w ?? b.size) &&
      a.x + (a.w ?? a.size) > b.x &&
      a.y < b.y + (b.h ?? b.size) &&
      a.y + (a.h ?? a.size) > b.y
    );
  }
  private rand(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
  private clamp(v: number, min: number, max: number) {
    return Math.max(min, Math.min(max, v));
  }

  private getCurrentRoom(): Room {
    if (this.player.room < 0 || this.player.room >= rooms.length) this.player.room = 0;
    return rooms[this.player.room];
  }

  /* ────────── CRAFT ────────── */
  private nearBench() {
    return this.getCurrentRoom().items.some(
      (it) => it.type === "bench" && this.rectIntersect(this.player, it)
    );
  }
  
  toggleCrafting() {
    this.craftingMode = !this.craftingMode;
    this.craftSelection = 0;
  }
  
  private canAfford(recipeIndex: number) {
    // In peaceful mode, you can craft everything for free
    if (this.difficulty === 'peaceful') return true;
    
    const recipe = recipes[recipeIndex];
    for (const r of resourceTypes) {
      if ((recipe.cost[r] ?? 0) > this.player.materials[r]) return false;
    }
    return true;
  }
  
  attemptCraft() {
    const recipe = recipes[this.craftSelection];
    if (!this.canAfford(this.craftSelection)) return;

    // Only consume resources if not in peaceful mode
    if (this.difficulty !== 'peaceful') {
      for (const r of resourceTypes) {
        this.player.materials[r] -= recipe.cost[r] ?? 0;
      }
    }

    switch (recipe.name) {
      case "Medkit+":
        this.player.hp = this.player.hpMax;
        break;
      case "Radiation Suit":
        this.player.radRes = Math.min(1, this.player.radRes + 0.5);
        break;
      case "Speed Boots":
        this.player.speed += 1;
        break;
      case "Keycard":
        this.player.keys += 1;
        break;
      case "Rail Gun":
        this.player.inventory.railgun = true;
        this.player.railgunAmmo = 3;
        break;
      case "Shield Generator":
        this.player.inventory.shieldgenerator = true;
        break;
      case "Radiation Scanner":
        this.player.inventory.radiationscanner = true;
        break;
      case "Combat Stim":
        this.player.inventory.combatstim = true;
        break;
      case "EMP Grenade":
        this.player.inventory.empgrenade = true;
        break;
      case "Ammo Pack":
        this.player.inventory.ammopack = true;
        break;
    }
  }

  /* ────────── ROOM CHANGE ────────── */
  private changeRoom(index: number, dest: { x: number; y: number }) {
    this.transitionAlpha = 1;

    setTimeout(() => {
      this.player.room = index;
      this.player.x = dest.x;
      this.player.y = dest.y;

      this.placePlayerSafely(); // **fix principal**
      this.visitedRooms.add(index);
      this.doorCooldown = 10;   // backup
    }, 50);
  }

  /** deplasează jucătorul în afara oricărei uși cu care se suprapune */
  private placePlayerSafely() {
    const room = this.getCurrentRoom();
    let moved = true;
    let iter = 0;

    while (moved && iter < 6) {
      moved = false;
      for (const d of room.doors) {
        if (!this.rectIntersect(this.player, d)) continue;

        const pcx = this.player.x + this.player.size / 2;
        const pcy = this.player.y + this.player.size / 2;
        const dcx = d.x + d.w / 2;
        const dcy = d.y + d.h / 2;

        if (Math.abs(pcx - dcx) > Math.abs(pcy - dcy)) {
          // mutare pe X
          const shift =
            Math.sign(pcx - dcx) * (d.w / 2 + this.player.size / 2 + 6);
          this.player.x = dcx + shift - this.player.size / 2;
        } else {
          // mutare pe Y
          const shift =
            Math.sign(pcy - dcy) * (d.h / 2 + this.player.size / 2 + 6);
          this.player.y = dcy + shift - this.player.size / 2;
        }
        moved = true;
      }
      iter++;
    }
    this.player.x = this.clamp(this.player.x, 0, this.W - this.player.size);
    this.player.y = this.clamp(this.player.y, 0, this.H - this.player.size);
  }

  /* ────────── GAME STATE ────────── */
  private triggerGameOver() {
    this.player.hp = 0;
    this.gameOver = true;
    this.craftingMode = false; // Ensure crafting is closed when game over
  }

  saveGame(force = false) {
    const now = performance.now();
    if (!force && now - this.lastSaveTime < 30_000) return;
    this.lastSaveTime = now;

    localStorage.setItem(
      "chernobylSave_v4",
      JSON.stringify({
        ...this.player,
        visitedRooms: Array.from(this.visitedRooms),
        openedDoors: Array.from(this.openedDoors),
      })
    );
  }
  loadGame() {
    const raw = localStorage.getItem("chernobylSave_v4");
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      Object.assign(this.player, d);
      this.visitedRooms = new Set<number>(d.visitedRooms ?? []);
      this.openedDoors = new Set<string>(d.openedDoors ?? []);
    } catch (e) {
      console.error("Failed to load save:", e);
    }
  }

  setDifficulty(difficulty: 'peaceful' | 'easy' | 'normal' | 'hard') {
    this.difficulty = difficulty;
    
    // Give 99 of all resources in peaceful mode
    if (difficulty === 'peaceful') {
      this.player.materials = {
        scrap: 99,
        circuits: 99,
        chemicals: 99
      };
    }
  }

  resetGame() {
    // Reset player state
    this.player = {
      x: 50,
      y: 300,
      size: 50,
      color: "lime",
      speed: 4,
      room: 0,
      hp: 100,
      hpMax: 100,
      keys: 0,
      radRes: 0,
      materials: { scrap: 0, circuits: 0, chemicals: 0 },
      inventory: {},
      railgunAmmo: 0,
      isInvincible: false,
      damageMultiplier: 1,
    };

    // Reset game state
    this.visitedRooms = new Set([0]);
    this.openedDoors.clear();
    this.gameOver = false;
    this.craftingMode = false;
    this.transitionAlpha = 0;
    this.doorCooldown = 0;
    this.dialogMessage = "";
    this.dialogTimer = 0;
    this.itemCooldowns = {};
    this.activeEffects = [];
    this.selectedItem = 0;
    this.craftSelection = 0;
    this.backgroundOffset = 0;

    // Reset enemies to their initial positions
    rooms.forEach((room, idx) => {
      const initialPositions = this.enemyInitialPositions.get(idx);
      if (initialPositions) {
        room.enemies.forEach((enemy, i) => {
          if (initialPositions[i]) {
            enemy.x = initialPositions[i].x;
            enemy.y = initialPositions[i].y;
            enemy.hp = initialPositions[i].hpMax;
            enemy.speed = initialPositions[i].speed;
          }
        });
      }
    });

    // Reset items in rooms to their initial state
    rooms.forEach(room => {
      // Keep only the crafting benches
      const benches = room.items.filter(item => item.type === 'bench');
      
      // Add back all other items from the original room data
      const originalRoom = rooms.find(r => r.name === room.name);
      if (originalRoom) {
        room.items = [
          ...benches,
          ...originalRoom.items.filter(item => item.type !== 'bench')
        ];
      }
    });

    // Clear saved game
    localStorage.removeItem("chernobylSave_v4");
  }

  private useItem(itemName: string) {
    if (!this.player.inventory[itemName] || (this.itemCooldowns[itemName] ?? 0) > 0) return;

    switch (itemName) {
      case "medkit":
        this.player.hp = this.player.hpMax;
        this.itemCooldowns[itemName] = 60; // 1 second cooldown
        this.activeEffects.push({ type: "heal", x: this.player.x, y: this.player.y, time: 30 });
        break;
      case "railgun":
        if (this.player.railgunAmmo <= 0) return;
        // Damage all enemies in the room
        const room = this.getCurrentRoom();
        room.enemies.forEach(e => {
          if (e.hp > 0) {
            e.hp = 0;
            this.activeEffects.push({ type: "railgun", x: e.x, y: e.y, time: 30 });
          }
        });
        this.player.railgunAmmo--;
        this.itemCooldowns[itemName] = 180; // 3 second cooldown
        break;
      case "speedboots":
        // Temporary speed boost
        const originalSpeed = this.player.speed;
        this.player.speed *= 2;
        this.itemCooldowns[itemName] = 300; // 5 second cooldown
        setTimeout(() => {
          this.player.speed = originalSpeed;
        }, 5000);
        this.activeEffects.push({ type: "speed", x: this.player.x, y: this.player.y, time: 150 });
        break;
      case "shieldgenerator":
        this.player.isInvincible = true;
        this.itemCooldowns[itemName] = 600; // 10 second cooldown
        setTimeout(() => {
          this.player.isInvincible = false;
        }, 5000);
        this.activeEffects.push({ type: "shield", x: this.player.x, y: this.player.y, time: 300 });
        break;
      case "radiationscanner":
        const currentRoom = this.getCurrentRoom();
        currentRoom.hazards.forEach(h => {
          this.activeEffects.push({ type: "scanner", x: h.x, y: h.y, time: 180 });
        });
        this.itemCooldowns[itemName] = 300; // 5 second cooldown
        break;
      case "combatstim":
        this.player.damageMultiplier = 2;
        this.itemCooldowns[itemName] = 420; // 7 second cooldown
        setTimeout(() => {
          this.player.damageMultiplier = 1;
        }, 7000);
        this.activeEffects.push({ type: "stim", x: this.player.x, y: this.player.y, time: 210 });
        break;
      case "empgrenade":
        const room2 = this.getCurrentRoom();
        room2.enemies.forEach(e => {
          if (e.hp > 0) {
            e.speed = 0;
            this.activeEffects.push({ type: "emp", x: e.x, y: e.y, time: 180 });
            setTimeout(() => {
              e.speed = e.speed * 2; // Restore original speed
            }, 3000);
          }
        });
        this.itemCooldowns[itemName] = 240; // 4 second cooldown
        break;
      case "ammopack":
        this.player.railgunAmmo = Math.min(this.player.railgunAmmo + 3, 6);
        this.itemCooldowns[itemName] = 120; // 2 second cooldown
        this.activeEffects.push({ type: "ammo", x: this.player.x, y: this.player.y, time: 30 });
        break;
    }
  }

  private showDialog(message: string) {
    this.dialogMessage = message;
    this.dialogTimer = 180; // Show for 3 seconds (60 frames per second)
  }
}
