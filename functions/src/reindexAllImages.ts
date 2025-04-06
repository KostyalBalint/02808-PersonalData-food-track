import { https, logger, pubsub } from "firebase-functions/v2";
import admin from "firebase-admin";
import { PubSub } from "@google-cloud/pubsub"; // Import the Google Cloud PubSub library
import { processImage } from "./workers/processImage.js"; // Assuming your worker logic is here
import { MealData } from "./constants.js"; // Assuming your type definition is here

// Initialize Firebase
// Ensure you only initialize ONCE per process, typically at the top level
if (!admin.apps.length) {
  admin.initializeApp();
}
const db = admin.firestore();
const rtdb = admin.database(); // Realtime Database for progress tracking

// Create a PubSub client
const pubSubClient = new PubSub();

// Topic for image processing jobs
const PROCESSING_TOPIC = "process-image"; // Make sure this topic exists in your GCP project

// --- Helper Function to Queue a Single Meal ---
// This encapsulates the common logic for queuing and progress setup
export async function queueMealForProcessing(
  mealId: string,
  isSingleJob: boolean = false,
) {
  // Create a unique progress tracking ID
  // Add mealId for single jobs for potentially easier identification, though timestamp ensures uniqueness
  const baseId = isSingleJob ? `reindex_single_${mealId}` : "reindex_all";
  const progressId = `${baseId}_${Date.now()}`;
  const progressRef = rtdb.ref(`progress/${progressId}`);

  try {
    // Fetch the meal document to ensure it exists before queueing
    const mealDoc = await db.collection("meals").doc(mealId).get();
    if (!mealDoc.exists) {
      throw new Error(`Meal document ${mealId} not found.`);
    }

    // Initialize progress in realtime database
    // For single jobs, total is 1
    await progressRef.set({
      status: "initializing",
      processed: 0,
      total: 1, // Single meal job
      error: null,
      failures: 0,
      jobType: isSingleJob ? "single" : "all", // Add job type for clarity
      mealId: isSingleJob ? mealId : null, // Store mealId for single jobs
    });

    // Update status to indicate queueing
    await progressRef.update({
      status: "queuing",
    });

    logger.info(`Queuing meal ${mealId} for processing, job ID: ${progressId}`);

    // Prepare message data
    const messageData = {
      mealId: mealId,
      progressId: progressId, // Pass the specific progressId for this job
    };

    // Convert to Buffer as required by PubSub
    const dataBuffer = Buffer.from(JSON.stringify(messageData));

    // Publish message to the topic
    await pubSubClient.topic(PROCESSING_TOPIC).publish(dataBuffer);

    // Update status to show the task has been queued and is now processing
    await progressRef.update({
      status: "processing",
    });

    logger.info(`Meal ${mealId} queued for processing, job ID: ${progressId}`);

    return {
      message: `Reindexing job started for meal ${mealId}. Monitor progress with the provided ID.`,
      progressId: progressId,
    };
  } catch (error) {
    if (error instanceof Error) {
      logger.error(`Error queuing meal ${mealId}:`, error);
      // Attempt to update progress with error, might fail if set hasn't completed
      try {
        await progressRef.update({
          status: "error",
          error: error.message || "Unknown error during queueing.",
        });
      } catch (updateError) {
        logger.error(
          `Failed to update progress for ${progressId} after queueing error:`,
          updateError,
        );
      }
      // Re-throw or return error structure
      return {
        message: `Failed to start reindexing job for meal ${mealId}.`,
        error: error.message || "Unknown error.",
        progressId: progressId, // Return ID even on failure if generated
      };
    }
    throw new https.HttpsError("internal", "Failed to start reindexing job.");
  }
}

