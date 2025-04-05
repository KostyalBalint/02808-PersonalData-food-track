// src/types/FeatureFlag.ts

// Data stored *within* the Firestore document
export interface FeatureFlagData {
  name: string;
  description: string;
  value: boolean;
}

// The complete FeatureFlag object used in the application
export interface FeatureFlag extends FeatureFlagData {
  key: string; // Unique identifier (will be the Firestore document ID)
}
