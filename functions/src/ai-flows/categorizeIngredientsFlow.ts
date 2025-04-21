import { z } from "genkit";
import { gemini20Flash } from "@genkit-ai/googleai";
import * as math from "mathjs";
import Fuse from "fuse.js";

import { ai } from "./ai.js";

// ----- Tool Definition: fetchIngredientDetails -----

const SingleIngredientResultSchema = z.object({
  matchedName: z
    .string()
    .optional()
    .describe("The name of the product found in the database."),
  productId: z
    .string()
    .optional()
    .describe("Unique identifier for the product in Open Food Facts."),
  productUrl: z
    .string()
    .url()
    .optional()
    .describe("URL to the product page on Open Food Facts."),
  servingSize: z
    .string()
    .optional()
    .describe("Reported serving size, if available."),
  nutrientsPer100g: z
    .object({
      calories_kcal: z
        .number()
        .optional()
        .describe("Calories in kcal per 100g"),
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
    })
    .optional()
    .describe("Nutritional information per 100g of the ingredient."),
  // Optional: Add Fuse.js score if you want to see the match quality
  // fuseScore: z.number().optional().describe("Relevance score from Fuse.js (lower is better)."),
});

const FetchTopIngredientsOutputSchema = z.object({
  searchTerm: z.string().describe("The original ingredient name searched for."),
  results: z
    .array(SingleIngredientResultSchema)
    .describe(
      "An array of the top 5 matching ingredient details found, ranked by relevance.",
    ),
  count: z.number().int().describe("The number of results returned (0-5)."),
  message: z
    .string()
    .optional()
    .describe(
      "A status message, e.g., indicating if results were found or ranked.",
    ),
});

// --- Tool Definition ---

