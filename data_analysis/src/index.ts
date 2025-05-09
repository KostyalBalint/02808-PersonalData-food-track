import fs from "node:fs";
import path from "node:path";
import { MealItem, User } from "./types";
import { calculateDqqIndicators } from "./calculateDQQ";
import { mergeMultipleDQQ } from "./mergeMultipleDQQ";

type ExportedData = {
  exportedAt: string;
  collections: {
    users: {
      [key: string]: User;
    };
    meals: {
      [key: string]: MealItem;
    };
  };
};

const dataPath = path.join(
  "data",
  "firestore-export-2025-05-05T09-56-26-914Z.json"
);

const data = fs.readFileSync(dataPath, "utf-8");
const jsonData = JSON.parse(data) as ExportedData;

const mealIds = Object.keys(jsonData.collections.meals);
const userIds = Object.keys(jsonData.collections.users);

console.log(`Total meals: ${mealIds.length}`);
console.log(`Total users: ${userIds.length}`);

const usersWithMeals = userIds
  .map((userId) => {
    const user = jsonData.collections.users[userId];
    const meals = Object.values(jsonData.collections.meals)
      .filter((meal) => {
        return meal.userId === userId;
      })
      .filter((meal) => {
        //Filter out old meals, older than cutoff date
        const date = new Date(meal.createdAt.seconds * 1000);
        const cutoffDate = new Date("2025-04-06");
        return date >= cutoffDate;
      })
      .map((meal) => {
        const date = new Date(meal.createdAt.seconds * 1000);

        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0"); // Months are 0-based
        const day = String(date.getDate()).padStart(2, "0");
        return {
          ...meal,
          key: `${year}-${month}-${day}`,
        };
      });
    const dailyGroupedMeals: Record<string, MealItem[]> = meals.reduce(
      (previousValue, current) => ({
        ...previousValue,
        [current.key]: [...(previousValue[current.key] || []), current],
      }),
      {}
    );
    return {
      user,
      meals,
      dailyGroupedMeals,
    };
  })
  .filter((user) => {
    // Only care about users with more than 8 days of meals, and have more than 14 meals
    return (
      Object.keys(user.dailyGroupedMeals).length > 8 && user.meals.length > 14
    );
  });

usersWithMeals.forEach((user) => {
  console.log(`${user.user.displayName} (${user.user.role})`);
  console.log(`\tMeals: ${user.meals.length}`);
  console.log(
    `\tDays with meals: ${Object.keys(user.dailyGroupedMeals).length}`
  );
});

console.log(`Total users with meals: ${usersWithMeals.length}`);

const usersWithMealsAndDqq = usersWithMeals.map((user) => {
  return {
    user: user.user,
    dailyGroupedMeals: Object.entries(user.dailyGroupedMeals).map(
      ([key, meals]) => {
        if (!user.user.demographics) {
          console.log("No demographics found for user", user.user.displayName);
        }
        const dqq = calculateDqqIndicators(
          mergeMultipleDQQ(
            meals.filter((m) => m.dqqData).map((m) => m.dqqData.answers)
          ),
          {
            Age: user.user.demographics.Age,
            Gender: user.user.demographics.Age as 0 | 1,
          }
        );
        return {
          day: key,
          meals,
          dqq,
        };
      }
    ),
  };
});

//Write out the file

fs.writeFileSync(
  path.join("data", "usersWithMealsAndDqq.json"),
  JSON.stringify(usersWithMealsAndDqq, null, 2)
);
