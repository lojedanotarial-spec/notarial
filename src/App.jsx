import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { LoginScreen }   from "./screens/LoginScreen.jsx";
import { HomeScreen }    from "./screens/HomeScreen";
import { SelectorScreen } from "./screens/SelectorScreen";
import { EditorScreen }  from "./screens/EditorScreen";
import { BulkScreen }    from "./screens/BulkScreen";
import { AdminScreen }   from "./screens/AdminScreen";
import { ScribaPanel }   from "./components/ScribaPanel";


const globalStyles = [
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&display=swap');",
  "*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }",
  "html, body, #root { height: 100%; overflow: hidden; }",
  "body { background: #f0ece3; font-family: 'Montserrat', sans-serif; }",
  "[contenteditable]:focus { outline: none; }",
  "::-webkit-scrollbar { width: 6px; }",
  "::-webkit-scrollbar-track { background: transparent; }",
  "::-webkit-scrollbar-thumb { background: rgba(26,35,50,.2); border-radius: 3px; }",
  "@media print {",
  "  body { background: white !important; overflow: visible !important; }",
  "  html, body, #root { height: auto !important; overflow: visible !important; }",
  "  .no-print { display: none !important; }",
  "  .print-page { box-shadow: none !important; margin: 0 !important; }",
  "  @page { size: A4; margin: 0; }",
  "}",
].join("\n");

function AppRouter() {
  const { session, cargando, usuario, perfilCargado, logout, setRegistroActivo } = useAuth();
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});

  const handleGo = (targetScreen, targetParams = {}) => {
    if (targetParams.registroActivo) {
      setRegistroActivo(targetParams.registroActivo);
    }
    setParams(targetParams);
    setScreen(targetScreen);
  };

  // Admin va directo al selector de registro
  useEffect(() => {
    if (session && usuario?.is_admin && screen === "home") {
      setScreen("admin");
    }
  }, [session, usuario]);

  if (cargando) return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#1a2332",
    }}>
      <img src="/logo-pen-transparent.png" alt="Notarial" style={{ height: 56, opacity: .75 }} />
    </div>
  );

  if (!session) return <LoginScreen />;

  if (perfilCargado && !usuario) return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#1a2332", gap: 20,
    }}>
      <img src="/logo-pen-transparent.png" alt="Notarial" style={{ height: 56, opacity: .5 }} />
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontFamily: "'Merriweather', serif", fontSize: 18,
          fontWeight: 400, color: "#fdfcfa" }}>Sin acceso</p>
        <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 13,
          color: "rgba(253,252,250,0.55)", maxWidth: 300, lineHeight: 1.5 }}>
          Tu cuenta no tiene acceso al sistema notarial. Contactá al administrador.
        </p>
      </div>
      <button onClick={logout} style={{
        marginTop: 8, padding: "10px 24px", borderRadius: 8, border: "none",
        background: "rgba(253,252,250,0.1)", color: "rgba(253,252,250,0.7)",
        fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 600,
        cursor: "pointer",
      }}>Cerrar sesión</button>
    </div>
  );

  const [scribaOpen, setScribaOpen] = useState(false);

  return (
    <>
      {screen === "home"     && <HomeScreen     onGo={handleGo} />}
      {screen === "selector" && <SelectorScreen onGo={handleGo} />}
      {screen === "editor"   && <EditorScreen   onGo={handleGo} params={params} />}
      {screen === "bulk"     && <BulkScreen     onGo={handleGo} />}
      {screen === "admin"    && <AdminScreen    onGo={handleGo} />}

      {/* Botón flotante Scriba */}
      <button
        onClick={() => setScribaOpen(o => !o)}
        title="Scriba — asistente notarial"
        style={{
          position: "fixed", bottom: 24, right: 24, zIndex: 199,
          width: 52, height: 52, borderRadius: "50%",
          background: scribaOpen ? "#3a7ca5" : "#1a2332",
          border: "2px solid " + (scribaOpen ? "rgba(126,200,227,.5)" : "rgba(255,255,255,.15)"),
          color: "#fff", cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 20px rgba(0,0,0,.35)",
          transition: "all .2s",
        }}
        onMouseEnter={e => { if (!scribaOpen) e.currentTarget.style.background = "#3a7ca5"; }}
        onMouseLeave={e => { if (!scribaOpen) e.currentTarget.style.background = "#1a2332"; }}
      >
        <svg width="20" height="20" viewBox="0 0 16 16" fill="none">
          <path d="M3 12L5 7l3 3 3-5 2 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          <circle cx="8" cy="2.5" r="1.5" fill="currentColor" opacity=".8"/>
        </svg>
      </button>

      {scribaOpen && <ScribaPanel onClose={() => setScribaOpen(false)} />}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <style>{globalStyles}</style>
      <AppRouter />
    </AuthProvider>
  );
}