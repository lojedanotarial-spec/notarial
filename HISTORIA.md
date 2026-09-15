# Historia de Notarial — recorrido del proyecto

Este documento es un timeline narrativo: de dónde viene el proyecto, qué se probó y se descartó en el camino, y por qué. Para el detalle línea por línea de cada feature (85 items), ver [`PROYECTO.md` §Historial de Features (cronológico)](PROYECTO.md#historial-de-features-cronológico) — este documento no lo duplica, lo contextualiza.

**Fuente de los datos:** 424 commits de git (31/03/26 → 04/08/26) + el changelog curado de PROYECTO.md + el registro de esta conversación para la parte de infraestructura (que no vive en git — ver más abajo por qué).

---

## Línea de tiempo por fases

**Fase 0 — Fundamentos (31/03/26 – abril, 26 commits)**
Arranque del proyecto. Integración inicial con OnlyOffice, primer intento de hoja protocolar con guillochés en SVG — descartado el mismo día de nacido (ver abajo).

**Fase 1 — Scriba nace (mayo, 124 commits)**
Nace el asistente de IA: UI base, primeros tools (`abrir_editor`, lectura de documentos vía Vision/OCR), persistencia de conversaciones. Se decide sacar el panel lateral de propiedades de React y unificarlo al plugin nativo de OnlyOffice (21/05) — el mes de mayor volumen de cambios de arquitectura del editor.

**Fase 2 — Consolidación de documentos (junio, 212 commits — el mes más pesado)**
El mes de mayor actividad de todo el proyecto. Se unifica la generación de documentos (se elimina la rama F08 hardcodeada, DOCX pasa a ser la fuente de verdad con edición libre persistente en OO), nace el sistema de Expedientes con integración a Google Drive, y se revierte el parser de DNRPA de tabla a texto plano tras comprobar que el original funcionaba mejor.

**Fase 3 — Scriba madura + calidad (julio, 61 commits)**
Scriba unifica el manejo de adjuntos (ya no hay botones separados para "escanear identidad" vs "PDF de referencia" — Scriba decide solo), soporta múltiples documentos por mensaje, aparece el piloto de cláusulas opcionales (Fase 1 de un sistema más ambicioso de bloques que se decide **no** construir completo — ver abajo). Se agrega CI mínimo y un checklist de smoke tests manuales, porque no hay entorno de staging.

**Fase 4 — Crisis de infraestructura (agosto, en curso — no vive en git)**
El trial de Google Cloud vence, la cuenta de facturación queda cerrada, el servidor de OnlyOffice se cae en producción. Arranca una migración de emergencia a Oracle Cloud (Always Free) peleando contra escasez real de hardware, en paralelo con un intento (pausado) de bot de WhatsApp para carga de fotos de documentos. Ver capítulo aparte más abajo.

---

## Tecnologías y enfoques probados y descartados

Lo que sigue son decisiones reales de ida y vuelta, no una lista de features — cosas que se construyeron, se probaron, y se abandonaron a favor de otra cosa.

| Qué se probó | Qué pasó | Por qué se descartó |
|---|---|---|
| Guillochés de hoja protocolar en SVG | Construido y eliminado el mismo día (`af94bab` → `9e43597`, 31/03/26) | El SVG quedó huérfano — se optó por un diseño real de hoja protocolar en su lugar |
| Panel lateral de propiedades en React | Eliminado (`a1a8ab5`, 21/05/26): *"eliminar panel lateral React, usar solo OO plugin panel"* | El plugin nativo de OnlyOffice (`panelRight`) cubría lo mismo sin duplicar UI ni mantener dos sistemas de estado sincronizados |
| Parser de tabla para ingest de DNRPA (automotores) | Revertido (`7fe92c6` + `609dab0`, 10/06/26): *"revert: volver a extract_text() — el parser original era correcto"* | El parser por texto plano resultó más confiable que el de tabla en la práctica |
| F08 como rama de generación de documentos hardcodeada y separada | Unificado a `buildDocxGenerico` (`0b04927`, 22/06/26); limpieza final de los templates muertos recién en julio (changelog #62) | Mantener dos caminos de generación (genérico + F08 especial) duplicaba lógica y bugs — se unificó a un solo builder parametrizable |
| Bloques Fase 2 — descomposición completa del cuerpo del documento + edición quirúrgica vía bookmarks en OnlyOffice | Evaluado, **explícitamente descartado** en favor de un piloto más chico (changelog #81) | Fase 1 (cláusulas opcionales que se agregan al final del cuerpo, con numeración de continuación) resolvía el caso de uso real sin la complejidad de reescribir el motor de documentos |
| Google Cloud Compute (VM propia) para hostear OnlyOffice | Trial vencido 26/08/26, cuenta de facturación cerrada, sin fondos para reactivar | Decisión de no pagar (situación económica del usuario) — migración forzada a una alternativa gratuita |
| WhatsApp Business API (Meta) para carga de fotos por chat | App creada, número de prueba y número real fallan ambos con errores enmascarados de servidor — probablemente gating anti-fraude de cuenta nueva | Pausado por prioridad (la caída de OnlyOffice es más urgente); sin resolver a la fecha |
| Intervalo de reintento agresivo (30s) contra la API de Oracle | Probado el 27/08/26 bajo presión de tiempo, gatilló un rate-limit real (`429`) a los ~18 intentos | Revertido a 75s (el intervalo que ya se había probado seguro por días) + se agregó manejo explícito de 429 |
| Shape grande (2 OCPU/12GB) como primer pedido en Oracle | Cambiado a 1 OCPU/6GB | Pedidos más chicos tienen más chances de encontrar hueco en un pool de capacidad gratuita escaso — se decidió maximizar probabilidad primero, resizear después |
| Proceso de Python corriendo de fondo (background process) para el reintento de Oracle | Migrado a tarea programada de Windows (`Notarial_Oracle_Capacity_Retry`, cada 1-2 min) | El proceso de fondo moría en silencio (sin error) cada vez que la compu se suspendía o reiniciaba, perdiendo horas de reintentos sin aviso; la tarea programada sobrevive eso |
| Pagar Oracle Pay-As-You-Go (~USD 10-20/mes) para saltar la lotería de capacidad gratuita | Evaluado con precios reales, descartado | Sin presupuesto disponible mientras el usuario está sin trabajo — prioridad explícita a gastos esenciales sobre infraestructura |

---

## Capítulo aparte: la crisis de infraestructura de agosto 2026

Esta parte **no está en git** — es trabajo de operaciones/infraestructura (scripts en `scripts/`, tareas programadas de Windows, cuentas de servicios externos) que vive en esta conversación y en `PROYECTO.md` §Migración OnlyOffice / §Bot de WhatsApp, no en commits de código.

**Resumen cronológico:**
1. **12/08/26** — se detecta que el trial de GCP tiene 14 días y USD 110 de crédito restantes.
2. **12-22/08/26** — se decide migrar a Oracle Cloud (Always Free, no un trial) en vez de pagar o abrir otra cuenta de Google. El signup de Oracle resulta un parto propio: rechazos de tarjeta por mismatch de dirección con Banco Nación, resueltos usando el domicilio del DNI y confirmando compras internacionales habilitadas.
3. **22/08/26** — cuenta de Oracle creada (tenancy `lojedanotarial`, São Paulo). Arranca la pelea por conseguir una VM Ampere gratis contra el error "Out of host capacity" — un problema de escasez de hardware real, no de configuración, validado después contra herramientas de comunidad que usan el mismo mecanismo.
4. **22-23/08/26** — en paralelo, se diseña e implementa el esquema de Supabase para un bot de WhatsApp que permitiría cargar fotos de DNI/vehículos directo desde el celular. Se choca con un bloqueo no resuelto del lado de Meta (WhatsApp Business API) — pausado.
5. **26/08/26** — vence el trial de GCP. La cuenta de facturación queda cerrada.
6. **27-28/08/26** — se refuerza el script de reintento de Oracle (maneja cortes de red, corre desacoplado del navegador y de la sesión), y se descubre con evidencia real que reintentar cada 30s gatilla rate-limit — se revierte a un intervalo seguro.
7. **28/08/26** — el servidor de OnlyOffice en GCP deja de responder. Caída real en producción.
8. **31/08/26** — el mecanismo de reintento se migra de un proceso de fondo (que moría en silencio) a una tarea programada de Windows, más resiliente.
9. **01-03/09/26** — se cotiza pagar Oracle directamente (~USD 10-20/mes) para saltar la lotería de capacidad; descartado por falta de presupuesto. Se sigue esperando capacidad gratuita.
10. **A la fecha** — Oracle sigue sin conseguir capacidad. GCP sigue caído. Se preparó (sin desplegar aún) un mensaje de mantenimiento en el editor para reemplazar el loop infinito de "Reconectando..." por un aviso claro.

**Por qué se documenta esto con el mismo peso que el código:** esta crisis consumió más tiempo real de trabajo que varias de las fases de features del proyecto, y las decisiones tomadas acá (qué proveedor, qué intervalo de reintento, cuándo pagar y cuándo no) son tan parte de la historia de Notarial como cualquier commit.
