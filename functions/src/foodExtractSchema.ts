import { z } from "genkit";

export const FoodExtractSchema = z.object({
  name: z
    .string()
    .describe("Name of the dish in the image (Required, max 100 characters)"),
  //ingredients?: { amount: number; unit: string; name: string; id: string }[];
  errorMessage: z
    .string()
    .optional()
    .describe("Error message if the image is unclear"),
  ingredients: z
    .array(
      z
        .object({
          name: z.string().describe("Name of the ingredient (Required)"),
          amount: z.number().describe("Amount of the specific ingredient"),
          unit: z
            .enum(["Pcs", "grams", "liter"])
            .describe(
              'Unit of the amount (Required, Allowed values: "Pcs", "grams", "liter"',
            ),
          categories: z
            .array(
              z.enum([
                "Grains",
                "Vegetables",
                "Fruits",
                "Protein",
                "Dairy",
                "Fats and Sweets",
              ]),
            )
            .describe("Categories of the ingredient"),
        })
        .describe("Specific ingredient of the dish"),
    )
    .describe("All the ingredients the dish is made out of"),
});
