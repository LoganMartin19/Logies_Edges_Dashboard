import React, { useEffect, useState } from "react";

const WhySection = ({ fixtureId, market = "O2.5" }) => {
  const [explain, setExplain] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // clear old data immediately so we don't show stale numbers
    setExplain(null);
    setError(null);

    const controller = new AbortController();
    const ts = Date.now(); // cache-buster
    const url = `http://127.0.0.1:8000/explain/probability?fixture_id=${fixtureId}&market=${encodeURIComponent(
      market
    )}&_ts=${ts}`;

    fetch(url, { signal: controller.signal, cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(setExplain)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });

    return () => controller.abort();
  }, [fixtureId, market]); // rerun whenever fixture or market changes

  if (error) return <div className="card">Why? <small>({error})</small></div>;
  if (!explain) return <div className="card">Why? <small>loading…</small></div>;

  const eg = explain.form?.expected_goals;
  const egLine = eg
    ? `${eg.home.toFixed(2)} + ${eg.away.toFixed(2)} = ${eg.total.toFixed(2)}`
    : null;

  return (
    <div className="card">
      <h3>Why?</h3>
      <p>Market: {explain.market}</p>
      {egLine && <p>Expected goals (form blend): {egLine}</p>}
      <p>Model Probability: {explain.model_probability}%</p>
      <p>Fair Odds: {explain.fair_price}</p>
      <p>
        Confidence:{" "}
        <span className={`conf-${(explain.confidence || "").toLowerCase()}`}>
          {explain.confidence}
        </span>
      </p>
      <ul>
        {(explain.notes || []).map((note, i) => (
          <li key={i}>{note}</li>
        ))}
      </ul>
    </div>
  );
};

export default WhySection;