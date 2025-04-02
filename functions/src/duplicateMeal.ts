import admin from "firebase-admin";

const db = admin.firestore();

/**
 * Duplicates a meal document in Firestore
 * @param {string} mealId - The ID of the meal to duplicate
 * @returns {Promise<string>} - The new meal ID
 */
export async function duplicateMeal(mealId: string): Promise<string> {
    try {
        // Get the original meal document
        const mealRef = db.collection("meals").doc(mealId);
        const mealSnap = await mealRef.get();

        if (!mealSnap.exists) {
            throw new Error(`Meal with ID ${mealId} does not exist.`);
        }

        const mealData = mealSnap.data();
        if (!mealData) {
            throw new Error("Meal data is empty.");
        }

        // Remove unique fields (modify as needed)
        delete mealData.id; // If ID exists in the document itself
        delete mealData.createdAt; // Optional: Reset creation date

        // Add a new document (Firebase auto-generates an ID)
        const newMealRef = await db.collection("meals").add({
            ...mealData,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        console.log(`Meal duplicated successfully with new ID: ${newMealRef.id}`);
        return newMealRef.id;
    } catch (error) {
        console.error("Error duplicating meal:", error);
        throw error;
    }
}
