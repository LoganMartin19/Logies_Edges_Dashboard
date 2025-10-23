// src/components/MatchPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api"; // ← env-based axios client

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
      const r = await api.get("/api/public/ai/preview/by-fixture", {
        params: { fixture_id: fixtureId },
        signal: controller.signal,
      });
      setPreview(r.data?.preview || null);
      if (!r.data?.preview) setError("No preview yet — generate one!");
    } catch (e) {
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
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
      const r = await api.post("/api/ai/preview/generate", null, {
        params: { fixture_id: fixtureId, overwrite: 1, n: 5 },
      });
      const j = r.data || {};
      setPreview(j.preview || null);
      if (!j.preview) {
        // fallback fetch in case writer saved but empty text
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
    return () => abortRef.current && abortRef.current.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fixtureId]);

  const emptyPublicNote = !isAdmin && !preview && !loading && !error;

  return (
    <div style={{ marginTop: 20, background: "#f9faf9", borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginBottom: 8 }}>Match Preview</h3>

      {loading && <p>Loading…</p>}

      {preview && (
        <p style={{ lineHeight: 1.5, whiteSpace: "pre-wrap", color: "#222" }}>
          {preview}
        </p>
      )}

      {error && !loading && isAdmin && <p style={{ color: "#c00" }}>{error}</p>}

      {emptyPublicNote && <p style={{ color: "#666" }}>Preview coming soon.</p>}

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