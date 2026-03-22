'use client';

import { useEffect, useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import type { Task } from '@/lib/types';
import {
  getDisplayTime,
  getElapsed,
  isOverdue,
  type useTaskStore,
} from '@/lib/store';
import { setFavicon, setTabTitle, type FaviconColor } from '@/lib/favicon';

type Store = ReturnType<typeof useTaskStore>;

interface FocusModeProps {
  store: Store;
}

export function FocusMode({ store }: FocusModeProps) {
  const [, setTick] = useState(0);
  const notifiedRef = useRef<Set<string>>(new Set());

  const todayTasks = store.getColumnTasks('today');
  const activeTask = store.tasks.find((t) => t.id === store.activeTaskId);

  // Tick every second for timer display
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(interval);
  }, []);

  // Update tab title and favicon
  useEffect(() => {
    if (activeTask) {
      const time = getDisplayTime(activeTask);
      setTabTitle(`${activeTask.title} | ${time}`);

      let color: FaviconColor = 'green';
      if (isOverdue(activeTask)) {
        color = 'orange';
      } else if (!activeTask.isRunning) {
        color = 'red';
      }
      setFavicon(color);

      // Notification when countdown finishes
      if (
        activeTask.timerMode === 'countdown' &&
        activeTask.countdownMinutes &&
        isOverdue(activeTask) &&
        !notifiedRef.current.has(activeTask.id)
      ) {
        notifiedRef.current.add(activeTask.id);
        if (Notification.permission === 'granted') {
          new Notification('Timer Complete', {
            body: `"${activeTask.title}" countdown has finished!`,
            icon: '/favicon.ico',
          });
        }
      }
    } else {
      setTabTitle('Task Planner — All done!');
      setFavicon('green');
    }
  }, [activeTask, activeTask?.isRunning, activeTask?.elapsedSeconds, activeTask?.startedAt]);

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Clean up on exit
  useEffect(() => {
    return () => {
      setTabTitle('Task Planner');
      setFavicon('gray');
    };
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        handlePause();
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        handleDone();
      }
      if (e.key === 'Escape') {
        store.exitFocusMode();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        handleSkip();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  const handleDone = () => {
    store.completeActiveAndNext();
  };

  const handlePause = () => {
    if (activeTask) {
      if (activeTask.isRunning) {
        store.pauseTimer(activeTask.id);
      } else {
        store.startTimer(activeTask.id);
      }
    }
  };

  const handleSkip = () => {
    if (!activeTask) return;
    // Pause current, find next
    store.pauseTimer(activeTask.id);
    const currentIndex = todayTasks.findIndex((t) => t.id === activeTask.id);
    const nextTask = todayTasks[currentIndex + 1];
    if (nextTask) {
      store.setActiveTask(nextTask.id);
    }
  };

  const handleSelectTask = (taskId: string) => {
    if (taskId !== store.activeTaskId) {
      store.setActiveTask(taskId);
    }
  };

  if (todayTasks.length === 0 && !activeTask) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-64px)] gap-4">
        <p className="text-lg text-muted-foreground">All tasks completed!</p>
        <Button onClick={store.exitFocusMode}>Back to Board</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 h-[calc(100vh-64px)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="h-3 w-3 rounded-full bg-green-500/100 animate-pulse" />
          <h1 className="text-lg font-semibold">Focus Mode</h1>
        </div>
        <Button variant="outline" size="sm" onClick={store.exitFocusMode}>
          ← Back to Board
        </Button>
      </div>

      {/* Active task card */}
      {activeTask && (
        <Card
          className={`p-6 mb-6 ${
            isOverdue(activeTask)
              ? 'ring-2 ring-orange-500 bg-orange-500/10'
              : 'ring-2 ring-green-500 bg-green-500/10'
          }`}
        >
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                Current Task
              </p>
              <h2 className="text-xl font-semibold">{activeTask.title}</h2>
            </div>
            <Badge
              variant={isOverdue(activeTask) ? 'destructive' : 'default'}
              className="font-mono text-lg px-3 py-1"
            >
              {getDisplayTime(activeTask)}
            </Badge>
          </div>

          {/* Description */}
          {activeTask.description && (
            <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
              {activeTask.description}
            </p>
          )}

          {/* Subtasks */}
          {activeTask.subTasks.length > 0 && (
            <div className="mb-4 space-y-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Subtasks ({activeTask.subTasks.filter((st) => st.completed).length}/{activeTask.subTasks.length})
              </p>
              {activeTask.subTasks.map((st) => (
                <div key={st.id} className="flex items-center gap-2">
                  <Checkbox
                    checked={st.completed}
                    onCheckedChange={(checked) =>
                      store.updateSubTask(activeTask.id, st.id, {
                        completed: !!checked,
                      })
                    }
                  />
                  <span
                    className={`text-sm ${
                      st.completed ? 'line-through text-muted-foreground' : ''
                    }`}
                  >
                    {st.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {activeTask.timerMode === 'countdown' && activeTask.countdownMinutes && (
            <p className="text-xs text-muted-foreground mb-4">
              Budget: {activeTask.countdownMinutes}m · Elapsed:{' '}
              {Math.floor(getElapsed(activeTask) / 60)}m
            </p>
          )}

          <div className="flex gap-2">
            <Button
              className="bg-green-600 hover:bg-green-700 text-white flex-1"
              onClick={handleDone}
            >
              ✓ Done
            </Button>
            <Button variant="outline" onClick={handlePause}>
              {activeTask.isRunning ? '⏸ Pause' : '▶ Resume'}
            </Button>
            <Button variant="outline" onClick={handleSkip}>
              Skip →
            </Button>
          </div>
        </Card>
      )}

      {/* Keyboard shortcut hints */}
      <div className="flex gap-4 justify-center mb-4">
        <span className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Space</kbd> pause/resume
        </span>
        <span className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> done
        </span>
        <span className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Tab</kbd> skip
        </span>
        <span className="text-xs text-muted-foreground">
          <kbd className="px-1.5 py-0.5 bg-muted rounded text-[10px] font-mono">Esc</kbd> exit
        </span>
      </div>

      <Separator className="my-2" />

      {/* Remaining tasks */}
      <div className="flex-1 overflow-auto">
        <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
          Up Next ({todayTasks.length} remaining)
        </p>
        <div className="space-y-2">
          {todayTasks.map((task, i) => {
            const isCurrent = task.id === store.activeTaskId;
            return (
              <Card
                key={task.id}
                className={`p-3 cursor-pointer transition-colors ${
                  isCurrent
                    ? 'ring-1 ring-green-400 bg-green-500/10'
                    : 'hover:bg-muted/50'
                }`}
                onClick={() => handleSelectTask(task.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground font-mono w-5">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <span
                        className={`text-sm ${
                          isCurrent ? 'font-semibold' : ''
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.description && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {task.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {task.subTasks.length > 0 && (
                      <span className="text-xs text-muted-foreground">
                        {task.subTasks.filter((st) => st.completed).length}/
                        {task.subTasks.length}
                      </span>
                    )}
                    {task.timerMode === 'countdown' && task.countdownMinutes && (
                      <Badge variant="secondary" className="text-xs font-mono">
                        {task.countdownMinutes}m
                      </Badge>
                    )}
                    {(task.isRunning || task.elapsedSeconds > 0) && (
                      <Badge
                        variant={isCurrent ? 'default' : 'secondary'}
                        className="text-xs font-mono"
                      >
                        {getDisplayTime(task)}
                      </Badge>
                    )}
                  </div>
                </div>
                {/* Subtasks inline for non-active items */}
                {!isCurrent && task.subTasks.length > 0 && (
                  <div className="mt-2 ml-8 space-y-1">
                    {task.subTasks.map((st) => (
                      <div key={st.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={st.completed}
                          onCheckedChange={(checked) => {
                            store.updateSubTask(task.id, st.id, {
                              completed: !!checked,
                            });
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-3.5 w-3.5"
                        />
                        <span
                          className={`text-xs ${
                            st.completed
                              ? 'line-through text-muted-foreground'
                              : ''
                          }`}
                        >
                          {st.title}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
