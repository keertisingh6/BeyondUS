import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Check,
  ChevronRight,
  Compass,
  HelpCircle,
  KeyRound,
  Lightbulb,
  LockKeyhole,
  Music,
  Pause,
  Play,
  RotateCcw,
  ScanLine,
  Shield,
  Star,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { sound } from './audio';
import PixelConfetti from './confetti';

type Pos = { x: number; y: number };
type Trap = Pos & { animal: '🐍' | '🦂' | '🐊' };
type Coin = Pos & { points: number };
type Level = {
  name: string;
  path: Pos[];
  keyStep: number;
  intro: string;
  difficulty: string;
  traps: Trap[];
  coins: Coin[];
};
type Mode = 'menu' | 'roadmap' | 'playing' | 'paused' | 'won' | 'dead' | 'how' | 'shortcuts';
type Direction = 'up' | 'down' | 'left' | 'right';

type LevelStats = {
  stars: number;
  bestMoves: number;
  bestTime: number;
  fewestMistakes: number;
};

const route = (coords: string): Pos[] =>
  coords.split(' ').map(value => {
    const [x, y] = value.split(',').map(Number);
    return { x, y };
  });

const levels: Level[] = [
  {
    name: 'The Forgotten Trail',
    intro: 'Trust one tile at a time. Beware the hidden serpents.',
    difficulty: 'BEGINNER',
    keyStep: 7,
    path: route('0,6 0,5 1,5 2,5 2,4 2,3 3,3 4,3 4,2 5,2 6,2 6,1 6,0'),
    traps: [
      { x: 1, y: 6, animal: '🐍' },
      { x: 3, y: 5, animal: '🐍' },
      { x: 5, y: 4, animal: '🐍' },
    ],
    coins: [
      { x: 2, y: 6, points: 10 },
      { x: 3, y: 5, points: 10 },
    ],
  },
  {
    name: 'Venomous Wilderness',
    intro: 'A winding jungle path crawling with scorpions and snakes.',
    difficulty: 'INTERMEDIATE',
    keyStep: 11,
    path: route('0,6 0,5 0,4 1,4 2,4 2,5 3,5 4,5 4,4 4,3 3,3 2,3 2,2 2,1 3,1 4,1 4,0 5,0 6,0'),
    traps: [
      { x: 1, y: 6, animal: '🐍' },
      { x: 1, y: 5, animal: '🦂' },
      { x: 3, y: 4, animal: '🐍' },
      { x: 5, y: 5, animal: '🦂' },
      { x: 5, y: 2, animal: '🐍' },
      { x: 1, y: 1, animal: '🦂' },
    ],
    coins: [
      { x: 1, y: 6, points: 10 },
      { x: 3, y: 4, points: 10 },
      { x: 5, y: 5, points: 10 },
      { x: 5, y: 4, points: 10 },
    ],
  },
  {
    name: 'The Deadly Maze',
    intro: 'The hidden trail twists through treacherous crocodile swamps.',
    difficulty: 'ADVANCED',
    keyStep: 10,
    path: route('0,6 0,5 1,5 2,5 2,4 1,4 1,3 1,2 2,2 3,2 3,3 4,3 4,2 4,1 3,1 2,1 2,0 3,0 4,0 5,0 6,0'),
    traps: [
      { x: 1, y: 6, animal: '🐍' },
      { x: 0, y: 4, animal: '🦂' },
      { x: 3, y: 5, animal: '🐊' },
      { x: 0, y: 3, animal: '🐍' },
      { x: 2, y: 3, animal: '🦂' },
      { x: 5, y: 3, animal: '🐊' },
      { x: 5, y: 1, animal: '🦂' },
      { x: 6, y: 1, animal: '🐊' },
    ],
    coins: [
      { x: 3, y: 5, points: 10 },
      { x: 0, y: 4, points: 10 },
      { x: 5, y: 3, points: 10 },
      { x: 5, y: 4, points: 10 },
      { x: 6, y: 3, points: 10 },
    ],
  },
];

const eq = (a: Pos, b: Pos) => a.x === b.x && a.y === b.y;
const id = (a: Pos) => a.y * 7 + a.x;
const dirs: Record<string, Pos> = {
  ArrowUp: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  W: { x: 0, y: -1 },
  k: { x: 0, y: -1 },
  K: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  S: { x: 0, y: 1 },
  j: { x: 0, y: 1 },
  J: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  A: { x: -1, y: 0 },
  h: { x: -1, y: 0 },
  H: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
  D: { x: 1, y: 0 },
  l: { x: 1, y: 0 },
  L: { x: 1, y: 0 },
};

// Validate level paths integrity
levels.forEach((item, i) => {
  const last = item.path[item.path.length - 1];
  if (item.path[0].x !== 0 || item.path[0].y !== 6 || last.x !== 6 || last.y !== 0) {
    throw new Error(`Level ${i + 1} must connect start to exit.`);
  }
  if (
    item.path.some(
      (cell, step) =>
        step > 0 &&
        Math.abs(cell.x - item.path[step - 1].x) + Math.abs(cell.y - item.path[step - 1].y) !== 1
    )
  ) {
    throw new Error(`Level ${i + 1} route contains a non-adjacent step.`);
  }
  if (
    item.keyStep <= 0 ||
    item.keyStep >= item.path.length - 1 ||
    item.traps.some(trap => item.path.some(cell => eq(cell, trap)))
  ) {
    throw new Error(`Level ${i + 1} has an invalid key or unsafe route.`);
  }
});

