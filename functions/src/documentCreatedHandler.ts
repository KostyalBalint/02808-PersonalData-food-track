import { onDocumentCreated } from "firebase-functions/firestore";
import { MealData } from "./constants.js";
import { processImage } from "./workers/processImage.js";

export const documentCreatedHandler = onDocumentCreated(
  "meals/{mealId}",
  async (event) => {
    const meal = event.data?.data() as MealData;
    const processedData = await processImage(meal);

    return event.data?.ref.set(processedData ?? {}, {
      merge: true,
    });
  },
);
