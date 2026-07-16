import React, { useState, useEffect, useMemo } from "react";
import { Plus, TrendingUp, TrendingDown, Trash2, X, Flame, Eye, LayoutDashboard, BookOpen, Star } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { storage } from "./storage";

// ---- Palette (token system) ----
const C = {
  ink: "#0E1420",       // background
  surface: "#161F30",   // cards
  surfaceAlt: "#1E2A40",
  hair: "#2A3650",       // hairline borders
  gold: "#C9A227",       // signature accent
  goldSoft: "#8A752A",
  parchment: "#EDE6D6",  // primary text
  muted: "#8C96AC",      // secondary text
  sage: "#5FAE9B",       // gains
  clay: "#C06B54",       // losses
};

const DISPLAY_FONT = "'Fraunces', Georgia, serif";
const BODY_FONT = "'IBM Plex Sans', system-ui, sans-serif";
const MONO_FONT = "'IBM Plex Mono', monospace";

function loadFonts() {
  if (document.getElementById("tj-fonts")) return;
  const link = document.createElement("link");
  link.id = "tj-fonts";
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap";
  document.head.appendChild(link);
}

const uid = () => Math.random().toString(36).slice(2, 10);
const todayISO = () => new Date().toISOString().slice(0, 10);
const fmt = (n) => (n >= 0 ? "+" : "") + n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });

