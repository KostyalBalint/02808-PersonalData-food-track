import { Timestamp } from "firebase/firestore";
import z from "zod";

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

const ingredientToEat = z.object({
  name: z.string().describe("Name of the ingredient"),
});

export const RecommendationFlowOutput = z.object({
  categoriesToEat: z
    .object({
      wholeGrain: z
        .array(ingredientToEat)
        .describe(
          "Whole grains (like brown rice, whole wheat bread, whole grain cereal)",
        )
        .optional(),
      pulses: z
        .array(ingredientToEat)
        .describe("Pulses (beans, peas, lentils)")
        .optional(),

      vitaminAVegetable: z
        .array(ingredientToEat)
        .describe(
          "Vitamin A-rich orange vegetables (like carrots, pumpkin, orange sweet potatoes)",
        )
        .optional(),
      darkGreenVegetable: z
        .array(ingredientToEat)
        .describe(
          "Dark green leafy vegetables (like spinach, kale, local greens)",
        )
        .optional(),
      otherVegetable: z
        .array(ingredientToEat)
        .describe("Other vegetables (like tomatoes, onions, eggplant)")
        .optional(),

      vitaminAFruit: z
        .array(ingredientToEat)
        .describe("Vitamin A-rich fruits (like ripe mangoes, papayas)")
        .optional(),
      citrusFruit: z
        .array(ingredientToEat)
        .describe("Citrus fruits (like oranges, lemons, tangerines)")
        .optional(),
      otherFruit: z
        .array(ingredientToEat)
        .describe("Other fruits (like apples, bananas, grapes)")
        .optional(),

      protein: z
        .array(ingredientToEat)
        .describe("Any kind of meat, fish, or even eggs")
        .optional(),
      dairy: z
        .array(ingredientToEat)
        .describe("Cheese, Yogurt (including yogurt drinks), Milk")
        .optional(),

      nutsSeeds: z.array(ingredientToEat).describe("Nuts or Seeds").optional(),
    })
    .describe(
      "Food categories that would benefit the user's diet. Each category is optional, only include them if the user should consume food from that category",
    ),
});
export type RecommendationDoc = {
  id: string; // Firestore document ID
  userId: string;
  createdAt: Timestamp; // Firestore Timestamp
} & z.infer<typeof RecommendationFlowOutput>;
