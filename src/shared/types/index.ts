export type Role = 'admin' | 'coach' | 'user';

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

export type TaskType = 'workout' | 'nutrition' | 'consultation';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  coachId?: string; // Foreign key to another User with role 'coach'
  createdAt: string;
}

export interface Task {
  id: string;
  userId: string;
  coachId: string;
  title: string;
  type: TaskType;
  status: TaskStatus;
  description: string;
  dueDate: string;
  completedAt?: string;
  createdAt: string;
}

export interface HealthMetric {
  id: string;
  userId: string;
  weight: number;
  height?: number; // Optional since it might just be used for calculations
  heartRate?: number; // Deprecated or optional
  bodyFatPercentage: number;
  recordedAt: string;
}

export interface Comment {
  id: string;
  taskId: string;
  authorId: string;
  content: string;
  createdAt: string;
}

export interface AISuggestion {
  id: string;
  userId: string;
  taskId?: string;
  suggestion: string;
  type: 'adjustment' | 'warning' | 'insight';
  createdAt: string;
}