export default function TradeJournal() {
  const [view, setView] = useState("dashboard");
  const [trades, setTrades] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTradeForm, setShowTradeForm] = useState(false);
  const [showWatchForm, setShowWatchForm] = useState(false);
  const [editingTrade, setEditingTrade] = useState(null);
  const [toast, setToast] = useState(null);
  const [errorBanner, setErrorBanner] = useState(null);

  const notify = (msg) => {
    setToast(msg);
    window.clearTimeout(notify._t);
    notify._t = window.setTimeout(() => setToast(null), 2600);
  };

  useEffect(() => {
    loadFonts();
    (async () => {
      try {
        const t = await storage.get("trades");
        setTrades(t ? JSON.parse(t.value) : []);
      } catch { setTrades([]); }
      try {
        const w = await storage.get("watchlist");
        setWatchlist(w ? JSON.parse(w.value) : []);
      } catch { setWatchlist([]); }
      setLoading(false);
    })();
  }, []);

  const persistTrades = async (next) => {
    setTrades(next);
    try {
      const res = await storage.set("trades", JSON.stringify(next));
      if (!res) setErrorBanner("La sauvegarde a échoué. Réessaie dans un instant.");
    } catch {
      setErrorBanner("La sauvegarde a échoué. Vérifie ta connexion et réessaie.");
    }
  };
  const persistWatchlist = async (next) => {
    setWatchlist(next);
    try {
      const res = await storage.set("watchlist", JSON.stringify(next));
      if (!res) setErrorBanner("La sauvegarde a échoué. Réessaie dans un instant.");
    } catch {
      setErrorBanner("La sauvegarde a échoué. Vérifie ta connexion et réessaie.");
    }
  };

  const addTrade = (trade) => {
    const next = [{ ...trade, id: uid() }, ...trades];
    persistTrades(next);
    setShowTradeForm(false);
    notify("Trade enregistré");
  };
  const updateTrade = (trade) => {
    persistTrades(trades.map((t) => (t.id === trade.id ? trade : t)));
    setEditingTrade(null);
    notify("Trade modifié");
  };
  const deleteTrade = (id) => {
    persistTrades(trades.filter((t) => t.id !== id));
    notify("Trade supprimé");
  };

  const addWatch = (item) => {
    persistWatchlist([{ ...item, id: uid() }, ...watchlist]);
    setShowWatchForm(false);
    notify("Ajouté à la liste de suivi");
  };
  const deleteWatch = (id) => {
    persistWatchlist(watchlist.filter((w) => w.id !== id));
    notify("Retiré de la liste de suivi");
  };

  // ---- Derived stats ----
  const stats = useMemo(() => {
    const total = trades.reduce((s, t) => s + Number(t.pnl || 0), 0);
    const wins = trades.filter((t) => Number(t.pnl) > 0).length;
    const winRate = trades.length ? (wins / trades.length) * 100 : 0;
    const thisMonth = trades.filter((t) => t.date?.slice(0, 7) === todayISO().slice(0, 7)).length;

    // streak: consecutive days (from today backwards) with at least one journal entry
    const days = new Set(trades.map((t) => t.date));
    let streak = 0;
    let cursor = new Date();
    while (true) {
      const iso = cursor.toISOString().slice(0, 10);
      if (days.has(iso)) {
        streak += 1;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    }

    // cumulative curve sorted by date
    const sorted = [...trades].sort((a, b) => (a.date > b.date ? 1 : -1));
    let running = 0;
    const curve = sorted.map((t) => {
      running += Number(t.pnl || 0);
      return { date: t.date, value: running };
    });

    const winsArr = trades.filter((t) => Number(t.pnl) > 0).map((t) => Number(t.pnl));
    const lossesArr = trades.filter((t) => Number(t.pnl) < 0).map((t) => Number(t.pnl));
    const avgWin = winsArr.length ? winsArr.reduce((a, b) => a + b, 0) / winsArr.length : 0;
    const avgLoss = lossesArr.length ? lossesArr.reduce((a, b) => a + b, 0) / lossesArr.length : 0;
    const best = trades.reduce((m, t) => (Number(t.pnl) > (m ? Number(m.pnl) : -Infinity) ? t : m), null);
    const worst = trades.reduce((m, t) => (Number(t.pnl) < (m ? Number(m.pnl) : Infinity) ? t : m), null);

    const weekdayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
    const byWeekday = {};
    trades.forEach((t) => {
      if (!t.date) return;
      const d = new Date(t.date + "T00:00:00");
      const key = d.getDay();
      byWeekday[key] = (byWeekday[key] || 0) + Number(t.pnl || 0);
    });
    let bestWeekday = null;
    Object.entries(byWeekday).forEach(([k, v]) => {
      if (!bestWeekday || v > bestWeekday.value) bestWeekday = { day: weekdayNames[k], value: v };
    });

    return { total, winRate, thisMonth, streak, curve, avgWin, avgLoss, best, worst, bestWeekday };
  }, [trades]);

  // last 30 days heatmap data
  const heatDays = useMemo(() => {
    const map = {};
    trades.forEach((t) => {
      map[t.date] = (map[t.date] || 0) + Number(t.pnl || 0);
    });
    const arr = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      arr.push({ date: iso, pnl: map[iso] ?? null });
    }
    return arr;
  }, [trades]);

  if (loading) {
    return (
      <div style={{ background: C.ink, color: C.muted, fontFamily: BODY_FONT }} className="min-h-screen flex items-center justify-center text-sm">
        Chargement du journal…
      </div>
    );
  }

  return (
    <div style={{ background: C.ink, color: C.parchment, fontFamily: BODY_FONT, minHeight: "100vh" }}>
      <style>{`
        ::selection { background: ${C.gold}55; }
        .tj-focus:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }
      `}</style>

      {errorBanner && (
        <div style={{ background: `${C.clay}22`, borderBottom: `1px solid ${C.clay}` }} className="px-5 sm:px-8 py-2.5 flex items-center justify-between text-sm">
          <span style={{ color: C.clay }}>{errorBanner}</span>
          <button onClick={() => setErrorBanner(null)} aria-label="Fermer l'alerte" className="tj-focus" style={{ color: C.clay }}>
            <X size={14} />
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          style={{ background: C.gold, color: C.ink }}
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-full text-sm font-medium shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Header */}
      <header style={{ borderBottom: `1px solid ${C.hair}` }} className="px-5 sm:px-8 py-5 flex items-center justify-between">
        <div>
          <p style={{ fontFamily: MONO_FONT, color: C.gold, letterSpacing: "0.15em" }} className="text-[11px] uppercase mb-1">Discipline &amp; suivi</p>
          <h1 style={{ fontFamily: DISPLAY_FONT, fontWeight: 600 }} className="text-2xl sm:text-3xl">Journal de Trading</h1>
        </div>
        <div className="flex items-center gap-2" style={{ color: C.gold }}>
          <Flame size={18} />
          <span style={{ fontFamily: MONO_FONT }} className="text-lg">{stats.streak}</span>
          <span style={{ color: C.muted }} className="text-xs hidden sm:inline">jours de suite</span>
        </div>
      </header>

      {/* Nav */}
      <nav className="px-5 sm:px-8 pt-4 flex gap-1">
        {[
          { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard },
          { id: "journal", label: "Journal", icon: BookOpen },
          { id: "watchlist", label: "Liste de suivi", icon: Star },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setView(id)}
            aria-current={view === id ? "page" : undefined}
            className="tj-focus flex items-center gap-2 px-4 py-2 text-sm rounded-t-lg transition-colors"
            style={{
              background: view === id ? C.surface : "transparent",
              color: view === id ? C.parchment : C.muted,
              borderBottom: view === id ? `2px solid ${C.gold}` : "2px solid transparent",
            }}
          >
            <Icon size={15} /> {label}
          </button>
        ))}
      </nav>

      <main style={{ background: C.surface }} className="px-5 sm:px-8 py-6 sm:py-8 min-h-[70vh]">
        {view === "dashboard" && (
          <Dashboard stats={stats} heatDays={heatDays} trades={trades} />
        )}
        {view === "journal" && (
          <Journal
            trades={trades}
            onAdd={() => setShowTradeForm(true)}
            onEdit={(t) => setEditingTrade(t)}
            onDelete={deleteTrade}
          />
        )}
        {view === "watchlist" && (
          <Watchlist
            items={watchlist}
            onAdd={() => setShowWatchForm(true)}
            onDelete={deleteWatch}
          />
        )}
      </main>

      {showTradeForm && (
        <TradeForm onClose={() => setShowTradeForm(false)} onSubmit={addTrade} />
      )}
      {editingTrade && (
        <TradeForm
          initial={editingTrade}
          title="Modifier le trade"
          onClose={() => setEditingTrade(null)}
          onSubmit={updateTrade}
        />
      )}
      {showWatchForm && (
        <WatchForm onClose={() => setShowWatchForm(false)} onSubmit={addWatch} />
      )}
    </div>
  );
}

