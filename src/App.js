import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';

const ROW_DEFINITIONS = [
  {
    id: 'outer',
    label: 'Hilera exterior (Sol)',
    description: 'Z  X  C  V  B  N  M  ,  .  -',
    accent: 'outer',
    keys: ['z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '-'],
    closeNotes: ['C#4', 'G3', 'B3', 'D4', 'G4', 'B4', 'D5', 'G5', 'B5', 'D6'],
    openNotes: ['Eb4', 'A3', 'C4', 'E4', 'F#4', 'A4', 'C5', 'E5', 'F#5', 'A5'],
  },
  {
    id: 'middle',
    label: 'Hilera media (Do)',
    description: 'A  S  D  F  G  H  J  K  L  Ñ  {',
    accent: 'middle',
    keys: ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ', '{'],
    closeNotes: ['F#3', 'G3', 'C4', 'E4', 'G4', 'C5', 'E5', 'G5', 'C6', 'E6', 'G6'],
    openNotes: ['G#3', 'B3', 'D4', 'F4', 'A4', 'B4', 'D5', 'F5', 'A5', 'B5', 'D6'],
  },
  {
    id: 'inner',
    label: 'Hilera interior (Fa)',
    description: 'W  E  R  T  Y  U  I  O  P  ´',
    accent: 'inner',
    keys: ['w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '´'],
    closeNotes: ['Eb5', 'C4', 'F4', 'A4', 'C5', 'F5', 'A5', 'C6', 'F6', 'A6'],
    openNotes: ['C#5', 'E4', 'G4', 'Bb4', 'D5', 'E5', 'G5', 'Bb5', 'D6', 'E6'],
  },
];

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

const frequencyCache = new Map();

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
const OPEN_BELLOWS_KEY = 'q';
const CLOSE_BELLOWS_KEY = '<';

const formatDisplayKey = (keyValue) => {
  if (keyValue === 'ñ') return 'Ñ';
  if (keyValue === '´') return '´';
  if (keyValue.length === 1 && keyValue.match(/[a-z]/)) return keyValue.toUpperCase();
  return keyValue;
};

const KEYBOARD_LAYOUT = ROW_DEFINITIONS.map((row) => {
  const buttons = row.keys.map((keyValue, index) => ({
    id: `${row.id}-${keyValue}`,
    keyValue,
    displayKey: formatDisplayKey(keyValue),
    closeNote: row.closeNotes[index],
    openNote: row.openNotes[index],
    accent: row.accent,
  }));
  return { ...row, buttons };
});

const KEY_LOOKUP = new Map();
KEYBOARD_LAYOUT.forEach((row) => {
  row.buttons.forEach((button) => {
    KEY_LOOKUP.set(button.keyValue, button);
  });
});

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

const noteToFrequency = (note) => {
  if (!note) return null;
  if (frequencyCache.has(note)) return frequencyCache.get(note);
  const match = note.match(/^([A-G][b#]?)(\d)$/);
  if (!match) return null;
  const [, pitch, octaveStr] = match;
  const normalizedPitch = sanitizePitch(pitch);
  const offset = NOTE_OFFSETS[normalizedPitch];
  if (offset === undefined) return null;
  const octave = Number(octaveStr);
  const semitoneDistance = offset + (octave - 4) * 12;
  const frequency = 440 * Math.pow(2, semitoneDistance / 12);
  frequencyCache.set(note, frequency);
  return frequency;
};

function App() {
  const [pressedKeys, setPressedKeys] = useState(new Set());
  const [bellowsDirection, setBellowsDirectionState] = useState(null);
  const pressedKeysRef = useRef(new Set());
  const bellowsDirectionRef = useRef(null);
  const bellowsKeyRef = useRef(null);
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);
  const activeVoicesRef = useRef(new Map());

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

  const stopNoteForKey = useCallback(
    (key) => {
      const voice = activeVoicesRef.current.get(key);
      if (voice) {
        stopVoice(voice);
        activeVoicesRef.current.delete(key);
      }
    },
    [stopVoice]
  );

  const stopAllNotes = useCallback(() => {
    activeVoicesRef.current.forEach((voice) => stopVoice(voice));
    activeVoicesRef.current.clear();
  }, [stopVoice]);

  const startNoteForKey = useCallback(
    (key, direction, forceRestart = false) => {
      if (!direction) return;
      const button = KEY_LOOKUP.get(key);
      if (!button) return;
      const noteName = direction === 'open' ? button.openNote : button.closeNote;
      const frequency = noteToFrequency(noteName);
      if (!frequency) return;
      const context = ensureAudioContext();
      if (!context) return;
      const existing = activeVoicesRef.current.get(key);
      if (existing) {
        if (!forceRestart && existing.direction === direction) return;
        stopVoice(existing);
        activeVoicesRef.current.delete(key);
      }
      const destination = masterGainRef.current || context.destination;
      const gainNode = context.createGain();
      gainNode.gain.setValueAtTime(0, context.currentTime);
      const colorFilter = context.createBiquadFilter();
      colorFilter.type = 'lowpass';
      colorFilter.frequency.setValueAtTime(2400, context.currentTime);
      colorFilter.Q.setValueAtTime(0.9, context.currentTime);
      const bodyFilter = context.createBiquadFilter();
      bodyFilter.type = 'peaking';
      bodyFilter.frequency.setValueAtTime(900, context.currentTime);
      bodyFilter.gain.setValueAtTime(3.5, context.currentTime);
      bodyFilter.Q.setValueAtTime(1.8, context.currentTime);
      colorFilter.connect(bodyFilter).connect(gainNode).connect(destination);

      const oscillators = ACCORDION_PARTIALS.map((partial) => {
        const osc = context.createOscillator();
        osc.type = partial.type;
        osc.frequency.setValueAtTime(frequency, context.currentTime);
        if (partial.detune) {
          osc.detune.setValueAtTime(partial.detune, context.currentTime);
        }
        const partialGain = context.createGain();
        partialGain.gain.setValueAtTime(partial.gain, context.currentTime);
        osc.connect(partialGain).connect(colorFilter);
        osc.start();
        return osc;
      });

      gainNode.gain.linearRampToValueAtTime(AUDIO_SHAPE.gain, context.currentTime + AUDIO_SHAPE.attack);
      activeVoicesRef.current.set(key, { oscillators, gainNode, direction });
    },
    [ensureAudioContext, stopVoice]
  );

  const refreshNotesForDirection = useCallback(
    (direction) => {
      if (!direction) {
        stopAllNotes();
        return;
      }
      pressedKeysRef.current.forEach((key) => {
        startNoteForKey(key, direction, true);
      });
    },
    [startNoteForKey, stopAllNotes]
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

  useEffect(() => {
    const handleKeyDown = (event) => {
      const normalized = normalizeKey(event.key);
      if (!normalized) return;
      if (normalized === OPEN_BELLOWS_KEY) {
        if (event.repeat) return;
        bellowsKeyRef.current = OPEN_BELLOWS_KEY;
        ensureAudioContext();
        updateBellowsDirection('open');
        refreshNotesForDirection('open');
        event.preventDefault();
        return;
      }
      if (normalized === CLOSE_BELLOWS_KEY) {
        if (event.repeat) return;
        bellowsKeyRef.current = CLOSE_BELLOWS_KEY;
        ensureAudioContext();
        updateBellowsDirection('close');
        refreshNotesForDirection('close');
        event.preventDefault();
        return;
      }
      if (!KEY_LOOKUP.has(normalized)) return;
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
      if (normalized === OPEN_BELLOWS_KEY && bellowsKeyRef.current === OPEN_BELLOWS_KEY) {
        bellowsKeyRef.current = null;
        updateBellowsDirection(null);
        refreshNotesForDirection(null);
        event.preventDefault();
        return;
      }
      if (normalized === CLOSE_BELLOWS_KEY && bellowsKeyRef.current === CLOSE_BELLOWS_KEY) {
        bellowsKeyRef.current = null;
        updateBellowsDirection(null);
        refreshNotesForDirection(null);
        event.preventDefault();
        return;
      }
      if (!KEY_LOOKUP.has(normalized)) return;
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
    };
  }, [
    addPressedKey,
    removePressedKey,
    refreshNotesForDirection,
    startNoteForKey,
    stopAllNotes,
    stopNoteForKey,
    updateBellowsDirection,
    ensureAudioContext,
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
        <p className="subtitle">
          Cada fila replica los pitos de la mano derecha de un GCF (cinco letras). Manten presionado{' '}
          <span className="key-pill">Q</span> para abrir y{' '}
          <span className="key-pill">&lt;</span> para cerrar el fuelle.
        </p>
        <div className="hero-keys">
          <div>
            <span className="key-pill">Q</span>
            <span className="key-action">Abrir</span>
          </div>
          <div>
            <span className="key-pill">&lt;</span>
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
          <span className="status-label">Notas sonando</span>
          <span className="status-value">{activeVoicesRef.current.size}</span>
        </div>
      </section>

      <section className="keyboard">
        {KEYBOARD_LAYOUT.map((row) => (
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
                        Abrir <strong>{button.openNote}</strong>
                      </span>
                      <span className="note close">
                        Cerrar <strong>{button.closeNote}</strong>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </article>
        ))}
      </section>

      <section className="tips">
        <h3>Tips rapidos</h3>
        <ul>
          <li>Manten un boton y alterna entre Q y &lt; para oir ambas voces (abrir/cerrar).</li>
          <li>La fila exterior corresponde a Sol, la central a Do y la interior a Fa.</li>
          <li>
            Puedes ajustar la afinacion editando el archivo <code>src/App.js</code> y cambiando las notas.
          </li>
        </ul>
      </section>
    </div>
  );
}

export default App;
