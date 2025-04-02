import * as functions from "firebase-functions";
import { https } from "firebase-functions";
import { type GenerateOptions, genkit } from "genkit";
import { gemini15Flash, googleAI } from "@genkit-ai/googleai"; // Using 1.5 Flash, more capable
import { z } from "zod";
import { defineSecret } from "firebase-functions/params";

const googleAIApiKey = defineSecret("GEMINI_API_KEY");

// Define baseline schema
const BaselineSchema = z.object({
  grains: z.number().min(0).describe("Target daily servings/amount for Grains"),
  vegetables: z
    .number()
    .min(0)
    .describe("Target daily servings/amount for Vegetables"),
  fruits: z.number().min(0).describe("Target daily servings/amount for Fruits"),
  protein: z
    .number()
    .min(0)
    .describe("Target daily servings/amount for Protein"),
  dairy: z.number().min(0).describe("Target daily servings/amount for Dairy"),
  fatsSweets: z
    .number()
    .min(0)
    .describe("Target daily servings/amount limit for Fats, Sweets & Others"),
});

// Define input schema including baseline
const InputSchema = z.object({
  foodList: z.array(z.string()).min(1, "Food list cannot be empty."),
  baseline: BaselineSchema.describe(
    "User-defined target daily servings/amounts for food categories. Use numbers representing servings or a consistent unit understood by the user.",
  ),
});

// Define the detailed category output schema
const CategoryDetailSchema = z.object({
  items: z
    .array(z.string())
    .describe("List of food items classified under this category."),
  estimatedAmount: z
    .string()
    .describe(
      "AI's estimated total amount/servings for this category (e.g., 'approx. 3 servings', 'around 250g').",
    ),
  comparison: z
    .string()
    .describe(
      "Comparison to baseline (e.g., 'Met target', 'Below target', 'Above target', 'Significantly below target', 'Within limit', 'Exceeded limit').",
    ),
});

// Define the structured output schema for the AI
const CategorizedDQISchema = z.object({
  categories: z.object({
    Grains: CategoryDetailSchema.optional(),
    Vegetables: CategoryDetailSchema.optional(),
    Fruits: CategoryDetailSchema.optional(),
    Protein: CategoryDetailSchema.optional(),
    Dairy: CategoryDetailSchema.optional(),
    "Fats & Sweets": CategoryDetailSchema.optional(),
    Other: CategoryDetailSchema.optional().describe(
      "Items that didn't fit well into other categories.",
    ),
  }),
  score: z
    .number()
    .min(0)
    .max(100)
    .describe("Overall Diet Quality Index score."),
  reasoning: z
    .string()
    .describe(
      "Explanation for the score, referencing category performance against the baseline.",
    ),
});

