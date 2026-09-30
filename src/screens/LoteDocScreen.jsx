import { useState, useEffect, useRef, useCallback } from "react";
import { C, inp } from "../constants";
import { NavBar } from "../components/NavBar";
import { Fg } from "../components/ui/FormElements";
import { InputFecha, InputDinero, InputDecimal } from "../components/ui/Masked";
import { ModalPartes } from "../components/modals/ModalPartes";
import { ConfirmRegenerar } from "../components/ConfirmRegenerar";
import { OnlyOfficeEditor } from "../components/OnlyOfficeEditor";
import { construirVarsLote } from "../utils/generarEscritura";
import { buildDocxGenerico } from "../utils/buildDocxGenerico";
import { useAutoguardado } from "../hooks/useAutoguardado";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";
import { obtenerCarpetaLoteDrive } from "../utils/loteDrive";
import { subirArchivoDrive, reemplazarContenidoArchivoDrive, esErrorSesionVencida } from "../utils/driveHelper";

const ONLYOFFICE_URL = "https://onlyoffice.notarial.lat";

function PanelSection({ label, children, onClick }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => onClick && setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding:"10px 12px", borderRadius:8,
        border:"1px solid " + (hover ? C.cerulean : "rgba(26,35,50,.15)"),
        cursor: onClick ? "pointer" : "default",
        transition:"border-color .12s",
      }}
    >
      <div style={{ fontSize:11, fontWeight:700, color:"rgba(26,35,50,1)",
                    textTransform:"uppercase", letterSpacing:".07em", marginBottom:6 }}>
        {label}
      </div>
      {children}
    </div>
  );
}

