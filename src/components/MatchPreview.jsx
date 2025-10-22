// src/components/MatchPreview.jsx
import React, { useEffect, useRef, useState } from "react";

const API = "http://127.0.0.1:8000/api";

export default function MatchPreview({ fixtureId, isAdmin = false }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState("");
  const [thinking, setThinking] = useState(false);
  const abortRef = useRef(null);

  const fetchPreview = async () => {
    // cancel any in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const r = await fetch(
        `${API}/public/ai/preview/by-fixture?fixture_id=${fixtureId}`,
        { signal: controller.signal }
      );
      if (r.status === 404) {
        setPreview(null);
        setError("No preview yet — generate one!");
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setPreview(j.preview || null);
    } catch (e) {
      if (e.name !== "AbortError") {
        setPreview(null);
        setError(isAdmin ? "Failed to load preview." : "");
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePreview = async () => {
    if (!window.confirm("Generate/refresh the AI preview for this fixture?")) return;
    setThinking(true);
    setError("");
    try {
      const r = await fetch(
        `${API}/ai/preview/generate?fixture_id=${fixtureId}&overwrite=1&n=5`,
        { method: "POST" }
      );
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json();
      setPreview(j.preview || null);
      if (!j.preview) {
        // fallback fetch in case the writer saved but empty text somehow
        await fetchPreview();
      }
    } catch (e) {
      setError("Failed to generate preview.");
    } finally {
      setThinking(false);
    }
  };

  useEffect(() => {
    fetchPreview();
    // cleanup on unmount / id change
    return () => abortRef.current && abortRef.current.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId]);

  const emptyPublicNote = (!isAdmin && !preview && !loading && !error);

  return (
    <div style={{ marginTop: 20, background: "#f9faf9", borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Match Preview</h3>

      {loading && <p>Loading…</p>}

      {preview && (
        <p style={{ lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#222" }}>
          {preview}
        </p>
      )}

      {error && !loading && isAdmin && (
        <p style={{ color: "#c00" }}>{error}</p>
      )}

      {emptyPublicNote && (
        <p style={{ color: "#666" }}>Preview coming soon.</p>
      )}

      {isAdmin && (
        <div style={{ marginTop: 10, display: "flex", gap: 8 }}>
          <button onClick={generatePreview} disabled={thinking || loading}>
            {thinking ? "Thinking…" : preview ? "Regenerate" : "Generate"}
          </button>
          {!preview && !thinking && (
            <button onClick={fetchPreview} disabled={loading}>Refresh</button>
          )}
        </div>
      )}
    </div>
  );
}