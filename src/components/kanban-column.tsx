'use client';

import { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TaskCard } from '@/components/task-card';
import type { ColumnId, Task, SubTask } from '@/lib/types';

interface KanbanColumnProps {
  id: ColumnId;
  title: string;
  tasks: Task[];
  isCompleted?: boolean;
  activeTaskId?: string | null;
  onAddTask: (column: ColumnId, title: string) => void;
  onUpdateTask: (taskId: string, updates: Partial<Task>) => void;
  onDeleteTask: (taskId: string) => void;
  onCompleteTask: (taskId: string) => void;
  onAddSubTask: (taskId: string, title: string) => void;
  onUpdateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  onDeleteSubTask: (taskId: string, subTaskId: string) => void;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: (taskId: string) => void;
  onResetTimer: (taskId: string) => void;
  onStartFocus?: () => void;
  onClearCompleted?: () => void;
}

export function KanbanColumn({
  id,
  title,
  tasks,
  isCompleted,
  activeTaskId,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
  onCompleteTask,
  onAddSubTask,
  onUpdateSubTask,
  onDeleteSubTask,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
  onStartFocus,
  onClearCompleted,
}: KanbanColumnProps) {
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isOpen, setIsOpen] = useState(!isCompleted);

  const { setNodeRef } = useDroppable({ id });

  const handleAddTask = () => {
    const trimmed = newTaskTitle.trim();
    if (trimmed) {
      onAddTask(id, trimmed);
      setNewTaskTitle('');
    }
    setIsAdding(false);
  };

  const taskIds = tasks.map((t) => t.id);

  const columnContent = (
    <>
      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
        <div ref={setNodeRef} className="flex-1 min-h-[40px]">
          {tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              isActive={task.id === activeTaskId}
              onUpdate={onUpdateTask}
              onDelete={onDeleteTask}
              onComplete={onCompleteTask}
              onAddSubTask={onAddSubTask}
              onUpdateSubTask={onUpdateSubTask}
              onDeleteSubTask={onDeleteSubTask}
              onStartTimer={onStartTimer}
              onPauseTimer={onPauseTimer}
              onResetTimer={onResetTimer}
            />
          ))}
          {tasks.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8 border border-dashed rounded-md">
              No tasks
            </div>
          )}
        </div>
      </SortableContext>

      {/* Add task */}
      {!isCompleted && (
        <div className="mt-2">
          {isAdding ? (
            <div className="flex gap-1">
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddTask();
                  if (e.key === 'Escape') {
                    setNewTaskTitle('');
                    setIsAdding(false);
                  }
                }}
                className="h-8 text-sm"
                autoFocus
              />
              <Button size="sm" className="h-8" onClick={handleAddTask}>
                Add
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-muted-foreground"
              onClick={() => setIsAdding(true)}
            >
              + Add task
            </Button>
          )}
        </div>
      )}

      {/* Start focus button for Today column */}
      {id === 'today' && tasks.length > 0 && onStartFocus && (
        <Button
          className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
          onClick={onStartFocus}
        >
          ▶ Start
        </Button>
      )}

      {/* Clear completed */}
      {isCompleted && tasks.length > 0 && onClearCompleted && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full mt-2 text-destructive"
          onClick={onClearCompleted}
        >
          Clear all completed
        </Button>
      )}
    </>
  );

  if (isCompleted) {
    return (
      <div className="flex flex-col w-72 shrink-0">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleTrigger className="flex items-center justify-between w-full mb-3 px-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm">{title}</h2>
              <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
                {tasks.length}
              </span>
            </div>
            <span className="text-xs text-muted-foreground">
              {isOpen ? '▼' : '▶'}
            </span>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <ScrollArea className="h-[calc(100vh-180px)]">
              <div className="pr-2">{columnContent}</div>
            </ScrollArea>
          </CollapsibleContent>
        </Collapsible>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72 shrink-0">
      <div className="flex items-center gap-2 mb-3 px-1">
        <h2 className="font-semibold text-sm">{title}</h2>
        <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
          {tasks.length}
        </span>
      </div>
      <ScrollArea className="h-[calc(100vh-180px)]">
        <div className="pr-2">{columnContent}</div>
      </ScrollArea>
    </div>
  );
}
