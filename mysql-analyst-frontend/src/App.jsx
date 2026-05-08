import { useState, useRef, useCallback } from "react";
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  ScatterChart, Scatter, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from "recharts";

const API_BASE = "http://localhost:3001/api";

const themes = {
  dark: {
    bg: "#0a0a0a", surface: "#111", surface2: "#161616", border: "#1e1e1e",
    border2: "#2a2a2a", text: "#fff", textMuted: "#666", textSub: "#888",
    accent: "#f97316", accentBg: "#1a0d00", error: "#ef4444",
    errorBg: "#1a0a0a", errorBorder: "#3a1a1a", success: "#22c55e",
    tag: "#1a1a1a", tagBorder: "#2a2a2a", tagText: "#888",
    kpiBg: "#0f0f0f", kpiBorder: "#1e1e1e",
    chartGrid: "#1a1a1a", tooltipBg: "#111", tooltipBorder: "#2a2a2a",
    insightBg: "#0d1a0d", insightBorder: "#1a3a1a", insightText: "#4ade80",
  },
  light: {
    bg: "#f5f5f0", surface: "#fff", surface2: "#f9f9f6", border: "#e5e5e0",
    border2: "#d5d5d0", text: "#111", textMuted: "#888", textSub: "#666",
    accent: "#ea6a00", accentBg: "#fff7f0", error: "#dc2626",
    errorBg: "#fef2f2", errorBorder: "#fecaca", success: "#16a34a",
    tag: "#f0f0eb", tagBorder: "#e0e0db", tagText: "#666",
    kpiBg: "#f9f9f6", kpiBorder: "#e5e5e0",
    chartGrid: "#f0f0eb", tooltipBg: "#fff", tooltipBorder: "#e0e0db",
    insightBg: "#f0fdf4", insightBorder: "#bbf7d0", insightText: "#15803d",
  }
};

const PALETTE = ["#f97316","#3b82f6","#22c55e","#a855f7","#f43f5e","#14b8a6","#eab308","#6366f1","#ec4899","#06b6d4"];
const CHART_ICONS = { bar: "▬", line: "∿", pie: "◕", scatter: "⋮", area: "▲" };

function downloadCSV(data, filename = "export.csv") {
  if (!data?.length) return;
  const headers = Object.keys(data[0]);
  const rows = data.map(r => headers.map(h => JSON.stringify(r[h] ?? "")).join(","));
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const a = Object.assign(document.createElement("a"), { href: URL.createObjectURL(blob), download: filename });
  a.click();
}

