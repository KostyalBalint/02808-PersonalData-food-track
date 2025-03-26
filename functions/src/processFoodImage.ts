import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { genkit } from "genkit";
import { gemini20ProExp0205, googleAI } from "@genkit-ai/googleai";
import { defineSecret } from "firebase-functions/params";
import { https } from "firebase-functions/v2";
import admin from "firebase-admin";
import pLimit from "p-limit";

// @ts-expect-error Only type import
import { MealData } from "../../src/constants";
import { FoodExtractSchema } from "./foodExtractSchema.js";

const googleAIApiKey = defineSecret("GEMINI_API_KEY");
admin.initializeApp();
const db = admin.firestore();

// Function to process an image and return the extracted data
const processImage = async (meal: MealData) => {
  const ai = genkit({ plugins: [googleAI()] });

  const { output } = await ai.generate({
    system: `
**Objective**: To accurately identify and process the details of a user's meal from an image, providing comprehensive information on ingredients, quantities, units, caloric content, and the categories of ingredients.

### Input:
1. **Image of a Meal**: A clear photograph taken by the user of the meal consumed

### Expected Output:
- **Ingredients**: Provide a list of all recognizable ingredients present in the meal image
- **Amount**: Estimate and provide the quantity of each ingredient based on visual analysis
- **Units**: Specify the units of measurement for each ingredient
- **Calories**: Calculate and return the approximate caloric content for each identified ingredient
- **Categories**: Classify each ingredient into appropriate food categories (Grains, Vegetables, Fruits, Protein, Dairy, Fats and Sweets)

### Instructions:

1. **Image Analysis**:
   - Utilize advanced image recognition algorithms to detect and identify food items within the image.
   - Enhance recognition accuracy by cross-referencing a comprehensive database of common meals and ingredients.

2. **Ingredient Identification**:
   - Deconstruct the meal into its individual components, listing each ingredient explicitly.

3. **Quantitative Assessment**:
   - Estimate ingredient amounts using visual cues and contextual understanding of common serving sizes.
   - Specify units for each ingredient based on standard culinary measurements.

4. **Caloric Evaluation**:
   - Use nutritional databases to estimate the caloric content of each identified ingredient.
   - Provide a total caloric count for the entire meal.

5. **Categorization**:
   - Assign each ingredient to one or more predefined food categories based on nutritional type and typical usage.

7. **Error Handling**:
   - Provide the best effort estimation for unclear or ambiguous images with assurances regarding the potential margin of error.
   - Notify the user to take a clearer picture if major elements of the meal are unrecognizable, you can provide this under the "errorMessage" key.

8. **User Feedback**:
   - Allow users to provide feedback on accuracy to continually improve the model's responses.`,
    model: gemini20ProExp0205,
    prompt: { media: { url: meal.imageUrl } },
    output: {
      schema: FoodExtractSchema,
    },
    config: {
      apiKey: googleAIApiKey.value(),
    },
  });

  return output;
};

const LIMIT = 10; // Adjust this value to set the concurrency limit
const limit = pLimit(LIMIT);

export const reindexAllImages = https.onRequest(
  { cors: true, invoker: "private", timeoutSeconds: 120 },
  async (req, res) => {
    try {
      const mealsSnapshot = await db.collection("meals").get();

      const tasks = mealsSnapshot.docs.map((doc) => {
        return limit(async () => {
          const meal = doc.data() as MealData;
          const processedData = await processImage(meal);
          console.log("Processed data for meal:", meal.id);
          return { docRef: doc.ref, processedData };
        });
      });

      const results = await Promise.all(tasks);

      const batch = db.batch();
      results.forEach(({ docRef, processedData }) => {
        batch.set(docRef, processedData, { merge: true });
      });

      await batch.commit();

      res.status(200).json({
        message: "All images have been reindexed.",
      });
    } catch (error) {
      res.status(500).json({
        message: "An error occurred during reindexing.",
        error: (error as Error).message,
      });
    }
  },
);

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
