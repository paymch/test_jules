// Global Simulation Events and Threats

export class Simulation {
    constructor(engine, hive, world) {
        this.engine = engine;
        this.hive = hive;
        this.world = world;

        this.threats = []; // Array of active predators
        this.events = []; // Active seasonal or weather events

        // Timers
        this.threatTimer = 0;
        this.eventTimer = 0;

        this.engine.addSystem(this);
    }

    // --- Threat System (Predators) ---
    spawnThreat(type) {
        const angle = Math.random() * Math.PI * 2;
        const dist = 1000; // Spawn outside the immediate view
        const threat = {
            id: Math.random().toString(36).substring(2, 9),
            type: type, // 'wasp', 'hornet'
            x: Math.cos(angle) * dist,
            y: Math.sin(angle) * dist,
            vx: 0,
            vy: 0,
            speed: type === 'hornet' ? 60 : 80,
            health: type === 'hornet' ? 300 : 100,
            attackPower: type === 'hornet' ? 50 : 20,
            state: 'attacking',
            target: { x: 0, y: 0 } // Move towards hive entrance by default
        };
        this.threats.push(threat);
        console.log(`A ${type} has appeared!`);

        // Log to UI
        const eventList = document.getElementById('event-list');
        if (eventList) {
            const li = document.createElement('li');
            li.style.color = '#ff4444';
            li.innerText = `Warning: ${type.toUpperCase()} attack!`;
            eventList.prepend(li);
        }
    }

    updateThreats(dt) {
        // Randomly spawn threats based on population and season
        this.threatTimer += dt;
        if (this.threatTimer > 60) { // Check every 60 game seconds
            this.threatTimer = 0;
            // Higher chance if hive is large and it's summer/autumn
            const chance = (this.hive.population / 1000) * (this.world.season === 'autumn' ? 0.5 : 0.2);
            if (Math.random() < chance) {
                this.spawnThreat(Math.random() > 0.8 ? 'hornet' : 'wasp');
            }
        }

        // Update active threats
        for (let i = this.threats.length - 1; i >= 0; i--) {
            const threat = this.threats[i];

            if (threat.health <= 0) {
                this.threats.splice(i, 1);
                continue;
            }

            // Move towards hive
            const dx = threat.target.x - threat.x;
            const dy = threat.target.y - threat.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist > 50) {
                threat.vx = (dx / dist) * threat.speed;
                threat.vy = (dy / dist) * threat.speed;
                threat.x += threat.vx * dt;
                threat.y += threat.vy * dt;
            } else {
                // At hive entrance, start attacking guards/stealing resources
                threat.state = 'raiding';
                // Simplified damage to hive
                this.hive.population -= dt * 0.1; // Slowly kill bees
                if (this.hive.population < 0) this.hive.population = 0;
            }
        }
    }

    update(dt) {
        this.updateThreats(dt);
    }

    render(ctx, view) {
        if (view.mode !== 'world') return;

        // Render Threats
        for (const threat of this.threats) {
            ctx.save();
            ctx.translate(threat.x, threat.y);

            // Point towards target
            const angle = Math.atan2(threat.target.y - threat.y, threat.target.x - threat.x);
            ctx.rotate(angle);

            ctx.fillStyle = threat.type === 'hornet' ? '#8b0000' : '#ffcc00'; // Dark red for hornet, yellow for wasp
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;

            ctx.beginPath();
            // Pointy body
            ctx.moveTo(10, 0);
            ctx.lineTo(-10, -5);
            ctx.lineTo(-15, 0);
            ctx.lineTo(-10, 5);
            ctx.closePath();

            ctx.fill();
            ctx.stroke();

            // Black stripes for wasp
            if(threat.type === 'wasp') {
                ctx.fillStyle = '#000';
                ctx.fillRect(-5, -4, 2, 8);
                ctx.fillRect(0, -3, 2, 6);
            }

            ctx.restore();
        }
    }
}

