export default function AgentTimeline({ steps, times }) {
  return (
    <div className="timeline">
      {steps.map((step) => {
        const startedAt = times?.[step.key];
        const endedAt = times?.[`${step.key}_end`];
        let timeLabel = "";

        if (endedAt && startedAt) timeLabel = `${((endedAt - startedAt) / 1000).toFixed(1)}s`;
        else if (step.status === "active" && startedAt) timeLabel = "running...";

        return (
          <div key={step.key} className={`step ${step.status}`}>
            <span className="dot" />
            <span className="label">{step.label}</span>
            {timeLabel && <span className="time">{timeLabel}</span>}
          </div>
        );
      })}
    </div>
  );
}
