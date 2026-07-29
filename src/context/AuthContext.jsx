import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

// Orden fijo para listas de miembros del registro: titular primero, después
// adscriptos, cualquier otro rol (usuarios sin notario) al final.
const RANGO_ROL = { titular: 0, adscripta: 1, adscripto: 1 };
export function ordenarMiembros(miembros) {
  return (miembros || [])
    .slice()
    .sort((a, b) => (RANGO_ROL[a.rol] ?? 2) - (RANGO_ROL[b.rol] ?? 2));
}

export function AuthProvider({ children }) {
  const [session,       setSession]       = useState(undefined);
  const [usuario,       setUsuario]       = useState(null);
  const [miUsuario,     setMiUsuario]     = useState(null);
  const [miembros,      setMiembros]      = useState([]);
  // Distinto de miembros.length===0: eso no distingue "todavía no llegó la
  // respuesta" de "llegó y el registro no tiene miembros". Sin esta bandera,
  // un admin en un registro sin miembros cargados quedaba con el editor
  // colgado en "Preparando documento..." para siempre (ver bug reportado
  // 29/07/26 — certificación de firma nueva, escribano nunca se completaba).
  const [miembrosCargados, setMiembrosCargados] = useState(false);
  const [registroActivo, setRegistroActivo] = useState(null);
  const [perfilCargado, setPerfilCargado] = useState(false);

  async function cargarPerfil(userId) {
    setPerfilCargado(false);
    const { data: u } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();
    if (!u) { setPerfilCargado(true); return; }
    setUsuario(u);

    if (u.is_admin) {
      setMiUsuario({ nombre: "Admin", apellido: "", is_admin: true });
      setMiembros([]);
      setPerfilCargado(true);
      // Cargar registro propio del admin como default (si tiene registros_id asignado)
      if (u.registros_id) {
        supabase
          .from("registros")
          .select("registro")
          .eq("id", u.registros_id)
          .single()
          .then(({ data }) => { if (data?.registro) setRegistroActivo(data.registro); });
      }
      return;
    }

    const { data: yo } = await supabase
      .from("registros")
      .select("*")
      .eq("id", u.registros_id)
      .single();
    setMiUsuario(yo ? { ...yo, is_admin: false } : null);
    // Para no-admin: activar su propio registro automáticamente
    if (yo?.registro) setRegistroActivo(yo.registro);

    const { data: m } = await supabase
      .from("registros")
      .select("*")
      .eq("registro", yo?.registro || u.registro_numero);
    setMiembros(ordenarMiembros(m));
    setMiembrosCargados(true);
    setPerfilCargado(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.provider_token) {
        localStorage.setItem("provider_token", session.provider_token);
      }
      if (session && !session.provider_token) {
        const saved = localStorage.getItem("provider_token");
        if (saved) session.provider_token = saved;
      }
      setSession(session);
      if (session) cargarPerfil(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      // provider_token solo llega en el SIGNED_IN inicial — lo persistimos para que sobreviva recargas
      if (session?.provider_token) {
        localStorage.setItem("provider_token", session.provider_token);
      }
      // Si ya no viene en la sesión, reinyectarlo desde localStorage
      if (session && !session.provider_token) {
        const saved = localStorage.getItem("provider_token");
        if (saved) session.provider_token = saved;
      }
      if (!session) localStorage.removeItem("provider_token");
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else { setUsuario(null); setMiUsuario(null); setMiembros([]); setPerfilCargado(false); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function loginWithGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        scopes: "https://www.googleapis.com/auth/drive.file",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // Admin: cargar todos los miembros de un registro cuando cambia el registro activo
  useEffect(() => {
    if (!miUsuario?.is_admin || !registroActivo) return;
    setMiembrosCargados(false);
    supabase
      .from("registros")
      .select("*")
      .eq("registro", registroActivo)
      .then(({ data, error }) => {
        if (error) console.error("[AuthContext] Error cargando miembros del registro", registroActivo, error);
        setMiembros(ordenarMiembros(data));
        setMiembrosCargados(true);
      });
  }, [miUsuario?.is_admin, registroActivo]);

  async function actualizarMiembro(id, campos) {
    const { error } = await supabase
      .from("registros")
      .update(campos)
      .eq("id", id);
    if (!error) {
      setMiUsuario(prev => prev?.id === id ? { ...prev, ...campos } : prev);
      setMiembros(prev => prev.map(m => m.id === id ? { ...m, ...campos } : m));
    }
  }

  const iniciales = usuario?.is_admin
    ? "AD"
    : miUsuario
    ? [miUsuario.nombre?.[0], miUsuario.apellido?.[0]].filter(Boolean).join("").toUpperCase()
    : "";

  return (
    <AuthContext.Provider value={{
    session, usuario, miUsuario, miembros, miembrosCargados, iniciales,
    registroActivo, setRegistroActivo,
    login, loginWithGoogle, logout, actualizarMiembro,
    cargando: session === undefined,
    perfilCargado,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}