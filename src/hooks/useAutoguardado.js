import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "../supabase";

const DEBOUNCE = 2000; // guarda 2s después del último cambio

export function useAutoguardado({ titulo, estado, contenido, templateKey, registroNumero, usuarioId, initialDocId }) {
  const [docId,          setDocId]          = useState(initialDocId || null);
  const [guardando,      setGuardando]      = useState(false);
  const [ultimoGuardado, setUltimoGuardado] = useState(null);
  const [error,          setError]          = useState(null);
  const timerRef     = useRef(null);
  const prevRef      = useRef(null);
  const [hayPendiente, setHayPendiente] = useState(false);

  useEffect(() => {
    if (initialDocId) setDocId(initialDocId);
  }, [initialDocId]);

  const guardar = useCallback(async () => {
    if (!registroNumero || !usuarioId) return;

    setGuardando(true);
    setError(null);

    const payload = {
      titulo,
      estado,
      contenido,
      template_key: templateKey || "",
      registro_id:  registroNumero,
      usuario_id:   usuarioId,
      updated_at:   new Date().toISOString(),
    };

    try {
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
        setDocId(data.id);
      }
      setUltimoGuardado(new Date());
    } catch (e) {
      setError("Error al guardar");
      console.error(e);
    } finally {
      setGuardando(false);
    }
  }, [docId, titulo, estado, contenido, registroNumero, usuarioId, templateKey]);

  // Debounce — guarda 2s después del último cambio
  useEffect(() => {
    if (!registroNumero || !usuarioId) return;
    const serializado = JSON.stringify({ titulo, estado, contenido });
    if (serializado === prevRef.current) return;
    prevRef.current = serializado;

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => guardar(), DEBOUNCE);

    return () => clearTimeout(timerRef.current);
  }, [titulo, estado, contenido, guardar, registroNumero, usuarioId]);

  // Guardar al cerrar la pestaña
  useEffect(() => {
    window.addEventListener("beforeunload", guardar);
    return () => window.removeEventListener("beforeunload", guardar);
  }, [guardar]);

  const guardarAhora = () => {
    clearTimeout(timerRef.current);
    guardar();
  };

  const indicador = guardando
    ? "Guardando..."
    : error
    ? error
    : ultimoGuardado
    ? "Guardado " + formatTiempo(ultimoGuardado)
    : "Sin guardar";

  return { docId, guardando, ultimoGuardado, error, indicador, guardarAhora };
}

function formatTiempo(fecha) {
  const seg = Math.floor((Date.now() - fecha.getTime()) / 1000);
  if (seg < 10)  return "hace un momento";
  if (seg < 60)  return "hace " + seg + " seg";
  const min = Math.floor(seg / 60);
  if (min < 60)  return "hace " + min + " min";
  return "hace " + Math.floor(min / 60) + " h";
}
