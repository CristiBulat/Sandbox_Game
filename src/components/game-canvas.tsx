"use client";

import { useEffect, useRef, useState } from "react";
import { GameEngine } from "@/lib/game-engine";
import CraftingUI from "./crafting-ui";
import GameHUD from "./game-hud";
import MiniMap from "./MiniMap";

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameEngine, setGameEngine] = useState<GameEngine | null>(null);
  const [gameState, setGameState] = useState({
    player: {
      hp: 100,
      hpMax: 100,
      keys: 0,
      radRes: 0,
      materials: { scrap: 0, circuits: 0, chemicals: 0 },
      room: 0,
      x: 50,
      y: 300,
      inventory: {},
      railgunAmmo: 0,
      isInvincible: false,
      damageMultiplier: 1,
    },
    roomName: "Pripyat Street",
    nearBench: false,
    gameOver: false,
    craftingMode: false,
    itemCooldowns: {} as Record<string, number>,
    selectedItem: 0,
  });

  // Initialize game engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current);
    
    // Set up the render callback
    engine.onRender = (props) => {
      setGameState(prev => ({
        ...prev,
        player: props.player,
        roomName: props.roomName,
        nearBench: props.nearBench,
        itemCooldowns: props.itemCooldowns,
        selectedItem: props.selectedItem,
        craftingMode: engine.craftingMode,
        gameOver: engine.gameOver,
      }));
    };

    setGameEngine(engine);

    // Load saved game if available
    engine.loadGame();

    // Game loop
    let animationFrameId: number;
    const gameLoop = () => {
      if (!engine.craftingMode && !engine.gameOver) {
        engine.update();
      }
      engine.render();

      // Auto-save
      engine.saveGame();

      animationFrameId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    // Set up keyboard listeners
    const handleKeyDown = (e: KeyboardEvent) => engine.handleKeyDown(e);
    const handleKeyUp = (e: KeyboardEvent) => engine.handleKeyUp(e);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const toggleCrafting = () => {
    if (gameEngine) {
      gameEngine.toggleCrafting();
    }
  };

  const attemptCraft = (recipeIndex: number) => {
    if (gameEngine) {
      gameEngine.craftSelection = recipeIndex;
      gameEngine.attemptCraft();
    }
  };

  const resetGame = () => {
    if (gameEngine) {
      gameEngine.resetGame();
      setGameState({
        player: {
          hp: 100,
          hpMax: 100,
          keys: 0,
          radRes: 0,
          materials: { scrap: 0, circuits: 0, chemicals: 0 },
          room: 0,
          x: 50,
          y: 300,
          inventory: {},
          railgunAmmo: 0,
          isInvincible: false,
          damageMultiplier: 1,
        },
        roomName: "Pripyat Street",
        nearBench: false,
        gameOver: false,
        craftingMode: false,
        itemCooldowns: {},
        selectedItem: 0,
      });
    }
  };

  const changeDifficulty = (difficulty: 'peaceful' | 'easy' | 'normal' | 'hard') => {
    if (gameEngine) {
      gameEngine.setDifficulty(difficulty);
    }
  };

  return (
    <div className="relative">
      {/* Difficulty Selector */}
      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        <button
          onClick={() => changeDifficulty('peaceful')}
          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded shadow-md transition-colors"
        >
          Peaceful
        </button>
        <button
          onClick={() => changeDifficulty('easy')}
          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded shadow-md transition-colors"
        >
          Easy
        </button>
        <button
          onClick={() => changeDifficulty('normal')}
          className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded shadow-md transition-colors"
        >
          Normal
        </button>
        <button
          onClick={() => changeDifficulty('hard')}
          className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded shadow-md transition-colors"
        >
          Hard
        </button>
      </div>

      {/* Reset Button */}
      <button
        onClick={resetGame}
        className="absolute top-4 right-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded shadow-md transition-colors"
      >
        Reset Game
      </button>

      {/* MiniMap */}
      {gameEngine && gameEngine.visitedRooms && (
        <MiniMap
          currentRoom={gameState.player.room}
          visitedRooms={gameEngine.visitedRooms}
          totalRooms={6}
        />
      )}


      {/* Game Canvas */}
       {/* className="relative"> */}
      <canvas
        ref={canvasRef}
        width={960}
        height={640}
        className="border-2 border-gray-700 bg-black"
      />

      {/* Game HUD */}
      <GameHUD
        player={gameState.player}
        roomName={gameState.roomName}
        nearBench={gameState.nearBench}
        itemCooldowns={gameState.itemCooldowns}
        selectedItem={gameState.selectedItem}
      />

      {/* Crafting UI */}
      {gameState.craftingMode && (
        <CraftingUI
          materials={gameState.player.materials}
          onClose={toggleCrafting}
          onCraft={attemptCraft}
        />
      )}

      {/* Game Over Screen */}
      {gameState.gameOver && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80">
          <h2 className="text-5xl font-bold text-red-600 mb-4">GAME OVER</h2>
          <button
            onClick={resetGame}
            className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg shadow-md transition-colors text-xl font-bold"
          >
            Start New Game
          </button>
        </div>
      )}
    </div>
  );
}
