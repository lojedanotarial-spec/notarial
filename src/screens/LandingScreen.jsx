import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";

const CSS = `
  .lnd *, .lnd *::before, .lnd *::after { box-sizing: border-box; margin: 0; padding: 0; }

  .lnd {
    font-family: 'Inter', sans-serif;
    background: #0f172a;
    color: #e2e8f0;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
  }

  /* ── NAVBAR ─────────────────────────────────────────────────────── */
  .lnd-navbar {
    position: fixed; top: 0; left: 0; right: 0; z-index: 100;
    height: 60px;
    background: rgba(15,23,42,0.94);
    backdrop-filter: blur(8px);
    border-bottom: 1px solid rgba(201,169,97,0.15);
    display: flex; align-items: center; padding: 0 40px;
  }
  .lnd-navbar-inner {
    width: 100%; max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
  }
  .lnd-brand { display: flex; align-items: baseline; gap: 14px; }
  .lnd-logo  { display: flex; align-items: center; gap: 8px; }
  .lnd-logo img { height: 26px; }
  .lnd-name {
    font-family: 'Montserrat', sans-serif;
    font-size: 17px; font-weight: 700; color: #fff; letter-spacing: -0.01em;
  }
  .lnd-tagline {
    font-family: 'Merriweather', serif; font-style: italic;
    font-size: 12px; color: #94a3b8; letter-spacing: 0.02em;
    padding-left: 14px; border-left: 1px solid rgba(201,169,97,0.3);
  }
  .lnd-btn-nav {
    font-family: 'Montserrat', sans-serif;
    font-size: 12px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #c9a961; background: transparent;
    border: 1px solid rgba(201,169,97,0.4);
    padding: 7px 18px; border-radius: 3px;
    cursor: pointer; transition: background 0.2s, border-color 0.2s;
  }
  .lnd-btn-nav:hover { background: rgba(201,169,97,0.08); border-color: #c9a961; }

  /* ── HERO ───────────────────────────────────────────────────────── */
  .lnd-hero {
    min-height: 100vh; background: #0f172a;
    display: flex; align-items: center;
    padding: 80px 40px 60px; position: relative; overflow: hidden;
  }
  .lnd-hero::before {
    content: ''; position: absolute; inset: 0;
    background-image:
      linear-gradient(rgba(58,124,165,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(58,124,165,0.04) 1px, transparent 1px);
    background-size: 48px 48px; pointer-events: none;
  }
  .lnd-hero-inner {
    width: 100%; max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: 55fr 45fr;
    gap: 56px; align-items: center; position: relative; z-index: 1;
  }
  .lnd-badge {
    display: inline-flex; align-items: center; gap: 7px;
    font-family: 'Montserrat', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
    color: #c9a961; background: rgba(201,169,97,0.08);
    border: 1px solid rgba(201,169,97,0.25);
    padding: 6px 12px; border-radius: 2px; margin-bottom: 28px;
  }
  .lnd-badge::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: #c9a961; flex-shrink: 0;
  }
  .lnd-h1 {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(30px, 3.8vw, 50px); font-weight: 800;
    line-height: 1.1; letter-spacing: -0.02em; color: #f8fafc;
    margin-bottom: 20px;
  }
  .lnd-h1 em { font-style: normal; color: #c9a961; }
  .lnd-flow {
    display: flex; align-items: center; gap: 6px;
    font-family: 'Merriweather', serif; font-size: 13px;
    font-style: italic; color: #64748b; margin-bottom: 28px; flex-wrap: wrap;
  }
  .lnd-flow-step { color: #94a3b8; }
  .lnd-flow-arrow { color: #c9a961; font-style: normal; font-family: 'Inter', sans-serif; }
  .lnd-bullets { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px; }
  .lnd-bullets li { display: flex; align-items: flex-start; gap: 10px; font-size: 14px; color: #94a3b8; }
  .lnd-bullets li::before {
    content: '—'; color: #c9a961; font-family: 'Montserrat', sans-serif;
    font-weight: 700; flex-shrink: 0; margin-top: 1px;
  }
  .lnd-bullets li strong { color: #cbd5e1; }
  .lnd-ctas { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
  .lnd-btn-primary {
    font-family: 'Montserrat', sans-serif;
    font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
    color: #fff; background: #3a7ca5; border: 2px solid #3a7ca5;
    padding: 12px 24px; border-radius: 3px; cursor: pointer;
    display: inline-flex; align-items: center; gap: 6px;
    transition: background 0.2s; text-decoration: none;
  }
  .lnd-btn-primary:hover { background: #2d6389; border-color: #2d6389; }
  .lnd-btn-outline {
    font-family: 'Montserrat', sans-serif;
    font-size: 13px; font-weight: 500; letter-spacing: 0.04em;
    color: #94a3b8; background: transparent;
    border: 1px solid rgba(148,163,184,0.3);
    padding: 12px 24px; border-radius: 3px; cursor: pointer;
    transition: border-color 0.2s, color 0.2s;
  }
  .lnd-btn-outline:hover { border-color: #94a3b8; color: #cbd5e1; }

  .lnd-screenshot-wrap {
    border-radius: 10px; overflow: hidden;
    box-shadow: 0 0 0 1px rgba(201,169,97,0.15), 0 32px 80px rgba(0,0,0,0.6), 0 8px 24px rgba(0,0,0,0.4);
  }
  .lnd-screenshot-wrap img { display: block; width: 100%; height: auto; border-radius: 10px; }

  /* ── CÓMO FUNCIONA ──────────────────────────────────────────────── */
  .lnd-how {
    background: #1e293b; padding: 88px 40px;
    border-top: 1px solid rgba(201,169,97,0.1);
    border-bottom: 1px solid rgba(201,169,97,0.1);
  }
  .lnd-how-inner { max-width: 1200px; margin: 0 auto; }
  .lnd-eyebrow {
    font-family: 'Montserrat', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase;
    color: #c9a961; margin-bottom: 14px;
  }
  .lnd-section-title {
    font-family: 'Montserrat', sans-serif;
    font-size: clamp(20px, 2.8vw, 30px); font-weight: 700;
    letter-spacing: -0.015em; color: #f1f5f9; margin-bottom: 56px;
  }
  .lnd-steps { display: grid; grid-template-columns: repeat(3,1fr); gap: 0; }
  .lnd-step { padding: 0 40px 0 0; }
  .lnd-step:last-child { padding-right: 0; }
  .lnd-step-num {
    font-family: 'Montserrat', sans-serif;
    font-size: 34px; font-weight: 800; color: rgba(201,169,97,0.2);
    line-height: 1; margin-bottom: 18px; letter-spacing: -0.02em;
  }
  .lnd-step-bar { width: 32px; height: 2px; background: #c9a961; margin-bottom: 18px; opacity: 0.6; }
  .lnd-step-label {
    font-family: 'Montserrat', sans-serif;
    font-size: 14px; font-weight: 700; color: #f1f5f9; margin-bottom: 10px;
  }
  .lnd-step-desc { font-size: 14px; color: #94a3b8; line-height: 1.65; }

  /* ── FEATURES ───────────────────────────────────────────────────── */
  .lnd-features { background: #e8e3d8; padding: 88px 40px; }
  .lnd-features-inner { max-width: 1200px; margin: 0 auto; }
  .lnd-features .lnd-eyebrow { color: #a8873e; }
  .lnd-features .lnd-section-title { color: #1a2332; }
  .lnd-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 24px; }
  .lnd-card {
    background: #FDFCFA; border: 1px solid rgba(26,35,50,0.08);
    border-radius: 4px; padding: 32px 28px;
    display: flex; flex-direction: column; gap: 0;
  }
  .lnd-card-bar { width: 32px; height: 3px; background: #c9a961; margin-bottom: 22px; }
  .lnd-card-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 15px; font-weight: 700; color: #1a2332;
    margin-bottom: 10px; letter-spacing: -0.01em;
  }
  .lnd-card-desc { font-size: 13.5px; color: #4a5568; line-height: 1.65; margin-bottom: 18px; }
  .lnd-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 20px; }
  .lnd-tag {
    font-family: 'Montserrat', sans-serif;
    font-size: 10px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase;
    color: #3a7ca5; background: rgba(58,124,165,0.08);
    border: 1px solid rgba(58,124,165,0.2);
    padding: 3px 8px; border-radius: 2px;
  }
  .lnd-card-img {
    width: 100%; border-radius: 6px; overflow: hidden; margin-top: auto;
    border: 1px solid rgba(26,35,50,0.1);
    box-shadow: 0 4px 16px rgba(26,35,50,0.08);
  }
  .lnd-card-img img { display: block; width: 100%; height: auto; }

  /* ── ACCESO ─────────────────────────────────────────────────────── */
  .lnd-access {
    background: #e8e3d8; border-top: 1px solid rgba(26,35,50,0.1); padding: 88px 40px;
  }
  .lnd-access-inner {
    max-width: 1200px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: start;
  }
  .lnd-access .lnd-eyebrow { color: #a8873e; }
  .lnd-access .lnd-section-title { color: #1a2332; margin-bottom: 14px; }
  .lnd-access-intro { font-size: 14px; color: #4a5568; line-height: 1.7; margin-bottom: 28px; }
  .lnd-privacy {
    background: rgba(26,35,50,0.04); border: 1px solid rgba(26,35,50,0.08);
    border-radius: 4px; padding: 20px 22px;
  }
  .lnd-privacy-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 11px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase;
    color: #1a2332; margin-bottom: 8px;
  }
  .lnd-privacy p { font-size: 12px; color: #64748b; line-height: 1.6; }
  .lnd-privacy a { color: #3a7ca5; text-decoration: none; }

  /* Formulario */
  .lnd-form-card {
    background: #FDFCFA; border: 1px solid rgba(26,35,50,0.1); border-radius: 4px;
    padding: 36px 32px;
    box-shadow: 0 4px 24px rgba(26,35,50,0.06), 0 1px 4px rgba(26,35,50,0.04);
  }
  .lnd-form-title {
    font-family: 'Montserrat', sans-serif;
    font-size: 16px; font-weight: 700; color: #1a2332; margin-bottom: 24px;
  }
  .lnd-form-group { margin-bottom: 18px; }
  .lnd-label {
    display: block; font-family: 'Montserrat', sans-serif;
    font-size: 11px; font-weight: 600; letter-spacing: 0.07em; text-transform: uppercase;
    color: #1a2332; opacity: 0.7; margin-bottom: 7px;
  }
  .lnd-input {
    width: 100%; font-family: 'Inter', sans-serif; font-size: 14px;
    color: #1a2332; background: #fff;
    border: 1px solid rgba(26,35,50,0.18); border-radius: 3px;
    padding: 10px 14px; outline: none;
    transition: border-color 0.2s, box-shadow 0.2s; appearance: none;
  }
  .lnd-input::placeholder { color: #a0aec0; }
  .lnd-input:focus { border-color: #3a7ca5; box-shadow: 0 0 0 3px rgba(58,124,165,0.12); }
  .lnd-hint { font-size: 11px; color: #94a3b8; margin-top: 4px; }
  .lnd-submit {
    width: 100%; font-family: 'Montserrat', sans-serif;
    font-size: 13px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase;
    color: #fff; background: #3a7ca5; border: none; border-radius: 3px;
    padding: 14px; cursor: pointer; margin-top: 8px; transition: background 0.2s;
  }
  .lnd-submit:hover:not(:disabled) { background: #2d6389; }
  .lnd-submit:disabled { opacity: 0.55; cursor: default; }
  .lnd-success {
    text-align: center; padding: 40px 24px;
    background: #FDFCFA; border: 1px solid rgba(39,174,96,0.2); border-radius: 4px;
  }
  .lnd-success-icon {
    width: 44px; height: 44px; border-radius: 50%; margin: 0 auto 14px;
    background: rgba(39,174,96,0.1); border: 1px solid rgba(39,174,96,0.2);
    display: flex; align-items: center; justify-content: center;
    color: #27ae60; font-size: 18px;
  }
  .lnd-success-title {
    font-family: 'Montserrat', sans-serif; font-size: 15px; font-weight: 700;
    color: #1a2332; margin-bottom: 6px;
  }
  .lnd-success-sub { font-size: 13px; color: #64748b; }
  .lnd-error {
    font-size: 13px; color: #c0392b; padding: 10px 12px; border-radius: 3px;
    background: rgba(192,57,43,0.05); border: 1px solid rgba(192,57,43,0.15);
    margin-bottom: 8px;
  }

  /* ── FOOTER ─────────────────────────────────────────────────────── */
  .lnd-footer {
    background: #1a2332; border-top: 1px solid rgba(201,169,97,0.12); padding: 40px;
  }
  .lnd-footer-inner {
    max-width: 1200px; margin: 0 auto;
    display: flex; align-items: center; justify-content: space-between;
    flex-wrap: wrap; gap: 20px;
  }
  .lnd-footer-name {
    font-family: 'Montserrat', sans-serif; font-size: 16px; font-weight: 700; color: #fff;
    margin-bottom: 4px;
  }
  .lnd-footer-name span { color: #c9a961; }
  .lnd-footer-tagline { font-family: 'Merriweather', serif; font-style: italic; font-size: 12px; color: #64748b; }
  .lnd-footer-links { display: flex; align-items: center; gap: 28px; }
  .lnd-footer-links a, .lnd-footer-links button {
    font-family: 'Montserrat', sans-serif; font-size: 12px; font-weight: 500;
    letter-spacing: 0.06em; text-transform: uppercase;
    color: #64748b; text-decoration: none; background: none; border: none;
    cursor: pointer; transition: color 0.2s; padding: 0;
  }
  .lnd-footer-links a:hover, .lnd-footer-links button:hover { color: #c9a961; }
  .lnd-footer-copy { font-size: 11px; color: #374151; }

  /* ── RESPONSIVE ─────────────────────────────────────────────────── */
  @media (max-width: 900px) {
    .lnd-hero-inner, .lnd-access-inner { grid-template-columns: 1fr; gap: 40px; }
    .lnd-hero-visual { display: none; }
    .lnd-steps { grid-template-columns: 1fr; gap: 36px; }
    .lnd-step { padding-right: 0; }
    .lnd-grid { grid-template-columns: 1fr; }
    .lnd-tagline { display: none; }
  }
  @media (max-width: 600px) {
    .lnd-navbar { padding: 0 20px; }
    .lnd-hero, .lnd-how, .lnd-features, .lnd-access { padding-left: 20px; padding-right: 20px; }
    .lnd-footer { padding: 28px 20px; }
    .lnd-footer-inner { flex-direction: column; align-items: flex-start; }
    .lnd-ctas { flex-direction: column; }
    .lnd-btn-primary, .lnd-btn-outline { width: 100%; justify-content: center; }
  }
`;