// 1. Function to trigger reindexing for ALL meals
export const reindexAllImages = https.onCall(
  {
    cors: true, // Allow requests from your web app domain
    maxInstances: 5,
    timeoutSeconds: 60, // Timeout for *starting* the job, not finishing it
    memory: "256MiB",
  },
  async (request) => {
    // Optional: Add authentication check if needed
    // if (!request.auth) {
    //   throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }
    // logger.info(`Reindex All requested by UID: ${request.auth.uid}`);

    // Create a unique progress tracking ID for the overall batch
    const batchProgressId = `reindex_all_${Date.now()}`;
    const progressRef = rtdb.ref(`progress/${batchProgressId}`);

    try {
      // Initialize overall progress in realtime database
      await progressRef.set({
        status: "initializing",
        processed: 0,
        total: 0, // Will be updated after counting
        error: null,
        failures: 0,
        jobType: "all",
      });

      let query = db.collection("meals");

      if (request.data.userId) {
        // @ts-expect-error shiti firebase
        query = db
          .collection("meals")
          .where("userId", "==", request.data.userId);
      }

      // Count total meals
      const mealsSnapshot = await query.get();
      const totalMeals = mealsSnapshot.docs.length;

      if (totalMeals === 0) {
        await progressRef.update({ status: "completed", total: 0 });
        logger.info("No meals found to reindex.");
        return {
          message: "No meals found to reindex.",
          progressId: batchProgressId,
        };
      }

      // Update total in progress tracker
      await progressRef.update({
        status: "queuing",
        total: totalMeals,
      });

      logger.info(
        `Queuing ${totalMeals} meals for processing, batch job ID: ${batchProgressId}`,
      );

      // Queue each meal as a separate job using the *same* PubSub topic
      // but link them via the batchProgressId in the message
      const queuePromises = mealsSnapshot.docs.map(async (doc) => {
        const messageData = {
          mealId: doc.id,
          progressId: batchProgressId, // All workers report to the same batch progress ID
        };
        const dataBuffer = Buffer.from(JSON.stringify(messageData));
        return pubSubClient.topic(PROCESSING_TOPIC).publish(dataBuffer);
      });

      // Wait for all messages to be queued
      await Promise.all(queuePromises);

      // Update status to show all tasks have been queued
      await progressRef.update({
        status: "processing",
      });

      logger.info(
        `All ${totalMeals} meals queued for processing, batch job ID: ${batchProgressId}`,
      );

      return {
        message:
          "Reindexing job started for all meals. Monitor progress with the provided ID.",
        progressId: batchProgressId,
      };
    } catch (error) {
      if (error instanceof Error) {
        logger.error("Error queuing reindexing all jobs:", error);
        // Update progress with error
        try {
          await progressRef.update({
            status: "error",
            error: error.message || "Unknown error during batch queueing.",
          });
        } catch (updateError) {
          logger.error(
            `Failed to update progress for ${batchProgressId} after batch queueing error:`,
            updateError,
          );
        }
        // Throw HttpsError for the client
        throw new https.HttpsError(
          "internal",
          "Failed to start reindexing job.",
          { error: error.message },
        );
      }
      throw new https.HttpsError("internal", "Failed to start reindexing job.");
    }
  },
);

// 2. NEW Function to trigger reindexing for a SINGLE meal
export const reindexSingleMeal = https.onCall(
  {
    cors: true, // Allow requests from your web app domain
    maxInstances: 5,
    timeoutSeconds: 60, // Timeout for *starting* the job, not finishing it
    memory: "256MiB",
  },
  async (request) => {
    // Optional: Add authentication check if needed
    // if (!request.auth) {
    //   throw new https.HttpsError('unauthenticated', 'The function must be called while authenticated.');
    // }

    const mealId = request.data.mealId;

    if (!mealId || typeof mealId !== "string") {
      logger.error("Missing or invalid mealId in request data", request.data);
      throw new https.HttpsError(
        "invalid-argument",
        'The function must be called with a "mealId" string in the data payload.',
      );
    }

    // logger.info(`Reindex Single Meal requested by UID: ${request.auth?.uid} for Meal ID: ${mealId}`);

    // Use the helper function to queue the meal
    const result = await queueMealForProcessing(mealId, true); // Pass true for isSingleJob

    // Check if the helper function indicated an error
    if (result.error) {
      // Log the specific error from the helper
      logger.error(`Failed to queue single meal ${mealId}: ${result.error}`);
      // Throw HttpsError for the client
      throw new https.HttpsError("internal", result.message, {
        error: result.error,
        progressId: result.progressId, // Include progressId even on failure
      });
    }

    // Return success response from the helper
    return result;
  },
);

