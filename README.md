# Personal JIRA Clone

A full-stack, lightweight JIRA clone built for personal task management and agile workflows. 

## 🚀 Features

- **Kanban Boards**: Drag-and-drop issues between columns (To Do, In Progress, In Review, Done).
- **Agile Sprints & Backlog**: Plan sprints, estimate story points, and manage your backlog.
- **Epics & Projects**: Organize work across multiple projects and high-level epics.
- **Issue Details**: Rich issue tracking with priorities, assignees, subtasks, activity logs, and comments.
- **Keyboard Shortcuts**: Power-user friendly with quick navigation shortcuts (press `?` to view).
- **Real-time Database**: Powered by Supabase for instant data synchronization.

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router), React 19, TailwindCSS 4
- **Backend & Database**: Supabase (PostgreSQL)
- **State & Data Fetching**: Client-side Supabase SDK

## 🏃‍♂️ Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/personal-jira.git
   cd personal-jira
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Supabase:**
   - Create a new project on [Supabase](https://supabase.com).
   - Run the SQL script located at `supabase_schema.sql` in your Supabase SQL Editor.
   - Create a `.env.local` file in the root of the project with your credentials:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app.
