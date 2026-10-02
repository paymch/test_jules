import { Queen, Forager, Nurse, Builder, Guard, Drone } from './bee.js';

export class Hive {
    constructor(engine, hexGrid) {
        this.engine = engine;
        this.hexGrid = hexGrid;

        this.bees = [];
        this.population = 0;

        // Resources
        this.resources = {
            honey: 500,
            pollen: 200,
            wax: 100,
            water: 50
        };

        // Thermodynamics
        this.temperature = 35; // Ideal brood temp is 34.5 - 35.5 C

        // Spawn initial Queen and some workers
        this.spawnBee('queen', 0, 0);
        for(let i = 0; i < 5; i++) this.spawnBee('nurse', 10, 10);
        for(let i = 0; i < 5; i++) this.spawnBee('forager', -10, -10);
        for(let i = 0; i < 2; i++) this.spawnBee('builder', 0, 20);

        this.engine.addSystem(this);
    }

    // --- Entity Management ---
    spawnBee(role, x, y) {
        let bee;
        switch(role) {
            case 'queen': bee = new Queen(this, x, y); break;
            case 'forager': bee = new Forager(this, x, y); break;
            case 'nurse': bee = new Nurse(this, x, y); break;
            case 'builder': bee = new Builder(this, x, y); break;
            case 'guard': bee = new Guard(this, x, y); break;
            case 'drone': bee = new Drone(this, x, y); break;
            default: return;
        }
        this.bees.push(bee);
        this.population++;
        return bee;
    }

    removeBee(bee) {
        const index = this.bees.indexOf(bee);
        if (index > -1) {
            this.bees.splice(index, 1);
            this.population--;
        }
    }

    // --- Lifecycle Logic (Eggs -> Larvae -> Pupae -> Adult) ---
    updateLifecycle(dt) {
        // Lifecycle timings (in game time units/seconds)
        const EGG_TIME = 10;
        const LARVA_TIME = 20;
        const PUPA_TIME = 30;

        for (const [key, cell] of this.hexGrid.cells) {
            if (cell.type === 'brood' && cell.entity) {
                cell.entity.age += dt;

                if (cell.entity.type === 'egg' && cell.entity.age >= EGG_TIME) {
                    cell.entity.type = 'larva';
                    cell.entity.age = 0;
                } else if (cell.entity.type === 'larva' && cell.entity.age >= LARVA_TIME) {
                    // Requires feeding by nurses to proceed, simplifying for now
                    cell.entity.type = 'pupa';
                    cell.entity.age = 0;
                    cell.isCapped = true; // Wax cap
                } else if (cell.entity.type === 'pupa' && cell.entity.age >= PUPA_TIME) {
                    // Hatch into an adult bee
                    cell.entity = null;
                    cell.type = 'empty';
                    cell.isCapped = false;

                    // Determine role (simplified logic)
                    const rand = Math.random();
                    let role = 'nurse';
                    if(rand > 0.8) role = 'builder';
                    if(rand > 0.9) role = 'guard';

                    this.spawnBee(role, cell.x, cell.y);
                }
            }
        }
    }

    // Helper for Queen to find laying spots
    findEmptyBroodCell(x, y) {
        let closest = null;
        let minDist = Infinity;

        for (const [key, cell] of this.hexGrid.cells) {
            if (cell.type === 'empty' && !cell.entity) {
                const dx = cell.x - x;
                const dy = cell.y - y;
                const dist = dx*dx + dy*dy;
                if (dist < minDist) {
                    minDist = dist;
                    closest = cell;
                }
            }
        }
        return closest;
    }

    update(dt) {
        // Update all bees
        for (const bee of this.bees) {
            bee.update(dt);
        }

        this.updateLifecycle(dt);

        // Update Stats UI (Basic integration)
        const pStat = document.getElementById('stat-population');
        if (pStat) pStat.innerText = this.population;

        const hStat = document.getElementById('stat-honey');
        if (hStat) hStat.innerText = Math.floor(this.resources.honey);

        const polStat = document.getElementById('stat-pollen');
        if (polStat) polStat.innerText = Math.floor(this.resources.pollen);

        const tStat = document.getElementById('stat-temp');
        if (tStat) tStat.innerText = this.temperature.toFixed(1) + '°C';
    }

    render(ctx, view) {
        if (view.mode !== 'hive') return;

        // Render bees
        for (const bee of this.bees) {
            bee.render(ctx);
        }
    }
}

// --- Resource Processing & Thermodynamics Methods ---
Hive.prototype.updateResourceProcessing = function(dt) {
    // Process raw resources in cells
    for (const [key, cell] of this.hexGrid.cells) {
        if (cell.type === 'honey' && cell.contents > 0 && !cell.isCapped) {
            // Simulate Nectar Dehydration via wing fanning
            // Assumes 'contents' starts as raw nectar, slowly becomes concentrated honey
            const evaporationRate = 0.5 * dt;

            // In a deeper simulation, we'd track nectar water content,
            // but for now, we'll just slowly add to global honey pool and cap it
            if (cell.contents >= cell.maxContents) {
                cell.isCapped = true;
                this.resources.honey += 10; // Yield
            } else {
                // If bees deposited nectar, it slowly turns to honey
                // This will be expanded when foragers deposit nectar
            }
        }

        if (cell.type === 'pollen' && cell.contents > 0) {
            // Fermentation to Bee Bread
            // Also simplified: foragers deposit pollen, over time it ferments
            if (cell.contents >= cell.maxContents) {
                this.resources.pollen += 5; // Yield
                cell.contents = 0; // consumed into global pool for simplicity
                cell.type = 'empty';
            }
        }
    }
};

// Hook into update
const originalUpdate = Hive.prototype.update;
Hive.prototype.update = function(dt) {
    originalUpdate.call(this, dt);
    this.updateResourceProcessing(dt);
};

Hive.prototype.updateThermodynamics = function(dt) {
    // Basic thermodynamics
    // Outside temp wants to equalize with inside temp
    const ambientTemp = 20; // Depending on season/weather
    const insulationFactor = 0.05; // Heat lost/gained per second

    // Bees generate heat
    const heatGenerated = this.population * 0.01;

    // Calculate new temp
    const tempDiff = ambientTemp - this.temperature;
    this.temperature += (tempDiff * insulationFactor * dt) + (heatGenerated * dt);

    // Bees react to extreme temperatures
    if (this.temperature > 37) {
        // Bees need to cool the hive (fanning/water evaporation)
        // Consume water to cool
        if (this.resources.water > 0) {
            this.resources.water -= dt * 0.5;
            this.temperature -= dt * 0.5; // Cooling effect
        } else {
            // Overheating damage
            this.resources.honey -= dt; // Stress consumption
        }
    } else if (this.temperature < 32) {
        // Bees need to heat the hive (shivering)
        // Consume honey to generate heat
        if (this.resources.honey > 0) {
            this.resources.honey -= dt * 1;
            this.temperature += dt * 0.5; // Heating effect
        }
    }

    // Distribute temp to individual cells (simplified)
    for (const [key, cell] of this.hexGrid.cells) {
        cell.temperature = this.temperature;
    }
};

const originalUpdateWithProcessing = Hive.prototype.update;
Hive.prototype.update = function(dt) {
    originalUpdateWithProcessing.call(this, dt);
    this.updateThermodynamics(dt);
};
