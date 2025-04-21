import { Timestamp } from "firebase/firestore";
import { z } from "genkit";
import { RecommendationFlowOutput } from "./ai-flows/index.js";

export const units = ["Pcs", "grams", "ml"];

type DqqQuestionKey = `DQQ${number}`; // Matches keys like DQQ1, DQQ2, ..., DQQ99

export type DqqAnswersMap = {
  [K in DqqQuestionKey]?: boolean; // All keys are optional initially, store as boolean
};

export interface NutritionalData {
  Vegetables: number;
  Grains: number;
  Dairy: number;
  Meat: number;
  FatsOils: number;
  Sweet: number;
}

export interface MealData {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: Timestamp;
  ingredients?: { amount: number; unit: string; name: string; id: string }[];
  dqqData?: {
    answers: DqqAnswersMap;
    createdAt: Timestamp;
  };
  errorMessage?: string;
  withoutImage?: boolean; // Indicates if the meal was created without an image
  userId: string;
  nutrition?: NutritionalData; // Assuming this is part of the meal data
}

// Match the structure stored by the backend function
export interface Suggestion {
  mealName: string;
  reasoning: string;
  // foodGroups?: string[]; // Uncomment if added
}

export type RecommendationDoc = {
  id: string; // Firestore document ID
  userId: string;
  createdAt: Timestamp; // Firestore Timestamp
} & z.infer<typeof RecommendationFlowOutput>;
