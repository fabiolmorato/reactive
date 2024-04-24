import { reactive, computed, reset } from "../../lib/reactive.js";

import { waitUntil } from "../utils/wait-until.js";

describe("Reactive", () => {
  beforeEach(() => {
    reset();
  });
  
  it("should create a reactive state object", () => {
    const state = reactive({
      count: 0
    });

    expect(state.count).toBe(0);
  });

  it("should update the computed state object value", async () => {
    const state = reactive({
      count: 0,
      double: computed((state) => state.count * 2)
    });

    await waitUntil(() => state.double === 0);
    state.count = 10;
    await waitUntil(() => state.double === 20);
  });
});
