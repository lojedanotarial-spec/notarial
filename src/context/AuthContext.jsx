import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session,       setSession]       = useState(undefined);
  const [usuario,       setUsuario]       = useState(null);
  const [miUsuario,     setMiUsuario]     = useState(null);
  const [miembros,      setMiembros]      = useState([]);
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
      return;
    }

    const { data: yo } = await supabase
      .from("registros")
      .select("*")
      .eq("id", u.registros_id)
      .single();
    setMiUsuario(yo ? { ...yo, is_admin: false } : null);

    const { data: m } = await supabase
      .from("registros")
      .select("*")
      .eq("registro", u.registro_numero)
      .order("rol");
    setMiembros(m || []);
    setPerfilCargado(true);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
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
      options: { redirectTo: window.location.origin },
    });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

  // Admin: cargar todos los miembros de un registro cuando cambia el registro activo
  useEffect(() => {
    if (!miUsuario?.is_admin || !registroActivo) return;
    supabase
      .from("registros")
      .select("*")
      .eq("registro", registroActivo)
      .order("rol")
      .then(({ data }) => setMiembros(data || []));
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
    session, usuario, miUsuario, miembros, iniciales,
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