import { defineFlow, runFlow } from "@genkit-ai/flow";
import { gemini20Flash, googleAI } from "@genkit-ai/googleai"; // Ensure this is the same provider as in config
import * as z from "zod";
import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import { genkit } from "genkit";

import { googleAIApiKey } from "../googleAIApiKey.js";

const db = admin.firestore();

// Define Input Schema
const UserInputSchema = z.object({
  userId: z.string(),
  historyDays: z.number().optional().default(7), // How many days of history to consider
});

// Define Output Schema (What the AI should return)
const RecommendationSchema = z.object({
  mealName: z.string().describe("Suggested meal name"),
  reasoning: z
    .string()
    .describe(
      "Brief reason why this meal adds diversity based on recent history",
    ),
  // Optional: Add estimated food groups
  // foodGroups: z.array(z.string()).optional().describe("Estimated main food groups in this meal"),
});

const FlowOutputSchema = z.object({
  suggestions: z.array(RecommendationSchema),
});

// Define the Genkit Flow
export const generateRecommendationsFlow = defineFlow(
  {
    name: "generateRecommendationsFlow",
    inputSchema: UserInputSchema,
    outputSchema: FlowOutputSchema,
  },
  async (input) => {
    const { userId, historyDays } = input;

    console.log(
      `Generating recommendations for user ${userId} based on last ${historyDays} days.`,
    );

    // 1. Fetch recent meals from Firestore
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historyDays);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const mealsSnapshot = await db
      .collection("meals")
      .where("userId", "==", userId)
      .where("createdAt", ">=", cutoffTimestamp)
      .orderBy("createdAt", "desc")
      .limit(20) // Limit the number of meals to avoid overly long prompts
      .get();

    if (mealsSnapshot.empty) {
      console.log(
        `No recent meals found for user ${userId}. Providing generic suggestions.`,
      );
      // Handle case with no history - provide generic diverse meals
      // For simplicity, returning an empty list here, but could call LLM with a generic prompt.
      return {
        suggestions: [
          {
            mealName: "Quinoa Salad with Mixed Vegetables and Chickpeas",
            reasoning:
              "Provides whole grains, diverse vegetables, and plant-based protein.",
          },
          {
            mealName: "Lentil Soup",
            reasoning:
              "Excellent source of fiber and plant-based protein, often underrepresented.",
          },
          {
            mealName: "Baked Salmon with Roasted Broccoli",
            reasoning:
              "Offers healthy fats (Omega-3s) and cruciferous vegetables.",
          },
        ],
      };
    }

    const recentMeals = mealsSnapshot.docs.map((doc) => {
      const data = doc.data();
      // Extract key info for the prompt
      return {
        name: data.name,
        ingredients:
          /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
          data.ingredients?.map((ing: any) => ing.name).join(", ") || "N/A",
        // Optional: Extract main categories if useful
        // categories: [...new Set(data.ingredients?.flatMap((ing: any) => ing.categories || []))]
      };
    });

    const historySummary = recentMeals
      .map((m) => `- ${m.name} (Ingredients: ${m.ingredients})`)
      .join("\n");

    console.log(`Recent meal summary for prompt:\n${historySummary}`);

    // 2. Construct the prompt for the AI model
    const prompt = `
      You are a dietary assistant helping a user diversify their daily food intake.
      The user has consumed the following meals in the last ${historyDays} days:
      ${historySummary}

      Based on this history, suggest 3-5 distinct meal ideas for the upcoming days that would introduce more variety into their diet.
      Focus on incorporating different food groups or ingredients compared to what they've recently eaten.
      For each suggestion, provide a brief reasoning explaining why it promotes diversity based on their history.

      Return the suggestions ONLY as a JSON object matching this schema:
      {
        "suggestions": [
          { "mealName": "Suggested Meal Name 1", "reasoning": "Reason 1..." },
          { "mealName": "Suggested Meal Name 2", "reasoning": "Reason 2..." }
        ]
      }
    `;

    const ai = genkit({ plugins: [googleAI()] });

    const llmResponse = await ai.generate({
      prompt: {
        text: prompt,
      },
      model: gemini20Flash,
      output: { schema: FlowOutputSchema, format: "json" }, // Request JSON output matching schema
      config: {
        apiKey: googleAIApiKey.value(),
      },
    });

    // 4. Return the parsed response (Genkit handles parsing if format:'json' is used)
    const suggestions = llmResponse.output?.suggestions || [];
    console.log("Generated suggestions:", suggestions);

    if (!suggestions || suggestions.length === 0) {
      console.warn(
        "LLM did not return valid suggestions. Returning empty array.",
      );
      return { suggestions: [] };
    }

    return { suggestions };
  },
);

// --- Helper function to run the flow and save results ---
// This will be called by the scheduled function or an HTTP trigger

export async function generateAndStoreRecommendations(
  userId: string,
): Promise<void> {
  try {
    const result = await runFlow(generateRecommendationsFlow, {
      userId,
      historyDays: 7,
    });

    if (result.suggestions && result.suggestions.length > 0) {
      const recommendationDoc = {
        userId: userId,
        createdAt: Timestamp.now(),
        suggestions: result.suggestions,
        // Optional: Store basedOnMeals IDs if needed
      };

      await db.collection("recommendations").add(recommendationDoc);
      console.log(`Stored recommendations for user ${userId}`);
    } else {
      console.log(`No suggestions generated or stored for user ${userId}.`);
    }
  } catch (error) {
    console.error(
      `Error generating/storing recommendations for user ${userId}:`,
      error,
    );
    // Optional: Add more robust error logging/reporting
  }
}
