import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './App.css';

const ROW_METADATA = [
  {
    id: 'outer',
    title: 'Hilera exterior',
    description: 'Z  X  C  V  B  N  M  ,  .  -',
    accent: 'outer',
    keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-'],
  },
  {
    id: 'middle',
    title: 'Hilera media',
    description: 'A  S  D  F  G  H  J  K  L  Ñ  {',
    accent: 'middle',
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '{'],
  },
  {
    id: 'inner',
    title: 'Hilera interior',
    description: 'W  E  R  T  Y  U  I  O  P  ´',
    accent: 'inner',
    keys: ['w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '´'],
  },
];

const formatDisplayKey = (keyValue) => {
  if (keyValue === 'ñ') return 'Ñ';
  if (keyValue === '´') return '´';
  if (keyValue.length === 1 && keyValue.match(/[a-z]/)) return keyValue.toUpperCase();
  return keyValue;
};

const CHORD_LIBRARY = {
  DM: ['D4', 'F#4', 'A4'],
  D: ['D3', 'A3', 'D4'],
  GM: ['G4', 'B4', 'D5'],
  G: ['G3', 'D4', 'G4'],
  CM: ['C4', 'E4', 'G4'],
  C: ['C3', 'G3', 'C4'],
  Am: ['A3', 'C4', 'E4'],
  A: ['A3', 'E4', 'A4'],
  Dm: ['D4', 'F4', 'A4'],
  EM: ['E4', 'G#4', 'B4'],
  E: ['E3', 'B3', 'E4'],
  AM: ['A4', 'C#5', 'E5'],
  F: ['F3', 'C4', 'F4'],
  Bb: ['Bb3', 'D4', 'F4'],
  Eb: ['Eb4', 'G4', 'Bb4'],
  Ab: ['Ab3', 'C4', 'Eb4'],
  Db: ['Db4', 'F4', 'Ab4'],
};

const BASS_KEY_SEQUENCE = ['f5', 'f6', 'f7', 'f8', '7', '8', '9', '0'];

const BASS_KEY_LABELS = {
  f5: 'F5',
  f6: 'F6',
  f7: 'F7',
  f8: 'F8',
  '7': '7',
  '8': '8',
  '9': '9',
  '0': '0',
};

const TONALITY_CONFIGS = {
  GCF: {
    label: 'Tonalidad GCF (Sol-Do-Fa)',
    rowTitles: { outer: 'Sol', middle: 'Do', inner: 'Fa' },
    rows: {
      outer: {
        close: ['C#4', 'G3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5', 'B5', 'D6'],
        open: ['Eb4', 'A3', 'C4', 'E4', 'F#4', 'A4', 'C5', 'E5', 'F#5', 'A5'],
      },
      middle: {
        close: ['F#3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6'],
        open: ['G#3', 'B3', 'D4', 'F4', 'A4', 'B4', 'D5', 'F5', 'A5', 'B5', 'D6'],
      },
      inner: {
        close: ['C#5', 'C4', 'F4', 'A4', 'C5', 'F5', 'A5', 'C6', 'F6', 'A6'],
        open: ['C#5', 'E4', 'G4', 'Bb4', 'D5', 'E5', 'G5', 'Bb5', 'D6', 'E6'],
      },
    },
    bass: {
      f5: { open: 'DM', close: 'GM' },
      f6: { open: 'D', close: 'G' },
      f7: { open: 'GM', close: 'CM' },
      f8: { open: 'G', close: 'C' },
      '7': { open: 'Am', close: 'EM' },
      '8': { open: 'A', close: 'E' },
      '9': { open: 'Dm', close: 'AM' },
      '0': { open: 'D', close: 'A' },
    },
  },
  BbEbAb: {
    label: 'Tonalidad Bb-Eb-Ab',
    rowTitles: { outer: 'Bb', middle: 'Eb', inner: 'Ab' },
    rows: {
      outer: {
        close: ['E4', 'Bb3', 'D3', 'F4', 'Bb4', 'D4', 'F5', 'Bb5', 'D5', 'F6'],
        open: ['Gb4', 'C3', 'Eb4', 'G4', 'A4', 'C4', 'Eb5', 'G5', 'A5', 'C5'],
      },
      middle: {
        close: ['A3', 'Bb3', 'Eb4', 'G4', 'Bb4', 'Eb5', 'G5', 'Bb5', 'Eb6', 'G6', 'Bb6'],
        open: ['B3', 'D3', 'F4', 'Ab4', 'C5', 'D5', 'F5', 'Ab5', 'C6', 'D6', 'F6'],
      },
      inner: {
        close: ['Gb5', 'Eb4', 'Ab4', 'C5', 'Eb5', 'Ab5', 'C6', 'Eb6', 'Ab6', 'C7'],
        open: ['E5', 'G4', 'Bb4', 'Db4', 'F5', 'G5', 'Bb5', 'Db5', 'F6', 'G6'],
      },
    },
    bass: {
      f5: { open: 'C', close: 'G' },
      f6: { open: 'F', close: 'C' },
      f7: { open: 'Db', close: 'Db' },
      f8: { open: 'Db', close: 'Db' },
      '7': { open: 'F', close: 'Bb' },
      '8': { open: 'Bb', close: 'Eb' },
      '9': { open: 'Eb', close: 'Ab' },
      '0': { open: 'Eb', close: 'Ab' },
    },
  },
};

