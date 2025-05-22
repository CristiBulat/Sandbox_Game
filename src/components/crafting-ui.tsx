"use client";

import type React from "react";

import { useState } from "react";
import { recipes } from "@/lib/game-data";

interface CraftingUIProps {
  materials: {
    scrap: number;
    circuits: number;
    chemicals: number;
  };
  onClose: () => void;
  onCraft: (recipeIndex: number) => void;
}

export default function CraftingUI({
  materials,
  onClose,
  onCraft,
}: CraftingUIProps) {
  const [selectedRecipe, setSelectedRecipe] = useState(0);

  const canAfford = (recipeIndex: number) => {
    const recipe = recipes[recipeIndex];
    const resourceTypes = ["scrap", "circuits", "chemicals"] as const;

    for (const resource of resourceTypes) {
      if ((recipe.cost[resource] || 0) > materials[resource]) {
        return false;
      }
    }
    return true;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowUp") {
      setSelectedRecipe((prev) => (prev - 1 + recipes.length) % recipes.length);
    } else if (e.key === "ArrowDown") {
      setSelectedRecipe((prev) => (prev + 1) % recipes.length);
    } else if (e.key === "Enter") {
      onCraft(selectedRecipe);
    } else if (e.key.toLowerCase() === "c") {
      onClose();
    }
  };

  return (
    <div
      className="absolute inset-0 bg-black/90 flex flex-col items-center p-8"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      autoFocus
    >
      <h2 className="text-2xl font-bold text-white mb-6">CRAFTING</h2>

      <div className="w-full max-w-md">
        {recipes.map((recipe, index) => (
          <div
            key={recipe.name}
            className={`flex justify-between items-center p-2 mb-2 rounded ${
              index === selectedRecipe ? "bg-green-900" : ""
            }`}
            onClick={() => setSelectedRecipe(index)}
          >
            <span
              className={`text-lg ${
                index === selectedRecipe ? "text-green-400" : "text-gray-300"
              }`}
            >
              {recipe.name}
            </span>
            <span
              className={canAfford(index) ? "text-gray-300" : "text-red-500"}
            >
              {Object.entries(recipe.cost)
                .map(
                  ([resource, amount]) =>
                    `${resource.charAt(0).toUpperCase()}:${amount}`
                )
                .join(" ")}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-6 text-gray-400">
        <button
          className="px-4 py-2 bg-green-800 text-white rounded mr-2"
          onClick={() => onCraft(selectedRecipe)}
          disabled={!canAfford(selectedRecipe)}
        >
          Craft
        </button>
        <button
          className="px-4 py-2 bg-gray-800 text-white rounded"
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="mt-4 text-gray-500 text-sm">
        ↑/↓ select | Enter craft | C close
      </div>
    </div>
  );
}
