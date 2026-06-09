import { useState, useEffect, useRef } from "react";
import { C } from "../constants";
import { supabase } from "../supabase";

// Mockup visual del editor — represetación estilizada del producto
function EditorMockup() {
  return (
    <div style={{
      width: "100%", maxWidth: 480,
      background: "#111827",
      borderRadius: 14,
      border: "1px solid rgba(255,255,255,.1)",
      boxShadow: "0 32px 80px rgba(0,0,0,.55), 0 0 0 1px rgba(255,255,255,.04)",
      overflow: "hidden",
      fontFamily: "'Inter', sans-serif",
    }}>
      {/* Barra superior */}
      <div style={{
        height: 38, background: "#0f172a",
        display: "flex", alignItems: "center", padding: "0 14px", gap: 10,
        borderBottom: "1px solid rgba(255,255,255,.07)",
      }}>
        <div style={{ display: "flex", gap: 6 }}>
          {["#ef4444","#f59e0b","#22c55e"].map(c => (
            <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c, opacity: .7 }} />
          ))}
        </div>
        <div style={{
          flex: 1, height: 20, background: "rgba(255,255,255,.06)",
          borderRadius: 4, display: "flex", alignItems: "center",
          padding: "0 10px", fontSize: 10, color: "rgba(255,255,255,.3)",
        }}>
          Cert. firma — OJEDA LUCAS — 09-06-2026
        </div>
      </div>

      {/* Contenido editor */}
      <div style={{ display: "flex" }}>
        {/* Panel izquierdo */}
        <div style={{
          width: 160, flexShrink: 0, padding: "14px 12px",
          borderRight: "1px solid rgba(255,255,255,.06)",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".08em", textTransform: "uppercase" }}>
            Partes
          </div>
          {[
            { nombre: "LUCAS OJEDA", rol: "Vendedor", dni: "28.441.320" },
            { nombre: "ANA GÓMEZ", rol: "Compradora", dni: "31.220.114" },
          ].map((p, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,.04)", borderRadius: 6,
              padding: "8px 10px", border: "1px solid rgba(255,255,255,.07)",
            }}>
              <div style={{ fontSize: 10, fontWeight: 700, color: "rgba(253,252,250,.85)" }}>{p.nombre}</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.35)", marginTop: 2 }}>{p.rol} · {p.dni}</div>
            </div>
          ))}
          <div style={{ marginTop: 4 }}>
            <div style={{ fontSize: 9, fontWeight: 700, color: "rgba(255,255,255,.25)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 6 }}>
              Documento
            </div>
            <div style={{ background: "rgba(58,124,165,.18)", borderRadius: 6, padding: "7px 10px", border: "1px solid rgba(58,124,165,.3)" }}>
              <div style={{ fontSize: 9, fontWeight: 700, color: "#7ec8e3" }}>Cert. de firma F-08</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,.3)", marginTop: 2 }}>Compraventa · Automotor</div>
            </div>
          </div>
        </div>

        {/* Documento */}
        <div style={{ flex: 1, padding: "16px 14px", background: "#1e293b" }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.2)", marginBottom: 10, letterSpacing: ".04em" }}>
            VISTA PREVIA
          </div>
          <div style={{ fontSize: 10, lineHeight: 1.8, color: "rgba(253,252,250,.55)" }}>
            <p style={{ margin: "0 0 8px" }}>
              En la ciudad de Mendoza, a los{" "}
              <span style={{ background: "rgba(201,169,97,.25)", color: "#c9a961", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>
                nueve días del mes de junio
              </span>{" "}
              de dos mil veintiséis...
            </p>
            <p style={{ margin: "0 0 8px" }}>
              Ante mí,{" "}
              <span style={{ background: "rgba(58,124,165,.25)", color: "#7ec8e3", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>
                ESCRIBANO/A REGISTRO Nº 853
              </span>
              , comparece{" "}
              <span style={{ background: "rgba(58,124,165,.25)", color: "#7ec8e3", borderRadius: 3, padding: "1px 5px", fontWeight: 700 }}>
                LUCAS OJEDA
              </span>
              , argentino, DNI 28.441.320...
            </p>
            <p style={{ margin: 0, color: "rgba(255,255,255,.22)" }}>
              [el compareciente me exhibe el Formulario 08...]{" "}
            </p>
          </div>

          {/* Scriba */}
          <div style={{
            marginTop: 14, background: "rgba(201,169,97,.07)",
            border: "1px solid rgba(201,169,97,.2)", borderRadius: 8, padding: "8px 10px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 5 }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src="/Scriba-icon-1.png" alt="S" style={{ width: 16, height: 16, borderRadius: "50%" }} onError={e => e.target.style.display = "none"} />
              </div>
              <span style={{ fontSize: 9, fontWeight: 700, color: C.gold, letterSpacing: ".04em" }}>SCRIBA</span>
            </div>
            <div style={{ fontSize: 9, color: "rgba(253,252,250,.5)", lineHeight: 1.6 }}>
              Documento listo. El formulario F-08 fue detectado correctamente. ¿Querés que complete el bloque INTERVIENE para el apoderado?
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
    <div style={{ fontFamily: "'Inter', sans-serif", background: C.dark }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
        height: 52, background: "rgba(15,23,42,.95)", backdropFilter: "blur(12px)",
        display: "flex", alignItems: "center", padding: "0 32px",
        borderBottom: "1px solid rgba(255,255,255,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {/* Logo en círculo para que sea visible */}
          <div style={{
            width: 30, height: 30, borderRadius: "50%",
            background: C.gold,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <img src="/logo-pen-transparent1.png" alt="" style={{ height: 18, filter: "brightness(0) invert(1)" }}
              onError={e => e.target.style.display = "none"} />
          </div>
          <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat', sans-serif", fontWeight: 700, fontSize: 14, letterSpacing: "-.01em" }}>
            Notarial
          </span>
          <span style={{ color: "rgba(255,255,255,.3)", fontSize: 11, fontStyle: "italic" }}>Fe Pública Digital</span>
        </div>
        <button
          onClick={onLogin}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.08)"}
          onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          style={{
            marginLeft: "auto", padding: "7px 18px", borderRadius: 7,
            border: "1px solid rgba(255,255,255,.18)", background: "transparent",
            color: "rgba(255,255,255,.75)", fontSize: 13, fontWeight: 600,
            fontFamily: "'Montserrat', sans-serif", cursor: "pointer",
            transition: "background .15s",
          }}
        >
          Iniciar sesión
        </button>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <section style={{
        minHeight: "100vh", background: "#0f172a",
        display: "flex", alignItems: "center",
        padding: "80px 48px 60px",
        gap: 64,
        flexWrap: "wrap",
        justifyContent: "center",
      }}>
        {/* Texto */}
        <div style={{ flex: "1 1 380px", maxWidth: 520 }}>

          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            marginBottom: 24,
            padding: "5px 12px 5px 8px", borderRadius: 20,
            border: "1px solid rgba(201,169,97,.3)",
            background: "rgba(201,169,97,.07)",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: C.gold }} />
            <span style={{ color: C.gold, fontSize: 11, fontWeight: 700, letterSpacing: ".07em", textTransform: "uppercase", fontFamily: "'Montserrat', sans-serif" }}>
              Para escribanos de Mendoza
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Montserrat', sans-serif",
            fontSize: "clamp(28px, 4vw, 46px)",
            fontWeight: 700, color: "#FDFCFA",
            margin: "0 0 18px", lineHeight: 1.12,
            letterSpacing: "-.025em",
          }}>
            Redacción notarial<br />
            <span style={{ color: C.gold }}>asistida por IA.</span>
          </h1>

          <p style={{
            fontSize: 16, color: "rgba(253,252,250,.55)",
            margin: "0 0 14px", lineHeight: 1.7,
          }}>
            Generás un instrumento notarial en minutos: cargás las partes desde el DNI,
            elegís la plantilla y exportás en DOCX con formato protocolar.
          </p>
          <p style={{
            fontSize: 15, color: "rgba(253,252,250,.38)",
            margin: "0 0 36px", lineHeight: 1.7,
          }}>
            Scriba, el asistente de IA, conoce la normativa mendocina vigente —
            CCyC, UIF, ARCA, ATM — y te ayuda a completar y redactar sin salir del editor.
          </p>

          {/* Bullets rápidos */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 36 }}>
            {[
              "Más de 50 plantillas notariales listas para usar",
              "Escaneo de DNI y tarjeta verde con la cámara",
              "Expedientes vinculados a tu Google Drive",
            ].map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: "rgba(58,124,165,.2)", border: "1px solid rgba(58,124,165,.4)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  color: "#7ec8e3", fontSize: 10, fontWeight: 700,
                }}>✓</div>
                <span style={{ fontSize: 14, color: "rgba(253,252,250,.58)" }}>{t}</span>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button
              onClick={scrollToForm}
              onMouseEnter={e => e.currentTarget.style.opacity = ".85"}
              onMouseLeave={e => e.currentTarget.style.opacity = "1"}
              style={{
                padding: "13px 28px", borderRadius: 9,
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
              onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,.07)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              style={{
                padding: "13px 22px", borderRadius: 9,
                background: "transparent", border: "1px solid rgba(255,255,255,.15)",
                color: "rgba(255,255,255,.6)", fontSize: 14, fontWeight: 600,
                fontFamily: "'Inter', sans-serif", cursor: "pointer",
                transition: "background .15s",
              }}
            >
              Ya tengo cuenta
            </button>
          </div>
        </div>

        {/* Mockup */}
        <div style={{ flex: "1 1 420px", maxWidth: 500, display: "flex", justifyContent: "center" }}>
          <EditorMockup />
        </div>
      </section>

      {/* ── CÓMO FUNCIONA ──────────────────────────────────────────────────── */}
      <section style={{ padding: "64px 48px", background: "#1e293b" }}>
        <div style={{ maxWidth: 820, margin: "0 auto" }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,.3)", letterSpacing: ".1em", textTransform: "uppercase", marginBottom: 36, textAlign: "center" }}>
            Flujo de trabajo
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 2 }}>
            {[
              {
                n: "01",
                titulo: "Elegís el instrumento",
                texto: "Certificación de firma, poder, acta, escritura de compraventa, hipoteca. Más de 50 plantillas organizadas por tipo.",
              },
              {
                n: "02",
                titulo: "Cargás las partes",
                texto: "Por DNI, escaneando el documento con la cámara, o dictándole a Scriba. CUIT, domicilio y concordancias se completan solos.",
              },
              {
                n: "03",
                titulo: "Generás y exportás",
                texto: "DOCX con márgenes protocolares en segundos. Editá directamente en OnlyOffice antes de imprimir.",
              },
            ].map((paso, i, arr) => (
              <div key={i} style={{
                padding: "28px 28px",
                borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,.06)" : "none",
              }}>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 11, fontWeight: 700, color: C.gold,
                  letterSpacing: ".1em", marginBottom: 14,
                }}>
                  {paso.n}
                </div>
                <div style={{
                  fontFamily: "'Montserrat', sans-serif",
                  fontSize: 14, fontWeight: 700, color: "#FDFCFA", marginBottom: 10,
                }}>
                  {paso.titulo}
                </div>
                <div style={{ fontSize: 13, color: "rgba(253,252,250,.42)", lineHeight: 1.65 }}>
                  {paso.texto}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FORMULARIO + PRIVACIDAD ────────────────────────────────────────── */}
      <section ref={formRef} style={{ padding: "64px 24px", background: C.warm }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "flex", gap: 48, flexWrap: "wrap", alignItems: "flex-start" }}>

          {/* Formulario */}
          <div style={{ flex: "1 1 340px", maxWidth: 440 }}>
            <h2 style={{
              fontFamily: "'Montserrat', sans-serif",
              fontSize: 22, fontWeight: 700, color: C.dark,
              margin: "0 0 8px", letterSpacing: "-.02em",
            }}>
              Solicitar acceso
            </h2>
            <p style={{ fontSize: 14, color: "rgba(26,35,50,.5)", margin: "0 0 28px", lineHeight: 1.6 }}>
              Disponible para escribanos de Mendoza. Completá el formulario y te contactamos.
            </p>

            {estado === "enviado" ? (
              <div style={{
                background: "#FDFCFA", borderRadius: 12,
                border: "1px solid rgba(39,174,96,.2)",
                padding: "36px 24px", textAlign: "center",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: "50%",
                  background: "rgba(39,174,96,.1)", border: "1px solid rgba(39,174,96,.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 14px", color: "#27ae60", fontSize: 16,
                }}>✓</div>
                <div style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 6 }}>
                  Solicitud recibida
                </div>
                <div style={{ fontSize: 13, color: "rgba(26,35,50,.5)" }}>
                  Te contactamos en los próximos días hábiles.
                </div>
              </div>
            ) : (
              <form onSubmit={enviar} style={{
                background: "#FDFCFA", borderRadius: 12,
                border: "1px solid rgba(26,35,50,.08)",
                padding: "28px 24px",
                display: "flex", flexDirection: "column", gap: 18,
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
                <div style={{ display: "flex", gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>Registro</label>
                    <input value={form.registro} onChange={e => set("registro", e.target.value)}
                      placeholder="Ej. 853" style={inp}
                      onFocus={e => e.target.style.borderColor = C.cerulean}
                      onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={lbl}>WhatsApp</label>
                    <input value={form.telefono} onChange={e => set("telefono", e.target.value)}
                      placeholder="261 123-4567" style={inp}
                      onFocus={e => e.target.style.borderColor = C.cerulean}
                      onBlur={e => e.target.style.borderColor = "rgba(26,35,50,.15)"} />
                  </div>
                </div>

                {estado === "error" && (
                  <div style={{ fontSize: 13, color: "#c0392b", padding: "10px 12px", borderRadius: 7, background: "rgba(192,57,43,.05)", border: "1px solid rgba(192,57,43,.15)" }}>
                    Error al enviar. Intentá de nuevo.
                  </div>
                )}

                <button type="submit" disabled={estado === "enviando"}
                  onMouseEnter={e => { if (estado !== "enviando") e.currentTarget.style.opacity = ".85"; }}
                  onMouseLeave={e => e.currentTarget.style.opacity = "1"}
                  style={{
                    padding: "13px", borderRadius: 9,
                    background: estado === "enviando" ? "rgba(58,124,165,.5)" : C.cerulean,
                    border: "none", color: "#fff", fontSize: 14, fontWeight: 700,
                    fontFamily: "'Montserrat', sans-serif",
                    cursor: estado === "enviando" ? "default" : "pointer",
                    transition: "opacity .15s",
                  }}>
                  {estado === "enviando" ? "Enviando..." : "Enviar solicitud"}
                </button>

                <p style={{ margin: 0, fontSize: 11, color: "rgba(26,35,50,.32)", textAlign: "center", lineHeight: 1.5 }}>
                  Tus datos se usan únicamente para contactarte.
                </p>
              </form>
            )}
          </div>

          {/* Privacidad — al lado del formulario */}
          <div id="privacidad" style={{ flex: "1 1 300px", maxWidth: 400, paddingTop: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,.35)", letterSpacing: ".08em", textTransform: "uppercase", marginBottom: 20 }}>
              Privacidad y datos
            </div>
            {[
              {
                titulo: "Datos que recopilamos",
                texto: "Nombre, apellido, DNI y domicilio de los requirentes. Se almacenan en Supabase con acceso exclusivo por registro notarial (Row Level Security).",
              },
              {
                titulo: "Uso de Google Drive",
                texto: "Solicitamos el alcance drive.file: solo creamos y gestionamos archivos propios de Notarial. No accedemos a ningún archivo preexistente en tu Drive.",
              },
              {
                titulo: "Autenticación",
                texto: "Email + contraseña o Google OAuth. Las credenciales las gestiona Supabase Auth — nunca las almacenamos en texto plano.",
              },
              {
                titulo: "Eliminación",
                texto: "Solicitá la baja a lojeda.notarial@gmail.com. Los datos se eliminan en un plazo máximo de 30 días hábiles.",
              },
            ].map((s, i) => (
              <div key={i} style={{ marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.dark, marginBottom: 4 }}>{s.titulo}</div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.52)", lineHeight: 1.65 }}>{s.texto}</div>
              </div>
            ))}
            <div style={{ fontSize: 10, color: "rgba(26,35,50,.28)", marginTop: 12 }}>
              Última actualización: junio de 2026
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer style={{
        background: "#0f172a", padding: "20px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12,
        borderTop: "1px solid rgba(255,255,255,.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <img src="/logo-pen-transparent1.png" alt="" style={{ height: 13, filter: "brightness(0) invert(1)" }}
              onError={e => e.target.style.display = "none"} />
          </div>
          <span style={{ color: "rgba(255,255,255,.35)", fontSize: 12 }}>
            © 2026 Notarial · <span style={{ fontStyle: "italic" }}>Fe Pública Digital</span>
          </span>
        </div>
        <div style={{ display: "flex", gap: 20 }}>
          <a href="#privacidad"
            onMouseEnter={e => e.target.style.color = "rgba(255,255,255,.65)"}
            onMouseLeave={e => e.target.style.color = "rgba(255,255,255,.35)"}
            style={{ color: "rgba(255,255,255,.35)", fontSize: 12, textDecoration: "none" }}>
            Privacidad
          </a>
          <button onClick={onLogin}
            onMouseEnter={e => e.currentTarget.style.color = "rgba(255,255,255,.65)"}
            onMouseLeave={e => e.currentTarget.style.color = "rgba(255,255,255,.35)"}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,.35)", fontSize: 12, cursor: "pointer", padding: 0 }}>
            Iniciar sesión
          </button>
        </div>
      </footer>

    </div>
  );
}
