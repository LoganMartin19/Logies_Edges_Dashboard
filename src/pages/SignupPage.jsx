import React, { useState } from "react";
import { auth } from "../firebase";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

export default function SignupPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (name) await updateProfile(res.user, { displayName: name });
      nav("/");
    } catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Create account</h2>
      {err && <p style={{ color: "salmon" }}>{err}</p>}
      <form onSubmit={onSubmit}>
        <input value={name} onChange={e=>setName(e.target.value)} placeholder="Name (optional)" />
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" />
        <button type="submit">Sign up</button>
      </form>
      <p>Have an account? <Link to="/login">Log in</Link></p>
    </div>
  );
}