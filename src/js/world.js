// External Environment & Foraging Map

export class World {
    constructor(engine) {
        this.engine = engine;

        this.width = 4000;
        this.height = 4000;

        this.timeOfDay = 8; // 0 to 24 hours
        this.timeScale = 0.5; // Game hours per real second (base)
        this.season = 'spring'; // spring, summer, autumn, winter

        // Weather
        this.weather = 'clear'; // clear, cloudy, rain, storm
        this.temperature = 22; // Celsius
        this.wind = { dx: 0, dy: 0, speed: 0 };

        // Flora Ecosystem
        this.flowerPatches = [];
        this.generateFlora();

        // Register system
        this.engine.addSystem(this);
    }

    generateFlora() {
        const numPatches = 20;
        for (let i = 0; i < numPatches; i++) {
            this.flowerPatches.push({
                x: (Math.random() - 0.5) * this.width,
                y: (Math.random() - 0.5) * this.height,
                radius: 50 + Math.random() * 150,
                nectar: 500 + Math.random() * 1000,
                maxNectar: 2000,
                pollen: 200 + Math.random() * 500,
                maxPollen: 1000,
                bloomState: Math.random(), // 0 to 1
                color: `hsl(${Math.random() * 360}, 80%, 60%)`
            });
        }
    }

    update(dt) {
        // Time progression
        this.timeOfDay += dt * (this.timeScale / 60);
        if (this.timeOfDay >= 24) {
            this.timeOfDay = 0;
            // Day passed logic...
        }

        // Basic temp curve based on time of day (coolest at 4am, hottest at 2pm)
        const timeOffset = (this.timeOfDay - 14) * (Math.PI / 12);
        this.temperature = 15 + Math.cos(timeOffset) * 10;

        // Flora regrowth
        for (const patch of this.flowerPatches) {
            if (this.season !== 'winter') {
                if (patch.nectar < patch.maxNectar) patch.nectar += dt * 2;
                if (patch.pollen < patch.maxPollen) patch.pollen += dt * 1;
            }
        }
    }

    render(ctx, view) {
        if (view.mode !== 'world') return;

        // Render Meadow Background
        // Calculate ambient light based on time of day
        let lightness = 50; // base
        if (this.timeOfDay < 5 || this.timeOfDay > 20) lightness = 10; // Night
        else if (this.timeOfDay > 5 && this.timeOfDay < 7) lightness = 30; // Dawn
        else if (this.timeOfDay > 18 && this.timeOfDay < 20) lightness = 30; // Dusk

        ctx.fillStyle = `hsl(100, 40%, ${lightness}%)`;
        ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);

        // Render Hive Entrance representation
        ctx.fillStyle = '#8B4513';
        ctx.beginPath();
        ctx.arc(0, 0, 40, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(0, 0, 15, 0, Math.PI * 2);
        ctx.fill();

        // Render Flower Patches
        for (const patch of this.flowerPatches) {
            const alpha = patch.nectar / patch.maxNectar;
            ctx.fillStyle = patch.color;
            ctx.globalAlpha = 0.2 + (alpha * 0.8);

            ctx.beginPath();
            ctx.arc(patch.x, patch.y, patch.radius, 0, Math.PI * 2);
            ctx.fill();

            // Draw individual abstract flowers
            ctx.globalAlpha = 1.0;
            ctx.fillStyle = '#fff'; // center of flowers
            const numFlowers = Math.floor(patch.radius / 10);
            for(let i=0; i<numFlowers; i++) {
                // Deterministic pseudo-random positions based on patch coords
                const fx = patch.x + Math.sin(patch.x * i) * (patch.radius * 0.8);
                const fy = patch.y + Math.cos(patch.y * i) * (patch.radius * 0.8);
                ctx.beginPath();
                ctx.arc(fx, fy, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        }
        ctx.globalAlpha = 1.0;
    }
}

// --- Waggle Dance System ---
World.prototype.createWaggleDance = function(forager, patch) {
    if (!patch) return null;

    // Calculate vector from hive (0,0) to patch
    const dx = patch.x;
    const dy = patch.y;
    const distance = Math.sqrt(dx*dx + dy*dy);

    // Calculate angle relative to "sun" (simplified: up/north is sun at noon)
    // Angle in radians
    const angle = Math.atan2(dy, dx);

    // Encode distance into dance duration/waggles
    const duration = distance * 0.05; // Game seconds

    // Quality of patch affects dance intensity
    const intensity = patch.nectar / patch.maxNectar;

    return {
        dancerId: forager.id,
        targetX: patch.x,
        targetY: patch.y,
        angle: angle,
        distance: distance,
        duration: duration,
        intensity: intensity,
        timestamp: this.engine.lastTime // Time when dance started
    };
};
