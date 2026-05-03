/**
 * ai.js
 * 
 * Este arquivo é responsável estritamente pela lógica de Inteligência Artificial e 
 * algoritmos de busca de caminhos (Pathfinding). Ele NÃO manipula a interface gráfica (DOM), 
 * respeitando o Princípio de Responsabilidade Única (SOLID).
 */

// ==========================================
// HEURÍSTICAS
// ==========================================

/**
 * Heurística Forte: Distância de Manhattan.
 * Esta heurística calcula a distância real entre dois pontos em um grid
 * assumindo que só podemos nos mover ortogonalmente (cima, baixo, esquerda, direita).
 * É considerada "forte" porque não superestima o custo real e guia a busca
 * diretamente para o alvo com alta precisão num grid sem paredes.
 * 
 * @param {Object} a - Nó atual {x, y}
 * @param {Object} b - Nó objetivo {x, y}
 * @returns {number} Custo heurístico estimado
 */
export function heuristicaForte(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

/**
 * Heurística Fraca: Heurística Nula ou de Custo Zero.
 * Esta heurística ignora completamente a distância até o objetivo.
 * Se utilizada no A*, faz com que o algoritmo degenere para o Algoritmo de Dijkstra 
 * (busca cega focada apenas no custo acumulado). Se utilizada na Busca Gulosa,
 * transforma a busca quase em uma busca aleatória dependendo de como a fila é lida.
 * 
 * @returns {number} Retorna sempre 0
 */
export function heuristicaFraca() {
    return 0;
}

// ==========================================
// FUNÇÕES AUXILIARES
// ==========================================

/**
 * Retorna o custo de se mover para uma determinada célula.
 */
function getCost(mapData, x, y) {
    const cellValue = mapData[y][x];
    if (cellValue === 0) return 1; // Caminho livre
    if (cellValue === 2) return 5; // Zona de lentidão
    return Infinity;               // Parede (intransponível)
}

/**
 * Verifica se uma coordenada é válida (dentro dos limites e não é parede).
 */
function isValid(mapData, x, y) {
    if (y < 0 || y >= mapData.length || x < 0 || x >= mapData[0].length) return false;
    return mapData[y][x] !== 1;
}

/**
 * Retorna os vizinhos válidos adjacentes a um nó (Cima, Baixo, Esquerda, Direita).
 */
function getNeighbors(mapData, node) {
    const neighbors = [];
    const directions = [
        { dx: 0, dy: -1 }, // Cima
        { dx: 0, dy: 1 },  // Baixo
        { dx: -1, dy: 0 }, // Esquerda
        { dx: 1, dy: 0 }   // Direita
    ];

    for (const dir of directions) {
        const nx = node.x + dir.dx;
        const ny = node.y + dir.dy;

        if (isValid(mapData, nx, ny)) {
            neighbors.push({
                x: nx,
                y: ny,
                cost: getCost(mapData, nx, ny)
            });
        }
    }
    return neighbors;
}

/**
 * Reconstrói o caminho do objetivo até o início seguindo a cadeia "cameFrom".
 */
function reconstructPath(nodeData, goalKey) {
    const path = [];
    let currentKey = goalKey;

    while (currentKey) {
        const node = nodeData[currentKey];
        path.unshift({ x: node.x, y: node.y });
        currentKey = node.cameFromKey;
    }
    return path;
}

// ==========================================
// ALGORITMOS DE BUSCA
// ==========================================

/**
 * Busca A* (A-Star)
 * Algoritmo ótimo e completo. Leva em consideração tanto o custo já percorrido (g)
 * quanto o custo estimado para o objetivo (h).
 * 
 * @param {Array<Array<number>>} mapData Matriz do mapa
 * @param {Object} startNode Coordenadas iniciais {x, y}
 * @param {Object} goalNode Coordenadas objetivo {x, y}
 * @param {Function} heuristica Função heurística (Opcional, default: heuristicaForte)
 */
export function calcularBuscaAStar(mapData, startNode, goalNode, heuristica = heuristicaForte) {
    const t0 = performance.now();
    let openSet = []; // Fronteira de nós a serem avaliados
    const closedSet = new Set(); // Nós já avaliados
    const nodeData = {}; // Dicionário que guarda as informações de cada nó visitado
    const nosExpandidos = []; // Registro de expansão para análise e visualização

    const startKey = `${startNode.x},${startNode.y}`;
    nodeData[startKey] = {
        x: startNode.x,
        y: startNode.y,
        g: 0,
        h: heuristica(startNode, goalNode),
        f: heuristica(startNode, goalNode),
        cameFromKey: null
    };

    openSet.push(startKey);

    while (openSet.length > 0) {
        // Ordena a fronteira pelo menor custo F (F = G + H) e pega o primeiro
        openSet.sort((a, b) => nodeData[a].f - nodeData[b].f);
        const currentKey = openSet.shift();
        const current = nodeData[currentKey];

        // Registra o nó expandido
        nosExpandidos.push({ x: current.x, y: current.y });

        // Condição de parada: chegou ao objetivo
        if (current.x === goalNode.x && current.y === goalNode.y) {
            const t1 = performance.now();
            return {
                caminhoFinal: reconstructPath(nodeData, currentKey),
                nosExpandidos,
                custoTotal: current.g,
                tempoMs: (t1 - t0).toFixed(2)
            };
        }

        closedSet.add(currentKey);

        const neighbors = getNeighbors(mapData, { x: current.x, y: current.y });

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;

            // Calcula o custo exato do caminho até este vizinho (g)
            const tentative_g = current.g + neighbor.cost;

            // Se é um vizinho novo ou achamos um caminho melhor até ele
            if (!nodeData[neighborKey] || tentative_g < nodeData[neighborKey].g) {
                const h = heuristica(neighbor, goalNode);
                nodeData[neighborKey] = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: tentative_g,
                    h: h,
                    f: tentative_g + h,
                    cameFromKey: currentKey
                };

                if (!openSet.includes(neighborKey)) {
                    openSet.push(neighborKey);
                }
            }
        }
    }

    // Retorna vazio caso não encontre um caminho
    const t1 = performance.now();
    return { caminhoFinal: [], nosExpandidos, custoTotal: 0, tempoMs: (t1 - t0).toFixed(2) };
}

