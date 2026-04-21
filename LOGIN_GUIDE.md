# PSA RocketLine - Demo Login Guide

## Quick Start - Login Credentials

The PSA application now supports easy demo login with 4 test user accounts. Simply click on any of these accounts on the login page to access the system immediately.

### Test User Accounts

1. **Admin User**
   - Email: `admin@example.com`
   - Role: Full system access, organization settings
   - Permissions: Create projects, manage users, view all reports

2. **Project Manager**
   - Email: `pm@example.com`
   - Role: Project leadership and oversight
   - Permissions: Create/manage projects, assign tasks, approve timesheets

3. **Team Member (Developer)**
   - Email: `developer@example.com`
   - Role: Task execution and time tracking
   - Permissions: Log time, update task status, view assigned tasks

4. **Resource Manager**
   - Email: `resource@example.com`
   - Role: Team capacity and allocation planning
   - Permissions: View team capacity, manage resource requests, plan allocations

## How to Login

1. Open the application at `http://localhost:3000`
2. You'll see the login page with demo accounts displayed
3. Click on any demo account button to instantly login
4. You'll be redirected to the dashboard

## What Each Role Can Do

### Admin User
- Full access to all modules
- Can create organizations and manage users
- View all projects and reports
- Access settings and configuration

### Project Manager
- Create new projects with budgets and timelines
- Manage project phases and tasks
- Assign tasks to team members
- View and approve timesheets
- Access project-specific reports

### Team Member
- View assigned tasks and projects
- Log time via weekly timesheets
- Update task status
- Add comments to tasks
- Submit timesheets for approval

### Resource Manager
- View team capacity and utilization
- See allocation across projects
- Track team skills and availability
- Manage resource requests
- Plan team allocation

## Demo Data Included

The system comes pre-loaded with:
- 1 Organization: Demo Organization
- 3 Sample Projects:
  - E-Commerce Platform Redesign ($150,000 fixed fee)
  - Mobile App Development ($200,000 time & materials)
  - Cloud Infrastructure Migration ($75,000 fixed fee)
- 4 Team Members (the test accounts above)

## Features to Explore

### Projects Module
1. Go to "Projects" in the sidebar
2. Click on any project to view details
3. Switch between List, Kanban, and Timeline views
4. View project phases and tasks

### Time Tracking
1. Go to "Time Tracking" → "My Timesheet"
2. Select a week using the arrows
3. Log hours for each project per day
4. Submit timesheet for approval

### Resources
1. Go to "Resource Management"
2. View team member capacity and utilization
3. See allocation across projects
4. Monitor skill matrix

### Reports
1. Go to "Reports"
2. View project performance overview
3. Check financial summaries and billing methods
4. Analyze team utilization

## Troubleshooting

**I can't login:**
- Make sure you're clicking on one of the demo account buttons
- Check that the Supabase connection is working
- Look at the browser console for error messages

**Data isn't showing:**
- Refresh the page (Ctrl+R or Cmd+R)
- Check that you're logged in as the correct role
- Try logging out and back in

**Session expired:**
- Simply click on a demo account again to create a new session
- All data is persisted in the database

## Notes for Team

- This is a demo/MVP version built for internal showcase
- All data is stored in Supabase
- Demo login uses session storage (no password required)
- For production, integrate with proper SSO/SAML authentication
- Real-time features can be enabled via Supabase subscriptions

## Next Steps

After exploring the demo, consider:
1. Customizing the organization name and settings
2. Adding your actual team members and projects
3. Integrating with your SAML/SSO provider
4. Setting up approval workflows and automations
5. Configuring billing and invoicing rules
