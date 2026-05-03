import { mapLayout, gameState, movePlayer, moveEnemy, checkGameOver, resetState, getGamePhase, setGamePhase, applyPaintTool, loadDefaultMap, loadCustomMap, loadAStarKillerMap, loadGreedyKillerMap, getHeuristic } from './state.js';
import { drawGrid, drawCharacters, drawAIPath, setupDashboard, setupGridClick, updateCell, disableBuilderControls, enableBuilderControls, updateTelemetry } from './ui.js';
import { setupInput } from './input.js';
import { calcularBuscaAStar, calcularBuscaGulosa, heuristicaForte, heuristicaFraca } from './ai.js';

document.addEventListener('DOMContentLoaded', () => {
    const gameContainer = document.getElementById('game-container');
    const gameOverModal = document.getElementById('gameOverModal');
    const btnRetry = document.getElementById('btnRetry');

    let enemyTimeoutId = null;

    function startGame() {
        setGamePhase('PLAYING');
        disableBuilderControls();
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
        }
        
        // Limpa visualização da IA e repinta os personagens em suas posições padrão (ui.js)
        drawAIPath(gameContainer, [], []);
        drawCharacters(gameContainer, gameState.player, gameState.enemy);
        updateTelemetry(0, 0, "0.00", 0, 0, "0.00");
        
        // Fecha o modal se estiver aberto
        gameOverModal.close();
        
        // Habilita os controles de construção
        enableBuilderControls();

        console.log("Fase: SETUP. Partida reiniciada. Aguardando Iniciar.");
    }

    // Inicializa a interface visual
    drawGrid(gameContainer, mapLayout);
    drawCharacters(gameContainer, gameState.player, gameState.enemy);

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
        }
        drawGrid(gameContainer, mapLayout);
        drawCharacters(gameContainer, gameState.player, gameState.enemy);
        drawAIPath(gameContainer, [], []); // Limpa a IA
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
            drawCharacters(gameContainer, gameState.player, gameState.enemy);
        }
    });

    btnRetry.addEventListener('click', restartGame);

    setupInput((dx, dy) => {
        if (getGamePhase() !== 'PLAYING') return;

        const moveuComSucesso = movePlayer(dx, dy);

        if (moveuComSucesso) {
            drawCharacters(gameContainer, gameState.player, gameState.enemy);
            
            if (checkGameOver()) {
                triggerGameOver();
            }
        }
    });

    function loopInimigo() {
        if (getGamePhase() !== 'PLAYING') return;

        // Troca Dinâmica de Algoritmo e Heurística
        const funcBusca = gameState.currentAlgorithm === 'astar' ? calcularBuscaAStar : calcularBuscaGulosa;
        const heuristicaEscolhida = getHeuristic() === 'weak' ? heuristicaFraca : heuristicaForte;
        
        const resultadoIA = funcBusca(mapLayout, gameState.enemy, gameState.player, heuristicaEscolhida);

        drawAIPath(gameContainer, resultadoIA.caminhoFinal, resultadoIA.nosExpandidos);

        // Dá o passo
        if (resultadoIA.caminhoFinal.length > 1) {
            const proxPasso = resultadoIA.caminhoFinal[1];
            
            // Soma o custo do terreno para a estatística global
            const cellVal = mapLayout[proxPasso.y][proxPasso.x];
            gameState.globalPathCost += (cellVal === 2 ? 5 : 1);

            moveEnemy(proxPasso.x, proxPasso.y);
            drawCharacters(gameContainer, gameState.player, gameState.enemy);
        }

        // Acumula Telemetria Global
        gameState.globalExpandedNodes += resultadoIA.nosExpandidos.length;
        gameState.globalExecutionTime += parseFloat(resultadoIA.tempoMs);

        updateTelemetry(
            resultadoIA.nosExpandidos.length, 
            resultadoIA.custoTotal, 
            resultadoIA.tempoMs,
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
            gameOverModal.show();
        }, 50);
    }
});
