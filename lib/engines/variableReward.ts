// ============================================================
// Variable Reward Engine
// Slot-machine psychology: 15% CRITICAL HIT, 25% DOUBLE XP, 60% base
// ============================================================

import { RewardRoll } from "../types";

export function rollReward(baseXP: number): RewardRoll {
  const roll = Math.random();

  if (roll < 0.15) {
    // CRITICAL HIT — 15% chance, 3x multiplier
    return {
      multiplier: 3,
      bonusType: "CRITICAL HIT",
      label: `CRITICAL HIT — ${baseXP * 3} XP`,
      color: "#ef4444", // red
    };
  }

  if (roll < 0.40) {
    // DOUBLE XP — 25% chance, 2x multiplier
    return {
      multiplier: 2,
      bonusType: "DOUBLE XP",
      label: `DOUBLE XP — ${baseXP * 2} XP`,
      color: "#fbbf24", // gold
    };
  }

  // Normal — 60% chance, 1x multiplier
  return {
    multiplier: 1,
    bonusType: null,
    label: `+${baseXP} XP`,
    color: "#ffffff",
  };
}
