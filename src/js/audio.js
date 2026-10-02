// Procedural Web Audio API Soundscape

export class AudioManager {
    constructor(engine) {
        this.engine = engine;

        // Audio context requires user interaction to start in modern browsers
        this.ctx = null;
        this.isInitialized = false;

        this.buzzOscillators = [];
        this.masterGain = null;
        this.filter = null;

        this.setupInteractionListener();
    }

    setupInteractionListener() {
        const initAudio = () => {
            if (!this.isInitialized) {
                this.initContext();
                this.isInitialized = true;
                document.removeEventListener('click', initAudio);
            }
        };
        document.addEventListener('click', initAudio);
    }

    initContext() {
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.1; // Base volume

        // Lowpass filter to muffle buzz and make it sound like a hive interior
        this.filter = this.ctx.createBiquadFilter();
        this.filter.type = 'lowpass';
        this.filter.frequency.value = 800; // Hz

        this.masterGain.connect(this.filter);
        this.filter.connect(this.ctx.destination);

        // Create a few oscillators for a rich buzz
        this.createBuzzOscillator(150, 'sawtooth');
        this.createBuzzOscillator(200, 'sawtooth');
        this.createBuzzOscillator(250, 'triangle');

        // Add to engine for dynamic updates
        this.engine.addSystem(this);
    }

    createBuzzOscillator(freq, type) {
        const osc = this.ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = freq;

        // Add slight detune for thickness
        osc.detune.value = (Math.random() - 0.5) * 20;

        const gain = this.ctx.createGain();
        gain.gain.value = 0.3; // Relative volume of this oscillator

        osc.connect(gain);
        gain.connect(this.masterGain);

        osc.start();
        this.buzzOscillators.push({ osc, gain, baseFreq: freq });
    }

    update(dt) {
        if (!this.isInitialized || !this.ctx) return;

        // Modulate pitch and volume based on game state (e.g. population, threats)
        // Since we don't have direct access to hive/simulation here without passing them,
        // we could use the event bus. For simplicity, we'll just add a gentle throb.

        const time = this.ctx.currentTime;

        // Gentle modulation
        const modulation = Math.sin(time * 2) * 10;

        for (const bo of this.buzzOscillators) {
            // Smoothly adjust frequency
            bo.osc.frequency.setTargetAtTime(bo.baseFreq + modulation, time, 0.1);
        }

        // If view is 'world', open the filter and reduce volume (distant sound)
        if (this.engine.view.mode === 'world') {
            this.filter.frequency.setTargetAtTime(2000, time, 0.5);
            this.masterGain.gain.setTargetAtTime(0.05, time, 0.5);
        } else {
            // 'hive' view
            this.filter.frequency.setTargetAtTime(800, time, 0.5);
            this.masterGain.gain.setTargetAtTime(0.15, time, 0.5);
        }
    }
}
