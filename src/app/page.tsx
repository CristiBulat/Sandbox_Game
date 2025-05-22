import GameCanvas from "@/components/game-canvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4">
      <h1 className="mb-4 text-3xl font-bold text-green-500">
        Chernobyl Explorer v4
      </h1>
      <h2 className="mb-6 text-xl text-gray-300">
        "Workshop & Bunker" Expansion
      </h2>
      <GameCanvas />
    </main>
  );
}
