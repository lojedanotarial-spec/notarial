import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { C } from "../constants.js";

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: C.dark,
      backgroundImage: "radial-gradient(ellipse at 60% 40%, rgba(58,124,165,.18) 0%, transparent 60%)",
    }}>
      <div style={{
        width: 380,
        background: "rgba(255,255,255,.04)",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 16,
        padding: "40px 36px",
        display: "flex", flexDirection: "column", gap: 28,
      }}>

        {/* Logo + título */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <img src="/Logo Gold.png" alt="Notarial" style={{ height: 36 }} />
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#FDFCFA", fontSize: 20, fontWeight: 700, letterSpacing: "-.02em" }}>
              Notarial
            </div>
            <div style={{ color: "rgba(255,255,255,.35)", fontSize: 12, marginTop: 2 }}>
              fe pública digital
            </div>
          </div>
        </div>

        {/* Separador */}
        <div style={{ height: 1, background: "rgba(255,255,255,.07)" }} />

        {/* Formulario */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
              style={{
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#FDFCFA",
                fontSize: 14,
                fontFamily: "'Montserrat', sans-serif",
                outline: "none",
              }}
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ color: "rgba(255,255,255,.5)", fontSize: 11, fontWeight: 600, letterSpacing: ".06em", textTransform: "uppercase" }}>
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              style={{
                background: "rgba(255,255,255,.06)",
                border: "1px solid rgba(255,255,255,.1)",
                borderRadius: 8,
                padding: "10px 14px",
                color: "#FDFCFA",
                fontSize: 14,
                fontFamily: "'Montserrat', sans-serif",
                outline: "none",
              }}
            />
          </div>

          {error && (
            <div style={{
              background: "rgba(255,100,100,.1)",
              border: "1px solid rgba(255,100,100,.25)",
              borderRadius: 8,
              padding: "8px 12px",
              color: "rgba(255,150,150,.9)",
              fontSize: 12,
            }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              marginTop: 4,
              background: C.cerulean,
              border: "none",
              borderRadius: 8,
              padding: "11px 0",
              color: "#FDFCFA",
              fontSize: 14,
              fontWeight: 700,
              fontFamily: "'Montserrat', sans-serif",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? .6 : 1,
              letterSpacing: ".02em",
            }}
          >
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </div>
  );
}