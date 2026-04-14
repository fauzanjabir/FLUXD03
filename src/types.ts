export interface Habit {
  id: string;
  name: string;
  icon: string;
  completedDates: string[]; // ISO strings YYYY-MM-DD
  skippedDates?: string[]; // ISO strings YYYY-MM-DD (Rest Days)
  allowRestDays?: boolean;
  createdAt: number;
}

export interface HabitState {
  habits: Habit[];
  order: string[];
}
