import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";

const DEBOUNCE = 2000;

export function useAutoguardado({ titulo, estado, contenido, templateKey, templateId, tipoActo, documentKey, registroNumero, usuarioId, initialDocId }) {
  const [docId,          setDocId]          = useState(initialDocId || null);
  const [guardando,      setGuardando]      = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [error,          setError]          = useState(null);
  const [hayPendiente,   setHayPendiente]   = useState(false);
  const timerRef = useRef(null);
  const prevRef  = useRef(null);

  useEffect(() => {
    if (initialDocId) setDocId(initialDocId);
  }, [initialDocId]);

  const guardar = useCallback(async () => {
    if (!registroNumero || !usuarioId) return null;

    setGuardando(true);
    setHayPendiente(false);
    setError(null);

    const payload = {
      titulo,
      estado,
      contenido,
      template_key: templateKey || "",
      ...(templateId    ? { template_id:  templateId  } : {}),
      ...(tipoActo      ? { tipo_acto:    tipoActo    } : {}),
      ...(documentKey   ? { document_key: documentKey } : {}),
      registro_id:  registroNumero,
      usuario_id:   usuarioId,
      updated_at:   new Date().toISOString(),
    };

    try {
      let id = docId;
      if (docId) {
        const { error } = await supabase
          .from("documentos")
          .update(payload)
          .eq("id", docId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("documentos")
          .insert({ ...payload, created_at: new Date().toISOString() })
          .select("id")
          .single();
        if (error) throw error;
        id = data.id;
        setDocId(id);
      }
      setUltimoGuardado(new Date());
      return id;
    } catch (e) {
      setError("Error al guardar");
      setHayPendiente(true);
      console.error(e);
      return null;
    } finally {
      setGuardando(false);
    }
  }, [docId, titulo, estado, contenido, registroNumero, usuarioId, templateKey, tipoActo, documentKey]);

  // Debounce — guarda 2s después del último cambio
  useEffect(() => {
    if (!registroNumero || !usuarioId) return;
    const serializado = JSON.stringify({ titulo, estado, contenido, documentKey });
    if (serializado === prevRef.current) return;
    prevRef.current = serializado;

    setHayPendiente(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => guardar(), DEBOUNCE);

    return () => clearTimeout(timerRef.current);
  }, [titulo, estado, contenido, documentKey, guardar, registroNumero, usuarioId]);

  // Guardar al cerrar la pestaña — listener estable (ref), no se re-registra
  const guardarRef = useRef(guardar);
  guardarRef.current = guardar;
  useEffect(() => {
    const handler = () => guardarRef.current();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const guardarAhora = async () => {
    clearTimeout(timerRef.current);
    return guardar();
  };

  const indicador = guardando
    ? "Guardando..."
    : error
    ? error
    : hayPendiente
    ? "Cambios sin guardar"
    : ultimoGuardado
    ? "Guardado " + formatTiempo(ultimoGuardado)
    : "Sin guardar";

  return { docId, guardando, ultimoGuardado, error, indicador, guardarAhora, hayPendiente };
}

function formatTiempo(fecha) {
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (seg < 10)  return "hace un momento";
  if (seg < 60)  return "hace " + seg + " seg";
  const min = Math.floor(seg / 60);
  if (min < 60)  return "hace " + min + " min";
  return "hace " + Math.floor(min / 60) + " h";
}
