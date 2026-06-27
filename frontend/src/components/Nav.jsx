const TABS = [
  { key: "analyzer", label: "Analyzer", detail: "Decision desk" },
  { key: "journal", label: "Journal", detail: "Execution log" },
  { key: "performance", label: "Performance", detail: "Learning loop" },
];

export default function Nav({ tab, setTab }) {
  return (
    <div className="nav-tabs">
      {TABS.map((item) => (
        <button
          key={item.key}
          className={`nav-tab ${tab === item.key ? "active" : ""}`}
          onClick={() => setTab(item.key)}
        >
          <span className="nav-tab-copy">
            <span className="nav-tab-label">{item.label}</span>
            <span className="nav-tab-detail">{item.detail}</span>
          </span>
        </button>
      ))}
    </div>
  );
}
