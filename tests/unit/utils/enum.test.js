import { Enum } from "../../../lib/utils/enum.js";

describe("Enum", () => {
  it("should return an infinite generator of unique symbols", () => {
    const enumGen = Enum();
    const symbols = new Set();

    for (let i = 0; i < 10; i++) {
      const symbol = enumGen.next().value;
      expect(symbols.has(symbol)).toBe(false);
      symbols.add(symbol);
    }

    expect(symbols.size).toBe(10);
  });

  it("should return an infinite generator of numbers", () => {
    const enumGen = Enum.number();
    const numbers = new Set();

    for (let i = 0; i < 10; i++) {
      const number = enumGen.next().value;
      expect(numbers.has(number)).toBe(false);
      numbers.add(number);
    }

    expect(numbers.size).toBe(10);
  });

  it("should return an object with properties equal to the arguments", () => {
    const obj = Enum.object("prop1", "prop2", "prop3");

    expect(obj).toEqual({
      prop1: "prop1",
      prop2: "prop2",
      prop3: "prop3"
    });
  });

  it("should return a destructurable array of symbols", () => {
    const [symbol1, symbol2, symbol3] = Enum();

    expect(typeof symbol1).toBe("symbol");
    expect(typeof symbol2).toBe("symbol");
    expect(typeof symbol3).toBe("symbol");
  });

  it("should return a destructurable array of numbers", () => {
    const [num1, num2, num3] = Enum.number();

    expect(num1).toBe(0);
    expect(num2).toBe(1);
    expect(num3).toBe(2);
  });
});
