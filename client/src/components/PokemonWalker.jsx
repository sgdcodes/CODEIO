import React, { useState, useEffect, useRef } from 'react';
import './PokemonWalker.css';

// Roster of Pokemons requested by user:
// pikachu, bulbosor (Bulbasaur), charizard, togepi, physkick (Psyduck), abra, meowth + more!
const INITIAL_POKEMONS = [
  {
    id: 'pikachu',
    name: 'Pikachu',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/pikachu.gif',
    cry: 'Pika-Pikachu! ⚡',
    height: 48,
    pos: 5,
    speed: 0.22,
    direction: 1, // 1 = right, -1 = left
  },
  {
    id: 'bulbasaur',
    name: 'Bulbasaur',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/bulbasaur.gif',
    cry: 'Bulba-saur! 🍃',
    height: 44,
    pos: 20,
    speed: 0.16,
    direction: 1,
  },
  {
    id: 'charizard',
    name: 'Charizard',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/charizard.gif',
    cry: 'ROAAAAR! 🔥',
    height: 68,
    pos: 35,
    speed: 0.19,
    direction: -1,
  },
  {
    id: 'togepi',
    name: 'Togepi',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/togepi.gif',
    cry: 'Chikki-prii! ✨',
    height: 38,
    pos: 50,
    speed: 0.14,
    direction: 1,
  },
  {
    id: 'psyduck',
    name: 'Psyduck',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/psyduck.gif',
    cry: 'Psy... duck?! 😵💫',
    height: 48,
    pos: 62,
    speed: 0.15,
    direction: -1,
  },
  {
    id: 'abra',
    name: 'Abra',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/abra.gif',
    cry: '*Teleports* 🔮',
    height: 48,
    pos: 75,
    speed: 0.18,
    direction: 1,
  },
  {
    id: 'meowth',
    name: 'Meowth',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/meowth.gif',
    cry: "That's right! Pay Day! 💰",
    height: 46,
    pos: 88,
    speed: 0.21,
    direction: -1,
  },
  {
    id: 'eevee',
    name: 'Eevee',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/eevee.gif',
    cry: 'Eev-vee! 💖',
    height: 42,
    pos: 12,
    speed: 0.20,
    direction: 1,
  },
  {
    id: 'squirtle',
    name: 'Squirtle',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/squirtle.gif',
    cry: 'Squirtle Squad! 🕶️',
    height: 44,
    pos: 42,
    speed: 0.17,
    direction: -1,
  },
  {
    id: 'snorlax',
    name: 'Snorlax',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/snorlax.gif',
    cry: 'Zzz... Snooor... 😴',
    height: 64,
    pos: 92,
    speed: 0.08,
    direction: 1,
  },
  {
    id: 'gengar',
    name: 'Gengar',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/gengar.gif',
    cry: 'Hehehehe! 👻',
    height: 52,
    pos: 28,
    speed: 0.24,
    direction: 1,
  },
  {
    id: 'jigglypuff',
    name: 'Jigglypuff',
    sprite: 'https://play.pokemonshowdown.com/sprites/ani/jigglypuff.gif',
    cry: 'Jiggly-puff-puff! 🎵',
    height: 42,
    pos: 80,
    speed: 0.15,
    direction: -1,
  },
];

