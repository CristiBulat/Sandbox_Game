interface GameHUDProps {
  player: {
    hp: number;
    hpMax: number;
    keys: number;
    radRes: number;
    materials: {
      scrap: number;
      circuits: number;
      chemicals: number;
    };
    inventory: Record<string, boolean>;
    railgunAmmo: number;
    isInvincible: boolean;
    damageMultiplier: number;
  };
  roomName: string;
  nearBench: boolean;
  itemCooldowns?: Record<string, number>;
  selectedItem?: number;
}

export default function GameHUD({ player, roomName, nearBench, itemCooldowns = {}, selectedItem = 0 }: GameHUDProps) {
  const inventoryItems = Object.entries(player.inventory)
    .filter(([_, hasItem]) => hasItem)
    .map(([item]) => item);

  const getItemDisplay = (item: string) => {
    const cooldown = itemCooldowns[item] ?? 0;
    let display = item;
    
    if (item === "railgun") {
      display += ` (${player.railgunAmmo})`;
    }
    if (cooldown > 0) {
      display += ` (${(cooldown/60).toFixed(1)}s)`;
    }
    if (item === "shieldgenerator" && player.isInvincible) {
      display += " [ACTIVE]";
    }
    if (item === "combatstim" && player.damageMultiplier > 1) {
      display += " [ACTIVE]";
    }
    
    return display;
  };

  return (
    <>
      <div className="absolute left-4 top-4 text-white font-mono text-sm">
        <div className="mb-1">{roomName}</div>
        <div className="mb-1">
          HP: {player.hp.toFixed(0)}/{player.hpMax}
        </div>
        <div className="mb-1">Keys: {player.keys}</div>
        <div className="mb-1">Rad Res: {(player.radRes * 100).toFixed(0)}%</div>
        <div className="mb-1">
          Materials: S{player.materials.scrap} C{player.materials.circuits} Ch
          {player.materials.chemicals}
        </div>
        {nearBench && (
          <div className="text-green-400 mt-2">Press "C" to craft</div>
        )}
      </div>

      {/* Minecraft-style inventory bar */}
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-1">
        {Array.from({ length: 9 }, (_, i) => {
          const item = inventoryItems[i];
          const isSelected = i === selectedItem;
          return (
            <div
              key={i}
              className={`w-12 h-12 border-2 ${
                isSelected ? 'border-yellow-400' : 'border-gray-600'
              } bg-black/50 flex items-center justify-center text-white text-xs`}
            >
              {item ? (
                <div className="text-center">
                  <div>{getItemDisplay(item)}</div>
                  <div className="text-yellow-400">[{i + 1}]</div>
                </div>
              ) : (
                <div className="text-gray-500">[{i + 1}]</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 text-white text-sm">
        Press E to use selected item
      </div>
    </>
  );
}
