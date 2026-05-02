export const defaultMapTemplate = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 2, 0, 0, 0, 0, 0, 2, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
];

export const mapLayout = JSON.parse(JSON.stringify(defaultMapTemplate));
// Matriz mantida pela cópia profunda acima

export const gameState = {
    player: { x: 1, y: 1 },
    enemy: { x: 13, y: 13 },
    currentAlgorithm: 'astar', // 'astar' ou 'greedy'
    heuristic: 'strong',       // 'strong' ou 'weak'
    enemyTickRate: 500,        // Velocidade do inimigo em ms
    gamePhase: 'SETUP',        // 'SETUP' ou 'PLAYING'
    currentMap: 'default',     // 'default' ou 'custom'
    paintTool: 'erase',        // Ferramenta selecionada: 'erase', 'wall', 'slow', 'player', 'enemy'
    playerCooldown: 150,       // Cooldown de movimento do jogador em ms
    globalExpandedNodes: 0,
    globalPathCost: 0,
    globalExecutionTime: 0
};

export function setAlgorithm(algo) { gameState.currentAlgorithm = algo; }
export function setHeuristic(h) { gameState.heuristic = h; }
export function setTickRate(rate) { gameState.enemyTickRate = rate; }
export function setGamePhase(phase) { gameState.gamePhase = phase; }
export function setMap(mapType) { gameState.currentMap = mapType; }
export function setPaintTool(tool) { gameState.paintTool = tool; }
export function setPlayerCooldown(cooldown) { gameState.playerCooldown = cooldown; }

export function getAlgorithm() { return gameState.currentAlgorithm; }
export function getHeuristic() { return gameState.heuristic; }
export function getGamePhase() { return gameState.gamePhase; }

/**
 * Retorna as coordenadas de ambos os personagens ao padrão e zera a telemetria.
 */
export function resetState() {
    gameState.player = { x: 1, y: 1 };
    gameState.enemy = { x: 13, y: 13 };
    gameState.globalExpandedNodes = 0;
    gameState.globalPathCost = 0;
    gameState.globalExecutionTime = 0;
}

export function loadDefaultMap() {
    for (let y = 0; y < defaultMapTemplate.length; y++) {
        for (let x = 0; x < defaultMapTemplate[0].length; x++) {
            mapLayout[y][x] = defaultMapTemplate[y][x];
        }
    }
    resetState();
}

export function loadCustomMap() {
    for (let y = 0; y < mapLayout.length; y++) {
        for (let x = 0; x < mapLayout[0].length; x++) {
            if (y === 0 || y === mapLayout.length - 1 || x === 0 || x === mapLayout[0].length - 1) {
                mapLayout[y][x] = 1; // Bordas intransponíveis
            } else {
                mapLayout[y][x] = 0; // Limpa o interior
            }
        }
    }
    resetState();
}

export function applyPaintTool(x, y) {
    // Restrição de Bordas: Ignora qualquer clique na linha/coluna 0 ou máxima
    if (x === 0 || y === 0 || x === mapLayout[0].length - 1 || y === mapLayout.length - 1) {
        return false;
    }

    const tool = gameState.paintTool;
    const isPlayerPos = (x === gameState.player.x && y === gameState.player.y);
    const isEnemyPos = (x === gameState.enemy.x && y === gameState.enemy.y);
    const isWall = (mapLayout[y][x] === 1);

    if (tool === 'wall' || tool === 'slow') {
        if (isPlayerPos || isEnemyPos) return false;
        mapLayout[y][x] = tool === 'wall' ? 1 : 2;
    } else if (tool === 'erase') {
        mapLayout[y][x] = 0;
    } else if (tool === 'player') {
        if (isWall || isEnemyPos) return false;
        gameState.player.x = x;
        gameState.player.y = y;
    } else if (tool === 'enemy') {
        if (isWall || isPlayerPos) return false;
        gameState.enemy.x = x;
        gameState.enemy.y = y;
    }
    
    return true;
}

/**
 * Tenta mover o jogador para a nova direção.
 * @param {number} dx Deslocamento em X (-1, 0, 1)
 * @param {number} dy Deslocamento em Y (-1, 0, 1)
 * @returns {boolean} true se o movimento foi efetuado, false se bateu em parede.
 */
export function movePlayer(dx, dy) {
    const newX = gameState.player.x + dx;
    const newY = gameState.player.y + dy;

    // Verificação de limites de segurança (embora as bordas do mapa sejam paredes)
    if (newY < 0 || newY >= mapLayout.length || newX < 0 || newX >= mapLayout[0].length) {
        return false;
    }

    // Colisão: Verifica se a nova célula NÃO é uma parede (1)
    if (mapLayout[newY][newX] !== 1) {
        gameState.player.x = newX;
        gameState.player.y = newY;
        return true;
    }

    return false;
}

/**
 * Move o inimigo diretamente para uma coordenada específica (decidida pela IA).
 * @param {number} newX 
 * @param {number} newY 
 */
export function moveEnemy(newX, newY) {
    gameState.enemy.x = newX;
    gameState.enemy.y = newY;
}

/**
 * Verifica se o Inimigo alcançou o Jogador (Game Over).
 * @returns {boolean} true se as posições forem idênticas.
 */
export function checkGameOver() {
    return gameState.player.x === gameState.enemy.x && 
           gameState.player.y === gameState.enemy.y;
}
