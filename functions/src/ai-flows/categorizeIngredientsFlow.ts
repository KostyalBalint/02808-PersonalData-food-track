import { genkit, z } from "genkit";
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
import * as math from "mathjs";

// Initialize Genkit with the Google AI plugin
// Pass API key during plugin init for cleaner setup, if desired
const ai = genkit({ plugins: [googleAI()] });

// ----- Tool Definition: fetchIngredientDetails -----

// Define the structure of the nutritional data we want
const IngredientNutritionSchema = z.object({
  calories_kcal: z.number().optional().describe("Calories in kcal per 100g"),
  protein_g: z.number().optional().describe("Protein in grams per 100g"),
  fat_g: z.number().optional().describe("Total fat in grams per 100g"),
  carbohydrates_g: z
    .number()
    .optional()
    .describe("Carbohydrates in grams per 100g"),
  sugars_g: z.number().optional().describe("Sugars in grams per 100g"),
  fiber_g: z.number().optional().describe("Fiber in grams per 100g"),
  fruits_estimate_g: z
    .number()
    .optional()
    .describe("Estimated amount of fruits in grams per 100g"),
});

// Define the output schema for the tool
const FetchIngredientDetailsOutputSchema = z.object({
  found: z.boolean().describe("Whether the ingredient was found"),
  ingredientName: z
    .string()
    .describe("The name of the ingredient searched for"),
  matchedName: z
    .string()
    .optional()
    .describe("The name of the matching product found in the database"),
  nutrientsPer100g: IngredientNutritionSchema.optional().describe(
    "Nutritional information per 100g, if available",
  ),
  servingSize: z
    .string()
    .optional()
    .describe("Reported serving size string, if available (e.g., '30 g')"),
  error: z.string().optional().describe("Error message if lookup failed"),
});

