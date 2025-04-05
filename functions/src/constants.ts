import { Timestamp } from "firebase/firestore";

export const units = ["Pcs", "grams", "liter"];

type DqqQuestionKey = `DQQ${number}`; // Matches keys like DQQ1, DQQ2, ..., DQQ99

export type DqqAnswersMap = {
  [K in DqqQuestionKey]?: boolean; // All keys are optional initially, store as boolean
};

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