export default function App() {
  const [mode, setMode] = useState<Mode>('menu');
  const [idx, setIdx] = useState(0);
  const [pos, setPos] = useState<Pos>(levels[0].path[0]);
  const [facing, setFacing] = useState<Direction>('up');
  const [progress, setProgress] = useState(0);
  const [found, setFound] = useState<Set<number>>(new Set());
  const [scanned, setScanned] = useState<Set<number>>(new Set());
  const [attempts, setAttempts] = useState(0);
  const [moves, setMoves] = useState(0);
  const [started, setStarted] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState(false);
  const [shaking, setShaking] = useState(false);
  const [wrong, setWrong] = useState<Pos | null>(null);
  const [tutorial, setTutorial] = useState(false);
  const [keyCollected, setKeyCollected] = useState(false);
  const [revealUses, setRevealUses] = useState(2);
  const [lifeUses, setLifeUses] = useState(1);
  const [lifeArmed, setLifeArmed] = useState(false);
  const [scannerUses, setScannerUses] = useState(1);
  const [lifelinesUsed, setLifelinesUsed] = useState(0);
  const [scanning, setScanning] = useState(false);
  const [completed, setCompleted] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('pixel-quest-completed') || '[]');
    } catch {
      return [];
    }
  });
  const [levelStats, setLevelStats] = useState<Record<number, LevelStats>>(() => {
    try {
      return JSON.parse(localStorage.getItem('pixel-quest-stats') || '{}');
    } catch {
      return {};
    }
  });
  const [deathTrap, setDeathTrap] = useState<Trap | null>(null);
  const [deathPhase, setDeathPhase] = useState<'attack' | 'defeated'>('attack');
  const [score, setScore] = useState(() => Number(localStorage.getItem('pixel-quest-score') || 0));
  const [collectedCoins, setCollectedCoins] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem('pixel-quest-coins') || '[]'));
    } catch {
      return new Set();
    }
  });
  const [bonusEvent, setBonusEvent] = useState<{ tileId: number; points: number } | null>(null);
  const [feedback, setFeedback] = useState('');
  const [soundEnabled, setSoundEnabled] = useState(sound.soundEnabled);
  const [musicEnabled, setMusicEnabled] = useState(sound.musicEnabled);
  const [latestStars, setLatestStars] = useState(0);

  const scannerTimer = useRef<number | null>(null);
  const bonusTimer = useRef<number | null>(null);
  const deathTimer = useRef<number | null>(null);
  const collectedCoinsRef = useRef(collectedCoins);

  const level = levels[idx];
  const start = level.path[0];
  const exit = level.path[level.path.length - 1];
  const keyPos = level.path[level.keyStep];
  const tiles = Array.from({ length: 49 }, (_, i) => ({ x: i % 7, y: Math.floor(i / 7) }));
  const time = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;

  // Unlock web audio on initial user touch or key press
  useEffect(() => {
    const handleFirstTouch = () => {
      sound.unlockAudio();
      window.removeEventListener('pointerdown', handleFirstTouch);
      window.removeEventListener('keydown', handleFirstTouch);
    };
    window.addEventListener('pointerdown', handleFirstTouch);
    window.addEventListener('keydown', handleFirstTouch);
    return () => {
      window.removeEventListener('pointerdown', handleFirstTouch);
      window.removeEventListener('keydown', handleFirstTouch);
    };
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    sound.setSoundEnabled(next);
    setSoundEnabled(next);
  };

  const toggleMusic = () => {
    sound.unlockAudio();
    const next = !musicEnabled;
    sound.setMusicEnabled(next);
    setMusicEnabled(next);
  };

  const reset = (levelIndex = idx, begin = true) => {
    if (scannerTimer.current !== null) window.clearTimeout(scannerTimer.current);
    if (bonusTimer.current !== null) window.clearTimeout(bonusTimer.current);
    if (deathTimer.current !== null) window.clearTimeout(deathTimer.current);

    const selected = levels[levelIndex];
    setIdx(levelIndex);
    setPos(selected.path[0]);
    setFacing('up');
    setProgress(0);
    setFound(new Set([id(selected.path[0])]));
    setScanned(new Set());
    setAttempts(0);
    setMoves(0);
    setSeconds(0);
    setStarted(begin ? Date.now() : null);
    setError(false);
    setShaking(false);
    setWrong(null);
    setKeyCollected(false);
    setRevealUses(2);
    setLifeUses(1);
    setLifeArmed(false);
    setScannerUses(1);
    setLifelinesUsed(0);
    setScanning(false);
    setDeathTrap(null);
    setDeathPhase('attack');
    setFeedback('');
    setBonusEvent(null);
    setMode(begin ? 'playing' : 'menu');
    setTutorial(false);
  };

  const begin = () => {
    sound.playClick();
    setMode('roadmap');
  };

  const selectLevel = (levelIndex: number) => {
    if (levelIndex === 0 || completed.includes(levelIndex - 1)) {
      sound.playClick();
      reset(levelIndex);
      setTutorial(true);
    }
  };

  // Game timer
  useEffect(() => {
    if (mode !== 'playing' || started === null) return;
    const timer = window.setInterval(() => {
      setSeconds(Math.floor((Date.now() - started) / 1000));
    }, 250);
    return () => window.clearInterval(timer);
  }, [mode, started]);

  // Movement handler
  const step = useCallback(
    (direction: Pos) => {
      if (mode !== 'playing' || tutorial) return;

      // Update character facing direction
      if (direction.x > 0) setFacing('right');
      else if (direction.x < 0) setFacing('left');
      else if (direction.y > 0) setFacing('down');
      else if (direction.y < 0) setFacing('up');

      const next = { x: pos.x + direction.x, y: pos.y + direction.y };
      if (next.x < 0 || next.y < 0 || next.x >= 7 || next.y >= 7) return;

      setMoves(value => value + 1);
      const routeIndex = level.path.findIndex(cell => eq(cell, next));
      const trap = level.traps.find(cell => eq(cell, next));
      const coin = level.coins.find(cell => eq(cell, next));
      const coinKey = `${idx}:${id(next)}`;

      // 1. Check for bonus coin
      if (coin && !collectedCoinsRef.current.has(coinKey)) {
        sound.playCoin();
        const updated = new Set(collectedCoinsRef.current);
        updated.add(coinKey);
        collectedCoinsRef.current = updated;
        setCollectedCoins(updated);
        setScore(value => value + coin.points);
        setBonusEvent({ tileId: id(next), points: coin.points });
        if (bonusTimer.current !== null) window.clearTimeout(bonusTimer.current);
        bonusTimer.current = window.setTimeout(() => {
          setBonusEvent(null);
          bonusTimer.current = null;
        }, 1100);
      }

      // 2. Check for deadly animal trap
      if (trap) {
        sound.playTrap(trap.animal);
        setAttempts(value => value + 1);
        setWrong(next);
        setDeathTrap(trap);
        setDeathPhase('attack');
        setPos(next);
        setShaking(true);
        window.setTimeout(() => setShaking(false), 450);
        setMode('dead');
        deathTimer.current = window.setTimeout(() => setDeathPhase('defeated'), 520);
        return;
      }

      // 3. Check for correct next step in route
      if (routeIndex === progress + 1 && !(routeIndex === level.path.length - 1 && !keyCollected)) {
        setPos(next);
        setProgress(routeIndex);
        setFound(old => new Set(old).add(id(next)));

        // Key pickup event
        if (routeIndex === level.keyStep) {
          sound.playKey();
          setKeyCollected(true);
          setFeedback('Golden key acquired! The exit portal is unlocked.');
          window.setTimeout(() => sound.playPortalUnlock(), 350);
          window.setTimeout(() => setFeedback(''), 2500);
        } else {
          sound.playSafeStep(routeIndex);
        }

        // Win event
        if (routeIndex === level.path.length - 1 && keyCollected) {
          sound.playWin();
          // Calculate stars based on mistakes
          const starsEarned = attempts === 0 ? 3 : attempts <= 2 ? 2 : 1;
          setLatestStars(starsEarned);

          // Update persistent stats
          setLevelStats(prev => {
            const current = prev[idx];
            const updated: LevelStats = {
              stars: Math.max(current?.stars || 0, starsEarned),
              bestMoves: current ? Math.min(current.bestMoves, moves + 1) : moves + 1,
              bestTime: current ? Math.min(current.bestTime, seconds) : seconds,
              fewestMistakes: current ? Math.min(current.fewestMistakes, attempts) : attempts,
            };
            const nextMap = { ...prev, [idx]: updated };
            try {
              localStorage.setItem('pixel-quest-stats', JSON.stringify(nextMap));
            } catch {}
            return nextMap;
          });

          setMode('won');
        }
        return;
      }

      // 4. Check for safe backtracking on already discovered steps
      if (routeIndex >= 0 && routeIndex <= progress) {
        sound.playStep();
        setPos(next);
        setProgress(routeIndex);
        return;
      }

      // 5. Wrong guess / mistake
      setAttempts(value => value + 1);
      setWrong(next);
      setError(true);
      setShaking(true);
      window.setTimeout(() => setShaking(false), 380);

      if (routeIndex === level.path.length - 1 && !keyCollected) {
        sound.playWrong();
        setFeedback('The portal is locked! Find the golden key first.');
        window.setTimeout(() => setFeedback(''), 2400);
      }

      // If protected by armed extra life
      if (lifeArmed && lifeUses > 0) {
        sound.playShieldDeflect();
        setFeedback('Extra life protected you from returning to start!');
        window.setTimeout(() => setFeedback(''), 2000);
        setLifeUses(value => value - 1);
        setLifeArmed(false);
        setLifelinesUsed(value => value + 1);
      } else {
        sound.playWrong();
        setPos(start);
        setProgress(0);
      }

      window.setTimeout(() => {
        setError(false);
        setWrong(null);
      }, 350);
    },
    [
      mode,
      tutorial,
      pos,
      level,
      progress,
      start,
      keyCollected,
      lifeUses,
      lifeArmed,
      idx,
      attempts,
      moves,
      seconds,
    ]
  );

  // Keyboard navigation & hotkeys
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      // Sound unlock on first interaction
      sound.unlockAudio();

      const direction = dirs[event.key];
      if (direction && mode === 'playing') {
        event.preventDefault();
        step(direction);
        return;
      }

      // Lifeline hotkeys
      if (mode === 'playing' && !tutorial) {
        if (event.key === '1') {
          event.preventDefault();
          reveal();
          return;
        }
        if (event.key === '2') {
          event.preventDefault();
          armExtraLife();
          return;
        }
        if (event.key === '3') {
          event.preventDefault();
          scan();
          return;
        }
      }

      // General utility hotkeys
      if (event.key === 'm' || event.key === 'M') {
        event.preventDefault();
        toggleSound();
        return;
      }
      if (event.key === 'b' || event.key === 'B') {
        event.preventDefault();
        toggleMusic();
        return;
      }
      if (event.key === 'r' || event.key === 'R') {
        if (mode === 'playing' || mode === 'dead') {
          event.preventDefault();
          reset(idx);
          return;
        }
      }
      if (event.key === 'Escape') {
        if (mode === 'playing') {
          sound.playPause();
          setMode('paused');
        } else if (mode === 'paused') {
          sound.playClick();
          setMode('playing');
        }
      }
    };

    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mode, step, tutorial, idx, soundEnabled, musicEnabled]);

  // Lifeline: Reveal next tile
  const reveal = () => {
    if (mode !== 'playing' || tutorial || revealUses <= 0 || progress >= level.path.length - 1) return;
    sound.playReveal();
    const next = level.path[progress + 1];
    setFound(old => new Set(old).add(id(next)));
    setRevealUses(value => value - 1);
    setLifelinesUsed(value => value + 1);
    setFeedback('Safe path tile illuminated!');
    window.setTimeout(() => setFeedback(''), 1800);
  };

  // Lifeline: Arm extra life shield
  const armExtraLife = () => {
    if (mode === 'playing' && !tutorial && lifeUses > 0 && !lifeArmed) {
      sound.playShieldArm();
      setLifeArmed(true);
      setFeedback('Energy shield active! Your next mistake is forgiven.');
      window.setTimeout(() => setFeedback(''), 2200);
    }
  };

  // Lifeline: Scanner
  const scan = () => {
    if (mode !== 'playing' || tutorial || scannerUses <= 0 || scanning) return;
    sound.playScan();
    setScanned(new Set(level.path.slice(progress + 1, progress + 4).map(id)));
    setScanning(true);
    setScannerUses(value => value - 1);
    setLifelinesUsed(value => value + 1);
    setFeedback('Radar scanner active for 2 seconds!');
    scannerTimer.current = window.setTimeout(() => {
      setScanned(new Set());
      setScanning(false);
      scannerTimer.current = null;
      setFeedback('');
    }, 2000);
  };

  const nextLevel = () => {
    sound.playClick();
    if (idx < levels.length - 1) {
      selectLevel(idx + 1);
    } else {
      setMode('roadmap');
    }
  };

  // Save completed levels, score, coins
  useEffect(() => {
    if (mode === 'won') {
      setCompleted(old => {
        const value = old.includes(idx) ? old : [...old, idx].sort();
        try {
          localStorage.setItem('pixel-quest-completed', JSON.stringify(value));
        } catch {}
        return value;
      });
    }
  }, [mode, idx]);

  useEffect(() => {
    try {
      localStorage.setItem('pixel-quest-score', String(score));
    } catch {}
  }, [score]);

  useEffect(() => {
    try {
      localStorage.setItem('pixel-quest-coins', JSON.stringify([...collectedCoins]));
    } catch {}
  }, [collectedCoins]);

  // Click adjacent tile to move directly
  const handleTileClick = (tile: Pos) => {
    if (mode !== 'playing' || tutorial) return;
    const dx = tile.x - pos.x;
    const dy = tile.y - pos.y;
    // Check if tile is adjacent
    if (Math.abs(dx) + Math.abs(dy) === 1) {
      step({ x: dx, y: dy });
    }
  };

  // Total stars collected across all levels
  const totalStars = Object.values(levelStats).reduce((acc, curr) => acc + (curr.stars || 0), 0);

  // Player sprite art with directional eyes & shield aura
  const playerArt = (
    <div className={`explorer-container ${lifeArmed ? 'shield-active' : ''}`}>
      {lifeArmed && <div className="shield-ring" />}
      <span className={`explorer facing-${facing}`}>
        <i />
        <b />
        <em />
      </span>
    </div>
  );

  // Render board grid
  const renderBoard = (preview = false) => (
    <div
      className={`board ${error && !preview ? 'board-error' : ''} ${shaking && !preview ? 'board-shake' : ''} ${
        preview ? 'preview-grid' : ''
      }`}
    >
      {tiles.map((tile, i) => {
        const tileId = id(tile);
        const isPlayer = eq(pos, tile);
        const isExit = eq(exit, tile);
        const isStart = eq(start, tile);
        const isKey = eq(keyPos, tile) && !keyCollected;
        const isFound = found.has(tileId);
        const isScanned = scanned.has(tileId);
        const isWrong = !preview && wrong !== null && eq(wrong, tile);
        const revealedTrap = mode === 'dead' && deathTrap && eq(deathTrap, tile);
        const bonusHere = bonusEvent?.tileId === tileId;

        // Is this tile adjacent and clickable?
        const isAdjacent =
          !preview &&
          mode === 'playing' &&
          !tutorial &&
          Math.abs(tile.x - pos.x) + Math.abs(tile.y - pos.y) === 1;

        return (
          <div
            key={i}
            onClick={() => isAdjacent && handleTileClick(tile)}
            title={isAdjacent ? 'Click to move here' : undefined}
            className={`cell ${isPlayer ? 'player-cell' : ''} ${isExit ? 'exit-cell' : ''} ${
              isFound ? 'discovered' : ''
            } ${isScanned ? 'scanned' : ''} ${isWrong ? 'error-flash' : ''} ${
              isAdjacent ? 'adjacent-target' : ''
            }`}
          >
            {bonusHere && (
              <span className="bonus-pop">+{bonusEvent?.points} BONUS POINTS</span>
            )}
            {revealedTrap ? (
              <span
                className={`trap-art ${deathPhase}`}
                aria-label={deathPhase === 'defeated' ? 'Defeated animal trap' : 'Animal trap'}
              >
                {deathTrap?.animal}
                {deathPhase === 'defeated' && <i>✖</i>}
              </span>
            ) : (
              isPlayer && playerArt
            )}
            {isStart && !isPlayer && <span className="start-mark" title="Starting Tile" />}
            {isKey && <KeyRound className="key-icon pulse-glow" />}
            {isExit && (
              <span
                className={`portal ${keyCollected ? 'active' : 'locked'}`}
                title={keyCollected ? 'Portal Unlocked!' : 'Locked: Requires Golden Key'}
              >
                {keyCollected ? '✦' : <LockKeyhole size={16} />}
              </span>
            )}
            {/* Trail stepping-stone marker for discovered path */}
            {isFound && !isPlayer && !isExit && !isKey && <span className="path-stone" />}
          </div>
        );
      })}
    </div>
  );

  return (
    <main className="shell">
      {mode === 'won' && <PixelConfetti />}
      <div className="noise" />

      {/* Top Arcade Navigation & Sound Bar */}
      <header className="top">
        <button
          className="brand"
          onClick={() => {
            sound.playClick();
            setMode('menu');
          }}
          aria-label="Return to Pixel Quest menu"
        >
          <span className="brand-mark">PQ</span>
          <span>
            PIXEL QUEST<small>8-BIT PUZZLE ENGINE</small>
          </span>
        </button>

        {mode !== 'menu' && mode !== 'how' && mode !== 'roadmap' && mode !== 'shortcuts' && (
          <div className="level-title">
            <span>LEVEL {String(idx + 1).padStart(2, '0')}</span>
            <b>{level.name}</b>
            <i>MOVES {String(moves).padStart(2, '0')}</i>
            <i>MISTAKES {String(attempts).padStart(2, '0')}</i>
          </div>
        )}

        <div className="top-actions">
          {/* Sound FX Toggle */}
          <button
            className={`icon-button sound-button ${!soundEnabled ? 'muted' : ''}`}
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Sound FX (M)' : 'Unmute Sound FX (M)'}
            aria-label="Toggle Sound Effects"
          >
            {soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>

          {/* Chiptune BGM Toggle */}
          <button
            className={`icon-button music-button ${musicEnabled ? 'active-music' : ''}`}
            onClick={toggleMusic}
            title={musicEnabled ? 'Turn Off Chiptune Music (B)' : 'Turn On Chiptune Music (B)'}
            aria-label="Toggle Background Music"
          >
            <Music size={17} />
          </button>

          {/* Pause Button during game */}
          {mode !== 'menu' && mode !== 'how' && mode !== 'roadmap' && mode !== 'shortcuts' && (
            <button
              className="icon-button"
              onClick={() => {
                sound.playPause();
                setMode(mode === 'paused' ? 'playing' : 'paused');
              }}
              title="Pause Game (Esc)"
              aria-label="Pause"
            >
              <Pause size={17} />
            </button>
          )}
        </div>
      </header>

      {/* Title / Start Screen */}
      {mode === 'menu' ? (
        <section className="start-screen">
          <div className="start-copy">
            <div className="eyebrow">
              <span className="pulse" /> HIDDEN PATH // 7 × 7 EXPEDITION
            </div>
            <h1>PIXEL QUEST</h1>
            <div className="subtitle">AUTHENTIC 8-BIT PUZZLE ENGINE</div>
            <p className="tagline">
              Find the hidden trail. Avoid deadly traps.
              <br />
              Grab the golden key & escape the maze.
            </p>

            <div className="hero-stats">
              <div className="stat-pill">
                <Star size={13} fill="#ffd21f" color="#ffd21f" />
                <span>
                  STARS: <b>{totalStars} / 9</b>
                </span>
              </div>
              <div className="stat-pill">
                <Trophy size={13} color="#5b9b91" />
                <span>
                  SCORE: <b>{score} PTS</b>
                </span>
              </div>
            </div>

            <div className="hero-actions">
              <button className="primary" onClick={begin}>
                <Play size={17} fill="currentColor" />
                {completed.length ? 'CONTINUE ADVENTURE' : 'START EXPEDITION'}
                <ChevronRight size={17} />
              </button>
              <div className="secondary-group">
                <button
                  className="secondary"
                  onClick={() => {
                    sound.playClick();
                    setMode('how');
                  }}
                >
                  <HelpCircle size={15} /> HOW TO PLAY
                </button>
                <button
                  className="secondary"
                  onClick={() => {
                    sound.playClick();
                    setMode('shortcuts');
                  }}
                >
                  <Compass size={15} /> CONTROLS
                </button>
              </div>
            </div>
          </div>

          <div className="start-board">
            <div className="preview-label">
              <span>LEVEL 01 // THE FORGOTTEN TRAIL</span>
              <span className="online">● READY</span>
            </div>
            {renderBoard(true)}
            <div className="preview-caption">
              <span>
                <i className="legend-cyan" /> START
              </span>
              <span>
                <i className="legend-gold" /> KEY SIGNAL
              </span>
              <span>
                <i className="legend-green" /> PORTAL
              </span>
            </div>
          </div>
        </section>
      ) : mode === 'roadmap' ? (
        /* Level Roadmap Screen */
        <section className="roadmap-screen">
          <div className="roadmap-heading">
            <div className="eyebrow">
              <span className="pulse" /> EXPEDITION ROADMAP // 3 TIERS
            </div>
            <h1>THE ROAD AHEAD</h1>
            <p>Select an unlocked maze tier to venture forth.</p>
            <div className="adventure-summary-strip">
              <span>
                TOTAL STARS: <b>{totalStars} / 9 ★</b>
              </span>
              <span>
                TOTAL SCORE: <b>{score} PTS</b>
              </span>
            </div>
          </div>

          <div className="roadmap-path">
            {levels.map((item, i) => {
              const done = completed.includes(i);
              const unlocked = i === 0 || completed.includes(i - 1);
              const current = unlocked && !done;
              const stats = levelStats[i];
              const stars = stats?.stars || 0;

              return (
                <button
                  key={item.name}
                  className={`roadmap-node ${done ? 'completed' : ''} ${current ? 'current' : ''} ${
                    !unlocked ? 'locked' : ''
                  }`}
                  disabled={!unlocked}
                  onClick={() => selectLevel(i)}
                >
                  <span className="node-marker">
                    {done ? <Check size={20} /> : !unlocked ? <LockKeyhole size={18} /> : <b>0{i + 1}</b>}
                  </span>
                  <span className="node-copy">
                    <div className="node-header-row">
                      <small>
                        LEVEL 0{i + 1} · {item.difficulty}
                      </small>
                      {done && (
                        <div className="node-stars">
                          {[1, 2, 3].map(s => (
                            <Star
                              key={s}
                              size={12}
                              fill={s <= stars ? '#ffd21f' : 'transparent'}
                              color={s <= stars ? '#ffd21f' : '#67759a'}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                    <strong>{item.name}</strong>
                    <em>
                      {done
                        ? `✓ COMPLETED · Best: ${stats?.bestMoves ?? '-'} moves (${String(
                            Math.floor((stats?.bestTime || 0) / 60)
                          ).padStart(2, '0')}:${String((stats?.bestTime || 0) % 60).padStart(2, '0')})`
                        : current
                        ? 'READY TO EXPLORE'
                        : 'LOCKED // CLEAR PREVIOUS LEVEL'}
                    </em>
                  </span>
                  <span className="node-art">{['✦', '♧', '⌘'][i]}</span>
                </button>
              );
            })}
          </div>

          <button
            className="secondary"
            onClick={() => {
              sound.playClick();
              setMode('menu');
            }}
          >
            BACK TO TITLE
          </button>
        </section>
      ) : (
        /* Active Game Screen */
        <section className="game-layout">
          {/* Mission & Rules Panel */}
          <aside className="panel mission">
            <div className="section-label">
              01 <span>YOUR EXPEDITION</span>
            </div>
            <h2>
              Find the
              <br />
              hidden path.
            </h2>
            <div className="goal">
              <div className="goal-icon">
                <KeyRound size={17} />
              </div>
              <div>
                <strong>THE OBJECTIVE</strong>
                <p>
                  Discover the hidden path,
                  <br />
                  collect the golden key,
                  <br />
                  and escape via the portal.
                </p>
              </div>
            </div>
            <div className="rule">
              <span className="rule-symbol">⌁</span>
              <div>
                <strong>THE RULE</strong>
                <p>
                  Wrong guesses send you back
                  <br />
                  to start. Traps are lethal!
                </p>
              </div>
            </div>
          </aside>

          {/* Central Maze Board */}
          <section className="board-section">
            <div className="board-instruction" role="status">
              {feedback || 'Step carefully. Click adjacent tiles or use Arrow keys / WASD.'}
            </div>

            <div className="board-meta">
              <span>
                <i className="pulse" /> MAZE ACTIVE
              </span>
              <span>
                STEP {progress + 1} / {level.path.length} <i className="sep" /> 7 × 7 GRID
              </span>
            </div>

            <div className="board-frame">
              <div className="board-glow" />
              {renderBoard()}
            </div>

            <div className="board-foot">
              <span>
                <i className="floor-dot" /> UNEXPLORED
              </span>
              <span>
                <i className="discovered-dot" /> DISCOVERED
              </span>
              <span>
                <i className="exit-dot" /> PORTAL
              </span>
            </div>

            {/* Mobile / Touch Responsive Controls */}
            <div className="mobile-controls">
              <button
                aria-label="Move left"
                onClick={() => {
                  sound.unlockAudio();
                  step(dirs.ArrowLeft);
                }}
              >
                <ArrowLeft />
              </button>
              <div>
                <button
                  aria-label="Move up"
                  onClick={() => {
                    sound.unlockAudio();
                    step(dirs.ArrowUp);
                  }}
                >
                  <ArrowUp />
                </button>
                <button
                  aria-label="Move down"
                  onClick={() => {
                    sound.unlockAudio();
                    step(dirs.ArrowDown);
                  }}
                >
                  <ArrowDown />
                </button>
              </div>
              <button
                aria-label="Move right"
                onClick={() => {
                  sound.unlockAudio();
                  step(dirs.ArrowRight);
                }}
              >
                <ArrowRight />
              </button>
            </div>
          </section>

          {/* Status & Lifelines Panel */}
          <aside className="panel status">
            <div className="section-label">
              02 <span>FIELD STATUS</span>
            </div>

            <div className="status-strip">
              <span>
                MOVES <b>{String(moves).padStart(2, '0')}</b>
              </span>
              <span>
                MISTAKES <b>{String(attempts).padStart(2, '0')}</b>
              </span>
              <span>
                TIME <b>{time}</b>
              </span>
              <span className={bonusEvent ? 'score-bump' : ''}>
                SCORE <b>{String(score).padStart(3, '0')}</b>
              </span>
            </div>

            <div className="key-status">
              <span>KEY ITEM</span>
              <b className={keyCollected ? 'collected' : ''}>
                {keyCollected ? (
                  <>
                    <Check size={14} /> ACQUIRED
                  </>
                ) : (
                  'LOCKED'
                )}
              </b>
            </div>

            <div className="key-mini">
              <KeyRound />
              <span>{keyCollected ? 'Portal active & awaiting arrival' : 'Key detected along route'}</span>
              <i className={keyCollected ? 'signal-on' : ''} />
            </div>

            <div className="lifelines-title">
              LIFELINES <small>{lifelinesUsed} USED</small>
            </div>

            <div className="lifelines">
              <button
                className="lifeline"
                onClick={reveal}
                disabled={revealUses === 0 || progress >= level.path.length - 1 || mode !== 'playing'}
                title="Shortcut key: [1]"
              >
                <Lightbulb />
                <span>
                  REVEAL <kbd>[1]</kbd>
                  <small>Next safe step</small>
                </span>
                <b>×{revealUses}</b>
              </button>

              <button
                className={`lifeline ${lifeArmed ? 'armed' : ''}`}
                onClick={armExtraLife}
                disabled={lifeUses === 0 || lifeArmed || mode !== 'playing'}
                title="Shortcut key: [2]"
              >
                <Shield />
                <span>
                  EXTRA LIFE <kbd>[2]</kbd>
                  <small>{lifeArmed ? 'Shield armed!' : 'Absorb 1 mistake'}</small>
                </span>
                <b>×{lifeUses}</b>
              </button>

              <button
                className="lifeline"
                onClick={scan}
                disabled={scannerUses === 0 || scanning || mode !== 'playing'}
                title="Shortcut key: [3]"
              >
                <ScanLine />
                <span>
                  SCANNER <kbd>[3]</kbd>
                  <small>{scanning ? 'Scanning 2s...' : 'Radar ping 3 tiles'}</small>
                </span>
                <b>×{scannerUses}</b>
              </button>
            </div>

            <div className="actions">
              <button
                className="secondary full"
                onClick={() => {
                  sound.playClick();
                  reset(idx);
                }}
                title="Hotkey: [R]"
              >
                <RotateCcw size={15} /> RESTART LEVEL <kbd>[R]</kbd>
              </button>
            </div>

            <div className="status-bottom">
              <span>ESC</span> TO PAUSE &nbsp;|&nbsp; <span>M</span> AUDIO &nbsp;|&nbsp; <span>CLICK</span> TO MOVE
            </div>
          </aside>
        </section>
      )}

      {/* Tutorial Overlay */}
      {tutorial && mode === 'playing' && (
        <Overlay
          title="Find the hidden path."
          text="Every move is a guess. Safe tiles turn teal when discovered. Click adjacent tiles or use Arrow keys / WASD. Watch for deadly animal traps, grab the golden key, and unlock the portal to escape!"
          primary="I'M READY"
          onPrimary={() => {
            sound.playClick();
            setTutorial(false);
          }}
          secondary="HOW TO PLAY"
          onSecondary={() => {
            sound.playClick();
            setTutorial(false);
            setMode('how');
          }}
        />
      )}

      {/* Pause Overlay */}
      {mode === 'paused' && (
        <Overlay
          title="EXPEDITION PAUSED"
          text="Take a breath. The maze will wait. Your discoveries remain right where you left them."
          primary="RESUME EXPEDITION"
          onPrimary={() => {
            sound.playClick();
            setMode('playing');
          }}
          secondary="RESTART LEVEL"
          onSecondary={() => {
            sound.playClick();
            reset(idx);
          }}
        />
      )}

      {/* Level Complete / Won Overlay with Stars */}
      {mode === 'won' && (
        <div className="overlay">
          <div className="dialog victory-dialog">
            <button
              className="close"
              onClick={() => {
                sound.playClick();
                setMode('roadmap');
              }}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="badge">✦ EXPEDITION COMPLETE ✦</div>
            <div className="dialog-icon">🏆</div>

            <div className="victory-stars">
              {[1, 2, 3].map(starNum => (
                <span
                  key={starNum}
                  className={`victory-star ${starNum <= latestStars ? 'active-star' : 'empty-star'}`}
                >
                  <Star size={28} fill={starNum <= latestStars ? '#ffd21f' : 'transparent'} />
                </span>
              ))}
            </div>

            <div className="eyebrow">
              {latestStars === 3
                ? '★★★ FLAWLESS RUN! ZERO MISTAKES'
                : latestStars === 2
                ? '★★☆ EXPERT PATHFINDER'
                : '★☆☆ MAZE CONQUERED'}
            </div>

            <h2>{idx === 2 ? 'ALL LABYRINTHS CONQUERED!' : 'LEVEL COMPLETED!'}</h2>

            <div className="win-stats-grid">
              <div className="win-stat-box">
                <small>MOVES</small>
                <b>{moves}</b>
              </div>
              <div className="win-stat-box">
                <small>MISTAKES</small>
                <b>{attempts}</b>
              </div>
              <div className="win-stat-box">
                <small>TIME</small>
                <b>{time}</b>
              </div>
              <div className="win-stat-box">
                <small>SCORE</small>
                <b>+{score} PTS</b>
              </div>
            </div>

            <button className="primary" onClick={nextLevel}>
              {idx === 2 ? 'VIEW ROADMAP' : 'NEXT EXPEDITION'}
              <ChevronRight />
            </button>
            <button
              className="secondary replay"
              onClick={() => {
                sound.playClick();
                reset(idx);
              }}
            >
              <RotateCcw size={15} /> REPLAY FOR 3 STARS
            </button>
          </div>
        </div>
      )}

      {/* Dead / Trap Hit Overlay */}
      {mode === 'dead' && deathPhase === 'defeated' && (
        <Overlay
          title="THE WILDERNESS CLAIMS YOU."
          text={`You fell into the territory of ${
            deathTrap?.animal === '🐊'
              ? 'a savage crocodile'
              : deathTrap?.animal === '🦂'
              ? 'a venomous scorpion'
              : 'a deadly pit viper'
          }. Your expedition ends here.`}
          primary="RETRY EXPEDITION"
          onPrimary={() => {
            sound.playClick();
            reset(idx);
          }}
          secondary="ROADMAP"
          onSecondary={() => {
            sound.playClick();
            setMode('roadmap');
          }}
          badge="✦ FATAL ENCOUNTER ✦"
        />
      )}

      {/* How to Play Overlay */}
      {mode === 'how' && (
        <div className="overlay">
          <div className="dialog how-dialog">
            <button
              className="close"
              onClick={() => {
                sound.playClick();
                setMode('menu');
              }}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">EXPEDITION GUIDEBOOK</div>
            <h2>HOW TO PLAY</h2>

            <div className="guide-items">
              <div className="guide-item">
                <div className="guide-icon teal">■</div>
                <div>
                  <strong>HIDDEN TRAIL</strong>
                  <p>
                    Every step into unexplored fog is a guess. If safe, it turns teal. If wrong, you are sent back to the start!
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-icon gold">
                  <KeyRound size={16} />
                </div>
                <div>
                  <strong>GOLDEN KEY & PORTAL</strong>
                  <p>
                    You cannot exit through the portal without the golden key. Locate the key tile first to unlock passage!
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-icon red">🐍</div>
                <div>
                  <strong>DEADLY ANIMAL TRAPS</strong>
                  <p>
                    Hidden snakes, scorpions, and crocodiles lurk off the safe path. Stepping into a trap ends your expedition instantly!
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <div className="guide-icon yellow">
                  <Star size={16} />
                </div>
                <div>
                  <strong>LIFELINES & RATINGS</strong>
                  <p>
                    Use [1] Reveal, [2] Extra Life shield, and [3] Radar Scanner. Clear the maze with zero mistakes to earn ★★★ 3 Stars!
                  </p>
                </div>
              </div>
            </div>

            <button
              className="primary"
              onClick={() => {
                sound.playClick();
                setMode('menu');
              }}
            >
              GOT IT, LET'S PLAY!
            </button>
          </div>
        </div>
      )}

      {/* Keyboard Shortcuts Overlay */}
      {mode === 'shortcuts' && (
        <div className="overlay">
          <div className="dialog how-dialog">
            <button
              className="close"
              onClick={() => {
                sound.playClick();
                setMode('menu');
              }}
              aria-label="Close"
            >
              <X />
            </button>
            <div className="eyebrow">TACTILE CONTROLS</div>
            <h2>SHORTCUTS & COMMANDS</h2>

            <div className="shortcuts-table">
              <div className="shortcut-row">
                <span>Move Explorer</span>
                <div className="shortcut-keys">
                  <kbd>▲</kbd> <kbd>◀</kbd> <kbd>▼</kbd> <kbd>▶</kbd> or <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> or <kbd>CLICK</kbd>
                </div>
              </div>
              <div className="shortcut-row">
                <span>Reveal Safe Tile</span>
                <kbd>[1]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Arm Shield</span>
                <kbd>[2]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Radar Scanner</span>
                <kbd>[3]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Toggle Sound Effects</span>
                <kbd>[M]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Toggle Chiptune Music</span>
                <kbd>[B]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Restart Current Level</span>
                <kbd>[R]</kbd>
              </div>
              <div className="shortcut-row">
                <span>Pause / Resume</span>
                <kbd>[Esc]</kbd>
              </div>
            </div>

            <button
              className="primary"
              onClick={() => {
                sound.playClick();
                setMode('menu');
              }}
            >
              BACK TO TITLE
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

function Overlay({
  title,
  text,
  primary,
  onPrimary,
  secondary,
  onSecondary,
  badge,
}: {
  title: string;
  text: string;
  primary: string;
  onPrimary: () => void;
  secondary: string;
  onSecondary: () => void;
  badge?: string;
}) {
  return (
    <div className="overlay">
      <div className="dialog">
        <button className="close" onClick={onSecondary} aria-label="Close">
          <X />
        </button>
        {badge && <div className="badge">{badge}</div>}
        <div className="dialog-icon">✦</div>
        <div className="eyebrow">PIXEL QUEST // 8-BIT PUZZLE ENGINE</div>
        <h2>{title}</h2>
        <p>{text}</p>
        <button className="primary" onClick={onPrimary}>
          {primary}
          <ChevronRight />
        </button>
        <button className="secondary replay" onClick={onSecondary}>
          <RotateCcw size={15} />
          {secondary}
        </button>
      </div>
    </div>
  );
}
