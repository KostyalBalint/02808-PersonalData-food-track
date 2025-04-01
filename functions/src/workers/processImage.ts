import { genkit } from "genkit";
import { gemini20Flash, googleAI } from "@genkit-ai/googleai";
import { FoodExtractSchema } from "../foodExtractSchema.js";
import { defineSecret } from "firebase-functions/params";
import { v4 as uuid } from "uuid";
import { MealData } from "../constants.js";

const googleAIApiKey = defineSecret("GEMINI_API_KEY");
// Function to process an image and return the extracted data
export const processImage = async (meal: MealData) => {
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
    model: gemini20Flash,
    prompt: { media: { url: meal.imageUrl } },
    output: {
      schema: FoodExtractSchema,
    },
    config: {
      apiKey: googleAIApiKey.value(),
    },
  });

  return {
    ...output,
    ingredients: output?.ingredients.map((ingredient) => ({
      ...ingredient,
      id: uuid(),
    })),
  };
};
