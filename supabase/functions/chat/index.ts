// Supabase / Lovable Cloud Edge Function: Chat com Assistente de IA
// Suporta streaming SSE e execução de ferramentas (Tools) com Zod
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';
import { z } from 'https://esm.sh/zod@3.24.2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Definição e validação das ferramentas com Zod
const CreateTaskSchema = z.object({
  category: z.enum(['Pessoal', 'Escolar', 'Trabalho'], {
    errorMap: () => ({ message: 'A categoria deve ser Pessoal, Escolar ou Trabalho' }),
  }),
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  due_at: z.string().optional().nullable(),
});

const ListTasksSchema = z.object({
  category: z.enum(['Pessoal', 'Escolar', 'Trabalho']).optional(),
  filter: z.enum(['todas', 'hoje', 'proximas_48h', 'atrasadas']).optional(),
});

const UpdateTaskSchema = z.object({
  task_id: z.string().uuid(),
  title: z.string().optional(),
  category: z.enum(['Pessoal', 'Escolar', 'Trabalho']).optional(),
  due_at: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
});

const CompleteTaskSchema = z.object({
  task_id: z.string().uuid(),
  completed: z.boolean(),
});

const DeleteTaskSchema = z.object({
  task_id: z.string().uuid(),
  confirmed: z.boolean().refine(val => val === true, {
    message: 'A exclusão precisa de confirmação explícita do usuário.',
  }),
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const aiGatewayKey = Deno.env.get('LOVABLE_AI_GATEWAY_KEY') || Deno.env.get('OPENAI_API_KEY');

    // Cliente autenticado com o token do usuário (respeita RLS)
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sessão inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { messages, activeCategory, userTimezone } = body;

    // Se o AI Gateway não estiver configurado no servidor, retorna instrução clara
    if (!aiGatewayKey) {
      return new Response(
        JSON.stringify({
          error: 'Configuração pendente: LOVABLE_AI_GATEWAY_KEY não foi configurada nas variáveis de ambiente da função.',
        }),
        {
          status: 503,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Execução da chamada de LLM via Gateway compatível com OpenAI/Gemini
    const systemPrompt = `Você é o Assistente da Agenda Inteligente, em português do Brasil.
Seu objetivo é gerenciar e consultar as tarefas do usuário com gentileza, clareza e precisão.
Contexto atual:
- Fuso horário do usuário: ${userTimezone || 'America/Sao_Paulo'}
- Data/Hora de referência atual: ${new Date().toISOString()}
- Categoria atualmente aberta na tela: ${activeCategory || 'Pessoal'}

Regras Críticas:
1. Ao criar tarefas, se a categoria não foi informada pelo usuário, use a categoria atualmente aberta (${activeCategory || 'Pessoal'}) ou pergunte educadamente.
2. NUNCA diga que uma tarefa foi criada, editada ou concluída se a ferramenta não tiver retornado sucesso.
3. Para excluir tarefas, SEMPRE peça confirmação antes de executar 'delete_task' com confirmed: true.
4. Ao listar tarefas, mostre título, prazo (se houver), categoria e status.
5. Seja conciso e calmo em suas respostas.`;

    // Processamento com tools (especificação OpenAI function calling)
    const tools = [
      {
        type: 'function',
        function: {
          name: 'create_task',
          description: 'Cria uma nova tarefa na agenda do usuário.',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['Pessoal', 'Escolar', 'Trabalho'] },
              title: { type: 'string', description: 'Título claro da tarefa' },
              description: { type: 'string', description: 'Descrição detalhada opcional' },
              due_at: { type: 'string', description: 'Prazo em formato ISO 8601 (ex: 2026-11-13T19:00:00Z)' },
            },
            required: ['category', 'title'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'list_tasks',
          description: 'Consulta tarefas cadastradas na agenda.',
          parameters: {
            type: 'object',
            properties: {
              category: { type: 'string', enum: ['Pessoal', 'Escolar', 'Trabalho'] },
              filter: { type: 'string', enum: ['todas', 'hoje', 'proximas_48h', 'atrasadas'] },
            },
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'update_task',
          description: 'Atualiza detalhes de uma tarefa existente.',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'ID da tarefa' },
              title: { type: 'string' },
              category: { type: 'string', enum: ['Pessoal', 'Escolar', 'Trabalho'] },
              due_at: { type: 'string' },
              description: { type: 'string' },
            },
            required: ['task_id'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'complete_task',
          description: 'Marca uma tarefa como concluída ou reabre como pendente.',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'ID da tarefa' },
              completed: { type: 'boolean', description: 'true para concluir, false para pendente' },
            },
            required: ['task_id', 'completed'],
          },
        },
      },
      {
        type: 'function',
        function: {
          name: 'delete_task',
          description: 'Exclui uma tarefa da agenda. Exige confirmed: true.',
          parameters: {
            type: 'object',
            properties: {
              task_id: { type: 'string', description: 'ID da tarefa a excluir' },
              confirmed: { type: 'boolean', description: 'Deve ser true após o usuário confirmar expressamente' },
            },
            required: ['task_id', 'confirmed'],
          },
        },
      },
    ];

    // Envia ao Lovable AI Gateway / OpenAI
    const gatewayUrl = Deno.env.get('LOVABLE_AI_GATEWAY_URL') || 'https://api.openai.com/v1';
    const response = await fetch(`${gatewayUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${aiGatewayKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: 'auto',
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(JSON.stringify({ error: `Erro no AI Gateway: ${errText}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const aiData = await response.json();
    const choice = aiData.choices?.[0];
    const message = choice?.message;

    // Se a IA solicitou execução de ferramenta
    if (message?.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      const fnName = toolCall.function.name;
      const fnArgs = JSON.parse(toolCall.function.arguments || '{}');

      let toolResult: unknown = null;
      let actionExecuted = false;

      if (fnName === 'create_task') {
        const validated = CreateTaskSchema.parse(fnArgs);
        const { data: created, error } = await supabase
          .from('tasks')
          .insert({
            user_id: user.id,
            category: validated.category,
            title: validated.title,
            description: validated.description || null,
            due_at: validated.due_at || null,
            status: 'pendente',
            sort_order: 10,
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        toolResult = created;
        actionExecuted = true;
      } else if (fnName === 'list_tasks') {
        const validated = ListTasksSchema.parse(fnArgs);
        let query = supabase.from('tasks').select('*').eq('user_id', user.id);
        if (validated.category) {
          query = query.eq('category', validated.category);
        }
        const { data: list, error } = await query.order('due_at', { ascending: true });
        if (error) throw new Error(error.message);
        toolResult = list;
      } else if (fnName === 'update_task') {
        const validated = UpdateTaskSchema.parse(fnArgs);
        const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
        if (validated.title) updates.title = validated.title;
        if (validated.category) updates.category = validated.category;
        if (validated.due_at !== undefined) updates.due_at = validated.due_at;
        if (validated.description !== undefined) updates.description = validated.description;

        const { data: updated, error } = await supabase
          .from('tasks')
          .update(updates)
          .eq('id', validated.task_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        toolResult = updated;
        actionExecuted = true;
      } else if (fnName === 'complete_task') {
        const validated = CompleteTaskSchema.parse(fnArgs);
        const { data: updated, error } = await supabase
          .from('tasks')
          .update({
            status: validated.completed ? 'concluida' : 'pendente',
            updated_at: new Date().toISOString(),
          })
          .eq('id', validated.task_id)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw new Error(error.message);
        toolResult = updated;
        actionExecuted = true;
      } else if (fnName === 'delete_task') {
        const validated = DeleteTaskSchema.parse(fnArgs);
        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', validated.task_id)
          .eq('user_id', user.id);

        if (error) throw new Error(error.message);
        toolResult = { success: true };
        actionExecuted = true;
      }

      // Segunda chamada ao modelo com o resultado da ferramenta para formular a resposta amigável
      const secondResponse = await fetch(`${gatewayUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${aiGatewayKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            ...messages,
            message,
            {
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult),
            },
          ],
        }),
      });

      const secondData = await secondResponse.json();
      const finalMessage = secondData.choices?.[0]?.message?.content || 'Ação concluída com sucesso!';

      return new Response(
        JSON.stringify({
          reply: finalMessage,
          actionExecuted,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        reply: message?.content || '',
        actionExecuted: false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message || 'Erro inesperado na função' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
