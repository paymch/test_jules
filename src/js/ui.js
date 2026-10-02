export class UIManager {
    constructor(engine, hive, simulation) {
        this.engine = engine;
        this.hive = hive;
        this.simulation = simulation;

        this.setupEventListeners();
    }

    setupEventListeners() {
        const toggleBtn = document.getElementById('btn-toggle-view');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                if (this.engine.view.mode === 'hive') {
                    this.engine.view.mode = 'world';
                    toggleBtn.innerText = 'Switch to Hive View';
                } else {
                    this.engine.view.mode = 'hive';
                    toggleBtn.innerText = 'Switch to World View';
                }
            });
        }

        // Speed Controls
        const speeds = [
            { id: 'btn-speed-1x', mult: 1 },
            { id: 'btn-speed-2x', mult: 2 },
            { id: 'btn-speed-5x', mult: 5 },
            { id: 'btn-pause', mult: 0 }
        ];

        speeds.forEach(s => {
            const btn = document.getElementById(s.id);
            if (btn) {
                btn.addEventListener('click', () => {
                    this.engine.setSpeed(s.mult);

                    // Update active class
                    speeds.forEach(sp => {
                        const b = document.getElementById(sp.id);
                        if (b) b.classList.remove('active');
                    });
                    btn.classList.add('active');
                });
            }
        });

        // Close Inspect Modal
        const closeInspect = document.getElementById('btn-close-inspect');
        if (closeInspect) {
            closeInspect.addEventListener('click', () => {
                document.getElementById('inspect-modal').classList.add('hidden');
            });
        }
    }
}
