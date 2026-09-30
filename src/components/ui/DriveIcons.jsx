// Íconos para las acciones de Drive (ver carpeta / subir archivo), usados en
// NavBar, ExpedienteDetailScreen y la tabla de lotes de Carga Masiva.
// IconoDrive es el logo real de Google Drive (path de simple-icons, CC0 --
// pensado justo para este uso: mostrar la marca en apps de terceros).

export function IconoDrive({ size = 13 }) {
  return (
    <svg width={size} height={size * (78 / 87.3)} viewBox="0 0 87.3 78" style={{ flexShrink: 0 }}>
      <path d="M6.6 66.85l3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da"/>
      <path d="M43.65 25l-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44a9.06 9.06 0 0 0-1.2 4.5h27.5z" fill="#00ac47"/>
      <path d="M73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335"/>
      <path d="M43.65 25l13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d"/>
      <path d="M59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc"/>
      <path d="M73.4 26.5l-12.7-22a9.06 9.06 0 0 0-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00"/>
    </svg>
  );
}

export function IconoSubirDrive({ size = 13, color = "currentColor" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <path d="M12 16V4M7 9l5-5 5 5"/>
      <path d="M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3"/>
    </svg>
  );
}
