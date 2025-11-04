import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tipstersCreate } from "../api";
import { useAuth } from "../components/AuthGate";

export default function TipsterApply() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({
    name: user?.displayName || "",
    username: "",
    bio: "",
    sport_focus: "Football",
    avatar_url: user?.photoURL || "",
    social_links: {},
  });
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const update = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    try {
      const res = await tipstersCreate(form);
      setOk(true);
      setTimeout(() => nav(`/tipsters/${res.username}`), 800);
    } catch (e) {
      setErr(e?.response?.data?.detail || e.message);
    }
  };

  if (!user) return <p>Please log in to apply.</p>;

  return (
    <div style={{ maxWidth: 560 }}>
      <h2>Become a Tipster</h2>
      {err && <p style={{ color: "salmon" }}>{err}</p>}
      {ok && <p style={{ color: "lightgreen" }}>Profile saved!</p>}
      <form onSubmit={submit}>
        <label>Name</label>
        <input value={form.name} onChange={update("name")} required />
        <label>Username</label>
        <input value={form.username} onChange={update("username")} required />
        <label>Bio</label>
        <textarea value={form.bio} onChange={update("bio")} rows={4} />
        <label>Sport focus</label>
        <input value={form.sport_focus} onChange={update("sport_focus")} />
        <label>Avatar URL</label>
        <input value={form.avatar_url} onChange={update("avatar_url")} />
        <button type="submit">Submit</button>
      </form>
    </div>
  );
}