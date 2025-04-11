// Initialize Genkit and configure the Vertex AI plugin
import { genkit, z } from "genkit";
import { vertexAI, imagen3Fast } from "@genkit-ai/vertexai";

const ai = genkit({ plugins: [vertexAI()] });
// Define a Genkit Flow for image generation
export const generateImageFlow = ai.defineFlow(
  {
    name: "generateImage",
    inputSchema: z.object({
      meal: z.object({
        id: z.string(),
        name: z.string(),
        ingredients: z
          .array(
            z.object({
              amount: z.number(),
              unit: z.string(),
              name: z.string(),
            }),
          )
          .optional(),
      }),
    }),
    outputSchema: z.object({
      media: z
        .object({
          url: z.string().nullish(),
          contentType: z.string().nullish(),
        })
        .nullish(),
    }),
  },
  async ({ meal }) => {
    // Generate a prompt to send to Imagen 3
    const prompt = `A visually appealing, high-quality photograph of a prepared dish: ${meal.name}. \nIngredients of the meal: \n${meal.ingredients?.map((ing) => `${ing.amount} ${ing.unit} ${ing.name}\n`)}\n\nFood photography style, emphasizing freshness and deliciousness. Natural lighting.`;

    // Execute image generation using Imagen 3 on Vertex AI
    const response = await ai.generate({
      model: imagen3Fast, // Model to use
      prompt: prompt, // Generation prompt
      config: {
        temperature: 0.7, // Degree of creativity (0.0 - 1.0)
      },
      output: {
        format: `media`, // Specify that the output should be image data
      },
    });

    return {
      media: response.media,
    };
  },
);
