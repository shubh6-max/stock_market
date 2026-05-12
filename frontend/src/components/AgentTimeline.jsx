export default function AgentTimeline({ steps, times }) {
  return (
    <div className="timeline">
      {steps.map((s) => {
        const startedAt = times?.[s.key];
        const endedAt = times?.[s.key + "_end"];
        let timeLabel = "";
        if (endedAt && startedAt) timeLabel = `${((endedAt - startedAt) / 1000).toFixed(1)}s`;
        else if (s.status === "active" && startedAt) timeLabel = "running…";
        return (
          <div key={s.key} className={`step ${s.status}`}>
            <span className="dot" />
            <span className="label">{s.label}</span>
            {timeLabel && <span className="time">{timeLabel}</span>}
          </div>
        );
      })}
    </div>
  );
}
