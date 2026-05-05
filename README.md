# Team Task Manager

A multi-tenant team task management system with role-based access control (RBAC). Admins create projects, add members, and assign tasks. Members focus on their assigned tasks and update status only.

## Features
- Admin onboarding (first signup becomes Admin)
- Member provisioning by Admin (no public member signup)
- Projects with members and tasks
- Task status, priority, and due dates
- Role-based dashboards with progress and overdue lists
- Secure authentication with JWT and hashed passwords

## Tech Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma
- Auth: JWT + bcrypt

## Project Structure
- client/ - React app
- server/ - Express API + Prisma schema

## Local Setup
### 1) Install dependencies
```bash
npm run install-all
```

### 2) Configure environment
Create a server/.env file:
```env
PORT=5000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
JWT_SECRET="your_strong_secret"
JWT_EXPIRES_IN="7d"
NODE_ENV="development"
```

### 3) Push schema and generate Prisma client
```bash
npm run prisma:push
npm run prisma:generate
```

### 4) Run the app
```bash
npm run dev
```
- API: http://localhost:5000/api/health
- Web: http://localhost:5173

## RBAC Logic (Summary)
- Admins can create/edit/delete projects and tasks, and create member accounts.
- Members can only update the status of tasks assigned to them.
- Project details are read-only for members.
- Task and project access is restricted to owners or project members.

## API Endpoints
### Auth
- POST /api/auth/signup - Create the first Admin account only
- POST /api/auth/login - Login
- GET /api/auth/me - Current user

### Users (Admin only)
- GET /api/users - List users
- POST /api/users - Create member

### Projects
- POST /api/projects - Create project (Admin)
- GET /api/projects - List projects for current user
- GET /api/projects/:id - Project details (members only)
- PUT /api/projects/:id - Update project (Admin/Owner)
- DELETE /api/projects/:id - Delete project (Admin/Owner)
- POST /api/projects/:id/members - Add member (Admin)
- DELETE /api/projects/:id/members/:userId - Remove member (Admin)

### Tasks
- POST /api/tasks/project/:projectId - Create task (Admin)
- GET /api/tasks/project/:projectId - Project tasks (members)
- GET /api/tasks/my - My assigned tasks
- GET /api/tasks/:id - Task details (project members)
- PUT /api/tasks/:id - Update task (Admin or assigned Member)
- DELETE /api/tasks/:id - Delete task (Admin/Owner)

### Dashboard
- GET /api/dashboard/stats - Role-specific stats

## Validations
- Task titles are required and non-empty.
- Due dates cannot be in the past.
- Emails must be valid format.
- Passwords must be at least 6 characters.

## Deployment (Railway)
1) Connect the repository to Railway.
2) Set environment variables in Railway:
   - DATABASE_URL
   - JWT_SECRET
   - JWT_EXPIRES_IN
   - NODE_ENV=production
3) Build Command: `npm run build`
4) Start Command: `npm run start`
5) Procfile is included at the repo root for compatibility.

## Notes
- The server serves the built client from client/dist when NODE_ENV=production.
- Use strong credentials for JWT_SECRET and database access.
