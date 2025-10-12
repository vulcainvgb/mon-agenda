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
  time_spent?: number;
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

export interface Contact {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  address?: string;
  city?: string;
  country?: string;
  notes?: string;
  tags?: string[];
  status: 'active' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface EventContact {
  id: string;
  event_id: string;
  contact_id: string;
  contact?: Contact;
  role: 'participant' | 'organizer' | 'speaker';
  rsvp_status: 'pending' | 'accepted' | 'declined';
  notified: boolean;
}

export interface TaskContact {
  id: string;
  task_id: string;
  contact_id: string;
  contact?: Contact;
  role: 'assigned' | 'reviewer' | 'observer';
  notified: boolean;
}

// Google Auth
export interface GoogleAuth {
  id: string;
  user_id: string;
  access_token: string;
  refresh_token: string;
  token_expires_at: string;
  google_email?: string;
  calendar_id: string;
  last_sync_at?: string;
  sync_enabled: boolean;
  created_at: string;
  updated_at: string;
}

// Google Calendar Event (format de l'API)
export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  updated: string;
  status: string;
  colorId?: string;
}

// Résultat de synchronisation
export interface SyncResult {
  success: boolean;
  created: number;
  updated: number;
  deleted: number;
  errors: string[];
}