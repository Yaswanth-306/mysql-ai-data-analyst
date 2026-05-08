# MySQL AI Data Analyst

Ask plain-English questions about your MySQL database and get instant charts, tables, and CSV exports - powered by Claude.

---

## Features

-  Real MySQL connection (live query execution)
-  Claude generates SQL from natural language
-  5 chart types: bar, line, pie, area, scatter
-  Table view with raw row data
-  CSV export for every result
-  Expandable SQL query viewer
-  Auto-detects schema on connect

---

## Project Structure

```
├── backend/
│   ├── server.js          # Express API + MySQL + Anthropic
│   ├── package.json
│   └── .env.example
└── frontend/
    └── App.jsx            # React frontend (Vite / CRA)
```

---

## Setup

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your ANTHROPIC_API_KEY
npm start
# Server runs on http://localhost:3001
```

### 2. Frontend

Integrate `App.jsx` into your React project (Vite recommended):

```bash
npm create vite@latest mysql-analyst -- --template react
cd mysql-analyst
npm install recharts
# Replace src/App.jsx with the provided App.jsx
npm run dev
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `ANTHROPIC_API_KEY` | Your Anthropic API key (get at console.anthropic.com) |
| `PORT` | Backend port (default: 3001) |

---

## How It Works

1. **Connect** - Enter your MySQL credentials; the backend fetches the full schema
2. **Ask** - Type a plain-English question
3. **Analyze** - Claude writes the SQL and picks the best chart type
4. **Execute** - Backend runs the SQL against your real database
5. **Visualize** - Results render as a chart and/or table with CSV export

---

## API Endpoints

| Method | Path | Description |
|---|---|---|
| POST | `/api/connect` | Test connection, return table names |
| POST | `/api/schema` | Fetch full schema (all tables + columns) |
| POST | `/api/ask` | Claude generates SQL → runs it → returns data |

---

## Security Notes

- Claude is instructed to only write `SELECT` queries — no mutations allowed
- Results are limited to 100 rows by default
- Add authentication middleware before deploying to production
- Never expose this server publicly without auth

---

## Extending

- **Auth**: Add JWT middleware to protect `/api/*` routes
- **History**: Store results in localStorage or a `query_history` table
- **Multiple DBs**: Allow users to switch between saved connections
- **Download charts**: Use `html2canvas` to export charts as PNG
