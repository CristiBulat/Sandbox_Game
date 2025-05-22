# Chernobyl Explorer v4

A Next.js game that lets you explore an abandoned nuclear site, expand workshops & bunkers, and experience immersive background music.

## Table of Contents
- [Demo](#demo)
- [Features](#features)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)

## Demo
_Run the game locally to explore at_ `http://localhost:3000`.

## Features
- Interactive map with keyboard controls  
- Workshop & bunker expansion mechanics  
- Background music with toggle on/off  
- Responsive design  

## Getting Started

### Prerequisites
- Node.js v16+  
- npm or yarn  

### Installation
```bash
git clone https://github.com/MadalinaDev/cernobyl-game.git
cd cernobyl-game
npm install
```

### Development
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure
```
/public        Static assets (images, audio)
/src
  /app         Next.js App Router pages and layouts
  /components  React components (BackgroundMusic, Player, Map, etc.)
  /styles      Global and component styles
```

## Customization
- **Background Music**: The `BackgroundMusic` component at `src/components/BackgroundMusic.tsx` handles looping audio and renders a toggle button.
- **Assets**: Place audio files under `public/assets`.

## Contributing
1. Fork the repository  
2. Create a feature branch (`git checkout -b feature/YourFeature`)  
3. Commit your changes (`git commit -m 'Add awesome feature'`)  
4. Push to the branch (`git push origin feature/YourFeature`)  
5. Open a Pull Request  

## License
This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.
