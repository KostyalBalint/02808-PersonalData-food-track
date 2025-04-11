import { https, logger } from "firebase-functions";
import { categorizeIngredientsFlow } from "./ai-flows/categorizeIngredientsFlow.js";
import admin from "firebase-admin";
import { MealData } from "./constants.js";

export async function handleCategorizeIngredients(mealId: string) {
  const db = admin.firestore();

  const mealDoc = await db.collection("meals").doc(mealId).get();
  if (!mealDoc.exists) {
    logger.error("Meal document not found", mealId);
    throw new https.HttpsError(
      "not-found",
      `No meal document found for ID: ${mealId}`,
    );
  }

  const meal = mealDoc.data() as MealData;

  if (meal.ingredients === undefined || meal.ingredients.length === 0) {
    logger.error("No ingredients found in meal document", mealId);
    throw new https.HttpsError(
      "not-found",
      `No ingredients found for meal ID: ${mealId}`,
    );
  }

  const result = await categorizeIngredientsFlow(meal as Required<MealData>);

  await mealDoc.ref.update({
    nutrition: result,
  });
  return result;
}

export const categorizeIngredients = https.onCall(
  {
    cors: true, // Allow requests from your web app domain
    maxInstances: 5,
    timeoutSeconds: 60, // Timeout for *starting* the job, not finishing it
    memory: "512MiB",
  },
  async (request) => {
    const mealId = request.data.mealId;
    logger.log(
      "Received request to categorize ingredients for mealId:",
      mealId,
    );

    if (!mealId || typeof mealId !== "string") {
      logger.error("Missing or invalid mealId in request data", request.data);
      throw new https.HttpsError(
        "invalid-argument",
        'The function must be called with a "mealId" string in the data payload.',
      );
    }

    const result = await handleCategorizeIngredients(mealId);

    logger.log(
      "Successfully categorized ingredients for mealId:",
      mealId,
      "Result:",
      result,
    );

    return;
  },
);
