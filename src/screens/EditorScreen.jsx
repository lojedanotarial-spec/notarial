import { useAutoguardado } from "../hooks/useAutoguardado";
import { useAuth } from "../context/AuthContext";
import {
  C, FUENTES, INTERLINEADOS, MESES_LABEL,
  PARTE_VACIA, ESCRIBANO_INI, FECHA_HOY, PROTOCOLO_INI, INSTRUMENTO_INI,
  ELABELS, inp,
} from "../constants";
import { diaLetras, anioLetras, gen } from "../utils";
import { NavBar }  from "../components/NavBar";
import { Modal }   from "../components/Modal";
import { Btn }     from "../components/ui/Btn";
import { Warn }    from "../components/ui/FormElements";
import { ModalPartes }    from "../components/modals/ModalPartes";
import { ModalVehiculos } from "../components/modals/ModalVehiculos";
import { ModalEscribano, ModalInstrumento, ModalProtocolo, ModalFecha } from "../components/modals/ModalOtros";
import { ModalFormato }  from "../components/modals/ModalFormato";
import { buildDocxCertFirmaF08, buildDocxBlanco } from "../utils/buildDocx";
import { buildDocxGenerico } from "../utils/buildDocxGenerico";
import { OnlyOfficeEditor }     from "../components/OnlyOfficeEditor";
import { supabase } from "../supabase";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";

const ONLYOFFICE_URL = "https://onlyoffice.notarial.lat";

// Etiquetas contextuales por template — se muestran en el panel de partes cuando no hay rol asignado
const ROLES_CONTEXTUALES = {
  autorizacion_vehiculo:  ["Autorizante", "Autorizado/a"],
  autorizacion_viaje:     ["Autorizante", "Menor"],
  compraventa_urbana:     ["Vendedor/a",  "Comprador/a"],
  compraventa_rural:      ["Vendedor/a",  "Comprador/a"],
  compraventa_ph:         ["Vendedor/a",  "Comprador/a"],
  compraventa_lote:       ["Vendedor/a",  "Comprador/a"],
  boleto_compraventa:     ["Vendedor/a",  "Comprador/a"],
  donacion_inmueble:      ["Donante",     "Donatario/a"],
  donacion_hijo:          ["Donante",     "Donatario/a"],
  donacion_reserva_uso:   ["Donante",     "Donatario/a"],
  poder_especial:         ["Poderdante",  "Apoderado/a"],
  poder_administracion:   ["Poderdante",  "Apoderado/a"],
  poder_irrevocable:      ["Poderdante",  "Apoderado/a"],
  revocacion_poder:       ["Poderdante",  null],
  locacion_inmueble:      ["Locador/a",   "Locatario/a"],
  locacion_comercial:     ["Locador/a",   "Locatario/a"],
  mutuo_simple:           ["Mutuante",    "Mutuario/a"],
  mutuo_hipotecario:      ["Mutuante",    "Mutuario/a"],
  cesion_herencia:        ["Cedente",     "Cesionario/a"],
  cesion_cuotas:          ["Cedente",     "Cesionario/a"],
  cert_firma:             ["Compareciente", null],
  cert_firma_f08:         ["Compareciente", null],
  cert_copia:             ["Requirente",  null],
  fe_vida:                ["Compareciente", null],
};


function PanelSection({ label, onClick, children, alerta }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={e => e.currentTarget.style.borderColor = C.cerulean}
      onMouseLeave={e => e.currentTarget.style.borderColor = "rgba(26,35,50,.15)"}
      style={{
        padding: "10px 12px", borderRadius: 8,
        border: "1px solid rgba(26,35,50,.15)",
        cursor: "pointer", transition: "border-color .12s",
      }}
    >
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 6,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,1)",
          textTransform: "uppercase", letterSpacing: ".07em",
        }}>
          {label}
        </div>
        {alerta && (
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: "#e07070", flexShrink: 0,
          }}/>
        )}
      </div>
      {children}
    </div>
  );
}


