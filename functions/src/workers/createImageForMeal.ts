import { MealData } from "../constants.js";
import { getStorage } from "firebase-admin/storage";
import { logger } from "firebase-functions";
import { generateImageFlow } from "../ai-flows/generateImageFlow.js";

export const createImageForMeal = async (
  meal: MealData,
): Promise<{ imageUrl?: string; errorMessage?: string }> => {
  try {
    // 2. Generate an image using the Genkit Flow
    logger.log(`Generating image for meal ID: ${meal.id}`);
    const imageResponse = await generateImageFlow({
      meal: {
        id: meal.id,
        name: meal.name,
        ingredients: meal.ingredients,
      },
    });

    const base64Image = imageResponse.media?.url;
    const contentType = imageResponse.media?.contentType; // e.g., 'image/jpeg' or 'image/png'
    const fileExtension = contentType?.split("/")[1] || "jpg"; // Get extension from content type

    if (!base64Image || !contentType) {
      throw new Error("Image generation failed: No image data returned.");
    }

    // 3. Upload the image to Firebase Storage
    logger.log(`Uploading image to Firebase Storage for meal ID: ${meal.id}`);
    const bucket = getStorage().bucket(); // Get default storage bucket
    const filePath = `images/${meal.userId}/${meal.id}.${fileExtension}`; // Define storage path
    const file = bucket.file(filePath);

    // Convert base64 to buffer
    const buffer = Buffer.from(
      base64Image.replace(`data:${contentType};base64,`, ""),
      "base64",
    );

    // Save the file to Firebase Storage
    await file.save(buffer, {
      metadata: {
        contentType: contentType,
        // Optional: Add custom metadata if useful
        metadata: {
          mealId: meal.id,
          generatedBy: "genkit-googleai",
        },
      },
      public: true, // Make the file publicly accessible
    });

    // 4. Return the public image URL
    const publicUrl = file.publicUrl();
    logger.log(`Image uploaded successfully: ${publicUrl}`);

    return { imageUrl: publicUrl };
  } catch (error: any) {
    logger.error(`Error creating image for meal ${meal.id}:`, error);
    // Provide a more specific error message if possible
    const message =
      error.message ||
      "An unknown error occurred during image creation or upload.";
    return { errorMessage: `Image creation failed: ${message}` };
  }
};
