// UI State Manager
// Handles enabling/disabling UI components based on centralized game state

import type { Container, Sprite } from "pixi.js";
import {
  getGameState,
  canAdjustBet,
  canStartPlay,
  canPickCup,
} from "../rgs/state";

export interface UIComponents {
  betMinusButton: Container;
  betPlusButton: Container;
  playButton: Container;
  cupSprites: Sprite[];
}

// Update UI component states based on current game state
export function updateUIStates(components: UIComponents): void {
  const gameState = getGameState();
  const { betMinusButton, betPlusButton, playButton, cupSprites } = components;

  // Bet adjustment buttons - only enabled in rest state
  const betEnabled = canAdjustBet();
  setBetButtonsEnabled(betMinusButton, betPlusButton, betEnabled);

  // Play button - only enabled in rest state
  const playEnabled = canStartPlay();
  setPlayButtonEnabled(playButton, playEnabled);

  // Cup selection - only enabled in awaiting_pick state
  const cupsEnabled = canPickCup();
  setCupsEnabled(cupSprites, cupsEnabled);

  console.log(`UI: Updated states for game state: ${gameState}`, {
    betEnabled,
    playEnabled,
    cupsEnabled,
  });
}

function setBetButtonsEnabled(
  minusButton: Container,
  plusButton: Container,
  enabled: boolean,
): void {
  [minusButton, plusButton].forEach((button) => {
    button.eventMode = enabled ? "static" : "none";
    button.cursor = enabled ? "pointer" : "default";
    button.alpha = enabled ? 1.0 : 0.5;
  });
}

function setPlayButtonEnabled(playButton: Container, enabled: boolean): void {
  playButton.eventMode = enabled ? "static" : "none";
  playButton.cursor = enabled ? "pointer" : "default";
  playButton.alpha = enabled ? 1.0 : 0.5;
}

function setCupsEnabled(cupSprites: Sprite[], enabled: boolean): void {
  cupSprites.forEach((cup) => {
    cup.eventMode = enabled ? "static" : "none";
    cup.cursor = enabled ? "pointer" : "default";
    cup.interactive = enabled;
    if (!enabled) {
      // Remove any hover effects when disabled
      cup.removeAllListeners("pointerover");
      cup.removeAllListeners("pointerout");
      // Reset scale in case it was hovered
      cup.scale.set(1, 1);
    }
  });
}
