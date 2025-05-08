import { DqqAnswersMap } from "./dqqQuestions";

interface NutritionSettings {
  protein: {
    max: number;
    min: number;
  };
  fruits: {
    max: number;
    min: number;
  };
  carbohydrates: {
    max: number;
    min: number;
  };
  fats: {
    min: number;
    max: number;
  };
  vegetables: {
    min: number;
    max: number;
  };
}

interface Demographics {
  Gender: number;
  Age: number;
}

export interface User {
  demographics: Demographics;
  role: string;
  email: string;
  nutritionSettings: NutritionSettings;
  uid: string;
  displayName: string;
}

interface Timestamp {
  seconds: number;
  nanoseconds: number;
}

interface DqqData {
  answers: DqqAnswersMap;
  createdAt: Timestamp;
}

interface Nutrition {
  Sweet: number;
  Meat: number;
  Grains: number;
  FatsOils: number;
  Vegetables: number;
  Dairy: number;
}

interface Ingredient {
  amount: number;
  categories: string[];
  id: string;
  unit: string;
  name: string;
}

export interface MealItem {
  createdAt: Timestamp;
  dqqData: DqqData;
  name: string;
  imageUrl: string;
  nutrition: Nutrition;
  userId: string;
  ingredients: Ingredient[];
}