const TONALITY_OPTIONS = Object.entries(TONALITY_CONFIGS).map(([value, config]) => ({
  value,
  label: config.label,
}));

const AUDIO_SHAPE = {
  gain: 0.38,
  attack: 0.02,
  release: 0.18,
};

const ACCORDION_PARTIALS = [
  { type: 'sawtooth', detune: 0, gain: 0.48 },
  { type: 'sawtooth', detune: 9, gain: 0.26 },
  { type: 'triangle', detune: -7, gain: 0.18 },
];

const OPEN_BELLOWS_KEYS = new Set(['q', 'f3']);
const CLOSE_BELLOWS_KEYS = new Set(['<', 'f4']);

const normalizeKey = (raw) => {
  if (!raw) return '';
  if (raw === 'Dead') return '´';
  let value = raw.length === 1 ? raw : raw.toLowerCase();
  if (value.length === 1) {
    value = value.toLowerCase();
  }
  if (value === '[') return '{';
  if (value === '\'' || value === '`' || value === '¨' || value === '´') return '´';
  return value;
};

const sanitizePitch = (pitch) => {
  const normalized = pitch.replace('♭', 'b').replace('♯', '#');
  if (normalized === 'Cb') return 'B';
  if (normalized === 'Fb') return 'E';
  if (normalized === 'E#') return 'F';
  if (normalized === 'B#') return 'C';
  return normalized;
};

const frequencyCache = new Map();

