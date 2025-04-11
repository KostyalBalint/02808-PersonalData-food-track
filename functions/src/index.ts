import admin from "firebase-admin";

// Initialize Firebase
// Ensure you only initialize ONCE per process, typically at the top level
if (!admin.apps.length) {
  admin.initializeApp();
}

export {
  reindexAllImages,
  processImageWorker,
  reindexSingleMeal,
} from "./reindexAllImages.js";
export { documentCreatedHandler } from "./documentCreatedHandler.js";
export * from "./categorizeIngredients.js";
export * from "./duplicateMeal.js";
export * from "./recommendationSystem/recommendationSceduler.js";