// --- Combat & Defense Helpers (Appended) ---
Simulation.prototype.updateCombat = function(dt) {
    if (this.threats.length === 0) return;

    // Guards intercept threats
    const guards = this.hive.bees.filter(b => b.role === 'guard');

    for (const threat of this.threats) {
        // Find guards close enough to attack
        for (const guard of guards) {
            // Simplified distance check (assuming hive view vs world view conversion)
            // In a real setup, bees in 'world' mode would have world coordinates.
            // For now, if threat is near hive (0,0), guards at entrance can attack.
            if (threat.state === 'raiding') {
                // Guard attacks threat
                threat.health -= guard.attackPower * dt;

                // Threat attacks guard back
                guard.health -= threat.attackPower * dt;

                // Alarm Pheromone
                if (!threat.alarmSounded) {
                    threat.alarmSounded = true;
                    // Recruit foragers or other bees near entrance to defend
                    const eventList = document.getElementById('event-list');
                    if (eventList) {
                        const li = document.createElement('li');
                        li.style.color = '#ffaa00';
                        li.innerText = `Guard sounded alarm! Defending hive!`;
                        eventList.prepend(li);
                    }
                }

                // Kamikaze sting logic (bees die after stinging mammals, but wasps/hornets can be stung multiple times)
                // We'll give a low chance for a guard to perform a lethal sting but die.
                if (Math.random() < 0.01 * dt) {
                    threat.health -= 50; // massive damage
                    guard.health = 0; // Guard dies
                }
            }
        }
    }
};

const originalSimUpdate = Simulation.prototype.update;
Simulation.prototype.update = function(dt) {
    originalSimUpdate.call(this, dt);
    this.updateCombat(dt);
};

// --- Environmental & Seasonal Events ---
Simulation.prototype.updateEnvironmentEvents = function(dt) {
    this.eventTimer += dt;

    // Check for weather changes every 30 game seconds
    if (this.eventTimer > 30) {
        this.eventTimer = 0;

        // Random rain chance
        if (Math.random() < 0.1 && this.world.season !== 'winter') {
            this.world.weather = 'rain';
            const eventList = document.getElementById('event-list');
            if (eventList) {
                const li = document.createElement('li');
                li.style.color = '#00aaff';
                li.innerText = `It started raining! Foragers are grounded.`;
                eventList.prepend(li);
            }
            // Ground foragers
            this.hive.bees.forEach(b => {
                if (b.role === 'forager' && b.state === 'foraging') {
                    b.state = 'returning'; // Force return
                }
            });
        } else if (this.world.weather === 'rain' && Math.random() < 0.5) {
            this.world.weather = 'clear';
        }
    }

    // Seasonal progression (Simplified: loop seasons based on total engine time)
    // 1 year = 24 * 30 days = ... Let's make seasons change every 5 minutes of real time for demo
    const totalTime = this.engine.lastTime / 1000;
    const seasonDuration = 300; // 5 minutes per season
    const cycle = Math.floor(totalTime / seasonDuration) % 4;

    const seasons = ['spring', 'summer', 'autumn', 'winter'];
    const currentSeason = seasons[cycle];

    if (this.world.season !== currentSeason) {
        this.world.season = currentSeason;

        // Update UI
        const sStat = document.getElementById('stat-season');
        if (sStat) sStat.innerText = (currentSeason.charAt(0).toUpperCase() + currentSeason.slice(1));

        // Winter effects
        if (currentSeason === 'winter') {
            // Evict drones
            const drones = this.hive.bees.filter(b => b.role === 'drone');
            drones.forEach(d => d.health = 0); // They die outside

            // Log
            const eventList = document.getElementById('event-list');
            if (eventList) {
                const li = document.createElement('li');
                li.style.color = '#ffffff';
                li.innerText = `Winter has arrived. Drones evicted. Prepare for the cold.`;
                eventList.prepend(li);
            }
        }
    }
};

const originalSimUpdateWithCombat = Simulation.prototype.update;
Simulation.prototype.update = function(dt) {
    originalSimUpdateWithCombat.call(this, dt);
    this.updateEnvironmentEvents(dt);
};
