// Subir documentación al expediente desde el celular: lógica pura (api/_driveCelular.js, src/utils/driveCliente.js).
// Spec: specs/documentacion-celular-expediente/. Cubre T3.1 y T3.2.
import { describe, it, expect } from "vitest";
import {
  SESION_VENCE_MS, GRACIA_CONFIRMAR_MS, LIMPIEZA_SESIONES_MS,
  calcularVencimientoSesion, motivoSesionInvalida, sesionVigente, urlSesion, puedeQuitar, resumenSesionParaCelular,
  vencimientoLimpieza,
} from "../../api/_driveCelular.js";
import { ACCIONES_AUDITORIA, armarAuditoria } from "../../api/_drive.js";
import {
  nombreFotoCamara, siguientePendiente, resumenCola, marcarItem, esErrorDeSesion, textoSesionTerminada, cuentaRegresiva,
  marcaIdentificacion, hayIdentificacionEnCurso, ESPERA_IDENTIFICACION_MS, panelEstado, partir, FOTOS_POR_LOTE,
} from "../utils/driveCliente.js";

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
const MIN = 60_000;
const sesion = (extra = {}) => ({ id: "s1", expediente_id: "e1", registro_numero: "9876", usuario_id: "u1", creada_en: new Date(T0).toISOString(), expira_en: new Date(T0 + 30 * MIN).toISOString(), cerrada_en: null, ...extra });

describe("vigencia de la sesión (30 minutos)", () => {
  it("vence a los 30 minutos de generada", () => {
    expect(SESION_VENCE_MS).toBe(30 * MIN);
    expect(new Date(calcularVencimientoSesion(T0)).getTime()).toBe(T0 + 30 * MIN);
  });
  it("sirve hasta el último instante y deja de servir al vencer", () => {
    expect(sesionVigente(sesion(), T0 + 1)).toBe(true);
    expect(sesionVigente(sesion(), T0 + 30 * MIN - 1)).toBe(true);
    expect(sesionVigente(sesion(), T0 + 30 * MIN)).toBe(false);
    expect(motivoSesionInvalida(sesion(), T0 + 31 * MIN)).toBe("vencida");
    expect(motivoSesionInvalida(sesion(), T0 + 1)).toBe(null);
  });
  it("cerrada desde la compu o inexistente", () => {
    expect(motivoSesionInvalida(sesion({ cerrada_en: new Date(T0 + MIN).toISOString() }), T0 + 2 * MIN)).toBe("cerrada");
    expect(sesionVigente(sesion({ cerrada_en: new Date(T0).toISOString() }), T0 + 1)).toBe(false);
    expect(motivoSesionInvalida(null, T0)).toBe("inexistente");
    expect(motivoSesionInvalida(undefined, T0)).toBe("inexistente");
  });
  it("cerrada pesa más que vencida (es lo que más le sirve a quien está en el celular)", () => {
    const s = sesion({ cerrada_en: new Date(T0 + MIN).toISOString() });
    expect(motivoSesionInvalida(s, T0 + 60 * MIN)).toBe("cerrada");
  });
});

describe("gracia para confirmar una subida que ya empezó", () => {
  it("la gracia es de 5 minutos y solo vale para confirmar", () => {
    expect(GRACIA_CONFIRMAR_MS).toBe(5 * MIN);
    const vencida = T0 + 32 * MIN;
    expect(motivoSesionInvalida(sesion(), vencida)).toBe("vencida");
    expect(motivoSesionInvalida(sesion(), vencida, { paraConfirmar: true })).toBe(null);
    expect(motivoSesionInvalida(sesion(), T0 + 35 * MIN - 1, { paraConfirmar: true })).toBe(null);
    expect(motivoSesionInvalida(sesion(), T0 + 35 * MIN, { paraConfirmar: true })).toBe("vencida");
  });
  it("la gracia NO revive una sesión cerrada", () => {
    const s = sesion({ cerrada_en: new Date(T0 + MIN).toISOString() });
    expect(motivoSesionInvalida(s, T0 + 2 * MIN, { paraConfirmar: true })).toBe("cerrada");
  });
});

