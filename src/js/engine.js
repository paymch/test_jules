export class Engine {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.lastTime = 0;
        this.deltaTime = 0;
        this.isRunning = false;

        // Game speed multiplier
        this.speed = 1;

        // View configuration
        this.view = {
            mode: 'hive', // 'hive' or 'world'
            camera: { x: 0, y: 0, zoom: 1 }
        };

        // Event Bus
        this.events = {};

        // Subsystems to update and render
        this.updatables = [];
        this.renderables = [];

        this._resizeCanvas();
        window.addEventListener('resize', () => this._resizeCanvas());

        // Bind loop explicitly to ensure `this` context
        this._loop = this._loop.bind(this);
    }

    _resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.emit('resize', { width: this.canvas.width, height: this.canvas.height });
    }

    // --- Event Bus ---
    on(event, callback) {
        if (!this.events[event]) this.events[event] = [];
        this.events[event].push(callback);
    }

    emit(event, data) {
        if (this.events[event]) {
            this.events[event].forEach(cb => cb(data));
        }
    }

    // --- System Management ---
    addSystem(system) {
        if (typeof system.update === 'function') {
            this.updatables.push(system);
        }
        if (typeof system.render === 'function') {
            this.renderables.push(system);
        }
    }

    // --- Game Loop ---
    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.lastTime = performance.now();
            this.emit('init');
            requestAnimationFrame(this._loop);
        }
    }

    stop() {
        this.isRunning = false;
    }

    setSpeed(multiplier) {
        this.speed = multiplier;
    }

    _loop(timestamp) {
        if (!this.isRunning) return;

        // Calculate delta time in seconds, capped to prevent massive jumps
        let dt = (timestamp - this.lastTime) / 1000;
        if (dt > 0.1) dt = 0.1;

        this.deltaTime = dt * this.speed;
        this.lastTime = timestamp;

        this.update(this.deltaTime);
        this.render();

        requestAnimationFrame(this._loop);
    }

    update(dt) {
        if (this.speed === 0) return; // Paused

        for (const system of this.updatables) {
            system.update(dt);
        }
    }

    render() {
        // Clear screen
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Apply Camera Transform
        this.ctx.save();
        this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Center Origin
        this.ctx.scale(this.view.camera.zoom, this.view.camera.zoom);
        this.ctx.translate(-this.view.camera.x, -this.view.camera.y);

        for (const system of this.renderables) {
            system.render(this.ctx, this.view);
        }

        this.ctx.restore();

        // Render UI/HUD on top if any canvas-based UI exists
        this.emit('renderUI', this.ctx);
    }
}

// --- Particle System Integration ---
Engine.prototype.initParticleSystem = function() {
    this.particles = [];
};

Engine.prototype.emitParticle = function(x, y, type) {
    if (!this.particles) this.initParticleSystem();

    let color = '#fff';
    let life = 1.0; // seconds
    let vx = (Math.random() - 0.5) * 20;
    let vy = (Math.random() - 0.5) * 20;
    let size = 2;

    if (type === 'pollen') {
        color = '#ffff00';
        size = 3;
    } else if (type === 'pheromone') {
        color = 'rgba(255, 100, 200, 0.5)';
        size = 5;
        life = 2.0;
        vx *= 0.5;
        vy *= 0.5;
    }

    this.particles.push({ x, y, vx, vy, life, maxLife: life, color, size, type });
};

Engine.prototype.updateParticles = function(dt) {
    if (!this.particles) return;
    for (let i = this.particles.length - 1; i >= 0; i--) {
        let p = this.particles[i];
        p.life -= dt;
        if (p.life <= 0) {
            this.particles.splice(i, 1);
            continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;

        // Expand pheromones over time
        if (p.type === 'pheromone') {
            p.size += dt * 5;
        }
    }
};

Engine.prototype.renderParticles = function(ctx) {
    if (!this.particles) return;
    for (const p of this.particles) {
        ctx.save();
        ctx.globalAlpha = p.life / p.maxLife; // Fade out
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
};

// Hook particle logic into update and render loops
const origUpdate = Engine.prototype.update;
Engine.prototype.update = function(dt) {
    origUpdate.call(this, dt);
    this.updateParticles(dt);
};

const origRender = Engine.prototype.render;
Engine.prototype.render = function() {
    // We need to inject renderParticles right before ctx.restore() in the original render.
    // Instead of completely overriding, we'll patch the array of renderables to include a proxy.

    // Clear screen
    this.ctx.fillStyle = '#1a1a1a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Apply Camera Transform
    this.ctx.save();
    this.ctx.translate(this.canvas.width / 2, this.canvas.height / 2); // Center Origin
    this.ctx.scale(this.view.camera.zoom, this.view.camera.zoom);
    this.ctx.translate(-this.view.camera.x, -this.view.camera.y);

    for (const system of this.renderables) {
        system.render(this.ctx, this.view);
    }

    // Custom inject Particles here
    this.renderParticles(this.ctx);

    this.ctx.restore();

    // Render UI/HUD on top if any canvas-based UI exists
    this.emit('renderUI', this.ctx);
};
