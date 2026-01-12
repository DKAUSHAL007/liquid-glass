import { useState } from 'react';
import './App.css';
import GooeyMenu from './GooeyGlass';
import FluidGlass from './FluidGlass';

function App() {
  const [menuOpen, setMenuOpen] = useState(false);

  const menuItems = [
    { icon: '🏠', label: 'Home' },
    { icon: '👤', label: 'About' },
    { icon: '✉️', label: 'Contact' },
  ];

  return (
    <div className="App">
      <FluidGlass />
      <GooeyMenu 
        active={menuOpen} 
        onToggle={() => setMenuOpen(!menuOpen)}
        menuItems={menuItems}
      />
    </div>
  );
}

export default App;
