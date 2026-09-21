# Epic: Continuidad y confiabilidad del panel de Scriba

**Estado:** en curso

## Por qué existe

El escribano usa Scriba como un panel flotante mientras trabaja en el resto
de la app — lo abre, lo cierra, cambia de pantalla, vuelve. Hoy el panel se
comporta como si fuera la única cosa que existe en pantalla: cerrarlo
significa perder trabajo en curso, y no hay memoria de qué pasó mientras
estuvo cerrado. Para que Scriba se sienta como una herramienta confiable —
algo en lo que el escribano no tiene que pensar dos veces antes de cerrar —
tiene que sobrevivir a ese uso intermitente.

## Features de este epic

| Feature | Estado |
|---|---|
| [Persistencia del chat al cerrar/reabrir el panel](../features/persistencia-chat-scriba.md) | 🔵 En curso |
| Mejoras UX del panel de Scriba (historial, navegación, presentación) | 🟢 Próximo — sin feature.md todavía |

## Fuera de este epic

- El contenido o calidad de las respuestas de Scriba en sí (eso es
  comportamiento del modelo/prompt, no del panel).
- El módulo de aprendizaje diario y el feedback 👍/👎 — ya implementados,
  son la señal de calidad de respuesta, no de continuidad de la sesión.
