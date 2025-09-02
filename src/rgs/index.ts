// RGS (Remote Game Server) module
// Main entry point for all RGS functionality

// Export types
export type {
  Balance,
  AuthenticateResponse,
  EndRoundResponse,
  PlayRound,
  PlayResponse,
  RgsError,
  GameState,
  RgsConfig,
} from "./types";

// Export API functions
export {
  createRgsConfig,
  getRGSResponse,
  authenticate,
  endRound,
  playRound,
  isActiveBetError,
} from "./api";

// Export state management
export {
  getGameState,
  getBalance,
  getLastWin,
  getLastResponse,
  getLastEndRoundResponse,
  initializeRGS,
  executeGameRound,
  finalizeRound,
  setGameState,
  canAdjustBet,
  canStartPlay,
  canPickCup,
  setAwaitingPick,
  startResolving,
  handleLoss,
} from "./state";
