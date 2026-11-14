import { describe, it, expect } from "vitest";
import { money } from "../utils/money";

describe("money utility", () => {
  it("formats positive numbers with INR currency symbol", () => {
    const formatted = money(1000);
    expect(formatted).toContain("1,000.00");
  });

  it("formats decimal amounts properly", () => {
    const formatted = money(1234.56);
    expect(formatted).toContain("1,234.56");
  });

  it("handles zero gracefully", () => {
    const formatted = money(0);
    expect(formatted).toContain("0.00");
  });

  it("handles null or undefined gracefully", () => {
    expect(money(null)).toContain("0.00");
    expect(money(undefined)).toContain("0.00");
  });

  it("handles string representations of numbers", () => {
    const formatted = money("2500.5");
    expect(formatted).toContain("2,500.50");
  });
});