export function LandingScreen({ onLogin }) {
  const [form, setForm] = useState({ nombre: "", email: "", registro: "", telefono: "" });
  const [estado, setEstado] = useState("idle");
  const formRef = useRef();

  useEffect(() => {
    const root = document.getElementById("root");
    document.body.style.overflow = "auto";
    document.documentElement.style.overflow = "auto";
    root.style.overflow = "auto";
    root.style.height = "auto";
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overflow = "";
      root.style.overflow = "";
      root.style.height = "";
    };
  }, []);

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function enviar(e) {
    e.preventDefault();
    if (!form.nombre || !form.email) return;
    setEstado("enviando");
    const { error } = await supabase.from("contactos").insert([{
      nombre: form.nombre, email: form.email,
      registro: form.registro || null, telefono: form.telefono || null,
    }]);
    setEstado(error ? "error" : "enviado");
  }

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <>
      <style>{CSS}</style>
      <div className="lnd">

        {/* NAVBAR */}
        <nav className="lnd-navbar">
          <div className="lnd-navbar-inner">
            <div className="lnd-brand">
              <div className="lnd-logo">
                <img src="/logo-pen-transparent1.png" alt="Notarial" />
                <span className="lnd-name">Notarial</span>
              </div>
              <span className="lnd-tagline">Fe Pública Digital</span>
            </div>
            <button className="lnd-btn-nav" onClick={onLogin}>Iniciar sesión</button>
          </div>
        </nav>

        {/* HERO */}
        <section className="lnd-hero">
          <div className="lnd-hero-inner">
            <div>
              <div className="lnd-badge">Para escribanos de Mendoza</div>
              <h1 className="lnd-h1">
                Redacción notarial<br />asistida por <em>IA.</em>
              </h1>
              <div className="lnd-flow">
                <span className="lnd-flow-step">Elegís el instrumento</span>
                <span className="lnd-flow-arrow">→</span>
                <span className="lnd-flow-step">cargás las partes</span>
                <span className="lnd-flow-arrow">→</span>
                <span className="lnd-flow-step">exportás DOCX protocolar</span>
              </div>
              <ul className="lnd-bullets">
                <li><strong>50+ plantillas notariales</strong> listas para Mendoza: poderes, escrituras, actas, certificaciones de firma.</li>
                <li><strong>Scriba</strong> completa datos, sugiere cláusulas y consulta normativa vigente (CCyC, UIF, ARCA, ATM).</li>
                <li><strong>Expedientes</strong> vinculados a Google Drive con organización por estado y registro.</li>
              </ul>
              <div className="lnd-ctas">
                <button className="lnd-btn-primary" onClick={scrollToForm}>
                  Solicitar acceso
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
                <button className="lnd-btn-outline" onClick={onLogin}>Ya tengo cuenta</button>
              </div>
            </div>
            <div className="lnd-hero-visual">
              <div className="lnd-screenshot-wrap">
                <img src="/Screen-sample-3.png" alt="Editor notarial con variables resaltadas y panel de propiedades" />
              </div>
            </div>
          </div>
        </section>

        {/* CÓMO FUNCIONA */}
        <section className="lnd-how">
          <div className="lnd-how-inner">
            <div className="lnd-eyebrow">Flujo de trabajo</div>
            <div className="lnd-section-title">Tres pasos, sin fricción.</div>
            <div className="lnd-steps">
              {[
                { n: "01", label: "Elegís el instrumento", desc: "Seleccionás el tipo de acto — escritura, poder, certificación, acta — desde la biblioteca de plantillas adaptadas a la normativa mendocina." },
                { n: "02", label: "Cargás las partes", desc: "Escaneás el DNI con la cámara o ingresás los datos manualmente. Scriba completa los campos del documento y alerta si falta información requerida." },
                { n: "03", label: "Generás y exportás", desc: "Revisás el borrador en el editor OnlyOffice integrado. Cuando está listo, exportás el DOCX protocolar y queda archivado en el registro." },
              ].map(s => (
                <div key={s.n} className="lnd-step">
                  <div className="lnd-step-num">{s.n}</div>
                  <div className="lnd-step-bar" />
                  <div className="lnd-step-label">{s.label}</div>
                  <div className="lnd-step-desc">{s.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section className="lnd-features">
          <div className="lnd-features-inner">
            <div className="lnd-eyebrow">Funcionalidades</div>
            <div className="lnd-section-title">Herramientas para el estudio.</div>
            <div className="lnd-grid">

              <div className="lnd-card">
                <div className="lnd-card-bar" />
                <div className="lnd-card-title">Editor de documentos</div>
                <div className="lnd-card-desc">Edición nativa en OnlyOffice con formato protocolar preservado. Más de 50 plantillas cubren los instrumentos más frecuentes en la práctica mendocina.</div>
                <div className="lnd-tags">
                  <span className="lnd-tag">50+ plantillas</span>
                  <span className="lnd-tag">DOCX protocolar</span>
                  <span className="lnd-tag">OnlyOffice</span>
                </div>
                <div className="lnd-card-img">
                  <img src="/Screen-sample-3.png" alt="Editor con documento notarial" />
                </div>
              </div>

              <div className="lnd-card">
                <div className="lnd-card-bar" />
                <div className="lnd-card-title">Scriba — Asistente IA</div>
                <div className="lnd-card-desc">Entrenado en normativa mendocina vigente. Completa partes, sugiere cláusulas y verifica requisitos formales. No inventa: sólo aplica lo que la ley dice.</div>
                <div className="lnd-tags">
                  <span className="lnd-tag">CCyC</span>
                  <span className="lnd-tag">UIF</span>
                  <span className="lnd-tag">ARCA</span>
                  <span className="lnd-tag">ATM</span>
                </div>
                <div className="lnd-card-img">
                  <img src="/Screen-sample-1.png" alt="Panel Scriba con consultas sugeridas" />
                </div>
              </div>

              <div className="lnd-card">
                <div className="lnd-card-bar" />
                <div className="lnd-card-title">Expedientes y Drive</div>
                <div className="lnd-card-desc">Cada instrumento puede vincularse a un expediente. Los archivos se organizan automáticamente en tu Google Drive, sin apps intermediarias.</div>
                <div className="lnd-tags">
                  <span className="lnd-tag">Google Drive</span>
                  <span className="lnd-tag">Por estado</span>
                  <span className="lnd-tag">Búsqueda rápida</span>
                </div>
                <div className="lnd-card-img">
                  <img src="/Screen-sample-2.png" alt="Modal de vinculación de expediente" />
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* SOLICITAR ACCESO */}
        <section className="lnd-access" id="acceso" ref={formRef}>
          <div className="lnd-access-inner">

            <div>
              <div className="lnd-eyebrow">Acceso anticipado</div>
              <div className="lnd-section-title">Notarial está en desarrollo.</div>
              <p className="lnd-access-intro">
                Estamos incorporando escribanos de Mendoza para la etapa de prueba.
                El acceso es gratuito durante el período piloto. Los datos que ingresás
                se usan únicamente para coordinar el onboarding.
              </p>
              <div className="lnd-privacy">
                <div className="lnd-privacy-title">Privacidad y datos</div>
                <p>
                  Tus datos personales se usan exclusivamente para gestionar tu acceso.
                  No se comparten con terceros ni se usan con fines publicitarios.
                  Podés solicitar la eliminación escribiendo a{" "}
                  <a href="mailto:lojeda.notarial@gmail.com">lojeda.notarial@gmail.com</a>.
                  El almacenamiento cumple con la Ley N.° 25.326 de Protección de Datos Personales.
                </p>
              </div>
            </div>

            <div>
              {estado === "enviado" ? (
                <div className="lnd-success">
                  <div className="lnd-success-icon">✓</div>
                  <div className="lnd-success-title">Solicitud recibida</div>
                  <div className="lnd-success-sub">Te contactamos en los próximos días hábiles.</div>
                </div>
              ) : (
                <form className="lnd-form-card" onSubmit={enviar}>
                  <div className="lnd-form-title">Solicitar acceso</div>

                  <div className="lnd-form-group">
                    <label className="lnd-label" htmlFor="lnd-nombre">Nombre completo</label>
                    <input required className="lnd-input" id="lnd-nombre" type="text"
                      placeholder="Ej. María González" value={form.nombre}
                      onChange={e => set("nombre", e.target.value)} />
                  </div>
                  <div className="lnd-form-group">
                    <label className="lnd-label" htmlFor="lnd-email">Correo electrónico</label>
                    <input required className="lnd-input" id="lnd-email" type="email"
                      placeholder="escribano@ejemplo.com" value={form.email}
                      onChange={e => set("email", e.target.value)} />
                  </div>
                  <div className="lnd-form-group">
                    <label className="lnd-label" htmlFor="lnd-registro">Número de registro</label>
                    <input className="lnd-input" id="lnd-registro" type="text"
                      placeholder="Ej. 1234 — 1.ª Circunscripción" value={form.registro}
                      onChange={e => set("registro", e.target.value)} />
                    <div className="lnd-hint">Registro notarial asignado por el Colegio de Escribanos de Mendoza.</div>
                  </div>
                  <div className="lnd-form-group">
                    <label className="lnd-label" htmlFor="lnd-tel">Teléfono WhatsApp</label>
                    <input className="lnd-input" id="lnd-tel" type="tel"
                      placeholder="+54 9 261 000-0000" value={form.telefono}
                      onChange={e => set("telefono", e.target.value)} />
                    <div className="lnd-hint">Para coordinar el acceso y resolver dudas de configuración.</div>
                  </div>

                  {estado === "error" && (
                    <div className="lnd-error">Error al enviar. Intentá de nuevo.</div>
                  )}

                  <button className="lnd-submit" type="submit" disabled={estado === "enviando"}>
                    {estado === "enviando" ? "Enviando..." : "Enviar solicitud"}
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* FOOTER */}
        <footer className="lnd-footer">
          <div className="lnd-footer-inner">
            <div>
              <div className="lnd-footer-name">No<span>tarial</span></div>
              <div className="lnd-footer-tagline">Fe Pública Digital</div>
            </div>
            <div className="lnd-footer-links">
              <a href="#acceso">Privacidad</a>
              <button onClick={onLogin}>Iniciar sesión</button>
            </div>
            <div className="lnd-footer-copy">© 2026 Notarial. Mendoza, Argentina.</div>
          </div>
        </footer>

      </div>
    </>
  );
}
