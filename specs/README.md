# Spec-Driven Development en Notarial

Convención manual (sin herramienta externa) para llevar un ítem del backlog
a código. Un directorio por feature, tres archivos, en orden estricto —
cada uno se aprueba antes de escribir el siguiente.

```
specs/<nombre-en-kebab-case>/
  spec.md    # QUÉ y POR QUÉ — sin una sola decisión técnica
  plan.md    # CÓMO — arquitectura, archivos afectados, decisiones de diseño
  tasks.md   # Lista de pasos concretos y ordenados, derivados del plan
```

## Las tres fases

**1. `spec.md`** — El problema, el comportamiento actual (verificado leyendo
código, no supuesto), el comportamiento deseado como criterios de aceptación
verificables, y qué queda explícitamente fuera de alcance. Cero menciones de
componentes, funciones o archivos específicos — si aparece un nombre de
archivo acá, es una señal de que se coló una decisión de diseño demasiado
pronto.

**2. `plan.md`** — Recién acá se decide la arquitectura: qué archivos cambian,
qué se agrega, qué tradeoffs se toman y por qué. Se escribe DESPUÉS de que el
spec está aprobado — un plan sobre un spec que todavía puede cambiar es
trabajo que se tira.

**3. `tasks.md`** — El plan roto en pasos chicos, ordenados, cada uno algo
que se pueda completar y verificar de forma independiente. Esto es lo que
efectivamente se ejecuta durante la implementación.

## Regla de oro

**No se escribe plan.md hasta que spec.md esté aprobado. No se escribe
tasks.md hasta que plan.md esté aprobado. No se toca código de producción
hasta que tasks.md esté aprobado.** Cada fase es una pausa real, no un
trámite — es la revisión la que hace que el método valga la pena, no los
documentos en sí.

La implementación sigue el flujo normal del repo: rama propia, PR, y el
ítem se mueve de "🔵 En curso" a "✅ Recién terminado" en `BACKLOG.md`
recién cuando el PR está mergeado.