const noteToFrequency = (note) => {
  if (!note) return null;
  if (frequencyCache.has(note)) return frequencyCache.get(note);
  const match = note.match(/^([A-G][b#]?)(\d)$/);
  if (!match) return null;
  const [, pitch, octaveStr] = match;
  const normalizedPitch = sanitizePitch(pitch);
  const NOTE_OFFSETS = {
    C: -9,
    'C#': -8,
    Db: -8,
    D: -7,
    'D#': -6,
    Eb: -6,
    E: -5,
    F: -4,
    'F#': -3,
    Gb: -3,
    G: -2,
    'G#': -1,
    Ab: -1,
    A: 0,
    'A#': 1,
    Bb: 1,
    B: 2,
  };
  const offset = NOTE_OFFSETS[normalizedPitch];
  if (offset === undefined) return null;
  const octave = Number(octaveStr);
  const semitoneDistance = offset + (octave - 4) * 12;
  const frequency = 440 * Math.pow(2, semitoneDistance / 12);
  frequencyCache.set(note, frequency);
  return frequency;
};

const createVoice = (context, destination, frequency) => {
  if (!frequency) return null;
  const gainNode = context.createGain();
  gainNode.gain.setValueAtTime(0, context.currentTime);

  const toneFilter = context.createBiquadFilter();
  toneFilter.type = 'lowpass';
  toneFilter.frequency.setValueAtTime(2400, context.currentTime);
  toneFilter.Q.setValueAtTime(0.9, context.currentTime);

  const bodyFilter = context.createBiquadFilter();
  bodyFilter.type = 'peaking';
  bodyFilter.frequency.setValueAtTime(900, context.currentTime);
  bodyFilter.gain.setValueAtTime(3.5, context.currentTime);
  bodyFilter.Q.setValueAtTime(1.8, context.currentTime);

  toneFilter.connect(bodyFilter).connect(gainNode).connect(destination);

  const oscillators = ACCORDION_PARTIALS.map((partial) => {
    const osc = context.createOscillator();
    osc.type = partial.type;
    osc.frequency.setValueAtTime(frequency, context.currentTime);
    if (partial.detune) {
      osc.detune.setValueAtTime(partial.detune, context.currentTime);
    }
    const partialGain = context.createGain();
    partialGain.gain.setValueAtTime(partial.gain, context.currentTime);
    osc.connect(partialGain).connect(toneFilter);
    osc.start();
    return osc;
  });

  return { gainNode, oscillators };
};

function App() {
  const [tonality, setTonality] = useState('GCF');
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [pressedBassKeys, setPressedBassKeys] = useState(new Set());
  const [bellowsDirection, setBellowsDirectionState] = useState(null);
  const pressedKeysRef = useRef(new Set());
  const pressedBassKeysRef = useRef(new Set());
  const bellowsDirectionRef = useRef(null);
  const bellowsKeyRef = useRef(null);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeVoicesRef = useRef(new Map());
  const activeBassVoicesRef = useRef(new Map());

  const currentTonality = TONALITY_CONFIGS[tonality];

  const keyboardLayout = useMemo(() => {
    return ROW_METADATA.map((row) => {
      const noteSet = currentTonality.rows[row.id];
      const buttons = row.keys.map((keyValue, index) => ({
        id: `${row.id}-${keyValue}`,
        keyValue,
        displayKey: formatDisplayKey(keyValue),
        closeNote: noteSet.close[index],
        openNote: noteSet.open[index],
        accent: row.accent,
      }));
      return {
        ...row,
        label: `${row.title} (${currentTonality.rowTitles[row.id]})`,
        buttons,
      };
    });
  }, [currentTonality]);

  const keyLookup = useMemo(() => {
    const map = new Map();
    keyboardLayout.forEach((row) => {
      row.buttons.forEach((button) => {
        map.set(button.keyValue, button);
      });
    });
    return map;
  }, [keyboardLayout]);

  const bassDefinitions = useMemo(() => {
    return BASS_KEY_SEQUENCE.map((key) => {
      const config = currentTonality.bass[key];
      return {
        key,
        label: BASS_KEY_LABELS[key],
        openLabel: config.open,
        closeLabel: config.close,
        openChord: CHORD_LIBRARY[config.open] || [],
        closeChord: CHORD_LIBRARY[config.close] || [],
      };
    });
  }, [currentTonality]);

  const bassLookup = useMemo(() => {
    const map = new Map();
    bassDefinitions.forEach((definition) => {
      map.set(definition.key, definition);
    });
    return map;
  }, [bassDefinitions]);

  const updateBellowsDirection = useCallback((direction) => {
    bellowsDirectionRef.current = direction;
    setBellowsDirectionState(direction);
  }, []);

  const ensureAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return null;
      const context = new AudioContextClass();
      audioCtxRef.current = context;
      const masterGain = context.createGain();
      masterGain.gain.setValueAtTime(0.85, context.currentTime);
      masterGain.connect(context.destination);
      masterGainRef.current = masterGain;
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const stopVoice = useCallback((voice) => {
    if (!voice) return;
    const context = audioCtxRef.current;
    if (!context) return;
    const now = context.currentTime;
    voice.gainNode.gain.cancelScheduledValues(now);
    voice.gainNode.gain.setValueAtTime(voice.gainNode.gain.value, now);
    voice.gainNode.gain.linearRampToValueAtTime(0, now + AUDIO_SHAPE.release);
    voice.oscillators.forEach((osc) => osc.stop(now + AUDIO_SHAPE.release + 0.05));
  }, []);

  const stopVoiceEntry = useCallback(
    (entry) => {
      if (!entry) return;
      entry.voices.forEach((voice) => stopVoice(voice));
    },
    [stopVoice]
  );

  const stopNoteForKey = useCallback(
    (key) => {
      const entry = activeVoicesRef.current.get(key);
      if (entry) {
        stopVoiceEntry(entry);
        activeVoicesRef.current.delete(key);
      }
    },
    [stopVoiceEntry]
  );

  const stopBassChord = useCallback(
    (key) => {
      const entry = activeBassVoicesRef.current.get(key);
      if (entry) {
        stopVoiceEntry(entry);
        activeBassVoicesRef.current.delete(key);
      }
    },
    [stopVoiceEntry]
  );

  const stopAllNotes = useCallback(() => {
    activeVoicesRef.current.forEach((entry) => stopVoiceEntry(entry));
    activeVoicesRef.current.clear();
  }, [stopVoiceEntry]);

  const stopAllBassChords = useCallback(() => {
    activeBassVoicesRef.current.forEach((entry) => stopVoiceEntry(entry));
    activeBassVoicesRef.current.clear();
  }, [stopVoiceEntry]);

  const startNoteForKey = useCallback(
    (key, direction, forceRestart = false) => {
      if (!direction) return;
      const button = keyLookup.get(key);
      if (!button) return;
      const noteName = direction === 'open' ? button.openNote : button.closeNote;
      const frequency = noteToFrequency(noteName);
      if (!frequency) return;
      const context = ensureAudioContext();
      if (!context) return;
      const existing = activeVoicesRef.current.get(key);
      if (existing) {
        if (!forceRestart && existing.direction === direction) return;
        stopVoiceEntry(existing);
        activeVoicesRef.current.delete(key);
      }
      const destination = masterGainRef.current || context.destination;
      const voice = createVoice(context, destination, frequency);
      if (!voice) return;
      voice.gainNode.gain.linearRampToValueAtTime(AUDIO_SHAPE.gain, context.currentTime + AUDIO_SHAPE.attack);
      activeVoicesRef.current.set(key, { voices: [voice], direction });
    },
    [ensureAudioContext, keyLookup, stopVoiceEntry]
  );

  const startBassChord = useCallback(
    (key, direction, forceRestart = false) => {
      if (!direction) return;
      const definition = bassLookup.get(key);
      if (!definition) return;
      const chordNotes = direction === 'open' ? definition.openChord : definition.closeChord;
      if (!chordNotes.length) return;
      const context = ensureAudioContext();
      if (!context) return;
      const existing = activeBassVoicesRef.current.get(key);
      if (existing) {
        if (!forceRestart && existing.direction === direction) return;
        stopVoiceEntry(existing);
        activeBassVoicesRef.current.delete(key);
      }
      const destination = masterGainRef.current || context.destination;
      const voices = chordNotes
        .map((noteName) => createVoice(context, destination, noteToFrequency(noteName)))
        .filter(Boolean);
      if (!voices.length) return;
      const now = context.currentTime;
      voices.forEach((voice) => {
        voice.gainNode.gain.linearRampToValueAtTime(AUDIO_SHAPE.gain, now + AUDIO_SHAPE.attack);
      });
      activeBassVoicesRef.current.set(key, { voices, direction });
    },
    [bassLookup, ensureAudioContext, stopVoiceEntry]
  );

  const refreshNotesForDirection = useCallback(
    (direction) => {
      if (!direction) {
        stopAllNotes();
        stopAllBassChords();
        return;
      }
      pressedKeysRef.current.forEach((key) => {
        startNoteForKey(key, direction, true);
      });
      pressedBassKeysRef.current.forEach((key) => {
        startBassChord(key, direction, true);
      });
    },
    [startNoteForKey, stopAllNotes, startBassChord, stopAllBassChords]
  );

  const addPressedKey = useCallback(
    (key) => {
      if (pressedKeysRef.current.has(key)) return;
      pressedKeysRef.current.add(key);
      setPressedKeys(new Set(pressedKeysRef.current));
    },
    [setPressedKeys]
  );

  const removePressedKey = useCallback(
    (key) => {
      if (!pressedKeysRef.current.has(key)) return;
      pressedKeysRef.current.delete(key);
      setPressedKeys(new Set(pressedKeysRef.current));
    },
    [setPressedKeys]
  );

  const addPressedBassKey = useCallback(
    (key) => {
      if (pressedBassKeysRef.current.has(key)) return;
      pressedBassKeysRef.current.add(key);
      setPressedBassKeys(new Set(pressedBassKeysRef.current));
    },
    [setPressedBassKeys]
  );

  const removePressedBassKey = useCallback(
    (key) => {
      if (!pressedBassKeysRef.current.has(key)) return;
      pressedBassKeysRef.current.delete(key);
      setPressedBassKeys(new Set(pressedBassKeysRef.current));
    },
    [setPressedBassKeys]
  );

  useEffect(() => {
    stopAllNotes();
    stopAllBassChords();
    pressedKeysRef.current.clear();
    pressedBassKeysRef.current.clear();
    setPressedKeys(new Set());
    setPressedBassKeys(new Set());
  }, [tonality, stopAllNotes, stopAllBassChords]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const normalized = normalizeKey(event.key);
      if (!normalized) return;
      if (OPEN_BELLOWS_KEYS.has(normalized)) {
        if (event.repeat) return;
        bellowsKeyRef.current = normalized;
        ensureAudioContext();
        updateBellowsDirection('open');
        refreshNotesForDirection('open');
        event.preventDefault();
        return;
      }
      if (CLOSE_BELLOWS_KEYS.has(normalized)) {
        if (event.repeat) return;
        bellowsKeyRef.current = normalized;
        ensureAudioContext();
        updateBellowsDirection('close');
        refreshNotesForDirection('close');
        event.preventDefault();
        return;
      }
      if (bassLookup.has(normalized)) {
        if (event.repeat) return;
        addPressedBassKey(normalized);
        const direction = bellowsDirectionRef.current;
        if (direction) {
          startBassChord(normalized, direction);
        }
        event.preventDefault();
        return;
      }
      if (!keyLookup.has(normalized)) return;
      if (event.repeat) return;
      addPressedKey(normalized);
      const direction = bellowsDirectionRef.current;
      if (direction) {
        startNoteForKey(normalized, direction);
      }
      event.preventDefault();
    };

    const handleKeyUp = (event) => {
      const normalized = normalizeKey(event.key);
      if (!normalized) return;
      if (OPEN_BELLOWS_KEYS.has(normalized) && bellowsKeyRef.current === normalized) {
        bellowsKeyRef.current = null;
        updateBellowsDirection(null);
        refreshNotesForDirection(null);
        event.preventDefault();
        return;
      }
      if (CLOSE_BELLOWS_KEYS.has(normalized) && bellowsKeyRef.current === normalized) {
        bellowsKeyRef.current = null;
        updateBellowsDirection(null);
        refreshNotesForDirection(null);
        event.preventDefault();
        return;
      }
      if (bassLookup.has(normalized)) {
        removePressedBassKey(normalized);
        stopBassChord(normalized);
        event.preventDefault();
        return;
      }
      if (!keyLookup.has(normalized)) return;
      removePressedKey(normalized);
      stopNoteForKey(normalized);
      event.preventDefault();
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      stopAllNotes();
      stopAllBassChords();
    };
  }, [
    addPressedBassKey,
    addPressedKey,
    bassLookup,
    ensureAudioContext,
    keyLookup,
    refreshNotesForDirection,
    removePressedBassKey,
    removePressedKey,
    startBassChord,
    startNoteForKey,
    stopAllBassChords,
    stopAllNotes,
    stopBassChord,
    stopNoteForKey,
    updateBellowsDirection,
  ]);

  const bellowsLabel =
    bellowsDirection === 'open'
      ? 'Abriendo fuelle'
      : bellowsDirection === 'close'
      ? 'Cerrando fuelle'
      : 'Fuelle en reposo';

  return (
    <div className="app-shell">
      <header className="hero">
        <p className="tag">React + Web Audio API</p>
        <h1>Simulador de acordeon 5 letras</h1>
        <div className="tonality-picker">
          <label htmlFor="tonality">Tonalidad:</label>
          <select
            id="tonality"
            value={tonality}
            onChange={(event) => setTonality(event.target.value)}
          >
            {TONALITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <p className="subtitle">
          Ajusta la tonalidad y usa Q/F3 para abrir y &lt;/F4 para cerrar el fuelle. Cada fila replica
          los pitos de la mano derecha y ahora cuentas con bajos en F5-F8 y 7-0.
        </p>
        <div className="hero-keys">
          <div>
            <span className="key-pill">Q</span>
            <span className="key-action">Abrir</span>
          </div>
          <div>
            <span className="key-pill">F3</span>
            <span className="key-action">Abrir</span>
          </div>
          <div>
            <span className="key-pill">&lt;</span>
            <span className="key-action">Cerrar</span>
          </div>
          <div>
            <span className="key-pill">F4</span>
            <span className="key-action">Cerrar</span>
          </div>
        </div>
      </header>

      <section className="status-panel">
        <div className="status-card">
          <span className="status-label">Estado del fuelle</span>
          <span className={`status-value ${bellowsDirection || 'idle'}`}>{bellowsLabel}</span>
        </div>
        <div className="status-card">
          <span className="status-label">Teclas activas</span>
          <span className="status-value">{pressedKeys.size}</span>
        </div>
        <div className="status-card">
          <span className="status-label">Notas mano derecha</span>
          <span className="status-value">{activeVoicesRef.current.size}</span>
        </div>
        <div className="status-card">
          <span className="status-label">Bajos activos</span>
          <span className="status-value">{pressedBassKeys.size}</span>
        </div>
      </section>

      <section className="keyboard">
        {keyboardLayout.map((row) => (
          <article key={row.id} className={`row ${row.accent}`}>
            <header className="row-header">
              <h2>{row.label}</h2>
              <p>{row.description}</p>
            </header>
            <div className="button-row">
              {row.buttons.map((button) => {
                const isActive = pressedKeys.has(button.keyValue);
                return (
                  <div key={button.id} className={`button ${isActive ? 'active' : ''}`}>
                    <span className="button-key">{button.displayKey}</span>
                    <div className="button-notes">
                      <span className="note open">
                        Abre <strong>{button.openNote}</strong>
                      </span>
                      <span className="note close">
                        Cierra <strong>{button.closeNote}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="bass-panel">
        <h3>Bajos (mano izquierda)</h3>
        <div className="bass-grid">
          {bassDefinitions.map((bassKey) => {
            const isActive = pressedBassKeys.has(bassKey.key);
            return (
              <div key={bassKey.key} className={`bass-card ${isActive ? 'active' : ''}`}>
                <span className="bass-key-label">{bassKey.label}</span>
                <div className="bass-notes">
                  <span>
                    Abre <strong>{bassKey.openLabel}</strong>
                  </span>
                  <span>
                    Cierra <strong>{bassKey.closeLabel}</strong>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="tips">
        <h3>Tips rapidos</h3>
        <ul>
          <li>Manten un boton y alterna entre Q/F3 y &lt;/F4 para oir ambas voces (abrir/cerrar).</li>
          <li>Los bajos viven en F5-F8 y 7-0 y cambian de acorde con la direccion del fuelle.</li>
          <li>Explora la tonalidad Bb-Eb-Ab para ritmos norteños o vuelve a GCF segun necesites.</li>
          <li>
            Puedes ajustar la afinacion editando el archivo <code>src/App.js</code> y cambiando las notas.
          </li>
        </ul>
      </section>
    </div>
  );
}

export default App;
