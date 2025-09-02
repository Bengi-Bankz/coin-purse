// UI Game Control Helper
// Centralized management of UI controls based on game state

import type { Container, Sprite } from "pixi.js";
import type { GameState } from "../rgs/types";

export interface GameControls {
  betButtons?: Container[];
  playButton?: Container;
  cups?: Sprite[];
}

let currentControls: GameControls = {};

// Register UI controls for state management
export function registerGameControls(controls: GameControls): void {
  currentControls = controls;
  updateControlsForState(getCurrentGameState());
}

// Import game state getter
let getCurrentGameState: () => GameState;

export function setGameStateGetter(getter: () => GameState): void {
  getCurrentGameState = getter;
}

// Update all controls based on current game state
export function updateControlsForState(state: GameState): void {
  console.log(`Updating UI controls for state: ${state}`);

  const { betButtons, playButton, cups } = currentControls;

  switch (state) {
    case "rest":
      // Enable bet adjustment and play button, disable cups
      enableControls(betButtons);
      if (playButton) enableControls([playButton]);
      disableControls(cups);
      break;

    case "playing":
      // Disable all controls during animation
      disableControls(betButtons);
      if (playButton) disableControls([playButton]);
      disableControls(cups);
      break;

    case "awaiting_pick":
      // Only cups are clickable
      disableControls(betButtons);
      if (playButton) disableControls([playButton]);
      enableControls(cups);
      break;

    case "resolving":
      // Disable all controls during resolution
      disableControls(betButtons);
      if (playButton) disableControls([playButton]);
      disableControls(cups);
      break;

    default:
      console.warn(`Unknown game state: ${state}`);
  }
}

// Helper functions to enable/disable controls
function enableControls(controls?: (Container | Sprite)[]): void {
  if (!controls) return;

  controls.forEach((control) => {
    if (control) {
      control.interactive = true;
      control.eventMode = "static";
      control.cursor = "pointer";
      control.alpha = 1.0;
    }
  });
}

function disableControls(controls?: (Container | Sprite)[]): void {
  if (!controls) return;

  controls.forEach((control) => {
    if (control) {
      control.interactive = false;
      control.eventMode = "passive";
      control.cursor = "default";
      control.alpha = 0.6;
    }
  });
}

// Reset all controls (for cleanup)
export function resetControls(): void {
  const { betButtons, playButton, cups } = currentControls;

  // Reset all controls to default state
  if (betButtons) {
    betButtons.forEach((button) => {
      if (button) {
        button.removeAllListeners();
      }
    });
  }

  if (playButton) {
    playButton.removeAllListeners();
  }

  if (cups) {
    cups.forEach((cup) => {
      if (cup) {
        cup.removeAllListeners();
        cup.scale.set(1, 1); // Reset any hover scaling
      }
    });
  }
}
