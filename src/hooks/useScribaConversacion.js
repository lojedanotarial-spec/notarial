import { useState, useEffect, useRef } from "react";
import { supabase } from "../supabase";
import { useAuth } from "../context/AuthContext";

export function useScribaConversacion() {
  const { session, registroActivo, usuario } = useAuth();
  const registroId = usuario?.registro_numero || registroActivo || null;
  const [conversacionId, setConversacionId] = useState(null);
  const [historial,      setHistorial]      = useState([]);
  const [cargandoInicio, setCargandoInicio] = useState(true);
  const [mensajesIniciales, setMensajesIniciales] = useState([]);
  const guardandoRef = useRef(false);

  useEffect(() => {
    if (!session) return;
    cargarUltima();
  }, [session]);

  async function cargarUltima() {
    setCargandoInicio(true);
    const { data } = await supabase
      .from("scriba_conversaciones")
      .select("id, mensajes, titulo, updated_at")
      .eq("usuario_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(6);

    if (data?.length) {
      const [ultima, ...resto] = data;
      if (ultima.mensajes?.length > 0) {
        setConversacionId(ultima.id);
        setMensajesIniciales(ultima.mensajes);
        setHistorial(resto.filter(c => c.mensajes?.length > 0));
      } else {
        setHistorial(data.filter(c => c.mensajes?.length > 0).slice(0, 5));
      }
    }
    setCargandoInicio(false);
  }

  async function guardar(mensajes) {
    if (!session) return;
    // Si hay un save en curso, programar otro al terminar en lugar de descartar
    if (guardandoRef.current) {
      setTimeout(() => guardar(mensajes), 400);
      return;
    }
    guardandoRef.current = true;
    try {
      const titulo = mensajes.find(m => m.role === "user")?.content?.slice(0, 60) || "Consulta";
      if (conversacionId) {
        const { error } = await supabase
          .from("scriba_conversaciones")
          .update({ mensajes, updated_at: new Date().toISOString() })
          .eq("id", conversacionId);
        if (error) console.error("[scriba] Error guardando conversación:", error.message);
      } else {
        const { data, error } = await supabase
          .from("scriba_conversaciones")
          .insert({
            usuario_id:  session.user.id,
            registro_id: registroId,
            mensajes,
            titulo,
            modo: "consulta",
          })
          .select("id")
          .single();
        if (error) console.error("[scriba] Error creando conversación:", error.message);
        if (data) setConversacionId(data.id);
      }
    } catch(e) {
      console.error("[scriba] Error inesperado en guardar:", e.message);
    } finally {
      guardandoRef.current = false;
    }
  }

  async function nueva() {
    setConversacionId(null);
    setMensajesIniciales([]);
    await cargarHistorial();
  }

  async function cargarHistorial() {
    const { data } = await supabase
      .from("scriba_conversaciones")
      .select("id, mensajes, titulo, updated_at")
      .eq("usuario_id", session.user.id)
      .order("updated_at", { ascending: false })
      .limit(5);
    setHistorial((data || []).filter(c => c.mensajes?.length > 0));
  }

  async function cargarConversacion(conv) {
    setConversacionId(conv.id);
    setMensajesIniciales(conv.mensajes || []);
    setHistorial([]);
  }

  async function eliminarConversacion(id) {
    await supabase.from("scriba_conversaciones").delete().eq("id", id);
    if (conversacionId === id) {
      setConversacionId(null);
      setMensajesIniciales([]);
    }
    setHistorial(prev => prev.filter(c => c.id !== id));
  }

  return {
    conversacionId,
    historial,
    cargandoInicio,
    mensajesIniciales,
    guardar,
    nueva,
    cargarConversacion,
    eliminarConversacion,
  };
}
