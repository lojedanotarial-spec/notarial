import { useState, useCallback, useEffect, useRef } from "react";
import { C, ZOOM_LEVELS, FUENTES } from "../constants";
import { NavBar } from "../components/NavBar";
import { PageEditor } from "../components/PageEditor";
import { TbBtn, Dropdown, DdSection, DdItem } from "../components/ui/Toolbar";
import { supabase } from "../supabase";
import { usePagination } from "../hooks/usePagination";

const DEBOUNCE = 2000;
const CONTENIDO_VACIO = "<p>Este barrio no tiene modelo cargado todavía.</p><p>Notarial cargará el modelo cuando reciba el documento del escribano.</p>";

function TbSep() {
  return <div style={{ width:1, height:20, background:"rgba(26,35,50,.13)", margin:"0 6px", flexShrink:0 }}/>;
}

function EditorModelo({ barrio, templateId: initTemplateId, htmlInicial, onVolver, onGo }) {
  const [templateId, setTemplateId] = useState(initTemplateId);
  const [guardando,  setGuardando]  = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [zoomIdx,  setZoomIdx]  = useState(4);
  const [fuente,   setFuente]   = useState(FUENTES[0]);
  const [fontSize, setFontSize] = useState(11);
  const [ddOpen,   setDdOpen]   = useState(null);
  const [hojaOn,   setHojaOn]   = useState(true);
  const [showVars, setShowVars] = useState(true);
  const activeEditor = useRef(null);
  const timerRef     = useRef(null);
  const zoom = ZOOM_LEVELS[zoomIdx];

  const { pages, updatePage, addPage, removePage, prependToPage } = usePagination(htmlInicial);

  const guardar = useCallback(async (html) => {
    if (!barrio?.id) return;
    setGuardando(true);
    const payload = { barrio_id: barrio.id, html, updated_at: new Date().toISOString() };
    if (templateId) {
      await supabase.from("templates_barrio").update(payload).eq("id", templateId);
    } else {
      const { data } = await supabase.from("templates_barrio")
        .insert({ ...payload, created_at: new Date().toISOString() })
        .select("id").single();
      if (data) setTemplateId(data.id);
    }
    setUltimoGuardado(new Date());
    setGuardando(false);
  }, [barrio?.id, templateId]);

  function handleUpdate(html) {
    updatePage(pages[0].id, html);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => guardar(html), DEBOUNCE);
  }

  const handleOverflow = useCallback((pageId, overflowHTML) => {
    const idx = pages.findIndex(p => p.id === pageId);
    if (idx === -1) return;
    const nextPage = pages[idx + 1];
    if (nextPage) {
      prependToPage(nextPage.id, overflowHTML + nextPage.content.replace(/^<p><\/p>/, ""));
    } else {
      addPage(pageId, overflowHTML);
    }
  }, [pages, addPage, prependToPage]);

  const handleUnderflow = useCallback((pageId) => removePage(pageId), [removePage]);

  const tbCmd = (fn) => () => { const ed = activeEditor.current; if (!ed) return; fn(ed); };

  const indicador = guardando ? "Guardando..." : ultimoGuardado ? "Guardado hace un momento" : "Sin cambios";

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column",
                  fontFamily:"'Montserrat',sans-serif", overflow:"hidden" }}>
      <NavBar
        screenTitle={"Modelo — " + (barrio?.nombre || "")}
        indicadorGuardado={indicador}
        onGuardar={() => { clearTimeout(timerRef.current); guardar(pages.map(p => p.content).join("\n")); }}
        onGo={onGo}
        onVolver={onVolver}
      />

      <div style={{ background:"#f8f6f2", borderBottom:"1px solid rgba(26,35,50,.1)",
                    padding:"0 14px", height:42, flexShrink:0,
                    display:"flex", alignItems:"center", gap:2 }}>
        <TbBtn title="Negrita" onClick={tbCmd(ed => ed.chain().focus().toggleBold().run())}><b>N</b></TbBtn>
        <TbBtn title="Cursiva" onClick={tbCmd(ed => ed.chain().focus().toggleItalic().run())}><i style={{ fontStyle:"italic" }}>I</i></TbBtn>
        <TbBtn title="Subrayado" onClick={tbCmd(ed => ed.chain().focus().toggleUnderline().run())}><span style={{ textDecoration:"underline" }}>S</span></TbBtn>
        <TbSep/>
        <TbBtn title="MAYÚSCULAS" onClick={tbCmd(ed => {
          const { from, to } = ed.state.selection;
          ed.chain().focus().insertContentAt({ from, to }, ed.state.doc.textBetween(from, to).toUpperCase()).run();
        })}><span style={{ fontSize:12, fontWeight:600 }}>AA</span></TbBtn>
        <TbBtn title="minúsculas" onClick={tbCmd(ed => {
          const { from, to } = ed.state.selection;
          ed.chain().focus().insertContentAt({ from, to }, ed.state.doc.textBetween(from, to).toLowerCase()).run();
        })}><span style={{ fontSize:12 }}>aa</span></TbBtn>
        <TbSep/>
        <div style={{ position:"relative" }}>
          <TbBtn active={ddOpen === "formato"} onClick={() => setDdOpen(ddOpen === "formato" ? null : "formato")}>
            {fuente.label}
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M1 2.5l3 3 3-3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </TbBtn>
          <Dropdown open={ddOpen === "formato"}>
            <DdSection label="Fuente">
              {FUENTES.map(f => (
                <DdItem key={f.key} active={fuente.key === f.key}
                        onClick={() => { setFuente(f); setDdOpen(null); activeEditor.current?.chain().focus().setFontFamily(f.family).run(); }}>
                  <span style={{ fontFamily:f.family, fontSize:14 }}>{f.label}</span>
                </DdItem>
              ))}
            </DdSection>
          </Dropdown>
        </div>
        <select value={fontSize} onChange={e => setFontSize(Number(e.target.value))}
          style={{ padding:"3px 4px", border:"1px solid rgba(26,35,50,.2)", borderRadius:5,
                   fontSize:13, background:"#f8f6f2", color:C.dark,
                   fontFamily:"'Montserrat',sans-serif", width:48 }}>
          {[8,9,10,11,12,13,14,16,18].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <TbSep/>
        <TbBtn title="Deshacer" onClick={tbCmd(ed => ed.chain().focus().undo().run())}>↩</TbBtn>
        <TbBtn title="Rehacer" onClick={tbCmd(ed => ed.chain().focus().redo().run())}>↪</TbBtn>
        <TbSep/>
        <TbBtn onClick={() => setZoomIdx(Math.max(0, zoomIdx - 1))}>−</TbBtn>
        <span style={{ fontSize:13, fontWeight:500, color:C.dark, minWidth:38, textAlign:"center" }}>
          {Math.round(zoom * 100)}%
        </span>
        <TbBtn onClick={() => setZoomIdx(Math.min(ZOOM_LEVELS.length - 1, zoomIdx + 1))}>+</TbBtn>
        <TbBtn title="Restablecer zoom" onClick={() => setZoomIdx(4)}>↺</TbBtn>
        <TbSep/>
        <TbBtn active={hojaOn} onClick={() => setHojaOn(!hojaOn)}>Fondo</TbBtn>
        <TbBtn active={showVars} onClick={() => setShowVars(!showVars)}>Variables</TbBtn>
      </div>

      <div style={{ flex:1, background:C.warm, overflowY:"auto", overflowX:"auto",
                    display:"flex", flexDirection:"column", alignItems:"center",
                    padding:"28px 20px", gap:32 }}>
        {pages.map((page, idx) => (
          <PageEditor
            key={page.id}
            page={page}
            pageIndex={idx}
            isFirst={idx === 0}
            hojaOn={hojaOn}
            margenKey="protocolar"
            fuente={fuente}
            fontSize={fontSize}
            zoom={zoom}
            activeEditor={activeEditor}
            showVariables={showVars}
            onOverflow={html => handleOverflow(page.id, html)}
            onUnderflow={() => handleUnderflow(page.id)}
            onUpdate={html => handleUpdate(html)}
          />
        ))}
      </div>
    </div>
  );
}

export function ModeloScreen({ barrio, onVolver, onGo }) {
  const [estado, setEstado] = useState({ cargando: true, html: null, templateId: null });

  useEffect(() => {
    if (!barrio?.id) return;
    async function cargar() {
      const { data } = await supabase
        .from("templates_barrio")
        .select("*")
        .eq("barrio_id", barrio.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
        console.log("template data:", data);

      setEstado({
        cargando: false,
        html: data?.html || CONTENIDO_VACIO,
        templateId: data?.id || null,
      });
    }
    cargar();
  }, [barrio?.id]);

  if (estado.cargando) {
    return (
      <div style={{ height:"100vh", display:"flex", alignItems:"center", justifyContent:"center",
                    fontFamily:"'Montserrat',sans-serif", color:"rgba(26,35,50,.5)" }}>
        Cargando modelo...
      </div>
    );
  }

  return (
    <EditorModelo
      key={barrio.id}
      barrio={barrio}
      templateId={estado.templateId}
      htmlInicial={estado.html}
      onVolver={onVolver}
      onGo={onGo}
    />
  );
}
