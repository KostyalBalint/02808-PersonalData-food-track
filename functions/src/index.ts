import { defineSecret } from "firebase-functions/params";

export {
  reindexAllImages,
  processImageWorker,
  reindexSingleMeal,
} from "./reindexAllImages.js";
export { documentCreatedHandler } from "./documentCreatedHandler.js";

export * from "./duplicateMeal.js";
export * from "./recommendationSystem/recommendationSceduler.js";

export const googleAIApiKey = defineSecret("GEMINI_API_KEY");
