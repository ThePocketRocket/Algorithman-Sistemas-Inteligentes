/**
 * input.js
 * Lida com a captura de eventos de teclado e controles virtuais (D-Pad).
 * Respeita o SRP (Responsabilidade Única) detectando os inputs e repassando
 * a intenção de movimento via callback.
 */

import { gameState, getGamePhase } from './state.js';

let lastMoveTime = 0;
let holdIntervalId = null;

function handleMoveInput(key, event, onMoveCallback) {
    if (getGamePhase() !== 'PLAYING') return;

    if (event && ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(key)) {
        event.preventDefault();
    }

    const now = Date.now();
    if (now - lastMoveTime < gameState.playerCooldown) {
        return; // Throttle
    }

    let dx = 0;
    let dy = 0;

    switch (key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
            dy = -1;
            break;
        case 'ArrowDown':
        case 's':
        case 'S':
            dy = 1;
            break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
            dx = -1;
            break;
        case 'ArrowRight':
        case 'd':
        case 'D':
            dx = 1;
            break;
        default:
            return;
    }

    lastMoveTime = now;
    onMoveCallback(dx, dy);
}

/**
 * Configura os listeners de teclado e botões virtuais.
 * @param {Function} onMoveCallback Função a ser chamada passando (dx, dy)
 */
export function setupInput(onMoveCallback) {
    // Teclado
    document.addEventListener('keydown', (event) => {
        handleMoveInput(event.key, event, onMoveCallback);
    });

    // D-Pad Virtuais
    const startMoving = (key) => (e) => {
        if (e.cancelable) e.preventDefault();
        
        handleMoveInput(key, null, onMoveCallback);
        
        if (holdIntervalId) clearInterval(holdIntervalId);
        holdIntervalId = setInterval(() => {
            handleMoveInput(key, null, onMoveCallback);
        }, 50);
    };

    const stopMoving = (e) => {
        if (e && e.cancelable) e.preventDefault();
        if (holdIntervalId) {
            clearInterval(holdIntervalId);
            holdIntervalId = null;
        }
    };

    const bindButton = (id, key) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('mousedown', startMoving(key));
        btn.addEventListener('touchstart', startMoving(key), {passive: false});
        
        btn.addEventListener('mouseup', stopMoving);
        btn.addEventListener('mouseleave', stopMoving);
        btn.addEventListener('touchend', stopMoving);
        btn.addEventListener('touchcancel', stopMoving);
    };

    bindButton('btnUp', 'ArrowUp');
    bindButton('btnDown', 'ArrowDown');
    bindButton('btnLeft', 'ArrowLeft');
    bindButton('btnRight', 'ArrowRight');
}
