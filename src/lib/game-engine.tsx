import {
  rooms as gameDataRooms, // Rename to avoid conflict with class member if any, and to signify pristine data
  recipes,
  resourceTypes,
  type Room,
  type Item,
  type Enemy,
  type Door,
} from "./game-data";

// Define Projectile Type
type Projectile = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  type: "shadowBolt";
  owner: "enemy";
  damage: number;
  rotation: number;
};

// Type for objects that can be checked for intersection
type RectObject = {
  x: number;
  y: number;
  w?: number; // Optional width
  h?: number; // Optional height
  size?: number; // Optional size (for square objects)
};


export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  W: number;
  H: number;
  onRender?: (props: {
    player: {
      x: number; y: number; size: number; speed: number; room: number;
      hp: number; hpMax: number; keys: number; shadowResilience: number;
      materials: { ironScraps: number; arcaneDust: number; alchemicalReagents: number };
      inventory: Record<string, boolean>; crossbowBolts: number;
      isInvincible: boolean; damageMultiplier: number;
    };
    roomName: string;
    nearAnvil: boolean;
    itemCooldowns: Record<string, number>;
    selectedItem: number;
    bossDefeated?: boolean;
  }) => void;

  // Live rooms data, will be modified (e.g. enemy HP, collected items)
  private liveRoomsData: Room[];

  visitedRooms = new Set<number>();
  difficulty: "peaceful" | "easy" | "normal" | "hard" = "normal";
  // enemyInitialPositions stores a snapshot of COMPLETE Enemy objects as they were at game start
  enemyInitialPositions = new Map<number, Enemy[]>();
  openedDoors = new Set<string>();

  doorCooldown = 0;

  player = {
    x: 50, y: 300, size: 48, speed: 4, room: 0, hp: 100, hpMax: 100,
    keys: 0, shadowResilience: 0,
    materials: { ironScraps: 0, arcaneDust: 0, alchemicalReagents: 0 },
    inventory: {} as Record<string, boolean>, crossbowBolts: 0,
    isInvincible: false, damageMultiplier: 1,
  };

  itemImages: Record<string, HTMLImageElement> = {};
  enemyImages: Record<string, HTMLImageElement> = {};
  projectileImages: Record<string, HTMLImageElement> = {};
  portalImage!: HTMLImageElement;
  playerImage!: HTMLImageElement;

  activeProjectiles: Projectile[] = [];
  gameOver = false;
  gameWon = false;
  transitionAlpha = 0;
  backgroundOffset = 0;
  craftingMode = false;
  craftSelection = 0;
  lastSaveTime = 0;
  keysState: Record<string, boolean> = {};
  itemCooldowns: Record<string, number> = {};
  activeEffects: { type: string; x: number; y: number; time: number, size?: number, rotation?: number }[] = [];
  selectedItem = 0;
  dialogMessage = "";
  dialogTimer = 0;
  frameCount = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d") as CanvasRenderingContext2D;
    this.W = canvas.width;
    this.H = canvas.height;

    // Use a deep copy for liveRoomsData if you modify it extensively
    this.liveRoomsData = JSON.parse(JSON.stringify(gameDataRooms));

    this.liveRoomsData.forEach((room, idx) => {
      this.enemyInitialPositions.set(
        idx,
        // Ensure the objects created here are full Enemy objects
        room.enemies.map((e: Enemy): Enemy => ({
            ...e, // Spreads all properties from the original Enemy (x, y, hpMax, sprite, etc.)
            lastAttackTime: 0, // Initialize/overwrite dynamic state
            isLunging: false,  // Initialize/overwrite dynamic state
            // hp is already e.hp (which should be e.hpMax from game-data's definition)
        }))
      );
    });

    this.resetEnemies(); // Initialize live enemies based on these positions
    this.resetItems();   // Initialize live items

    if (typeof window !== "undefined") this.loadImages();
  }
  
  private loadImages() {
    const assetTypes = ["healthPotion", "ornateKey", "ironScraps", "arcaneDust", "alchemicalReagents", "anvil"];
    assetTypes.forEach(name => {
      const img = new Image();
      img.src = `/assets/${name}.png`;
      this.itemImages[name] = img;
    });

    this.playerImage = new Image();
    this.playerImage.src = "/assets/knight.png";
    this.portalImage = new Image();
    this.portalImage.src = "/assets/portal.png";

    const enemySpriteNames = ["shadowMinion", "shadowSorcerer", "shadowOverlord"];
    enemySpriteNames.forEach(name => {
      const img = new Image();
      img.src = `/assets/enemies/${name}.png`;
      this.enemyImages[name] = img;
    });

    this.projectileImages["shadowBolt"] = new Image();
    this.projectileImages["shadowBolt"].src = "/assets/projectiles/shadowBolt.png";
  }

  handleKeyDown(e: KeyboardEvent) {
    this.keysState[e.key.toLowerCase()] = true;
    if (this.keysState["c"] === true && this.nearAnvil()) this.toggleCrafting();
    if (e.key >= "1" && e.key <= "9") this.selectedItem = parseInt(e.key) - 1;
    if (this.keysState["e"] === true) {
      const inventoryItems = Object.entries(this.player.inventory)
        .filter(([_, hasItem]) => hasItem === true).map(([item]) => item);
      const selectedItemName = inventoryItems[this.selectedItem];
      if (selectedItemName) this.useItem(selectedItemName);
    }
    if (this.craftingMode) {
      if (e.key === "ArrowUp") this.craftSelection = (this.craftSelection - 1 + recipes.length) % recipes.length;
      if (e.key === "ArrowDown") this.craftSelection = (this.craftSelection + 1) % recipes.length;
      if (e.key === "Enter") this.attemptCraft();
    }
    if ((this.gameOver || this.gameWon) && e.key === "Enter") this.resetGame();
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keysState[e.key.toLowerCase()] = false;
  }

  update() {
    if (this.gameOver || this.gameWon) return;
    this.frameCount++;
    const currentRoom = this.getCurrentRoom(); // Uses this.liveRoomsData
    if (!currentRoom) return;

    if (this.dialogTimer > 0) { if (--this.dialogTimer === 0) this.dialogMessage = ""; }
    Object.keys(this.itemCooldowns).forEach(key => { if (this.itemCooldowns[key] > 0) this.itemCooldowns[key]--; });
    this.activeEffects = this.activeEffects.filter(effect => --effect.time > 0);
    this.backgroundOffset += 0.2;

    this.updatePlayer(currentRoom);
    this.updateEnemies(currentRoom);
    this.updateProjectiles(currentRoom);
    this.checkBossDefeated();

    if (this.transitionAlpha > 0) this.transitionAlpha -= 0.05;
  }

  private updatePlayer(room: Room) {
    const prev = { x: this.player.x, y: this.player.y };
    if (this.keysState.arrowup === true || this.keysState.w === true) this.player.y -= this.player.speed;
    if (this.keysState.arrowdown === true || this.keysState.s === true) this.player.y += this.player.speed;
    if (this.keysState.arrowleft === true || this.keysState.a === true) this.player.x -= this.player.speed;
    if (this.keysState.arrowright === true || this.keysState.d === true) this.player.x += this.player.speed;

    this.player.x = this.clamp(this.player.x, 0, this.W - this.player.size);
    this.player.y = this.clamp(this.player.y, 0, this.H - this.player.size);

    room.walls.forEach(w => { if (this.rectIntersect(this.player, w)) { this.player.x = prev.x; this.player.y = prev.y; } });

    if (this.doorCooldown === 0) {
      room.doors.forEach((d, idx) => {
        const isIntersectingPortal = this.rectIntersect(this.player, { x: d.x + d.w / 2 - 10, y: d.y + d.h / 2 - 10, w: 20, h: 20 });
        if (!isIntersectingPortal) return;

        const doorKey = `${this.player.room}-${idx}`;
        const targetRoomData = this.liveRoomsData[d.target]; // Use liveRoomsData
        const targetDoorIndex = targetRoomData.doors.findIndex(door => door.target === this.player.room);
        const targetDoorKey = `${d.target}-${targetDoorIndex}`;
        const isOpened = this.openedDoors.has(doorKey) || (targetDoorIndex !== -1 && this.openedDoors.has(targetDoorKey));

        if (d.lock === "key" && !isOpened && this.difficulty !== "peaceful") {
          if (this.player.keys === 0) {
            this.showDialog("This portal is sealed by ancient magic. You need an Ornate Key.");
            return;
          }
          this.player.keys--; this.openedDoors.add(doorKey);
          if(targetDoorIndex !== -1) this.openedDoors.add(targetDoorKey);
          this.showDialog("The Ornate Key unsealed the portal!");
        }
        this.changeRoom(d.target, d.dest);
      });
    } else { this.doorCooldown--; }

    room.hazards.forEach(h => {
      const isPlayerInHazard = this.rectIntersect(this.player, h);
      if (isPlayerInHazard && !this.player.isInvincible) {
        this.player.hp -= h.dmg * (1 - this.player.shadowResilience);
        if (this.player.hp <= 0) this.triggerGameOver();
      }
    });

    const remainingItems: Item[] = [];
    room.items.forEach(it => {
      if (this.rectIntersect(this.player, it)) {
        this.collectItem(it);
        if (it.type === "anvil") remainingItems.push(it); // Anvils are not consumed
      } else {
        remainingItems.push(it);
      }
    });
    room.items = remainingItems; // Modify items in the live room data
  }

  private collectItem(item: Item) {
    switch (item.type) {
      case "healthPotion": this.player.hp = Math.min(this.player.hpMax, this.player.hp + 40); this.showDialog("Health Potion! +40 HP."); this.activeEffects.push({ type: "heal", x: this.player.x, y: this.player.y, time: 30 }); break;
      case "ornateKey": this.player.keys++; this.showDialog("Ornate Key acquired!"); break;
      case "ironScraps": this.player.materials.ironScraps++; this.showDialog("Iron Scraps collected."); break;
      case "arcaneDust": this.player.materials.arcaneDust++; this.showDialog("Arcane Dust found."); break;
      case "alchemicalReagents": this.player.materials.alchemicalReagents++; this.showDialog("Alchemical Reagents gathered."); break;
      // Anvil is not collected, it's used.
    }
  }

  private updateEnemies(room: Room) {
    room.enemies.forEach((e, enemyIndex) => {
      if (e.hp <= 0 || this.difficulty === "peaceful") return;
      if (e.isLunging === true) this.updateLunge(e);
      else this.standardEnemyAI(e, room, enemyIndex);

       const isPlayerHitByEnemy = this.rectIntersect(this.player, e);
       if (isPlayerHitByEnemy && !this.player.isInvincible) {
        this.player.hp -= e.damage * (this.difficulty === "easy" ? 0.75 : this.difficulty === "hard" ? 1.25 : 1);
        const dx = this.player.x - e.x; const dy = this.player.y - e.y;
        const dist = Math.hypot(dx, dy) || 1;
        const knockbackStrength = e.attackType === "lunge" ? 40 : 20;
        this.player.x += (dx / dist) * knockbackStrength; this.player.y += (dy / dist) * knockbackStrength;
        this.player.x = this.clamp(this.player.x, 0, this.W - this.player.size);
        this.player.y = this.clamp(this.player.y, 0, this.H - this.player.size);
        if (this.player.hp <= 0) this.triggerGameOver();
        if (e.attackType === "lunge") e.isLunging = false;
      }
    });
  }

  private standardEnemyAI(e: Enemy, room: Room, enemyIndex: number) {
    const dx = this.player.x - e.x; const dy = this.player.y - e.y;
    const dist = Math.hypot(dx, dy) || 1;
    const speedMult = this.difficulty === "easy" ? 0.7 : this.difficulty === "hard" ? 1.3 : 1;

    if (dist < 400) {
        if (e.attackType !== "shoot" || dist > (e.shootRange ?? 100) * 0.5) {
             e.x += (dx / dist) * e.speed * speedMult;
             e.y += (dy / dist) * e.speed * speedMult;
        }
    } else {
        // initialPos should be Enemy | undefined if enemyInitialPositions stores Enemy[]
        const initialPos = this.enemyInitialPositions.get(this.player.room)?.[enemyIndex];
        // 'initialPos' contains the original static properties, including original 'x' and 'y'
        if (initialPos) { // initialPos is Enemy here
            const rdx = initialPos.x - e.x; const rdy = initialPos.y - e.y;
            const rDist = Math.hypot(rdx, rdy) || 1;
            if (rDist > 5) {
                // Use current enemy's speed (e.speed) for movement back, or initialPos.speed if it should be fixed
                e.x += (rdx / rDist) * (initialPos.speed) * speedMult * 0.5;
                e.y += (rdy / rDist) * (initialPos.speed) * speedMult * 0.5;
            }
        }
    }

    e.x = this.clamp(e.x, 0, this.W - e.size); e.y = this.clamp(e.y, 0, this.H - e.size);
    e.lastAttackTime = e.lastAttackTime ?? 0;
    if (this.frameCount >= e.lastAttackTime + (e.attackCooldown ?? 120)) {
      if (e.attackType === "shoot" && dist < (e.shootRange ?? 300)) {
        this.spawnProjectile(e); e.lastAttackTime = this.frameCount;
      } else if (e.attackType === "bossPattern") {
        this.executeBossAttack(e); e.lastAttackTime = this.frameCount;
      }
    }
  }

  private executeBossAttack(boss: Enemy) {
    const attackChoice = Math.random();
    const distToPlayer = Math.hypot(this.player.x - boss.x, this.player.y - boss.y);

    if (attackChoice < 0.6 && distToPlayer < (boss.shootRange ?? 400) ) {
      for (let i = -1; i <= 1; i++) {
        setTimeout(() => { if(boss.hp > 0) this.spawnProjectile(boss, i * 0.2);}, i * 100 + 50);
      }
      this.activeEffects.push({type: "bossShoot", x: boss.x + boss.size/2, y: boss.y + boss.size/2, time: 30});
    } else if (distToPlayer < (boss.lungeRange ?? 200) && distToPlayer > boss.size && boss.isLunging !== true) {
      this.showDialog(`${boss.sprite} prepares to charge!`);
      this.activeEffects.push({type: "bossLungeCharge", x: boss.x + boss.size/2, y: boss.y + boss.size/2, time: 45});
      setTimeout(() => {
        if (boss.hp > 0) {
            boss.isLunging = true; boss.lungeTargetX = this.player.x; boss.lungeTargetY = this.player.y;
        }
      }, 750);
    }
    boss.lastAttackTime = this.frameCount + (boss.attackCooldown ?? 150)/2;
  }

  private updateLunge(enemy: Enemy) {
    if (enemy.isLunging !== true || typeof enemy.lungeTargetX !== 'number' || typeof enemy.lungeTargetY !== 'number') return;
    const dx = enemy.lungeTargetX - enemy.x; const dy = enemy.lungeTargetY - enemy.y;
    const dist = Math.hypot(dx, dy) || 1;
    const lungeSpeed = enemy.lungeSpeed ?? 10;

    if (dist > lungeSpeed) {
      enemy.x += (dx / dist) * lungeSpeed; enemy.y += (dy / dist) * lungeSpeed;
    } else {
      enemy.x = enemy.lungeTargetX; enemy.y = enemy.lungeTargetY;
      enemy.isLunging = false; enemy.lastAttackTime = this.frameCount + 30;
    }
    enemy.x = this.clamp(enemy.x, 0, this.W - enemy.size); enemy.y = this.clamp(enemy.y, 0, this.H - enemy.size);
  }

  private spawnProjectile(owner: Enemy, angleOffset = 0) {
    if (!owner.projectileType) return;
    const dx = this.player.x + this.player.size / 2 - (owner.x + owner.size / 2);
    const dy = this.player.y + this.player.size / 2 - (owner.y + owner.size / 2);
    const angle = Math.atan2(dy, dx) + angleOffset; const speed = 5;
    this.activeProjectiles.push({
      x: owner.x + owner.size / 2 - 5, y: owner.y + owner.size / 2 - 5,
      vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
      size: 18, type: owner.projectileType, owner: "enemy",
      damage: owner.damage * 0.8, rotation: angle,
    });
  }

  private updateProjectiles(room: Room) {
    this.activeProjectiles = this.activeProjectiles.filter(p => {
      p.x += p.vx; p.y += p.vy;
      const isProjectileHitPlayer = this.rectIntersect(this.player, { ...p, w: p.size, h: p.size });
      if (p.owner === "enemy" && isProjectileHitPlayer && !this.player.isInvincible) {
        this.player.hp -= p.damage * (1 - this.player.shadowResilience);
        this.activeEffects.push({type: "projectileHitPlayer", x:p.x, y:p.y, time: 15});
        if (this.player.hp <= 0) this.triggerGameOver();
        return false;
      }
      for (const wall of room.walls) {
        if (this.rectIntersect({ ...p, w: p.size, h: p.size }, wall)) {
          this.activeEffects.push({type: "projectileHitWall", x:p.x, y:p.y, time: 10});
          return false;
        }
      }
      return p.x > -p.size && p.x < this.W && p.y > -p.size && p.y < this.H;
    });
  }

  render() {
    if (!this.ctx) return;
    const room = this.getCurrentRoom(); // Uses this.liveRoomsData
    const ctx = this.ctx;
    this.drawBackground(room);
    room.hazards.forEach(h => { ctx.fillStyle = h.type === "spikeTrap" ? "rgba(160,40,40,0.1)" : "rgba(100,0,130,0.12)"; ctx.fillRect(h.x, h.y, h.w, h.h); });
    room.doors.forEach((d, doorIdx) => {
        const portalCenterX = d.x + d.w / 2; const portalCenterY = d.y + d.h / 2;
        ctx.save();
        if (this.portalImage?.complete && this.portalImage.naturalHeight !== 0) {
            ctx.translate(portalCenterX, portalCenterY);
            const portalAnimFactor = Math.sin(this.frameCount * 0.05 + doorIdx) * 0.05 + 1.0;
            ctx.scale(portalAnimFactor, portalAnimFactor); ctx.rotate(Math.sin(this.frameCount * 0.02 + doorIdx * 0.5) * 0.1);
            const doorKey = `${this.player.room}-${doorIdx}`;
            const targetRoomData = this.liveRoomsData[d.target]; // Use liveRoomsData
            const targetDoorIndex = targetRoomData.doors.findIndex(door => door.target === this.player.room);
            const targetDoorKey = `${d.target}-${targetDoorIndex}`;
            const isOpened = this.openedDoors.has(doorKey) || (targetDoorIndex !== -1 && this.openedDoors.has(targetDoorKey));
            let portalFilter = 'none';
            if (d.lock === "key" && !isOpened && this.difficulty !== "peaceful") portalFilter = 'sepia(1) saturate(4) hue-rotate(270deg) brightness(0.7)';
            else if (d.lock === "key" && isOpened) portalFilter = 'brightness(1.2) saturate(1.5)';
            ctx.filter = portalFilter;
            ctx.drawImage(this.portalImage, -d.w / 2, -d.h / 2, d.w, d.h);
        } else { ctx.fillStyle = "purple"; ctx.fillRect(-d.w / 2, -d.h / 2, d.w, d.h); }
        ctx.restore();
    });
    room.walls.forEach(w => { ctx.fillStyle = w.color; ctx.fillRect(w.x, w.y, w.w, w.h); });
    room.items.forEach(it => {
      const img = this.itemImages[it.type];
      if (img?.complete && img.naturalHeight !== 0) ctx.drawImage(img, it.x, it.y, it.w * 1.5, it.h * 1.5);
      else { ctx.fillStyle = "#FFF"; ctx.fillRect(it.x, it.y, it.w, it.h); }
    });
    this.renderProjectiles(ctx);
    room.enemies.forEach(e => {
      if (e.hp <= 0) return;
      const enemyImg = this.enemyImages[e.sprite];
      ctx.save();
      if (enemyImg?.complete && enemyImg.naturalHeight !== 0) {
        if (e.isLunging === true) {
            ctx.globalAlpha = 0.6 + Math.sin(this.frameCount * 0.5) * 0.2;
            let angle = 0;
            if (typeof e.lungeTargetX === 'number' && typeof e.lungeTargetY === 'number') {
                 angle = Math.atan2(e.lungeTargetY - e.y, e.lungeTargetX - e.x);
            }
            ctx.translate(e.x + e.size/2, e.y + e.size/2); ctx.rotate(angle + Math.PI/2);
            ctx.drawImage(enemyImg, -e.size/2, -e.size/2, e.size, e.size);
        } else ctx.drawImage(enemyImg, e.x, e.y, e.size, e.size);
      } else { ctx.fillStyle = e.color || "magenta"; ctx.fillRect(e.x, e.y, e.size, e.size); }
      ctx.restore();
      ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(e.x, e.y - 10, e.size, 7);
      ctx.fillStyle = e.sprite === "shadowOverlord" ? "#FF0000" : "#B22222";
      ctx.fillRect(e.x + 1, e.y - 9, Math.max(0,(e.size - 2) * e.hp / e.hpMax), 5);
    });
    if (this.playerImage?.complete && this.playerImage.naturalHeight !== 0) {
      ctx.drawImage(this.playerImage, this.player.x, this.player.y, this.player.size, this.player.size);
    } else { ctx.fillStyle = "blue"; ctx.fillRect(this.player.x, this.player.y, this.player.size, this.player.size); }
    this.renderActiveEffects(ctx);
    if (this.transitionAlpha > 0) { ctx.fillStyle = `rgba(0,0,0,${this.transitionAlpha})`; ctx.fillRect(0, 0, this.W, this.H); }
    if (this.dialogMessage) {
        ctx.save(); ctx.fillStyle = "rgba(0, 0, 0, 0.75)"; const dialogHeight = 80;
        ctx.fillRect(this.W / 2 - 300, this.H - dialogHeight - 20, 600, dialogHeight);
        ctx.fillStyle = "#E0E0E0"; ctx.font = "italic 18px 'Times New Roman', serif"; ctx.textAlign = "center";
        this.wrapText(ctx, this.dialogMessage, this.W / 2, this.H - dialogHeight/2 - 10, 580, 22);
        ctx.restore();
    }
    if (this.gameWon) this.drawEndScreen(ctx, "YOU HAVE VANQUISHED THE SHADOWS!", "green", "Press Enter to Begin Anew");
    if (this.gameOver && !this.gameWon) this.drawEndScreen(ctx, "YOU HAVE FALLEN", "darkred", "Press Enter to Restart");
    if (this.onRender) {
      this.onRender({
        player: this.player, roomName: room.name, nearAnvil: this.nearAnvil(),
        itemCooldowns: this.itemCooldowns, selectedItem: this.selectedItem, bossDefeated: this.gameWon,
      });
    }
  }

  private drawEndScreen(ctx: CanvasRenderingContext2D, title: string, titleColor: string, subtitle: string) {
    ctx.fillStyle = "rgba(0,0,0,0.85)"; ctx.fillRect(0, 0, this.W, this.H);
    ctx.font = "bold 48px 'Times New Roman', serif"; ctx.fillStyle = titleColor; ctx.textAlign = "center";
    ctx.fillText(title, this.W / 2, this.H / 2 - 40);
    ctx.font = "24px 'Times New Roman', serif"; ctx.fillStyle = "lightgray";
    ctx.fillText(subtitle, this.W / 2, this.H / 2 + 20);
  }

  private renderProjectiles(ctx: CanvasRenderingContext2D) {
    this.activeProjectiles.forEach(p => {
      const img = this.projectileImages[p.type]; ctx.save();
      ctx.translate(p.x + p.size/2, p.y + p.size/2); ctx.rotate(p.rotation);
      if (img?.complete && img.naturalHeight !== 0) ctx.drawImage(img, -p.size/2, -p.size/2, p.size, p.size);
      else { ctx.fillStyle = "red"; ctx.beginPath(); ctx.arc(0,0, p.size/2, 0, Math.PI*2); ctx.fill(); }
      ctx.restore();
    });
  }

  private renderActiveEffects(ctx: CanvasRenderingContext2D) {
    this.activeEffects.forEach(effect => {
        ctx.save();
        const effectX = (effect.type === "crossbowBolt" || effect.type === "curseScan" || effect.type === "paralysis" || effect.type === "projectileHitPlayer" || effect.type === "projectileHitWall" || effect.type === "bossLungeCharge" || effect.type === "bossShoot" ) ? effect.x : this.player.x + this.player.size / 2;
        const effectY = (effect.type === "crossbowBolt" || effect.type === "curseScan" || effect.type === "paralysis" || effect.type === "projectileHitPlayer" || effect.type === "projectileHitWall" || effect.type === "bossLungeCharge" || effect.type === "bossShoot") ? effect.y : this.player.y + this.player.size / 2;
        switch (effect.type) {
            case "heal": ctx.fillStyle = `rgba(0, 220, 0, ${effect.time / 30})`; ctx.beginPath(); ctx.arc(effectX, effectY, 20 + (15 - effect.time / 2), 0, Math.PI * 2); ctx.fill(); break;
            case "crossbowBolt": ctx.fillStyle = `rgba(255, 200, 0, ${effect.time / 15})`; ctx.beginPath(); ctx.arc(effect.x, effect.y, 10 + (5-effect.time/3), 0, Math.PI*2); ctx.fill(); break;
            case "swiftness": ctx.fillStyle = `rgba(220, 220, 100, ${effect.time / 150})`; ctx.beginPath(); ctx.arc(effectX, effectY, this.player.size * 0.3 + (10 - effect.time/15), 0, Math.PI*2); ctx.fill(); break;
            case "shielding": ctx.strokeStyle = `rgba(135, 206, 250, ${effect.time / 300})`; ctx.lineWidth = 3 + (2 - effect.time/150); ctx.beginPath(); ctx.arc(effectX, effectY, this.player.size * 0.6 + (10-effect.time/30), 0, Math.PI*2); ctx.stroke(); break;
            case "curseScan": ctx.strokeStyle = `rgba(148, 0, 211, ${effect.time / 180})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(effect.x, effect.y, (effect.size ?? 20)/2 + (20 - effect.time/9), 0, Math.PI*2); ctx.stroke(); break;
            case "berserk": ctx.fillStyle = `rgba(255, 60, 0, ${effect.time / 210})`; ctx.beginPath(); ctx.arc(effectX, effectY, this.player.size * 0.4 + (10-effect.time/21), 0, Math.PI*2); ctx.fill(); break;
            case "paralysis": ctx.fillStyle = `rgba(255, 255, 0, ${effect.time / 180 * 0.7})`; for(let i=0; i<3; ++i) {ctx.beginPath(); ctx.arc(effect.x + Math.random()*10-5, effect.y + Math.random()*10-5, Math.random()*5 + 2, 0, Math.PI*2); ctx.fill();} break;
            case "boltsReload": ctx.fillStyle = `rgba(139, 69, 19, ${effect.time / 30})`; ctx.beginPath(); ctx.arc(effectX, effectY, 10 + (8-effect.time/4),0,Math.PI*2); ctx.fill(); break;
            case "projectileHitPlayer": ctx.fillStyle = `rgba(255,0,0, ${effect.time/15})`; ctx.beginPath(); ctx.arc(effectX, effectY, 15, 0, Math.PI*2); ctx.fill(); break;
            case "projectileHitWall": ctx.fillStyle = `rgba(200,200,200, ${effect.time/10})`; ctx.beginPath(); ctx.arc(effectX, effectY, 8, 0, Math.PI*2); ctx.fill(); break;
            case "bossLungeCharge": ctx.fillStyle = `rgba(255, 0, 0, ${0.2 + Math.sin(this.frameCount*0.3)*0.1})`; ctx.beginPath(); ctx.arc(effectX, effectY, (effect.size ?? 80) * (0.5 + (45-effect.time)/90) , 0, Math.PI*2); ctx.fill(); break;
            case "bossShoot": ctx.fillStyle = `rgba(200, 0, 200, ${effect.time/30 * 0.7})`; ctx.beginPath(); ctx.arc(effectX, effectY, 25, 0, Math.PI*2); ctx.fill(); break;
        }
        ctx.restore();
    });
  }

  private drawBackground(room: Room) {
    const ctx = this.ctx; const g = ctx.createLinearGradient(0, 0, 0, this.H);
    g.addColorStop(0, room.bgColor1); g.addColorStop(1, room.bgColor2);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.W, this.H);
    if (room.bgType === "skyline" && room.skylineColor) {
        ctx.fillStyle = room.skylineColor;
        for (let i = 0; i < 20; i++) {
          const w = this.rand(30, 80); const h = this.rand(40, 150);
          const xPos = ((i * (this.W / 15) - this.backgroundOffset * 0.3) % (this.W + 80)) - 40;
          ctx.fillRect(xPos, this.H - h, w, h);
        }
    } else if (room.bgType === "forest" && room.fgColor) {
        ctx.fillStyle = room.fgColor;
        for (let i = 0; i < 10; i++) {
          const treeWidth = this.rand(15, 30); const treeHeight = this.rand(this.H * 0.4, this.H * 0.8);
          const xPos = ((i * (this.W/8) - this.backgroundOffset * 0.5) % (this.W + treeWidth)) - treeWidth;
          ctx.fillRect(xPos, this.H - treeHeight, treeWidth, treeHeight);
          ctx.beginPath(); ctx.moveTo(xPos - treeWidth/2, this.H - treeHeight);
          ctx.lineTo(xPos + treeWidth + treeWidth/2, this.H - treeHeight);
          ctx.lineTo(xPos + treeWidth/2, this.H - treeHeight - this.rand(40,80));
          ctx.closePath(); ctx.fill();
        }
    } else if (room.bgType === "dungeon" && room.skylineColor) {
       for (let i = 0; i < 5; i++) {
           ctx.fillStyle = `rgba(${parseInt(room.skylineColor.slice(1,3),16)}, ${parseInt(room.skylineColor.slice(3,5),16)}, ${parseInt(room.skylineColor.slice(5,7),16)}, 0.2)`;
           const xPos = this.rand(0, this.W); const yPos = this.rand(this.H*0.2, this.H*0.8);
           const lightRadius = this.rand(30,70);
           ctx.beginPath(); ctx.arc(xPos, yPos, lightRadius, 0, Math.PI*2); ctx.fill();
       }
    }
  }

  private rectIntersect(a: RectObject, b: RectObject): boolean {
    const aW = a.w ?? a.size ?? 0; const aH = a.h ?? a.size ?? 0;
    const bW = b.w ?? b.size ?? 0; const bH = b.h ?? b.size ?? 0;
    return (a.x < b.x + bW && a.x + aW > b.x && a.y < b.y + bH && a.y + aH > b.y);
  }

  private rand(min: number, max: number): number { return Math.random() * (max - min) + min; }
  private clamp(v: number, min: number, max: number): number { return Math.max(min, Math.min(max, v)); }
  private getCurrentRoom(): Room { this.visitedRooms.add(this.player.room); return this.liveRoomsData[this.player.room]; }
  private nearAnvil(): boolean { return this.getCurrentRoom().items.some(it => it.type === "anvil" && this.rectIntersect(this.player, it)); }
  toggleCrafting() { this.craftingMode = !this.craftingMode; this.craftSelection = 0; }

  private canAfford(recipeIndex: number): boolean {
    if (this.difficulty === 'peaceful') return true;
    const recipe = recipes[recipeIndex];
    for (const r of resourceTypes) if ((recipe.cost[r] ?? 0) > this.player.materials[r]) return false;
    return true;
  }

  attemptCraft() {
    const recipe = recipes[this.craftSelection];
    if (!this.canAfford(this.craftSelection)) { this.showDialog("You lack the required materials."); return; }
    if (this.difficulty !== 'peaceful') {
        for (const r of resourceTypes) this.player.materials[r] -= recipe.cost[r] ?? 0;
    }
    this.showDialog(`Successfully forged: ${recipe.name}!`);
    switch (recipe.name) {
      case "Greater Healing Potion": this.player.hp = this.player.hpMax; this.activeEffects.push({ type: "heal", x: this.player.x, y: this.player.y, time: 60 }); break;
      case "Enchanted Armor Piece": this.player.shadowResilience = Math.min(1, this.player.shadowResilience + 0.5); break;
      case "Boots of Swiftness": this.player.speed += 1; break;
      case "Skeleton Key": this.player.keys += 1; break;
      case "Heavy Crossbow": this.player.inventory.heavyCrossbow = true; this.player.crossbowBolts = 5; break;
      case "Amulet of Shielding": this.player.inventory.amuletOfShielding = true; break;
      case "Orb of Revealing": this.player.inventory.orbOfRevealing = true; break;
      case "Berserker's Draught": this.player.inventory.berserkersDraught = true; break;
      case "Rune of Paralysis": this.player.inventory.runeOfParalysis = true; break;
      case "Quiver of Bolts":
        if (this.player.inventory.heavyCrossbow === true) this.player.crossbowBolts = Math.min(this.player.crossbowBolts + 5, 10);
        else { this.showDialog("You need a Heavy Crossbow to use these bolts."); if (this.difficulty !== 'peaceful') for (const r of resourceTypes) this.player.materials[r] += recipe.cost[r] ?? 0; }
        break;
    }
  }

  private changeRoom(index: number, dest: { x: number; y: number }) {
    this.transitionAlpha = 1;
    setTimeout(() => {
      this.player.room = index; this.player.x = dest.x; this.player.y = dest.y;
      this.placePlayerSafely(); this.visitedRooms.add(index); this.doorCooldown = 15;
    }, 100);
   }

  private placePlayerSafely() {
    const room = this.getCurrentRoom(); let moved = true; let iter = 0;
    while (moved && iter < 8) {
      moved = false;
      for (const d of room.doors) {
        if (!this.rectIntersect(this.player, d)) continue;
        const pcx = this.player.x + this.player.size / 2; const pcy = this.player.y + this.player.size / 2;
        const dcx = d.x + d.w / 2; const dcy = d.y + d.h / 2;
        const overlapX = (this.player.size/2 + d.w/2) - Math.abs(pcx - dcx);
        const overlapY = (this.player.size/2 + d.h/2) - Math.abs(pcy - dcy);
        if (overlapX > 0 && overlapY > 0) {
            if (overlapX < overlapY) this.player.x += Math.sign(pcx - dcx) * overlapX;
            else this.player.y += Math.sign(pcy - dcy) * overlapY;
            moved = true;
        }
      }
      iter++;
    }
    this.player.x = this.clamp(this.player.x, 0, this.W - this.player.size);
    this.player.y = this.clamp(this.player.y, 0, this.H - this.player.size);
  }

  private triggerGameOver() { if (this.gameWon) return; this.player.hp = 0; this.gameOver = true; this.craftingMode = false; this.showDialog("Darkness consumes you... Press Enter to restart.", 6000); }

// Inside your GameEngine class
  private checkBossDefeated() {
    const currentRoomData: Room = this.liveRoomsData[this.player.room];
    if (currentRoomData.name === "The Shadow Lord's Lair") {
        const enemiesList: Enemy[] = currentRoomData.enemies;
        const boss: Enemy | undefined = enemiesList.find(
            (e: Enemy) => e.sprite === "shadowOverlord"
        );

        if (boss) { // Type guard: boss is now Enemy (not undefined)
            // Accessing boss.hp, boss.sprite, etc., is safe here
            if (boss.hp <= 0 && !this.gameWon) {
                this.gameWon = true;
                this.showDialog("The Shadow Overlord is VANQUISHED! Press Enter to Begin Anew.", 10000);
                const exitPortal = currentRoomData.doors[0];
                if (exitPortal) {
                    const doorKey = `${this.player.room}-0`;
                    this.openedDoors.add(doorKey);
                }
            }
        }
    }
  }

  saveGame(force = false) {
    const now = performance.now();
    if (!force && now - this.lastSaveTime < 20_000) return;
    this.lastSaveTime = now;
    try {
        localStorage.setItem("knightfallSave_v1", JSON.stringify({
            playerState: this.player,
            visitedRooms: Array.from(this.visitedRooms),
            openedDoors: Array.from(this.openedDoors),
            difficulty: this.difficulty,
            // Note: enemy states and live item states are not saved here explicitly.
            // They would be reset or re-derived on load based on gameDataRooms logic or would need specific saving.
            // For a simple save, this might be acceptable if `loadGame` re-initializes room states.
          })
        );
    } catch (e) {
        console.error("Error saving game:", e);
        this.showDialog("Failed to save game progress.", 120);
    }
  }

  loadGame() {
    const raw = localStorage.getItem("knightfallSave_v1");
    if (!raw) return;
    try {
      const savedData = JSON.parse(raw);
      if (savedData.playerState) {
          this.player = {...this.player, ...savedData.playerState};
          this.player.materials = {...this.player.materials, ...(savedData.playerState.materials || {})};
          this.player.inventory = {...this.player.inventory, ...(savedData.playerState.inventory || {})};
      }
      this.visitedRooms = new Set<number>(savedData.visitedRooms ?? [0]);
      this.openedDoors = new Set<string>(savedData.openedDoors ?? []);
      this.difficulty = savedData.difficulty ?? "normal";
      // Important: After loading player position and room, reset current room's dynamic state (enemies, items)
      // or implement full room state saving/loading. For simplicity, we'll re-initialize from defaults.
      this.liveRoomsData = JSON.parse(JSON.stringify(gameDataRooms)); // Reset all room states to default
      this.resetEnemies(); // Re-populate live enemies based on initial definitions for current difficulty
      this.resetItems();   // Re-populate live items

      this.placePlayerSafely();
      this.showDialog("Game loaded successfully!");
    } catch (e) {
      console.error("Failed to load Knightfall save:", e);
      localStorage.removeItem("knightfallSave_v1");
      this.showDialog("Failed to load save data. Starting new game.");
      this.resetGame(); // Fallback to a new game
    }
  }

  setDifficulty(difficulty: 'peaceful' | 'easy' | 'normal' | 'hard') {
    this.difficulty = difficulty;
    if (difficulty === 'peaceful') {
      this.player.materials = { ironScraps: 99, arcaneDust: 99, alchemicalReagents: 99 };
      this.player.hp = this.player.hpMax;
    }
    // Consider resetting the game or enemies if difficulty changes mid-game
    // For now, it only affects new interactions and player material boost.
  }


  // Inside your GameEngine class
  private resetEnemies() {
    this.liveRoomsData.forEach((roomData, roomIdx) => {
        const initialEnemyConfigurations = this.enemyInitialPositions.get(roomIdx);
        // initialEnemyConfigurations should be Enemy[] here due to the corrected typing

        if (initialEnemyConfigurations) {
            roomData.enemies = initialEnemyConfigurations.map((initialState: Enemy): Enemy => {
                // initialState is now guaranteed to be a full Enemy object
                return {
                    ...initialState,         // Spread all properties from the stored (complete) initial state.
                    hp: initialState.hpMax, // Reset current hp to max. hpMax is guaranteed on Enemy.
                                            // lastAttackTime: 0 and isLunging: false are already correctly set in initialState.
                };
            });
            // No 'as Enemy[]' type assertion should be needed if types are correct.
        } else {
            // This case implies a room was defined in gameDataRooms but didn't get an entry
            // in enemyInitialPositions, which would be an issue in the constructor.
            roomData.enemies = [];
        }
    });
  }

  private resetItems() {
    this.liveRoomsData.forEach((liveRoom, roomIdx) => {
        const pristineRoomData = gameDataRooms[roomIdx];
        if (pristineRoomData && pristineRoomData.items) {
            liveRoom.items = JSON.parse(JSON.stringify(pristineRoomData.items));
        } else {
            liveRoom.items = [];
        }
    });
  }


  resetGame() {
    this.player = {
      x: 50, y: 300, size: 48, speed: 4, room: 0, hp: 100, hpMax: 100,
      keys: 0, shadowResilience: 0,
      materials: { ironScraps: 0, arcaneDust: 0, alchemicalReagents: 0 },
      inventory: {}, crossbowBolts: 0, isInvincible: false, damageMultiplier: 1,
    };
    this.visitedRooms = new Set([0]); this.openedDoors.clear();
    this.gameOver = false; this.gameWon = false; this.craftingMode = false;
    this.transitionAlpha = 0; this.doorCooldown = 0;
    this.dialogMessage = ""; this.dialogTimer = 0;
    this.itemCooldowns = {}; this.activeEffects = []; this.activeProjectiles = [];
    this.selectedItem = 0; this.craftSelection = 0; this.frameCount = 0;

    // Re-initialize live room data from pristine game data
    this.liveRoomsData = JSON.parse(JSON.stringify(gameDataRooms));
    // Re-initialize enemyInitialPositions based on the fresh pristine data
    this.liveRoomsData.forEach((room, idx) => {
      this.enemyInitialPositions.set(
        idx,
        room.enemies.map((e: Enemy): Enemy => ({
            ...e,
            lastAttackTime: 0,
            isLunging: false,
        }))
      );
    });
    this.resetEnemies(); // Populate live enemies based on the new initial positions
    // Items are already reset by liveRoomsData deep copy.

    localStorage.removeItem("knightfallSave_v1");
    this.showDialog("A new adventure begins!");
  }

  private useItem(itemName: string) {
    if (this.player.inventory[itemName] !== true || (this.itemCooldowns[itemName] ?? 0) > 0) {
        if (this.player.inventory[itemName] !== true) this.showDialog(`You don't have ${itemName}.`);
        else this.showDialog(`${itemName} is still on cooldown.`);
        return;
    }
    switch (itemName) {
      case "heavyCrossbow":
        if (this.player.crossbowBolts <= 0) { this.showDialog("Out of Crossbow Bolts!"); return; }
        const room = this.getCurrentRoom(); let closestEnemy: Enemy | null = null; let minDist = Infinity;
        room.enemies.forEach(e => {
          if (e.hp > 0) {
            const dist = Math.hypot(this.player.x - e.x, this.player.y - e.y);
            if (dist < minDist && dist < 400) { minDist = dist; closestEnemy = e; }
          }
        });
        if (closestEnemy) {
          closestEnemy.hp -= 50 * this.player.damageMultiplier;
          this.showDialog(`Fired a bolt at ${closestEnemy.sprite || 'a monster'}!`);
          this.activeEffects.push({ type: "crossbowBolt", x: closestEnemy.x + closestEnemy.size/2 , y: closestEnemy.y + closestEnemy.size/2, time: 20 });
          if (closestEnemy.hp <=0) this.showDialog(`${closestEnemy.sprite || 'The monster'} has been vanquished!`);
        } else { this.showDialog("No target in range for the crossbow."); return; }
        this.player.crossbowBolts--; this.itemCooldowns[itemName] = 90;
        break;
      case "bootsOfSwiftness_ACTIVATABLE": // Example, ensure this item name matches actual craftable/inventory items
        const originalSpeed = this.player.speed;
        // Check if permanent boots already applied
        const baseSpeed = this.player.inventory.bootsOfSwiftness === true ? originalSpeed -1 : originalSpeed;
        this.player.speed = baseSpeed * 1.5;

        this.itemCooldowns[itemName] = 600; this.showDialog("Boots of Swiftness activated!");
        this.activeEffects.push({ type: "swiftness", x: this.player.x, y: this.player.y, time: 300 });
        setTimeout(() => { this.player.speed = this.player.inventory.bootsOfSwiftness === true ? baseSpeed +1 : baseSpeed; }, 5000);
        break;
      case "amuletOfShielding":
        this.player.isInvincible = true; this.itemCooldowns[itemName] = 900;
        this.showDialog("Amulet of Shielding activated! You are invulnerable!");
        this.activeEffects.push({ type: "shielding", x: this.player.x, y: this.player.y, time: 300 });
        setTimeout(() => { this.player.isInvincible = false; this.showDialog("The Amulet's protection fades."); }, 5000);
        break;
      case "orbOfRevealing":
        const currentRoomHazards = this.getCurrentRoom().hazards; let foundHazard = false;
        currentRoomHazards.forEach(h => { this.activeEffects.push({ type: "curseScan", x: h.x + h.w/2, y: h.y + h.h/2, time: 240, size: Math.max(h.w, h.h) }); foundHazard = true; });
        if (foundHazard) this.showDialog("The Orb of Revealing shimmers, outlining cursed areas!");
        else this.showDialog("The Orb of Revealing finds no cursed areas nearby.");
        this.itemCooldowns[itemName] = 450;
        break;
      case "berserkersDraught":
        const originalDamageMult = this.player.damageMultiplier; this.player.damageMultiplier *= 2;
        this.itemCooldowns[itemName] = 720; this.showDialog("Berserker's Draught consumed! Your attacks feel mightier!");
        this.activeEffects.push({ type: "berserk", x: this.player.x, y: this.player.y, time: 420 });
        setTimeout(() => { this.player.damageMultiplier = originalDamageMult; this.showDialog("The berserk rage subsides."); }, 7000);
        break;
      case "runeOfParalysis":
        const roomForStun = this.getCurrentRoom(); let stunnedSomeone = false;
        roomForStun.enemies.forEach(e => {
          if (e.hp > 0 && e.speed > 0) { // Check if already stunned (speed > 0)
            const initialEnemyData = this.enemyInitialPositions.get(this.player.room)?.find(initialE => initialE.x === e.x && initialE.y === e.y);
            const originalEnemySpeed = initialEnemyData?.speed ?? e.speed; // Fallback to current speed if not found
            e.speed = 0; stunnedSomeone = true;
            this.activeEffects.push({ type: "paralysis", x: e.x + e.size/2, y: e.y + e.size/2, time: 180, size: e.size });
            setTimeout(() => { if(e.hp > 0) e.speed = originalEnemySpeed; }, 3000);
          }
        });
        if(stunnedSomeone) this.showDialog("Rune of Paralysis activated! Enemies are stunned!");
        else this.showDialog("No enemies nearby to paralyze.");
        this.itemCooldowns[itemName] = 600;
        break;
    }
  }

  private showDialog(message: string, duration = 240) { this.dialogMessage = message; this.dialogTimer = duration; }

  private wrapText(context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
    const words = text.split(' '); let line = ''; let currentY = y; context.textBaseline = 'middle';
    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + ' '; const metrics = context.measureText(testLine); const testWidth = metrics.width;
      if (testWidth > maxWidth && n > 0) { context.fillText(line.trim(), x, currentY); line = words[n] + ' '; currentY += lineHeight; }
      else { line = testLine; }
    }
    context.fillText(line.trim(), x, currentY);
  }
}