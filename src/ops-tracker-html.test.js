// @vitest-environment node
import fs from "node:fs";
import path from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const htmlPath = path.resolve("public/ops-tracker.html");
const corePath = path.resolve("public/ops-tracker-core.js");
const htmlSource = fs.readFileSync(htmlPath, "utf8");
const coreSource = fs.readFileSync(corePath, "utf8");

function testDocument() {
  const html = htmlSource.replace(
    '<script src="/ops-tracker-core.js"></script>',
    `<script>${coreSource}</script>`,
  );
  const virtualConsole = new VirtualConsole();
  return new JSDOM(html, {
    pretendToBeVisual: true,
    runScripts: "dangerously",
    url: "http://localhost/ops-tracker",
    virtualConsole,
    beforeParse(window) {
      window.fetch = async () => ({ ok: true, json: async () => [] });
      window.alert = () => {};
      window.HTMLElement.prototype.scrollIntoView = () => {};
    },
  });
}

function clickTab(window, name) {
  const tab = [...window.document.querySelectorAll(".tab")].find(
    (element) => element.textContent.trim() === name,
  );
  tab.click();
}

describe("Ops Tracker browser interactions", () => {
  let dom;
  let window;

  beforeEach(async () => {
    dom = testDocument();
    window = dom.window;
    await new Promise((resolve) => window.setTimeout(resolve, 0));
  });

  afterEach(() => dom.window.close());

  it("keeps focus in the same list input after Enter creates an item", () => {
    const input = window.document.querySelector('[id^="todo-inp-list_today_"]');
    input.focus();
    input.value = "First task";
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

    expect(window.document.querySelector(".todo-text").textContent).toBe("First task");
    expect(window.document.activeElement.id).toBe(input.id);
  });

  it("edits an existing to-do and supports nested subtasks", () => {
    const input = window.document.querySelector('[id^="todo-inp-list_today_"]');
    input.value = "Draft task";
    input.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

    const text = window.document.querySelector(".todo-text");
    text.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
    text.textContent = "Edited task";
    text.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

    expect(window.document.querySelector(".todo-child-add input")).toBeNull();
    window.document.querySelector(".todo-subtask-btn").click();
    const childInput = window.document.querySelector(".todo-child-add input");
    childInput.value = "Nested step";
    childInput.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));

    expect(window.document.querySelector(".todo-text").textContent).toBe("Edited task");
    expect(window.document.querySelector(".todo-children .todo-text").textContent).toBe("Nested step");
  });

  it("keeps parent and nested completion states synchronized", () => {
    window.eval(`{
      const list=getDayLists(currentDay).find(item=>item._pinned);
      list.items=[{id:'parent',text:'Parent',done:false,children:[
        {id:'child-1',text:'First',done:false,children:[]},
        {id:'child-2',text:'Second',done:false,children:[]}
      ]}];
      renderTodos();
      toggleTodoItem(list.id,'parent');
    }`);

    expect([...window.document.querySelectorAll(".todo-chk")].every((item) => item.classList.contains("on"))).toBe(true);

    window.eval(`{
      const list=getDayLists(currentDay).find(item=>item._pinned);
      toggleTodoItem(list.id,'child-1');
    }`);
    expect(window.document.querySelector(".todo-chk").classList.contains("on")).toBe(false);

    window.eval(`{
      const list=getDayLists(currentDay).find(item=>item._pinned);
      toggleTodoItem(list.id,'child-1');
    }`);
    expect(window.document.querySelector(".todo-chk").classList.contains("on")).toBe(true);
  });

  it("collapses nested tasks and displays their child count", () => {
    window.eval(`{
      const list=getDayLists(currentDay).find(item=>item._pinned);
      list.items=[{id:'parent',text:'Parent',done:false,collapsed:false,children:[
        {id:'child-1',text:'First',done:false,children:[]},
        {id:'child-2',text:'Second',done:false,children:[]}
      ]}];
      renderTodos();
    }`);
    expect(window.document.querySelector(".todo-item .todo-child-count").textContent).toContain("2");
    window.document.querySelector(".todo-node-toggle").click();
    expect(window.document.querySelector(".todo-children")).toBeNull();
  });

  it("collapses a created list and preserves an unfinished input draft across tabs", () => {
    const input = window.document.querySelector('[id^="todo-inp-list_today_"]');
    input.value = "Unsaved draft";
    input.dispatchEvent(new window.Event("input", { bubbles: true }));
    clickTab(window, "Habits");
    clickTab(window, "Agenda");

    const restored = window.document.querySelector('[id^="todo-inp-list_today_"]');
    expect(restored.value).toBe("Unsaved draft");
    window.document.querySelector(".todo-list-toggle").click();
    expect(window.document.querySelector(".todo-list-section").classList.contains("collapsed")).toBe(true);
  });

  it("autosaves Daily Goal and reflection content when switching tabs", () => {
    const goal = window.document.getElementById("daily-goal-input");
    goal.value = "Complete the customer rollout";
    const reflection = window.document.getElementById("log-reflection");
    reflection.value = "The rollout moved forward.";

    clickTab(window, "Habits");
    clickTab(window, "Log");
    expect(window.document.getElementById("log-reflection").value).toBe(
      "The rollout moved forward.",
    );
    clickTab(window, "Agenda");
    expect(window.document.getElementById("daily-goal-input").value).toBe(
      "Complete the customer rollout",
    );
  });

  it("moves a nested to-do into a Block and restores it to its original list", () => {
    window.eval(`{
      const list=getDayLists(currentDay).find(item=>item._pinned);
      list.items=[{id:'move-1',text:'Move me',done:false,children:[{id:'move-2',text:'Child step',done:false,children:[]}]}];
      renderTodos();
      draggingTodo={listId:list.id,itemId:'move-1'};
      dropTodoOnBlock({preventDefault(){},stopPropagation(){}},BLOCK_TEMPLATES[0].id);
    }`);

    expect(window.document.querySelector(".todo-origin").textContent).toBe("to-do");
    expect(window.document.querySelector(".subtasks .todo-children .sub-txt").textContent).toBe(
      "Child step",
    );
    window.document.querySelector('[title="Move back to its to-do list"]').click();
    expect(window.document.querySelector(".todo-text").textContent).toBe("Move me");
    expect(window.document.querySelector(".todo-children .todo-text").textContent).toBe(
      "Child step",
    );
  });

  it("keeps recurrence controls beside monthly tracker habits and applies the master toggle", () => {
    expect(window.document.querySelector("#hab-today .daily-toggle")).toBeNull();
    expect(window.document.querySelector(".habit-settings")).toBeNull();
    clickTab(window, "Habits");
    expect(window.document.querySelector("#monthly-wrap .daily-toggle")).not.toBeNull();

    window.eval("toggleAllHabitsEveryDay();");
    expect(window.document.getElementById("habit-master-toggle").textContent).toContain("on");
    expect(window.eval("HABITS.every(isHabitEveryDay)")).toBe(true);

    window.eval("toggleAllHabitsEveryDay();");
    expect(window.document.getElementById("habit-master-toggle").textContent).toContain("off");
  });

  it("shows only scheduled habits in Agenda and treats their control as completion-only", () => {
    window.eval(`{
      const state=getDayState(currentDay);
      state.habitAssignments.h_exercise=false;
      state.habitAssignments.h_water=true;
      state.habits.h_water=false;
      renderHabitsToday();
    }`);
    const names = [...window.document.querySelectorAll("#hab-today .hab-name")].map(
      (element) => element.textContent,
    );
    expect(names).not.toContain("Ejercicio");
    expect(names).toContain("2L agua");
    expect(window.document.querySelector("#hab-today .daily-toggle")).toBeNull();

    const waterRow = [...window.document.querySelectorAll("#hab-today .hab-row")].find(
      (row) => row.textContent.includes("2L agua"),
    );
    waterRow.querySelector(".hab-chk").click();
    expect(window.eval("isHabitAssigned('h_water',currentDay)")).toBe(true);
    expect(window.eval("getHabDone('h_water',currentDay)")).toBe(true);
  });

  it("synchronizes a linked habit and Block task in both directions", () => {
    window.eval(`{
      const link=linkedBlockSubs('h_water',currentDay)[0];
      setHabitDayState('h_water',currentDay,true,false,false);
      writeBlockSubDone(link.bid,link.sub,false,currentDay);
      cycleHabitForDay('h_water',currentDay);
    }`);
    expect(window.eval("getHabDone('h_water',currentDay)")).toBe(true);
    expect(window.eval("linkedBlockSubs('h_water',currentDay).every(item=>item.sub.done)")).toBe(true);

    window.eval(`{
      const link=linkedBlockSubs('h_water',currentDay)[0];
      toggleSub(link.bid,link.index);
    }`);
    expect(window.eval("getHabDone('h_water',currentDay)")).toBe(false);
  });

  it("edits Focus, Planned Today, and Fixed Agenda names inline", () => {
    window.eval(`{
      getDayState(currentDay).manualFocus=[{id:'focus-1',text:'Old focus',done:false}];
      ACTIVITIES=[{id:'activity-1',name:'Old plan',cat:'H',days:{[currentDay]:1}}];
      getDayState(currentDay).events=[{id:'event-1',name:'Old event',startTime:'09:00',endTime:'10:00'}];
      renderBanner();renderAgendaEvents();
    }`);

    const focus = window.document.querySelector(".blue-name");
    focus.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
    focus.textContent = "New focus";
    focus.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
    expect(window.eval("getDayState(currentDay).manualFocus[0].text")).toBe("New focus");
    expect(window.document.getElementById("focus-modal").classList.contains("on")).toBe(false);

    const planned = window.document.querySelector(".yellow-item .banner-name");
    planned.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
    planned.textContent = "New plan";
    planned.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
    expect(window.eval("ACTIVITIES[0].name")).toBe("New plan");

    const eventName = window.document.querySelector(".event-name");
    eventName.dispatchEvent(new window.MouseEvent("dblclick", { bubbles: true }));
    eventName.textContent = "New event";
    eventName.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Enter" }));
    expect(window.eval("getDayState(currentDay).events[0].name")).toBe("New event");
    expect(window.document.getElementById("event-modal").classList.contains("on")).toBe(false);
    window.document.querySelector(".agenda-event .tiny-btn").click();
    expect(window.document.getElementById("event-modal").classList.contains("on")).toBe(true);
  });

  it("pins and restores the Today list without duplicating it", () => {
    window.eval(`{
      const today=getDayLists(currentDay).find(list=>list._pinned);
      window.__todayListId=today.id;
      toggleListPin(today.id);
    }`);
    expect(window.eval("TODO_LISTS_GLOBAL.filter(list=>list.id===window.__todayListId).length")).toBe(1);
    expect(window.eval("currentVisibleLists().filter(list=>list.id===window.__todayListId).length")).toBe(1);

    window.eval("toggleListPin(window.__todayListId)");
    expect(window.eval("TODO_LISTS_GLOBAL.some(list=>list.id===window.__todayListId)")).toBe(false);
    expect(window.eval("getDayLists(currentDay).find(list=>list.id===window.__todayListId)._pinned")).toBe(true);
  });

  it("edits rewards and historical Log entries without overwriting the selected day", () => {
    window.eval(`{
      REWARDS=[{id:'reward-1',name:'Old reward',desc:'',icon:'*',type:'daily',threshold:80}];
      renderRewards();openRewardModal('reward-1');
    }`);
    window.document.getElementById("rw-name").value = "Updated reward";
    window.eval("saveReward()");
    expect(window.eval("REWARDS[0].name")).toBe("Updated reward");

    window.eval(`{
      const oldKey=dayKey(Math.max(1,currentDay-1));
      window.__oldKey=oldKey;
      NOTES[oldKey]={date:oldKey,reflection:'Old reflection',financial:'',top3:''};
      renderNotesArchive();
    }`);
    window.document.querySelector(".note-card").dispatchEvent(
      new window.MouseEvent("dblclick", { bubbles: true }),
    );
    window.document.getElementById("ne-reflection").value = "Updated reflection";
    window.eval("saveNoteEdit()");
    expect(window.eval("NOTES[window.__oldKey].reflection")).toBe("Updated reflection");
    expect(window.eval("dayKey(currentDay)===window.__oldKey")).toBe(false);
  });

  it("seeds only budget references and keeps the daily expense ledger blank", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();renderFinanceToday();renderFinances();");
    expect(window.document.getElementById("tab-finances").parentElement.classList.contains("shell")).toBe(true);
    expect(window.document.getElementById("tab-finances").closest("#focus-modal")).toBeNull();
    expect(window.eval("FINANCE_DATA.expenses.length")).toBe(0);
    expect(window.eval("FINANCE_DATA.incomes.length")).toBe(0);
    expect(window.eval("FINANCE_DATA.pendingPurchases.length")).toBe(0);
    expect(window.eval("FINANCE_DATA.pendingDebts.length")).toBe(0);
    expect(window.eval("OpsTrackerCore.financeMonthSummary(FINANCE_DATA.budgets,[],financeMonthPrefix()).monthlyReference")).toBe(23939);
    expect(window.eval("OpsTrackerCore.financeMonthSummary(FINANCE_DATA.budgets,[],financeMonthPrefix()).annualReference")).toBe(167573);
    expect(window.document.getElementById("finance-today-list").textContent).toContain("No expenses");
    expect(window.document.getElementById("finance-expense-form").closest(".finance-side")).not.toBeNull();
  });

  it("adds, edits, and deletes an expense for the selected day", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();openExpenseModal();");
    window.document.getElementById("expense-description").value = "Coffee";
    window.document.getElementById("expense-amount").value = "75.50";
    window.document.getElementById("expense-category").value = "food";
    window.eval("saveExpense()");
    expect(window.eval("FINANCE_DATA.expenses.length")).toBe(1);
    expect(window.document.getElementById("finance-today-total").textContent).toContain("75.50");

    window.eval("openExpenseModal(FINANCE_DATA.expenses[0].id)");
    window.document.getElementById("expense-amount").value = "80";
    window.eval("saveExpense()");
    expect(window.eval("FINANCE_DATA.expenses[0].amount")).toBe(80);

    window.eval("openExpenseModal(FINANCE_DATA.expenses[0].id);deleteEditingExpense()");
    expect(window.eval("FINANCE_DATA.expenses.length")).toBe(0);
  });

  it("adds finance records from the inline forms without opening add modals", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();renderFinanceToday();renderFinances();");
    window.document.getElementById("inline-expense-description").value = "Lunch";
    window.document.getElementById("inline-expense-amount").value = "120";
    window.document.getElementById("inline-expense-category").value = "food";
    window.document.getElementById("inline-expense-date").value = window.eval("dayKey(currentDay)");
    window.eval("addInlineExpense()");

    window.document.getElementById("inline-income-description").value = "Salary";
    window.document.getElementById("inline-income-amount").value = "5000";
    window.document.getElementById("inline-income-date").value = window.eval("dayKey(currentDay)");
    window.eval("addInlineIncome()");

    window.document.getElementById("inline-purchase-name").value = "Desk lamp";
    window.document.getElementById("inline-purchase-amount").value = "500";
    window.eval("addInlinePurchase()");
    window.document.getElementById("inline-debt-name").value = "Card";
    window.document.getElementById("inline-debt-balance").value = "1000";
    window.eval("addInlineDebt()");

    expect(window.eval("FINANCE_DATA.expenses[0].description")).toBe("Lunch");
    expect(window.eval("FINANCE_DATA.incomes[0].description")).toBe("Salary");
    expect(window.document.getElementById("finance-income-list").textContent).toContain("Salary");
    expect(window.eval("FINANCE_DATA.pendingPurchases[0].name")).toBe("Desk lamp");
    expect(window.eval("FINANCE_DATA.pendingDebts[0].name")).toBe("Card");
    expect(window.document.getElementById("expense-modal").classList.contains("on")).toBe(false);
    expect(window.document.getElementById("purchase-modal").classList.contains("on")).toBe(false);
    expect(window.document.getElementById("debt-modal").classList.contains("on")).toBe(false);
  });

  it("edits and deletes income while keeping the month summary current", () => {
    window.eval(`{
      FINANCE_DATA=defaultFinanceData();
      FINANCE_DATA.incomes=[{id:'salary',description:'Salary',amount:5000,dateKey:dayKey(currentDay)}];
      renderFinances();openIncomeModal('salary');
    }`);
    window.document.getElementById("income-amount").value = "5500";
    window.eval("saveIncome()");
    expect(window.eval("FINANCE_DATA.incomes[0].amount")).toBe(5500);
    expect(window.document.getElementById("finance-kpis").textContent).toContain("5,500.00");
    window.eval("openIncomeModal('salary');deleteEditingIncome()");
    expect(window.eval("FINANCE_DATA.incomes.length")).toBe(0);
  });

  it("adds an expense inline from Agenda for the selected day", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();renderFinanceToday();");
    window.document.getElementById("agenda-expense-description").value = "Bus";
    window.document.getElementById("agenda-expense-amount").value = "25";
    window.document.getElementById("agenda-expense-category").value = "transport";
    window.eval("addAgendaExpense()");

    expect(window.eval("FINANCE_DATA.expenses[0].dateKey")).toBe(window.eval("dayKey(currentDay)"));
    expect(window.document.getElementById("finance-today-total").textContent).toContain("25.00");
  });

  it("renames, reorders, and confirms deletion of finance categories", () => {
    window.eval(`{
      FINANCE_DATA=defaultFinanceData();
      FINANCE_DATA.expenses=[{id:'expense-food',description:'Meal',amount:50,dateKey:dayKey(currentDay),categoryId:'food'}];
      renderFinances();openBudgetModal('rent');
    }`);
    window.document.getElementById("budget-category-name").value = "Housing";
    window.eval("saveBudgetReference()");
    expect(window.eval("FINANCE_DATA.budgets.find(item=>item.id==='rent').name")).toBe("Housing");
    expect(window.document.getElementById("inline-expense-category").textContent).toContain("Housing");

    const firstId = window.eval("FINANCE_DATA.budgets[0].id");
    window.eval(`moveFinanceBudget('${firstId}',1)`);
    expect(window.eval("FINANCE_DATA.budgets[1].id")).toBe(firstId);

    window.eval("openDeleteFinanceCategory('food')");
    expect(window.document.getElementById("category-delete-modal").classList.contains("on")).toBe(true);
    expect(window.document.getElementById("category-delete-message").textContent).toContain("existing expense");
    window.eval("confirmDeleteFinanceCategory()");
    expect(window.eval("FINANCE_DATA.budgets.some(item=>item.id==='food')")).toBe(false);
    expect(window.eval("FINANCE_DATA.expenses[0].categoryId")).not.toBe("food");
  });

  it("adds costed budget subitems and collapses their category details", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();renderFinances();openBudgetModal('rent');addBudgetSubItemEditor();");
    const editor = window.document.querySelector("#budget-subitem-editor .budget-subitem-edit-row");
    editor.querySelector('input[type="text"]').value = "Internet";
    editor.querySelector('input[type="text"]').dispatchEvent(new window.Event("input"));
    editor.querySelector('input[type="number"]').value = "500";
    editor.querySelector('input[type="number"]').dispatchEvent(new window.Event("input"));
    window.eval("saveBudgetReference()");

    expect(window.eval("FINANCE_DATA.budgets.find(item=>item.id==='rent').subItems[0].cost")).toBe(500);
    expect(window.eval("OpsTrackerCore.financeBudgetMonthlyTotal(FINANCE_DATA.budgets.find(item=>item.id==='rent'))")).toBe(2500);
    expect(window.document.getElementById("finance-budget-list").textContent).toContain("Internet");
    window.eval("toggleFinanceBudgetItems('rent')");
    expect(window.document.querySelector("#finance-budget-list .finance-budget-subitems.collapsed")).not.toBeNull();
  });

  it("collapses and restores the complete Blocks panel", () => {
    window.eval("blocksPanelOpen=true;renderBlocks();toggleBlocksPanel();");
    expect(window.document.getElementById("blocks-panel-body").classList.contains("collapsed")).toBe(true);
    expect(window.document.getElementById("blocks-panel-hdr").getAttribute("aria-expanded")).toBe("false");
    window.eval("toggleBlocksPanel()");
    expect(window.document.getElementById("blocks-panel-body").classList.contains("collapsed")).toBe(false);
  });

  it("shows complete calendar weeks with adjacent-month days and their expenses", () => {
    window.eval(`{
      FINANCE_DATA=defaultFinanceData();
      const next=Math.min(DAYS,currentDay+1);
      const dates=financeWeekGroups().flat();
      const adjacent=dates.find(date=>date.getMonth()!==viewMonth||date.getFullYear()!==viewYear);
      window.__adjacentKey=financeHistoryDateKey(adjacent);
      FINANCE_DATA.expenses=[
        {id:'future-expense',description:'Future item',amount:99,dateKey:dayKey(next),categoryId:'other'},
        {id:'adjacent-expense',description:'Adjacent month expense',amount:33,dateKey:window.__adjacentKey,categoryId:'other'}
      ];
      renderFinances();
    }`);
    const days = window.document.querySelectorAll("#finance-history .finance-history-day");
    expect(days.length).toBeGreaterThanOrEqual(window.eval("DAYS"));
    expect(days.length % 7).toBe(0);
    expect(window.document.querySelectorAll("#finance-history .finance-history-day.outside-month").length).toBeGreaterThan(0);
    expect(window.document.querySelector(`[data-date-key="${window.__adjacentKey}"]`).textContent).toContain("Adjacent month expense");
    expect(window.document.getElementById("finance-history").textContent).toContain("Future item");
    expect(window.document.getElementById("finance-history").textContent).toContain("No expenses");
  });

  it("defaults blank expense and purchase dates to the selected day", () => {
    window.eval("FINANCE_DATA=defaultFinanceData();renderFinances();");
    window.document.getElementById("inline-expense-description").value = "No date expense";
    window.document.getElementById("inline-expense-amount").value = "10";
    window.document.getElementById("inline-expense-date").value = "";
    window.eval("addInlineExpense()");
    window.document.getElementById("inline-purchase-name").value = "No date purchase";
    window.document.getElementById("inline-purchase-date").value = "";
    window.eval("addInlinePurchase()");

    expect(window.eval("FINANCE_DATA.expenses[0].dateKey")).toBe(window.eval("dayKey(currentDay)"));
    expect(window.eval("FINANCE_DATA.pendingPurchases[0].targetDate")).toBe(window.eval("dayKey(currentDay)"));
  });

  it("isolates pending purchases by selected date and keeps them in purchase history", () => {
    window.eval(`{
      FINANCE_DATA=defaultFinanceData();
      const next=Math.min(DAYS,currentDay+1);
      FINANCE_DATA.pendingPurchases=[
        {id:'today-buy',name:'Today purchase',amount:50,priority:'High',targetDate:dayKey(currentDay),status:'pending'},
        {id:'next-buy',name:'Next purchase',amount:75,priority:'Low',targetDate:dayKey(next),status:'pending'}
      ];
      renderFinances();
    }`);
    expect(window.document.getElementById("finance-purchases").textContent).toContain("Today purchase");
    expect(window.document.getElementById("finance-purchases").textContent).not.toContain("Next purchase");
    expect(window.document.getElementById("purchase-history").textContent).toContain("Today purchase");
    expect(window.document.getElementById("purchase-history").textContent).toContain("Next purchase");

    window.eval("recordPurchase('today-buy')");
    expect(window.eval("FINANCE_DATA.pendingPurchases.find(item=>item.id==='today-buy').status")).toBe("purchased");
    expect(window.document.getElementById("finance-purchases").textContent).not.toContain("Today purchase");
    expect(window.document.getElementById("purchase-history").textContent).toContain("purchased");
  });

  it("collapses multiple expenses by day and collapses complete weeks", () => {
    window.eval(`{
      FINANCE_DATA=defaultFinanceData();
      const key=dayKey(currentDay);
      FINANCE_DATA.expenses=[
        {id:'one',description:'First',amount:10,dateKey:key,categoryId:'other'},
        {id:'two',description:'Second',amount:20,dateKey:key,categoryId:'other'}
      ];
      renderFinanceHistory();
      window.__historyKey=key;
    }`);
    const dayToggle = window.document.querySelector("#finance-history .finance-day-toggle");
    expect(dayToggle.textContent).toContain("hide 2");
    window.eval("toggleFinanceHistoryDay(window.__historyKey)");
    expect(window.document.getElementById("finance-history").textContent).toContain("2 expenses hidden");
    const historyDay = window.document.querySelector(`[data-date-key="${window.__historyKey}"]`);
    const historyWeek = historyDay.closest(".finance-history-week");
    const weekLabel = historyWeek.querySelector(".finance-history-week-hdr span").textContent;
    historyWeek.querySelector(".finance-history-week-hdr").click();
    const collapsedWeek = Array.from(window.document.querySelectorAll(".finance-history-week"))
      .find(week => week.querySelector(".finance-history-week-hdr span").textContent === weekLabel);
    expect(collapsedWeek.querySelector(".finance-history-week-days").classList.contains("collapsed")).toBe(true);
  });

  it("lets the Agenda expense card expand without an internal scroll area", () => {
    expect(htmlSource).toContain(".finance-agenda-body{overflow:visible;max-height:none");
  });

  it("includes a phone layout with stacked finance forms and visible touch actions", () => {
    expect(htmlSource).toContain("@media (max-width:520px)");
    expect(htmlSource).toContain(".finance-inline-form,.finance-inline-purchase,.finance-inline-debt,.finance-inline-income,.finance-side .finance-inline-form{grid-template-columns:1fr");
    expect(htmlSource).toContain(".todo-item-actions,.note-card-actions,.reward-del,.reward-edit,.act-del-btn{opacity:1}");
    expect(htmlSource).toContain(".finance-history-items{grid-column:1/-1;grid-row:2}");
  });
});
