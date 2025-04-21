// Input Schema for the *AI Flow* (receives processed history)
import * as z from "zod";
import { gemini20Flash } from "@genkit-ai/googleai";
import { googleAIApiKey } from "../googleAIApiKey.js";
import { ai } from "./ai.js";
import { MealDataSchema } from "./meal.types.js";
import { mergeDQQ_backend } from "../helpers/mergeDQQ.js";
import { dqqQuestions } from "../helpers/dqqQuestions.js";
import { calculatePercentage } from "../helpers/calculatePyramidData.js";
import { NutritionalData, RecommendationFlowOutput } from "../constants.js";

const AimedFoodGroupSchema = z.object({
  min: z.number().optional(),
  max: z.number().optional(),
});

// UserNutritionSettings schema
export const UserNutritionSettingsSchema = z.object({
  vegetables: AimedFoodGroupSchema.optional(), // corresponds to "Vegetables"
  carbohydrates: AimedFoodGroupSchema.optional(), // corresponds to "Grains"
  dairy: AimedFoodGroupSchema.optional(), // corresponds to "Dairy"
  protein: AimedFoodGroupSchema.optional(), // corresponds to "Meat"
  fats: AimedFoodGroupSchema.optional(), // corresponds to "FatsOils"
  sweets: AimedFoodGroupSchema.optional(), // corresponds to "Sweet"
});

export const MealHistoryInputSchema = z.object({
  meals: z
    .array(MealDataSchema)
    .describe(
      "List of meals eaten by the user in the last {historyDays} amount of days.",
    ),
  historyDays: z.number().describe("Number of days the history covers."),
  userNutritionSettings: UserNutritionSettingsSchema,
});

