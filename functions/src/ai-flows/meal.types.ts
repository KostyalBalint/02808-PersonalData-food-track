// NutritionalData schema
import * as z from "zod";

const NutritionalDataSchema = z.object({
  Vegetables: z.number().describe("The amount of Vegetables consumed in grams"),
  Grains: z.number().describe("The amount of Grains consumed in grams"),
  Dairy: z.number().describe("The amount of Dairy consumed in grams"),
  Meat: z.number().describe("The amount of Meat consumed in grams"),
  FatsOils: z
    .number()
    .describe("The amount of Fats and Oils consumed in grams"),
  Sweet: z
    .number()
    .describe("The amount of Sweets and High fat products consumed in grams"),
});
// Ingredient schema
const IngredientSchema = z.object({
  amount: z.number().describe("The amount of the ingredient"),
  unit: z.string().describe("The unit of the ingredient like (Pcs, gram, ml)"),
  name: z.string().describe("The name of the ingredient"),
  id: z
    .string()
    .describe(
      "A unique ID for this specific ingredient, in this specific food",
    ),
});
// DqqAnswersMap schema
const DqqAnswersSchema = z.object({
  DQQ1: z
    .boolean()
    .describe(
      "01 Foods made from grains (like maize, rice, wheat, bread, pasta, porridge)",
    ),
  DQQ2: z
    .boolean()
    .describe(
      "02 Whole grains (like brown rice, whole wheat bread, whole grain cereal)",
    ),
  DQQ3: z
    .boolean()
    .describe(
      "03 White roots or tubers (like potatoes, yams, cassava, manioc - not orange inside)",
    ),
  DQQ4: z.boolean().describe("04 Pulses (beans, peas, lentils)"),
  DQQ5: z
    .boolean()
    .describe(
      "05 Vitamin A-rich orange vegetables (like carrots, pumpkin, orange sweet potatoes)",
    ),
  DQQ6: z
    .boolean()
    .describe(
      "06 Dark green leafy vegetables (like spinach, kale, local greens)",
    ),
  DQQ7: z
    .boolean()
    .describe("07 Other vegetables (like tomatoes, onions, eggplant)"),
  DQQ8: z
    .boolean()
    .describe("08 Vitamin A-rich fruits (like ripe mangoes, papayas)"),
  DQQ9: z
    .boolean()
    .describe("09 Citrus fruits (like oranges, lemons, tangerines)"),
  DQQ10: z.boolean().describe("10 Other fruits (like apples, bananas, grapes)"),
  DQQ11: z
    .boolean()
    .describe(
      "11 Baked or grain-based sweets (like cakes, cookies, pastries, sweet biscuits)",
    ),
  DQQ12: z
    .boolean()
    .describe("12 Other sweets (like chocolate, candies, sugar)"),
  DQQ13: z.boolean().describe("13 Eggs"),
  DQQ14: z.boolean().describe("14 Cheese"),
  DQQ15: z.boolean().describe("15 Yogurt (including yogurt drinks)"),
  DQQ16: z
    .boolean()
    .describe(
      "16 Processed meats (like sausages, hot dogs, salami, canned meat)",
    ),
  DQQ17: z
    .boolean()
    .describe("17 Unprocessed red meat (ruminant - beef, lamb, goat)"),
  DQQ18: z.boolean().describe("18 Unprocessed red meat (non-ruminant - pork)"),
  DQQ19: z.boolean().describe("19 Poultry (chicken, turkey, duck)"),
  DQQ20: z.boolean().describe("20 Fish or seafood"),
  DQQ21: z.boolean().describe("21 Nuts or seeds"),
  DQQ22: z
    .boolean()
    .describe("22 Packaged ultra-processed salty snacks (like chips, crisps)"),
  DQQ23: z.boolean().describe("23 Instant noodles"),
  DQQ24: z
    .boolean()
    .describe("24 Deep fried foods (from restaurants or street vendors)"),
  DQQ25: z
    .boolean()
    .describe("25 Milk (fluid milk, powdered milk reconstituted)"),
  DQQ26: z
    .boolean()
    .describe("26 Sweet tea, coffee, or cocoa (with sugar added)"),
  DQQ27: z
    .boolean()
    .describe("27 Fruit juice or fruit drinks (packaged or freshly made)"),
  DQQ28: z
    .boolean()
    .describe("28 Soft drinks, energy drinks, or sports drinks"),
  DQQ29: z
    .boolean()
    .describe("29 Fast food (purchased from fast-food outlets)"),
});
// DqqData schema (assuming DqqAnswersMap and Timestamp are defined elsewhere)
const DqqDataSchema = z.object({
  answers: DqqAnswersSchema, // Replace with actual schema for DqqAnswersMap if available
});
// MealData schema
export const MealDataSchema = z.object({
  id: z.string(),
  name: z.string(),
  ingredients: z.array(IngredientSchema).optional(),
  dqqData: DqqDataSchema.optional(),
  nutrition: NutritionalDataSchema.optional(),
});
