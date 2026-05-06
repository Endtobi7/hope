import React from 'react';
import './App.css';
import GantryVisualizer from './components/GantryVisualizer';
import ControlPanel from './components/ControlPanel';

function App() {
  const [position, setPosition] = React.useState({ x: 150, y: 150, z: 50 });
  const [isAnimating, setIsAnimating] = React.useState(false);

  const handlePositionChange = (newPosition) => {
    setIsAnimating(true);
    setPosition(newPosition);
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🤖 Gantry Robot Visualizer</h1>
        <p>Real-time 4-axis platform control and visualization</p>
      </header>

      <main className="app-main">
        <div className="container">
          <GantryVisualizer 
            position={position} 
            isAnimating={isAnimating}
          />
          <ControlPanel 
            position={position}
            onPositionChange={handlePositionChange}
          />
        </div>
      </main>

      <footer className="app-footer">
        <p>Platform: X (0-300mm) | Y (0-300mm) | Z (0-100mm)</p>
      </footer>
    </div>
  );
}

export default App;