function formatNumber(n) {
  if (n === null || n === undefined) return "—";
  if (typeof n !== "number") return n;
  if (Math.abs(n) >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (Math.abs(n) >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return Number.isInteger(n) ? n.toString() : n.toFixed(2);
}

function ChartView({ result, t }) {
  const { chartMeta, data } = result;
  if (!data?.length) return <p style={{ color: t.textMuted, fontSize: 13 }}>No data returned.</p>;
  const { chartType, xKey, yKey } = chartMeta;
  const ax = { tick: { fill: t.textMuted, fontSize: 11 }, axisLine: { stroke: t.border }, tickLine: false };
  const grid = <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />;
  const tip = { contentStyle: { background: t.tooltipBg, border: `1px solid ${t.tooltipBorder}`, borderRadius: 10, fontSize: 12 }, labelStyle: { color: t.accent } };

  if (chartType === "pie") return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey={yKey} nameKey={xKey} cx="50%" cy="50%" outerRadius={100} innerRadius={36}
          label={({ name, percent }) => `${String(name).slice(0, 12)} ${(percent * 100).toFixed(0)}%`}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip {...tip} />
      </PieChart>
    </ResponsiveContainer>
  );

  if (chartType === "scatter") return (
    <ResponsiveContainer width="100%" height={260}>
      <ScatterChart>
        {grid}<XAxis dataKey={xKey} {...ax} /><YAxis dataKey={yKey} {...ax} />
        <Tooltip {...tip} cursor={{ strokeDasharray: "3 3" }} />
        <Scatter data={data} fill={t.accent} fillOpacity={0.8} />
      </ScatterChart>
    </ResponsiveContainer>
  );

  if (chartType === "area") return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data}>
        {grid}
        <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={t.accent} stopOpacity={0.25}/><stop offset="95%" stopColor={t.accent} stopOpacity={0}/></linearGradient></defs>
        <XAxis dataKey={xKey} {...ax} /><YAxis {...ax} />
        <Tooltip {...tip} />
        <Area type="monotone" dataKey={yKey} stroke={t.accent} strokeWidth={2.5} fill="url(#ag)" dot={{ fill: t.accent, r: 3 }} />
      </AreaChart>
    </ResponsiveContainer>
  );

  if (chartType === "line") return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data}>
        {grid}<XAxis dataKey={xKey} {...ax} /><YAxis {...ax} />
        <Tooltip {...tip} />
        <Line type="monotone" dataKey={yKey} stroke={t.accent} strokeWidth={2.5} dot={{ fill: t.accent, r: 4 }} activeDot={{ r: 6 }} />
      </LineChart>
    </ResponsiveContainer>
  );

  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} barSize={26}>
        {grid}<XAxis dataKey={xKey} {...ax} /><YAxis {...ax} tickFormatter={formatNumber} />
        <Tooltip {...tip} formatter={v => formatNumber(v)} />
        <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function KPICards({ data, yKey, xKey, t }) {
  if (!data?.length || !yKey) return null;
  const nums = data.map(r => Number(r[yKey])).filter(n => !isNaN(n));
  if (!nums.length) return null;
  const total = nums.reduce((a, b) => a + b, 0);
  const avg = total / nums.length;
  const max = Math.max(...nums);
  const maxRow = data.find(r => Number(r[yKey]) === max);
  const cards = [
    { label: "Total", value: formatNumber(total), sub: `${nums.length} records` },
    { label: "Average", value: formatNumber(avg), sub: "per record" },
    { label: "Peak", value: formatNumber(max), sub: maxRow ? String(maxRow[xKey]).slice(0, 18) : "" },
    { label: "Minimum", value: formatNumber(Math.min(...nums)), sub: "lowest value" },
  ];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 10, marginBottom: 22 }}>
      {cards.map(c => (
        <div key={c.label} style={{ background: t.kpiBg, border: `1px solid ${t.kpiBorder}`, borderRadius: 10, padding: "14px 16px" }}>
          <p style={{ fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 5 }}>{c.label}</p>
          <p style={{ fontSize: 20, fontWeight: 600, color: t.accent, fontFamily: "'DM Mono',monospace", marginBottom: 2 }}>{c.value}</p>
          <p style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{c.sub}</p>
        </div>
      ))}
    </div>
  );
}

