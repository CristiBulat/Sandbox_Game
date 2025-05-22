"use client";

interface MiniMapProps {
  currentRoom: number;
  visitedRooms: Set<number>;
  totalRooms: number;
}

export default function MiniMap({ currentRoom, visitedRooms, totalRooms }: MiniMapProps) {
  return (
    <div className="absolute bottom-4 right-4 bg-gray-900 p-2 rounded shadow-md flex gap-1">
      {Array.from({ length: totalRooms }).map((_, index) => {
        const isVisited = visitedRooms.has(index);
        const isCurrent = index === currentRoom;

        return (
          <div
            key={index}
            className={`w-4 h-4 rounded-sm ${
              isCurrent
                ? "bg-green-400"
                : isVisited
                ? "bg-gray-400"
                : "bg-gray-700"
            }`}
            title={`Room ${index}`}
          />
        );
      })}
    </div>
  );
}
