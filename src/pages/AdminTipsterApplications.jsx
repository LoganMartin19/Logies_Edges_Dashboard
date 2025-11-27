// src/pages/AdminTipsterApplications.jsx
import React, { useEffect, useState, useCallback } from "react";
import { api } from "../api";

const chip = (active) => ({
  padding: "3px 10px",
  borderRadius: 999,
  fontSize: "0.78rem",
  cursor: "pointer",
  border: active
    ? "1px solid rgba(34,197,94,0.9)"
    : "1px solid rgba(148,163,184,0.5)",
  background: active ? "rgba(22,163,74,0.18)" : "rgba(15,23,42,0.5)",
  color: active ? "#bbf7d0" : "#e5e7eb",
});

export default function AdminTipsterApplications() {
  const [apps, setApps] = useState([]);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busyId, setBusyId] = useState(null); // row-level spinner

  const load = useCallback(async () => {
    setLoading(true);
    setErr("");
    try {
      const { data } = await api.get("/api/tipsters/applications", {
        params: {
          status: statusFilter === "all" ? undefined : statusFilter,
        },
      });
      setApps(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setErr(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not load tipster applications."
      );
      setApps([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id) => {
    if (
      !window.confirm(
        "Approve this application and create a verified tipster profile?"
      )
    ) {
      return;
    }
    try {
      setBusyId(id);
      await api.post(`/api/tipsters/applications/${id}/approve`, {
        admin_note: "Approved via admin UI",
      });
      await load();
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not approve this application."
      );
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id) => {
    const note =
      window.prompt(
        "Reason for rejection? (optional – saved in admin_note)",
        ""
      ) || null;

    if (!window.confirm("Reject this application?")) return;

    try {
      setBusyId(id);
      await api.post(`/api/tipsters/applications/${id}/reject`, {
        admin_note: note,
      });
      await load();
    } catch (e) {
      console.error(e);
      alert(
        e?.response?.data?.detail ||
          e?.message ||
          "Could not reject this application."
      );
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div
      style={{
        padding: "0.75rem",
        background: "#020814",
        borderRadius: 12,
      }}
    >
      {/* Filter pills */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          flexWrap: "wrap",
        }}
      >
        {["pending", "approved", "rejected", "all"].map((st) => (
          <button
            key={st}
            type="button"
            style={chip(statusFilter === st)}
            onClick={() => setStatusFilter(st)}
          >
            {st.charAt(0).toUpperCase() + st.slice(1)}
          </button>
        ))}
      </div>

      {/* Error / loading / empty states */}
      {err && (
        <div
          style={{
            marginBottom: 10,
            padding: "0.5rem 0.75rem",
            borderRadius: 8,
            background: "rgba(248,113,113,0.12)",
            color: "#fecaca",
            fontSize: "0.85rem",
          }}
        >
          {err}
        </div>
      )}

      {loading && (
        <div style={{ fontSize: "0.9rem", color: "#9ca3af" }}>
          Loading applications…
        </div>
      )}

      {!loading && !err && apps.length === 0 && (
        <div
          style={{
            padding: "1rem 0.75rem",
            borderRadius: 8,
            background: "rgba(15,23,42,0.8)",
            fontSize: "0.9rem",
            color: "#9ca3af",
          }}
        >
          No applications in this state yet.
        </div>
      )}

      {!loading && !err && apps.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.85rem",
            }}
          >
            <thead>
              <tr>
                <th style={th}>Submitted</th>
                <th style={th}>Name</th>
                <th style={th}>Username</th>
                <th style={th}>Sport</th>
                <th style={th}>Email</th>
                <th style={th}>Socials</th>
                <th style={th}>Status</th>
                <th style={{ ...th, textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => {
                const created =
                  a.created_at &&
                  new Date(a.created_at).toLocaleString("en-GB", {
                    day: "2-digit",
                    month: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  });

                const twitter = a.social_links?.twitter || "";
                const instagram = a.social_links?.instagram || "";

                return (
                  <tr key={a.id}>
                    <td style={td}>{created || "—"}</td>
                    <td style={td}>{a.name}</td>
                    <td style={td}>@{a.username}</td>
                    <td style={td}>{a.sport_focus || "Football"}</td>
                    <td style={td}>{a.email}</td>
                    <td style={td}>
                      <div style={{ display: "flex", flexDirection: "column" }}>
                        {twitter && (
                          <span style={{ opacity: 0.9 }}>X: {twitter}</span>
                        )}
                        {instagram && (
                          <span style={{ opacity: 0.9 }}>
                            IG: {instagram}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={td}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          textTransform: "capitalize",
                          fontSize: "0.75rem",
                          background:
                            a.status === "approved"
                              ? "rgba(22,163,74,0.25)"
                              : a.status === "rejected"
                              ? "rgba(248,113,113,0.25)"
                              : "rgba(55,65,81,0.6)",
                          border:
                            a.status === "approved"
                              ? "1px solid rgba(34,197,94,0.7)"
                              : a.status === "rejected"
                              ? "1px solid rgba(248,113,113,0.7)"
                              : "1px solid rgba(148,163,184,0.7)",
                        }}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td
                      style={{
                        ...td,
                        textAlign: "right",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {a.status === "pending" ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleApprove(a.id)}
                            disabled={busyId === a.id}
                            style={{
                              fontSize: "0.8rem",
                              padding: "3px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(34,197,94,0.8)",
                              background: "rgba(22,163,74,0.15)",
                              color: "#bbf7d0",
                              cursor: "pointer",
                              marginRight: 6,
                            }}
                          >
                            {busyId === a.id ? "Working…" : "Approve"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReject(a.id)}
                            disabled={busyId === a.id}
                            style={{
                              fontSize: "0.8rem",
                              padding: "3px 8px",
                              borderRadius: 999,
                              border: "1px solid rgba(248,113,113,0.8)",
                              background: "rgba(127,29,29,0.4)",
                              color: "#fecaca",
                              cursor: "pointer",
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <span style={{ opacity: 0.7, fontSize: "0.8rem" }}>
                          —{/* no actions once decided */}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Optional: quick bio preview under the table */}
          <div
            style={{
              marginTop: 12,
              fontSize: "0.8rem",
              color: "#9ca3af",
            }}
          >
            Click into an applicant row mentally to review their bio in the
            table above – we keep this view compact for now. If you want, we
            can add a modal later that shows full bio + history.
          </div>
        </div>
      )}
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: "6px 8px",
  borderBottom: "1px solid rgba(31,41,55,0.9)",
  fontWeight: 500,
  fontSize: "0.78rem",
  color: "#9ca3af",
  whiteSpace: "nowrap",
};

const td = {
  padding: "6px 8px",
  borderBottom: "1px solid rgba(31,41,55,0.8)",
  fontSize: "0.8rem",
  color: "#e5e7eb",
  verticalAlign: "top",
};