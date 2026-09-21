# Cómo pasa una idea a ser código, en Notarial

Embudo de cuatro niveles. Cada nivel filtra y concreta al anterior — un
Epic no dice cómo se construye nada, un Spec no dice por qué importa. Ese
espaciado es a propósito: mezclar "por qué" con "cómo" demasiado pronto es
lo que hace que un requerimiento cambie de forma cada vez que se lo toca.

```
epics/<slug>.md       Por qué — un tema grande, dura meses, agrupa features
   ↓
features/<slug>.md    Qué se entrega — una capacidad concreta y acotada
   ↓
usecases/<slug>.md    Escenario — un flujo puntual con un resultado esperado
   ↓
specs/<slug>/         Cómo — spec.md → plan.md → tasks.md (ver specs/README.md)
```

## Qué va en cada nivel

- **Epic** (`epics/`) — el tema. "Continuidad del panel de Scriba", no
  "agregar un aviso". Vive mientras el tema siga siendo relevante; agrupa
  varias features a lo largo del tiempo. Lista sus features con estado.

- **Feature** (`features/`) — una entrega concreta y acotada dentro de un
  epic. Tiene un estado (🔵 En curso / 🟢 Próximo / etc., igual que
  `BACKLOG.md`) y una lista de casos de uso que la componen. Cuando entra
  en curso, apunta a su carpeta en `specs/`.

- **Caso de uso** (`usecases/`) — un escenario concreto: quién, qué
  dispara, qué pasa, qué se espera que pase. Chico a propósito — una
  feature suele tener 2 a 5. Son la materia prima de los criterios de
  aceptación del spec; si un caso de uso cambia, el spec se revisa.

- **Spec** (`specs/`) — folder de tres archivos por feature. Ver
  [`specs/README.md`](specs/README.md) para el detalle de esa fase — es la
  única parte de este embudo que ya estaba documentada antes de meter los
  tres niveles de arriba.

## Regla de alcance

**No se crea una carpeta en `epics/`, `features/` o `usecases/` para algo
que todavía no arrancó.** `BACKLOG.md` es la lista completa de todo lo
pendiente — un ítem del backlog recién se formaliza en este embudo cuando
pasa a "🔵 En curso". Documentar de más algo que ni siquiera sabemos si se
va a hacer es trabajo que se tira, lo mismo que un plan sobre un spec sin
aprobar.

## Ejemplo ya armado (para copiar el patrón)

El primer ciclo completo de este embudo es
[`epics/scriba-continuidad-chat.md`](epics/scriba-continuidad-chat.md) →
[`features/persistencia-chat-scriba.md`](features/persistencia-chat-scriba.md)
→ 4 archivos en `usecases/` → [`specs/persistencia-chat-scriba/`](specs/persistencia-chat-scriba/).
