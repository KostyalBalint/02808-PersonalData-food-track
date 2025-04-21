import * as functions from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import admin from "firebase-admin";
import { https } from "firebase-functions";
import { generateAndStoreRecommendations } from "./generateAndStoreRecommendations.js";
// Import setGlobalOptions from v2/options

// Set global options like region and secrets (if needed)
// setGlobalOptions({ region: 'us-central1', secrets: ["GEMINI_API_KEY"] }); // Example

// --- Scheduled Function to Generate Recommendations Daily ---

// Option 1: Run for ALL users who have logged meals recently (more complex query)
export const dailyRecommendationGenerator = functions.scheduler.onSchedule(
  // Schedule: e.g., "every day 05:00" (adjust timezone if needed)
  // See https://firebase.google.com/docs/functions/schedule-functions
  { schedule: "every day 05:00", timeZone: "Europe/Budapest" },
  async () => {
    logger.info("Starting daily recommendation generation job.", {
      structuredData: true,
    });
    await generateRecommendationsForAllUsers();
  },
);

export const generateRecommendations = https.onCall(
  {
    cors: true, // Allow requests from your web app domain
    maxInstances: 5,
    timeoutSeconds: 60, // Timeout for *starting* the job, not finishing it
    memory: "256MiB",
    invoker: "private",
  },
  async () => {
    logger.log("Received request to generate recommendations.");
    try {
      await generateRecommendationsForAllUsers();
      return {
        success: true,
        message: "Recommendations generated successfully.",
      };
    } catch (error) {
      logger.error("Error generating recommendations:", error, {
        structuredData: true,
      });
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate recommendations.",
      );
    }
  },
);

const generateRecommendationsForAllUsers = async () => {
  const db = admin.firestore();
  const processedUserIds = new Set<string>();
  let count = 0;

  try {
    // Find users with recent activity (e.g., meals in the last 7 days)
    // This query might be inefficient for very large user bases.
    // Consider maintaining a separate list/collection of active users.
    const NdaysAgo = new Date();
    NdaysAgo.setDate(NdaysAgo.getDate() - 3);
    const cutoffTimestamp = admin.firestore.Timestamp.fromDate(NdaysAgo);

    const recentMealsSnapshot = await db
      .collection("meals")
      .where("createdAt", ">=", cutoffTimestamp)
      // Note: No orderBy('userId') here as Firestore requires the first orderBy
      // to match the inequality field. We'll deduplicate in code.
      .select("userId") // Only fetch the userId
      .limit(1000) // Limit batch size to avoid overwhelming the function/API
      .get();

    for (const doc of recentMealsSnapshot.docs) {
      const userId = doc.data().userId;
      if (userId && !processedUserIds.has(userId)) {
        processedUserIds.add(userId);
        logger.info(`Queueing recommendation generation for user: ${userId}`);
        // Run generation in parallel (with caution for quotas)
        // Consider using Task Queues for more robust scaling if many users
        await generateAndStoreRecommendations({
          userId: userId,
          historyDays: 3,
        });
        count++;
      }
    }
    logger.info(`Successfully processed ${count} users for recommendations.`);
  } catch (error) {
    logger.error("Error fetching users or generating recommendations:", error, {
      structuredData: true,
    });
  }
};