// Define the actual tool
export const fetchIngredientDetailsTool = ai.defineTool(
  {
    name: "fetchIngredientDetails",
    description:
      "Looks up nutritional information for a specific food ingredient name using the Open Food Facts API. Returns data per 100g.",
    inputSchema: z.object({
      ingredientName: z
        .string()
        .describe(
          "The name of the ingredient to look up (e.g., 'apple', 'whole wheat flour', 'cheddar cheese')",
        ),
    }),
    outputSchema: FetchIngredientDetailsOutputSchema,
  },
  async ({ ingredientName }) => {
    console.log(
      `[fetchIngredientDetailsTool] Received request for: ${ingredientName}`,
    );
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ingredientName)}&search_simple=1&action=process&json=1&page_size=1`; // Get top 1 result

    try {
      console.log(`[fetchIngredientDetailsTool] Fetching URL: ${searchUrl}`);
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": "GenkitTool/1.0", // Good practice to identify your bot
        },
      });

      if (!response.ok) {
        console.error(
          `[fetchIngredientDetailsTool] API request failed with status: ${response.status}`,
        );
        return {
          found: false,
          ingredientName: ingredientName,
          error: `API request failed with status: ${response.status}`,
        };
      }

      const data = await response.json();

      if (
        !data ||
        data.count === 0 ||
        !data.products ||
        data.products.length === 0
      ) {
        console.log(
          `[fetchIngredientDetailsTool] Ingredient not found: ${ingredientName}`,
        );
        return {
          found: false,
          ingredientName: ingredientName,
          error: "Ingredient not found in Open Food Facts database.",
        };
      }

      const product = data.products[0];
      const nutriments = product.nutriments || {};

      console.log(
        `[fetchIngredientDetailsTool] Found match: ${product.product_name || "Unknown Name"}`,
      );
      // console.log(`[fetchIngredientDetailsTool] Raw Nutriments:`, JSON.stringify(nutriments, null, 2)); // Optional: for debugging

      const output: z.infer<typeof FetchIngredientDetailsOutputSchema> = {
        found: true,
        ingredientName: ingredientName,
        matchedName: product.product_name || product.generic_name || undefined,
        servingSize: product.serving_size || undefined,
        nutrientsPer100g: {
          // Open Food Facts uses keys like 'energy-kcal_100g', handle potential absence
          calories_kcal:
            nutriments["energy-kcal_100g"] !== undefined
              ? Number(nutriments["energy-kcal_100g"])
              : undefined,
          protein_g:
            nutriments.proteins_100g !== undefined
              ? Number(nutriments.proteins_100g)
              : undefined,
          fat_g:
            nutriments.fat_100g !== undefined
              ? Number(nutriments.fat_100g)
              : undefined,
          carbohydrates_g:
            nutriments.carbohydrates_100g !== undefined
              ? Number(nutriments.carbohydrates_100g)
              : undefined,
          sugars_g:
            nutriments.sugars_100g !== undefined
              ? Number(nutriments.sugars_100g)
              : undefined,
          fiber_g:
            nutriments.fiber_100g !== undefined
              ? Number(nutriments.fiber_100g)
              : undefined,
          fruits_estimate_g:
            nutriments[
              "fruits-vegetables-legumes-estimate-from-ingredients_100g"
            ] !== undefined
              ? Number(
                  nutriments[
                    "fruits-vegetables-legumes-estimate-from-ingredients_100g"
                  ],
                )
              : undefined,
        },
      };

      // Clean up undefined nutrient fields if the whole object is empty
      if (
        output.nutrientsPer100g &&
        Object.values(output.nutrientsPer100g).every((v) => v === undefined)
      ) {
        output.nutrientsPer100g = undefined;
        console.log(
          `[fetchIngredientDetailsTool] No valid nutrient data found per 100g.`,
        );
      } else {
        console.log(
          `[fetchIngredientDetailsTool] Extracted nutrients:`,
          output.nutrientsPer100g,
        );
      }

      return output;
    } catch (error: any) {
      console.error(
        `[fetchIngredientDetailsTool] Error during fetch or processing for "${ingredientName}":`,
        error,
      );
      return {
        found: false,
        ingredientName: ingredientName,
        error: `An error occurred: ${error.message}`,
      };
    }
  },
);

// ----- Tool Definition: Calculator (keep your existing one) -----
const calculatorTool = ai.defineTool(
  {
    name: "calculator",
    description:
      "Evaluates a mathematical expression string and returns the numerical result. Use this for unit conversions, scaling quantities, calculating percentages, and summing category totals.",
    inputSchema: z.object({
      expression: z
        .string()
        .describe(
          "The mathematical expression to evaluate (e.g., '1.5 * 20', '15 + 30 + 12.5', '0.7 * 50', '2 * (10 + 5)', '100 / 2.20462')",
        ),
    }),
    outputSchema: z.object({
      result: z
        .number()
        .describe("The numerical result of the expression evaluation."),
    }),
  },
  async ({ expression }) => {
    console.log(`[calculatorTool] Called with expression: "${expression}"`); // Add logging
    try {
      const result = math.evaluate(expression);
      if (typeof result !== "number" || !Number.isFinite(result)) {
        throw new Error(
          "Invalid calculation result (non-numeric or infinite).",
        );
      }
      console.log(`[calculatorTool] Result: ${result}`); // Add logging
      return { result };
    } catch (error: any) {
      console.error(
        `[calculatorTool] Error evaluating "${expression}":`,
        error,
      );
      throw new Error(
        `Calculation failed for expression "${expression}": ${error.message}`,
      );
    }
  },
);

// ----- Flow Definition: categorizeIngredientsFlow -----

const categorizeIngredientsFlowOutputSchema = z.object({
  Grains: z.number().describe("The total estimated weight of Grains in grams"),
  Vegetables: z
    .number()
    .describe("The total estimated weight of Vegetables in grams"),
  Fruits: z.number().describe("The total estimated weight of Fruits in grams"),
  Protein: z
    .number()
    .describe("The total estimated weight of Protein in grams"),
  Dairy: z.number().describe("The total estimated weight of Dairy in grams"),
  Fats: z.number().describe("The total estimated weight of Fats in grams"),
  Sweets: z
    .number()
    .describe("The total estimated weight of Sweets/sugar in grams"),
});

export const categorizeIngredientsFlow = ai.defineFlow(
  {
    name: "categorizeIngredients",
    inputSchema: z.object({
      name: z.string(),
      ingredients: z.array(
        z.object({
          name: z.string(),
          amount: z.number(),
          unit: z.string(),
        }),
      ),
    }),
    outputSchema: categorizeIngredientsFlowOutputSchema,
  },
  async ({ name, ingredients }) => {
    const ingredientsListString = ingredients
      .map(
        (ingredient) =>
          `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`,
      )
      .join("\n- ");

    // --- Updated Prompt mentioning the new tool ---
    const prompt = `
You are an AI assistant specialized in nutritional analysis based on ingredient lists.
Analyze a given food item and categorize its ingredients according to the standard food pyramid groups. For each category, estimate and report the *total weight in grams* contributed by the ingredients in that group.

**You have access to these tools:**
1.  **calculator**: Evaluates a mathematical expression string (e.g., '1.5 * 20 + 10 / 2'). Use this for ALL calculations (conversions, scaling, percentages, summing).
2.  **fetchIngredientDetails**: Looks up nutritional information (per 100g) for a specific ingredient name from a database. Use this tool if you need specific nutritional data (e.g., protein content per 100g of 'chicken breast') to perform more accurate categorization or adjustments, especially for basic, unprocessed ingredients where standard data is helpful. Use it for every ingredient you have the slightest doubt about.

