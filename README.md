# Agenda Inteligente 📅✨

Aplicativo web responsivo e moderno, desenvolvido em português do Brasil, para gerenciar tarefas **Pessoais**, **Escolar** e de **Trabalho**, com calendário, temas claro e escuro e ordenação manual ou automática.

---

## 🌐 Publicação 100% Online na Nuvem (GitHub Pages + Supabase)

O projeto está totalmente preparado com **GitHub Actions** e **scripts de roteamento SPA** para rodar online sem custo.

A arquitetura na nuvem funciona assim:
- **Frontend (Interface)**: Hospedado no **GitHub Pages** com deploy automático via GitHub Actions.
- **Banco de Dados & Autenticação**: Hospedado no **Lovable Cloud** ou **Supabase** (PostgreSQL na nuvem com RLS).

### Passo a Passo para Colocar Online no GitHub:

#### 1. Criar Repositório no GitHub
1. Acesse [github.com/new](https://github.com/new).
2. Crie um repositório (ex: `agenda-inteligente`).
3. Pode ser público ou privado.

#### 2. Subir o Projeto para o GitHub
No seu computador, abra o terminal na pasta `E:\Antigravity` e rode:
```bash
cd E:\Antigravity

# Inicializar o git se ainda não tiver inicializado
git init
git add .
git commit -m "feat: lancamento inicial da Agenda Inteligente"
git branch -M main

# Conectar com seu repositório no GitHub (substitua pelo seu link)
git remote add origin https://github.com/SEU-USUARIO/agenda-inteligente.git
git push -u origin main
```

#### 3. Configurar as Secrets no GitHub
Para que o GitHub Actions compile a aplicação com acesso ao seu banco de dados na nuvem:
1. No seu repositório no GitHub, clique na aba **Settings**.
2. No menu lateral esquerdo, vá em **Secrets and variables > Actions**.
3. Clique em **New repository secret** e adicione:
   - Nome: `VITE_SUPABASE_URL` | Valor: sua URL do Supabase (ex: `https://xyz.supabase.co`)
   - Nome: `VITE_SUPABASE_ANON_KEY` | Valor: sua anon key pública do Supabase

#### 4. Ativar o GitHub Pages com GitHub Actions
1. Ainda na aba **Settings** do seu repositório, clique em **Pages** no menu esquerdo.
2. Em **Build and deployment > Source**, selecione **GitHub Actions**.
3. O fluxo configurado em `.github/workflows/deploy.yml` será disparado automaticamente.
4. Quando o workflow finalizar, a URL do seu site estará disponível (ex: `https://SEU-USUARIO.github.io/agenda-inteligente/`).

#### 5. Configurar o Redirecionamento de Auth no Supabase
1. No painel do seu projeto no Supabase / Lovable Cloud, vá em **Authentication > URL Configuration**.
2. Em **Site URL**, coloque a URL do seu GitHub Pages:
   `https://SEU-USUARIO.github.io/agenda-inteligente/`
3. Em **Redirect URLs**, adicione a mesma URL para autorizar o retorno do login do Google e confirmação de e-mail.

Pronto! Seu site estará 100% online, seguro e com banco de dados em nuvem.

---

## 🚀 Tecnologias Utilizadas

- **Frontend**: React 18/19, TypeScript, Vite, Tailwind CSS, Lucide React, date-fns (pt-BR).
- **Gerenciamento de Estado**: TanStack Query (React Query) para sincronização e invalidação imediata sem uso de `localStorage`/`IndexedDB` para dados de negócio.
- **Arraste e Solte**: `@dnd-kit/core` e `@dnd-kit/sortable` com sensores de ponteiro e toque adaptados para telas móveis e desktop.
- **Backend & Autenticação**: Lovable Cloud / Supabase (PostgreSQL, Row Level Security, Auth com E-mail/Senha e Google OAuth).
- **Testes**: Vitest cobrindo 100% da lógica de prazos, atrasos e ordenações.

---

## 🛠️ Como Executar Localmente

1. Navegue até a pasta do projeto:
   ```bash
   cd E:\Antigravity
   ```

2. Instale as dependências:
   ```bash
   npm install
   ```

3. Crie seu arquivo `.env` a partir do modelo `.env.example`:
   ```bash
   cp .env.example .env
   ```

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

5. Para rodar a suíte de testes unitários com Vitest:
   ```bash
   npm run test:run
   ```

---

## 🗄️ Configuração do Banco de Dados e Políticas de Segurança (RLS)

O arquivo com a migração inicial completa encontra-se em:
`supabase/migrations/20261112_init.sql`.

Para aplicar no seu banco:
1. Abra o painel do Supabase ou Lovable Cloud.
2. Acesse a aba **SQL Editor**.
3. Em um banco novo, execute `supabase/migrations/20261112_init.sql` para criar as tabelas.
4. Execute `supabase/migrations/20261113_gemini_api_key.sql` para habilitar a chave por perfil. Em um banco que já tem as tabelas, execute apenas esta migração.
5. Execute também as migrações seguintes em ordem de nome. Em instalações existentes, aplique apenas as pendentes.

### Integração com o Google Agenda

Ative a Google Calendar API no Google Cloud. Configure a tela de consentimento e crie um cliente OAuth do tipo **Aplicativo da Web**. Adicione a origem JavaScript do site (para este GitHub Pages, `https://joaopmoreno.github.io`) e, durante o desenvolvimento, a origem local. Se o aplicativo OAuth estiver em teste, inclua as contas de teste.

Para disponibilizar o cliente a todos, configure a variável de repositório `VITE_GOOGLE_CALENDAR_CLIENT_ID` em Settings → Secrets and variables → Actions → Variables e refaça o deploy. Para uso individual, o ID público também pode ser salvo na aba **Calendário**. Não há segredo OAuth no frontend.

Após autorizar a conta de mesmo e-mail, a sincronização ocorre enquanto o site está aberto, com autorização válida. O calendário principal recebe tarefas com prazo. Os eventos comuns dos últimos 30 dias e próximos 365 dias entram na categoria Pessoal; recorrências são importadas por ocorrência. Excluir em um lado preserva a cópia do outro. Conflitos de edição no mesmo campo priorizam o valor do Google.

### Tabelas Criadas:
1. **`profiles`**: Perfil do usuário, fuso horário e preferências de voz.
2. **`tasks`**: Tarefas categorizadas, com prazos, status e ordenação.
3. **`category_settings`**: Armazena o modo Automático / Manual para cada aba.

Todas possuem **Row Level Security (RLS)** ativado com políticas baseadas em `auth.uid() = user_id`.
