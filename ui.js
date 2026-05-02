import { setAlgorithm, setTickRate, getAlgorithm, setMap, setPaintTool, setPlayerCooldown } from './state.js';

export function drawGrid(container, mapData) {
    container.innerHTML = '';
    const rows = mapData.length;
    const cols = mapData[0].length;

    container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            const cellValue = mapData[y][x];
            const cellDiv = document.createElement('div');
            cellDiv.classList.add('cell');
            cellDiv.classList.add(`cell-${cellValue}`);
            // Save coordinates in dataset for easy retrieval when drawing characters
            cellDiv.dataset.x = x;
            cellDiv.dataset.y = y;
            container.appendChild(cellDiv);
        }
    }
}

/**
 * Atualiza visualmente o terreno de uma única célula.
 */
export function updateCell(container, x, y, value) {
    const cell = container.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
        cell.className = cell.className.replace(/cell-\d+/g, '').trim();
        cell.classList.add(`cell-${value}`);
    }
}

/**
 * Configura o ouvinte de cliques no grid (Delegação de Eventos).
 */
export function setupGridClick(container, onCellClick) {
    container.addEventListener('click', (e) => {
        const cell = e.target.closest('.cell');
        if (!cell) return;
        const x = parseInt(cell.dataset.x, 10);
        const y = parseInt(cell.dataset.y, 10);
        onCellClick(x, y);
    });
}

export function drawCharacters(container, playerState, enemyState) {
    // Clear previous characters classes from cells
    const existingChars = container.querySelectorAll('.player, .enemy');
    existingChars.forEach(el => {
        el.classList.remove('player', 'enemy');
    });

    // Draw Player
    const playerCell = container.querySelector(`.cell[data-x="${playerState.x}"][data-y="${playerState.y}"]`);
    if (playerCell) {
        playerCell.classList.add('player');
    }

    // Draw Enemy
    const enemyCell = container.querySelector(`.cell[data-x="${enemyState.x}"][data-y="${enemyState.y}"]`);
    if (enemyCell) {
        enemyCell.classList.add('enemy');
    }
}

/**
 * Pinta na tela os nós expandidos pela IA e o caminho final escolhido.
 * @param {HTMLElement} container 
 * @param {Array} pathNodes Array de coordenadas do caminho final
 * @param {Array} expandedNodes Array de coordenadas de nós explorados
 */
export function drawAIPath(container, pathNodes, expandedNodes) {
    // 1. Limpa os visuais da IA do frame anterior
    const oldVisuals = container.querySelectorAll('.path-astar, .expanded-astar, .path-greedy, .expanded-greedy');
    oldVisuals.forEach(el => {
        el.classList.remove('path-astar', 'expanded-astar', 'path-greedy', 'expanded-greedy');
    });

    if (!pathNodes || !expandedNodes) return; // Permite limpar passando arrays vazios

    // Pega o algoritmo atual para decidir as cores
    const algo = getAlgorithm();
    const expandedClass = `expanded-${algo}`;
    const pathClass = `path-${algo}`;

    // 2. Pinta os nós expandidos (o "pensamento" da IA)
    expandedNodes.forEach(node => {
        const cell = container.querySelector(`.cell[data-x="${node.x}"][data-y="${node.y}"]`);
        if (cell) cell.classList.add(expandedClass);
    });

    // 3. Pinta o caminho final escolhido
    pathNodes.forEach(node => {
        const cell = container.querySelector(`.cell[data-x="${node.x}"][data-y="${node.y}"]`);
        if (cell) cell.classList.add(pathClass);
    });
}

/**
 * Configura os event listeners do painel de controle e atualiza o estado.
 * @param {Function} onPlayCallback Callback para iniciar/continuar a simulação
 * @param {Function} onRestartCallback Callback para reiniciar a simulação e voltar ao SETUP
 * @param {Function} onMapChangeCallback Callback para forçar o redesenho quando o mapa for alterado
 */
export function setupDashboard(onPlayCallback, onRestartCallback, onMapChangeCallback) {
    const sidebar = document.getElementById('sidebar');
    const btnOpenSidebar = document.getElementById('btnOpenSidebar');
    const btnCloseSidebar = document.getElementById('btnCloseSidebar');
    
    // Controles da Sidebar (Abertura / Fechamento)
    if (btnOpenSidebar && sidebar) {
        btnOpenSidebar.addEventListener('click', () => {
            sidebar.classList.add('open');
        });
    }
    if (btnCloseSidebar && sidebar) {
        btnCloseSidebar.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    const algoSelect = document.getElementById('algoSelect');
    const speedRange = document.getElementById('speedRange');
    const speedValue = document.getElementById('speedValue');
    const mapSelect = document.getElementById('mapSelect');
    const paintToolSelect = document.getElementById('paintToolSelect');
    const playerSpeedRange = document.getElementById('playerSpeedRange');
    const playerSpeedValue = document.getElementById('playerSpeedValue');
    const btnPlay = document.getElementById('btnPlay');
    const btnRestart = document.getElementById('btnRestart');

    algoSelect.addEventListener('change', (e) => setAlgorithm(e.target.value));

    speedRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        speedValue.textContent = val;
        setTickRate(val);
    });

    mapSelect.addEventListener('change', (e) => {
        setMap(e.target.value);
        if (onMapChangeCallback) onMapChangeCallback();
    });

    paintToolSelect.addEventListener('change', (e) => setPaintTool(e.target.value));

    playerSpeedRange.addEventListener('input', (e) => {
        const val = parseInt(e.target.value, 10);
        playerSpeedValue.textContent = val;
        setPlayerCooldown(val);
    });

    if (btnPlay && onPlayCallback) btnPlay.addEventListener('click', onPlayCallback);
    if (btnRestart && onRestartCallback) btnRestart.addEventListener('click', onRestartCallback);
}

/**
 * Desabilita os controles de edição de mapa durante a simulação.
 */
export function disableBuilderControls() {
    const mapSelect = document.getElementById('mapSelect');
    const paintToolSelect = document.getElementById('paintToolSelect');
    const btnPlay = document.getElementById('btnPlay');
    
    if (mapSelect) mapSelect.disabled = true;
    if (paintToolSelect) paintToolSelect.disabled = true;
    if (btnPlay) btnPlay.disabled = true; // Impede duplo clique de iniciar 2 loops
}

/**
 * Habilita os controles de edição de mapa ao reiniciar (SETUP).
 */
export function enableBuilderControls() {
    const mapSelect = document.getElementById('mapSelect');
    const paintToolSelect = document.getElementById('paintToolSelect');
    const btnPlay = document.getElementById('btnPlay');
    
    if (mapSelect) mapSelect.disabled = false;
    if (paintToolSelect) paintToolSelect.disabled = false;
    if (btnPlay) btnPlay.disabled = false;
}
