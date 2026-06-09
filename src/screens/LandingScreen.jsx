import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { supabase } from "../supabase";

export function LandingScreen({ onLogin }) {
  const [form, setForm] = useState({ nombre: "", email: "", registro: "", telefono: "" });
  const [estado, setEstado] = useState("idle"); // idle | enviando | enviado | error
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
      nombre: form.nombre,
      email: form.email,
      registro: form.registro || null,
      telefono: form.telefono || null,
    }]);
    setEstado(error ? "error" : "enviado");
  }

  const scrollToForm = () => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  const inp = {
    width: "100%", boxSizing: "border-box",
    border: "1px solid rgba(26,35,50,.15)", borderRadius: 8,
    padding: "11px 14px", fontSize: 14,
    fontFamily: "'Inter', sans-serif", color: C.dark,
    outline: "none", background: "#fafaf8",
    transition: "border-color .15s",
  };
  const lbl = {
    fontSize: 11, fontWeight: 600, color: "rgba(26,35,50,.55)",
    letterSpacing: ".05em", textTransform: "uppercase",
    marginBottom: 6, display: "block",
    fontFamily: "'Inter', sans-serif",
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.warm }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 54, background: "rgba(26,35,50,.97)", backdropFilter: "blur(10px)",
        display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-pen-transparent1.png" alt="Notarial" style={{ height: 24 }} />
          <div style={{ width: 1, height: 13, background: "rgba(255,255,255,.18)" }} />
          <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 13, letterSpacing: "-.01em" }}>
            Notarial
          </span>
          <span style={{ color: "rgba(255,255,255,.38)", fontSize: 11, fontStyle: "italic", letterSpacing: ".02em" }}>
            Fe Pública Digital
          </span>
        </div>
        <button
          onClick={onLogin}
          onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.55)"; e.currentTarget.style.color = "#fff"; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,.22)"; e.currentTarget.style.color = "rgba(255,255,255,.8)"; }}
          style={{
            marginLeft: "auto", padding: "7px 18px", borderRadius: 7,
            border: "1px solid rgba(255,255,255,.22)", background: "transparent",
            color: "rgba(255,255,255,.8)", fontSize: 13, fontWeight: 600,
            fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
            transition: "border-color .15s, color .15s",
          }}
        >
          Iniciar sesión
        </button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", background: C.dark,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "120px 24px 90px", textAlign: "center",
        position: "relative", overflow: "hidden",
      }}>
        <div style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background: "radial-gradient(ellipse 80% 55% at 50% 38%, rgba(58,124,165,.1) 0%, transparent 68%)",
        }} />

        <div style={{ position: "relative", maxWidth: 660 }}>

          <div style={{
            display: "inline-block", marginBottom: 28,
            padding: "4px 14px", borderRadius: 20,
            border: "1px solid rgba(201,169,97,.32)",
            background: "rgba(201,169,97,.07)",
            color: C.gold, fontSize: 11, fontWeight: 700,
            letterSpacing: ".08em", textTransform: "uppercase",
            fontFamily: "'Montserrat', sans-serif",
          }}>
            Para escribanos de Mendoza
          </div>

          <h1 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "clamp(30px, 5.5vw, 52px)",
            fontWeight: 700, color: "#FDFCFA",
            margin: "0 0 22px", lineHeight: 1.13,
            letterSpacing: "-.025em",
          }}>
            El escritorio digital<br />del escribano.
          </h1>

          <p style={{
            fontSize: "clamp(15px, 2vw, 17px)",
            color: "rgba(253,252,250,.58)",
            margin: "0 auto 42px", lineHeight: 1.7,
            maxWidth: 500,
          }}>
            Redacción asistida por IA, plantillas notariales, gestión de expedientes
            y exportación DOCX — en una sola herramienta.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              onClick={scrollToForm}
              onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              style={{
                padding: "13px 30px", borderRadius: 9,
                background: C.cerulean, border: "none",
                color: "#fff", fontSize: 14, fontWeight: 700,
                fontFamily: "'Montserrat', sans-serif",
                cursor: "pointer", transition: "opacity .15s",
              }}
            >
              Solicitar acceso →
            </button>
            <button
              onClick={onLogin}
              onMouseEnter={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.45)"}
              onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(255,255,255,.18)"}
              style={{
                padding: "13px 26px", borderRadius: 9,
                background: "transparent", border: "1px solid rgba(255,255,255,.18)",
                color: "rgba(255,255,255,.72)", fontSize: 14, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", cursor: "pointer",
                transition: "border-color .15s",
              }}
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>
      </section>

      {/* ── FUNCIONALIDADES ────────────────────────────────────────────────── */}
      <section style={{ padding: "80px 24px", background: C.warm }}>
        <div style={{ maxWidth: 920, margin: "0 auto" }}>

          <div style={{ textAlign: "center", marginBottom: 52 }}>
            <h2 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 26, fontWeight: 700, color: C.dark,
              margin: "0 0 10px", letterSpacing: "-.02em",
            }}>
              Qué incluye
            </h2>
            <p style={{ fontSize: 14, color: "rgba(26,35,50,.5)", margin: 0, lineHeight: 1.6 }}>
              Herramientas diseñadas para la práctica notarial diaria.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {[
              {
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                ),
                titulo: "Editor de documentos",
                items: [
                  "Más de 50 plantillas: certificaciones, poderes, actas, escrituras, hipotecas",
                  "Exportación DOCX con márgenes y formato protocolar",
                  "Edición nativa con OnlyOffice",
                ],
              },
              {
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                  </svg>
                ),
                titulo: "Scriba — asistente de IA",
                items: [
                  "Entrenado con normativa mendocina vigente: CCyC, UIF, ARCA, ATM, Ley de Avalúos",
                  "Redacta, completa partes y sugiere cláusulas",
                  "Escaneo de DNI y tarjetas verdes por foto",
                ],
                nota: "Verificá siempre antes de firmar.",
              },
              {
                icon: (
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
                  </svg>
                ),
                titulo: "Expedientes y Drive",
                items: [
                  "Expedientes vinculados a documentos del registro",
                  "Archivos de cada expediente en tu Google Drive personal",
                  "Acceso por estado: en trámite, completo, archivado",
                ],
              },
            ].map((f, i) => (
              <div key={i} style={{
                background: "#FDFCFA",
                borderRadius: 14, border: "1px solid rgba(26,35,50,.07)",
                padding: "28px 24px",
                display: "flex", flexDirection: "column", gap: 16,
              }}>
                <div style={{ color: C.cerulean }}>{f.icon}</div>
                <div>
                  <div style={{
                    fontFamily: "'Montserrat', sans-serif",
                    fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 12,
                  }}>
                    {f.titulo}
                  </div>
                  <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: 7 }}>
                    {f.items.map((item, j) => (
                      <li key={j} style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                        <span style={{ color: C.cerulean, fontSize: 12, marginTop: 2, flexShrink: 0 }}>—</span>
                        <span style={{ fontSize: 13, color: "rgba(26,35,50,.62)", lineHeight: 1.55 }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  {f.nota && (
                    <div style={{ fontSize: 11, color: "rgba(26,35,50,.38)", marginTop: 12, fontStyle: "italic" }}>
                      {f.nota}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "72px 24px", background: C.dark }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 24, fontWeight: 700, color: "#FDFCFA",
            margin: "0 0 52px", letterSpacing: "-.02em", textAlign: "center",
          }}>
            Cómo funciona
          </h2>
          {[
            {
              n: "01",
              titulo: "Elegís el instrumento",
              texto: "Certificación de firma, poder notarial, acta, escritura de compraventa, hipoteca — más de 50 tipos disponibles, organizados por familia.",
            },
            {
              n: "02",
              titulo: "Cargás las partes",
              texto: "Por DNI manualmente, escaneando el documento con la cámara, o dictándole a Scriba. El sistema completa domicilio, CUIT y concordancias automáticamente.",
            },
            {
              n: "03",
              titulo: "Generás y exportás",
              texto: "DOCX con formato protocolar en segundos. También podés editar el documento directamente en el editor antes de exportar.",
            },
          ].map((paso, i, arr) => (
            <div key={i} style={{
              display: "flex", gap: 24, alignItems: "flex-start",
              padding: "28px 0",
              borderBottom: i < arr.length - 1 ? "1px solid rgba(255,255,255,.07)" : "none",
            }}>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 12, fontWeight: 700, color: C.gold,
                letterSpacing: ".08em", minWidth: 28, paddingTop: 3,
              }}>
                {paso.n}
              </div>
              <div>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 15, fontWeight: 700, color: "#FDFCFA", marginBottom: 8,
                }}>
                  {paso.titulo}
                </div>
                <div style={{ fontSize: 13, color: "rgba(253,252,250,.5)", lineHeight: 1.65 }}>
                  {paso.texto}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FORMULARIO ─────────────────────────────────────────────────────── */}
      <section ref={formRef} style={{ padding: "80px 24px", background: C.warm }}>
        <div style={{ maxWidth: 460, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 36 }}>
            <h2 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 24, fontWeight: 700, color: C.dark,
              margin: "0 0 10px", letterSpacing: "-.02em",
            }}>
              Solicitar acceso
            </h2>
            <p style={{ fontSize: 14, color: "rgba(26,35,50,.52)", margin: 0, lineHeight: 1.65 }}>
              Notarial está disponible para escribanos de Mendoza.<br />
              Completá el formulario y te contactamos a la brevedad.
            </p>
          </div>

          {estado === "enviado" ? (
            <div style={{
              background: "#FDFCFA", borderRadius: 14,
              border: "1px solid rgba(39,174,96,.2)",
              padding: "44px 28px", textAlign: "center",
            }}>
              <div style={{
                width: 44, height: 44, borderRadius: "50%",
                background: "rgba(39,174,96,.1)", border: "1px solid rgba(39,174,96,.25)",
                display: "flex", alignItems: "center", justifyContent: "center",
                margin: "0 auto 16px",
                color: "#27ae60", fontSize: 18,
              }}>✓</div>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 16, fontWeight: 700, color: C.dark, marginBottom: 8,
              }}>
                Solicitud recibida
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,35,50,.52)", lineHeight: 1.6 }}>
                Te contactamos en los próximos días hábiles.
              </div>
            </div>
          ) : (
            <form onSubmit={enviar} style={{
              background: "#FDFCFA", borderRadius: 14,
              border: "1px solid rgba(26,35,50,.08)",
              padding: "32px 28px",
              display: "flex", flexDirection: "column", gap: 20,
            }}>
              <div>
                <label style={lbl}>Nombre completo *</label>
                <input required value={form.nombre} onChange={e => set("nombre", e.target.value)}
                  placeholder="Ej. María González" style={inp}
                  onFocus={e => e.target.style.borderColor = C.cerulean}
                  onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
              </div>
              <div>
                <label style={lbl}>Correo electrónico *</label>
                <input required type="email" value={form.email} onChange={e => set("email", e.target.value)}
                  placeholder="correo@ejemplo.com" style={inp}
                  onFocus={e => e.target.style.borderColor = C.cerulean}
                  onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
              </div>
              <div>
                <label style={lbl}>Número de registro</label>
                <input value={form.registro} onChange={e => set("registro", e.target.value)}
                  placeholder="Ej. 853" style={inp}
                  onFocus={e => e.target.style.borderColor = C.cerulean}
                  onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
              </div>
              <div>
                <label style={lbl}>Teléfono WhatsApp</label>
                <input value={form.telefono} onChange={e => set("telefono", e.target.value)}
                  placeholder="Ej. 261 123-4567" style={inp}
                  onFocus={e => e.target.style.borderColor = C.cerulean}
                  onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
              </div>

              {estado === "error" && (
                <div style={{
                  fontSize: 13, color: "#c0392b",
                  padding: "10px 14px", borderRadius: 8,
                  background: "rgba(192,57,43,.05)", border: "1px solid rgba(192,57,43,.18)",
                }}>
                  Hubo un error al enviar. Intentá de nuevo.
                </div>
              )}

              <button type="submit" disabled={estado === "enviando"}
                onMouseEnter={e => { if (estado !== "enviando") e.currentTarget.style.opacity = ".85"; }}
                onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                style={{
                  padding: "13px", borderRadius: 9,
                  background: estado === "enviando" ? "rgba(58,124,165,.55)" : C.cerulean,
                  border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                  fontFamily: "'Montserrat', sans-serif",
                  cursor: estado === "enviando" ? "default" : "pointer",
                  transition: "opacity .15s",
                }}>
                {estado === "enviando" ? "Enviando..." : "Enviar solicitud"}
              </button>

              <p style={{ margin: 0, fontSize: 11, color: "rgba(26,35,50,.35)", textAlign: "center", lineHeight: 1.6 }}>
                Tus datos se usan únicamente para contactarte. No se comparten con terceros.
              </p>
            </form>
          )}
        </div>
      </section>

      {/* ── PRIVACIDAD ─────────────────────────────────────────────────────── */}
      <section id="privacidad" style={{
        padding: "72px 24px", background: "#FDFCFA",
        borderTop: "1px solid rgba(26,35,50,.08)",
      }}>
        <div style={{ maxWidth: 660, margin: "0 auto" }}>
          <h2 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: 20, fontWeight: 700, color: C.dark,
            margin: "0 0 32px", letterSpacing: "-.02em",
          }}>
            Política de privacidad
          </h2>

          {[
            {
              titulo: "Datos que recopilamos",
              texto: "Recopilamos los datos ingresados por el usuario: nombre, apellido, DNI y domicilio de los requirentes intervinientes en los instrumentos notariales. Estos datos se almacenan en nuestra base de datos (Supabase, región EU-West) y son accesibles exclusivamente por el registro notarial correspondiente mediante políticas de seguridad a nivel de fila (Row Level Security).",
            },
            {
              titulo: "Uso de Google Drive",
              texto: "Notarial solicita acceso a Google Drive con el alcance drive.file, que permite exclusivamente crear y gestionar los archivos generados por la propia aplicación dentro de la carpeta «Notarial» en el Drive del usuario. No accedemos, leemos ni modificamos ningún archivo existente ajeno a los creados por Notarial.",
            },
            {
              titulo: "Autenticación",
              texto: "El acceso al sistema se realiza mediante correo electrónico y contraseña, o mediante Google OAuth. Las credenciales son gestionadas por Supabase Auth y nunca almacenadas en texto plano por nuestra aplicación.",
            },
            {
              titulo: "Retención y eliminación",
              texto: "Los datos se conservan mientras la cuenta del registro notarial esté activa. Ante solicitud de baja, los datos son eliminados de la base de datos en un plazo máximo de 30 días hábiles.",
            },
            {
              titulo: "Contacto",
              texto: "Para consultas sobre privacidad o solicitudes de eliminación de datos: contacto@notarial.lat",
            },
          ].map((s, i) => (
            <div key={i} style={{ marginBottom: 24, paddingBottom: 24, borderBottom: i < 4 ? "1px solid rgba(26,35,50,.06)" : "none" }}>
              <div style={{
                fontFamily: "'Montserrat', sans-serif",
                fontSize: 13, fontWeight: 700, color: C.dark, marginBottom: 7,
              }}>
                {s.titulo}
              </div>
              <div style={{ fontSize: 13, color: "rgba(26,35,50,.58)", lineHeight: 1.72 }}>
                {s.texto}
              </div>
            </div>
          ))}

          <div style={{ fontSize: 11, color: "rgba(26,35,50,.3)", marginTop: 8 }}>
            Última actualización: junio de 2026
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        background: C.dark, padding: "22px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo-pen-transparent1.png" alt="Notarial" style={{ height: 18, opacity: .6 }} />
          <span style={{ color: "rgba(255,255,255,.38)", fontSize: 12 }}>
            © 2026 Notarial —{" "}
            <span style={{ fontStyle: "italic" }}>Fe Pública Digital</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="#privacidad"
            onMouseEnter={e => e.target.style.color = "rgba(255,255,255,.7)"}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.38)"}
            style={{ color: "rgba(255,255,255,.38)", fontSize: 12, textDecoration: "none" }}>
            Privacidad
          </a>
          <button onClick={onLogin}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.7)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.38)"}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.38)", fontSize: 12, cursor: "pointer", padding: 0 }}>
            Iniciar sesión
          </button>
        </div>
      </footer>

    </div>
  );
}
