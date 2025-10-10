// Types de base
export interface Event {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  color: string;
  project_id?: string;
  project?: Project;
}

export interface Task {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'done';
  due_date?: string;
  priority: 'low' | 'medium' | 'high';
  project_id?: string;
  project?: Project;
}

export interface Project {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  color: string;
  status: 'active' | 'completed' | 'archived';
  budget_total?: number;
  budget_spent?: number;
  start_date?: string;
  end_date?: string;
}

export interface DashboardStats {
  tasks: {
    total: number;
    todo: number;
    in_progress: number;
    done: number;
    overdue: number;
    high_priority: number;
  };
  events: {
    total: number;
    today: number;
    thisWeek: number;
    upcoming: number;
  };
  projects: {
    total: number;
    active: number;
    completed: number;
    overBudget: number;
    delayed: number;
  };
}

export interface UpcomingItem {
  id: string;
  type: 'event' | 'task';
  title: string;
  date: string;
  priority?: 'low' | 'medium' | 'high';
  status?: string;
  project?: {
    id: string;
    name: string;
    color: string;
  };
}

export interface ProjectAlert {
  id: string;
  project_id: string;
  project_name: string;
  type: 'budget' | 'deadline' | 'overdue_tasks';
  severity: 'warning' | 'danger';
  message: string;
  color: string;
}

export interface ChartData {
  name: string;
  value: number;
  color?: string;
}