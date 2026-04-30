import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { C } from "../constants.js";

const CARD_BG = "rgba(38, 52, 76, 0.72)";

function Field({ id, label, type, value, onChange, autoComplete, rightSlot }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <label htmlFor={id} style={{
        fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 600,
        letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(253,252,250,0.72)"
      }}>{label}</label>
      <div style={{
        position: "relative", display: "flex", alignItems: "center",
        background: C.porcelain, borderRadius: 8,
        border: `1px solid ${focused ? C.cerulean : C.border}`,
        boxShadow: focused ? "0 0 0 3px rgba(58,124,165,0.18)" : "0 1px 0 rgba(0,0,0,0.04) inset",
        transition: "border-color 160ms ease, box-shadow 160ms ease"
      }}>
        <input id={id} type={type} value={value} onChange={onChange}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          autoComplete={autoComplete} required
          style={{
            flex: 1, border: "none", background: "transparent",
            padding: "13px 14px", paddingRight: rightSlot ? 44 : 14,
            fontFamily: "'Montserrat', sans-serif", fontSize: 14.5,
            color: C.dark, letterSpacing: "0.01em", outline: "none"
          }} />
        {rightSlot && (
          <div style={{ position: "absolute", right: 6, top: 0, bottom: 0, display: "flex", alignItems: "center" }}>
            {rightSlot}
          </div>
        )}
      </div>
    </div>
  );
}

function EyeButton({ visible, onClick }) {
  return (
    <button type="button" onClick={onClick}
      style={{ width: 34, height: 34, display: "inline-flex", alignItems: "center",
        justifyContent: "center", background: "transparent", border: "none",
        borderRadius: 6, cursor: "pointer", color: "rgba(26,35,50,0.55)" }}>
      {visible
        ? <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
            <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" y1="2" x2="22" y2="22"/>
          </svg>
        : <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>
          </svg>
      }
    </button>
  );
}

export function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch {
      setError("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", position: "relative", display: "flex",
      alignItems: "center", justifyContent: "center", padding: "48px 20px",
      background: C.dark, overflow: "hidden"
    }}>
      {/* Glow */}
      <div aria-hidden style={{ position: "absolute", bottom: "-30%", right: "-10%", width: 600, height: 600,
        background: "radial-gradient(closest-side, rgba(58,124,165,0.14), rgba(58,124,165,0) 70%)", pointerEvents: "none" }} />
      <div aria-hidden style={{ position: "absolute", inset: 0,
        background: "radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.28) 100%)", pointerEvents: "none" }} />

      <div style={{ position: "relative", width: "100%", maxWidth: 420,
        display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>

        {/* Brand */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <img src="/logo-pen-transparent.png" alt="Notarial" style={{ width: 120, height: 120, objectFit: "contain" }} />
          <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 6 }}>
            <h1 style={{ margin: 0, fontFamily: "'Merriweather', Georgia, serif", fontWeight: 300,
              fontSize: 30, letterSpacing: "0.01em", color: C.porcelain }}>Notarial</h1>
            <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 11, fontWeight: 500,
              letterSpacing: "0.32em", textTransform: "uppercase", color: C.gold }}>Fe pública digital</p>
          </div>
        </div>

        {/* Card */}
        <form onSubmit={handleSubmit} style={{
          width: "100%", background: CARD_BG, border: "1px solid rgba(253,252,250,.10)",
          borderRadius: 12, padding: "32px 30px 28px",
          backdropFilter: "blur(14px)", WebkitBackdropFilter: "blur(14px)",
          boxShadow: "0 30px 60px -28px rgba(0,0,0,0.55), 0 8px 20px -12px rgba(0,0,0,0.35)",
          display: "flex", flexDirection: "column", gap: 18
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 4 }}>
            <h2 style={{ margin: 0, fontFamily: "'Merriweather', Georgia, serif", fontWeight: 400,
              fontSize: 19, color: C.porcelain }}>Bienvenido</h2>
            <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 13,
              color: "rgba(253,252,250,0.62)", lineHeight: 1.45 }}>
              Ingresá a tu cuenta para acceder al sistema notarial.
            </p>
          </div>

          <Field id="email" label="Correo electrónico" type="email"
            value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />

          <Field id="password" label="Contraseña" type={showPw ? "text" : "password"}
            value={password} onChange={e => setPassword(e.target.value)}
            autoComplete="current-password"
            rightSlot={<EyeButton visible={showPw} onClick={() => setShowPw(v => !v)} />} />

          {/* Acciones deshabilitadas */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 12.5,
              color: "rgba(253,252,250,0.3)", cursor: "not-allowed" }}>
              ¿Olvidaste tu contraseña?
            </span>
          </div>

          {error && (
            <div style={{ background: "rgba(255,100,100,.1)", border: "1px solid rgba(255,100,100,.25)",
              borderRadius: 8, padding: "8px 12px", color: "rgba(255,150,150,.9)", fontSize: 12 }}>
              {error}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            width: "100%", padding: "14px 20px", background: loading ? C.gold + "99" : C.gold,
            color: C.dark, border: "none", borderRadius: 8,
            fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 700,
            letterSpacing: "0.16em", textTransform: "uppercase",
            cursor: loading ? "not-allowed" : "pointer",
            boxShadow: "0 6px 18px -10px rgba(201,169,97,0.45)",
            transition: "background 160ms ease"
          }}>{loading ? "Verificando…" : "Ingresar"}</button>

          {/* Divider */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, color: "rgba(253,252,250,0.35)",
            fontSize: 11, letterSpacing: "0.18em", textTransform: "uppercase" }}>
            <span style={{ flex: 1, height: 1, background: "rgba(253,252,250,0.10)" }} />
            <span>o</span>
            <span style={{ flex: 1, height: 1, background: "rgba(253,252,250,0.10)" }} />
          </div>

          {/* Google SSO — deshabilitado */}
          <button type="button" disabled style={{
            width: "100%", padding: "12px 16px", background: C.porcelain,
            color: C.dark, border: "1px solid rgba(26,35,50,0.18)", borderRadius: 8,
            fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 500,
            cursor: "not-allowed", opacity: 0.4, display: "inline-flex",
            alignItems: "center", justifyContent: "center", gap: 10
          }}>
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
              <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
              <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2c-2 1.5-4.5 2.4-7.2 2.4-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.7 16.2 44 24 44z"/>
              <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.2-4.1 5.6l6.2 5.2C41 35.2 44 30 44 24c0-1.3-.1-2.4-.4-3.5z"/>
            </svg>
            Continuar con Google
          </button>
        </form>

        {/* Footer */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
          <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 12, color: "rgba(253,252,250,0.5)" }}>
            ¿No tenés cuenta?{" "}
            <span style={{ color: "rgba(201,169,97,0.4)", cursor: "not-allowed", fontWeight: 600 }}>
              Solicitar acceso
            </span>
          </p>
          <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 10.5,
            letterSpacing: "0.22em", textTransform: "uppercase", color: "rgba(253,252,250,0.32)" }}>
            © 2026 NOTARIAL · ARGENTINA
          </p>
        </div>
      </div>
    </div>
  );
}