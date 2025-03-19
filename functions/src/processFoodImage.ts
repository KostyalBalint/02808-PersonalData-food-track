import { onDocumentCreated } from "firebase-functions/v2/firestore";

// @ts-expect-error Only type import
import { MealData } from "../../src/constants";

exports.documentCreatedHandler = onDocumentCreated(
  "meals/{mealId}",
  (event) => {
    event.data?.ref.set(
      {
        ingredients: [
          {
            amount: 0,
            name: "NA",
            unit: "NA",
          },
        ],
      } as Partial<MealData>,
      {
        merge: true,
      },
    );
  },
);
