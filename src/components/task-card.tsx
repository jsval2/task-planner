'use client';

import { useState, useRef, useEffect } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import type { Task, SubTask } from '@/lib/types';
import { getDisplayTime, getElapsed, isOverdue } from '@/lib/store';

interface TaskCardProps {
  task: Task;
  isActive?: boolean;
  isDragDisabled?: boolean;
  onUpdate: (taskId: string, updates: Partial<Task>) => void;
  onDelete: (taskId: string) => void;
  onComplete: (taskId: string) => void;
  onAddSubTask: (taskId: string, title: string) => void;
  onUpdateSubTask: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  onDeleteSubTask: (taskId: string, subTaskId: string) => void;
  onStartTimer: (taskId: string) => void;
  onPauseTimer: (taskId: string) => void;
  onResetTimer: (taskId: string) => void;
}

export function TaskCard({
  task,
  isActive,
  isDragDisabled,
  onUpdate,
  onDelete,
  onComplete,
  onAddSubTask,
  onUpdateSubTask,
  onDeleteSubTask,
  onStartTimer,
  onPauseTimer,
  onResetTimer,
}: TaskCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [descExpanded, setDescExpanded] = useState(false);
  const [editDesc, setEditDesc] = useState(task.description || '');
  const [showSubTasks, setShowSubTasks] = useState(false);
  const [newSubTask, setNewSubTask] = useState('');
  const [showTimerConfig, setShowTimerConfig] = useState(false);
  const [countdownInput, setCountdownInput] = useState(String(task.countdownMinutes || ''));
  const [displayTime, setDisplayTime] = useState(getDisplayTime(task));
  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    disabled: isDragDisabled || (isActive && task.isRunning),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // Update display time every second for running tasks
  useEffect(() => {
    if (!task.isRunning) {
      setDisplayTime(getDisplayTime(task));
      return;
    }
    const interval = setInterval(() => {
      setDisplayTime(getDisplayTime(task));
    }, 1000);
    return () => clearInterval(interval);
  }, [task]);

  useEffect(() => {
    if (isEditing && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditing]);

  const handleTitleSubmit = () => {
    const trimmed = editTitle.trim();
    if (trimmed && trimmed !== task.title) {
      onUpdate(task.id, { title: trimmed });
    } else {
      setEditTitle(task.title);
    }
    setIsEditing(false);
  };

  const handleAddSubTask = () => {
    const trimmed = newSubTask.trim();
    if (trimmed) {
      onAddSubTask(task.id, trimmed);
      setNewSubTask('');
    }
  };

  const handleSetCountdown = () => {
    const mins = parseInt(countdownInput);
    if (mins > 0) {
      onUpdate(task.id, { timerMode: 'countdown', countdownMinutes: mins });
      onResetTimer(task.id);
    }
    setShowTimerConfig(false);
  };

  const handleClearCountdown = () => {
    onUpdate(task.id, { timerMode: 'stopwatch', countdownMinutes: undefined });
    onResetTimer(task.id);
    setShowTimerConfig(false);
  };

  const completedSubTasks = task.subTasks.filter((st) => st.completed).length;
  const totalSubTasks = task.subTasks.length;
  const overdue = isOverdue(task);
  const elapsed = getElapsed(task);
  const hasTime = elapsed > 0 || task.isRunning;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`p-3 mb-2 group ${
          isActive
            ? overdue
              ? 'ring-2 ring-orange-500 bg-orange-500/10'
              : 'ring-2 ring-green-500 bg-green-500/10'
            : ''
        } ${task.column === 'completed' ? 'opacity-60' : ''}`}
      >
        {/* Drag handle + Title */}
        <div className="flex items-start gap-2">
          <button
            className="mt-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground shrink-0"
            {...listeners}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
              <circle cx="3" cy="2" r="1.5" />
              <circle cx="9" cy="2" r="1.5" />
              <circle cx="3" cy="6" r="1.5" />
              <circle cx="9" cy="6" r="1.5" />
              <circle cx="3" cy="10" r="1.5" />
              <circle cx="9" cy="10" r="1.5" />
            </svg>
          </button>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <Input
                ref={titleRef}
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSubmit();
                  if (e.key === 'Escape') {
                    setEditTitle(task.title);
                    setIsEditing(false);
                  }
                }}
                className="h-7 text-sm"
              />
            ) : (
              <p
                className="text-sm font-medium cursor-pointer truncate hover:text-primary"
                onClick={() => {
                  setEditTitle(task.title);
                  setIsEditing(true);
                }}
              >
                {task.title}
              </p>
            )}
          </div>

          {task.column !== 'completed' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-green-600 hover:text-green-700 hover:bg-green-100 shrink-0"
              onClick={() => onComplete(task.id)}
              title="Complete"
            >
              ✓
            </Button>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive shrink-0"
            onClick={() => onDelete(task.id)}
            title="Delete"
          >
            ×
          </Button>
        </div>

        {/* Description */}
        <div className="mt-1 ml-5">
          {descExpanded ? (
            <textarea
              ref={descRef}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              onBlur={() => {
                onUpdate(task.id, { description: editDesc });
                if (!editDesc.trim()) setDescExpanded(false);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  onUpdate(task.id, { description: editDesc });
                  setDescExpanded(false);
                }
              }}
              placeholder="Add a description..."
              className="w-full text-xs bg-transparent border border-input rounded-md px-2 py-1.5 resize-none focus:outline-none focus:ring-1 focus:ring-ring min-h-[60px]"
              rows={3}
              autoFocus
            />
          ) : task.description ? (
            <p
              className="text-xs text-muted-foreground cursor-pointer line-clamp-2 hover:text-foreground"
              onClick={() => {
                setEditDesc(task.description || '');
                setDescExpanded(true);
              }}
            >
              {task.description}
            </p>
          ) : (
            <button
              className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
              onClick={() => {
                setEditDesc('');
                setDescExpanded(true);
              }}
            >
              + description
            </button>
          )}
        </div>

        {/* Subtask count badge */}
        {totalSubTasks > 0 && (
          <div className="mt-1 ml-5">
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSubTasks(!showSubTasks)}
            >
              {completedSubTasks}/{totalSubTasks} subtasks
            </button>
          </div>
        )}

        {/* Timer display */}
        {(hasTime || task.timerMode === 'countdown') && task.column !== 'completed' && (
          <div className="mt-2 ml-5 flex items-center gap-2">
            <Badge
              variant={overdue ? 'destructive' : task.isRunning ? 'default' : 'secondary'}
              className="font-mono text-xs"
            >
              {displayTime}
            </Badge>
            {task.timerMode === 'countdown' && task.countdownMinutes && (
              <span className="text-xs text-muted-foreground">
                ({task.countdownMinutes}m)
              </span>
            )}
            <div className="flex gap-1">
              {task.isRunning ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={() => onPauseTimer(task.id)}
                >
                  ⏸
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1 text-xs"
                  onClick={() => onStartTimer(task.id)}
                >
                  ▶
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs"
                onClick={() => onResetTimer(task.id)}
              >
                ↺
              </Button>
            </div>
          </div>
        )}

        {/* Timer config + subtask toggle */}
        {task.column !== 'completed' && (
          <div className="mt-1 ml-5 flex gap-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowTimerConfig(!showTimerConfig)}
            >
              {task.timerMode === 'countdown' ? '⏱ countdown' : '⏱ timer'}
            </button>
            <button
              className="text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setShowSubTasks(!showSubTasks)}
            >
              + subtask
            </button>
          </div>
        )}

        {/* Timer config panel */}
        {showTimerConfig && (
          <div className="mt-2 ml-5 p-2 bg-muted rounded-md">
            <div className="flex items-center gap-2">
              <Input
                type="number"
                placeholder="minutes"
                value={countdownInput}
                onChange={(e) => setCountdownInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSetCountdown();
                }}
                className="h-7 w-20 text-xs"
                min={1}
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleSetCountdown}>
                Set
              </Button>
              {task.timerMode === 'countdown' && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs"
                  onClick={handleClearCountdown}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Subtasks */}
        {showSubTasks && (
          <div className="mt-2 ml-5 space-y-1">
            {task.subTasks.map((st) => (
              <SubTaskItem
                key={st.id}
                subTask={st}
                taskId={task.id}
                onUpdate={onUpdateSubTask}
                onDelete={onDeleteSubTask}
              />
            ))}
            <div className="flex gap-1">
              <Input
                placeholder="Add subtask..."
                value={newSubTask}
                onChange={(e) => setNewSubTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddSubTask();
                }}
                className="h-7 text-xs"
              />
              <Button size="sm" className="h-7 text-xs" onClick={handleAddSubTask}>
                +
              </Button>
            </div>
          </div>
        )}

        {/* Completed time */}
        {task.column === 'completed' && task.elapsedSeconds > 0 && (
          <div className="mt-1 ml-5">
            <span className="text-xs text-muted-foreground font-mono">
              took {getDisplayTime(task)}
            </span>
          </div>
        )}
      </Card>
    </div>
  );
}

