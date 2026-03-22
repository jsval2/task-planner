'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { v4 as uuid } from 'uuid';
import type { ColumnId, SubTask, Task } from './types';

const STORAGE_KEY = 'task-planner-data';

interface StoreState {
  tasks: Task[];
  focusMode: boolean;
  activeTaskId: string | null;
}

function loadState(): StoreState {
  if (typeof window === 'undefined') {
    return { tasks: [], focusMode: false, activeTaskId: null };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as StoreState;
      return parsed;
    }
  } catch {
    // ignore
  }
  return { tasks: [], focusMode: false, activeTaskId: null };
}

function saveState(state: StoreState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

export function getElapsed(task: Task): number {
  if (task.isRunning && task.startedAt) {
    return task.elapsedSeconds + (Date.now() - task.startedAt) / 1000;
  }
  return task.elapsedSeconds;
}

export function formatTime(seconds: number): string {
  const abs = Math.abs(seconds);
  const h = Math.floor(abs / 3600);
  const m = Math.floor((abs % 3600) / 60);
  const s = Math.floor(abs % 60);
  const sign = seconds < 0 ? '-' : '';
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${sign}${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function getDisplayTime(task: Task): string {
  const elapsed = getElapsed(task);
  if (task.timerMode === 'countdown' && task.countdownMinutes) {
    const remaining = task.countdownMinutes * 60 - elapsed;
    return formatTime(remaining);
  }
  return formatTime(elapsed);
}

export function isOverdue(task: Task): boolean {
  if (task.timerMode !== 'countdown' || !task.countdownMinutes) return false;
  const elapsed = getElapsed(task);
  return elapsed > task.countdownMinutes * 60;
}

export function useTaskStore() {
  const [state, setState] = useState<StoreState>(() => loadState());
  const stateRef = useRef(state);
  stateRef.current = state;

  // Persist on change
  useEffect(() => {
    saveState(state);
  }, [state]);

  const update = useCallback((fn: (prev: StoreState) => StoreState) => {
    setState((prev) => {
      const next = fn(prev);
      return next;
    });
  }, []);

  const addTask = useCallback(
    (column: ColumnId, title: string, timerMode: 'stopwatch' | 'countdown' = 'stopwatch', countdownMinutes?: number) => {
      update((prev) => {
        const columnTasks = prev.tasks.filter((t) => t.column === column);
        const maxOrder = columnTasks.length > 0 ? Math.max(...columnTasks.map((t) => t.order)) : -1;
        const task: Task = {
          id: uuid(),
          title,
          description: '',
          subTasks: [],
          column,
          order: maxOrder + 1,
          timerMode,
          countdownMinutes,
          elapsedSeconds: 0,
          isRunning: false,
          createdAt: Date.now(),
        };
        return { ...prev, tasks: [...prev.tasks, task] };
      });
    },
    [update],
  );

  const updateTask = useCallback(
    (taskId: string, updates: Partial<Task>) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => (t.id === taskId ? { ...t, ...updates } : t)),
      }));
    },
    [update],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.filter((t) => t.id !== taskId),
        activeTaskId: prev.activeTaskId === taskId ? null : prev.activeTaskId,
      }));
    },
    [update],
  );

  const moveTask = useCallback(
    (taskId: string, toColumn: ColumnId, toIndex: number) => {
      update((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId);
        if (!task) return prev;

        const otherTasks = prev.tasks.filter((t) => t.id !== taskId);
        const columnTasks = otherTasks
          .filter((t) => t.column === toColumn)
          .sort((a, b) => a.order - b.order);

        // Insert at index
        columnTasks.splice(toIndex, 0, { ...task, column: toColumn });

        // Reorder
        const reordered = columnTasks.map((t, i) => ({ ...t, order: i }));

        // Rebuild full task list
        const otherColumnTasks = otherTasks.filter((t) => t.column !== toColumn);
        return { ...prev, tasks: [...otherColumnTasks, ...reordered] };
      });
    },
    [update],
  );

  const reorderInColumn = useCallback(
    (column: ColumnId, fromIndex: number, toIndex: number) => {
      update((prev) => {
        const columnTasks = prev.tasks
          .filter((t) => t.column === column)
          .sort((a, b) => a.order - b.order);
        const otherTasks = prev.tasks.filter((t) => t.column !== column);

        const [moved] = columnTasks.splice(fromIndex, 1);
        columnTasks.splice(toIndex, 0, moved);

        const reordered = columnTasks.map((t, i) => ({ ...t, order: i }));
        return { ...prev, tasks: [...otherTasks, ...reordered] };
      });
    },
    [update],
  );

  const addSubTask = useCallback(
    (taskId: string, title: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subTasks: [...t.subTasks, { id: uuid(), title, completed: false }] }
            : t,
        ),
      }));
    },
    [update],
  );

  const updateSubTask = useCallback(
    (taskId: string, subTaskId: string, updates: Partial<SubTask>) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? {
                ...t,
                subTasks: t.subTasks.map((st) =>
                  st.id === subTaskId ? { ...st, ...updates } : st,
                ),
              }
            : t,
        ),
      }));
    },
    [update],
  );

  const deleteSubTask = useCallback(
    (taskId: string, subTaskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, subTasks: t.subTasks.filter((st) => st.id !== subTaskId) }
            : t,
        ),
      }));
    },
    [update],
  );

  const startTimer = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, isRunning: true, startedAt: Date.now() };
          }
          // Stop any other running timers
          if (t.isRunning) {
            return {
              ...t,
              isRunning: false,
              elapsedSeconds: getElapsed(t),
              startedAt: undefined,
            };
          }
          return t;
        }),
      }));
    },
    [update],
  );

  const pauseTimer = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, isRunning: false, elapsedSeconds: getElapsed(t), startedAt: undefined }
            : t,
        ),
      }));
    },
    [update],
  );

  const resetTimer = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId
            ? { ...t, isRunning: false, elapsedSeconds: 0, startedAt: undefined }
            : t,
        ),
      }));
    },
    [update],
  );

  const completeTask = useCallback(
    (taskId: string) => {
      update((prev) => {
        const task = prev.tasks.find((t) => t.id === taskId);
        if (!task) return prev;

        const elapsed = getElapsed(task);
        const completedTasks = prev.tasks.filter((t) => t.column === 'completed');
        const maxOrder =
          completedTasks.length > 0 ? Math.max(...completedTasks.map((t) => t.order)) : -1;

        return {
          ...prev,
          tasks: prev.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  column: 'completed' as ColumnId,
                  order: maxOrder + 1,
                  isRunning: false,
                  elapsedSeconds: elapsed,
                  startedAt: undefined,
                  completedAt: Date.now(),
                  subTasks: t.subTasks.map((st) => ({ ...st, completed: true })),
                }
              : t,
          ),
          activeTaskId: prev.activeTaskId === taskId ? null : prev.activeTaskId,
        };
      });
    },
    [update],
  );

  const enterFocusMode = useCallback(() => {
    update((prev) => {
      const todayTasks = prev.tasks
        .filter((t) => t.column === 'today')
        .sort((a, b) => a.order - b.order);
      const firstUncompleted = todayTasks[0];
      if (!firstUncompleted) return prev;

      return {
        ...prev,
        focusMode: true,
        activeTaskId: firstUncompleted.id,
        tasks: prev.tasks.map((t) => {
          if (t.id === firstUncompleted.id) {
            return { ...t, isRunning: true, startedAt: Date.now() };
          }
          // pause others
          if (t.isRunning) {
            return { ...t, isRunning: false, elapsedSeconds: getElapsed(t), startedAt: undefined };
          }
          return t;
        }),
      };
    });
  }, [update]);

  const exitFocusMode = useCallback(() => {
    update((prev) => ({
      ...prev,
      focusMode: false,
      tasks: prev.tasks.map((t) =>
        t.isRunning
          ? { ...t, isRunning: false, elapsedSeconds: getElapsed(t), startedAt: undefined }
          : t,
      ),
    }));
  }, [update]);

  const setActiveTask = useCallback(
    (taskId: string) => {
      update((prev) => ({
        ...prev,
        activeTaskId: taskId,
        tasks: prev.tasks.map((t) => {
          if (t.id === taskId) {
            return { ...t, isRunning: true, startedAt: Date.now() };
          }
          if (t.isRunning) {
            return { ...t, isRunning: false, elapsedSeconds: getElapsed(t), startedAt: undefined };
          }
          return t;
        }),
      }));
    },
    [update],
  );

  const completeActiveAndNext = useCallback(() => {
    update((prev) => {
      const activeTask = prev.tasks.find((t) => t.id === prev.activeTaskId);
      if (!activeTask) return prev;

      const elapsed = getElapsed(activeTask);
      const completedTasks = prev.tasks.filter((t) => t.column === 'completed');
      const maxOrder =
        completedTasks.length > 0 ? Math.max(...completedTasks.map((t) => t.order)) : -1;

      const updatedTasks = prev.tasks.map((t) =>
        t.id === activeTask.id
          ? {
              ...t,
              column: 'completed' as ColumnId,
              order: maxOrder + 1,
              isRunning: false,
              elapsedSeconds: elapsed,
              startedAt: undefined,
              completedAt: Date.now(),
              subTasks: t.subTasks.map((st) => ({ ...st, completed: true })),
            }
          : t,
      );

      // Find next uncompleted today task
      const remainingToday = updatedTasks
        .filter((t) => t.column === 'today')
        .sort((a, b) => a.order - b.order);

      const nextTask = remainingToday[0];

      if (!nextTask) {
        return {
          ...prev,
          tasks: updatedTasks,
          activeTaskId: null,
          focusMode: false,
        };
      }

      return {
        ...prev,
        tasks: updatedTasks.map((t) =>
          t.id === nextTask.id ? { ...t, isRunning: true, startedAt: Date.now() } : t,
        ),
        activeTaskId: nextTask.id,
      };
    });
  }, [update]);

  const clearCompleted = useCallback(() => {
    update((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((t) => t.column !== 'completed'),
    }));
  }, [update]);

  const getColumnTasks = useCallback(
    (column: ColumnId): Task[] => {
      return state.tasks
        .filter((t) => t.column === column)
        .sort((a, b) => a.order - b.order);
    },
    [state.tasks],
  );

  return {
    ...state,
    getColumnTasks,
    addTask,
    updateTask,
    deleteTask,
    moveTask,
    reorderInColumn,
    addSubTask,
    updateSubTask,
    deleteSubTask,
    startTimer,
    pauseTimer,
    resetTimer,
    completeTask,
    enterFocusMode,
    exitFocusMode,
    setActiveTask,
    completeActiveAndNext,
    clearCompleted,
  };
}
