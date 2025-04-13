// src/types/FeatureFlagKeys.ts

// --- IMPORTANT ---
// Manually maintain this list to match the 'key' values of your flags in Firestore.
// This provides strong typing for the FeatureFlagGuard component.
// Example Keys:
export type FeatureFlagKeys =
  | "food-pyramid"
  | "meal-recommendations"
  | "why-home-empty-inform"
  | "meal-analysis"
  | "meal-list-dqq"
  | "dqq-questions-meal-page"
  | "food-nutrition-values"
  | "dds-score-over-time";
// Add your actual flag keys here as a union type (|)

// If you prefer less strict typing (e.g., for highly dynamic flags),
// you could change this to: export type FeatureFlagKeys = string;
// But you would lose compile-time safety on the guard prop.
