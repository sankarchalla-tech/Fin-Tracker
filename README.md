# FinTrack - Financial Tracker

A full-stack financial tracking application for managing personal and group finances.

## Features

- **Authentication**: Secure login/register with JWT cookies
- **Transactions**: Track income, expenses, investments, and EMIs
- **Categories**: Organize transactions with custom categories
- **Budgets**: Set monthly budgets per category
- **Savings Goals**: Track progress towards financial goals
- **Groups**: Collaborate with family/friends on shared finances
- **Dashboard**: Visual charts and summaries with personal/group toggle

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS, Shadcn/ui, Recharts
- **Backend**: Node.js, Express, TypeScript, Drizzle ORM
- **Database**: PostgreSQL

## Prerequisites

- Node.js 20+
- PostgreSQL database

## Quick Start

```bash
# Install dependencies
npm install

# Set up environment variables
cp fintrack-server/.env.example fintrack-server/.env
# Edit fintrack-server/.env with your database credentials

# Push database schema
cd fintrack-server && npm run db:push && cd ..

# Start development server
npm run dev
```

Open http://localhost:3000 in your browser.

## Environment Variables

Create a `.env` file in `fintrack-server/`:

```env
DATABASE_URL="postgresql://user:password@host:5432/fintrack"
JWT_SECRET="your-super-secret-jwt-key-min-32-chars"
NODE_ENV="development"
PORT=5000
FRONTEND_URL="http://localhost:3000"
```

---

## Deployment Guide (Free Hosting)

### Option 1: Render.com (Recommended - Easiest)

**Best for: Quick deployment, all-in-one hosting**

#### Step 1: Push code to GitHub

```bash
# Initialize git if not already done
git init
git add .
git commit -m "Initial commit"

# Create repo on GitHub, then:
git remote add origin https://github.com/YOUR_USERNAME/fintrack.git
git push -u origin main
```

#### Step 2: Create PostgreSQL Database

1. Go to [Render.com](https://render.com) and sign up/login
2. Go to **Dashboard** → **New** → **PostgreSQL**
3. Name: `fintrack-db`
4. Region: Choose closest to you
5. Click **Create Database**
6. Copy the **Internal Database URL** (starts with `postgresql://`)

#### Step 3: Deploy Backend + Frontend

1. Go to **Dashboard** → **New** → **Web Service**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `fintrack`
   - **Root Directory**: `.` (leave empty or use `.`)
   - **Runtime**: `Node`
   - **Build Command**: 
     ```bash
     npm install && cd fintrack-client && npm install && npm run build && cd ../fintrack-server && npm install && npm run build
     ```
   - **Start Command**: 
     ```bash
     cd fintrack-server && node dist/index.js
     ```
4. Add Environment Variables:
   - `DATABASE_URL` = (paste your PostgreSQL Internal URL)
   - `JWT_SECRET` = (generate a 32+ character random string)
   - `NODE_ENV` = `production`
   - `FRONTEND_URL` = `https://fintrack.onrender.com` (use your service name)
5. Click **Create Web Service**

Wait 5-10 minutes for deployment. Your app will be at `https://your-service-name.onrender.com`

---

### Option 2: Railway.app

**Best for: More flexibility, $5 free credit/month**

#### Step 1: Create Project

1. Go to [Railway.app](https://railway.app) and sign up with GitHub
2. Click **New Project** → **Deploy from GitHub repo**
3. Select your repository

#### Step 2: Add PostgreSQL

1. In your project, click **Add** → **Database** → **PostgreSQL**
2. Railway will auto-inject `DATABASE_URL`

#### Step 3: Configure Variables

Add these variables in your service settings:
- `JWT_SECRET` = (32+ character random string)
- `NODE_ENV` = `production`

#### Step 4: Configure Deployment

- **Root Directory**: `/`
- **Build Command**: Same as Render
- **Start Command**: Same as Render

#### Step 5: Generate Domain

1. Go to **Settings** → **Networking**
2. Click **Generate Domain**

---

### Option 3: Neon (Database) + Render/Vercel (App)

**Best for: Separate database and frontend hosting**

#### Database (Neon - Free 0.5GB)

1. Go to [Neon.tech](https://neon.tech)
2. Create a free account
3. Create a project and copy the connection string

#### Frontend (Vercel)

1. Import your GitHub repo to [Vercel](https://vercel.com)
2. Set **Root Directory** to `fintrack-client`
3. Add environment variable: `VITE_API_URL` = your backend URL

#### Backend (Render)

Follow Option 1 but:
- Don't create Render PostgreSQL
- Use Neon connection string for `DATABASE_URL`
- Set `FRONTEND_URL` to your Vercel URL

---

## Free Tier Comparison

| Platform | Database | Compute | Limits |
|----------|----------|---------|--------|
| Render | 90 days free, then $7/mo | 750 hrs/month | 512MB RAM |
| Railway | $5 free credit/month | $5 free credit/month | ~500 hrs/month |
| Neon | 0.5GB free forever | N/A | DB only |
| Vercel | N/A | 100GB bandwidth | Frontend only |

**Recommendation for 5-10 users**: Render.com (Option 1) is simplest.

---

## Production Checklist

- [ ] Generate secure `JWT_SECRET` (use random password generator)
- [ ] Use HTTPS (automatic on Render/Railway)
- [ ] Set `NODE_ENV=production`
- [ ] Configure `FRONTEND_URL` to your production URL
- [ ] Test registration and login
- [ ] Create a group and invite users
- [ ] Test all transaction types

---

## Troubleshooting

### "Failed to fetch" errors
- Check `FRONTEND_URL` matches your frontend URL exactly
- Ensure cookies are enabled in browser
- Check CORS settings in server logs

### Database connection errors
- Verify `DATABASE_URL` is correct
- For Render: use **Internal Database URL**
- For Railway: variable is auto-injected

### Build failures
- Check build logs for specific errors
- Ensure all dependencies are in `package.json`
- Try building locally first: `npm run build`

---

## License

MIT