// ---------------- Dashboard ----------------
function StatCard({ label, value, accent, mono = true }) {
  return (
    <div style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }} className="rounded-xl p-4 sm:p-5">
      <p style={{ color: C.muted }} className="text-xs uppercase tracking-wide mb-2">{label}</p>
      <p style={{ fontFamily: mono ? MONO_FONT : BODY_FONT, color: accent || C.parchment }} className="text-2xl sm:text-3xl font-medium">
        {value}
      </p>
    </div>
  );
}

function Dashboard({ stats, heatDays, trades }) {
  const pnlColor = stats.total >= 0 ? C.sage : C.clay;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard label="Solde cumulé" value={fmt(stats.total)} accent={pnlColor} />
        <StatCard label="Taux de réussite" value={`${stats.winRate.toFixed(0)}%`} accent={C.gold} />
        <StatCard label="Trades ce mois" value={stats.thisMonth} />
        <StatCard label="Série actuelle" value={`${stats.streak} j.`} accent={C.gold} />
      </div>

      {/* Signature element: discipline heatmap */}
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }} className="rounded-xl p-4 sm:p-5">
        <p style={{ fontFamily: DISPLAY_FONT }} className="text-lg mb-1">Constance sur 30 jours</p>
        <p style={{ color: C.muted }} className="text-xs mb-4">Chaque case représente un jour. La couleur indique le résultat net du jour.</p>
        <div className="grid grid-cols-10 sm:grid-cols-15 gap-1.5" style={{ gridTemplateColumns: "repeat(10, minmax(0,1fr))" }}>
          {heatDays.map((d) => {
            let bg = C.hair;
            if (d.pnl !== null) bg = d.pnl >= 0 ? C.sage : C.clay;
            return (
              <div
                key={d.date}
                title={`${d.date}${d.pnl !== null ? ` · ${fmt(d.pnl)}` : " · pas d'entrée"}`}
                style={{ background: bg, opacity: d.pnl === null ? 0.35 : 1 }}
                className="aspect-square rounded-[3px]"
              />
            );
          })}
        </div>
      </div>

      {trades.length > 0 && (
        <div style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }} className="rounded-xl p-4 sm:p-5">
          <p style={{ fontFamily: DISPLAY_FONT }} className="text-lg mb-4">Analyse détaillée</p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            <div>
              <p style={{ color: C.muted }} className="text-xs mb-1">Gain moyen</p>
              <p style={{ fontFamily: MONO_FONT, color: C.sage }}>{fmt(stats.avgWin)}</p>
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-xs mb-1">Perte moyenne</p>
              <p style={{ fontFamily: MONO_FONT, color: C.clay }}>{fmt(stats.avgLoss)}</p>
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-xs mb-1">Meilleur trade</p>
              <p style={{ fontFamily: MONO_FONT, color: C.sage }}>
                {stats.best ? `${fmt(Number(stats.best.pnl))} · ${stats.best.symbol}` : "—"}
              </p>
            </div>
            <div>
              <p style={{ color: C.muted }} className="text-xs mb-1">Pire trade</p>
              <p style={{ fontFamily: MONO_FONT, color: C.clay }}>
                {stats.worst ? `${fmt(Number(stats.worst.pnl))} · ${stats.worst.symbol}` : "—"}
              </p>
            </div>
          </div>
          {stats.bestWeekday && (
            <p style={{ color: C.muted }} className="text-xs mt-4">
              Ton jour le plus rentable : <span style={{ color: C.gold }}>{stats.bestWeekday.day}</span> ({fmt(stats.bestWeekday.value)} au total)
            </p>
          )}
        </div>
      )}

      {/* Curve */}
      <div style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }} className="rounded-xl p-4 sm:p-5">
        <p style={{ fontFamily: DISPLAY_FONT }} className="text-lg mb-4">Courbe de performance</p>
        {stats.curve.length === 0 ? (
          <EmptyState text="Ajoute ton premier trade dans le Journal pour voir ta courbe apparaître ici." />
        ) : (
          <div style={{ width: "100%", height: 220 }}>
            <ResponsiveContainer>
              <LineChart data={stats.curve}>
                <CartesianGrid stroke={C.hair} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" stroke={C.muted} fontSize={11} tickLine={false} axisLine={{ stroke: C.hair }} />
                <YAxis stroke={C.muted} fontSize={11} tickLine={false} axisLine={{ stroke: C.hair }} width={50} />
                <Tooltip
                  contentStyle={{ background: C.ink, border: `1px solid ${C.hair}`, borderRadius: 8, fontFamily: MONO_FONT, fontSize: 12 }}
                  labelStyle={{ color: C.muted }}
                />
                <Line type="monotone" dataKey="value" stroke={C.gold} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ text }) {
  return (
    <div style={{ color: C.muted, border: `1px dashed ${C.hair}` }} className="rounded-lg py-10 text-center text-sm px-6">
      {text}
    </div>
  );
}

