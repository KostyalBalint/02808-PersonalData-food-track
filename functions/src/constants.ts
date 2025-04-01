import { Timestamp } from "firebase/firestore";

export const units = ["Pcs", "grams", "liter"];

export interface MealData {
  id: string;
  name: string;
  imageUrl: string;
  createdAt: Timestamp;
  ingredients?: { amount: number; unit: string; name: string; id: string }[];
  errorMessage?: string;
}
