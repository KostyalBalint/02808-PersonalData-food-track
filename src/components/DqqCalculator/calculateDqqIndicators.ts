// src/components/DqqCalculator/calculateDqqIndicators.ts
import {
  DqqAnswersMap,
  DqqDemographics,
  DqqQuestionKey,
  dqqQuestions,
} from "./dqqQuestions";

// Interface for the calculated results object
export interface DqqResultsState {
  gdr: number;
  ncdp: number;
  ncdr: number;
  all5: number; // 0 or 1
  all5a: number;
  all5b: number;
  all5c: number;
  all5d: number;
  all5e: number;
  mddw: number | null; // 0, 1, or null (N/A)
  fgds: number;
  zvegfr: number;
  vegfr: number;
  pulse_consumption: number;
  nuts_seeds_consumption: number;
  whole_grain_consumption: number;
  processed_meat_consumption: number;
  snf: number;
  safd: number;
  deep_fried_consumption: number;
  swtfd: number;
  swtbev: number;
  soft_drink_consumption: number;
  anml: number;
  umeat: number;
  dairy: number;
  dveg_consumption: number;
  oveg_consumption: number;
  ofr_consumption: number;
  // Include individual DQQ consumption results (0 or 1)
  [key: DqqQuestionKey]: number | null; // All DQQ keys will be number (0/1), mddw can be null
}

const num = (val: boolean | undefined | null): number => (val === true ? 1 : 0);

// Update function signature
export const calculateDqqIndicators = (
  answers: DqqAnswersMap | undefined | null,
  demographics: Partial<DqqDemographics> | undefined | null, // Accept partial demographics
): Partial<DqqResultsState> => {
  // Return empty if essential data is missing
  if (!answers || !demographics) return {};

  const DQQ = answers; // Alias for answers map
  const Age = demographics.Age ?? null; // Use nullish coalescing
  const Gender = demographics.Gender ?? null; // Use nullish coalescing

  // --- Calculation logic remains the same, using DQQ.* for answers ---
  // --- and Age/Gender directly from the demographics object    ---

  // Example: NCD-Protect (uses DQQ map)
  const ncdp =
    num(DQQ.DQQ2) +
    num(DQQ.DQQ4) +
    num(DQQ.DQQ21) +
    num(DQQ.DQQ5) +
    num(DQQ.DQQ6) +
    num(DQQ.DQQ7) +
    num(DQQ.DQQ8) +
    num(DQQ.DQQ9) +
    num(DQQ.DQQ10);

  // Example: NCD-Risk (uses DQQ map)
  const ncdr =
    num(DQQ.DQQ28) +
    num(DQQ.DQQ11) +
    num(DQQ.DQQ12) +
    num(DQQ.DQQ16) +
    num(DQQ.DQQ17 || DQQ.DQQ18) +
    num(DQQ.DQQ24) +
    num(DQQ.DQQ23 || DQQ.DQQ29) +
    num(DQQ.DQQ22);

  const gdr = ncdp - ncdr + 9;

  // Example: MDD-W (uses FGDS calculated from DQQ map, and Age/Gender from demographics)
  const fgds =
    num(DQQ.DQQ1 || DQQ.DQQ2 || DQQ.DQQ3) +
    num(DQQ.DQQ4) +
    num(DQQ.DQQ21) +
    num(DQQ.DQQ14 || DQQ.DQQ15 || DQQ.DQQ25) +
    num(DQQ.DQQ16 || DQQ.DQQ17 || DQQ.DQQ18 || DQQ.DQQ19 || DQQ.DQQ20) +
    num(DQQ.DQQ13) +
    num(DQQ.DQQ6) +
    num(DQQ.DQQ5 || DQQ.DQQ8) +
    num(DQQ.DQQ7) +
    num(DQQ.DQQ9 || DQQ.DQQ10);

  let mddw: number | null = null;
  // Ensure Age and Gender are not null before using them
  if (Gender === 1 && Age !== null && Age >= 15 && Age <= 49) {
    mddw = num(fgds >= 5);
  }

  console.log({ Gender, Age, fgds, mddw });

  // ... rest of the calculations ...
  const all5a = num(DQQ.DQQ5 || DQQ.DQQ6 || DQQ.DQQ7);
  // ... calculate all5b, all5c, all5d, all5e ...
  const all5b = num(DQQ.DQQ8 || DQQ.DQQ9 || DQQ.DQQ10);
  const all5c = num(DQQ.DQQ4 || DQQ.DQQ21);
  const all5d = num(
    DQQ.DQQ13 ||
      DQQ.DQQ14 ||
      DQQ.DQQ15 ||
      DQQ.DQQ16 ||
      DQQ.DQQ17 ||
      DQQ.DQQ18 ||
      DQQ.DQQ19 ||
      DQQ.DQQ20 ||
      DQQ.DQQ25,
  );
  const all5e = num(DQQ.DQQ1 || DQQ.DQQ2 || DQQ.DQQ3);

  const all5 = num(
    all5a === 1 && all5b === 1 && all5c === 1 && all5d === 1 && all5e === 1,
  );

  // --- Other Indicators ---
  const vegfr = num(
    DQQ.DQQ5 || DQQ.DQQ6 || DQQ.DQQ7 || DQQ.DQQ8 || DQQ.DQQ9 || DQQ.DQQ10,
  );
  const zvegfr = num(vegfr === 0);
  // ... calculate other indicators (safd, swtfd, swtbev, snf, dairy, etc.) ...
  const safd = num(DQQ.DQQ22 || DQQ.DQQ23 || DQQ.DQQ24);
  const swtfd = num(DQQ.DQQ11 || DQQ.DQQ12);
  const swtbev = num(DQQ.DQQ26 || DQQ.DQQ27 || DQQ.DQQ28);
  const snf = num(DQQ.DQQ22 || DQQ.DQQ23 || DQQ.DQQ29);
  const dairy = num(DQQ.DQQ14 || DQQ.DQQ15 || DQQ.DQQ25);
  const dveg = num(DQQ.DQQ6);
  const anml = num(
    DQQ.DQQ16 || DQQ.DQQ17 || DQQ.DQQ18 || DQQ.DQQ19 || DQQ.DQQ20,
  );
  const ofr = num(DQQ.DQQ10);
  const oveg = num(DQQ.DQQ7);
  const umeat = num(DQQ.DQQ17 || DQQ.DQQ18);

  // Individual items
  const dqqConsumed = dqqQuestions.reduce(
    (acc, q) => {
      acc[q.key as DqqQuestionKey] = num(DQQ[q.key as DqqQuestionKey]);
      return acc;
    },
    {} as { [K in DqqQuestionKey]: number },
  );

  const results: Partial<DqqResultsState> = {
    // Ensure return matches Partial<DqqResultsState>
    gdr,
    ncdp,
    ncdr,
    all5,
    all5a,
    all5b,
    all5c,
    all5d,
    all5e,
    mddw,
    fgds,
    zvegfr,
    vegfr,
    pulse_consumption: num(DQQ.DQQ4),
    nuts_seeds_consumption: num(DQQ.DQQ21),
    whole_grain_consumption: num(DQQ.DQQ2),
    processed_meat_consumption: num(DQQ.DQQ16),
    snf,
    safd,
    deep_fried_consumption: num(DQQ.DQQ24),
    swtfd,
    swtbev,
    soft_drink_consumption: num(DQQ.DQQ28),
    anml,
    umeat,
    dairy,
    dveg_consumption: dveg,
    oveg_consumption: oveg,
    ofr_consumption: ofr,
    ...dqqConsumed,
  };

  return results;
};