// ---------------- Journal ----------------
function exportCSV(trades) {
  const header = "date,symbole,sens,resultat,notes";
  const rows = trades.map((t) =>
    [t.date, t.symbol, t.direction === "long" ? "Achat" : "Vente", t.pnl, (t.notes || "").replace(/,/g, ";").replace(/\n/g, " ")].join(",")
  );
  const csv = [header, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `journal-trading-${todayISO()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function Journal({ trades, onAdd, onEdit, onDelete }) {
  const [search, setSearch] = useState("");
  const [month, setMonth] = useState("all");
  const [result, setResult] = useState("all");
  const [confirmId, setConfirmId] = useState(null);

  const months = useMemo(() => {
    const set = new Set(trades.map((t) => t.date?.slice(0, 7)).filter(Boolean));
    return Array.from(set).sort().reverse();
  }, [trades]);

  const filtered = trades.filter((t) => {
    if (search && !t.symbol.toLowerCase().includes(search.toLowerCase())) return false;
    if (month !== "all" && t.date?.slice(0, 7) !== month) return false;
    if (result === "win" && Number(t.pnl) <= 0) return false;
    if (result === "loss" && Number(t.pnl) > 0) return false;
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p style={{ fontFamily: DISPLAY_FONT }} className="text-xl">Historique des trades</p>
        <div className="flex items-center gap-2">
          {trades.length > 0 && (
            <button
              onClick={() => exportCSV(filtered)}
              className="tj-focus px-3 py-2 rounded-lg text-xs font-medium"
              style={{ background: "transparent", color: C.muted, border: `1px solid ${C.hair}` }}
            >
              Exporter en CSV
            </button>
          )}
          <button
            onClick={onAdd}
            className="tj-focus flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
            style={{ background: C.gold, color: C.ink }}
          >
            <Plus size={16} /> Nouveau trade
          </button>
        </div>
      </div>

      {trades.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrer par actif…"
            style={{ ...inputStyle, width: "auto", flex: "1 1 160px" }}
            className="tj-focus"
          />
          <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ ...inputStyle, width: "auto" }} className="tj-focus">
            <option value="all">Tous les mois</option>
            {months.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
          <select value={result} onChange={(e) => setResult(e.target.value)} style={{ ...inputStyle, width: "auto" }} className="tj-focus">
            <option value="all">Tous les résultats</option>
            <option value="win">Gagnants</option>
            <option value="loss">Perdants</option>
          </select>
        </div>
      )}

      {trades.length === 0 ? (
        <EmptyState text="Aucun trade enregistré. Chaque entrée nourrit ta série de constance et ta courbe de performance." />
      ) : filtered.length === 0 ? (
        <EmptyState text="Aucun trade ne correspond à ces filtres." />
      ) : (
        <div className="space-y-2">
          {filtered.map((t) => {
            const positive = Number(t.pnl) >= 0;
            return (
              <div
                key={t.id}
                style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }}
                className="rounded-lg p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    style={{ background: positive ? `${C.sage}22` : `${C.clay}22`, color: positive ? C.sage : C.clay }}
                    className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                  >
                    {positive ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.symbol} · {t.direction === "long" ? "Achat" : "Vente"}</p>
                    <p style={{ color: C.muted }} className="text-xs truncate">{t.date}{t.notes ? ` · ${t.notes}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span style={{ fontFamily: MONO_FONT, color: positive ? C.sage : C.clay }} className="text-sm">
                    {fmt(Number(t.pnl))}
                  </span>
                  {confirmId === t.id ? (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => { onDelete(t.id); setConfirmId(null); }}
                        className="tj-focus text-xs px-2 py-1 rounded"
                        style={{ background: C.clay, color: C.ink }}
                      >
                        Confirmer
                      </button>
                      <button onClick={() => setConfirmId(null)} className="tj-focus text-xs px-2 py-1 rounded" style={{ color: C.muted, border: `1px solid ${C.hair}` }}>
                        Annuler
                      </button>
                    </div>
                  ) : (
                    <>
                      <button onClick={() => onEdit(t)} className="tj-focus text-xs" style={{ color: C.muted }}>
                        Modifier
                      </button>
                      <button onClick={() => setConfirmId(t.id)} aria-label={`Supprimer le trade ${t.symbol}`} className="tj-focus" style={{ color: C.muted }}>
                        <Trash2 size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TradeForm({ onClose, onSubmit, initial, title }) {
  const [form, setForm] = useState(
    initial
      ? { ...initial, pnl: String(initial.pnl) }
      : { symbol: "", direction: "long", date: todayISO(), pnl: "", notes: "" }
  );
  const [error, setError] = useState("");
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Modal onClose={onClose} title={title || "Nouveau trade"}>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const symbol = form.symbol.trim();
          if (!symbol) { setError("Indique un symbole ou un actif."); return; }
          if (form.pnl === "" || Number.isNaN(Number(form.pnl))) { setError("Indique un résultat numérique valide."); return; }
          if (!form.date) { setError("Indique une date."); return; }
          setError("");
          onSubmit({ ...form, symbol, pnl: Number(form.pnl) });
        }}
      >
        {error && (
          <p style={{ color: C.clay }} className="text-xs -mt-1">{error}</p>
        )}
        <Field label="Symbole / actif">
          <input value={form.symbol} onChange={set("symbol")} placeholder="EUR/USD, XAU/USD, AAPL…" style={inputStyle} className="tj-focus" required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Sens">
            <select value={form.direction} onChange={set("direction")} style={inputStyle} className="tj-focus">
              <option value="long">Achat (long)</option>
              <option value="short">Vente (short)</option>
            </select>
          </Field>
          <Field label="Date">
            <input type="date" value={form.date} onChange={set("date")} style={inputStyle} className="tj-focus" required />
          </Field>
        </div>
        <Field label="Résultat net (dans ta devise)">
          <input type="number" step="0.01" value={form.pnl} onChange={set("pnl")} placeholder="ex : 45.50 ou -20" style={inputStyle} className="tj-focus" required />
        </Field>
        <Field label="Notes (raison d'entrée, émotion, leçon…)">
          <textarea value={form.notes} onChange={set("notes")} rows={3} style={{ ...inputStyle, resize: "vertical" }} className="tj-focus" />
        </Field>
        <button type="submit" className="tj-focus w-full py-2.5 rounded-lg text-sm font-medium" style={{ background: C.gold, color: C.ink }}>
          {initial ? "Enregistrer les modifications" : "Enregistrer le trade"}
        </button>
      </form>
    </Modal>
  );
}

