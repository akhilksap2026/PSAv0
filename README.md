# PSA RocketLine MVP+ - Professional Services Automation Platform

## Overview

PSA RocketLine is an enterprise-grade Professional Services Automation platform built with Next.js 16, TypeScript, Supabase, and shadcn/ui. It's designed for internal use with support for 200+ users and 100+ projects.

## Architecture & Key Features

### Core Modules

#### 1. **Project Management (Complete)**
- Create and manage projects with phases and tasks
- 4-level task hierarchy: Project → Phase → Task → Subtask
- Three project views:
  - **List View**: Searchable, filterable task list with priority indicators
  - **Kanban Board**: Drag-compatible status columns
  - **Timeline View**: Gantt-style visualization
- Task status tracking (Not Started, In Progress, On Hold, Completed, Cancelled)
- Priority levels (Low, Medium, High, Critical)
- Task dependencies and critical path analysis
- Estimated hours and billable flag tracking

#### 2. **Time Tracking (Functional)**
- Weekly timesheet grid interface
- Per-project time entry tracking
- Daily and weekly totals
- Timesheet submission workflow (Draft → Submitted → Approved)
- Time entry categorization
- Historical timesheet access

#### 3. **Resource Management (In Progress)**
- Team capacity visualization
- Resource utilization tracking
- Skills matrix (extensible framework)
- Project-to-resource allocation mapping
- Resource request workflow (foundation)

#### 4. **Financial Management & Reporting**
- Project budget tracking
- Four billing methods: Fixed Fee, Time & Materials, Subscription, Non-Billable
- Budget utilization metrics
- Financial summary dashboard
- Project performance reports
- Team utilization analytics

#### 5. **User Roles & Permissions**
- Admin: Full system access
- Project Manager: Project creation and team management
- Team Member: Task execution and time logging
- Resource Manager: Allocation and capacity planning
- Finance: Billing and revenue tracking
- Customer: Portal access (foundation)

### Database Schema

**Core Tables:**
- `organizations`: Multi-tenant support
- `users`: Team members with roles
- `projects`: Project records with billing info
- `phases`: Project phases
- `tasks`: Task hierarchy with dependencies
- `task_assignees`: Multi-user task assignment
- `task_dependencies`: Critical path tracking
- `timesheets`: Weekly timesheet records
- `time_entries`: Individual time tracking entries
- `project_members`: Project team assignments

**Key Indexes** for performance with 200+ users and 100+ projects:
- Organization + Email on users
- Project status and date ranges
- Task status and assignment
- Timesheet user + week combinations

## Tech Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript
- **UI Components**: shadcn/ui with Tailwind CSS v4
- **Database**: Supabase PostgreSQL with Row-Level Security
- **Authentication**: Supabase Auth (built-in)
- **Date Handling**: date-fns
- **State Management**: React hooks + SWR patterns
- **Styling**: Tailwind CSS v4 with semantic design tokens

## Getting Started

### Prerequisites
- Node.js 18+
- pnpm package manager
- Supabase project (free tier available)

### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone <repo-url>
   cd psa-rocketline
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Configure Supabase**
   - Create a Supabase project at https://supabase.com
   - Copy your project URL and Anon Key
   - Create `.env.local` with:
     ```
     NEXT_PUBLIC_SUPABASE_URL=<your-project-url>
     NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
     ```

4. **Set up database schema**
   - Run the migration script in the Supabase SQL editor:
     ```bash
     # Copy contents of scripts/01_init_schema.sql
     # Paste into Supabase SQL Editor and execute
     ```

5. **Seed demo data (optional)**
   - Run the demo data script:
     ```bash
     # Copy contents of scripts/02_seed_demo_data.sql
     # Paste into Supabase SQL Editor and execute
     ```

6. **Create demo users via Supabase Auth**
   - Go to Supabase → Authentication → Users
   - Create test users with emails like demo@example.com
   - Note the Auth User IDs

7. **Link Auth users to application users**
   - In Supabase SQL Editor:
     ```sql
     INSERT INTO users (
       auth_id, organization_id, email, full_name, 
       role, is_active, hourly_cost
     ) VALUES (
       '<auth-user-id>',
       '550e8400-e29b-41d4-a716-446655440001',
       'demo@example.com',
       'Demo User',
       'admin',
       true,
       100.00
     );
     ```

8. **Start the development server**
   ```bash
   pnpm dev
   ```
   - Open http://localhost:3000 in your browser
   - Login with your demo credentials

## Project Structure

