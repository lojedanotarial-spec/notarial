import { C } from "../constants";

const TOOLS = [
  {
    id: "estimador_dnrpa",
    nombre: "Estimador DNRPA",
    descripcion: "Calculá aranceles de transferencia de automotor: arancel DNRPA, sellos provinciales y gastos fijos por provincia.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="1" y="3" width="15" height="13" rx="2"/>
        <path d="M16 8h4l3 3v5h-7V8z"/>
        <circle cx="5.5" cy="18.5" r="2.5"/>
        <circle cx="18.5" cy="18.5" r="2.5"/>
      </svg>
    ),
    estado: "activo",
    familia: "Automotor",
  },
  {
    id: "presupuesto_notarial",
    nombre: "Presupuesto Notarial",
    descripcion: "Estimá honorarios y sellos ATM para cualquier acto notarial a partir del valor del bien.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
    estado: "activo",
    familia: "General",
  },
  {
    id: "informe_dominio",
    nombre: "Informe de Dominio",
    descripcion: "Consultá el estado registral de un automotor por dominio o número de chasis.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/>
        <line x1="16" y1="13" x2="8" y2="13"/>
        <line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
    estado: "proximo",
    familia: "Automotor",
  },
  {
    id: "calculadora_cuit",
    nombre: "Calculadora CUIT/CUIL",
    descripcion: "Calculá el CUIT o CUIL a partir del DNI y género de la persona.",
    icon: (
      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="4" y="2" width="16" height="20" rx="2"/>
        <line x1="8" y1="6" x2="16" y2="6"/>
        <line x1="8" y1="10" x2="16" y2="10"/>
        <line x1="8" y1="14" x2="12" y2="14"/>
      </svg>
    ),
    estado: "activo",
    familia: "Identidad",
    nota: "Disponible también desde el editor al cargar partes.",
  },
];

const FAMILIA_COLOR = {
  Automotor: { bg: "rgba(58,124,165,.1)",  color: C.cerulean },
  General:   { bg: "rgba(201,169,97,.12)", color: "#a07c30" },
  Identidad: { bg: "rgba(39,174,96,.1)",   color: "#27ae60" },
};

export function HerramientasScreen({ onGo }) {
  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#f5f2ed" }}>

      {/* Header */}
      <div style={{ background: C.dark, padding: "0 24px", height: 52, display: "flex", alignItems: "center", gap: 16, flexShrink: 0 }}>
        <button onClick={() => onGo("home")}
          style={{ background: "transparent", border: "none", color: "rgba(253,252,250,.6)", cursor: "pointer", fontSize: 13, fontFamily: "'Inter',sans-serif" }}>
          ← Inicio
        </button>
        <span style={{ color: "#FDFCFA", fontFamily: "'Montserrat',sans-serif", fontWeight: 700, fontSize: 14 }}>
          Utilidades
        </span>
      </div>

      {/* Contenido */}
      <div style={{ flex: 1, overflowY: "auto", padding: "32px 32px" }}>

        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <p style={{ fontFamily: "'Inter',sans-serif", fontSize: 13, color: C.muted, marginBottom: 28 }}>
            Calculadoras, consultas y utilidades para la práctica notarial.
          </p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
            {TOOLS.map(tool => {
              const fam = FAMILIA_COLOR[tool.familia] || FAMILIA_COLOR.General;
              const activo = tool.estado === "activo";
              return (
                <div key={tool.id}
                  style={{
                    background: "#FDFCFA",
                    borderRadius: 12,
                    border: `1px solid ${activo ? "rgba(26,35,50,.1)" : "rgba(26,35,50,.07)"}`,
                    padding: "20px 20px 18px",
                    display: "flex", flexDirection: "column", gap: 12,
                    opacity: activo ? 1 : 0.72,
                    cursor: activo ? "pointer" : "default",
                    transition: "box-shadow .15s, transform .15s",
                  }}
                  onClick={() => { if (activo) onGo(tool.id); }}
                  onMouseEnter={e => { if (activo) { e.currentTarget.style.boxShadow = "0 4px 18px rgba(26,35,50,.1)"; e.currentTarget.style.transform = "translateY(-1px)"; } }}
                  onMouseLeave={e => { e.currentTarget.style.boxShadow = "none"; e.currentTarget.style.transform = "none"; }}>

                  {/* Icono + familia */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div style={{ color: C.cerulean }}>{tool.icon}</div>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 10,
                      background: fam.bg, color: fam.color, fontFamily: "'Montserrat',sans-serif",
                      letterSpacing: ".04em", textTransform: "uppercase" }}>
                      {tool.familia}
                    </span>
                  </div>

                  {/* Texto */}
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, marginBottom: 6, fontFamily: "'Montserrat',sans-serif" }}>
                      {tool.nombre}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.5, fontFamily: "'Inter',sans-serif" }}>
                      {tool.descripcion}
                    </div>
                    {tool.nota && (
                      <div style={{ fontSize: 11, color: C.cerulean, marginTop: 6, fontFamily: "'Inter',sans-serif" }}>
                        {tool.nota}
                      </div>
                    )}
                  </div>

                  {/* Estado */}
                  <div style={{ marginTop: "auto" }}>
                    {activo ? (
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#27ae60", fontFamily: "'Montserrat',sans-serif" }}>
                        ● Disponible
                      </span>
                    ) : (
                      <span style={{ fontSize: 11, fontWeight: 600, color: C.muted, fontFamily: "'Montserrat',sans-serif",
                        background: "rgba(26,35,50,.05)", padding: "3px 10px", borderRadius: 20 }}>
                        Próximamente
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