// ---------------- Watchlist ----------------
function Watchlist({ items, onAdd, onDelete }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p style={{ fontFamily: DISPLAY_FONT }} className="text-xl">Actifs à surveiller</p>
        <button
          onClick={onAdd}
          className="tj-focus flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
          style={{ background: C.gold, color: C.ink }}
        >
          <Plus size={16} /> Ajouter
        </button>
      </div>
      {items.length === 0 ? (
        <EmptyState text="Ta liste de suivi est vide. Ajoute les actifs que tu observes avant d'entrer en position." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {items.map((w) => (
            <div key={w.id} style={{ background: C.surfaceAlt, border: `1px solid ${C.hair}` }} className="rounded-lg p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Eye size={14} style={{ color: C.gold }} />
                  <p className="text-sm font-medium">{w.symbol}</p>
                </div>
                <button onClick={() => onDelete(w.id)} aria-label={`Retirer ${w.symbol} de la liste de suivi`} className="tj-focus" style={{ color: C.muted }}>
                  <X size={14} />
                </button>
              </div>
              {w.target && (
                <p style={{ fontFamily: MONO_FONT, color: C.muted }} className="text-xs">Cible : {w.target}</p>
              )}
              {w.notes && <p style={{ color: C.muted }} className="text-xs mt-1">{w.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WatchForm({ onClose, onSubmit }) {
  const [form, setForm] = useState({ symbol: "", target: "", notes: "" });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  return (
    <Modal onClose={onClose} title="Ajouter à la liste de suivi">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!form.symbol) return;
          onSubmit(form);
        }}
      >
        <Field label="Symbole / actif">
          <input value={form.symbol} onChange={set("symbol")} placeholder="GBP/JPY, BTC/USD…" style={inputStyle} className="tj-focus" required />
        </Field>
        <Field label="Niveau cible (optionnel)">
          <input value={form.target} onChange={set("target")} placeholder="ex : 1.2650" style={inputStyle} className="tj-focus" />
        </Field>
        <Field label="Pourquoi cet actif ?">
          <textarea value={form.notes} onChange={set("notes")} rows={2} style={{ ...inputStyle, resize: "vertical" }} className="tj-focus" />
        </Field>
        <button type="submit" className="tj-focus w-full py-2.5 rounded-lg text-sm font-medium" style={{ background: C.gold, color: C.ink }}>
          Ajouter à la liste
        </button>
      </form>
    </Modal>
  );
}

// ---------------- Shared UI ----------------
const inputStyle = {
  width: "100%",
  background: C.ink,
  border: `1px solid ${C.hair}`,
  color: C.parchment,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: BODY_FONT,
};

function Field({ label, children }) {
  return (
    <label className="block">
      <span style={{ color: C.muted }} className="text-xs mb-1.5 block">{label}</span>
      {children}
    </label>
  );
}

function Modal({ title, onClose, children }) {
  const dialogRef = React.useRef(null);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    // move focus into the dialog for keyboard users
    const t = window.setTimeout(() => {
      const first = dialogRef.current?.querySelector("input, textarea, select, button");
      first?.focus();
    }, 0);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.clearTimeout(t);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: "#00000099" }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{ background: C.surface, border: `1px solid ${C.hair}` }}
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 sm:p-6 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <p style={{ fontFamily: DISPLAY_FONT }} className="text-lg">{title}</p>
          <button onClick={onClose} aria-label="Fermer" className="tj-focus" style={{ color: C.muted }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
