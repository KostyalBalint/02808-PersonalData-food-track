import admin from "firebase-admin";
import sharp from "sharp";
import fetch from "node-fetch";
import { v4 as uuid } from "uuid";

// Initialize firebase-admin SDK
admin.initializeApp({
  credential: admin.credential.cert(
    "/Users/kostyalbalint/Downloads/food-track-7bec0-firebase-adminsdk-fbsvc-a70b7d836e.json",
  ),
  databaseURL:
    "https://food-track-7bec0-default-rtdb.europe-west1.firebasedatabase.app ",
  projectId: "food-track-7bec0",
  storageBucket: "food-track-7bec0.firebasestorage.app",
});

const db = admin.firestore();
const bucket = admin.storage().bucket();

async function convertImagesToWebP() {
  try {
    const querySnapshot = await db.collection("meals").get();

    await Promise.all(
      querySnapshot.docs.map(async (doc) => {
        const data = doc.data();
        const imageUrl = data.imageUrl;
        const userId = data.userId || "unknownUser"; // Handle potential missing userId
        const mealId = doc.id;

        // Only process Anna's images
        if (userId !== "AeJpsmknsNUbpz87XFzdfu8bC4n1") {
          console.log(`Skipping user ${userId}`);
          return;
        }

        // Fetch image buffer using node-fetch
        const response = await fetch(imageUrl);
        if (!response.ok)
          throw new Error(`Failed fetch: ${response.statusText}`);

        const buffer = await response.buffer();

        // Convert to WebP using Sharp
        const processedBuffer = await sharp(buffer)
          .webp({ quality: 80 })
          .toBuffer();

        // Generate new file path
        const fileName = `images/${userId}/${mealId}-${uuid()}.webp`;

        // Upload the new WebP image to Firebase Storage
        const file = bucket.file(fileName);
        await file.save(processedBuffer, {
          metadata: {
            contentType: "image/webp",
            metadata: {
              firebaseStorageDownloadTokens: uuid(), // public access via URL if desired
            },
          },
        });

        const newDownloadURL = await file.getSignedUrl({
          action: "read",
          expires: Date.now() + 99 * 365 * 24 * 60 * 60 * 1000, // 99 years
        });

        // Update firestore document with the new URL
        await doc.ref.update({
          imageUrl: newDownloadURL,
          originalImageUrl: imageUrl,
        });

        console.log(
          `Converted ${imageUrl} to WebP and uploaded as ${fileName}`,
        );
      }),
    );

    console.log("All images processed successfully.");
  } catch (error) {
    console.error("Error converting images:", error);
  }
}

convertImagesToWebP();