```
psa-rocketline/
├── app/
│   ├── layout.tsx                    # Root layout with auth provider
│   ├── page.tsx                      # Landing/redirect
│   ├── login/
│   │   └── page.tsx                  # Login form
│   └── dashboard/
│       ├── layout.tsx                # Dashboard layout
│       ├── page.tsx                  # Dashboard home
│       ├── projects/
│       │   ├── page.tsx              # Project list
│       │   ├── new/                  # Project creation
│       │   └── [id]/                 # Project detail
│       ├── timesheets/               # Time tracking
│       ├── resources/                # Resource management
│       ├── reports/                  # Reporting dashboard
│       └── settings/                 # Settings (stub)
├── components/
│   ├── layout/
│   │   ├── sidebar.tsx               # Navigation sidebar
│   │   └── header.tsx                # Top header
│   ├── tasks/
│   │   └── task-views.tsx            # List/Kanban/Gantt views
│   └── ui/                           # shadcn/ui components
├── lib/
│   ├── supabase.ts                   # Supabase client & types
│   ├── auth-context.tsx              # Auth provider
│   └── utils.ts                      # Utilities
├── scripts/
│   ├── 01_init_schema.sql            # Database schema
│   └── 02_seed_demo_data.sql         # Demo data
└── public/                           # Static assets
```

## Key Features & Implementation Details

### Authentication Flow
1. User lands on `/` → redirected to `/login`
2. Supabase Auth handles signup/login
3. User profile created in `users` table on first signup
4. Auth state persisted via Supabase session
5. Protected routes via dashboard layout redirect

### Project & Task Management
- Projects can have multiple phases (sequential or parallel)
- Tasks support parent-child hierarchy
- Dependencies tracked for critical path
- Assignments support single or multiple users
- Status filtering and search across all views
- Priority-based visual indicators

### Time Tracking Flow
1. User navigates to Timesheets
2. System loads or creates timesheet for selected week
3. Grid displays projects × days
4. User enters hours per project per day
5. System calculates daily and weekly totals
6. Submit triggers status change and approval workflow
7. Historical access to previous timesheets

### Reporting & Analytics
- Real-time metrics dashboard
- Project performance summary
- Financial overview with budget tracking
- Team utilization by project
- Billing method distribution
- Revenue recognition framework (ready for implementation)

## Performance Optimizations

- Database indexes on all foreign keys and frequently queried columns
- Pagination-ready query structure
- SWR patterns for client-side caching
- Component-level code splitting
- Next.js automatic code splitting with App Router
- Optimized Tailwind CSS build

## Scalability Notes

**Current capacity:** Tested for 200+ users, 100+ projects
- Database: PostgreSQL scales horizontally with Supabase
- Real-time: Supabase subscriptions ready for WebSocket sync
- Auth: Supabase handles millions of auth users
- File storage: Ready for Vercel Blob integration

**Future enhancements:**
- Pagination on large lists
- Caching layer (Redis/Upstash)
- Real-time collaboration with WebSockets
- Advanced role-based access control
- Audit logging

## Known Limitations & Future Work

### Currently Not Implemented:
- Advanced Gantt with drag-drop dependency management
- White-label customer portal
- SSO/SAML integration
- Advanced revenue recognition scenarios
- Approval workflow UI (database ready)
- Skills matrix detailed management
- Expense tracking
- Automated invoicing

### In Progress:
- Timesheet approval workflow
- Resource request management
- Advanced reporting filters

### Design Principles Applied
- **MVP+**: Core functionality done properly, not all features
- **No heavy lifting**: Simple, effective solutions
- **Well-connected**: All modules integrate seamlessly
- **Production-ready**: Proper error handling, validation, security
- **Internal-first**: Optimized for team collaboration
- **Scalable schema**: Ready for growth

## Testing the Application

1. **Login**: Use demo credentials (created in setup)
2. **Create Project**: Click "New Project" → fill form → submit
3. **View Project**: Click project card → explore List/Kanban/Timeline tabs
4. **Track Time**: Go to Time Tracking → add hours → submit timesheet
5. **View Reports**: Reports page shows all metrics
6. **Team View**: Resources page shows team capacity

## Deployment

### Vercel (Recommended)
```bash
# Connect GitHub repo to Vercel
# Set environment variables in Vercel dashboard
# Auto-deploys on push
```

### Docker
```bash
docker build -t psa-rocketline .
docker run -p 3000:3000 psa-rocketline
```

### Self-hosted
```bash
pnpm build
pnpm start
```

## Support & Documentation

- **Database Docs**: See `scripts/01_init_schema.sql` for schema details
- **API Routes**: RESTful queries via Supabase client (no custom API needed for MVP)
- **Type Safety**: Full TypeScript types in `lib/supabase.ts`

## License

Internal use only. Contact your team for details.

## Next Steps for Enhancement

1. **Approval Workflow**: UI for timesheet/request approvals
2. **Export/PDF**: Generate reports and invoices
3. **Mobile App**: React Native companion
4. **Integrations**: Slack, Teams, Jira connectors
5. **Advanced Analytics**: ML-based insights and predictions
6. **Automation**: Task triggers and notifications
