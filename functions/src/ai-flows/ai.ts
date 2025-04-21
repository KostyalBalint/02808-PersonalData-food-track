import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/googleai";
import { vertexAI } from "@genkit-ai/vertexai";

// Initialize Genkit AI instance within the flow if not globally configured
// Or configure it globally once in your application setup
export const ai = genkit({ plugins: [googleAI(), vertexAI()] });