**Food Item:** ${name}

**Ingredients List:**
- ${ingredientsListString}

**Categories:**
1.  Grains
2.  Vegetables
3.  Fruits
4.  Protein
5.  Dairy
6.  Fats
7.  Sweets

**Instructions:**
1.  **Analyze Each Ingredient:** Process each ingredient from the list.
2.  **Convert to Grams:** Determine the weight in grams for every ingredient. Use the **calculator** tool for any unit conversions (e.g., 1 cup flour ~ 120g, 1 tbsp oil ~ 14g, 1 egg ~ 50g, 1 lb ~ 453.6g). State assumptions clearly. Example Call: \`calculator({expression: '0.5 * 120'})\`.
3.  **Fetch Details:** For basic ingredients (like 'chicken breast', 'flour', 'apple'), consider using the **fetchIngredientDetails** tool to get nutritional data per 100g. This can help with step 5. Example Call: \`fetchIngredientDetails({ ingredientName: 'chicken breast' })\`.
4.  **Handle Complex Ingredients:** If an ingredient is complex (e.g., 'spring roll'), estimate its constituent parts in grams *per unit*. Use the **calculator** tool to scale these by the given quantity.
5.  **Categorize & Adjust:** Assign the calculated gram weight of each basic ingredient (or scaled constituent) to its primary food category.
    *   If the **fetchIngredientDetails** tool provided specific data (e.g., % protein), or you have reliable estimates, use the **calculator** tool to adjust the weight contribution to different categories. Example: 100g chicken breast (fetched data shows ~25g protein/100g) -> Protein category gets \`calculator({expression: '100 * 0.25'})\` = 25g (adjusting for water/other components). If an item is e.g. 70% protein / 30% fat, split its weight accordingly using the calculator.
6.  **Sum Totals:** Keep a running total for each category. Use the **calculator** tool to add the gram amounts to the correct category totals incrementally OR sum all contributions at the end using the calculator ONCE per category.
7.  **Output:** Provide the final result strictly as a JSON object matching the required schema. Ensure all calculations were done using the calculator tool.

**Example Tool Use Flow:**
*   Input: '100 g chicken breast'
*   Convert: Already in grams.
*   Fetch: Call \`fetchIngredientDetails({ ingredientName: 'chicken breast' })\`. Tool returns data including \`protein_g: 25\`.
*   Categorize/Adjust: Assign to Protein. Calculate protein contribution: \`calculator({ expression: '100 * (25 / 100)' })\` -> result: 25. Add 25g to Protein total (using calculator). (Note: This simplified example assumes protein is the main category interest; a more complex model might account for fat too).
*   Input: '0.5 cup flour'
*   Convert: Assume 1 cup = 120g. Call \`calculator({ expression: '0.5 * 120' })\` -> result: 60.
*   Fetch: Call \`fetchIngredientDetails({ ingredientName: 'flour' })\`. Tool returns data.
*   Categorize: Assign 60g to Grains. Add 60g to Grains total (using calculator).

Calculate the totals based *only* on the provided ingredients list, your decomposition estimates, fetched data, and conversions.
`;
    // --- End of Updated Prompt ---

    console.log("[categorizeIngredientsFlow] Generating response...");
    const llmResponse = await ai.generate({
      prompt: { text: prompt },
      model: gemini20Flash, // Or a more capable model like gemini-1.5-flash-latest or gemini-1.5-pro-latest for better tool use
      // *** Pass BOTH tool definition objects ***
      tools: [calculatorTool, fetchIngredientDetailsTool],
      toolChoice: "auto",
      maxTurns: 100,
      output: { schema: categorizeIngredientsFlowOutputSchema, format: "json" },
      // config: { apiKey: googleAIApiKey.value() }, // Not needed if set in googleAI() plugin config
      config: { temperature: 0.1 }, // Lower temp for more deterministic results with tool use
    });

    console.log("[categorizeIngredientsFlow] Received LLM Response.");
    // Basic validation
    const output = llmResponse.output;
    if (!output || typeof output !== "object") {
      console.error("[categorizeIngredientsFlow] Invalid LLM output:", output);
      throw new Error("Invalid LLM output: Expected an object.");
    }

    // Optional: More rigorous validation against schema
    try {
      categorizeIngredientsFlowOutputSchema.parse(output);
      console.log("[categorizeIngredientsFlow] Output validated successfully.");
    } catch (validationError) {
      console.error(
        "[categorizeIngredientsFlow] Output validation failed:",
        validationError,
      );
      // Decide how to handle: throw, return partial, return error structure, etc.
      throw new Error("LLM output failed schema validation.");
    }

    return output as z.infer<typeof categorizeIngredientsFlowOutputSchema>;
  },
);