function InsightPanel({ insight, loading, t }) {
  if (loading) return (
    <div style={{ background: t.kpiBg, border: `1px solid ${t.kpiBorder}`, borderRadius: 10, padding: "14px 16px", marginBottom: 20 }}>
      <p style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace", animation: "pulse 1.5s infinite" }}>◈ Generating AI insights…</p>
    </div>
  );
  if (!insight) return null;
  return (
    <div style={{ background: t.insightBg, border: `1px solid ${t.insightBorder}`, borderRadius: 10, padding: "16px 18px", marginBottom: 20 }}>
      <p style={{ fontSize: 10, letterSpacing: 2, color: t.insightText, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>◈ AI Insights</p>
      <div style={{ fontSize: 13, color: t.text, fontFamily: "'DM Mono',monospace", lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{insight}</div>
    </div>
  );
}

function TableView({ columns, data, t }) {
  return (
    <div style={{ overflowX: "auto", borderRadius: 10, border: `1px solid ${t.border}` }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'DM Mono',monospace", fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${t.border2}` }}>
            {columns.map(col => <th key={col} style={{ padding: "10px 14px", textAlign: "left", color: t.accent, letterSpacing: 1, textTransform: "uppercase", fontSize: 10, whiteSpace: "nowrap", background: t.surface2 }}>{col}</th>)}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${t.border}`, background: i % 2 === 0 ? "transparent" : t.surface2 }}>
              {columns.map(col => <td key={col} style={{ padding: "9px 14px", color: t.textSub, whiteSpace: "nowrap" }}>{row[col] === null ? <span style={{ color: t.border2 }}>null</span> : String(row[col])}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ResultCard({ result, onRemove, onCompare, isComparing, t }) {
  const [tab, setTab] = useState(result.chartMeta?.suggestedView === "table" ? "table" : "chart");
  const [showSQL, setShowSQL] = useState(false);

  return (
    <div style={{ background: t.surface, border: `1px solid ${isComparing ? t.accent : t.border}`, borderRadius: 16, padding: 26, marginBottom: 20, animation: "fadeIn 0.4s ease", transition: "border-color 0.2s" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 10, color: t.accent, fontFamily: "'DM Mono',monospace", letterSpacing: 2, textTransform: "uppercase", marginBottom: 5 }}>
            {CHART_ICONS[result.chartMeta?.chartType] || "▬"} {result.chartMeta?.chartType} · {result.data?.length} rows
          </p>
          <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, color: t.text }}>{result.question}</p>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button onClick={() => onCompare(result.id)} style={{ fontSize: 10, padding: "4px 10px", background: isComparing ? t.accent : "transparent", color: isComparing ? "#000" : t.textMuted, border: `1px solid ${isComparing ? t.accent : t.border2}`, borderRadius: 6, cursor: "pointer", fontFamily: "'DM Mono',monospace", letterSpacing: 1, transition: "all 0.15s" }}>
            {isComparing ? "✓ comparing" : "+ compare"}
          </button>
          <button onClick={() => onRemove(result.id)} style={{ background: "none", border: `1px solid ${t.border}`, borderRadius: 6, padding: "4px 9px", color: t.textMuted, cursor: "pointer", fontSize: 12 }}>✕</button>
        </div>
      </div>

      <p style={{ fontSize: 12, color: t.textMuted, fontFamily: "'DM Mono',monospace", marginBottom: 18, lineHeight: 1.6 }}>{result.explanation}</p>

      <KPICards data={result.data} yKey={result.chartMeta?.yKey} xKey={result.chartMeta?.xKey} t={t} />
      <InsightPanel insight={result.insight} loading={result.insightLoading} t={t} />

      <div style={{ display: "flex", gap: 2, marginBottom: 20, background: t.surface2, borderRadius: 8, padding: 3, width: "fit-content" }}>
        {["chart", "table"].map(tb => (
          <button key={tb} onClick={() => setTab(tb)} style={{ padding: "6px 16px", background: tab === tb ? t.surface : "transparent", border: tab === tb ? `1px solid ${t.border2}` : "1px solid transparent", borderRadius: 6, color: tab === tb ? t.text : t.textMuted, cursor: "pointer", fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 1, textTransform: "uppercase", transition: "all 0.15s" }}>
            {tb === "chart" ? `${CHART_ICONS[result.chartMeta?.chartType] || "▬"} Chart` : "⊞ Table"}
          </button>
        ))}
      </div>

      {tab === "chart" ? (
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>{result.chartMeta?.chartTitle}</p>
          <ChartView result={result} t={t} />
        </div>
      ) : (
        <div style={{ marginBottom: 20 }}><TableView columns={result.columns} data={result.data} t={t} /></div>
      )}

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button onClick={() => downloadCSV(result.data, `${result.question.slice(0, 20).replace(/\s+/g, "_")}.csv`)}
          style={{ fontSize: 11, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border2}`, borderRadius: 6, color: t.textMuted, cursor: "pointer", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
          ↓ Export CSV
        </button>
        <button onClick={() => setShowSQL(s => !s)}
          style={{ fontSize: 11, padding: "6px 14px", background: "transparent", border: `1px solid ${t.border2}`, borderRadius: 6, color: t.textMuted, cursor: "pointer", fontFamily: "'DM Mono',monospace", letterSpacing: 1 }}>
          {showSQL ? "Hide SQL" : "{ } SQL"}
        </button>
      </div>

      {showSQL && (
        <pre style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 8, padding: 16, marginTop: 12, fontSize: 12, color: t.accent, fontFamily: "'DM Mono',monospace", overflowX: "auto", whiteSpace: "pre-wrap" }}>
          {result.query}
        </pre>
      )}
    </div>
  );
}

function CompareView({ results, ids, t }) {
  const selected = results.filter(r => ids.includes(r.id));
  if (selected.length < 2) return null;
  return (
    <div style={{ background: t.surface, border: `2px solid ${t.accent}`, borderRadius: 16, padding: 26, marginBottom: 24 }}>
      <p style={{ fontSize: 10, letterSpacing: 3, color: t.accent, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 20 }}>◈ Side-by-Side Comparison</p>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${selected.length},1fr)`, gap: 24 }}>
        {selected.map(r => (
          <div key={r.id}>
            <p style={{ fontFamily: "'Playfair Display',serif", fontSize: 14, color: t.text, marginBottom: 4 }}>{r.question}</p>
            <p style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>{r.chartMeta?.chartTitle}</p>
            <ChartView result={r} t={t} />
            <div style={{ marginTop: 16 }}><KPICards data={r.data} yKey={r.chartMeta?.yKey} xKey={r.chartMeta?.xKey} t={t} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const t = themes[isDark ? "dark" : "light"];
  const [step, setStep] = useState("connect");
  const [dbConfig, setDbConfig] = useState({ host: "localhost", port: "3306", user: "root", password: "", database: "" });
  const [schema, setSchema] = useState("");
  const [tables, setTables] = useState([]);
  const [connecting, setConnecting] = useState(false);
  const [connError, setConnError] = useState("");
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [askError, setAskError] = useState("");
  const [compareIds, setCompareIds] = useState([]);
  const inputRef = useRef(null);

  const SUGGESTIONS = [
    "Show monthly revenue trend this year",
    "Top 10 customers by total spend",
    "Orders by status breakdown",
    "Products with lowest stock",
    "Revenue by category",
  ];

  const handleConnect = async () => {
    setConnecting(true); setConnError("");
    try {
      const r1 = await fetch(`${API_BASE}/connect`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dbConfig) });
      const d1 = await r1.json();
      if (!d1.ok) { setConnError(d1.error); return; }
      setTables(d1.tables);
      const r2 = await fetch(`${API_BASE}/schema`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(dbConfig) });
      const d2 = await r2.json();
      if (!d2.ok) { setConnError(d2.error); return; }
      setSchema(d2.schema);
      setStep("analyst");
    } catch { setConnError("Cannot reach backend. Is the server running on port 3001?"); }
    finally { setConnecting(false); }
  };

  const generateInsight = async (id, question, data, chartMeta) => {
    setResults(prev => prev.map(r => r.id === id ? { ...r, insightLoading: true } : r));
    try {
      const res = await fetch(`${API_BASE}/insight`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, data: JSON.stringify(data.slice(0, 15)), chartMeta }),
      });
      const d = await res.json();
      setResults(prev => prev.map(r => r.id === id ? { ...r, insight: d.insight, insightLoading: false } : r));
    } catch {
      setResults(prev => prev.map(r => r.id === id ? { ...r, insightLoading: false } : r));
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true); setAskError("");
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dbConfig, question, schema }),
      });
      const d = await res.json();
      if (!d.ok) { setAskError(d.error + (d.query ? `\n\nSQL:\n${d.query}` : "")); return; }
      const id = Date.now();
      setResults(prev => [{ id, question, ...d, insight: null, insightLoading: false }, ...prev]);
      setQuestion("");
      generateInsight(id, question, d.data, d.chartMeta);
    } catch (err) { setAskError("Request failed: " + err.message); }
    finally { setLoading(false); }
  };

  const removeResult = useCallback(id => { setResults(prev => prev.filter(r => r.id !== id)); setCompareIds(prev => prev.filter(i => i !== id)); }, []);
  const toggleCompare = useCallback(id => setCompareIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(-3)), []);

  const inp = { width: "100%", background: t.surface2, border: `1px solid ${t.border2}`, borderRadius: 8, padding: "10px 14px", color: t.text, fontSize: 14, fontFamily: "'DM Mono',monospace", outline: "none" };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
    ::-webkit-scrollbar{width:4px;height:4px} ::-webkit-scrollbar-thumb{background:#333;border-radius:2px}
    input:focus,textarea:focus{outline:none;border-color:#f97316!important}
  `;

  if (step === "connect") return (
    <div style={{ minHeight: "100vh", background: t.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <style>{css}</style>
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
          <button onClick={() => setIsDark(d => !d)} style={{ fontSize: 11, padding: "6px 14px", background: t.surface, border: `1px solid ${t.border2}`, borderRadius: 20, color: t.textMuted, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
            {isDark ? "☀ Light mode" : "◑ Dark mode"}
          </button>
        </div>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 11, letterSpacing: 6, color: t.accent, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 14 }}>◈ AI Data Analyst</div>
          <h1 style={{ fontFamily: "'Playfair Display',serif", fontSize: 38, fontWeight: 700, color: t.text, lineHeight: 1.1 }}>Connect your<br /><span style={{ color: t.accent }}>MySQL</span> database</h1>
          <p style={{ color: t.textMuted, marginTop: 12, fontSize: 13, fontFamily: "'DM Mono',monospace" }}>Ask questions · get charts · uncover insights</p>
        </div>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: 32 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
            {[
              { label: "Host", key: "host", placeholder: "localhost", span: true },
              { label: "Port", key: "port", placeholder: "3306" },
              { label: "Username", key: "user", placeholder: "root" },
              { label: "Password", key: "password", placeholder: "••••••••", type: "password", span: true },
              { label: "Database", key: "database", placeholder: "my_database", span: true },
            ].map(({ label, key, placeholder, type, span }) => (
              <div key={key} style={{ gridColumn: span ? "1/-1" : "auto" }}>
                <label style={{ display: "block", fontSize: 10, letterSpacing: 2, color: t.textMuted, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 6 }}>{label}</label>
                <input type={type || "text"} value={dbConfig[key]} onChange={e => setDbConfig(p => ({ ...p, [key]: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleConnect()} placeholder={placeholder} style={inp} />
              </div>
            ))}
          </div>
          {connError && <div style={{ background: t.errorBg, border: `1px solid ${t.errorBorder}`, borderRadius: 8, padding: "10px 14px", marginBottom: 14, color: t.error, fontSize: 12, fontFamily: "'DM Mono',monospace" }}>{connError}</div>}
          <button onClick={handleConnect} disabled={connecting} style={{ width: "100%", padding: 13, background: connecting ? t.border2 : t.accent, color: "#000", border: "none", borderRadius: 9, fontFamily: "'DM Mono',monospace", fontSize: 12, fontWeight: 500, letterSpacing: 2, textTransform: "uppercase", cursor: connecting ? "not-allowed" : "pointer" }}>
            {connecting ? "Connecting…" : "Connect →"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: t.bg, color: t.text, transition: "background 0.3s" }}>
      <style>{css}</style>
      <div style={{ borderBottom: `1px solid ${t.border}`, padding: "14px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, background: t.bg, zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, letterSpacing: 4, color: t.accent, textTransform: "uppercase", fontFamily: "'DM Mono',monospace" }}>◈ Data Analyst</span>
          <span style={{ fontSize: 11, color: t.border2 }}>|</span>
          <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{tables.length} tables</span>
          {compareIds.length >= 2 && <span style={{ fontSize: 11, background: t.accentBg, border: `1px solid ${t.accent}`, color: t.accent, borderRadius: 20, padding: "3px 10px", fontFamily: "'DM Mono',monospace" }}>{compareIds.length} selected for comparison</span>}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button onClick={() => setIsDark(d => !d)} style={{ fontSize: 11, padding: "5px 12px", background: "transparent", border: `1px solid ${t.border2}`, borderRadius: 20, color: t.textMuted, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>
            {isDark ? "☀ Light" : "◑ Dark"}
          </button>
          <div style={{ width: 7, height: 7, borderRadius: "50%", background: t.success }} />
          <span style={{ fontSize: 11, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>{dbConfig.database}@{dbConfig.host}</span>
          <button onClick={() => { setStep("connect"); setResults([]); setSchema(""); setCompareIds([]); }} style={{ fontSize: 10, color: t.textMuted, background: "none", border: `1px solid ${t.border}`, borderRadius: 4, padding: "3px 8px", cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>disconnect</button>
        </div>
      </div>

      <div style={{ maxWidth: 980, margin: "0 auto", padding: "28px 20px" }}>
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 16, padding: 24, marginBottom: 22 }}>
          <label style={{ display: "block", fontSize: 10, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>Ask about your data</label>
          <textarea ref={inputRef} value={question} onChange={e => setQuestion(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAsk(); } }}
            placeholder="e.g. Show total revenue by month, which customers spent the most?"
            rows={2} style={{ width: "100%", background: "transparent", border: "none", color: t.text, fontSize: 17, fontFamily: "'Playfair Display',serif", resize: "none", lineHeight: 1.6, outline: "none" }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${t.border}` }}>
            <span style={{ fontSize: 10, color: t.textMuted, fontFamily: "'DM Mono',monospace" }}>↵ send · shift+↵ newline</span>
            <button onClick={handleAsk} disabled={loading || !question.trim()} style={{ padding: "9px 24px", background: loading ? t.border2 : t.accent, color: loading ? t.textMuted : "#000", border: "none", borderRadius: 8, fontFamily: "'DM Mono',monospace", fontSize: 11, letterSpacing: 2, textTransform: "uppercase", cursor: loading ? "not-allowed" : "pointer" }}>
              {loading ? "Analyzing…" : "Analyze →"}
            </button>
          </div>
        </div>

        {results.length === 0 && (
          <>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 10, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 10 }}>Try asking</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUGGESTIONS.map(q => (
                  <button key={q} onClick={() => { setQuestion(q); inputRef.current?.focus(); }} style={{ fontSize: 12, padding: "7px 15px", background: t.tag, border: `1px solid ${t.tagBorder}`, borderRadius: 20, color: t.tagText, cursor: "pointer", fontFamily: "'DM Mono',monospace" }}>{q}</button>
                ))}
              </div>
            </div>
            {tables.length > 0 && (
              <div style={{ background: t.surface2, border: `1px solid ${t.border}`, borderRadius: 12, padding: 20, marginBottom: 24 }}>
                <p style={{ fontSize: 10, letterSpacing: 3, color: t.textMuted, textTransform: "uppercase", fontFamily: "'DM Mono',monospace", marginBottom: 12 }}>Detected tables</p>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {tables.map(tb => <span key={tb} style={{ fontSize: 12, padding: "4px 10px", background: t.tag, border: `1px solid ${t.tagBorder}`, borderRadius: 6, color: t.tagText, fontFamily: "'DM Mono',monospace" }}>{tb}</span>)}
                </div>
              </div>
            )}
          </>
        )}

        {askError && <div style={{ background: t.errorBg, border: `1px solid ${t.errorBorder}`, borderRadius: 10, padding: "14px 18px", marginBottom: 20, color: t.error, fontSize: 12, fontFamily: "'DM Mono',monospace", whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{askError}</div>}

        {compareIds.length >= 2 && <CompareView results={results} ids={compareIds} t={t} />}

        {results.map(r => <ResultCard key={r.id} result={r} onRemove={removeResult} onCompare={toggleCompare} isComparing={compareIds.includes(r.id)} t={t} />)}
      </div>
    </div>
  );
}