// 3. Worker function that processes a single image (No changes needed here)
export const processImageWorker = pubsub.onMessagePublished(
  {
    topic: PROCESSING_TOPIC,
    timeoutSeconds: 300, // 5 minutes per image should be enough
    memory: "1GiB", // Keep memory potentially high for image processing
    maxInstances: 100, // Allow high concurrency
    retry: false, // Important: Disable automatic retries by Cloud Functions/PubSub
    // We handle failures manually by incrementing 'failures' count.
    // If retry is true, a failing message might be processed multiple times,
    // incorrectly incrementing the failure count.
  },
  async (event) => {
    const message = event.data;
    let messageData;

    try {
      // Defensive parsing of message data
      if (!message?.message?.data) {
        logger.error("Received message without data field.");
        return; // Acknowledge message to prevent retries
      }
      const decodedData = Buffer.from(message.message.data, "base64").toString(
        "utf8",
      );
      messageData = JSON.parse(decodedData);
    } catch (e) {
      logger.error("Failed to parse message data", {
        error: e,
        rawData: message?.message?.data,
      });
      return; // Acknowledge malformed message
    }

    const { mealId, progressId } = messageData;

    if (!mealId || !progressId) {
      logger.error("Missing mealId or progressId in message data", messageData);
      // Acknowledge the message - it's malformed and cannot be processed.
      return;
    }

    const progressRef = rtdb.ref(`progress/${progressId}`);
    let progressData = null; // To store progress data once fetched

    try {
      logger.info(`Processing meal ${mealId} for job ${progressId}`);

      // --- Check Job Status Before Processing ---
      // Optimization: Fetch progress data once. Avoid processing if job is already finished/failed.
      const progressSnapshot = await progressRef.once("value");
      progressData = progressSnapshot.val();

      if (!progressData) {
        logger.warn(
          `Progress node ${progressId} not found. Might be an old message or race condition.`,
        );
        return; // Acknowledge message
      }

      // Avoid processing if job is already marked as completed, failed, or errored out at the start
      if (
        ["completed", "failed", "error", "completed_with_errors"].includes(
          progressData.status,
        )
      ) {
        logger.warn(
          `Job ${progressId} already in terminal state (${progressData.status}). Skipping processing for meal ${mealId}.`,
        );
        return; // Acknowledge message
      }
      // Ensure status is 'processing' or 'queuing' before proceeding
      if (
        progressData.status !== "processing" &&
        progressData.status !== "queuing"
      ) {
        // If it was initializing, force it to processing now that a worker picked it up
        if (progressData.status === "initializing") {
          logger.info(
            `Job ${progressId} status was 'initializing', setting to 'processing'.`,
          );
          await progressRef.update({ status: "processing" });
        } else {
          logger.warn(
            `Job ${progressId} has unexpected status ${progressData.status}. Skipping processing for meal ${mealId}.`,
          );
          return; // Acknowledge message
        }
      }

      // Get the meal document
      const mealDoc = await db.collection("meals").doc(mealId).get();

      if (!mealDoc.exists) {
        // Meal deleted between queueing and processing?
        throw new Error(`Meal document ${mealId} not found during processing.`);
      }

      const meal = mealDoc.data() as MealData;

      // Process the image (YOUR CORE LOGIC)
      const processedData = await processImage(meal); // Assuming processImage returns the fields to update

      // Update the meal document with the processed data
      // Use update instead of set({ merge: true }) for potentially better performance if only updating specific fields
      await db.collection("meals").doc(mealId).update(processedData);

      // Update the progress counter - use a transaction for safety
      await rtdb
        .ref(`progress/${progressId}/processed`)
        .transaction((current: number | null) => {
          return (current || 0) + 1;
        });

      // Refetch progress data *after* transaction to get the most up-to-date counts
      const finalProgressSnapshot = await progressRef.once("value");
      const finalProgress = finalProgressSnapshot.val();

      // Check if processing is complete *after* successful processing
      if (
        finalProgress &&
        finalProgress.processed + (finalProgress.failures || 0) >=
          finalProgress.total
      ) {
        const finalStatus =
          (finalProgress.failures || 0) > 0
            ? "completed_with_errors"
            : "completed";
        await progressRef.update({ status: finalStatus });
        logger.info(
          `Completed reindexing job ${progressId} with status: ${finalStatus}`,
        );
      } else if (finalProgress) {
        // Optional: Log progress if needed
        // logger.info(`Progress for job ${progressId}: ${finalProgress.processed}/${finalProgress.total} processed, ${finalProgress.failures || 0} failures.`);
      }

      logger.info(
        `Successfully processed meal ${mealId} for job ${progressId}`,
      );
    } catch (error) {
      logger.error(
        `Error processing meal ${mealId} for job ${progressId}:`,
        error,
      );

      // Increment the failure counter using a transaction
      // Check if progressRef is valid before attempting transaction
      if (progressRef) {
        try {
          await rtdb
            .ref(`progress/${progressId}/failures`)
            .transaction((current: number | null) => {
              return (current || 0) + 1;
            });

          // Refetch progress data *after* failure transaction
          const finalProgressSnapshot = await progressRef.once("value");
          const finalProgress = finalProgressSnapshot.val();

          // Check if processing is complete (including this failure)
          if (
            finalProgress &&
            finalProgress.processed + finalProgress.failures >=
              finalProgress.total
          ) {
            const newStatus =
              finalProgress.processed === 0
                ? "failed"
                : "completed_with_errors";
            await progressRef.update({ status: newStatus });
            logger.info(
              `Completed reindexing job ${progressId} with status: ${newStatus}`,
            );
          }
        } catch (transactionError) {
          logger.error(
            `Failed to update failure count for job ${progressId} meal ${mealId}:`,
            transactionError,
          );
          // Even if we can't update the count, we should acknowledge the message
          // to prevent infinite retries on the transaction itself. The main error is already logged.
        }
      } else {
        logger.error(
          `Progress ref ${progressId} was not available to update failure count.`,
        );
      }

      // Acknowledge the message even on error (because retry: false).
      // We've logged the error and updated the failure count.
    }
  },
);

// --- Ensure your worker logic and types are correctly imported ---
// Example placeholder for processImage.js:
/*
export const processImage = async (mealData: MealData): Promise<Partial<MealData>> => {
  logger.info(`Simulating image processing for meal ID: ${mealData.id}`); // Assuming MealData has an id
  // Replace with your actual image processing logic (e.g., call Vision AI, generate thumbnails, etc.)
  await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate async work
  const analysisResult = {
    lastProcessed: new Date().toISOString(),
    imageAnalysis: { tags: ['food', 'processed'], color: 'yellow' } // Example data
  };
  logger.info(`Finished simulating processing for meal ID: ${mealData.id}`);
  return analysisResult;
};
*/

// Example placeholder for constants.ts:
/*
export interface MealData {
  id: string; // Assuming meal has an ID field
  name: string;
  imageUrl: string;
  lastProcessed?: string;
  imageAnalysis?: any;
  // other fields...
}
*/