function SeccionDocumentacion({ lote, barrio, session, upd }) {
  const [archivos, setArchivos] = useState(null);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    const { data } = await supabase.from("archivos").select("*")
      .eq("lote_id", lote.id).order("created_at", { ascending: false });
    setArchivos(data || []);
  }, [lote.id]);

  useEffect(() => { cargar(); }, [cargar]);

  async function subir(file) {
    if (!session?.provider_token) {
      alert("Necesitás iniciar sesión con Google para subir documentación a Drive.");
      return;
    }
    setSubiendo(true);
    try {
      let folderId = lote.driveFolderId;
      if (!folderId) {
        const { loteFolderId } = await obtenerCarpetaLoteDrive(session, { barrio, lote });
        folderId = loteFolderId;
        upd("driveFolderId", folderId);
      }
      const resultado = await subirArchivoDrive(session, file, file.name, file.type, folderId);
      await supabase.from("archivos").insert({
        lote_id: lote.id, drive_file_id: resultado.id, nombre: file.name, mime_type: file.type, tipo: "documentacion",
      });
      await cargar();
    } catch (e) {
      alert(esErrorSesionVencida(e)
        ? "Tu sesión de Google venció. Cerrá sesión y volvé a iniciarla con Google, después subí el archivo de nuevo."
        : "Error al subir el archivo: " + e.message);
    } finally {
      setSubiendo(false);
    }
  }

  return (
    <PanelSection label="Documentación">
      <input ref={inputRef} type="file" style={{ display:"none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) subir(f); e.target.value = ""; }} />
      {archivos === null ? (
        <div style={{ fontSize:12, color:"rgba(26,35,50,.4)" }}>Cargando...</div>
      ) : archivos.length === 0 ? (
        <div style={{ fontSize:12, color:"rgba(26,35,50,.4)", fontStyle:"italic" }}>Sin documentación subida</div>
      ) : (
        <div style={{ display:"flex", flexDirection:"column", gap:4, marginBottom:6 }}>
          {archivos.map(a => (
            <div key={a.id} style={{ fontSize:12, color:C.dark, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>
              {a.nombre}
            </div>
          ))}
        </div>
      )}
      <div style={{ fontSize:12, color:C.cerulean, marginTop:6, fontWeight:500, cursor: subiendo ? "default" : "pointer" }}
           onClick={() => !subiendo && inputRef.current?.click()}>
        {subiendo ? "Subiendo..." : "+ Subir archivo"}
      </div>
    </PanelSection>
  );
}

function PanelLote({ lote, barrio, session, escribano, miembros, onChange, onCambioInmediato, onCambioDiferido }) {
  const [partesAbierto, setPartesAbierto] = useState(false);
  const upd = (campo, valor) => onChange({ ...lote, [campo]: valor });
  const sInp = { ...inp, fontSize:12, padding:"6px 9px" };

  return (
    <div style={{ flex:1, overflowY:"auto", padding:10, display:"flex", flexDirection:"column", gap:7 }}>

      {/* ESCRIBANO */}
      <PanelSection label="Escribano">
        <Fg label="Seleccionar">
          <select style={sInp} value={lote.escribano || ""} onChange={e => { onCambioDiferido(); upd("escribano", e.target.value); }}>
            {miembros.map(m => {
              const nombre = m.nombre_preferido || `${m.nombre} ${m.apellido}`;
              return <option key={m.id} value={nombre}>{nombre}</option>;
            })}
          </select>
        </Fg>
        <div style={{ fontSize:11, color:"rgba(26,35,50,.5)", marginTop:4 }}>
          {escribano?.caracter} · Reg. {escribano?.registro}
        </div>
      </PanelSection>

      {/* ESCRITURA */}
      <PanelSection label="Escritura">
        <Fg label="N° Escritura">
          <input style={sInp} value={lote.nroEscritura || ""} onChange={e => upd("nroEscritura", e.target.value)} onBlur={onCambioInmediato} placeholder="ej: 29"/>
        </Fg>
        <Fg label="Fecha escritura">
          <InputFecha style={sInp} value={lote.fechaEscritura || ""} onChange={v => upd("fechaEscritura", v)} onBlur={onCambioInmediato}/>
        </Fg>
      </PanelSection>

      {/* DOCUMENTACIÓN — independiente de si ya se generó la escritura;
          en la práctica la documentación llega primero (ver spec). */}
      <SeccionDocumentacion lote={lote} barrio={barrio} session={session} upd={upd} />

      {/* ADQUIRENTES */}
      <PanelSection label="Adquirentes" onClick={() => setPartesAbierto(true)}>
        {(lote.partes || []).length === 0 ? (
          <div style={{ fontSize:12, color:"rgba(26,35,50,.4)", fontStyle:"italic" }}>Sin adquirentes</div>
        ) : (lote.partes || []).map((p, idx) => (
          <div key={idx} style={{
            display:"flex", alignItems:"center", gap:8,
            paddingBottom: idx < lote.partes.length-1 ? 5 : 0,
            marginBottom: idx < lote.partes.length-1 ? 5 : 0,
            borderBottom: idx < lote.partes.length-1 ? "1px solid rgba(26,35,50,.07)" : "none",
          }}>
            <div style={{
              width:22, height:22, borderRadius:"50%", background:C.ceruleanLight,
              display:"flex", alignItems:"center", justifyContent:"center",
              fontSize:9, fontWeight:700, color:C.cerulean, flexShrink:0,
            }}>
              {(p.apellido?.[0] || "?").toUpperCase()}
            </div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontSize:12, fontWeight:600, color:C.dark,
                            whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                {p.apellido}{p.nombre ? ", "+p.nombre : ""}
              </div>
              <div style={{ fontSize:10, color:"rgba(26,35,50,.5)" }}>DNI {p.nroDoc || "-"}</div>
            </div>
          </div>
        ))}
        <div style={{ fontSize:12, color:C.cerulean, marginTop:6, fontWeight:500 }}>
          {lote.partes?.length > 0 ? "+ Editar adquirentes" : "+ Agregar adquirentes"}
        </div>
      </PanelSection>

      {/* INMUEBLE */}
      <PanelSection label="Inmueble">
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          <Fg label="Manzana">
            <input style={sInp} value={lote.manzana || ""} onChange={e => upd("manzana", e.target.value.toUpperCase())} onBlur={onCambioInmediato}/>
          </Fg>
          <Fg label="Lote">
            <input style={sInp} value={lote.lote || ""} onChange={e => upd("lote", e.target.value)} onBlur={onCambioInmediato}/>
          </Fg>
        </div>
        <Fg label="Sup. mensura">
          <InputDecimal style={sInp} value={lote.supMensura || ""} onChange={v => upd("supMensura", v)} onBlur={onCambioInmediato}/>
        </Fg>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
          <Fg label="Título I"><InputDecimal style={sInp} value={lote.supTitulo1 || ""} onChange={v => upd("supTitulo1", v)} onBlur={onCambioInmediato}/></Fg>
          <Fg label="Título II"><InputDecimal style={sInp} value={lote.supTitulo2 || ""} onChange={v => upd("supTitulo2", v)} onBlur={onCambioInmediato}/></Fg>
          <Fg label="Título III"><InputDecimal style={sInp} value={lote.supTitulo3 || ""} onChange={v => upd("supTitulo3", v)} onBlur={onCambioInmediato}/></Fg>
          <Fg label="Título IV"><InputDecimal style={sInp} value={lote.supTitulo4 || ""} onChange={v => upd("supTitulo4", v)} onBlur={onCambioInmediato}/></Fg>
        </div>
      </PanelSection>

      {/* PRECIO */}
      <PanelSection label="Precio">
        <Fg label="Precio total">
          <InputDinero style={sInp} value={lote.precio || ""} onChange={v => upd("precio", v)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Retención ganancias">
          <InputDinero style={sInp} value={lote.retencionGanancias || ""} onChange={v => upd("retencionGanancias", v)} onBlur={onCambioInmediato}/>
        </Fg>
      </PanelSection>

      {/* REGISTRACIONES */}
      <PanelSection label="Registraciones">
        <Fg label="Nomenclatura">
          <input style={sInp} value={lote.nomenclatura || ""} onChange={e => upd("nomenclatura", e.target.value)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Avalúo fiscal">
          <InputDinero style={sInp} value={lote.avaluo || ""} onChange={v => upd("avaluo", v)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Padrón territorial">
          <input style={sInp} value={lote.padronRentas || ""} onChange={e => upd("padronRentas", e.target.value)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Padrón municipal">
          <input style={sInp} value={lote.padronMuni || ""} onChange={e => upd("padronMuni", e.target.value)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="N° cert. registro">
          <input style={sInp} value={lote.certRegistro || ""} onChange={e => upd("certRegistro", e.target.value)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Fecha cert. registro">
          <InputFecha style={sInp} value={lote.fechaRegistro || ""} onChange={v => upd("fechaRegistro", v)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="N° cert. catastro">
          <input style={sInp} value={lote.certCatastro || ""} onChange={e => upd("certCatastro", e.target.value)} onBlur={onCambioInmediato}/>
        </Fg>
        <Fg label="Fecha cert. catastro">
          <InputFecha style={sInp} value={lote.fechaCatastro || ""} onChange={v => upd("fechaCatastro", v)} onBlur={onCambioInmediato}/>
        </Fg>
      </PanelSection>

      {partesAbierto && (
        <ModalPartes
          partes={lote.partes?.length > 0 ? lote.partes : []}
          onApply={partes => { onCambioDiferido(); upd("partes", partes); setPartesAbierto(false); }}
          onClose={() => setPartesAbierto(false)}
          showRol={true}
          loteId={lote.id}
        />
      )}
    </div>
  );
}

export function LoteDocScreen({ lote: loteInicial, barrio, onVolver, onGo }) {
  const { miUsuario, miembros, usuario, registroActivo, session } = useAuth();
  const [lote, setLote] = useState({ ...loteInicial });
  const [panelExpandido, setPanelExpandido] = useState(false);
  const [templateHTML, setTemplateHTML] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [initialDocId, setInitialDocId] = useState(null);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [documentKey, setDocumentKey] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [hasOoEdits, setHasOoEdits] = useState(false);
  const [pendingRegen, setPendingRegen] = useState(false);

  const hasOoEditsRef = useRef(false);
  const hasUnsavedOoEditRef = useRef(false);
  const generatedOnceRef = useRef(false);
  const skipAutoGenerateRef = useRef(false);
  const ignorarEdicionesHastaRef = useRef(0);
  const handleGenerarRef = useRef(null);

  useEffect(() => { hasOoEditsRef.current = hasOoEdits; }, [hasOoEdits]);

  const fechaDeEscritura = () => {
    if (!lote.fechaEscritura) return { dia: new Date().getDate(), mes: new Date().getMonth(), anio: new Date().getFullYear() };
    const [dia, mes, anio] = lote.fechaEscritura.split("/").map(Number);
    return { dia: dia || new Date().getDate(), mes: (mes - 1) || new Date().getMonth(), anio: anio || new Date().getFullYear() };
  };
  const fecha = fechaDeEscritura();

  const escribano = miUsuario ? {
    nombre: miUsuario.nombre_preferido || `${miUsuario.nombre} ${miUsuario.apellido}`,
    caracter: miUsuario.rol === "titular" ? "Notario/a Titular" : "Notario/a Adscripto/a",
    registro: miUsuario.registro,
    circunscripcion: miUsuario.circunscripcion,
    localidad_registro: miUsuario.localidad_registro,
  } : {};

  const docTitle = `Escritura - Mz ${lote.manzana || "?"} Lote ${lote.lote || "?"} - ${barrio.nombre}`;
  const registroNumero = miUsuario?.registro || registroActivo;

  // Cargar template del barrio + doc existente del lote
  useEffect(() => {
    if (!barrio?.id) return;
    async function cargar() {
      setCargando(true);
      const { data: tmpl } = await supabase
        .from("templates_barrio")
        .select("html")
        .eq("barrio_id", barrio.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: doc } = await supabase
        .from("documentos")
        .select("id, document_key, tiene_ediciones_manuales")
        .eq("lote_id", lote.id)
        .maybeSingle();

      const { data: loteData } = await supabase
        .from("lotes")
        .select("datos_json")
        .eq("id", lote.id)
        .maybeSingle();
      if (loteData?.datos_json) {
        setLote({ ...loteData.datos_json, id: lote.id });
      }

      if (doc) {
        setInitialDocId(doc.id);
        if (doc.document_key) {
          // Ya hay un DOCX generado — abrirlo tal cual, sin regenerar.
          // tiene_ediciones_manuales se persiste con certeza cada vez que se
          // generó/editó el documento (ver useAutoguardado) -- se lee ese
          // valor real en vez de asumir "sí" siempre. Documentos viejos, de
          // antes de que existiera esta columna, quedan en null -- ahí sí se
          // asume "sí" de forma conservadora, porque genuinamente no se sabe.
          const { data: urlData } = supabase.storage
            .from("oo-docs")
            .getPublicUrl(`${doc.document_key}.docx`);
          setDocumentUrl(urlData.publicUrl);
          setDocumentKey(doc.document_key);
          setHasOoEdits(doc.tiene_ediciones_manuales !== false);
          generatedOnceRef.current = true;
          skipAutoGenerateRef.current = true;
        }
      }

      setTemplateHTML(tmpl?.html || "<p>Sin modelo cargado para este barrio.</p>");
      setCargando(false);
    }
    cargar();
  }, [barrio?.id, lote.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Guardar lote actualizado en Supabase (datos crudos, no el documento generado)
  const guardarLote = async (loteActualizado) => {
    await supabase.from("lotes").update({ datos_json: loteActualizado }).eq("id", lote.id);
  };

  const handleGenerar = useCallback(async () => {
    if (!templateHTML) return;
    setGenerating(true);
    try {
      const varsLote = construirVarsLote(lote, barrio, escribano, lote.nroEscritura);
      const blob = await buildDocxGenerico({
        contenido: templateHTML,
        partes: lote.partes || [],
        escribano, fecha,
        extravars: varsLote,
      });

      const key = `doc-${Date.now()}`;
      const filePath = `${key}.docx`;
      const { error: uploadError } = await supabase.storage
        .from("oo-docs")
        .upload(filePath, blob, {
          contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          upsert: true,
        });
      if (uploadError) throw new Error(`Error al subir archivo: ${uploadError.message}`);

      const { data: { publicUrl } } = supabase.storage.from("oo-docs").getPublicUrl(filePath);

      setDocumentUrl(publicUrl);
      setDocumentKey(key);
      generatedOnceRef.current = true;
      setHasOoEdits(false);
      hasUnsavedOoEditRef.current = false;
      setPendingRegen(false);
      // El refreshFile de OnlyOffice (disparado por el cambio de documentUrl)
      // dispara su propio onDocumentStateChange al recargar — ignorarlo unos
      // segundos para no confundirlo con una edición manual real.
      ignorarEdicionesHastaRef.current = Date.now() + 3000;

      // Copia en Drive (UC-3) — best-effort: si falla o no hay sesión de
      // Google, no bloquea la generación (que ya terminó bien en oo-docs).
      // Se reemplaza el contenido del mismo archivo en vez de subir uno
      // nuevo cada vez, para que la carpeta del lote no se llene de
      // copias viejas por cada corrección menor.
      if (session?.provider_token) {
        try {
          const { loteFolderId } = await obtenerCarpetaLoteDrive(session, { barrio, lote });
          const mimeDocx = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
          const nombreArchivo = `Escritura - Mz ${lote.manzana || "?"} Lote ${lote.lote || "?"}.docx`;
          const camposNuevos = {};
          if (loteFolderId !== lote.driveFolderId) camposNuevos.driveFolderId = loteFolderId;
          if (lote.driveEscrituraFileId) {
            await reemplazarContenidoArchivoDrive(session, lote.driveEscrituraFileId, blob, mimeDocx);
          } else {
            const subida = await subirArchivoDrive(session, blob, nombreArchivo, mimeDocx, loteFolderId);
            camposNuevos.driveEscrituraFileId = subida.id;
          }
          if (Object.keys(camposNuevos).length > 0) {
            const loteConDrive = { ...lote, ...camposNuevos };
            setLote(loteConDrive);
            await supabase.from("lotes").update({ datos_json: loteConDrive }).eq("id", lote.id);
          }
        } catch (e) {
          console.warn("No se pudo sincronizar la escritura con Drive:", e);
        }
      }
    } catch (e) {
      alert("Error al generar el documento: " + e.message);
    } finally {
      setGenerating(false);
    }
  }, [templateHTML, lote, barrio, escribano, fecha, session]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { handleGenerarRef.current = handleGenerar; }, [handleGenerar]);

  // Generación automática la primera vez (documento sin document_key todavía)
  useEffect(() => {
    if (skipAutoGenerateRef.current) return;
    if (generatedOnceRef.current) return;
    if (!templateHTML) return;
    if (!miUsuario) return;
    const t = setTimeout(() => {
      if (!generatedOnceRef.current && !skipAutoGenerateRef.current) {
        handleGenerarRef.current?.();
      }
    }, 50);
    return () => clearTimeout(t);
  }, [templateHTML, miUsuario]);

  // Regenera (o pide confirmación si hay ediciones manuales de OnlyOffice sin
  // guardar) — mismo mecanismo que EditorScreen (ver plan.md de esta feature).
  const regenerarPorCambio = useCallback(() => {
    if (!generatedOnceRef.current) return;
    if (hasOoEditsRef.current) {
      setPendingRegen(true);
    } else {
      handleGenerarRef.current?.();
    }
  }, []);

  // Cambios discretos (elegir escribano, aplicar el modal de adquirentes):
  // no se puede llamar regenerarPorCambio() en el mismo handler que el
  // setState, porque handleGenerarRef todavía apunta a la versión vieja
  // de handleGenerar (con los datos de ANTES del cambio) hasta que React
  // termine de re-renderizar. Se marca una bandera y un efecto la resuelve
  // después del commit — mismo patrón que generateAfterRef en EditorScreen.
  const generateAfterRef = useRef(false);
  const marcarParaRegenerar = useCallback(() => { generateAfterRef.current = true; }, []);
  useEffect(() => {
    if (generateAfterRef.current) {
      generateAfterRef.current = false;
      regenerarPorCambio();
    }
  }, [lote]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCambioLote = (loteActualizado) => {
    setLote(loteActualizado);
    guardarLote(loteActualizado);
  };

  const { indicador } = useAutoguardado({
    titulo: docTitle,
    estado: "borrador",
    contenido: { lote, barrio, fecha },
    templateKey: "escrituraBarrio",
    documentKey,
    tieneEdicionesManuales: hasOoEdits,
    // Bloqueado hasta terminar de cargar: initialDocId llega de una consulta
    // async (ver "Cargar template del barrio" más arriba) — si el autoguardado
    // arrancara antes de que resuelva, podría insertar un documento duplicado
    // para el mismo lote en vez de actualizar el que ya existe.
    registroNumero: cargando ? null : registroNumero,
    usuarioId: usuario?.id,
    initialDocId,
  });

  function confirmarSalida() {
    if (!hasUnsavedOoEditRef.current) return true;
    return window.confirm("Hay texto escrito a mano sin guardar. ¿Salís igual?");
  }

  function handleVolver() {
    if (!confirmarSalida()) return;
    onVolver();
  }

  // onGo navega directo (logo, admin) salteando "Volver" — mismo aviso ahí,
  // si no se pierde una edición manual en silencio (ver EditorScreen.handleGo).
  function handleGoConAviso(screen, p) {
    if (!confirmarSalida()) return;
    onGo(screen, p);
  }

  const handleExportar = () => {
    if (!documentUrl) return;
    const a = document.createElement("a");
    a.href = documentUrl;
    a.download = `${docTitle}.docx`;
    a.click();
  };

  if (cargando) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'Inter', sans-serif", color:"rgba(26,35,50,.5)" }}>
        Cargando documento...
      </div>
    );
  }

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Inter', sans-serif", overflow:"hidden" }}>
      <NavBar
        screenTitle={`Mz ${lote.manzana || "?"} · Lote ${lote.lote || "?"} · ${barrio.nombre}`}
        estado="borrador"
        onExport={handleExportar}
        indicadorGuardado={generating ? "Generando documento..." : indicador}
        onGo={handleGoConAviso}
        onVolver={handleVolver}
      />

      <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
        {/* DOCUMENTO (editor unificado) */}
        <div style={{ flex:1, position:"relative", display:"flex", overflow:"hidden" }}>
          <OnlyOfficeEditor
            documentUrl={documentUrl}
            documentKey={documentKey}
            documentTitle={docTitle}
            serverUrl={ONLYOFFICE_URL}
            onEdit={() => {
              if (Date.now() < ignorarEdicionesHastaRef.current) return;
              setHasOoEdits(true);
              hasUnsavedOoEditRef.current = true;
            }}
          />
        </div>

        {/* PANEL LATERAL — sin overflow:hidden a propósito: el handle de
            abajo vive a left:-11px, fuera del propio borde del panel, y
            necesita poder asomar (mismo patrón que EditorScreen). */}
        <div style={{ width: panelExpandido ? 420 : 240, flexShrink:0, background:C.porcelain,
                      borderLeft:"1px solid rgba(26,35,50,.15)",
                      display:"flex", flexDirection:"column",
                      transition:"width .2s ease", position:"relative" }}>
          {/* Handle flotante para expandir/contraer — mismo patrón que EditorScreen */}
          <button
            onClick={() => setPanelExpandido(e => !e)}
            title={panelExpandido ? "Contraer panel" : "Expandir panel"}
            style={{
              position:"absolute", left:-11, top:"50%", transform:"translateY(-50%)",
              width:16, height:44, borderRadius:"8px 0 0 8px", zIndex:210,
              border:"1px solid rgba(26,35,50,.15)", borderRight:"none",
              background:C.porcelain, color:"rgba(26,35,50,.45)",
              cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center",
              boxShadow:"-2px 0 6px rgba(26,35,50,.08)",
            }}>
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              {panelExpandido
                ? <path d="M5 2.5L8.5 6 5 9.5"/>
                : <path d="M7 2.5L3.5 6 7 9.5"/>
              }
            </svg>
          </button>
          <div style={{ padding:"12px 14px", borderBottom:"1px solid rgba(26,35,50,.1)",
                        fontSize:14, fontWeight:700, color:C.dark }}>
            Datos del lote
          </div>
          <PanelLote
            lote={lote}
            barrio={barrio}
            session={session}
            escribano={escribano}
            miembros={miembros}
            onChange={handleCambioLote}
            onCambioInmediato={regenerarPorCambio}
            onCambioDiferido={marcarParaRegenerar}
          />
        </div>
      </div>

      {pendingRegen && (
        <ConfirmRegenerar
          onConfirm={() => { setHasOoEdits(false); setPendingRegen(false); handleGenerarRef.current?.(); }}
          onCancel={() => setPendingRegen(false)}
        />
      )}
    </div>
  );
}