describe("URL del QR", () => {
  it("arma la dirección de la página del celular", () => {
    expect(urlSesion("https://notarial.lat", "abc_DEF-123")).toBe("https://notarial.lat/s/abc_DEF-123");
  });
});

describe("qué puede quitar el celular", () => {
  const archivo = (extra = {}) => ({ id: "a1", expediente_id: "e1", sesion_id: "s1", borrado_en: null, ...extra });
  it("solo lo subido en esa misma sesión y expediente, que no esté ya borrado", () => {
    expect(puedeQuitar(archivo(), sesion())).toBe(true);
    expect(puedeQuitar(archivo({ sesion_id: "otra" }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ sesion_id: null }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ expediente_id: "e2" }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ borrado_en: new Date(T0).toISOString() }), sesion())).toBe(false);
    expect(puedeQuitar(null, sesion())).toBe(false);
    expect(puedeQuitar(archivo(), null)).toBe(false);
  });
});

describe("lo que ve el celular", () => {
  const archivos = [
    { id: "a1", nombre: "Foto 1.jpg", tamano: 3000, mime_type: "image/jpeg", sesion_id: "s1", borrado_en: null, drive_file_id: "SECRETO-DRIVE", subido_por: "u1", expediente_id: "e1", identificacion: "pendiente" },
    { id: "a2", nombre: "Ajeno.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: "otra", borrado_en: null, drive_file_id: "x", subido_por: "u2", expediente_id: "e1" },
    { id: "a3", nombre: "Quitado.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: "s1", borrado_en: "2026-11-09T15:05:00Z", drive_file_id: "y", expediente_id: "e1" },
    { id: "a4", nombre: "Previo.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: null, borrado_en: null, drive_file_id: "z", expediente_id: "e1" },
  ];
  it("solo los archivos de SU sesión, sin los quitados, y con los campos justos", () => {
    const r = resumenSesionParaCelular(sesion(), { nombre: "Compraventa García", registro_id: "9876" }, archivos, T0 + MIN);
    expect(r).toMatchObject({ vigente: true, motivo: null, expediente_nombre: "Compraventa García" });
    expect(r.archivos.map((a) => a.id)).toEqual(["a1"]);
    expect(Object.keys(r.archivos[0]).sort()).toEqual(["id", "mime_type", "nombre", "tamano"]);
  });
  it("no expone el registro, el usuario, el id de Drive ni nada interno", () => {
    const r = resumenSesionParaCelular(sesion(), { nombre: "X", registro_id: "9876" }, archivos, T0 + MIN);
    expect(JSON.stringify(r)).not.toMatch(/SECRETO-DRIVE|9876|u1|u2|drive_file_id|registro|usuario|e1/);
  });
  it("vencida o cerrada: informa el motivo y no lista archivos", () => {
    const v = resumenSesionParaCelular(sesion(), { nombre: "X" }, archivos, T0 + 40 * MIN);
    expect(v).toMatchObject({ vigente: false, motivo: "vencida", archivos: [] });
    const c = resumenSesionParaCelular(sesion({ cerrada_en: "2026-11-09T15:01:00Z" }), { nombre: "X" }, archivos, T0 + 2 * MIN);
    expect(c).toMatchObject({ vigente: false, motivo: "cerrada", archivos: [] });
  });
  it("inexistente: nada que mostrar", () => {
    expect(resumenSesionParaCelular(null, null, [], T0)).toEqual({ vigente: false, motivo: "inexistente", expediente_nombre: null, expira_en: null, archivos: [] });
  });
});

describe("limpieza de sesiones viejas", () => {
  it("se borran las de más de 7 días", () => {
    expect(LIMPIEZA_SESIONES_MS).toBe(7 * 24 * 3600 * 1000);
    expect(new Date(vencimientoLimpieza(T0)).getTime()).toBe(T0 - 7 * 24 * 3600 * 1000);
  });
});

describe("auditoría de la subida por celular", () => {
  it("las acciones nuevas existen y se pueden armar", () => {
    for (const a of ["celular_abrir", "celular_cerrar", "renombrar"]) {
      expect(ACCIONES_AUDITORIA).toContain(a);
      expect(() => armarAuditoria({ registro: "9876", accion: a })).not.toThrow();
    }
  });
});

describe("nombre de las fotos de la cámara (mientras no haya identificación automática)", () => {
  const f = new Date(2026, 10, 9, 15, 30, 1); // 9/11/2026 15:30:01 hora local
  it("lleva la fecha y la hora", () => {
    expect(nombreFotoCamara(f)).toBe("Foto 09-11-2026 15.30.01.jpg");
    expect(nombreFotoCamara(new Date(2026, 0, 5, 9, 4, 7))).toBe("Foto 05-01-2026 09.04.07.jpg");
  });
  it("dos fotos en el mismo segundo no chocan", () => {
    expect(nombreFotoCamara(f, 1)).toBe("Foto 09-11-2026 15.30.01.jpg");
    expect(nombreFotoCamara(f, 2)).toBe("Foto 09-11-2026 15.30.01 (2).jpg");
    expect(nombreFotoCamara(f, 3)).toBe("Foto 09-11-2026 15.30.01 (3).jpg");
  });
  it("sin caracteres que Drive o Windows rechacen", () => {
    expect(nombreFotoCamara(f, 2)).not.toMatch(/[\\/:*?"<>|]/);
  });
});

describe("cola de subida del celular", () => {
  const cola = [
    { id: "a", estado: "ok" }, { id: "b", estado: "subiendo" }, { id: "c", estado: "esperando" },
    { id: "d", estado: "error" }, { id: "e", estado: "esperando" },
  ];
  it("sigue con el primero que está esperando", () => {
    expect(siguientePendiente(cola).id).toBe("c");
    expect(siguientePendiente([{ id: "a", estado: "ok" }])).toBe(null);
    expect(siguientePendiente([])).toBe(null);
  });
  it("cuenta lo guardado, lo pendiente (incluye lo que se está subiendo) y lo que falló", () => {
    expect(resumenCola(cola)).toEqual({ guardadas: 1, pendientes: 3, fallidas: 1 });
    expect(resumenCola([])).toEqual({ guardadas: 0, pendientes: 0, fallidas: 0 });
  });
  it("marca un ítem sin tocar los demás ni mutar la cola original", () => {
    const nueva = marcarItem(cola, "d", { estado: "esperando", mensaje: "" });
    expect(nueva.find((x) => x.id === "d").estado).toBe("esperando");
    expect(cola.find((x) => x.id === "d").estado).toBe("error");
    expect(nueva.filter((x) => x.estado === "ok")).toHaveLength(1);
  });
  it("reconoce cuándo la sesión terminó y cuándo es solo una falla de esa foto", () => {
    expect(esErrorDeSesion({ status: 410, codigo: "vencida" })).toBe(true);
    expect(esErrorDeSesion({ status: 410, codigo: "cerrada" })).toBe(true);
    expect(esErrorDeSesion({ status: 404, codigo: "inexistente" })).toBe(true);
    expect(esErrorDeSesion({ status: 503, codigo: "rota" })).toBe(false);
    expect(esErrorDeSesion({ status: 413, codigo: "muy_grande" })).toBe(false);
    expect(esErrorDeSesion({ status: 404 })).toBe(false); // un 404 de "no encontré esa foto" no es fin de sesión
    expect(esErrorDeSesion(new Error("Sin conexión"))).toBe(false);
    expect(esErrorDeSesion(null)).toBe(false);
  });
});

describe("mensaje cuando la sesión termina en el medio", () => {
  it("dice qué pasó, cuánto se guardó y cuánto no, y cómo seguir", () => {
    const t = textoSesionTerminada("vencida", { guardadas: 3, sinGuardar: 2 });
    expect(t).toMatch(/El QR venció/);
    expect(t).toMatch(/Se guardaron 3 archivos/);
    expect(t).toMatch(/2 fotos quedaron sin guardar/);
    expect(t).toMatch(/QR nuevo desde la compu/);
  });
  it("singulares y casos sin nada guardado o sin nada pendiente", () => {
    expect(textoSesionTerminada("vencida", { guardadas: 1, sinGuardar: 1 })).toMatch(/Se guardó 1 archivo.*1 foto quedó sin guardar/);
    expect(textoSesionTerminada("cerrada", { guardadas: 0, sinGuardar: 4 })).toMatch(/^Esta sesión se cerró desde la compu\. 4 fotos quedaron sin guardar/);
    expect(textoSesionTerminada("cerrada", { guardadas: 2, sinGuardar: 0 })).not.toMatch(/sin guardar/);
    expect(textoSesionTerminada("inexistente")).toBe("Este código no es válido.");
  });
  it("nunca muestra términos técnicos", () => {
    for (const m of ["vencida", "cerrada", "inexistente", "x"]) expect(textoSesionTerminada(m, { guardadas: 1, sinGuardar: 1 })).not.toMatch(/410|404|token|api|undefined|null/i);
  });
});

describe("cuenta regresiva del QR", () => {
  const exp = new Date(T0 + 30 * MIN).toISOString();
  it("muestra minutos y segundos", () => {
    expect(cuentaRegresiva(exp, T0)).toBe("30:00");
    expect(cuentaRegresiva(exp, T0 + 29 * MIN + 55_000)).toBe("0:05");
    expect(cuentaRegresiva(exp, T0 + 10 * MIN + 1000)).toBe("19:59");
    expect(cuentaRegresiva(exp, T0 + 10 * MIN + 1)).toBe("20:00"); // redondea para arriba: nunca muestra de menos
  });
  it("no baja de 0:00 y tolera fechas inválidas", () => {
    expect(cuentaRegresiva(exp, T0 + 31 * MIN)).toBe("0:00");
    expect(cuentaRegresiva("basura", T0)).toBe("0:00");
    expect(cuentaRegresiva(null, T0)).toBe("0:00");
  });
});

describe("marca de identificación en la lista", () => {
  const ahora = Date.UTC(2026, 10, 9, 15, 10, 0);
  const a = (identificacion, haceMs = 5000) => ({ identificacion, created_at: new Date(ahora - haceMs).toISOString() });
  it("recién subido: 'Identificando…'", () => {
    for (const e of ["pendiente", "procesando"]) expect(marcaIdentificacion(a(e), ahora)).toMatchObject({ clave: "identificando", texto: "Identificando…" });
  });
  it("si lleva más de 3 minutos 'identificando', algo falló: se muestra como 'Sin identificar'", () => {
    expect(marcaIdentificacion(a("pendiente", 4 * MIN), ahora)).toMatchObject({ clave: "sin_identificar" });
    expect(marcaIdentificacion(a("procesando", 3 * MIN - 1), ahora).clave).toBe("identificando");
    expect(ESPERA_IDENTIFICACION_MS).toBe(3 * MIN);
  });
  it("sin identificar, ok y lo que no tiene marca", () => {
    expect(marcaIdentificacion(a("sin_identificar"), ahora)).toMatchObject({ texto: "Sin identificar", tono: "aviso" });
    expect(marcaIdentificacion(a("ok"), ahora)).toMatchObject({ clave: "ok" });
    for (const e of ["manual", null, undefined]) expect(marcaIdentificacion(a(e), ahora)).toBe(null);
    expect(marcaIdentificacion(null, ahora)).toBe(null);
  });
  it("una fecha inválida no rompe: sigue 'identificando'", () => {
    expect(marcaIdentificacion({ identificacion: "pendiente", created_at: "basura" }, ahora).clave).toBe("identificando");
  });
  it("detecta si hay algo en curso (para seguir consultando la lista)", () => {
    expect(hayIdentificacionEnCurso([a("ok"), a("pendiente")], ahora)).toBe(true);
    expect(hayIdentificacionEnCurso([a("ok"), a("sin_identificar"), a("pendiente", 10 * MIN)], ahora)).toBe(false);
    expect(hayIdentificacionEnCurso([], ahora)).toBe(false);
  });
});

describe("panel de estado de la página del celular (un solo mensaje, claro)", () => {
  const it_ = (estado, extra = {}) => ({ id: Math.random().toString(36), estado, progreso: estado === "ok" ? 1 : 0, ...extra });
  it("sin fotos no muestra nada", () => {
    expect(panelEstado([])).toBe(null);
  });
  it("subiendo: dice en qué foto va, de cuántas, y la barra avanza con el progreso de la foto actual", () => {
    const cola = [it_("ok"), it_("subiendo", { progreso: 0.5 }), it_("esperando"), it_("esperando")];
    expect(panelEstado(cola, { conNombre: true })).toMatchObject({ fase: "subiendo", paso: "Paso 1 de 2", titulo: "Subiendo las fotos", detalle: "2 de 4", conBoton: false });
    expect(panelEstado(cola, { conNombre: true }).progreso).toBeCloseTo(1.5 / 4);
  });
  it("sin identificación automática no habla de pasos", () => {
    expect(panelEstado([it_("subiendo")], { conNombre: false }).paso).toBe(null);
  });
  it("cuando terminan las subidas y falta ponerles nombre: paso 2, sin botón, ya están guardadas", () => {
    const p = panelEstado([it_("ok", { porIdentificar: true }), it_("ok", { porIdentificar: true }), it_("ok")], { conNombre: true });
    expect(p).toMatchObject({ fase: "nombrando", paso: "Paso 2 de 2", titulo: "Poniéndoles nombre", conBoton: false, progreso: null });
    expect(p.detalle).toBe("Faltan 2 fotos. Ya están guardadas.");
    expect(panelEstado([it_("ok", { porIdentificar: true })], { conNombre: true }).detalle).toBe("Falta 1 foto. Ya están guardadas.");
  });
  it("todo listo: cuántas se guardaron y el botón Listo", () => {
    expect(panelEstado([it_("ok"), it_("ok"), it_("ok"), it_("ok")])).toMatchObject({ fase: "listo", titulo: "✓ 4 fotos guardadas", detalle: "Ya están en el expediente.", conBoton: true, progreso: 1 });
    expect(panelEstado([it_("ok")]).titulo).toBe("✓ 1 foto guardada");
  });
  it("con errores: no ofrece 'Listo' y manda a reintentar en la lista", () => {
    const p = panelEstado([it_("ok"), it_("ok"), it_("error")]);
    expect(p).toMatchObject({ fase: "con_errores", conBoton: false });
    expect(p.detalle).toMatch(/1 no se pudo subir.*Reintentar/);
    expect(panelEstado([it_("ok"), it_("error"), it_("error")]).detalle).toMatch(/2 no se pudieron subir/);
  });
  it("si no se pudo subir ninguna, lo dice", () => {
    expect(panelEstado([it_("error")])).toMatchObject({ fase: "error", conBoton: false });
  });
  it("sesión terminada: sin botón, remite al aviso", () => {
    expect(panelEstado([it_("ok"), it_("esperando")], { terminada: true })).toMatchObject({ fase: "terminada", conBoton: false });
  });
  it("nunca muestra términos técnicos", () => {
    const todos = [panelEstado([it_("subiendo")], { conNombre: true }), panelEstado([it_("ok", { porIdentificar: true })], { conNombre: true }), panelEstado([it_("ok")]), panelEstado([it_("error")]), panelEstado([it_("ok"), it_("error")])];
    for (const p of todos) expect(`${p.titulo} ${p.detalle}`).not.toMatch(/identific|miniatura|api|token|410|404|undefined|null/i);
  });
});

describe("partir en tandas", () => {
  it("de a 10 por defecto, sin perder ni repetir nada y en orden", () => {
    const l = Array.from({ length: 23 }, (_, i) => i);
    const t = partir(l);
    expect(FOTOS_POR_LOTE).toBe(10);
    expect(t.map((x) => x.length)).toEqual([10, 10, 3]);
    expect(t.flat()).toEqual(l);
  });
  it("lista vacía = ninguna tanda; tamaño a medida", () => {
    expect(partir([])).toEqual([]);
    expect(partir([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
  });
});
