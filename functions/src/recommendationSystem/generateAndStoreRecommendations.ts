import * as z from "zod";
import admin from "firebase-admin";
import { Timestamp } from "firebase-admin/firestore";
import {
  generateRecommendationsFlow,
  MealHistoryInputSchema,
} from "../ai-flows/index.js";
import { MealData } from "../constants.js";

// Ensure Firebase is initialized elsewhere (e.g., in your main server file)
// if (!admin.apps.length) {
//   admin.initializeApp(); // Or initialize with specific credentials
// }
const db = admin.firestore();

// Input schema for the orchestrator function
const GenerateRequestSchema = z.object({
  userId: z.string(),
  historyDays: z.number().optional().default(7),
});

export async function generateAndStoreRecommendations(
  // Use Zod schema for input validation here too
  input: z.infer<typeof GenerateRequestSchema>,
): Promise<void> {
  const { userId, historyDays } = GenerateRequestSchema.parse(input); // Validate input

  try {
    console.log(
      `Fetching history and generating recommendations for user ${userId} (last ${historyDays} days).`,
    );

    // 1. Fetch recent meals from Firestore (DB Read Logic)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - historyDays);
    const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

    const mealsSnapshot = await db
      .collection("meals")
      .where("userId", "==", userId)
      .where("createdAt", ">=", cutoffTimestamp)
      .orderBy("createdAt", "desc")
      .limit(100) // Limit the number of meals
      .get();

    const user = await db.collection("users").doc(userId).get();

    let recentMeals: MealData[] = [];

    if (!mealsSnapshot.empty) {
      recentMeals = mealsSnapshot.docs.map((doc) => {
        const docData = doc.data() as Omit<MealData, "id">;
        return {
          id: doc.id,
          ...docData,
        };
      });
    } else {
      console.log(
        `No recent meals found for user ${userId} in the last ${historyDays} days.`,
      );
      // historySummary remains undefined
    }

    // 2. Prepare input for the decoupled AI Flow
    const flowInput: z.infer<typeof MealHistoryInputSchema> = {
      meals: recentMeals as z.infer<typeof MealHistoryInputSchema>["meals"],
      historyDays: historyDays,
      userNutritionSettings: user.data()?.nutritionSettings,
    };

    // 3. Run the AI Flow
    const result = await generateRecommendationsFlow(flowInput);

    // 4. Store results (DB Write Logic)
    if (result.categoriesToEat) {
      const recommendationDoc = {
        userId: userId,
        createdAt: Timestamp.now(),
        basedOnHistoryDays: historyDays, // Good to store context
        ...result,
      };

      await db.collection("recommendations").add(recommendationDoc);
      console.log(`Stored recommendations for user ${userId}`);
    } else {
      console.log(`No suggestions generated or stored for user ${userId}.`);
    }
  } catch (error) {
    console.error(
      `Error generating/storing recommendations for user ${userId}:`,
      error instanceof z.ZodError ? error.errors : error, // Log Zod errors nicely
    );
    // Optional: Add more robust error logging/reporting
  }
}