/**
 * Busca Gulosa (Greedy Best-First Search)
 * Algoritmo rápido mas não garante o caminho mais curto. 
 * Avalia apenas o custo heurístico estimado (h), ignorando o custo já percorrido (g).
 * 
 * @param {Array<Array<number>>} mapData Matriz do mapa
 * @param {Object} startNode Coordenadas iniciais {x, y}
 * @param {Object} goalNode Coordenadas objetivo {x, y}
 * @param {Function} heuristica Função heurística (Opcional, default: heuristicaForte)
 */
export function calcularBuscaGulosa(mapData, startNode, goalNode, heuristica = heuristicaForte) {
    const t0 = performance.now();
    let openSet = [];
    const closedSet = new Set();
    const nodeData = {};
    const nosExpandidos = [];

    const startKey = `${startNode.x},${startNode.y}`;
    nodeData[startKey] = {
        x: startNode.x,
        y: startNode.y,
        g: 0,
        h: heuristica(startNode, goalNode),
        cameFromKey: null
    };

    openSet.push(startKey);

    while (openSet.length > 0) {
        // Ordena a fronteira APENAS pela heurística (h), essa é a essência da Busca Gulosa
        openSet.sort((a, b) => nodeData[a].h - nodeData[b].h);
        const currentKey = openSet.shift();
        const current = nodeData[currentKey];

        nosExpandidos.push({ x: current.x, y: current.y });

        if (current.x === goalNode.x && current.y === goalNode.y) {
            const t1 = performance.now();
            return {
                caminhoFinal: reconstructPath(nodeData, currentKey),
                nosExpandidos,
                custoTotal: current.g,
                tempoMs: (t1 - t0).toFixed(2)
            };
        }

        closedSet.add(currentKey);

        const neighbors = getNeighbors(mapData, { x: current.x, y: current.y });

        for (const neighbor of neighbors) {
            const neighborKey = `${neighbor.x},${neighbor.y}`;
            if (closedSet.has(neighborKey)) continue;

            const g = current.g + neighbor.cost;

            // Diferente do A*, a busca gulosa não reavalia nós já na fronteira
            // se o G for menor, porque ela não liga para o G.
            if (!openSet.includes(neighborKey)) {
                nodeData[neighborKey] = {
                    x: neighbor.x,
                    y: neighbor.y,
                    g: g, // Mantido apenas para calcular o custo total final
                    h: heuristica(neighbor, goalNode),
                    cameFromKey: currentKey
                };
                openSet.push(neighborKey);
            }
        }
    }

    const t1 = performance.now();
    return { caminhoFinal: [], nosExpandidos, custoTotal: 0, tempoMs: (t1 - t0).toFixed(2) };
}
