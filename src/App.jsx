import { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { LoginScreen }   from "./screens/LoginScreen.jsx";
import { HomeScreen }    from "./screens/HomeScreen";
import { SelectorScreen } from "./screens/SelectorScreen";
import { EditorScreen }  from "./screens/EditorScreen";
import { BulkScreen }    from "./screens/BulkScreen";
import { AdminScreen }      from "./screens/AdminScreen";
import { ExpedientesScreen }     from "./screens/ExpedientesScreen";
import { ExpedienteDetailScreen } from "./screens/ExpedienteDetailScreen";
import { HerramientasScreen }    from "./screens/HerramientasScreen";
import { EstimadorDNRPA }        from "./screens/tools/EstimadorDNRPA";
import { PresupuestoNotarial }   from "./screens/tools/PresupuestoNotarial";
import { CalculadoraCuit }       from "./screens/tools/CalculadoraCuit";
import { ScribaPanel }   from "./components/ScribaPanel";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { FeedbackButton } from "./components/FeedbackButton";
import { LogsScreen }    from "./screens/LogsScreen";
import { logError }      from "./utils/logger";


const globalStyles = [
  "@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600&family=Merriweather:ital,wght@0,400;0,700;1,400&family=Carattere&display=swap');",
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
  "@keyframes scriba-pulse {",
  "  0%, 100% { box-shadow: 0 4px 20px rgba(0,0,0,.4), 0 0 0 0 rgba(201,169,97,0); }",
  "  55% { box-shadow: 0 4px 24px rgba(0,0,0,.45), 0 0 20px 6px rgba(201,169,97,.28); }",
  "}",
  ".scriba-fab { animation: scriba-pulse 3.5s ease-in-out infinite; }",
  ".scriba-fab.open { animation: none; }",
  ".scriba-fab:hover { animation: none !important; box-shadow: 0 4px 28px rgba(0,0,0,.5), 0 0 26px 8px rgba(201,169,97,.4) !important; }",
  "@keyframes dot-breathe {",
  "  0%, 100% { transform: scale(1);   opacity: 1;  }",
  "  50%       { transform: scale(1.3); opacity: .6; }",
  "}",
  ".scriba-dot { animation: dot-breathe 2s ease-in-out infinite; }",
].join("\n");

function AppRouter() {
  const { session, cargando, usuario, miUsuario, perfilCargado, logout, setRegistroActivo, registroActivo } = useAuth();
  const [screen, setScreen] = useState("home");
  const [params, setParams] = useState({});
  const [scribaOpen, setScribaOpen] = useState(false);
  const [scribaContexto, setScribaContexto] = useState(null);

  const handleGo = (targetScreen, targetParams = {}) => {
    if (targetParams.registroActivo) setRegistroActivo(targetParams.registroActivo);
    if (targetScreen !== "editor") setScribaContexto(null);
    setParams(targetParams);
    setScreen(targetScreen);
  };

  useEffect(() => {
    const onError = (e) => logError("js_error", e.message, { stack: e.error?.stack, screen });
    const onRejection = (e) => logError("unhandled_rejection", String(e.reason), { stack: e.reason?.stack, screen });
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, [screen]);

  // Admin va directo al home; cambia registro desde el botón en HomeScreen

  if (cargando) return (
    <div style={{
      height: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "#1a2332",
    }}>
      <img src="/logo-pen-transparent1.png" alt="Notarial" style={{ height: 56, opacity: .75 }} />
    </div>
  );

  if (!session) return <LoginScreen />;

  if (perfilCargado && !usuario) return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      background: "#1a2332", gap: 20,
    }}>
      <img src="/logo-pen-transparent1.png" alt="Notarial" style={{ height: 56, opacity: .5 }} />
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 8 }}>
        <p style={{ margin: 0, fontFamily: "'Merriweather', serif", fontSize: 18,
          fontWeight: 400, color: "#fdfcfa" }}>Sin acceso</p>
        <p style={{ margin: 0, fontFamily: "'Montserrat', sans-serif", fontSize: 13,
          color: "rgba(253,252,250,0.75)", maxWidth: 300, lineHeight: 1.5 }}>
          Tu cuenta no tiene acceso al sistema notarial. Contactá al administrador.
        </p>
      </div>
      <button onClick={logout} style={{
        marginTop: 8, padding: "10px 24px", borderRadius: 8, border: "none",
        background: "rgba(253,252,250,0.12)", color: "rgba(253,252,250,0.85)",
        fontFamily: "'Montserrat', sans-serif", fontSize: 13, fontWeight: 600,
        cursor: "pointer",
      }}>Cerrar sesión</button>
    </div>
  );

  return (
    <>
      {screen === "home"     && <HomeScreen     onGo={handleGo} />}
      {screen === "selector" && <SelectorScreen onGo={handleGo} />}
      {screen === "editor"   && <EditorScreen   onGo={handleGo} params={params} onScribaContexto={setScribaContexto} />}
      {screen === "bulk"         && <BulkScreen        onGo={handleGo} />}
      {screen === "admin"        && <AdminScreen       onGo={handleGo} />}
      {screen === "expedientes"  && <ExpedientesScreen     onGo={handleGo} registroActivo={registroActivo} miUsuario={miUsuario} />}
      {screen === "expediente"   && <ExpedienteDetailScreen onGo={handleGo} params={params} />}
      {screen === "herramientas"    && <HerramientasScreen onGo={handleGo} />}
      {screen === "estimador_dnrpa"     && <EstimadorDNRPA      onBack={() => handleGo("herramientas")} />}
      {screen === "presupuesto_notarial" && <PresupuestoNotarial onBack={() => handleGo("herramientas")} />}
      {screen === "calculadora_cuit"     && <CalculadoraCuit     onBack={() => handleGo("herramientas")} />}
      {screen === "logs"                 && <LogsScreen          onBack={() => handleGo("admin")} />}

      <FeedbackButton screen={screen} />

      {/* Botón flotante Scriba */}
      <div className="no-print" style={{ position: "fixed", bottom: 24, right: 24, zIndex: 199 }}>
        {!scribaOpen && (
          <div className="scriba-dot" style={{
            position: "absolute", top: 2, right: 2,
            width: 11, height: 11, borderRadius: "50%",
            background: "#3a7ca5",
            border: "2px solid #f0ece3",
            zIndex: 1,
          }} />
        )}
        <button
          onClick={() => setScribaOpen(o => !o)}
          className={"scriba-fab" + (scribaOpen ? " open" : "")}
          title="Scriba — asistente notarial"
          style={{
            width: 56, height: 56, borderRadius: "50%",
            background: "none", border: "none",
            cursor: "pointer", padding: 0,
            display: "block",
          }}
        >
          <img src="/Scriba-icon-1.png" alt="Scriba" style={{ width: 56, height: 56, borderRadius: "50%", display: "block" }} />
        </button>
      </div>

      {scribaOpen && (
        <ScribaPanel
          onClose={() => setScribaOpen(false)}
          contexto={scribaContexto}
          onGo={(screen, params) => { setScribaOpen(false); handleGo(screen, params); }}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <style>{globalStyles}</style>
      <ErrorBoundary>
        <AppRouter />
      </ErrorBoundary>
    </AuthProvider>
  );
}