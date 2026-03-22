'use client';

import { useCallback } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import { useState } from 'react';
import { KanbanColumn } from '@/components/kanban-column';
import { Notepad } from '@/components/notepad';
import { Card } from '@/components/ui/card';
import { COLUMNS, type ColumnId, type Task } from '@/lib/types';
import type { useTaskStore } from '@/lib/store';

type Store = ReturnType<typeof useTaskStore>;

interface KanbanBoardProps {
  store: Store;
}

export function KanbanBoard({ store }: KanbanBoardProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
  );

  const findColumn = useCallback(
    (id: string): ColumnId | undefined => {
      // Check if it's a column id
      if (COLUMNS.some((c) => c.id === id)) {
        return id as ColumnId;
      }
      // Find which column this task belongs to
      const task = store.tasks.find((t) => t.id === id);
      return task?.column;
    },
    [store.tasks],
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeColumn = findColumn(active.id as string);
    const overColumn = findColumn(over.id as string);

    if (!activeColumn || !overColumn || activeColumn === overColumn) return;

    // Moving to a different column
    const overTasks = store
      .getColumnTasks(overColumn)
      .filter((t) => t.id !== active.id);
    const overIndex = overTasks.findIndex((t) => t.id === over.id);
    const newIndex = overIndex >= 0 ? overIndex : overTasks.length;

    store.moveTask(active.id as string, overColumn, newIndex);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over || active.id === over.id) return;

    const activeColumn = findColumn(active.id as string);
    const overColumn = findColumn(over.id as string);

    if (!activeColumn || !overColumn) return;

    if (activeColumn === overColumn) {
      const tasks = store.getColumnTasks(activeColumn);
      const fromIndex = tasks.findIndex((t) => t.id === active.id);
      const toIndex = tasks.findIndex((t) => t.id === over.id);
      if (fromIndex !== -1 && toIndex !== -1 && fromIndex !== toIndex) {
        store.reorderInColumn(activeColumn, fromIndex, toIndex);
      }
    } else {
      const overTasks = store.getColumnTasks(overColumn);
      const overIndex = overTasks.findIndex((t) => t.id === over.id);
      const newIndex = overIndex >= 0 ? overIndex : overTasks.length;
      store.moveTask(active.id as string, overColumn, newIndex);
    }
  };

  const activeTask = activeId ? store.tasks.find((t) => t.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto px-6 py-4 h-[calc(100vh-64px)]">
        {COLUMNS.map((col) => (
          <KanbanColumn
            key={col.id}
            id={col.id}
            title={col.title}
            tasks={store.getColumnTasks(col.id)}
            isCompleted={col.id === 'completed'}
            activeTaskId={store.activeTaskId}
            onAddTask={store.addTask}
            onUpdateTask={store.updateTask}
            onDeleteTask={store.deleteTask}
            onCompleteTask={store.completeTask}
            onAddSubTask={store.addSubTask}
            onUpdateSubTask={store.updateSubTask}
            onDeleteSubTask={store.deleteSubTask}
            onStartTimer={store.startTimer}
            onPauseTimer={store.pauseTimer}
            onResetTimer={store.resetTimer}
            onStartFocus={col.id === 'today' ? store.enterFocusMode : undefined}
            onClearCompleted={col.id === 'completed' ? store.clearCompleted : undefined}
          />
        ))}

        {/* Notepad section — fills all remaining horizontal space */}
        <div className="border-l pl-4 flex flex-col flex-1 min-w-[350px]">
          <Notepad />
        </div>
      </div>

      <DragOverlay>
        {activeTask ? (
          <Card className="p-3 w-72 shadow-lg rotate-2 opacity-90">
            <p className="text-sm font-medium">{activeTask.title}</p>
          </Card>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
