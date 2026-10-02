// Hexagonal Grid Engine using Axial Coordinates
// Reference for Hex Math: https://www.redblobgames.com/grids/hexagons/

export class HexGrid {
    constructor(engine, radius) {
        this.engine = engine;
        this.cells = new Map(); // Key: "q,r", Value: Cell Object
        this.hexSize = 30; // Radius of a single hexagon
        this.gridRadius = radius || 10;

        // Orientation: Pointy Top
        this.sqrt3 = Math.sqrt(3);

        this.generateGrid();

        // Register with engine for rendering and interactions
        this.engine.addSystem(this);
    }

    // --- Math & Coordinates ---

    // Convert axial (q, r) to pixel (x, y)
    axialToPixel(q, r) {
        const x = this.hexSize * this.sqrt3 * (q + r / 2);
        const y = this.hexSize * 3 / 2 * r;
        return { x, y };
    }

    // Convert pixel (x, y) to axial (q, r)
    pixelToAxial(x, y) {
        const q = (this.sqrt3 / 3 * x - 1 / 3 * y) / this.hexSize;
        const r = (2 / 3 * y) / this.hexSize;
        return this.axialRound(q, r);
    }

    // Round fractional axial coordinates to nearest hex
    axialRound(fq, fr) {
        return this.cubeToAxial(this.cubeRound(this.axialToCube(fq, fr)));
    }

    axialToCube(q, r) {
        return { x: q, y: -q - r, z: r };
    }

    cubeToAxial(cube) {
        return { q: cube.x, r: cube.z };
    }

    cubeRound(cube) {
        let rx = Math.round(cube.x);
        let ry = Math.round(cube.y);
        let rz = Math.round(cube.z);

        const xDiff = Math.abs(rx - cube.x);
        const yDiff = Math.abs(ry - cube.y);
        const zDiff = Math.abs(rz - cube.z);

        if (xDiff > yDiff && xDiff > zDiff) {
            rx = -ry - rz;
        } else if (yDiff > zDiff) {
            ry = -rx - rz;
        } else {
            rz = -rx - ry;
        }

        return { x: rx, y: ry, z: rz };
    }

    getKey(q, r) {
        return `${q},${r}`;
    }

    // Hex neighbor directions (Pointy Top)
    // 0: SE, 1: NE, 2: N, 3: NW, 4: SW, 5: S
    getNeighbor(q, r, direction) {
        const directions = [
            {q: 1, r: 0}, {q: 1, r: -1}, {q: 0, r: -1},
            {q: -1, r: 0}, {q: -1, r: 1}, {q: 0, r: 1}
        ];
        const dir = directions[direction];
        return { q: q + dir.q, r: r + dir.r };
    }

    getNeighbors(q, r) {
        const neighbors = [];
        for(let i=0; i<6; i++) {
            const n = this.getNeighbor(q, r, i);
            const key = this.getKey(n.q, n.r);
            if(this.cells.has(key)) {
                neighbors.push(this.cells.get(key));
            }
        }
        return neighbors;
    }

    // --- Grid Generation ---
    generateGrid() {
        for (let q = -this.gridRadius; q <= this.gridRadius; q++) {
            let r1 = Math.max(-this.gridRadius, -q - this.gridRadius);
            let r2 = Math.min(this.gridRadius, -q + this.gridRadius);
            for (let r = r1; r <= r2; r++) {
                this.addCell(q, r);
            }
        }
    }

    addCell(q, r) {
        const key = this.getKey(q, r);
        const center = this.axialToPixel(q, r);

        const cell = {
            q, r,
            x: center.x,
            y: center.y,
            type: 'empty', // empty, brood, honey, pollen
            contents: 0, // amount of nectar/honey/pollen
            maxContents: 100,
            temperature: 35, // Celsius
            entity: null // Egg, Larva, Pupa
        };

        this.cells.set(key, cell);
        return cell;
    }

    getCell(q, r) {
        return this.cells.get(this.getKey(q, r));
    }

    // --- Rendering ---

    // Draw a single pointy-topped hexagon
    drawHex(ctx, x, y, size, fillStyle, strokeStyle) {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            // Pointy top means angles are multiples of 60 degrees, offset by 30
            const angle_deg = 60 * i - 30;
            const angle_rad = Math.PI / 180 * angle_deg;
            const px = x + size * Math.cos(angle_rad);
            const py = y + size * Math.sin(angle_rad);
            if (i === 0) {
                ctx.moveTo(px, py);
            } else {
                ctx.lineTo(px, py);
            }
        }
        ctx.closePath();

        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
        if (strokeStyle) {
            ctx.strokeStyle = strokeStyle;
            ctx.stroke();
        }
    }

    update(dt) {
        // Grid logic updates (e.g. thermodynamics spreading) will go here
    }

    render(ctx, view) {
        if (view.mode !== 'hive') return;

        ctx.lineWidth = 1;

        // Render all hexes
        for (const [key, cell] of this.cells) {
            let fill = '#d4af37'; // Default beeswax color

            if (cell.type === 'honey') {
                const ratio = cell.contents / cell.maxContents;
                fill = `rgba(255, 165, 0, ${0.3 + (ratio * 0.7)})`; // More orange/solid when full
            } else if (cell.type === 'pollen') {
                fill = '#8b8000'; // Darker yellow/greenish
            } else if (cell.type === 'brood') {
                fill = '#e6c27a'; // Lighter wax
            } else if (cell.type === 'empty') {
                fill = 'rgba(212, 175, 55, 0.5)'; // Translucent wax
            }

            this.drawHex(ctx, cell.x, cell.y, this.hexSize, fill, '#b8860b');

            // Render entities inside (eggs, larvae)
            if (cell.entity) {
                ctx.fillStyle = '#fff'; // White for brood
                ctx.beginPath();
                // Simple representation based on entity type/age
                let radius = 5;
                if(cell.entity.type === 'larva') radius = 8;
                if(cell.entity.type === 'pupa') radius = 12;

                ctx.arc(cell.x, cell.y, radius, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }
}