export const fetchIngredientDetailsTool = ai.defineTool(
  {
    name: "fetchIngredientDetails",
    description:
      "Looks up nutritional information for a food ingredient using Open Food Facts. Fetches multiple candidates and ranks them by relevance to the input name, returning the top 5 matches with data per 100g. The returned ingredient list might not contain the searched food item, and also the relevant item might not be the first one. Be cautious and use common sense to determine the best match",
    inputSchema: z.object({
      ingredientName: z
        .string()
        .describe(
          "The name of the ingredient to look up (e.g., 'apple', 'whole wheat flour', 'cheddar cheese')",
        ),
    }),
    outputSchema: FetchTopIngredientsOutputSchema,
  },
  async ({
    ingredientName,
  }): Promise<z.infer<typeof FetchTopIngredientsOutputSchema>> => {
    console.log(
      `[fetchIngredientDetailsTool] Received request (rank top 5): ${ingredientName}`,
    );

    // --- Step 1: Fetch more candidates from the API ---
    const fetchCount = 20; // Fetch more candidates (e.g., 20) for better ranking pool
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(ingredientName)}&search_simple=1&action=process&json=1&page_size=${fetchCount}`;

    let apiProducts: any[] = [];

    try {
      console.log(
        `[fetchIngredientDetailsTool] Fetching up to ${fetchCount} candidates from URL: ${searchUrl}`,
      );
      const response = await fetch(searchUrl, {
        headers: {
          "User-Agent": `GenkitTool/1.0 (Fetching ${fetchCount} candidates)`,
        },
      });

      if (!response.ok) {
        console.error(
          `[fetchIngredientDetailsTool] API request failed with status: ${response.status}`,
        );
        return {
          searchTerm: ingredientName,
          results: [],
          count: 0,
          message: `API request failed with status: ${response.status}`,
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
          `[fetchIngredientDetailsTool] No ingredients found by API for: ${ingredientName}`,
        );
        return {
          searchTerm: ingredientName,
          results: [],
          count: 0,
          message: "Ingredient not found in Open Food Facts database.",
        };
      }
      apiProducts = data.products;
      console.log(
        `[fetchIngredientDetailsTool] Fetched ${apiProducts.length} candidates from API.`,
      );
    } catch (error: any) {
      console.error(
        `[fetchIngredientDetailsTool] Error during API fetch for "${ingredientName}":`,
        error,
      );
      return {
        searchTerm: ingredientName,
        results: [],
        count: 0,
        message: `An error occurred during API fetch: ${error.message}`,
      };
    }

    // --- Step 2: Rank the fetched candidates using Fuse.js ---
    let top5Results: z.infer<typeof SingleIngredientResultSchema>[] = [];

    try {
      // Configure Fuse.js - search in product name and generic name
      const fuseOptions = {
        keys: ["product_name", "generic_name"],
        includeScore: true, // Include score for potential thresholding or sorting info
        threshold: 0.6, // Adjust threshold for fuzziness (0=exact, 1=match anything)
        // isCaseSensitive: false, // Default is false
        // findAllMatches: false, // Default is false
        // minMatchCharLength: 1, // Default is 1
      };
      const fuse = new Fuse(apiProducts, fuseOptions);

      console.log(
        `[fetchIngredientDetailsTool] Ranking ${apiProducts.length} candidates using Fuse.js for: "${ingredientName}"`,
      );
      const fuseResults = fuse.search(ingredientName);

      if (fuseResults.length === 0) {
        console.log(
          `[fetchIngredientDetailsTool] Fuse.js found no relevant matches among candidates for: ${ingredientName}`,
        );
        return {
          searchTerm: ingredientName,
          results: [],
          count: 0,
          message:
            "Found candidates, but none closely matched the search term.",
        };
      }

      // Take the top 5 results from Fuse.js ranking
      const top5FuseResults = fuseResults.slice(0, 5);
      console.log(
        `[fetchIngredientDetailsTool] Selected top ${top5FuseResults.length} results from Fuse ranking.`,
      );

      // --- Step 3: Process the top 5 ranked results ---
      top5Results = top5FuseResults.map((fuseResult) => {
        const product = fuseResult.item; // Get the original product object
        //const score = fuseResult.score; // Get the Fuse score (lower is better)
        const nutriments = product.nutriments || {};

        // Extract nutrients
        const nutrientsPer100gData = {
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
        };

        const hasNutrients = Object.values(nutrientsPer100gData).some(
          (v) => v !== undefined,
        );
        const nutrientsPer100g = hasNutrients
          ? nutrientsPer100gData
          : undefined;

        return {
          matchedName:
            product.product_name || product.generic_name || undefined,
          productId: product._id || product.code || undefined,
          productUrl: product.url || undefined,
          servingSize: product.serving_size || undefined,
          nutrientsPer100g: nutrientsPer100g,
          // fuseScore: score, // Optional: include score in output
        };
      });

      console.log(
        `[fetchIngredientDetailsTool] Successfully processed ${top5Results.length} top ranked results for "${ingredientName}".`,
      );

      return {
        searchTerm: ingredientName,
        results: top5Results,
        count: top5Results.length,
        message: `Found and ranked top ${top5Results.length} potential matches.`,
      };
    } catch (error: any) {
      console.error(
        `[fetchIngredientDetailsTool] Error during Fuse.js ranking or processing for "${ingredientName}":`,
        error,
      );
      return {
        searchTerm: ingredientName,
        results: [],
        count: 0,
        message: `An error occurred during ranking/processing: ${error.message}`,
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
  Vegetables: z
    .number()
    .describe("Total estimated amount of Vegetables, salad and fruit in grams"),
  Grains: z
    .number()
    .describe(
      "Total estimated amount of Grains (eg. Wholemeal cereals and breads, potatoes, pasta and rice) in grams",
    ),
  Dairy: z
    .number()
    .describe(
      "Total estimated amount of Dairy (eg. Milk, yogurt and cheese) in grams",
    ),
  Meat: z
    .number()
    .describe(
      "Total estimated amount of Meat, poultry, fish, eggs, beans and nuts in grams",
    ),
  FatsOils: z
    .number()
    .describe("Total estimated amount of Fats, spreads and oils in grams"),
  Sweet: z
    .number()
    .describe(
      "Total estimated amount of Foods and drinks high in fat, sugar and salt in grams",
    ),
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

    const systemPrompt = `
You are an AI assistant specialized in nutritional analysis based on ingredient lists.
Analyze a given food item and categorize its ingredients according to the standard food pyramid groups. For each category, estimate and report the *total weight in grams* contributed by the ingredients in that group.


*Vegetables:* Vegetables, salad and fruit
Examples: Carrots, broccoli, peas, tomatoes, mixed salad, vegetable soup, orange juice, orange, fruit salad pot, apple, banana, berries. In case of vegetables like Avocado consider that it has a large non edible part. 
Advice: Base your meals on these and enjoy a variety of colours. More is better. Limit fruit juice to unsweetened, once a day.

*Grains:* Wholemeal cereals and breads, potatoes, pasta and rice
Examples: Wholemeal bread, crispbread, breakfast cereals (flakes, bran), porridge/oats, pasta, rice, potatoes.
Advice: Wholemeal and wholegrain cereals are best. Enjoy at each meal. The number of servings depends on age, size, if you are a man or a woman and on activity levels. Watch your serving size and use the Daily Servings Guide below.*

*Dairy:* Milk, yogurt and cheese
Examples: Soft cheese, hard cheese block, grated cheese, glass of milk, low-fat yogurt pot, drinking yogurt/milkshake.
Advice: Choose reduced-fat or low-fat varieties. Choose low-fat milk and yogurt more often than cheese. Enjoy cheese in small amounts. Women who are pregnant or breastfeeding need 3 servings a day.

*Meat:* Meat, poultry, fish, eggs, beans and nuts
Examples: Cooked chicken, walnuts, baked beans, eggs, lean red meat, cooked fish fillet (e.g., salmon).
Advice: Choose lean meat, poultry (without skin) and fish. Eat oily fish up to twice a week. Choose eggs, beans and nuts. Limit processed salty meats such as sausages, bacon and ham.

*FatsOils:* Fats, spreads and oils
Examples: Cooking oil, mayonnaise, light spread tub, portioned spread.
Advice: Don't extract the oli from meat and dairy. Only count Cooking Oil, Butter, and oil Deep-fried stuff. Generally speaking when cooking a small amount of oil is used, but not more than a few grams.  

*Sweet:* Foods and drinks high in fat, sugar and salt
Examples: Cola, chocolate, biscuits/crackers, cupcake, sweets/candies, crisps/chips.
Advice: Most people consume snacks high in fat, sugar and salt and sugar sweetened drinks up to 6 times a day (Healthy Ireland Survey 2016). There are no recommended servings for Top Shelf foods and drinks because they are not needed for good health.

**You have access to these tools:**
1.  **calculator**: Evaluates a mathematical expression string (e.g., '1.5 * 20 + 10 / 2'). Use this for ALL calculations (conversions, scaling, percentages, summing).
2.  **fetchIngredientDetails**: Looks up nutritional information (per 100g) for a specific ingredient name from a database. Use this tool if you need specific nutritional data (e.g., protein content per 100g of 'chicken breast') to perform more accurate categorization or adjustments, especially for basic, unprocessed ingredients where standard data is helpful. Use it for every ingredient you have the slightest doubt about. Note that this tool might not return the correct ingredient you are looking for, keep an eye on the name of the found ingredient. If that happens, try to alter your search request. 
`;

    // --- Updated Prompt mentioning the new tool ---
    const prompt = `
**Food Item:** ${name}

**Ingredients List:**
- ${ingredientsListString}

**Categories:**
1.  Vegetables
2.  Grains
3.  Dairy
4.  Meat
5.  FatsOils
6.  Sweet

**Instructions:**
1.  **Check what food (or meal) you working with:** You can use the meal's name as a guidline as what kind of ingredients to excpect. 
1.  **Analyze Each Ingredient:** Process each ingredient from the list.
2.  **Fetch ingredient information:** Use the \`fetchIngredientDetails({ ingredientName: '<ingredient_name>' })\` tool to fetch accurate ingredient info. 
3.  **Convert to Grams:** Determine the weight in grams for every ingredient. Use the **calculator** tool for any unit conversions (e.g., 1 cup flour ~ 120g, 1 tbsp oil ~ 14g, 1 egg ~ 50g, 1 lb ~ 453.6g). State assumptions clearly. Example Call: \`calculator({expression: '0.5 * 120'})\`.
4.  **Handle Complex Ingredients:** If an ingredient is complex (e.g., 'spring roll', 'crepe'), estimate its constituent parts in grams *per unit*. Use the **calculator** tool to scale these by the given quantity.
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

Calculate the totals based *only* on the provided ingredients list, your decomposition, fetched data, and conversions.
`;
    // --- End of Updated Prompt ---

    console.log("[categorizeIngredientsFlow] Generating response...");
    const llmResponse = await ai.generate({
      system: {
        text: systemPrompt,
      },
      prompt: { text: prompt },
      model: gemini20Flash, // Or a more capable model like gemini-1.5-flash-latest or gemini-1.5-pro-latest for better tool use
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
