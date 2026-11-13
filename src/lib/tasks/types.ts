export type TaskCategory = 'Pessoal' | 'Escolar' | 'Trabalho';

export type TaskStatus = 'pendente' | 'concluida';

export type SortMode = 'automatico' | 'manual';

export interface Task {
  id: string;
  user_id: string;
  category: TaskCategory;
  title: string;
  description: string | null;
  due_at: string | null; // ISO string with timezone
  status: TaskStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NewTaskInput {
  category: TaskCategory;
  title: string;
  description?: string;
  due_at?: string | null;
  status?: TaskStatus;
  sort_order?: number;
}

export interface TaskUpdateInput {
  category?: TaskCategory;
  title?: string;
  description?: string | null;
  due_at?: string | null;
  status?: TaskStatus;
  sort_order?: number;
}

export type Theme = 'system' | 'light' | 'dark';

export interface UserProfile {
  id: string;
  name: string;
  timezone: string;
  voice_enabled: boolean;
  theme?: Theme;
  calendar_client_id?: string | null;
  gemini_api_key?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface CategorySetting {
  user_id: string;
  category: TaskCategory;
  sort_mode: SortMode;
}
