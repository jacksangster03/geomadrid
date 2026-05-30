import { describe, it, expect } from "vitest";
import { quizReducer, initialState } from "@/lib/quiz/quizReducer";
import type { QuizTarget } from "@/lib/quiz/targetSelection";

const makeTargets = (n: number): QuizTarget[] =>
  Array.from({ length: n }, (_, i) => ({ id: `2800${i}`, name: `Town ${i}` }));

describe("quizReducer START_SESSION", () => {
  it("sets status to playing and picks first target", () => {
    const targets = makeTargets(3);
    const state = quizReducer(initialState(), {
      type: "START_SESSION",
      difficulty: "medium",
      targets,
      totalRounds: 3,
    });
    expect(state.status).toBe("playing");
    expect(state.targetId).toBe(targets[0].id);
    expect(state.targetName).toBe(targets[0].name);
    expect(state.roundNumber).toBe(1);
    expect(state.score).toBe(0);
  });
});

describe("quizReducer SUBMIT_GUESS", () => {
  function startedState() {
    const targets = makeTargets(5);
    return quizReducer(initialState(), {
      type: "START_SESSION",
      difficulty: "easy",
      targets,
      totalRounds: 5,
    });
  }

  it("correct guess: status becomes answered, score increases", () => {
    const s0 = startedState();
    const s1 = quizReducer(s0, {
      type: "SUBMIT_GUESS",
      clickedId: s0.targetId!,
      clickedName: s0.targetName,
    });
    expect(s1.status).toBe("answered");
    expect(s1.lastCorrect).toBe(true);
    expect(s1.score).toBeGreaterThan(0);
    expect(s1.streak).toBe(1);
    expect(s1.attempts).toHaveLength(1);
  });

  it("wrong guess: status answered, score stays 0, streak resets", () => {
    const s0 = startedState();
    const s1 = quizReducer(s0, {
      type: "SUBMIT_GUESS",
      clickedId: "WRONG_ID",
      clickedName: "Wrong town",
    });
    expect(s1.status).toBe("answered");
    expect(s1.lastCorrect).toBe(false);
    expect(s1.score).toBe(0);
    expect(s1.streak).toBe(0);
    expect(s1.lastClickedId).toBe("WRONG_ID");
  });

  it("cannot submit while already answered", () => {
    const s0 = startedState();
    const s1 = quizReducer(s0, {
      type: "SUBMIT_GUESS",
      clickedId: s0.targetId!,
      clickedName: s0.targetName,
    });
    const s2 = quizReducer(s1, {
      type: "SUBMIT_GUESS",
      clickedId: "ANOTHER_ID",
      clickedName: "another",
    });
    expect(s2.attempts).toHaveLength(1); // not doubled
  });
});

describe("quizReducer NEXT_ROUND", () => {
  it("advances to the next target", () => {
    const targets = makeTargets(3);
    let s = quizReducer(initialState(), {
      type: "START_SESSION",
      difficulty: "medium",
      targets,
      totalRounds: 3,
    });
    s = quizReducer(s, {
      type: "SUBMIT_GUESS",
      clickedId: s.targetId!,
      clickedName: s.targetName,
    });
    s = quizReducer(s, { type: "NEXT_ROUND" });
    expect(s.status).toBe("playing");
    expect(s.roundNumber).toBe(2);
    expect(s.targetId).toBe(targets[1].id);
  });

  it("completes after last round", () => {
    const targets = makeTargets(2);
    let s = quizReducer(initialState(), {
      type: "START_SESSION",
      difficulty: "medium",
      targets,
      totalRounds: 2,
    });
    // Round 1
    s = quizReducer(s, { type: "SUBMIT_GUESS", clickedId: s.targetId!, clickedName: "" });
    s = quizReducer(s, { type: "NEXT_ROUND" });
    // Round 2
    s = quizReducer(s, { type: "SUBMIT_GUESS", clickedId: s.targetId!, clickedName: "" });
    s = quizReducer(s, { type: "NEXT_ROUND" });
    expect(s.status).toBe("complete");
  });
});

describe("targetSelection avoids duplicate IDs", () => {
  it("no duplicates in targets of length <= 179", async () => {
    const { buildTargetList } = await import("@/lib/quiz/targetSelection");
    const fakeIdentity: Record<string, { geoUnitId: string; nameDisplay: string; [k: string]: unknown }> = {};
    for (let i = 0; i < 179; i++) {
      const id = `280${String(i).padStart(2, "0")}`;
      fakeIdentity[id] = { geoUnitId: id, nameDisplay: `Town ${i}` };
    }
    const targets = buildTargetList(fakeIdentity as never, 20);
    const ids = targets.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(targets).toHaveLength(20);
  });
});
