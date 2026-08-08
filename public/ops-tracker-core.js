(function attachOpsTrackerCore(root) {
  const clone = (value) => JSON.parse(JSON.stringify(value));

  function dayKey(year, monthIndex, day) {
    const month = String(monthIndex + 1).padStart(2, "0");
    const date = String(day).padStart(2, "0");
    return `${year}-${month}-${date}`;
  }

  function emptyBlockState() {
    return {
      done: false,
      open: false,
      extraSubs: [],
      hiddenPinned: [],
      pinnedDone: {},
    };
  }

  function createDayState(blockTemplates) {
    const blocks = {};
    blockTemplates.forEach((template) => {
      blocks[template.id] = emptyBlockState();
    });
    return {
      blocks,
      habits: {},
      habitAssignments: {},
      todoLists: [],
      note: { reflection: "", financial: "", top3: "" },
      dailyGoal: "",
      manualFocus: [],
      events: [],
      eventDone: {},
      eventHidden: {},
    };
  }

  function normalizeDayState(value, blockTemplates) {
    const base = createDayState(blockTemplates);
    const source = value && typeof value === "object" ? clone(value) : {};
    const result = { ...base, ...source };
    result.blocks = { ...base.blocks, ...(source.blocks || {}) };
    Object.keys(result.blocks).forEach((blockId) => {
      result.blocks[blockId] = { ...emptyBlockState(), ...(result.blocks[blockId] || {}) };
      result.blocks[blockId].extraSubs = result.blocks[blockId].extraSubs || [];
      result.blocks[blockId].hiddenPinned = result.blocks[blockId].hiddenPinned || [];
      result.blocks[blockId].pinnedDone = result.blocks[blockId].pinnedDone || {};
    });
    result.habits = result.habits || {};
    result.habitAssignments = result.habitAssignments || {};
    result.todoLists = result.todoLists || [];
    result.note = { ...base.note, ...(result.note || {}) };
    result.manualFocus = result.manualFocus || [];
    result.events = result.events || [];
    result.eventDone = result.eventDone || {};
    result.eventHidden = result.eventHidden || {};
    return result;
  }

  function blockItemsForDay(template, dayState) {
    const blockState = dayState.blocks?.[template.id] || emptyBlockState();
    const hidden = new Set(blockState.hiddenPinned || []);
    const pinned = (template.defaultSubs || [])
      .filter((item) => item.pinned !== false && !hidden.has(item.t))
      .map((item) => ({
        ...clone(item),
        done: Boolean(blockState.pinnedDone?.[item.t]),
        _isTemplate: true,
      }));
    const extras = (blockState.extraSubs || []).map((item) => ({
      ...clone(item),
      done: Boolean(item.done),
      _isTemplate: false,
    }));
    return [...pinned, ...extras];
  }

  function normalizeTodoItem(item) {
    return {
      id: item.id,
      text: item.text || "",
      done: Boolean(item.done),
      collapsed: Boolean(item.collapsed),
      children: (item.children || []).map(normalizeTodoItem),
    };
  }

  function findTodoItem(items, itemId) {
    for (const item of items || []) {
      if (item.id === itemId) return item;
      const child = findTodoItem(item.children, itemId);
      if (child) return child;
    }
    return null;
  }

  function containsTodo(item, itemId) {
    return item?.id === itemId || (item?.children || []).some((child) => containsTodo(child, itemId));
  }

  function setTodoCompletion(item, done) {
    item.done = Boolean(done);
    (item.children || []).forEach((child) => setTodoCompletion(child, done));
    return item;
  }

  function updateTodoCompletion(items, itemId, done) {
    const target = findTodoItem(items, itemId);
    if (!target) return false;
    setTodoCompletion(target, done);
    function reconcile(item) {
      let containsTarget = item.id === itemId;
      (item.children || []).forEach((child) => {
        if (reconcile(child)) containsTarget = true;
      });
      if (containsTarget && item.id !== itemId && item.children?.length) {
        item.done = item.children.every((child) => child.done);
      }
      return containsTarget;
    }
    (items || []).forEach(reconcile);
    return true;
  }

  function reconcileTodoCompletion(items) {
    (items || []).forEach((item) => {
      reconcileTodoCompletion(item.children);
      if (item.children?.length) item.done = item.children.every((child) => child.done);
    });
    return items;
  }

  function removeTodoItem(items, itemId) {
    const index = (items || []).findIndex((item) => item.id === itemId);
    if (index >= 0) return items.splice(index, 1)[0];
    for (const item of items || []) {
      const removed = removeTodoItem(item.children, itemId);
      if (removed) return removed;
    }
    return null;
  }

  function moveTodoItem(lists, itemId, targetListId, targetParentId = null, targetIndex = null) {
    const sourceList = (lists || []).find((list) => findTodoItem(list.items, itemId));
    const targetList = (lists || []).find((list) => list.id === targetListId);
    const item = sourceList && findTodoItem(sourceList.items, itemId);
    if (!sourceList || !targetList || !item) return { moved: false, reason: "not-found" };
    if (targetParentId && containsTodo(item, targetParentId)) return { moved: false, reason: "cycle" };
    const targetParent = targetParentId ? findTodoItem(targetList.items, targetParentId) : null;
    if (targetParentId && !targetParent) return { moved: false, reason: "target-not-found" };
    const moved = removeTodoItem(sourceList.items, itemId);
    const destination = targetParent ? (targetParent.children ||= []) : targetList.items;
    const index = targetIndex == null ? destination.length : Math.max(0, Math.min(targetIndex, destination.length));
    destination.splice(index, 0, moved);
    reconcileTodoCompletion(sourceList.items);
    reconcileTodoCompletion(targetList.items);
    return { moved: true };
  }

  function cycleHabitState(assigned, done) {
    if (!assigned) return { assigned: true, done: false, state: 1 };
    if (!done) return { assigned: true, done: true, state: 2 };
    return { assigned: false, done: false, state: 0 };
  }

  function linkedHabitCompletion(items) {
    if (!items?.length) return null;
    return items.every((item) => Boolean(item.done));
  }

  function habitReport(habits, entries) {
    const areas = {};
    let scheduled = 0;
    let completed = 0;
    (habits || []).forEach((habit) => {
      areas[habit.group] ||= { scheduled: 0, completed: 0, percentage: 0 };
    });
    (entries || []).forEach((entry) => {
      const habit = (habits || []).find((item) => item.id === entry.habitId);
      if (!habit || !entry.assigned) return;
      scheduled += 1;
      areas[habit.group] ||= { scheduled: 0, completed: 0, percentage: 0 };
      areas[habit.group].scheduled += 1;
      if (entry.done) {
        completed += 1;
        areas[habit.group].completed += 1;
      }
    });
    Object.values(areas).forEach((area) => {
      area.percentage = area.scheduled ? Math.round((area.completed / area.scheduled) * 100) : 0;
    });
    return {
      scheduled,
      completed,
      percentage: scheduled ? Math.round((completed / scheduled) * 100) : 0,
      areas,
    };
  }

  function financeBudgetStatus(spent, reference) {
    const budget = Math.max(0, Number(reference) || 0);
    const actual = Math.max(0, Number(spent) || 0);
    if (!budget) return { percentage: actual ? 100 : 0, status: actual ? "over" : "none" };
    const ratio = actual / budget;
    const percentage = Math.round(ratio * 100);
    return {
      percentage,
      status: ratio >= 1 ? "over" : ratio >= 0.8 ? "warning" : "normal",
    };
  }

  function financeBudgetMonthlyTotal(budget) {
    const base = Number(budget?.monthlyReference) || 0;
    const subItems = (budget?.subItems || []).reduce(
      (sum, item) => sum + (Number(item.cost) || 0),
      0,
    );
    return Math.max(0, base + subItems);
  }

  function financeMonthSummary(budgets, expenses, monthPrefix, incomes = []) {
    const monthExpenses = (expenses || []).filter((item) =>
      String(item.dateKey || "").startsWith(monthPrefix),
    );
    const spentByCategory = {};
    monthExpenses.forEach((item) => {
      const categoryId = item.categoryId || "other";
      spentByCategory[categoryId] = (spentByCategory[categoryId] || 0) + (Number(item.amount) || 0);
    });
    const monthlyReference = (budgets || []).reduce(
      (sum, item) => sum + financeBudgetMonthlyTotal(item),
      0,
    );
    const annualReference = (budgets || []).reduce(
      (sum, item) => sum + (Number(item.annualReference) || 0),
      0,
    );
    const spent = monthExpenses.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    const income = (incomes || [])
      .filter((item) => String(item.dateKey || "").startsWith(monthPrefix))
      .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    return {
      spent,
      income,
      net: income - spent,
      monthlyReference,
      annualReference,
      remaining: monthlyReference - spent,
      spentByCategory,
      status: financeBudgetStatus(spent, monthlyReference),
    };
  }

  function todoSubtask(todo, origin) {
    const item = normalizeTodoItem(todo);
    return {
      t: item.text,
      done: item.done,
      def: false,
      hab: null,
      pinned: false,
      todoOrigin: {
        listId: origin.listId,
        itemId: item.id,
        sourceDayKey: origin.sourceDayKey,
        item,
      },
      todoChildren: item.children,
    };
  }

  function todoFromSubtask(subtask) {
    if (!subtask?.todoOrigin) return null;
    const source = subtask.todoOrigin.item || {};
    return normalizeTodoItem({
      ...source,
      id: subtask.todoOrigin.itemId || source.id,
      text: subtask.t || source.text,
      done: Boolean(subtask.done),
      children: subtask.todoChildren || source.children || [],
    });
  }

  function dateOnly(value) {
    const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate());
  }

  function daysBetween(start, current) {
    return Math.floor((dateOnly(current) - dateOnly(start)) / 86400000);
  }

  function recurrenceMatches(rule, value) {
    if (!rule || !rule.startDate) return true;
    const current = dateOnly(value);
    const start = dateOnly(rule.startDate);
    const delta = daysBetween(start, current);
    if (delta < 0) return false;
    if (rule.endDate && current > dateOnly(rule.endDate)) return false;
    const interval = Math.max(1, Number(rule.interval) || 1);
    if (rule.frequency === "weekly") {
      const weekdays = rule.weekdays?.length ? rule.weekdays : [start.getDay()];
      return weekdays.includes(current.getDay()) && Math.floor(delta / 7) % interval === 0;
    }
    if (rule.frequency === "monthly") {
      const months = (current.getFullYear() - start.getFullYear()) * 12 + current.getMonth() - start.getMonth();
      return current.getDate() === start.getDate() && months % interval === 0;
    }
    return delta % interval === 0;
  }

  root.OpsTrackerCore = {
    blockItemsForDay,
    clone,
    cycleHabitState,
    createDayState,
    dayKey,
    emptyBlockState,
    findTodoItem,
    financeBudgetStatus,
    financeBudgetMonthlyTotal,
    financeMonthSummary,
    habitReport,
    linkedHabitCompletion,
    moveTodoItem,
    normalizeDayState,
    normalizeTodoItem,
    reconcileTodoCompletion,
    recurrenceMatches,
    setTodoCompletion,
    todoFromSubtask,
    todoSubtask,
    updateTodoCompletion,
  };
})(typeof globalThis !== "undefined" ? globalThis : window);
