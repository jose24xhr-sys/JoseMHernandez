// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { describe, expect, it } from "vitest";

const source = fs.readFileSync(
  path.resolve("public/ops-tracker-core.js"),
  "utf8",
);
const context = { globalThis: {} };
vm.runInNewContext(source, context);
const core = context.globalThis.OpsTrackerCore;

const templates = [
  {
    id: "work",
    defaultSubs: [{ t: "Persistent template item", pinned: true }],
  },
];

describe("Ops Tracker day isolation", () => {
  it("keeps an incomplete day-specific Block item on its original day", () => {
    const firstDay = core.createDayState(templates);
    const secondDay = core.createDayState(templates);
    firstDay.blocks.work.extraSubs.push({ t: "Only August 7", done: false });

    expect(core.blockItemsForDay(templates[0], firstDay).map((item) => item.t)).toContain(
      "Only August 7",
    );
    expect(core.blockItemsForDay(templates[0], secondDay).map((item) => item.t)).not.toContain(
      "Only August 7",
    );
  });

  it("continues showing intentionally pinned template items on each day", () => {
    const firstDay = core.createDayState(templates);
    const secondDay = core.createDayState(templates);

    expect(core.blockItemsForDay(templates[0], firstDay)[0].t).toBe("Persistent template item");
    expect(core.blockItemsForDay(templates[0], secondDay)[0].t).toBe("Persistent template item");
  });

  it("uses complete year-month-day keys across month boundaries", () => {
    expect(core.dayKey(2026, 7, 31)).toBe("2026-08-31");
    expect(core.dayKey(2026, 8, 1)).toBe("2026-09-01");
  });
});

describe("Ops Tracker structured items", () => {
  it("preserves nested to-do data when an item is represented in a Block", () => {
    const moved = core.todoSubtask(
      {
        id: "todo-1",
        text: "Launch campaign",
        done: false,
        children: [{ id: "todo-2", text: "Review copy", done: true }],
      },
      { listId: "list-1", sourceDayKey: "2026-08-07" },
    );

    expect(moved.todoOrigin.listId).toBe("list-1");
    expect(moved.todoOrigin.sourceDayKey).toBe("2026-08-07");
    expect(moved.todoChildren[0].text).toBe("Review copy");
  });

  it("restores a moved Block item to its original to-do shape", () => {
    const moved = core.todoSubtask(
      {
        id: "todo-1",
        text: "Launch campaign",
        done: false,
        children: [{ id: "todo-2", text: "Review copy", done: false }],
      },
      { listId: "list-1", sourceDayKey: "2026-08-07" },
    );
    moved.done = true;
    moved.todoChildren[0].done = true;

    expect(core.todoFromSubtask(moved)).toEqual({
      id: "todo-1",
      text: "Launch campaign",
      done: true,
      collapsed: false,
      children: [{ id: "todo-2", text: "Review copy", done: true, collapsed: false, children: [] }],
    });
  });

  it("completes every descendant when its parent is completed", () => {
    const items = [{
      id: "parent",
      text: "Parent",
      done: false,
      children: [{
        id: "child",
        text: "Child",
        done: false,
        children: [{ id: "grandchild", text: "Grandchild", done: false, children: [] }],
      }],
    }];

    core.updateTodoCompletion(items, "parent", true);

    expect(items[0].done).toBe(true);
    expect(items[0].children[0].done).toBe(true);
    expect(items[0].children[0].children[0].done).toBe(true);
  });

  it("completes ancestors when all children are complete and clears them when one is not", () => {
    const items = [{
      id: "parent",
      text: "Parent",
      done: false,
      children: [
        { id: "first", text: "First", done: true, children: [] },
        { id: "second", text: "Second", done: false, children: [] },
      ],
    }];

    core.updateTodoCompletion(items, "second", true);
    expect(items[0].done).toBe(true);
    core.updateTodoCompletion(items, "first", false);
    expect(items[0].done).toBe(false);
  });

  it("moves nested items and prevents circular nesting", () => {
    const lists = [{
      id: "list-a",
      items: [{
        id: "parent",
        text: "Parent",
        done: false,
        children: [{ id: "child", text: "Child", done: false, children: [] }],
      }],
    }, { id: "list-b", items: [] }];

    expect(core.moveTodoItem(lists, "parent", "list-a", "child")).toEqual({ moved: false, reason: "cycle" });
    expect(core.moveTodoItem(lists, "child", "list-b")).toEqual({ moved: true });
    expect(lists[0].items[0].children).toHaveLength(0);
    expect(lists[1].items[0].id).toBe("child");
  });

  it("keeps Daily Goal data isolated between day states", () => {
    const firstDay = core.createDayState(templates);
    const secondDay = core.createDayState(templates);
    firstDay.dailyGoal = "Ship the proposal";

    expect(firstDay.dailyGoal).toBe("Ship the proposal");
    expect(secondDay.dailyGoal).toBe("");
  });
});

