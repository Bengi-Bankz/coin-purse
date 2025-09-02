// RGS (Remote Game Server) type definitions
// Centralized type definitions for all RGS-related operations

export interface Balance {
  amount: number;
}

export interface AuthenticateResponse {
  balance: Balance;
}

export interface EndRoundResponse {
  balance: Balance;
}

export interface PlayRound {
  payoutMultiplier: number;
  state?: string;
}

export interface PlayResponse {
  balance: Balance;
  round: PlayRound;
}

export interface RgsError {
  error: string;
  message: string;
}

// Game state management
export type GameState = "rest" | "playing" | "awaiting_pick" | "resolving";

// RGS API configuration
export interface RgsConfig {
  apiMultiplier: number;
  rgsUrl: string | null;
  sessionID: string | null;
  language: string;
  currency: string | null;
  mode: string;
}
