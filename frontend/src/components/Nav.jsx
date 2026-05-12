const TABS = [
  { key: "analyzer", label: "Trade Analyzer", icon: "⚡" },
  { key: "journal", label: "Trade Journal", icon: "📓" },
  { key: "performance", label: "Performance & Learning", icon: "📊" },
];

export default function Nav({ tab, setTab }) {
  return (
    <div className="nav-tabs">
      {TABS.map((t) => (
        <button
          key={t.key}
          className={`nav-tab ${tab === t.key ? "active" : ""}`}
          onClick={() => setTab(t.key)}
        >
          <span className="ico">{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
}