export default function PokemonWalker({ paused = false }) {
  const [pokemons, setPokemons] = useState(INITIAL_POKEMONS);
  const [activeCry, setActiveCry] = useState({ id: null, text: '' });
  const [berries, setBerries] = useState([]);
  const [cheering, setCheering] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const cryTimeoutRef = useRef(null);

  // Smooth animation loop to walk Pokemon across stage
  useEffect(() => {
    if (isPaused || paused) return;

    const interval = setInterval(() => {
      setPokemons((prevList) =>
        prevList.map((p) => {
          let newPos = p.pos + p.speed * p.direction;
          let newDirection = p.direction;

          // Rebound when hitting stage borders (1% to 94%)
          if (newPos >= 94) {
            newPos = 94;
            newDirection = -1;
          } else if (newPos <= 1) {
            newPos = 1;
            newDirection = 1;
          }

          return {
            ...p,
            pos: newPos,
            direction: newDirection,
          };
        })
      );
    }, 40);

    return () => clearInterval(interval);
  }, [isPaused, paused]);

  // Click on a Pokemon to make it hop and speak
  const handlePokemonClick = (p) => {
    if (cryTimeoutRef.current) clearTimeout(cryTimeoutRef.current);

    setActiveCry({ id: p.id, text: p.cry });

    // Reverse direction on click playfully
    setPokemons((prev) =>
      prev.map((item) =>
        item.id === p.id ? { ...item, direction: item.direction * -1 } : item
      )
    );

    cryTimeoutRef.current = setTimeout(() => {
      setActiveCry({ id: null, text: '' });
    }, 2800);
  };

  // Throw berries across the track
  const handleThrowBerries = () => {
    const newBerries = [
      { id: Math.random(), pos: 15, emoji: '🍓' },
      { id: Math.random(), pos: 35, emoji: '🫐' },
      { id: Math.random(), pos: 55, emoji: '🍎' },
      { id: Math.random(), pos: 75, emoji: '🍉' },
    ];
    setBerries(newBerries);
    setCheering(true);
    setActiveCry({ id: 'all', text: 'Yaaay! Berries! 🎉' });

    setTimeout(() => {
      setCheering(false);
      setBerries([]);
      setActiveCry({ id: null, text: '' });
    }, 3000);
  };

  return (
    <div className="pokemon-walker-container fade-in">
      <div className="pokemon-track-card">
        {/* Track Header / Controls */}
        <div className="pokemon-track-header">
          <div className="pokemon-track-title">
            <svg
              className="pokeball-icon"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="50" cy="50" r="48" fill="#FFFFFF" stroke="#000000" strokeWidth="6" />
              <path
                d="M 2 50 A 48 48 0 0 1 98 50 Z"
                fill="#EF4444"
                stroke="#000000"
                strokeWidth="6"
              />
              <line x1="2" y1="50" x2="98" y2="50" stroke="#000000" strokeWidth="6" />
              <circle cx="50" cy="50" r="14" fill="#FFFFFF" stroke="#000000" strokeWidth="6" />
              <circle cx="50" cy="50" r="6" fill="#000000" />
            </svg>
            <span>
              PokéWalk Lane <span style={{ color: 'var(--text-subtle)', fontWeight: 400 }}>(Click any Pokémon!)</span>
            </span>
          </div>

          <div className="pokemon-track-actions">
            <button
              type="button"
              className="btn-mini"
              onClick={handleThrowBerries}
              title="Feed sweet berries to all Pokémon"
            >
              Feed Berries 🍓
            </button>
            <button
              type="button"
              className="btn-mini"
              onClick={() => setIsPaused((prev) => !prev)}
            >
              {isPaused ? 'Resume Walk ▶' : 'Pause ⏸'}
            </button>
          </div>
        </div>

        {/* The Walking Stage */}
        <div className="pokemon-stage">
          {/* Ground Glow */}
          <div className="pokemon-ground-glow" />

          {/* Dropped Berries */}
          {berries.map((b) => (
            <div key={b.id} className="berry-item" style={{ left: `${b.pos}%` }}>
              {b.emoji}
            </div>
          ))}

          {/* Pokémon Sprites */}
          {pokemons.map((p) => {
            const isSpeaking = activeCry.id === p.id || activeCry.id === 'all';
            // ScaleX(-1) flips sprite when walking left
            const facingTransform = p.direction === -1 ? 'scaleX(-1)' : 'scaleX(1)';

            return (
              <div
                key={p.id}
                className={`pokemon-walker ${cheering ? 'cheering' : ''}`}
                style={{
                  left: `${p.pos}%`,
                }}
                onClick={() => handlePokemonClick(p)}
                title={`${p.name} - Click me!`}
              >
                {/* Speech Cry Bubble */}
                {isSpeaking && (
                  <div className="pokemon-bubble">
                    {activeCry.id === 'all' ? 'Yum! 😋' : p.cry}
                  </div>
                )}

                {/* Animated Sprite */}
                <img
                  src={p.sprite}
                  alt={p.name}
                  className="pokemon-sprite"
                  style={{
                    height: `${p.height}px`,
                    transform: facingTransform,
                  }}
                  loading="lazy"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
