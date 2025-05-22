import GameCanvas from "@/components/game-canvas";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 p-4">
      <h1 className="mb-4 text-4xl font-bold text-yellow-400" style={{ fontFamily: "'MedievalSharp', cursive" }}>
        Knightfall: Realm of Shadows
      </h1>
      <h2 className="mb-6 text-xl text-gray-400" style={{ fontFamily: "'MedievalSharp', cursive" }}>
        "The Quest for Eldoria's Light"
      </h2>
      <GameCanvas />
      {/* Add in globals.css: @import url('https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap');
          And in tailwind.config.js, extend theme: fontFamily: { medieval: ['MedievalSharp', 'cursive'], }
      */}
    </main>
  );
}