export function EditorScreen({ onGo, params = {}, onScribaContexto }) {
  const { miUsuario, miembros, registroActivo } = useAuth();
  const [modal,        setModal]        = useState(null);
  const [estado,       setEstado]       = useState("borrador");
  const [fuente,       setFuente]       = useState(FUENTES[0]);
  const [margenKey,    setMargenKey]    = useState("protocolar");
  const [fontSize,     setFontSize]     = useState(11);
  const [interlineado, setInterlineado] = useState(INTERLINEADOS[0]);
  const [documentUrl,  setDocumentUrl]  = useState(null);
  const [documentKey,  setDocumentKey]  = useState(null);
  const [generating,   setGenerating]   = useState(false);
  const [pluginTick,   setPluginTick]   = useState(0);
  const pluginWindowRef   = useRef(null);
  const pendingInsertRef  = useRef(null);
  const [isDirty,          setIsDirty]          = useState(false);
  const [showVarHighlight, setShowVarHighlight] = useState(true);
  const generatedOnceRef  = useRef(false);
  const handleGenerarRef  = useRef(null);
  const generateAfterRef  = useRef(false);

  const [partes,        setPartes]        = useState(() => params?.partes?.length ? params.partes : [PARTE_VACIA()]);
  const [vehiculos,     setVehiculos]     = useState([]);
  const [escribano,     setEscribano]     = useState(() => miUsuario ? {
    nombre:          miUsuario.nombre_preferido || `${miUsuario.nombre} ${miUsuario.apellido}`,
    caracter:        miUsuario.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
    registro:        miUsuario.registro,
    circunscripcion: miUsuario.circunscripcion,
  } : ESCRIBANO_INI);
  const [templateKey,   setTemplateKey]   = useState(() => {
    if (params?.templateKey) return params.templateKey;
    const SLUG_MAP = {
      cert_firma: "certFirma", cert_firma_f08: "certFirmaF08",
      poder_especial: "poderEspecial", poder_general: "poderGeneral",
      acta_const: "actaConst", auto_viaje: "autViaje", compraventa: "compraventa",
    };
    return SLUG_MAP[params?.templateSlug] || params?.templateSlug || "";
  });
  const [templateId,    setTemplateId]    = useState(params?.templateId  || null);
  const [templateSlug,  setTemplateSlug]  = useState(params?.templateSlug || params?.templateKey || "cert_firma_f08");
  const [templateNombre,setTemplateNombre]= useState("");
  const [fecha,         setFecha]         = useState(() => params?.fecha ?? FECHA_HOY());
  const [protocolo,   setProtocolo]   = useState(PROTOCOLO_INI);
  const [instrumento, setInstrumento] = useState(INSTRUMENTO_INI);

  const { usuario } = useAuth();

  // Para admin: cuando miembros del registro activo se cargan, preseleccionar el titular
  useEffect(() => {
    if (!miUsuario?.is_admin || !registroActivo || params?.docId || miembros.length === 0) return;
    const titular = miembros.find(m => m.rol === "titular") || miembros[0];
    if (titular) {
      const ROL_CARACTER = {
        titular:   titular.genero === "f" ? "Notaria Titular"   : "Notario Titular",
        adscripta: "Notaria Adscripta",
        adscripto: "Notario Adscripto",
      };
      setEscribano({
        nombre:          titular.nombre_preferido || `${titular.nombre} ${titular.apellido}`,
        caracter:        ROL_CARACTER[titular.rol] || "Notario/a Titular",
        registro:        titular.registro,
        circunscripcion: titular.circunscripcion,
      });
    }
  }, [miUsuario?.is_admin, registroActivo, miembros]);

  const [templateContenido, setTemplateContenido] = useState("");
  const [templateVarsSchema, setTemplateVarsSchema] = useState([]); // [{name,label,type,placeholder,required}]
  const [extravars, setExtravars] = useState({});                   // {VARIABLE_NAME: valor}

  // Cargar nombre, contenido y variables_json del template desde Supabase
  useEffect(() => {
    if (!templateId) return;
    supabase.from("templates").select("nombre, slug, contenido, variables_json").eq("id", templateId).single()
      .then(({ data }) => {
        if (data) {
          setTemplateNombre(data.nombre);
          setTemplateSlug(data.slug || "");
          setTemplateContenido(data.contenido || "");
          const schema = Array.isArray(data.variables_json) ? data.variables_json : [];
          setTemplateVarsSchema(schema);
          // inicializar extravars vacíos
          const init = {};
          schema.forEach(v => { init[v.name] = ""; });
          setExtravars(init);
        }
      });
  }, [templateId]);

  const SLUGS_CON_GENERADOR = ["cert_firma_f08", "certFirmaF08", "cert_firma", "certFirma"];

  const handleGenerar = useCallback(async () => {
    const instrTexto  = instrumento.descripcion || "el instrumento adjunto a la presente Actuación Notarial";
    const fechaLetras = diaLetras(fecha.dia) + " días del mes de " + MESES_LABEL[fecha.mes] + " de " + anioLetras(fecha.anio);
    setGenerating(true);
    try {
      const blob = SLUGS_CON_GENERADOR.includes(templateSlug)
        ? await buildDocxCertFirmaF08({
            partes, escribano, fecha, protocolo, instrumento,
            instrTexto, fechaLetras, gen,
            showRol: ["cert_firma_f08", "certFirmaF08"].includes(templateSlug),
            margenKey, fontSize, fuente, interlineado,
            showVarHighlight,
          })
        : templateContenido
          ? await buildDocxGenerico({
              contenido: templateContenido,
              partes, escribano, fecha, protocolo, instrumento,
              margenKey, fontSize, fuente, interlineado,
              extravars, vehiculos,
              rolesContextuales: ROLES_CONTEXTUALES[templateSlug] || null,
            })
          : await buildDocxBlanco({ escribano, margenKey, fontSize, fuente });

      const key      = `doc-${Date.now()}`;
      const filePath = `${key}.docx`;

      const { error: uploadError } = await supabase.storage
        .from("oo-docs")
        .upload(filePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage
        .from("oo-docs")
        .getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      setDocumentKey(key);
      generatedOnceRef.current = true;
      setIsDirty(false);
    } catch (e) {
      alert("Error al generar el documento: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [partes, escribano, fecha, protocolo, instrumento, margenKey, fontSize, fuente, interlineado, showVarHighlight, templateContenido, templateSlug]);

  // Keep ref updated so the mount effect can call the latest version
  useEffect(() => { handleGenerarRef.current = handleGenerar; }, [handleGenerar]);


  // Auto-generate once on mount (delay lets the admin escribano effect settle first)
  useEffect(() => {
    const t = setTimeout(() => handleGenerarRef.current?.(), 800);
    return () => clearTimeout(t);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Mark dirty + auto-generate si viene de un modal (flag generateAfterRef)
  useEffect(() => {
    if (!generatedOnceRef.current) return;
    setIsDirty(true);
    if (generateAfterRef.current) {
      generateAfterRef.current = false;
      handleGenerarRef.current?.();
    }
  }, [partes, escribano, fecha, protocolo, instrumento, margenKey, fontSize, fuente, interlineado, showVarHighlight]);

  // Vehiculos y extravars siempre regeneran — no dependen del flag
  useEffect(() => {
    if (!generatedOnceRef.current) return;
    setIsDirty(true);
    handleGenerarRef.current?.();
  }, [vehiculos, extravars]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CARGA DE DOCUMENTO EXISTENTE ──────────────────────────────────────────
  useEffect(() => {
    if (!params.docId) return;
    async function cargar() {
      const { data } = await supabase.from("documentos")
        .select("*").eq("id", params.docId).single();
      if (!data) return;
      const c = data.contenido || {};
      if (c.partes)      setPartes(c.partes);
      if (c.escribano)   setEscribano(c.escribano);
      if (c.fecha)       setFecha(c.fecha);
      if (c.protocolo)   setProtocolo(c.protocolo);
      if (c.instrumento) setInstrumento(c.instrumento);
      if (data.estado)      setEstado(data.estado);
      if (data.template_key) setTemplateKey(data.template_key);
      if (data.template_id)  setTemplateId(data.template_id);
      if (data.tipo_acto)    setTemplateSlug(data.tipo_acto);
    }
    cargar();
  }, [params.docId]);

  const contenidoParaGuardar = useMemo(
    () => ({ partes, escribano, fecha, protocolo, instrumento }),
    [partes, escribano, fecha, protocolo, instrumento]
  );

  useEffect(() => {
    const handler = (e) => setModal(e.detail.modal);
    window.addEventListener("notarial:openmodal", handler);
    return () => window.removeEventListener("notarial:openmodal", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const nuevoContenido = e.detail.contenido;
      setTemplateContenido(nuevoContenido);
      generateAfterRef.current = true;
      setIsDirty(true);
    };
    window.addEventListener("scriba:modificar", handler);
    return () => window.removeEventListener("scriba:modificar", handler);
  }, []);

  // Agregar vehículo desde Scriba (tarjeta verde, título automotor)
  useEffect(() => {
    const handler = (e) => {
      const v = e.detail; // { marca, modelo, tipo_desc, dominio, chasis, motor, tipo_vehiculo }
      setVehiculos(prev => {
        // Si ya existe mismo dominio, actualizar; si no, agregar
        const idx = v.dominio ? prev.findIndex(x => x.dominio === v.dominio) : -1;
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], ...v };
          return updated;
        }
        return [...prev, { id: Date.now() + Math.random(), tipo_vehiculo: "VEHÍCULO", ...v }];
      });
      generateAfterRef.current = true;
      setIsDirty(true);
      setTimeout(() => { generateAfterRef.current = false; handleGenerarRef.current?.(); }, 120);
    };
    window.addEventListener("scriba:completar_vehiculo", handler);
    return () => window.removeEventListener("scriba:completar_vehiculo", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const d = e.detail;
      const dniNuevo = (d.nro_doc || "").replace(/\D/g, "");
      const nuevaParte = {
        id:           Date.now() + Math.random(),
        apellido:     d.apellido     || "",
        nombre:       d.nombre       || "",
        genero:       d.genero       || "",
        nacionalidad: d.nacionalidad || "",
        tipoDoc:      d.tipo_doc     || "DNI",
        nroDoc:       dniNuevo,
        cuit:         d.cuit         || "",
        fechaNac:     d.fecha_nac    || "",
        estadoCivil:  d.estado_civil || "",
        calle:        d.calle        || "",
        numero:       d.numero       || "",
        piso:         d.piso         || "",
        dpto:         d.dpto         || "",
        localidad:    d.localidad    || "",
        departamento: d.departamento || "Ciudad",
        rol:          d.rol          || "",
        representaciones: [],
      };
      setPartes(prev => {
        const parteIdx = typeof d.parte_index === "number" ? d.parte_index : null;

        if (parteIdx !== null) {
          // Posicionamiento explícito: mover la persona al índice indicado
          // Si ya estaba en otra posición, la sacamos de ahí
          const sinEste = dniNuevo ? prev.filter(p => p.nroDoc !== dniNuevo) : [...prev];
          // Asegurar que haya suficientes posiciones
          const vacia = () => ({ id: Date.now() + Math.random(), apellido:"", nombre:"", genero:"", nacionalidad:"", tipoDoc:"DNI", nroDoc:"", cuit:"", fechaNac:"", estadoCivil:"", calle:"", numero:"", piso:"", dpto:"", localidad:"", departamento:"Ciudad", rol:"", representaciones:[] });
          while (sinEste.length < parteIdx) sinEste.push(vacia());
          sinEste.splice(parteIdx, sinEste.length > parteIdx ? 1 : 0, nuevaParte);
          return sinEste;
        }

        // Lógica original: buscar por DNI o agregar nueva
        const idx = dniNuevo ? prev.findIndex(p => p.nroDoc === dniNuevo) : -1;
        if (idx >= 0) {
          const actualizada = { ...prev[idx] };
          if (d.rol)          actualizada.rol         = String(d.rol).toUpperCase();
          if (d.estado_civil) actualizada.estadoCivil = d.estado_civil;
          if (d.apellido)     actualizada.apellido    = d.apellido;
          if (d.nombre)       actualizada.nombre      = d.nombre;
          if (d.cuit)         actualizada.cuit        = d.cuit;
          if (d.calle)        actualizada.calle       = d.calle;
          const updated = [...prev];
          updated[idx] = actualizada;
          return updated;
        }
        const tieneParcial = prev.length === 1 && !prev[0].apellido && !prev[0].nroDoc;
        return tieneParcial ? [nuevaParte] : [...prev, nuevaParte];
      });
      generateAfterRef.current = true;
      setIsDirty(true);
      // Forzar generación aunque el documento no haya sido generado previamente
      setTimeout(() => {
        generateAfterRef.current = false;
        handleGenerarRef.current?.();
      }, 120);
    };
    window.addEventListener("scriba:completar_parte", handler);
    return () => window.removeEventListener("scriba:completar_parte", handler);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const texto = e.detail.texto;
      if (!pluginWindowRef.current) {
        console.warn("[editor] pluginWindowRef.current es null — encolando para cuando el plugin esté listo");
        pendingInsertRef.current = texto;
        return;
      }
      pluginWindowRef.current.postMessage(
        { type: "oo-plugin-data", action: "insertar", texto },
        "*"
      );
    };
    window.addEventListener("scriba:insertar", handler);
    return () => window.removeEventListener("scriba:insertar", handler);
  }, []);

  // Plugin: receive "ready" and "open-modal" messages
  useEffect(() => {
    const handler = (e) => {
      if (!e.data || e.data.type !== "oo-plugin") return;
      if (e.data.action === "ready") {
        pluginWindowRef.current = e.source;
        setPluginTick(t => t + 1);
        if (pendingInsertRef.current) {
          const texto = pendingInsertRef.current;
          pendingInsertRef.current = null;
          e.source.postMessage({ type: "oo-plugin-data", action: "insertar", texto }, "*");
        }
      } else if (e.data.action === "open-modal") {
        setModal(e.data.modal);
      } else if (e.data.action === "regenerar") {
        handleGenerarRef.current?.();
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Plugin: push updated data whenever document state changes or plugin reopens
  useEffect(() => {
    if (!pluginTick || !pluginWindowRef.current) return;
    pluginWindowRef.current.postMessage({
      type: "oo-plugin-data",
      partes, escribano, fecha, protocolo, instrumento,
      fuente, fontSize, margenKey, interlineado, isDirty, generating,
    }, "*");
  }, [partes, escribano, fecha, protocolo, instrumento, fuente, fontSize, margenKey, interlineado, isDirty, generating, pluginTick]);

  const diaStr   = String(fecha.dia).padStart(2, "0");
  const mesStr   = String(fecha.mes + 1).padStart(2, "0");
  const fechaStr = diaStr + "/" + mesStr + "/" + fecha.anio;

  const partesLabel = partes
    .filter(p => p.apellido || p.nombre)
    .map(p => {
      const nombre = [p.apellido, p.nombre].filter(Boolean).join(" ");
      const reprs  = (p.representaciones || [])
        .filter(r => r.razon_social).map(r => r.razon_social).join(", ");
      return reprs ? nombre + " (" + reprs + ")" : nombre;
    })
    .join(", ");

  const tipoLabel = templateNombre || templateKey || "Documento notarial";
  const docTitle  = partesLabel
    ? tipoLabel.replace(/\//g, "-") + " - " + partesLabel + " - " + fechaStr.replace(/\//g, "-")
    : tipoLabel.replace(/\//g, "-") + " - nuevo documento";

  useEffect(() => {
    if (!onScribaContexto) return;
    onScribaContexto({ tipoActo: tipoLabel, partes: partesLabel, fecha: fechaStr, estado, templateContenido, rolesPartes: ROLES_CONTEXTUALES[templateSlug] || null });
    return () => onScribaContexto(null);
  }, [tipoLabel, partesLabel, fechaStr, estado, templateContenido]);

  const { indicador, guardarAhora, hayPendiente } = useAutoguardado({
    titulo: docTitle,
    estado,
    contenido: contenidoParaGuardar,
    templateKey,
    templateId,
    registroNumero: miUsuario?.registro || registroActivo,
    usuarioId: usuario?.id,
    initialDocId: params?.docId,
  });

  const applyAndGen = (setter) => (val) => { generateAfterRef.current = true; setter(val); };

  function handleGo(screen, p) {
    if (hayPendiente) {
      if (!window.confirm("Hay cambios sin guardar. ¿Querés salir igual?")) return;
    }
    onGo(screen, p);
  }

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'Inter', sans-serif", overflow: "hidden",
    }}>

      <NavBar
        docTitle={docTitle}
        estado={estado}
        onStatus={() => setModal("estado")}
        indicadorGuardado={indicador}
        onGuardar={guardarAhora}
        onGo={handleGo}
        showVarHighlight={showVarHighlight}
        onToggleVarHighlight={() => { generateAfterRef.current = true; setShowVarHighlight(v => !v); }}
      />

      {/* BODY */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* Editor */}
        <div style={{ flex: 1, position: "relative", display: "flex", overflow: "hidden" }}>
          <OnlyOfficeEditor
            documentUrl={documentUrl}
            documentKey={documentKey}
            documentTitle={docTitle}
            serverUrl={ONLYOFFICE_URL}
          />
        </div>

        {/* Panel de propiedades */}
        <div style={{
            width: 240, flexShrink: 0, display: "flex", flexDirection: "column",
            borderLeft: "1px solid rgba(26,35,50,.1)", background: C.porcelain, overflow: "hidden",
          }}>
            <div style={{
              padding: "10px 14px 8px", borderBottom: "1px solid rgba(26,35,50,.08)",
              fontSize: 11, fontWeight: 700, color: "rgba(26,35,50,.5)",
              textTransform: "uppercase", letterSpacing: ".07em", flexShrink: 0,
            }}>
              Propiedades del acto
            </div>
            <div style={{ flex: 1, overflowY: "auto" }}>

              <PanelSection label="Escribano" onClick={() => setModal("escribano")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{escribano.nombre || "Sin nombre"}</div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {escribano.caracter || ""} &middot; Reg. {escribano.registro || ""}
                </div>
              </PanelSection>

              <PanelSection label="Fecha y lugar" onClick={() => setModal("fecha")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{fechaStr}</div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {fecha.ciudad || "Ciudad"}, Mendoza
                </div>
              </PanelSection>

              <PanelSection
                label="Partes"
                onClick={() => setModal("partes")}
                alerta={partes.some(p => !p.apellido || !p.nombre)}
              >
                {partes.map((p, i) => {
                  const a0 = p.apellido ? p.apellido[0].toUpperCase() : "?";
                  const n0 = p.nombre   ? p.nombre[0].toUpperCase()   : "";
                  return (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 3, minWidth: 0 }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%", background: "rgba(58,124,165,.12)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 9, fontWeight: 700, color: C.cerulean, flexShrink: 0,
                      }}>{a0 + n0}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: C.dark, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.apellido || "Sin nombre"}{p.nombre ? ", " + p.nombre : ""}
                      </span>
                    </div>
                  );
                })}
                <div style={{ fontSize: 12, color: C.cerulean, fontWeight: 500, marginTop: 3 }}>+ Editar partes</div>
              </PanelSection>

              <PanelSection label="Protocolo" onClick={() => setModal("protocolo")} alerta={!protocolo.nroActa}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>Libro {protocolo.nroLibro || "—"}</div>
                <div style={{ fontSize: 12, color: protocolo.nroActa ? "rgba(26,35,50,.5)" : "#c0392b", fontWeight: protocolo.nroActa ? 400 : 600, marginTop: 2 }}>
                  Acta n&ordm; {protocolo.nroActa || "pendiente"}
                </div>
              </PanelSection>

              <PanelSection label="Instrumento" onClick={() => setModal("instrumento")}>
                <div style={{ fontSize: 14, fontWeight: instrumento.descripcion ? 600 : 400, fontStyle: instrumento.descripcion ? "normal" : "italic", color: instrumento.descripcion ? C.dark : "rgba(26,35,50,.4)" }}>
                  {instrumento.descripcion || "Sin especificar"}
                </div>
              </PanelSection>

              {/* Vehículos — solo para templates que usan VEHICULOS_LISTA */}
              {(templateSlug === "autorizacion_vehiculo" || vehiculos.length > 0) && (
                <PanelSection
                  label={`Vehículos${vehiculos.length ? ` (${vehiculos.length})` : ""}`}
                  onClick={() => setModal("vehiculos")}
                >
                  {vehiculos.length === 0 ? (
                    <div style={{ fontSize:13, fontStyle:"italic", color:"rgba(26,35,50,.4)" }}>Sin vehículos</div>
                  ) : vehiculos.map((v, i) => (
                    <div key={v.id} style={{ fontSize:13, color:C.dark, marginBottom:2 }}>
                      <strong>{v.dominio || `Veh. ${i+1}`}</strong>
                      {v.marca ? ` · ${v.marca}` : ""}
                      {v.modelo ? ` ${v.modelo}` : ""}
                    </div>
                  ))}
                </PanelSection>
              )}

              {/* Variables extra del template (excluir las de vehículo ya gestionadas por el modal) */}
              {templateVarsSchema.filter(v => !v.name.startsWith("VEHICULO_")).length > 0 && (
                <div style={{ padding: "10px 12px", borderTop: "1px solid rgba(26,35,50,.08)" }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "rgba(26,35,50,.45)", marginBottom: 8 }}>
                    Datos del instrumento
                  </div>
                  {templateVarsSchema.filter(v => !v.name.startsWith("VEHICULO_")).map(v => (
                    <div key={v.name} style={{ marginBottom: 10 }}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: C.dark, display: "block", marginBottom: 3 }}>
                        {v.label}{v.required && <span style={{ color: "#c0392b" }}> *</span>}
                      </label>
                      {v.type === "texto_largo" ? (
                        <textarea
                          value={extravars[v.name] || ""}
                          placeholder={v.placeholder || ""}
                          rows={5}
                          onChange={e => setExtravars(prev => ({ ...prev, [v.name]: e.target.value }))}
                          style={{
                            width: "100%", padding: "6px 8px", borderRadius: 6, fontSize: 12,
                            border: "1px solid rgba(26,35,50,.18)", background: "C.porcelain",
                            fontFamily: "'Inter', sans-serif", color: C.dark, resize: "vertical",
                            boxSizing: "border-box", lineHeight: 1.5,
                          }}
                        />
                      ) : (
                        <input
                          type="text"
                          value={extravars[v.name] || ""}
                          placeholder={v.placeholder || ""}
                          onChange={e => setExtravars(prev => ({ ...prev, [v.name]: e.target.value }))}
                          style={{
                            width: "100%", padding: "6px 8px", borderRadius: 6, fontSize: 12,
                            border: "1px solid rgba(26,35,50,.18)", background: "C.porcelain",
                            fontFamily: "'Inter', sans-serif", color: C.dark,
                            boxSizing: "border-box",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              <PanelSection label="Formato" onClick={() => setModal("formato")}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>
                  {fuente.label || "Merriweather"} {fontSize}pt
                </div>
                <div style={{ fontSize: 12, color: "rgba(26,35,50,.5)", marginTop: 2 }}>
                  {margenKey === "protocolar" ? "Protocolar" : "No protocolar"} &middot; {interlineado.label || "Protocolar"}
                </div>
              </PanelSection>

            </div>
            {isDirty && (
              <div style={{ flexShrink: 0, padding: "10px 12px", borderTop: "1px solid rgba(26,35,50,.08)" }}>
                <button
                  onClick={handleGenerar}
                  disabled={generating}
                  style={{
                    width: "100%", padding: "8px", borderRadius: 7, border: "none",
                    background: C.cerulean, color: "#FDFCFA", cursor: generating ? "default" : "pointer",
                    fontFamily: "'Inter', sans-serif", fontSize: 12, fontWeight: 700,
                    opacity: generating ? 0.6 : 1,
                  }}
                >
                  {generating ? "Actualizando..." : "↻ Actualizar documento"}
                </button>
              </div>
            )}
          </div>

      </div>

      {/* MODALES */}
      {modal === "vehiculos"   && <ModalVehiculos vehiculos={vehiculos} onApply={v => { generateAfterRef.current = true; setVehiculos(v); }} onClose={() => setModal(null)}/>}
      {modal === "partes"      && <ModalPartes partes={partes} onApply={applyAndGen(setPartes)} onClose={() => setModal(null)} rolesContextuales={ROLES_CONTEXTUALES[templateSlug]}/>}
      {modal === "escribano"   && <ModalEscribano   escribano={escribano}     onApply={applyAndGen(setEscribano)}   onClose={() => setModal(null)}/>}
      {modal === "instrumento" && <ModalInstrumento instrumento={instrumento} onApply={applyAndGen(setInstrumento)} onClose={() => setModal(null)}/>}
      {modal === "protocolo"   && <ModalProtocolo   protocolo={protocolo}     onApply={applyAndGen(setProtocolo)}   onClose={() => setModal(null)}/>}
      {modal === "fecha"       && <ModalFecha       fecha={fecha}             onApply={applyAndGen(setFecha)}       onClose={() => setModal(null)}/>}
      {modal === "formato"     && <ModalFormato
        fuente={fuente} fontSize={fontSize} margenKey={margenKey} interlineado={interlineado}
        onApply={({ fuente: f, fontSize: fs, margenKey: mk, interlineado: il }) => {
          generateAfterRef.current = true;
          setFuente(f); setFontSize(fs); setMargenKey(mk); setInterlineado(il);
        }}
        onClose={() => setModal(null)}
      />}

      {modal === "estado" && (
        <Modal title="Estado del documento" onClose={() => setModal(null)}
               footer={<><Btn onClick={() => setModal(null)}>Cancelar</Btn>
                          <Btn primary onClick={() => setModal(null)}>Guardar</Btn></>}>
          {[["borrador","Borrador"],["revision","En revisión"],["completo","Completo"]].map(([v2, l]) => (
            <label key={v2} onClick={() => setEstado(v2)}
                   style={{
                     display: "flex", alignItems: "center", gap: 10,
                     padding: "10px 12px",
                     border: "1px solid " + (estado === v2 ? C.cerulean : "rgba(26,35,50,.12)"),
                     borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500,
                     color: C.dark, fontFamily: "'Inter', sans-serif",
                     background: estado === v2 ? C.ceruleanLight : "transparent",
                   }}>
              <input type="radio" name="est" checked={estado === v2}
                     onChange={() => setEstado(v2)} style={{ accentColor: C.cerulean }}/>
              {l}
            </label>
          ))}
          <Warn>Ningún estado bloquea la edición del documento.</Warn>
        </Modal>
      )}


    </div>
  );
}