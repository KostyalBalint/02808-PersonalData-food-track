import { https, logger, pubsub } from "firebase-functions/v2";
import admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub"; // Import the Google Cloud PubSub library
import { processImage } from "./workers/processImage.js";
import { MealData } from "./constants.js";

// Initialize Firebase
admin.initializeApp();
const db = admin.firestore();
const rtdb = admin.database(); // Realtime Database for progress tracking

// Create a PubSub client
const pubSubClient = new PubSub();

// Topic for image processing jobs
const PROCESSING_TOPIC = "process-image";

// 1. Initial function that triggers the reindexing process
export const reindexAllImages = https.onCall(
  {
    cors: true,
    maxInstances: 5,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async () => {
    // Create a unique progress tracking ID
    const progressId = `reindex_${Date.now()}`;
    const progressRef = rtdb.ref(`progress/${progressId}`);

    try {
      // Initialize progress in realtime database
      await progressRef.set({
        status: "initializing",
        processed: 0,
        total: 0,
        error: null,
        failures: 0,
      });

      // Count total meals
      const mealsSnapshot = await db.collection("meals").get();
      const totalMeals = mealsSnapshot.docs.length;

      // Update total in progress tracker
      await progressRef.update({
        status: "queuing",
        total: totalMeals,
      });

      logger.info(
        `Queuing ${totalMeals} meals for processing, job ID: ${progressId}`,
      );

      // Queue each meal as a separate job
      const queuePromises = mealsSnapshot.docs.map(async (doc) => {
        const messageData = {
          mealId: doc.id,
          progressId: progressId,
        };

        // Convert to Buffer as required by PubSub
        const dataBuffer = Buffer.from(JSON.stringify(messageData));

        // Publish message to the topic
        return pubSubClient.topic(PROCESSING_TOPIC).publish(dataBuffer);
      });

      // Wait for all messages to be queued
      await Promise.all(queuePromises);

      // Update status to show all tasks have been queued
      await progressRef.update({
        status: "processing",
      });

      logger.info(
        `All ${totalMeals} meals queued for processing, job ID: ${progressId}`,
      );

      return {
        message:
          "Reindexing job started. Monitor progress with the provided ID.",
        progressId: progressId,
      };
    } catch (error) {
      logger.error("Error queuing reindexing jobs:", error);

      // Update progress with error
      await progressRef.update({
        status: "error",
        error: (error as Error).message,
      });

      return {
        message: "Failed to start reindexing job.",
        error: (error as Error).message,
        progressId: progressId,
      };
    }
  },
);

// 2. Worker function that processes a single image
export const processImageWorker = pubsub.onMessagePublished(
  {
    topic: PROCESSING_TOPIC,
    timeoutSeconds: 300, // 5 minutes per image should be enough
    memory: "1GiB",
    maxInstances: 100, // Allow high concurrency for faster processing
  },
  async (event) => {
    // Extract data from the message
    const message = event.data;
    const messageData = message.message.json;
    const { mealId, progressId } = messageData;

    if (!mealId || !progressId) {
      logger.error("Missing required fields in message data", messageData);
      return;
    }

    const progressRef = rtdb.ref(`progress/${progressId}`);

    try {
      logger.info(`Processing meal ${mealId} for job ${progressId}`);

      // Get the meal document
      const mealDoc = await db.collection("meals").doc(mealId).get();

      if (!mealDoc.exists) {
        throw new Error(`Meal document ${mealId} not found`);
      }

      const meal = mealDoc.data() as MealData;

      // Process the image
      const processedData = await processImage(meal);

      // Update the meal document with the processed data
      await db
        .collection("meals")
        .doc(mealId)
        .set(processedData, { merge: true });

      // Update the progress counter - use a transaction to safely increment
      await rtdb
        .ref(`progress/${progressId}/processed`)
        .transaction((current) => {
          return (current || 0) + 1;
        });

      // Check if processing is complete
      const snapshot = await progressRef.once("value");
      const progress = snapshot.val();

      if (progress.processed + progress.failures >= progress.total) {
        await progressRef.update({
          status: "completed",
        });
        logger.info(`Completed reindexing job ${progressId}`);
      }

      logger.info(
        `Successfully processed meal ${mealId} for job ${progressId}`,
      );
    } catch (error) {
      logger.error(
        `Error processing meal ${mealId} for job ${progressId}:`,
        error,
      );

      // Increment the failure counter - use a transaction to safely increment
      await rtdb
        .ref(`progress/${progressId}/failures`)
        .transaction((current) => {
          return (current || 0) + 1;
        });

      // Check if processing is complete (including failures)
      const snapshot = await progressRef.once("value");
      const progress = snapshot.val();

      if (progress.processed + progress.failures >= progress.total) {
        const newStatus =
          progress.failures === progress.total
            ? "failed"
            : "completed_with_errors";
        await progressRef.update({
          status: newStatus,
        });
        logger.info(
          `Completed reindexing job ${progressId} with status: ${newStatus}`,
        );
      }

      // Don't throw the error as we want the function to complete successfully
      // so the message isn't requeued
    }
  },
);
