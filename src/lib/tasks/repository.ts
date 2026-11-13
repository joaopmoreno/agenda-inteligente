import { supabase, isSupabaseConfigured } from '../supabase/client';
import {
  Task,
  TaskCategory,
  NewTaskInput,
  TaskUpdateInput,
  SortMode,
  UserProfile,
} from './types';

const profileColumns = 'id, name, timezone, theme, calendar_client_id, created_at, updated_at';

export interface TaskRepository {
  listTasks(userId: string): Promise<Task[]>;
  listByCategory(userId: string, category: TaskCategory): Promise<Task[]>;
  createTask(userId: string, input: NewTaskInput): Promise<Task>;
  updateTask(userId: string, taskId: string, updates: Partial<TaskUpdateInput>): Promise<Task>;
  completeTask(userId: string, taskId: string, completed: boolean): Promise<Task>;
  deleteTask(userId: string, taskId: string): Promise<void>;
  updateSortOrders(userId: string, category: TaskCategory, items: { id: string; sort_order: number }[]): Promise<void>;
  getCategorySettings(userId: string): Promise<Record<TaskCategory, SortMode>>;
  saveCategorySetting(userId: string, category: TaskCategory, mode: SortMode): Promise<void>;
  getProfile(userId: string): Promise<UserProfile | null>;
  saveProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile>;
}

export class SupabaseTaskRepository implements TaskRepository {
  private ensureConfigured() {
    if (!isSupabaseConfigured) {
      throw new Error(
        'Banco de dados Lovable Cloud / Supabase não configurado. Por favor, adicione as credenciais no arquivo .env.'
      );
    }
  }

  async listTasks(userId: string): Promise<Task[]> {
    this.ensureConfigured();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao carregar tarefas: ${error.message}`);
    }

    return (data || []) as Task[];
  }

  async listByCategory(userId: string, category: TaskCategory): Promise<Task[]> {
    this.ensureConfigured();

    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('user_id', userId)
      .eq('category', category)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Erro ao carregar tarefas da categoria ${category}: ${error.message}`);
    }

    return (data || []) as Task[];
  }

  async createTask(userId: string, input: NewTaskInput): Promise<Task> {
    this.ensureConfigured();

    // Se o sort_order não for fornecido, coloca como o próximo no final
    let sortOrder = input.sort_order;
    if (sortOrder === undefined) {
      const { data: maxOrderData } = await supabase
        .from('tasks')
        .select('sort_order')
        .eq('user_id', userId)
        .eq('category', input.category)
        .order('sort_order', { ascending: false })
        .limit(1);

      sortOrder = maxOrderData && maxOrderData.length > 0 ? (maxOrderData[0].sort_order + 10) : 10;
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        user_id: userId,
        category: input.category,
        title: input.title.trim(),
        description: input.description?.trim() || null,
        due_at: input.due_at || null,
        status: input.status || 'pendente',
        sort_order: sortOrder,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao salvar tarefa no banco de dados: ${error.message}`);
    }

    return data as Task;
  }

  async updateTask(userId: string, taskId: string, updates: Partial<TaskUpdateInput>): Promise<Task> {
    this.ensureConfigured();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description?.trim() || null;
    if (updates.category !== undefined) payload.category = updates.category;
    if (updates.due_at !== undefined) payload.due_at = updates.due_at;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.sort_order !== undefined) payload.sort_order = updates.sort_order;

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(`Falha ao atualizar tarefa: ${error.message}`);
    }

    return data as Task;
  }

  async completeTask(userId: string, taskId: string, completed: boolean): Promise<Task> {
    return this.updateTask(userId, taskId, {
      status: completed ? 'concluida' : 'pendente',
    });
  }

  async deleteTask(userId: string, taskId: string): Promise<void> {
    this.ensureConfigured();

    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId)
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Falha ao excluir tarefa: ${error.message}`);
    }
  }

  async updateSortOrders(
    userId: string,
    _category: TaskCategory,
    items: { id: string; sort_order: number }[]
  ): Promise<void> {
    this.ensureConfigured();
    if (items.length === 0) return;

    // Atualização em lote segura
    const promises = items.map(item =>
      supabase
        .from('tasks')
        .update({ sort_order: item.sort_order, updated_at: new Date().toISOString() })
        .eq('id', item.id)
        .eq('user_id', userId)
    );

    const results = await Promise.all(promises);
    const failed = results.find(r => r.error);
    if (failed && failed.error) {
      throw new Error(`Falha ao salvar ordenação manual no banco: ${failed.error.message}`);
    }
  }

  async getCategorySettings(userId: string): Promise<Record<TaskCategory, SortMode>> {
    this.ensureConfigured();

    const defaults: Record<TaskCategory, SortMode> = {
      Pessoal: 'automatico',
      Escolar: 'automatico',
      Trabalho: 'automatico',
    };

    const { data, error } = await supabase
      .from('category_settings')
      .select('category, sort_mode')
      .eq('user_id', userId);

    if (error) {
      // Se a tabela ainda não tiver registros, retorna defaults sem quebrar
      return defaults;
    }

    if (data) {
      for (const row of data) {
        if (row.category in defaults) {
          defaults[row.category as TaskCategory] = row.sort_mode as SortMode;
        }
      }
    }

    return defaults;
  }

  async saveCategorySetting(userId: string, category: TaskCategory, mode: SortMode): Promise<void> {
    this.ensureConfigured();

    const { error } = await supabase
      .from('category_settings')
      .upsert(
        {
          user_id: userId,
          category,
          sort_mode: mode,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id, category' }
      );

    if (error) {
      throw new Error(`Falha ao salvar modo de ordenação da categoria ${category}: ${error.message}`);
    }
  }

  async getProfile(userId: string): Promise<UserProfile | null> {
    this.ensureConfigured();

    const { data, error } = await supabase
      .from('profiles')
      .select(profileColumns)
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Falha ao carregar perfil: ${error.message}`);
    }

    return data as UserProfile | null;
  }

  async saveProfile(userId: string, profile: Partial<UserProfile>): Promise<UserProfile> {
    this.ensureConfigured();

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (profile.name !== undefined) payload.name = profile.name.trim();
    if (profile.calendar_client_id !== undefined) payload.calendar_client_id = profile.calendar_client_id;
    if (profile.theme !== undefined) payload.theme = profile.theme;
    if (profile.timezone !== undefined) payload.timezone = profile.timezone;

    const { data, error } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        ...payload,
      })
      .select(profileColumns)
      .single();

    if (error) {
      throw new Error(`Falha ao salvar configurações do perfil: ${error.message}`);
    }

    return data as UserProfile;
  }
}

// Instância singleton padrão exportada
export const taskRepository: TaskRepository = new SupabaseTaskRepository();
