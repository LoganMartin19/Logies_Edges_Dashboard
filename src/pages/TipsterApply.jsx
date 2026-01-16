// src/pages/TipsterApply.jsx
import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../components/AuthGate";
import { api } from "../api";
import styles from "../styles/Auth.module.css";

// Storage imports
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../firebase";

const sanitise = (s = "") =>
  (s || "")
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "")
    .slice(0, 20);

/* ---------- Avatar Uploader component ---------- */
function AvatarUploader({ value, onChange }) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user?.uid && !user?.firebaseUid) {
      alert("You must be logged in to upload an avatar.");
      return;
    }

    try {
      setUploading(true);

      const uid = user?.uid || user?.firebaseUid;
      const ext = file.name.split(".").pop() || "jpg";

      // 👇 match Storage rules: /tipster_avatars/{userId}/{fileName}
      const path = `tipster_avatars/${uid}/${Date.now()}.${ext}`;

      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      onChange(url); // push up to parent form
    } catch (err) {
      console.error("Avatar upload failed:", err);
      alert("Could not upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ display: "grid", gap: 8 }}>
      {/* Preview */}
      {value && (
        <img
          src={value}
          alt="Avatar preview"
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            objectFit: "cover",
          }}
        />
      )}

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
      />

      {uploading && (
        <span style={{ fontSize: 12, opacity: 0.7 }}>Uploading…</span>
      )}
    </div>
  );
}

/* ---------- Main page ---------- */
export default function TipsterApply() {
  const { user } = useAuth();
  // const nav = useNavigate();

  const suggested = useMemo(
    () => sanitise(user?.displayName) || sanitise(user?.email?.split("@")[0]),
    [user]
  );

  const [form, setForm] = useState({
    name: user?.displayName || "",
    username: suggested || "",
    bio: "",
    sport_focus: "Football",
    avatar_url: user?.photoURL || "",
    social_links: {
      twitter: "",
      instagram: "",
    },
  });

  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);
  const [loading, setLoading] = useState(false);

  if (!user) {
    return (
      <div className={styles.wrapper}>
        <div className={styles.card}>
          <div className={styles.header}>
            <div className={styles.title}>Apply to become a Tipster</div>
            <div className={styles.subtitle}>Please log in first.</div>
          </div>
          <Link to="/login" className={styles.btn}>
            Log in
          </Link>
        </div>
      </div>
    );
  }

  const update = (k) => (e) =>
    setForm({ ...form, [k]: e.target.value });

  const updateSocial = (key) => (e) =>
    setForm({
      ...form,
      social_links: {
        ...form.social_links,
        [key]: e.target.value,
      },
    });

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    setOk(false);
    setLoading(true);

    try {
      const cleanedUsername = sanitise(form.username);
      const socials = form.social_links || {};
      const twitter = socials.twitter?.trim() || "";
      const instagram = socials.instagram?.trim() || "";

      if (!cleanedUsername) {
        throw new Error("Please choose a valid username.");
      }

      const payload = {
        name: form.name.trim(),
        username: cleanedUsername,
        sport_focus: form.sport_focus,
        avatar_url: form.avatar_url.trim() || null,
        bio: form.bio.trim() || "",
        social_links: {
          twitter,
          instagram,
        },
      };

      await api.post("/api/tipsters/apply", payload);

      setOk(true);
      // Optional redirect later:
      // setTimeout(() => nav("/tipsters"), 2000);
    } catch (e2) {
      console.error(e2);
      const msg =
        e2?.response?.data?.detail ||
        e2?.response?.data?.message ||
        e2.message ||
        "Something went wrong submitting your application.";
      setErr(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <header className={styles.header}>
          <div className={styles.title}>Apply to become a Tipster</div>
          <div className={styles.subtitle}>
            Fill this in to apply for a verified tipster profile on CSB.
            Applications are reviewed manually – creating this does{" "}
            <strong>not</strong> automatically list you.
          </div>
        </header>

        {err && <div className={styles.error}>{err}</div>}
        {ok && (
          <div className={styles.success}>
            Application submitted ✅ We&apos;ll review it and get back to you.
          </div>
        )}

        <form className={styles.form} onSubmit={submit}>
          <div className={styles.row}>
            <label className={styles.label}>Display name</label>
            <input
              className={styles.input}
              value={form.name}
              onChange={update("name")}
              required
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              value={form.username}
              onChange={update("username")}
              required
            />
            <div className={styles.hint}>
              lowercase letters / numbers / _ (max 20)
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Sport focus</label>
            <select
              className={styles.input}
              value={form.sport_focus}
              onChange={update("sport_focus")}
            >
              <option>Football</option>
              <option>NFL</option>
              <option>NBA</option>
              <option>NHL</option>
              <option>Tennis</option>
              <option>CFB</option>
            </select>
          </div>

          {/* Avatar upload + optional manual URL */}
          <div className={styles.row}>
            <label className={styles.label}>Avatar</label>
            <AvatarUploader
              value={form.avatar_url}
              onChange={(url) =>
                setForm((prev) => ({ ...prev, avatar_url: url || "" }))
              }
            />
            <div className={styles.hint} style={{ marginTop: 4 }}>
              You can also paste an image URL manually:
            </div>
            <input
              className={styles.input}
              value={form.avatar_url}
              onChange={update("avatar_url")}
              placeholder="https://… (optional)"
            />
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Bio</label>
            <textarea
              className={styles.textarea}
              rows={4}
              value={form.bio}
              onChange={update("bio")}
              placeholder="Tell people what you specialise in, staking style, leagues, etc."
            />
          </div>

          {/* 🔗 Socials */}
          <div className={styles.row}>
            <label className={styles.label}>X (Twitter)</label>
            <input
              className={styles.input}
              value={form.social_links.twitter}
              onChange={updateSocial("twitter")}
              placeholder="@yourhandle or full URL"
            />
            <div className={styles.hint}>
              We’ll show this on your tipster page so followers can find you on
              X.
            </div>
          </div>

          <div className={styles.row}>
            <label className={styles.label}>Instagram</label>
            <input
              className={styles.input}
              value={form.social_links.instagram}
              onChange={updateSocial("instagram")}
              placeholder="@yourhandle or full URL"
            />
          </div>

          <div className={styles.actions}>
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Submitting…" : "Submit application"}
            </button>
            <Link to="/tipsters" className={`${styles.btn} ${styles.btnGhost}`}>
              Cancel
            </Link>
          </div>

          <p className={styles.hint} style={{ marginTop: 12 }}>
            Once reviewed, we’ll create and verify your tipster profile.
            Verified tipsters will be highlighted on the leaderboard.
          </p>
        </form>
      </div>
    </div>
  );
}