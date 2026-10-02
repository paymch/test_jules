// Base Bee Class and Sub-Roles

export class Bee {
    constructor(hive, x, y) {
        this.hive = hive;

        // Transform & Movement
        this.x = x || 0;
        this.y = y || 0;
        this.vx = 0;
        this.vy = 0;
        this.speed = 50; // pixels per second
        this.target = null; // {x, y} or Cell

        // Biological Stats
        this.id = Math.random().toString(36).substring(2, 9);
        this.role = 'base';
        this.age = 0; // Days
        this.maxAge = 40; // Lifespan
        this.health = 100;
        this.maxHealth = 100;
        this.hunger = 0; // 0 (full) to 100 (starving)
        this.fatigue = 0; // 0 to 100

        // Inventory
        this.inventory = {
            nectar: 0,
            pollen: 0,
            water: 0
        };
        this.carryCapacity = 20;

        // State Machine
        this.state = 'idle'; // idle, moving, eating, working, sleeping

        // Visuals
        this.color = '#ffcc00';
        this.size = 5;
        this.heading = 0; // radians
    }

    update(dt) {
        // Base biological updates
        this.age += dt * 0.1; // Simulated time scaling
        this.hunger += dt * 0.5;

        if (this.hunger > 100) {
            this.health -= dt * 2; // Starvation damage
        }

        if (this.health <= 0) {
            this.die();
            return;
        }

        // Logic handled by subclasses or state machine
        this.updateState(dt);

        // Movement
        this.move(dt);
    }

    updateState(dt) {
        // Default behavior: wander or eat
        if (this.state === 'idle') {
            if (this.hunger > 50) {
                this.state = 'eating';
                // Find nearest honey cell (simplified for base class)
                // this.target = ...
            } else {
                // Random wander
                if (Math.random() < 0.05) {
                    this.target = {
                        x: this.x + (Math.random() - 0.5) * 100,
                        y: this.y + (Math.random() - 0.5) * 100
                    };
                }
            }
        }
    }

    move(dt) {
        if (!this.target) {
            this.vx *= 0.9; // Friction
            this.vy *= 0.9;
        } else {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const dist = Math.sqrt(dx*dx + dy*dy);

            if (dist < 2) {
                // Arrived
                this.x = this.target.x;
                this.y = this.target.y;
                this.vx = 0;
                this.vy = 0;
                this.target = null;
            } else {
                // Move towards target
                const dirX = dx / dist;
                const dirY = dy / dist;

                this.vx = dirX * this.speed;
                this.vy = dirY * this.speed;
                this.heading = Math.atan2(dirY, dirX);
            }
        }

        this.x += this.vx * dt;
        this.y += this.vy * dt;
    }

    die() {
        this.state = 'dead';
        if (this.hive) {
            this.hive.removeBee(this);
        }
    }

    render(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.heading);

        // Body
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.size, this.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(this.size * 0.7, 0, this.size * 0.4, 0, Math.PI * 2);
        ctx.fill();

        // Wings (simple representation)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.beginPath();
        ctx.ellipse(0, -this.size*0.5, this.size*0.8, this.size*0.3, Math.PI/6, 0, Math.PI*2);
        ctx.fill();
        ctx.beginPath();
        ctx.ellipse(0, this.size*0.5, this.size*0.8, this.size*0.3, -Math.PI/6, 0, Math.PI*2);
        ctx.fill();

        ctx.restore();
    }
}

// --- Specialized Roles ---

export class Queen extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'queen';
        this.size = 8;
        this.color = '#ff9900'; // Distinct color
        this.maxAge = 365 * 3; // 3 years
        this.speed = 20;
        this.state = 'laying';
        this.eggLayingRate = 2; // seconds per egg
        this.layTimer = 0;
    }

    updateState(dt) {
        if (this.state === 'laying') {
            this.layTimer += dt;
            if (this.layTimer >= this.eggLayingRate) {
                this.layTimer = 0;
                // Find empty brood cell to lay egg
                const cell = this.hive.findEmptyBroodCell(this.x, this.y);
                if (cell) {
                    this.target = { x: cell.x, y: cell.y };
                    if (this.x === cell.x && this.y === cell.y) {
                        cell.entity = { type: 'egg', age: 0 };
                        cell.type = 'brood';
                    }
                }
            }
        }
    }
}

export class Forager extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'forager';
        this.color = '#e6b800';
        this.speed = 80;
        this.state = 'idle'; // idle, exiting, foraging, returning, dancing
        this.worldTarget = null; // Flower patch
    }

    updateState(dt) {
        // Complex state machine will integrate with World Map
        if (this.state === 'idle') {
            // Check for dances or go scout
            this.state = 'exiting';
        }
    }
}

export class Nurse extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'nurse';
        this.color = '#ffeb99';
        this.speed = 40;
    }
}

export class Builder extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'builder';
        this.color = '#b38f00';
    }
}

export class Guard extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'guard';
        this.color = '#ff5500';
        this.size = 6;
        this.attackPower = 10;
    }
}

export class Drone extends Bee {
    constructor(hive, x, y) {
        super(hive, x, y);
        this.role = 'drone';
        this.color = '#664400';
        this.size = 7;
        this.speed = 30;
    }
}

// Vector Math and Pathfinding Helpers (Appended)
Bee.prototype.distanceTo = function(targetX, targetY) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    return Math.sqrt(dx * dx + dy * dy);
};

Bee.prototype.setTarget = function(x, y) {
    this.target = { x, y };
};

Bee.prototype.wander = function(radius) {
    if (!this.target) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * radius;
        this.target = {
            x: this.x + Math.cos(angle) * dist,
            y: this.y + Math.sin(angle) * dist
        };
    }
};
