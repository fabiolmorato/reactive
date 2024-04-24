import { sleep } from "./sleep.js";

export const waitUntil = async (condition, interval = 10, maxAttempts = 100, currentAttempt = 0) => {
  if (currentAttempt >= maxAttempts) {
    throw new Error("waitUntil: max attempts reached");
  }

  if (await condition()) {
    return;
  }

  await sleep(interval);
  return waitUntil(condition, interval, maxAttempts, currentAttempt + 1);
}
