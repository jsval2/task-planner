'use client';

import { useEffect } from 'react';
import { KanbanBoard } from '@/components/kanban-board';
import { FocusMode } from '@/components/focus-mode';
import { useTaskStore } from '@/lib/store';
import { setFavicon, setTabTitle } from '@/lib/favicon';
import { ThemeToggle } from '@/components/theme-toggle';

export default function Home() {
  const store = useTaskStore();

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Set default tab title and favicon when not in focus mode
  useEffect(() => {
    if (!store.focusMode) {
      setTabTitle('Task Planner');
      setFavicon('red');
    }
  }, [store.focusMode]);

  if (store.focusMode) {
    return (
      <main className="h-full">
        <Header
          focusMode
          onExit={store.exitFocusMode}
          todayCount={store.getColumnTasks('today').length}
        />
        <FocusMode store={store} />
      </main>
    );
  }

  return (
    <main className="h-full">
      <Header
        totalTasks={store.tasks.filter((t) => t.column !== 'completed').length}
      />
      <KanbanBoard store={store} />
    </main>
  );
}

function Header({
  focusMode,
  onExit,
  todayCount,
  totalTasks,
}: {
  focusMode?: boolean;
  onExit?: () => void;
  todayCount?: number;
  totalTasks?: number;
}) {
  return (
    <header className="h-16 border-b flex items-center justify-between px-6 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center gap-3">
        {focusMode && (
          <div className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse" />
        )}
        <h1 className="font-semibold text-base">
          {focusMode ? 'Focus Mode' : 'Task Planner'}
        </h1>
        {!focusMode && totalTasks !== undefined && (
          <span className="text-xs text-muted-foreground">
            {totalTasks} active
          </span>
        )}
        {focusMode && todayCount !== undefined && (
          <span className="text-xs text-muted-foreground">
            {todayCount} remaining
          </span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {focusMode && onExit && (
          <button
            onClick={onExit}
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Board
          </button>
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}