// Define the Cloud Function (HTTP Callable)
export const calculateCategorizedDqi = https.onCall(
  {
    cors: true, // Allow requests from your web app domain
    maxInstances: 5,
    timeoutSeconds: 120, // Increased timeout for potentially longer AI processing
    memory: "512MiB", // Increased memory for potentially larger prompts/responses
    secrets: [googleAIApiKey], // Ensure the secret is available
  },
  async (request) => {
    let inputData: z.infer<typeof InputSchema>;
    try {
      // Validate the incoming data (foodList + baseline)
      inputData = InputSchema.parse(request.data);
    } catch (error) {
      console.error("Input validation failed:", error);
      // Use Firebase HttpsError for client-side handling
      throw new functions.https.HttpsError(
        "invalid-argument",
        "Invalid input data provided.",
        error instanceof z.ZodError ? error.flatten() : error, // Send Zod errors if possible
      );
    }

    // Initialize Genkit (do this once outside the function handler if possible)
    const ai = genkit({
      plugins: [
        googleAI({
          apiKey: googleAIApiKey.value(),
          // apiVersion: "v1beta", // Optional: specify if needed
        }),
      ],
      //logLevel: "debug", // Enable detailed logging for Genkit
      //enableTracingAndMetrics: true, // Optional: Enable tracing
    });

    const { foodList, baseline } = inputData;

    // --- AI Calculation ---
    try {
      // Construct the detailed prompt for Gemini
      const prompt = `
Analyze the following list of consumed food items:
${foodList.map((item) => `- ${item}`).join("\n")}

Perform the following steps:
1.  **Categorize:** Classify each food item into ONE of the following categories: Grains, Vegetables, Fruits, Protein, Dairy, Fats & Sweets, Other. Be precise.
2.  **Quantify:** For each item, estimate the quantity consumed (e.g., in servings, grams, cups, pieces). Use standard portion sizes if not specified. Acknowledge these are estimations.
3.  **Aggregate:** Sum the estimated quantities for all items within each category. Express the total estimated amount for each category (e.g., "approx. 3 servings", "around 250g").
4.  **Compare:** Compare the aggregated amount for each category against the user's target daily baseline provided below. State clearly whether the amount is 'Below target', 'Met target', 'Above target', 'Significantly below target', 'Within limit' (for Fats & Sweets), or 'Exceeded limit' (for Fats & Sweets).

User's Daily Baseline Targets:
- Grains: ${baseline.grains} servings/units
- Vegetables: ${baseline.vegetables} servings/units
- Fruits: ${baseline.fruits} servings/units
- Protein: ${baseline.protein} servings/units
- Dairy: ${baseline.dairy} servings/units
- Fats & Sweets Limit: ${baseline.fatsSweets} servings/units

5.  **Score & Reason:** Based *primarily* on how well the consumed amounts across categories meet the baseline targets (aiming to meet targets for healthy groups and stay within limits for Fats & Sweets), calculate a Diet Quality Index (DQI) score between 0 (very poor adherence to baseline) and 100 (excellent adherence to baseline). Also consider variety and balance. Provide a reasoning that explains the score by referencing the category performance against the baseline.

**Output Format:**
Provide your response ONLY in the following JSON format. Do not include any introductory text, explanations outside the JSON structure, or markdown formatting like \`\`\`json.

\`\`\`json
${JSON.stringify(
  {
    categories: {
      Grains: {
        items: ["example: 2 slices whole wheat bread"],
        estimatedAmount: "string (e.g., 'approx. 2 servings')",
        comparison: "string (e.g., 'Met target')",
      },
      Vegetables: {
        /* ... */
      },
      Fruits: {
        /* ... */
      },
      Protein: {
        /* ... */
      },
      Dairy: {
        /* ... */
      },
      "Fats & Sweets": {
        /* ... */
      },
      Other: {
        /* ... */
      },
    },
    score: 0, // number
    reasoning: "string",
  },
  null,
  2,
)}
\`\`\`

Ensure all fields in the JSON structure are populated correctly based on your analysis. If a category has no items, you can omit it or provide an empty 'items' array and appropriate 'estimatedAmount'/'comparison'.
`;

      console.log(
        "Sending prompt to Genkit (first 200 chars):",
        prompt.substring(0, 200) + "...",
      ); // Log snippet

      const llm = gemini15Flash; // Select the model instance

      const options: GenerateOptions = {
        prompt: prompt,
        model: llm,
        config: {
          temperature: 0.3, // Lower temperature for more deterministic categorization/scoring
          // maxOutputTokens: 1024, // Adjust if needed
        },
        output: {
          format: "json",
          schema: CategorizedDQISchema, // Use the Zod schema for output validation
        },
      };

      // Use Genkit generate function
      const llmResponse = await ai.generate(options);
      const outputData = llmResponse.output; // Genkit automatically parses if format is 'json' and schema is provided

      if (!outputData) {
        throw new Error("AI response was empty or could not be parsed.");
      }

      console.log("Raw AI Output (parsed by Genkit):", outputData);

      // --- Validate AI Response against Zod Schema (Genkit does this with output.schema) ---
      // We can add an extra check here just in case, though Genkit should throw if parsing fails
      let validatedResult: z.infer<typeof CategorizedDQISchema>;
      try {
        validatedResult = CategorizedDQISchema.parse(outputData); // Re-validate for certainty
      } catch (parseError) {
        console.error(
          "Failed to validate AI JSON output even after Genkit parsing:",
          parseError,
        );
        console.error("Problematic AI Output:", outputData);
        throw new Error(
          `AI response structure did not match the expected format.`,
        );
      }

      console.log("Successfully validated DQI result:", validatedResult);

      // --- Send Response ---
      // Return the full structured data
      return validatedResult;
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error during AI calculation or processing:", error);
        // Log specific Genkit/Google AI errors if available
        if ("cause" in error) {
          console.error("Underlying error cause:", error.cause);
        }

        // Use Firebase HttpsError for better client-side handling
        if (error instanceof functions.https.HttpsError) {
          throw error; // Re-throw known HttpsErrors
        } else {
          // Wrap other errors
          throw new functions.https.HttpsError(
            "internal", // Generic internal error code
            error.message || "An unexpected error occurred during calculation.",
            { originalError: error.toString() }, // Include some detail safely
          );
        }
      }
      throw new functions.https.HttpsError(
        "internal",
        "An unexpected error occurred during calculation.",
      );
    }
  },
);
