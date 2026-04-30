import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../supabase";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession]   = useState(undefined);
  const [usuario, setUsuario]   = useState(null);
  const [miUsuario, setMiUsuario] = useState(null);
  const [miembros, setMiembros] = useState([]);

  async function cargarPerfil(userId) {
    const { data: u } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", userId)
      .single();
    if (!u) return;
    setUsuario(u);

    const { data: yo } = await supabase
      .from("registros")
      .select("*")
      .eq("id", u.registros_id)
      .single();
    setMiUsuario(yo || null);

    const { data: m } = await supabase
      .from("registros")
      .select("*")
      .eq("registro", u.registro_numero)
      .order("rol");
    setMiembros(m || []);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) cargarPerfil(session.user.id);
      else { setUsuario(null); setMiUsuario(null); setMiembros([]); }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function login(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }

  async function logout() {
    await supabase.auth.signOut();
  }

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

  const iniciales = miUsuario
    ? [miUsuario.nombre?.[0], miUsuario.apellido?.[0]].filter(Boolean).join("").toUpperCase()
    : "";

  return (
    <AuthContext.Provider value={{
      session, usuario, miUsuario, miembros, iniciales,
      login, logout, actualizarMiembro,
      cargando: session === undefined,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
