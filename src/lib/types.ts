export type ColumnId = 'backlog' | 'this-week' | 'tomorrow' | 'today' | 'completed';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  subTasks: SubTask[];
  column: ColumnId;
  order: number;
  timerMode: 'stopwatch' | 'countdown';
  countdownMinutes?: number;
  elapsedSeconds: number;
  isRunning: boolean;
  startedAt?: number;
  completedAt?: number;
  createdAt: number;
}

export const COLUMNS: { id: ColumnId; title: string }[] = [
  { id: 'backlog', title: 'Backlog' },
  { id: 'this-week', title: 'This Week' },
  { id: 'tomorrow', title: 'Tomorrow' },
  { id: 'today', title: 'Today' },
  { id: 'completed', title: 'Completed' },
];
