import MiniLineChart from "./MiniLineChart.jsx";

export default function IntradayCharts() {
  return (
    <section className="chart-grid-two">
      <MiniLineChart title="NIFTY 15-minute structure" instrument="NSE:NIFTY 50" interval="15minute" days={7} />
      <MiniLineChart title="BANKNIFTY 15-minute structure" instrument="NSE:NIFTY BANK" interval="15minute" days={7} />
    </section>
  );
}
