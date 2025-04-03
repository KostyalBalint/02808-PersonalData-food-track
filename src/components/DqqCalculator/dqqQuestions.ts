// src/components/DqqCalculator/dqqQuestions.ts

// Interface for a single DQQ question item
export interface DqqQuestion {
  key: string;
  label: string;
}

export const dqqQuestions: ReadonlyArray<DqqQuestion> = [
  {
    key: "DQQ1",
    label:
      "01 Foods made from grains (like maize, rice, wheat, bread, pasta, porridge)",
  },
  {
    key: "DQQ2",
    label:
      "02 Whole grains (like brown rice, whole wheat bread, whole grain cereal)",
  },
  {
    key: "DQQ3",
    label:
      "03 White roots or tubers (like potatoes, yams, cassava, manioc - not orange inside)",
  },
  { key: "DQQ4", label: "04 Pulses (beans, peas, lentils)" },
  {
    key: "DQQ5",
    label:
      "05 Vitamin A-rich orange vegetables (like carrots, pumpkin, orange sweet potatoes)",
  },
  {
    key: "DQQ6",
    label: "06 Dark green leafy vegetables (like spinach, kale, local greens)",
  },
  {
    key: "DQQ7",
    label: "07 Other vegetables (like tomatoes, onions, eggplant)",
  },
  {
    key: "DQQ8",
    label: "08 Vitamin A-rich fruits (like ripe mangoes, papayas)",
  },
  { key: "DQQ9", label: "09 Citrus fruits (like oranges, lemons, tangerines)" },
  { key: "DQQ10", label: "10 Other fruits (like apples, bananas, grapes)" },
  {
    key: "DQQ11",
    label:
      "11 Baked or grain-based sweets (like cakes, cookies, pastries, sweet biscuits)",
  },
  { key: "DQQ12", label: "12 Other sweets (like chocolate, candies, sugar)" },
  { key: "DQQ13", label: "13 Eggs" },
  { key: "DQQ14", label: "14 Cheese" },
  { key: "DQQ15", label: "15 Yogurt (including yogurt drinks)" },
  {
    key: "DQQ16",
    label: "16 Processed meats (like sausages, hot dogs, salami, canned meat)",
  },
  {
    key: "DQQ17",
    label: "17 Unprocessed red meat (ruminant - beef, lamb, goat)",
  },
  { key: "DQQ18", label: "18 Unprocessed red meat (non-ruminant - pork)" },
  { key: "DQQ19", label: "19 Poultry (chicken, turkey, duck)" },
  { key: "DQQ20", label: "20 Fish or seafood" },
  { key: "DQQ21", label: "21 Nuts or seeds" },
  {
    key: "DQQ22",
    label: "22 Packaged ultra-processed salty snacks (like chips, crisps)",
  },
  { key: "DQQ23", label: "23 Instant noodles" },
  {
    key: "DQQ24",
    label: "24 Deep fried foods (from restaurants or street vendors)",
  },
  { key: "DQQ25", label: "25 Milk (fluid milk, powdered milk reconstituted)" },
  { key: "DQQ26", label: "26 Sweet tea, coffee, or cocoa (with sugar added)" },
  {
    key: "DQQ27",
    label: "27 Fruit juice or fruit drinks (packaged or freshly made)",
  },
  { key: "DQQ28", label: "28 Soft drinks, energy drinks, or sports drinks" },
  { key: "DQQ29", label: "29 Fast food (purchased from fast-food outlets)" },
] as const; // Use 'as const' for stricter typing of keys if needed later

export type DqqQuestionKey = (typeof dqqQuestions)[number]["key"];

// Type for the DQQ answers part of the state/DB
export type DqqAnswersMap = {
  [K in DqqQuestionKey]?: boolean; // All keys are optional initially, store as boolean
};

// Type for the Demographics part of the state/DB
export interface DqqDemographics {
  Age: number | null;
  Gender: 0 | 1 | null; // 1: Female, 0: Male
}

// --- Type for the main data structure stored in Firestore under meals/{mealId} ---
export interface MealDqqData {
  demographics?: Partial<DqqDemographics>; // Optional demographics
  answers?: DqqAnswersMap; // Optional answers
  lastUpdated?: any; // Firestore ServerTimestamp on write
  // Add any other DQQ related metadata if needed later
}

// Type for the data structure within the meal document
export interface MealDocument {
  dqqData?: MealDqqData; // All DQQ stuff nested here
  // Other potential top-level meal properties (e.g., mealName, date)
  mealName?: string;
}

// --- Initial States ---

export const initialDemographicsState: DqqDemographics = {
  Age: null,
  Gender: null,
};

export const initialAnswersState: DqqAnswersMap = dqqQuestions.reduce(
  (acc, q) => {
    acc[q.key as DqqQuestionKey] = false; // Default all to false
    return acc;
  },
  {} as DqqAnswersMap,
);

export const initialMealDqqData: MealDqqData = {
  demographics: initialDemographicsState,
  answers: initialAnswersState,
};
