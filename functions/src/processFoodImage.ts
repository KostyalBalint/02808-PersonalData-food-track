import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { genkit } from "genkit";
import { googleAI, gemini20Flash } from "@genkit-ai/googleai";

// @ts-expect-error Only type import
import { MealData } from "../../src/constants";
import { FoodExtractSchema } from "./foodExtractSchema.js";

export const documentCreatedHandler = onDocumentCreated(
  "meals/{mealId}",
  async (event) => {
    const ai = genkit({ plugins: [googleAI()] });
    const meal = event.data?.data() as MealData;

    const { output } = await ai.generate({
      system:
        "Analyze the given food image and collect all the ingredient that the dish is made out of",
      model: gemini20Flash,
      prompt: { media: { url: meal.imageUrl } },
      output: {
        schema: FoodExtractSchema,
      },
    });

    return event.data?.ref.set(
      {
        ingredients: output?.ingredients.map((ingredient, index) => ({
          id: index,
          name: ingredient.name,
          amount: ingredient.amount,
          unit: ingredient.unit,
        })),
      } as Partial<MealData>,
      {
        merge: true,
      },
    );
  },
);
