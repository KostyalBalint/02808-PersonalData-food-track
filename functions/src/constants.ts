import { Timestamp } from "firebase/firestore";
import { DqqAnswersMap } from "../../src/components/DqqCalculator/dqqQuestions.js";

export const units = ["Pcs", "grams", "liter"];

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
}
