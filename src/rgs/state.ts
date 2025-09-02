// RGS state management
// Centralized game state and balance management for RGS operations

import type { GameState, EndRoundResponse, PlayResponse } from "./types";
import { authenticate, endRound, playRound, isActiveBetError } from "./api";

// Game state
let gamestate: GameState = "rest";
let response: PlayResponse | null = null;
let endRoundResponse: EndRoundResponse | null = null;
let balance: number = 1000;
let lastWin: number = 0;

// State getters
export function getGameState(): GameState {
  return gamestate;
}

export function getBalance(): number {
  return balance;
}

export function getLastWin(): number {
  return lastWin;
}

export function getLastResponse(): PlayResponse | null {
  return response;
}

export function getLastEndRoundResponse(): EndRoundResponse | null {
  return endRoundResponse;
}

// State transition functions with validation
export function setGameState(newState: GameState): void {
  const validTransitions: Record<GameState, GameState[]> = {
    rest: ["playing"],
    playing: ["awaiting_pick", "rest"], // rest for error cases
    awaiting_pick: ["resolving"],
    resolving: ["rest"],
  };

  if (!validTransitions[gamestate].includes(newState)) {
    console.warn(
      `RGS: Invalid state transition from ${gamestate} to ${newState}`,
    );
    return;
  }

  console.log(`RGS: State transition: ${gamestate} -> ${newState}`);
  gamestate = newState;
}

// Helper functions for state validation
export function canAdjustBet(): boolean {
  return gamestate === "rest";
}

export function canStartPlay(): boolean {
  return gamestate === "rest";
}

export function canPickCup(): boolean {
  return gamestate === "awaiting_pick";
}

// Initialize RGS session
export async function initializeRGS(): Promise<void> {
  try {
    const authResponse = await authenticate();
    balance = authResponse.balance.amount / 1000000; // API_MULTIPLIER
    console.log("RGS: Authenticated. Balance:", balance);
  } catch (error) {
    console.error("RGS: Authentication failed:", error);
    throw error;
  }
}

// Execute a game round with proper state management
export async function executeGameRound(
  betAmount: number = 1,
): Promise<PlayResponse> {
  try {
    if (!canStartPlay()) {
      throw new Error(`Cannot start play from state: ${gamestate}`);
    }

    // Deduct bet from balance and transition to playing
    balance -= betAmount;
    console.log("RGS: Balance deducted:", betAmount, "New balance:", balance);
    setGameState("playing");

    const playResponse = await playRound(betAmount);
    response = playResponse;
    endRoundResponse = null;

    // Process round result
    if (playResponse?.round?.payoutMultiplier !== undefined) {
      lastWin = playResponse.round.payoutMultiplier * betAmount;
    } else {
      lastWin = 0;
    }

    if (playResponse?.round?.state) {
      console.log("RGS: Round State:", playResponse.round.state);
    }

    console.log("RGS: Last Win:", lastWin);
    return playResponse;
  } catch (error) {
    if (isActiveBetError(error)) {
      console.log("RGS: Active bet detected, handling appropriately");
      throw error; // Re-throw to be handled by caller
    }

    console.error("RGS: Game round failed:", error);
    setGameState("rest");
    throw error;
  }
}

// End the current round and update balance
export async function finalizeRound(): Promise<EndRoundResponse> {
  try {
    const confirmation = await endRound();
    balance = confirmation.balance.amount / 1000000; // API_MULTIPLIER
    endRoundResponse = confirmation;

    if (confirmation.balance.amount != null) {
      setGameState("rest");
    }

    console.log("RGS: Round finalized. New balance:", balance);
    return confirmation;
  } catch (error) {
    console.error("RGS: Failed to finalize round:", error);
    throw error;
  }
}

// Transition to awaiting cup pick (called after animation completes)
export function setAwaitingPick(): void {
  setGameState("awaiting_pick");
}

// Start resolving phase (called when cup is picked)
export function startResolving(): void {
  setGameState("resolving");
}

// Handle loss (transition directly to rest without calling finalizeRound)
export function handleLoss(): void {
  setGameState("rest");
}

// TODO: Add retry logic for failed requests
// TODO: Add proper error categorization and handling
// TODO: Consider adding request timeout configuration
// TODO: Add balance validation and sync mechanisms