describe("habit recurrence", () => {
  it("supports interval-based daily recurrence", () => {
    const rule = { startDate: "2026-08-01", frequency: "daily", interval: 2 };
    expect(core.recurrenceMatches(rule, "2026-08-01")).toBe(true);
    expect(core.recurrenceMatches(rule, "2026-08-02")).toBe(false);
    expect(core.recurrenceMatches(rule, "2026-08-03")).toBe(true);
  });

  it("supports selected weekdays starting from a date", () => {
    const rule = {
      startDate: "2026-08-03",
      frequency: "weekly",
      interval: 1,
      weekdays: [1, 3],
    };
    expect(core.recurrenceMatches(rule, "2026-08-03")).toBe(true);
    expect(core.recurrenceMatches(rule, "2026-08-04")).toBe(false);
    expect(core.recurrenceMatches(rule, "2026-08-05")).toBe(true);
  });

  it("supports monthly intervals from the selected start date", () => {
    const rule = { startDate: "2026-08-07", frequency: "monthly", interval: 2 };
    expect(core.recurrenceMatches(rule, "2026-08-07")).toBe(true);
    expect(core.recurrenceMatches(rule, "2026-09-07")).toBe(false);
    expect(core.recurrenceMatches(rule, "2026-10-07")).toBe(true);
  });

  it("stops recurrence after an optional end date", () => {
    const rule = {
      startDate: "2026-08-01",
      endDate: "2026-08-05",
      frequency: "daily",
      interval: 1,
    };
    expect(core.recurrenceMatches(rule, "2026-08-05")).toBe(true);
    expect(core.recurrenceMatches(rule, "2026-08-06")).toBe(false);
  });
});

describe("habit state and reporting", () => {
  it("cycles a habit through unassigned, planned, and complete", () => {
    expect(core.cycleHabitState(false, false)).toEqual({ assigned: true, done: false, state: 1 });
    expect(core.cycleHabitState(true, false)).toEqual({ assigned: true, done: true, state: 2 });
    expect(core.cycleHabitState(true, true)).toEqual({ assigned: false, done: false, state: 0 });
  });

  it("marks a linked habit complete only when every linked task is complete", () => {
    expect(core.linkedHabitCompletion([])).toBe(null);
    expect(core.linkedHabitCompletion([{ done: true }, { done: false }])).toBe(false);
    expect(core.linkedHabitCompletion([{ done: true }, { done: true }])).toBe(true);
  });

  it("calculates completion using scheduled habits only", () => {
    const report = core.habitReport(
      [{ id: "water", group: "Body" }, { id: "read", group: "Mind" }],
      [
        { habitId: "water", assigned: true, done: true },
        { habitId: "read", assigned: true, done: false },
        { habitId: "water", assigned: false, done: false },
      ],
    );

    expect(report).toMatchObject({ scheduled: 2, completed: 1, percentage: 50 });
    expect(report.areas.Body.percentage).toBe(100);
    expect(report.areas.Mind.percentage).toBe(0);
  });
});

describe("finance reporting", () => {
  const budgets = [
    { id: "rent", monthlyReference: 2000, annualReference: 14000 },
    { id: "food", monthlyReference: 1000, annualReference: 7000 },
  ];

  it("starts with an empty daily expense ledger", () => {
    const report = core.financeMonthSummary(budgets, [], "2026-08");
    expect(report).toMatchObject({
      spent: 0,
      monthlyReference: 3000,
      annualReference: 21000,
      remaining: 3000,
    });
  });

  it("isolates expenses by month and category", () => {
    const report = core.financeMonthSummary(budgets, [
      { dateKey: "2026-08-08", categoryId: "rent", amount: 1200 },
      { dateKey: "2026-08-09", categoryId: "food", amount: 250 },
      { dateKey: "2026-09-01", categoryId: "rent", amount: 2000 },
    ], "2026-08");

    expect(report.spent).toBe(1450);
    expect(report.spentByCategory).toEqual({ rent: 1200, food: 250 });
    expect(report.remaining).toBe(1550);
  });

  it("includes budget subitems and monthly income in the finance summary", () => {
    const detailedBudgets = [
      { id: "home", monthlyReference: 1000, annualReference: 12000, subItems: [
        { name: "Internet", cost: 500 },
        { name: "Electricity", cost: 250 },
      ] },
    ];
    const report = core.financeMonthSummary(
      detailedBudgets,
      [{ dateKey: "2026-08-08", categoryId: "home", amount: 600 }],
      "2026-08",
      [
        { dateKey: "2026-08-01", amount: 3000 },
        { dateKey: "2026-09-01", amount: 5000 },
      ],
    );

    expect(core.financeBudgetMonthlyTotal(detailedBudgets[0])).toBe(1750);
    expect(report).toMatchObject({ monthlyReference: 1750, income: 3000, net: 2400 });
  });

  it("highlights warning and over-budget thresholds", () => {
    expect(core.financeBudgetStatus(799, 1000).status).toBe("normal");
    expect(core.financeBudgetStatus(800, 1000).status).toBe("warning");
    expect(core.financeBudgetStatus(1000, 1000).status).toBe("over");
  });
});