function SubTaskItem({
  subTask,
  taskId,
  onUpdate,
  onDelete,
}: {
  subTask: SubTask;
  taskId: string;
  onUpdate: (taskId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  onDelete: (taskId: string, subTaskId: string) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(subTask.title);

  return (
    <div className="flex items-center gap-2 group/sub">
      <Checkbox
        checked={subTask.completed}
        onCheckedChange={(checked) =>
          onUpdate(taskId, subTask.id, { completed: !!checked })
        }
        className="h-3.5 w-3.5"
      />
      {isEditing ? (
        <Input
          value={editTitle}
          onChange={(e) => setEditTitle(e.target.value)}
          onBlur={() => {
            const trimmed = editTitle.trim();
            if (trimmed) onUpdate(taskId, subTask.id, { title: trimmed });
            setIsEditing(false);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              const trimmed = editTitle.trim();
              if (trimmed) onUpdate(taskId, subTask.id, { title: trimmed });
              setIsEditing(false);
            }
            if (e.key === 'Escape') {
              setEditTitle(subTask.title);
              setIsEditing(false);
            }
          }}
          className="h-6 text-xs flex-1"
          autoFocus
        />
      ) : (
        <span
          className={`text-xs flex-1 cursor-pointer ${
            subTask.completed ? 'line-through text-muted-foreground' : ''
          }`}
          onClick={() => {
            setEditTitle(subTask.title);
            setIsEditing(true);
          }}
        >
          {subTask.title}
        </span>
      )}
      <Button
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 opacity-0 group-hover/sub:opacity-100 text-destructive"
        onClick={() => onDelete(taskId, subTask.id)}
      >
        ×
      </Button>
    </div>
  );
}