// --- Decoupled AI Flow ---
// This flow now focuses *only* on AI generation based on provided history.
export const generateRecommendationsFlow = ai.defineFlow(
  {
    name: "generateRecommendationsFlow",
    inputSchema: MealHistoryInputSchema, // Takes processed history
    outputSchema: RecommendationFlowOutput,
  },
  async (input) => {
    const { historyDays, meals, userNutritionSettings } =
      MealHistoryInputSchema.parse(input);

    const mealsStringify: string = meals
      .map((meal) => {
        const ingredients: string = meal.ingredients
          ? meal.ingredients
              .map((i) => ` - ${i.amount} ${i.unit} ${i.name}`)
              .join(`\n`)
          : `*No ingredients*`;
        return `**${meal.name}**\n${ingredients}`;
      })
      .join(`\n\n`);

    const dqqData = mergeDQQ_backend(
      meals.map((meal) => meal.dqqData?.answers),
    );

    const dqqString = dqqData
      ? dqqQuestions
          .map(([key, value]) => {
            if (key == "section") return `\n*${value}:*\n`;
            if (key == "divider") {
              return `--`;
            }
            return `${value}: ${String(dqqData[key as "DQQ1"]).toUpperCase()}`;
          })
          .join(`\n`)
      : "No DQQ data";

    const defaultNutritionData: NutritionalData = {
      Grains: 0,
      Vegetables: 0,
      Meat: 0,
      Dairy: 0,
      FatsOils: 0,
      Sweet: 0,
    };

    const mapCategory: {
      [key in keyof NutritionalData]: string;
    } = {
      Vegetables: "vegetables",
      Grains: "carbohydrates",
      Dairy: "dairy",
      Meat: "protein",
      FatsOils: "fats",
      Sweet: "sweets",
    };

    const consumedByCategory =
      meals.reduce((prev, current) => {
        if (current.nutrition) {
          return {
            Grains: prev.Grains + (current.nutrition.Grains ?? 0),
            Vegetables: prev.Vegetables + (current.nutrition.Vegetables ?? 0),
            Meat: prev.Meat + (current.nutrition.Meat ?? 0),
            Dairy: prev.Dairy + (current.nutrition.Dairy ?? 0),
            FatsOils: prev.FatsOils + (current.nutrition.FatsOils ?? 0),
            Sweet: prev.Sweet + (current.nutrition.Sweet ?? 0),
          };
        }
        return prev;
      }, defaultNutritionData) ?? defaultNutritionData;

    const aimedAmountsByCategory = {
      protein: {
        min: (userNutritionSettings.protein?.min ?? 0) * (historyDays - 1),
        max: (userNutritionSettings.protein?.max ?? 0) * (historyDays - 1),
      },
      carbohydrates: {
        min:
          (userNutritionSettings.carbohydrates?.min ?? 0) * (historyDays - 1),
        max:
          (userNutritionSettings.carbohydrates?.max ?? 0) * (historyDays - 1),
      },
      dairy: {
        min: (userNutritionSettings.dairy?.min ?? 0) * (historyDays - 1),
        max: (userNutritionSettings.dairy?.max ?? 0) * (historyDays - 1),
      },
      vegetables: {
        min: (userNutritionSettings.vegetables?.min ?? 0) * (historyDays - 1),
        max: (userNutritionSettings.vegetables?.max ?? 0) * (historyDays - 1),
      },
      fats: {
        min: (userNutritionSettings.fats?.min ?? 0) * (historyDays - 1),
        max: (userNutritionSettings.fats?.max ?? 0) * (historyDays - 1),
      },
      sweets: {
        min: (userNutritionSettings.sweets?.min ?? 0) * (historyDays - 1),
        max: (userNutritionSettings.sweets?.max ?? 0) * (historyDays - 1),
      },
    };

    const pyramidData = Object.keys(consumedByCategory).reduce(
      (prev, categoryKey) => {
        const consumedAmount =
          consumedByCategory[categoryKey as keyof NutritionalData];
        const percentage = calculatePercentage(
          // @ts-ignore
          mapCategory[categoryKey],
          consumedAmount,
          aimedAmountsByCategory,
        );

        return {
          ...prev,
          [categoryKey]: percentage,
        };
      },
      {},
    );

    const pyramidString = Object.entries(pyramidData)
      .map(([key, value]) => {
        return `${key}: ${Number(value).toFixed(1)} %`;
      })
      .join(`\n`);

    // 2. Construct the prompt for the AI model using provided history

    const systemPrompt = `
You are an AI nutritional assistant. Your task is to analyze a user's meal history over a specific period and recommend food categories they should consume more of to improve their dietary diversity and health, based on common dietary guidelines emphasizing variety across food groups.

You will receive the following input data:
1.  \`historyDays\`: A number representing the duration (in days) of the meal history provided.
2.  \`meals\`: An array of meal objects consumed by the user during this period. Each meal object contains:
    * \`name\`: The name of the meal.
    * \`ingredients\` (optional): A list of ingredients in the meal, including amount, unit, and name.

Your goal is to:
1.  Analyze the provided \`meals\` data, paying close attention to the \`dqqData\` answers across all meals to understand which food groups defined by the DQQ questions were frequently consumed and which were potentially missed or underconsumed over the \`{historyDays}\` day period.
2.  Identify specific healthy food categories where the user's intake appears insufficient for a balanced and diverse diet. Focus on the categories defined in the desired output structure (whole grains, pulses, different types of vegetables and fruits, protein sources, dairy, nuts/seeds).
3.  If the user is missing more than one category, select the category they lack the most according to the pyramid. For example, if the user is deficient in both vitamin A-rich vegetables and fish, but the pyramid shows they consume enough meat but not enough vegetables, then choose vitamin A-rich vegetables as the category.
4.  For the recommended category, provide specific ingredients belonging to that category.
Include ONLY those categories (e.g., \`wholeGrain\`, \`pulses\`, \`darkGreenVegetable\`, \`vitaminAFruit\`, \`dairy\`) in the \`categoriesToEat\` object that the user should eat MORE of, based on your analysis of the DQQ data. Specifically, if a DQQ category's corresponding \`answers\` field is frequently \`false\` across the meals during the history period, it is a strong candidate for recommendation. Conversely, if the user has consumed sufficiently from a category (i.e., the corresponding DQQ question is often \`true\`), DO NOT include that category in the output.5. 

For each category included in the \`categoriesToEat\` object, provide 8 - 12 concrete examples of food items belonging to that category using the \`ingredientToEat\` format (e.g., \`{ name: 'spinach' }\` for \`darkGreenVegetable\` or \`{ name: 'lentils' }\` for \`pulses\`). Choose common and readily available examples. Ensure the examples accurately match the categories' descriptions provided in the \`FlowOutputSchema\` (derived from the DQQ questions).`;
    // 3. Call the AI Model

    const prompt = `Here is the user's meal history for the past ${historyDays} days:

** MEALS **
${mealsStringify}

** Diet Quality Questioner Results **

For this period here these groups were consumed by the user. True means the user consumed that food category, and false means the user did NOT consume that. Categories between the dividers correspond to the same general food concept. If the user has consumed any from that group, try to prioritize other groups not consumed by the user. 

${dqqString}

** FOOD PYRAMID **

Food pyramid for the user. 100% means the user eats the required amount of that food category group. Less than 100% means that the user didn't eat enough from that category. And more than 100% means the user ate too much from that category. 

${pyramidString}
`;
    const llmResponse = await ai.generate({
      system: {
        text: systemPrompt,
      },
      prompt: {
        text: prompt,
      },
      model: gemini20Flash,
      output: { schema: RecommendationFlowOutput, format: "json" }, // Request JSON output matching schema
      config: {
        apiKey: googleAIApiKey.value(), // Consider passing API key via config if needed globally
      },
    });

    // Basic validation
    const output = llmResponse.output;
    if (!output || typeof output !== "object") {
      throw new Error("Invalid LLM output: Expected an object.");
    }

    // Optional: More rigorous validation against schema
    try {
      RecommendationFlowOutput.parse(output);
      console.log("[categorizeIngredientsFlow] Output validated successfully.");
    } catch (validationError) {
      console.error(
        "[generateRecommendationFlow] Output validation failed:",
        validationError,
      );
      // Decide how to handle: throw, return partial, return error structure, etc.
      throw new Error("LLM output failed schema validation.");
    }

    return output as z.infer<typeof RecommendationFlowOutput>;
  },
);
