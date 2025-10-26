// src/components/MatchPreview.jsx
import React, { useEffect, useRef, useState } from "react";
import { api } from "../api"; // env-based axios client

export default function MatchPreview({ fixtureId, isAdmin = false }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [meta, setMeta] = useState({ day: null, model: null, updated_at: null });
  const [error, setError] = useState("");
  const [thinking, setThinking] = useState(false);
  const abortRef = useRef(null);

  const fetchPreview = async () => {
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError("");
    try {
      // Public reader: returns { fixture_id, day, preview, model, updated_at }
      const r = await api.get("/api/public/ai/preview/by-fixture", {
        params: { fixture_id: fixtureId },
        signal: controller.signal,
      });
      const j = r.data || {};
      setPreview(j.preview || null);
      setMeta({
        day: j.day || null,
        model: j.model || null,
        updated_at: j.updated_at || null,
      });
      if (!j.preview) setError("No preview yet — generate one!");
    } catch (e) {
      if (e.name !== "CanceledError" && e.name !== "AbortError") {
        setPreview(null);
        setMeta({ day: null, model: null, updated_at: null });
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
      // Writer: returns { ok, fixture_id, preview, tokens }
      const r = await api.post("/api/ai/preview/generate", null, {
        params: { fixture_id: fixtureId, overwrite: 1, n: 5 },
      });
      const j = r.data || {};
      // Prefer what the writer returned; if empty, pull from reader for consistency
      if (j.preview) {
        setPreview(j.preview);
        // refresh meta from the reader (day/model/updated_at)
        await fetchPreview();
      } else {
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

  // small meta line formatter
  const Meta = () => {
    if (!meta.day && !meta.model && !meta.updated_at) return null;
    const last = meta.updated_at
      ? new Date(meta.updated_at).toLocaleString()
      : null;
    return (
      <div style={{ fontSize: 12, color: "#666", margin: "4px 0 8px" }}>
        {meta.day ? `Day: ${meta.day}` : null}
        {meta.day && (meta.model || last) ? " • " : ""}
        {meta.model ? `Model: ${meta.model}` : null}
        {meta.model && last ? " • " : ""}
        {last ? `Updated: ${last}` : ""}
      </div>
    );
  };

  return (
    <div style={{ marginTop: 20, background: "#f9faf9", borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginBottom: 4 }}>Match Preview</h3>
      <Meta />

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