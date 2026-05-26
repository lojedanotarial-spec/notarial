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
    if (!session || guardandoRef.current) return;
    guardandoRef.current = true;
    try {
      const titulo = mensajes.find(m => m.role === "user")?.content?.slice(0, 60) || "Consulta";
      if (conversacionId) {
        await supabase
          .from("scriba_conversaciones")
          .update({ mensajes, updated_at: new Date().toISOString() })
          .eq("id", conversacionId);
      } else {
        const { data } = await supabase
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
        if (data) setConversacionId(data.id);
      }
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

  return {
    conversacionId,
    historial,
    cargandoInicio,
    mensajesIniciales,
    guardar,
    nueva,
    cargarConversacion,
  };
}
