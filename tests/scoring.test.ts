import { describe, it, expect } from "vitest";
import { calcSpeedBonus, calcStreakBonus, calcRoundScore } from "@/lib/quiz/scoring";

describe("calcSpeedBonus", () => {
  it("returns 50 for under 3s", () => expect(calcSpeedBonus(2999)).toBe(50));
  it("returns 30 for under 6s", () => expect(calcSpeedBonus(5999)).toBe(30));
  it("returns 15 for under 10s", () => expect(calcSpeedBonus(9999)).toBe(15));
  it("returns 0 at 10s+", () => expect(calcSpeedBonus(10000)).toBe(0));
});

describe("calcStreakBonus", () => {
  it("0 streak = 0 bonus", () => expect(calcStreakBonus(0)).toBe(0));
  it("3 streak = 30 bonus", () => expect(calcStreakBonus(3)).toBe(30));
  it("caps at 100 for large streaks", () => expect(calcStreakBonus(20)).toBe(100));
});

describe("calcRoundScore", () => {
  it("wrong answer = 0 points", () => {
    const s = calcRoundScore(false, 1000, 0, "medium");
    expect(s.total).toBe(0);
  });

  it("correct easy: base 100 + speed 50 + streak 0 = 150 * 1.0 = 150", () => {
    const s = calcRoundScore(true, 1000, 0, "easy");
    expect(s.base).toBe(100);
    expect(s.speedBonus).toBe(50);
    expect(s.streakBonus).toBe(0);
    expect(s.total).toBe(150);
  });

  it("correct medium: (100+50) * 1.5 = 225", () => {
    const s = calcRoundScore(true, 1000, 0, "medium");
    expect(s.total).toBe(225);
  });

  it("correct hard: (100+50) * 2.0 = 300", () => {
    const s = calcRoundScore(true, 1000, 0, "hard");
    expect(s.total).toBe(300);
  });

  it("streak bonus is applied before multiplier", () => {
    const s = calcRoundScore(true, 1000, 3, "medium"); // (100+50+30)*1.5 = 270
    expect(s.total).toBe(270);
  });
});
