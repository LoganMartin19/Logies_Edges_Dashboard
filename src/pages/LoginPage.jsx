import React, { useState } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithPopup, signInWithEmailAndPassword } from "firebase/auth";
import { useNavigate, Link } from "react-router-dom";

export default function LoginPage() {
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");

  const onGoogle = async () => {
    try { await signInWithPopup(auth, googleProvider); nav("/"); }
    catch (e) { setErr(e.message); }
  };

  const onEmail = async (e) => {
    e.preventDefault();
    try { await signInWithEmailAndPassword(auth, email, pass); nav("/"); }
    catch (e) { setErr(e.message); }
  };

  return (
    <div style={{ maxWidth: 420 }}>
      <h2>Log in</h2>
      {err && <p style={{ color: "salmon" }}>{err}</p>}
      <button onClick={onGoogle}>Continue with Google</button>
      <hr />
      <form onSubmit={onEmail}>
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
        <input type="password" value={pass} onChange={e=>setPass(e.target.value)} placeholder="Password" />
        <button type="submit">Log in</button>
      </form>
      <p>New here? <Link to="/signup">Create an account</Link></p>
    </div>
  );
}