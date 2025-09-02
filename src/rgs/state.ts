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
    if (gamestate === "rest") {
      balance -= betAmount;
      console.log("RGS: Balance deducted:", betAmount, "New balance:", balance);
    }

    const playResponse = await playRound(betAmount);
    response = playResponse;
    endRoundResponse = null;
    gamestate = "playing";

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
    gamestate = "rest";
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
      gamestate = "rest";
    }

    console.log("RGS: Round finalized. New balance:", balance);
    return confirmation;
  } catch (error) {
    console.error("RGS: Failed to finalize round:", error);
    throw error;
  }
}

// TODO: Add retry logic for failed requests
// TODO: Add proper error categorization and handling
// TODO: Consider adding request timeout configuration
// TODO: Add balance validation and sync mechanisms
