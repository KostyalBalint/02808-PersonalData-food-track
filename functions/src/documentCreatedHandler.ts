import { onDocumentCreated } from "firebase-functions/firestore";
import { queueMealForProcessing } from "./reindexAllImages.js";

export const documentCreatedHandler = onDocumentCreated(
  "meals/{mealId}",
  async (event) => {
    console.log("Document created", event);
    const result = await queueMealForProcessing(event.params.mealId, true);
    if (result.error) {
      console.error("Error queuing meal for processing:", result.error);
      return;
    }
    console.log("Meal queued for processing:", event.params.mealId);

    return result;
  },
);
