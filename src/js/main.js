// Main entry point for The Hive Sovereign

import { Engine } from './engine.js';
import { HexGrid } from './hexgrid.js';
import { World } from './world.js';
import { Hive } from './hive.js';
import { Simulation } from './simulation.js';
import { UIManager } from './ui.js';
import { AudioManager } from './audio.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("The Hive Sovereign initializing...");

    // Initialize core engine
    const canvas = document.getElementById('game-canvas');
    const engine = new Engine(canvas);

    // Initialize managers and systems
    const hexGrid = new HexGrid(engine, 15);
    const world = new World(engine);
    const hive = new Hive(engine, hexGrid);
    const simulation = new Simulation(engine, hive, world);
    const ui = new UIManager(engine, hive, simulation);
    const audio = new AudioManager(engine);

    // Initial setup hook
    engine.on('init', () => {
        // Setup initial game state here
    });

    // Start the game loop
    engine.start();
});
