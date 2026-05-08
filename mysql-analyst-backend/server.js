require('dotenv').config();
const express = require("express");
const mysql = require("mysql2/promise");
const Anthropic = require("@anthropic-ai/sdk");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── Test DB connection ──
app.post("/api/connect", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({ host, port: Number(port), user, password, database });
    const [rows] = await conn.execute("SHOW TABLES");
    await conn.end();
    const tables = rows.map(r => Object.values(r)[0]);
    res.json({ ok: true, tables });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ── Fetch schema for connected DB ──
app.post("/api/schema", async (req, res) => {
  const { host, port, user, password, database } = req.body;
  try {
    const conn = await mysql.createConnection({ host, port: Number(port), user, password, database });
    const [tables] = await conn.execute("SHOW TABLES");
    const tableNames = tables.map(r => Object.values(r)[0]);

    let schema = "";
    for (const table of tableNames) {
      const [cols] = await conn.execute(`DESCRIBE \`${table}\``);
      const colDefs = cols.map(c => `${c.Field} (${c.Type})`).join(", ");
      schema += `Table \`${table}\`: ${colDefs}\n`;
    }
    await conn.end();
    res.json({ ok: true, schema });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  }
});

// ── Ask question: Claude writes SQL → run it → return data ──
app.post("/api/ask", async (req, res) => {
  const { dbConfig, question, schema } = req.body;

  const systemPrompt = `You are a MySQL data analyst. The user's database schema is:

${schema}

Given a question, respond ONLY with valid JSON (no markdown, no explanation):
{
  "query": "SELECT ...",
  "explanation": "One sentence explaining what this shows",
  "chartType": "bar" | "line" | "pie" | "scatter" | "area",
  "chartTitle": "Chart title",
  "xKey": "field_for_x_axis",
  "yKey": "field_for_y_axis",
  "secondaryYKey": "optional second numeric field for scatter",
  "suggestedView": "chart" | "table"
}

Rules:
- Write safe, read-only SELECT queries only. No INSERT, UPDATE, DELETE, DROP.
- Use LIMIT 100 max.
- Choose the best chart type based on data shape:
  * bar: comparisons, rankings
  * line: trends over time
  * pie: proportions (max 8 slices)
  * scatter: correlations between two numeric fields
  * area: cumulative trends
- suggestedView: use "table" for wide result sets (>4 columns), "chart" otherwise.`;

  let sqlQuery = "";
  let explanation = "";
  let chartMeta = {};

  try {
    // Step 1: Claude generates SQL
    const aiRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: question }],
    });

    const raw = aiRes.content.find(b => b.type === "text")?.text || "";
    const clean = raw.replace(/```json|```/g, "").trim();
    const parsed = JSON.parse(clean);
    sqlQuery = parsed.query;
    explanation = parsed.explanation;
    chartMeta = {
      chartType: parsed.chartType,
      chartTitle: parsed.chartTitle,
      xKey: parsed.xKey,
      yKey: parsed.yKey,
      secondaryYKey: parsed.secondaryYKey || null,
      suggestedView: parsed.suggestedView || "chart",
    };
  } catch (err) {
    return res.status(500).json({ ok: false, error: "Claude failed to generate SQL: " + err.message });
  }

  // Step 2: Run SQL against real MySQL
  try {
    const conn = await mysql.createConnection({
      host: dbConfig.host,
      port: Number(dbConfig.port),
      user: dbConfig.user,
      password: dbConfig.password,
      database: dbConfig.database,
    });
    const [rows, fields] = await conn.execute(sqlQuery);
    await conn.end();

    const columns = fields.map(f => f.name);
    const data = rows.map(r => {
      const obj = {};
      columns.forEach(col => { obj[col] = r[col]; });
      return obj;
    });

    res.json({ ok: true, query: sqlQuery, explanation, chartMeta, columns, data });
  } catch (err) {
    res.status(400).json({ ok: false, error: "MySQL error: " + err.message, query: sqlQuery });
  }
});

// ── AI Insights endpoint ──
app.post("/api/insight", async (req, res) => {
  const { question, data, chartMeta } = req.body;
  try {
    const aiRes = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: `You are a senior data analyst. Given a question, chart metadata, and a sample of query results, provide 3-5 concise, specific insights. Focus on:
- Key patterns or trends
- Anomalies or outliers
- Business implications
- Actionable recommendations

Format as numbered points. Be specific with numbers from the data. Keep each point to 1-2 sentences. Do NOT use markdown headers or bold text.`,
      messages: [{ role: "user", content: `Question: ${question}\nChart type: ${chartMeta?.chartType}\nData sample: ${data}` }],
    });
    const insight = aiRes.content.find(b => b.type === "text")?.text || "";
    res.json({ ok: true, insight });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
