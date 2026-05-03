import { mapLayout, gameState, movePlayer, moveEnemy, checkGameOver, resetState, getGamePhase, setGamePhase, applyPaintTool, loadDefaultMap, loadCustomMap, loadAStarKillerMap, loadGreedyKillerMap, getHeuristic, generateDots, collectDot, loadShowdownMap } from './state.js';
import { drawGrid, drawCharacters, drawAIPath, clearAIVisuals, setupDashboard, setupGridClick, updateCell, disableBuilderControls, enableBuilderControls, updateTelemetry, drawDots } from './ui.js';
import { setupInput } from './input.js';
import { calcularBuscaAStar, calcularBuscaGulosa, heuristicaForte, heuristicaFraca } from './ai.js';

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const gameOverModal = document.getElementById('gameOverModal');
    const winModal = document.getElementById('winModal');
    const btnRetry = document.getElementById('btnRetry');
    const btnNext = document.getElementById('btnNext');

    let enemyTimeoutId = null;

    function startGame() {
        setGamePhase('PLAYING');
        disableBuilderControls();
        generateDots();
        drawDots(gameContainer, gameState.dots);
        console.log("Fase: PLAYING! Fuja do inimigo!");
        loopInimigo();
    }

    // Função de Reinício coordenada pelo main.js (Controlador)
    function restartGame() {
        if (enemyTimeoutId) clearTimeout(enemyTimeoutId);
        
        // Volta para a fase de SETUP
        setGamePhase('SETUP');
        
        // Reseta as coordenadas (state.js)
        resetState();
        // Recarrega o mapa atual para garantir posições específicas se for cenário
        if (gameState.currentMap === 'default') {
            loadDefaultMap();
        } else if (gameState.currentMap === 'custom') {
            loadCustomMap();
        } else if (gameState.currentMap === 'astarkiller') {
            loadAStarKillerMap();
        } else if (gameState.currentMap === 'greedykiller') {
            loadGreedyKillerMap();
        } else if (gameState.currentMap === 'showdown') {
            loadShowdownMap();
        }
        
        // Limpa visualização da IA e repinta os personagens em suas posições padrão (ui.js)
        clearAIVisuals(gameContainer);
        drawDots(gameContainer, []);
        drawCharacters(gameContainer, gameState.player, gameState.enemies);
        updateTelemetry(0, 0, "0.00", 0, 0, "0.00");
        
        // Fecha o modal se estiver aberto
        gameOverModal.classList.add('hidden');
        if (winModal) winModal.classList.add('hidden');
        
        // Habilita os controles de construção
        enableBuilderControls();

        console.log("Fase: SETUP. Partida reiniciada. Aguardando Iniciar.");
    }

    // Inicializa a interface visual
    drawGrid(gameContainer, mapLayout);
    drawCharacters(gameContainer, gameState.player, gameState.enemies);

    // Conecta o dashboard passando as funções de Play, Restart e Mudança de Mapa
    setupDashboard(startGame, restartGame, () => {
        // Ao mudar o mapa no select, o estado chama setMap().
        // Aqui reagimos desenhando o mapa atualizado.
        if (gameState.currentMap === 'default') {
            loadDefaultMap();
        } else if (gameState.currentMap === 'custom') {
            loadCustomMap();
        } else if (gameState.currentMap === 'astarkiller') {
            loadAStarKillerMap();
        } else if (gameState.currentMap === 'greedykiller') {
            loadGreedyKillerMap();
        } else if (gameState.currentMap === 'showdown') {
            loadShowdownMap();
        }
        drawGrid(gameContainer, mapLayout);
        drawCharacters(gameContainer, gameState.player, gameState.enemies);
        clearAIVisuals(gameContainer); // Limpa a IA
    });

    // Conecta o clique no grid para o Construtor
    setupGridClick(gameContainer, (x, y) => {
        if (getGamePhase() !== 'SETUP') return;

        const mudou = applyPaintTool(x, y);
        if (mudou) {
            // Se pintou terreno, atualiza a célula
            if (['wall', 'slow', 'erase'].includes(gameState.paintTool)) {
                updateCell(gameContainer, x, y, mapLayout[y][x]);
            }
            // Como pode ter colocado jogador ou inimigo em cima de paredes (e apagado a parede),
            // a forma mais segura é atualizar a célula também e redesenhar os personagens
            updateCell(gameContainer, x, y, mapLayout[y][x]);
            drawCharacters(gameContainer, gameState.player, gameState.enemies);
        }
    });

    btnRetry.addEventListener('click', restartGame);
    if (btnNext) btnNext.addEventListener('click', restartGame);

    setupInput((dx, dy) => {
        if (getGamePhase() !== 'PLAYING') return;

        const moveuComSucesso = movePlayer(dx, dy);

        if (moveuComSucesso) {
            drawCharacters(gameContainer, gameState.player, gameState.enemies);
            
            const venceu = collectDot(gameState.player.x, gameState.player.y);
            drawDots(gameContainer, gameState.dots);
            
            if (venceu) {
                triggerVictory();
            } else if (checkGameOver()) {
                triggerGameOver();
            }
        }
    });

    function loopInimigo() {
        if (getGamePhase() !== 'PLAYING') return;

        let iterExpandedNodes = 0;
        let iterCost = 0;
        let iterTimeMs = 0;

        clearAIVisuals(gameContainer);

        gameState.enemies.forEach((enemy, index) => {
            let funcBusca;
            // O inimigo genérico (e1) obedece ao dropdown da UI. Os demais seguem seu type próprio.
            if (enemy.id === 'e1') {
                funcBusca = gameState.currentAlgorithm === 'astar' ? calcularBuscaAStar : calcularBuscaGulosa;
            } else {
                funcBusca = enemy.type === 'astar' ? calcularBuscaAStar : calcularBuscaGulosa;
            }

            const heuristicaEscolhida = enemy.id === 'e1' ? (getHeuristic() === 'weak' ? heuristicaFraca : heuristicaForte) : heuristicaForte;
            const resultadoIA = funcBusca(mapLayout, enemy, gameState.player, heuristicaEscolhida);

            const algoToDraw = enemy.id === 'e1' ? gameState.currentAlgorithm : enemy.type;
            drawAIPath(gameContainer, resultadoIA.caminhoFinal, resultadoIA.nosExpandidos, algoToDraw);

            if (resultadoIA.caminhoFinal.length > 1) {
                const proxPasso = resultadoIA.caminhoFinal[1];
                const cellVal = mapLayout[proxPasso.y][proxPasso.x];
                gameState.globalPathCost += (cellVal === 2 ? 5 : 1);
                moveEnemy(index, proxPasso.x, proxPasso.y);
            }

            iterExpandedNodes += resultadoIA.nosExpandidos.length;
            iterCost += resultadoIA.custoTotal;
            iterTimeMs += parseFloat(resultadoIA.tempoMs);
            gameState.globalExpandedNodes += resultadoIA.nosExpandidos.length;
            gameState.globalExecutionTime += parseFloat(resultadoIA.tempoMs);
        });

        drawCharacters(gameContainer, gameState.player, gameState.enemies);

        updateTelemetry(
            iterExpandedNodes, 
            iterCost, 
            iterTimeMs.toFixed(2),
            gameState.globalExpandedNodes,
            gameState.globalPathCost,
            gameState.globalExecutionTime.toFixed(2)
        );

        if (checkGameOver()) {
            triggerGameOver();
        } else {
            // Tickrate Dinâmico
            enemyTimeoutId = setTimeout(loopInimigo, gameState.enemyTickRate);
        }
    }

    function triggerGameOver() {
        setGamePhase('SETUP'); // Para tudo
        if (enemyTimeoutId) clearTimeout(enemyTimeoutId);
        
        setTimeout(() => {
            gameOverModal.classList.remove('hidden');
        }, 50);
    }

    function triggerVictory() {
        setGamePhase('SETUP'); // Para tudo
        if (enemyTimeoutId) clearTimeout(enemyTimeoutId);
        
        setTimeout(() => {
            if (winModal) winModal.classList.remove('hidden');
        }, 50);
    }
});
