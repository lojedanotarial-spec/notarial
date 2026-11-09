// Subir documentación al expediente desde el celular: la API (api/drive.js, acciones celular_* y renombrar) con una base y
// un Google de mentira. Spec: specs/documentacion-celular-expediente/. Cubre las tareas T4.2, T4.3 y T4.4.
import { describe, it, expect, vi } from "vitest";
import { GoogleError } from "../../api/_driveGoogle.js";
import { hashCodigo } from "../../api/_drive.js";
import { T0, MB, entorno } from "./_driveHarness.js";

const MIN = 60_000;
const DIAS = 24 * 60 * MIN;

// Un entorno con el Drive del registro 853 conectado y un QR abierto por Fátima en el expediente e853b.
async function conQR(opciones = {}, expedienteId = "e853b") {
  const e = entorno(opciones);
  e.conectar("853");
  const r = await e.llamar({ accion: "celular_crear", expediente_id: expedienteId }, "tok-fati");
  const codigo = r.jsonBody.url.split("/s/")[1];
  return { e, codigo, sesionId: r.jsonBody.sesion_id, respuesta: r };
}
const subir = { nombre: "IMG_4821.jpg", mime: "image/jpeg", tamano: 3 * MB };
const confirmar = (codigo, id = "file-1") => ({ accion: "celular_confirmar", codigo, drive_file_id: id });

describe("T4.2 · la compu abre y cierra el QR", () => {
  it("sin sesión no se puede abrir ni cerrar", async () => {
    const e = entorno();
    for (const accion of ["celular_crear", "celular_cerrar", "renombrar"]) expect((await e.llamar({ accion })).statusCode, accion).toBe(401);
  });
  it("celular_crear: la URL es de la página del celular, vence en 30 minutos y solo se guarda el hash", async () => {
    const { e, codigo, respuesta } = await conQR();
    expect(respuesta.statusCode).toBe(200);
    expect(respuesta.jsonBody.url).toMatch(/^https:\/\/notarial\.lat\/s\/[A-Za-z0-9_-]{40,}$/);
    expect(new Date(respuesta.jsonBody.expira_en).getTime()).toBe(T0 + 30 * MIN);
    const s = e.tablas.drive_sesiones_celular[0];
    expect(s).toMatchObject({ codigo_hash: hashCodigo(codigo), expediente_id: "e853b", registro_numero: "853", usuario_id: "u-fati", usuario_nombre: "Fátima Taha" });
    expect(JSON.stringify(e.tablas.drive_sesiones_celular)).not.toContain(codigo);
    expect(e.auditoria()).toEqual(["celular_abrir"]);
  });
  it("celular_crear: expediente ajeno es 404; sin Drive, 409; con la conexión caída, 503 con mensaje claro", async () => {
    const e = entorno();
    expect((await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati")).jsonBody).toMatchObject({ codigo: "no_conectado" });
    e.conectar("853");
    expect((await e.llamar({ accion: "celular_crear", expediente_id: "e111" }, "tok-fati")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "celular_crear", expediente_id: "no-existe" }, "tok-fati")).statusCode).toBe(404);
    e.tablas.drive_conexiones[0].estado = "rota";
    const r = await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati");
    expect(r.statusCode).toBe(503);
    expect(r.jsonBody.error).toBe("El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.");
    expect(e.tablas.drive_sesiones_celular).toHaveLength(0);
  });
  it("celular_crear: el administrador puede abrirlo para un expediente de otro registro", async () => {
    const e = entorno(); e.conectar("853");
    expect((await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-admin")).statusCode).toBe(200);
  });
  it("celular_crear limpia las sesiones de más de 7 días y respeta las recientes", async () => {
    const e = entorno(); e.conectar("853");
    e.tablas.drive_sesiones_celular.push(
      { id: "vieja", codigo_hash: "h1", expediente_id: "e853b", registro_numero: "853", usuario_id: "u-fati", creada_en: new Date(T0 - 8 * DIAS).toISOString(), expira_en: new Date(T0 - 8 * DIAS + 30 * MIN).toISOString() },
      { id: "reciente", codigo_hash: "h2", expediente_id: "e853b", registro_numero: "853", usuario_id: "u-fati", creada_en: new Date(T0 - 2 * DIAS).toISOString(), expira_en: new Date(T0 - 2 * DIAS + 30 * MIN).toISOString() },
    );
    await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati");
    const ids = e.tablas.drive_sesiones_celular.map((s) => s.id);
    expect(ids).not.toContain("vieja");
    expect(ids).toContain("reciente");
    expect(ids).toHaveLength(2);
  });
  it("celular_cerrar: corta de inmediato, es idempotente y solo la cierra alguien del registro", async () => {
    const { e, codigo, sesionId } = await conQR();
    expect((await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-otro")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody.vigente).toBe(true);
    expect((await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-fati2")).jsonBody).toEqual({ ok: true });
    expect((await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-fati")).jsonBody).toEqual({ ok: true });
    expect(e.auditoria()).toEqual(["celular_abrir", "celular_cerrar"]);
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody).toMatchObject({ vigente: false, motivo: "cerrada" });
    const r = await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir });
    expect(r.statusCode).toBe(410);
    expect(r.jsonBody.error).toMatch(/se cerró desde la compu/);
    expect((await e.llamar({ accion: "celular_cerrar", sesion_id: "no-existe" }, "tok-fati")).statusCode).toBe(404);
  });
});

describe("T4.2 · renombrar a mano", () => {
  async function conArchivo(opciones = {}) {
    const e = entorno(opciones); e.conectar("853");
    const id = (await e.llamar({ accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "otro" }, "tok-fati")).jsonBody.archivo.id;
    return { e, id };
  }
  it("cambia el nombre en Drive y en la base, deja el tipo, marca 'manual' y audita", async () => {
    const { e, id } = await conArchivo();
    const r = await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "DNI García Juan - anverso", tipo: "dni" }, "tok-fati2");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "DNI García Juan - anverso.jpg", tipo: "dni", identificacion: "manual" });
    expect(e.google.renombrar).toHaveBeenCalledWith("acceso-1", "file-1", "DNI García Juan - anverso.jpg");
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ nombre: "DNI García Juan - anverso.jpg", tipo: "dni", identificacion: "manual", nombre_original: "dni.jpg" });
    expect(e.auditoria()).toEqual(["subir", "renombrar"]);
    expect(e.tablas.drive_auditoria[1]).toMatchObject({ usuario_id: "u-fati2" });
    expect(e.tablas.drive_auditoria[1].detalle).toMatchObject({ de: "dni.jpg", a: "DNI García Juan - anverso.jpg", tipo: "dni" });
  });
  it("solo el tipo: no toca el nombre en Drive", async () => {
    const { e, id } = await conArchivo();
    await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "dni.jpg", tipo: "poder" }, "tok-fati");
    expect(e.google.renombrar).not.toHaveBeenCalled();
    expect(e.tablas.expediente_archivos[0].tipo).toBe("poder");
  });
  it("sin cambios no hace nada", async () => {
    const { e, id } = await conArchivo();
    await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "dni.jpg" }, "tok-fati");
    expect(e.google.renombrar).not.toHaveBeenCalled();
    expect(e.auditoria()).toEqual(["subir"]);
  });
  it("nombre vacío o tipo inválido son 400; nombres con rutas se limpian", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "   " }, "tok-fati")).statusCode).toBe(400);
    expect((await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "ok.jpg", tipo: "hackear" }, "tok-fati")).statusCode).toBe(400);
    await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "../../etc/passwd" }, "tok-fati");
    expect(e.tablas.expediente_archivos[0].nombre).toBe("passwd.jpg");
  });
  it("de otro registro, borrado o del almacén viejo: 404", async () => {
    const { e, id } = await conArchivo();
    expect((await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "x.jpg" }, "tok-otro")).statusCode).toBe(404);
    e.tablas.expediente_archivos[0].borrado_en = new Date(T0).toISOString();
    expect((await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "x.jpg" }, "tok-fati")).statusCode).toBe(404);
    e.tablas.expediente_archivos[0].borrado_en = null;
    e.tablas.expediente_archivos[0].almacen = "personal";
    expect((await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "x.jpg" }, "tok-fati")).statusCode).toBe(404);
  });
  it("si Drive falla, no cambia nada en la base y el mensaje es claro", async () => {
    const { e, id } = await conArchivo({ google: { renombrar: vi.fn(async () => { throw new GoogleError({ status: 404 }); }) } });
    const r = await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "otro.jpg" }, "tok-fati");
    expect(r.statusCode).toBe(404);
    expect(r.jsonBody.error).toBe("Ese archivo ya no está en el Drive de la escribanía.");
    expect(e.tablas.expediente_archivos[0].nombre).toBe("dni.jpg");
  });
});

describe("T4.3 · el celular: qué ve", () => {
  it("un código inexistente o malformado no revela nada", async () => {
    const e = entorno();
    for (const codigo of ["corto", "x".repeat(43), undefined, null, 123]) {
      const r = await e.llamar({ accion: "celular_info", codigo });
      expect(r.statusCode).toBe(200);
      expect(r.jsonBody).toEqual({ vigente: false, motivo: "inexistente", expediente_nombre: null, expira_en: null, archivos: [] });
    }
  });
  it("vigente: el nombre del expediente y SOLO los archivos de su sesión, sin datos internos", async () => {
    const { e, codigo, sesionId } = await conQR();
    await e.llamar(confirmar(codigo), undefined);
    e.tablas.expediente_archivos.push(
      { id: "ajeno", expediente_id: "e853b", almacen: "escribania", nombre: "De otra sesión.jpg", tamano: 5, mime_type: "image/jpeg", sesion_id: "otra", drive_file_id: "SECRETO-1", borrado_en: null },
      { id: "previo", expediente_id: "e853b", almacen: "escribania", nombre: "Subido desde la compu.jpg", tamano: 5, mime_type: "image/jpeg", sesion_id: null, drive_file_id: "SECRETO-2", borrado_en: null },
    );
    const r = await e.llamar({ accion: "celular_info", codigo });
    expect(r.jsonBody).toMatchObject({ vigente: true, motivo: null, expediente_nombre: "Poder", drive_disponible: true });
    expect(r.jsonBody.archivos).toHaveLength(1);
    expect(r.jsonBody.archivos[0].nombre).toBe("dni.jpg");
    expect(JSON.stringify(r.jsonBody)).not.toMatch(/SECRETO|De otra sesión|desde la compu|853|u-fati|drive_file_id|registro_numero|usuario/);
    expect(sesionId).toBeTruthy();
  });
  it("avisa si el Drive no está disponible, para que el celular no deje subir a ciegas", async () => {
    const { e, codigo } = await conQR();
    e.tablas.drive_conexiones[0].estado = "rota";
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody.drive_disponible).toBe(false);
  });
  it("vencida o cerrada: informa el motivo y no lista nada", async () => {
    const { e, codigo } = await conQR();
    await e.llamar(confirmar(codigo), undefined);
    e.reloj.t = T0 + 31 * MIN;
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody).toMatchObject({ vigente: false, motivo: "vencida", archivos: [] });
  });
  it("el código del celular NO sirve para ver ni descargar nada, ni para las acciones de la compu", async () => {
    const { e, codigo } = await conQR();
    await e.llamar(confirmar(codigo), undefined);
    const id = e.tablas.expediente_archivos[0].id;
    for (const accion of ["ver", "descargar", "borrar", "estado", "renombrar", "iniciar_subida", "confirmar_subida", "celular_crear"]) {
      expect((await e.llamar({ accion, codigo, archivo_id: id, expediente_id: "e853b" })).statusCode, accion).toBe(401);
    }
  });
});

describe("T4.3 · el celular: subir", () => {
  it("celular_iniciar_subida: usa el expediente de la sesión (aunque el cuerpo diga otro) y devuelve la sesión de Google", async () => {
    const { e, codigo } = await conQR({}, "e853");
    const r = await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir, expediente_id: "e111", registro_numero: "111" });
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody).toMatchObject({ sesion_url: "https://upload.google/sesion-1", nombre: "IMG_4821.jpg", mime: "image/jpeg" });
    expect(Object.keys(r.jsonBody).sort()).toEqual(["mime", "nombre", "sesion_url"]);
    const carpeta = e.tablas.expedientes.find((x) => x.id === "e853").drive_carpeta_escribania_id;
    expect(e.google.abrirSesionSubida.mock.calls[0][1]).toMatchObject({ carpetaId: carpeta, origen: "https://notarial.lat", tamano: 3 * MB });
    expect(e.tablas.expedientes.find((x) => x.id === "e111").drive_carpeta_escribania_id).toBe(null);
  });
  it("rechaza lo de más de 25 MB sin tocar Google, y sin tope de cantidad", async () => {
    const { e, codigo } = await conQR();
    const r = await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir, tamano: 25 * MB + 1 });
    expect(r.statusCode).toBe(413);
    expect(r.jsonBody.error).toMatch(/25 MB/);
    expect(e.google.renovar).not.toHaveBeenCalled();
    for (let i = 0; i < 70; i++) {
      expect((await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir, nombre: `f${i}.jpg` })).statusCode).toBe(200);
    }
  });
  it("vencida, cerrada o ajena: no se puede empezar una subida", async () => {
    const { e, codigo } = await conQR();
    expect((await e.llamar({ accion: "celular_iniciar_subida", codigo: "x".repeat(43), ...subir })).statusCode).toBe(404);
    e.reloj.t = T0 + 30 * MIN;
    const r = await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir });
    expect(r.statusCode).toBe(410);
    expect(r.jsonBody.error).toBe("El QR venció. Generá uno nuevo desde la compu.");
    expect(e.google.abrirSesionSubida).not.toHaveBeenCalled();
  });
  it("el Drive caído se explica igual que en la compu", async () => {
    const { e, codigo } = await conQR();
    e.tablas.drive_conexiones[0].estado = "rota";
    const r = await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir });
    expect(r.statusCode).toBe(503);
    expect(r.jsonBody.error).toBe("El Drive de la escribanía no está disponible. Avisale a quien administra Notarial.");
  });
  it("celular_confirmar: queda atribuido al usuario que abrió el QR, con la marca del celular, y se audita", async () => {
    const { e, codigo, sesionId } = await conQR();
    const r = await e.llamar(confirmar(codigo));
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "dni.jpg", origen: "celular", subido_por_nombre: "Fátima Taha", identificacion: null });
    expect(Object.keys(r.jsonBody.archivo)).not.toContain("drive_file_id");
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ origen: "celular", sesion_id: sesionId, subido_por: "u-fati", almacen: "escribania", nombre_original: "dni.jpg" });
    expect(e.tablas.drive_auditoria.at(-1)).toMatchObject({ accion: "subir", usuario_id: "u-fati", registro_numero: "853" });
    expect(e.tablas.drive_auditoria.at(-1).detalle).toMatchObject({ via: "celular" });
  });
  it("celular_confirmar es idempotente", async () => {
    const { e, codigo } = await conQR();
    const a = await e.llamar(confirmar(codigo));
    const b = await e.llamar(confirmar(codigo));
    expect(b.jsonBody.archivo.id).toBe(a.jsonBody.archivo.id);
    expect(e.tablas.expediente_archivos).toHaveLength(1);
    expect(e.auditoria()).toEqual(["celular_abrir", "subir"]);
  });
  it("celular_confirmar: un archivo fuera de la carpeta del expediente se rechaza", async () => {
    const { e, codigo } = await conQR({ google: { metadatos: vi.fn(async (a, id) => ({ id, name: "x.jpg", size: "10", mimeType: "image/jpeg", parents: ["otra-carpeta"], trashed: false })) } });
    expect((await e.llamar(confirmar(codigo))).statusCode).toBe(400);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });
  it("gracia de 5 minutos: una subida ya empezada se confirma aunque el QR venza en el medio", async () => {
    const { e, codigo } = await conQR();
    e.reloj.t = T0 + 33 * MIN;
    expect((await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir })).statusCode).toBe(410);
    expect((await e.llamar(confirmar(codigo))).statusCode).toBe(200);
    e.reloj.t = T0 + 36 * MIN;
    expect((await e.llamar(confirmar(codigo, "file-2"))).statusCode).toBe(410);
  });
  it("la gracia no revive una sesión cerrada desde la compu", async () => {
    const { e, codigo, sesionId } = await conQR();
    await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-fati");
    const r = await e.llamar(confirmar(codigo));
    expect(r.statusCode).toBe(410);
    expect(r.jsonBody.error).toMatch(/se cerró desde la compu/);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });
});

describe("T4.3 · el celular: quitar lo subido", () => {
  async function conFoto(opciones = {}) {
    const q = await conQR(opciones);
    const id = (await q.e.llamar(confirmar(q.codigo))).jsonBody.archivo.id;
    return { ...q, id };
  }
  it("manda la foto a la papelera de Drive, la marca como quitada por quien abrió el QR y lo audita", async () => {
    const { e, codigo, id } = await conFoto();
    const r = await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id });
    expect(r.jsonBody).toEqual({ ok: true });
    expect(e.google.papelera).toHaveBeenCalledWith("acceso-1", "file-1");
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ borrado_por: "u-fati" });
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
    expect(e.tablas.drive_auditoria.at(-1)).toMatchObject({ accion: "borrar", usuario_id: "u-fati" });
    expect(e.tablas.drive_auditoria.at(-1).detalle).toMatchObject({ via: "celular" });
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody.archivos).toEqual([]);
  });
  it("NO puede quitar un archivo de otra sesión, subido desde la compu, de otro expediente o ya quitado", async () => {
    const { e, codigo, id } = await conFoto();
    const base = { almacen: "escribania", nombre: "x.jpg", borrado_en: null, drive_file_id: "d" };
    e.tablas.expediente_archivos.push(
      { ...base, id: "de-otra-sesion", expediente_id: "e853b", sesion_id: "otra" },
      { ...base, id: "de-la-compu", expediente_id: "e853b", sesion_id: null },
      { ...base, id: "de-otro-expediente", expediente_id: "e853", sesion_id: e.tablas.drive_sesiones_celular[0].id },
    );
    for (const archivo_id of ["de-otra-sesion", "de-la-compu", "de-otro-expediente", "no-existe"]) {
      expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id })).statusCode, archivo_id).toBe(404);
    }
    expect(e.google.papelera).not.toHaveBeenCalled();
    await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id });
    expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id })).statusCode).toBe(404);
  });
  it("con otro código (otra sesión) tampoco se puede quitar", async () => {
    const { e, id } = await conFoto();
    const otra = (await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati")).jsonBody.url.split("/s/")[1];
    expect((await e.llamar({ accion: "celular_quitar", codigo: otra, archivo_id: id })).statusCode).toBe(404);
  });
  it("vencida o cerrada no se puede quitar (la gracia es solo para confirmar)", async () => {
    const { e, codigo, id } = await conFoto();
    e.reloj.t = T0 + 32 * MIN;
    expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id })).statusCode).toBe(410);
  });
  it("si el archivo ya no estaba en Drive, igual se quita de la lista", async () => {
    const { e, codigo, id } = await conFoto();
    e.google.papelera.mockImplementationOnce(async () => { throw new GoogleError({ status: 404 }); });
    expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id })).statusCode).toBe(200);
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
  });
});

describe("recorrido completo: QR, dos fotos, quitar una, cerrar", () => {
  it("la compu abre el QR, el celular sube, quita y la compu cierra", async () => {
    const { e, codigo, sesionId } = await conQR();
    const f1 = (await e.llamar(confirmar(codigo, "f-1"))).jsonBody.archivo;
    await e.llamar(confirmar(codigo, "f-2"));
    expect(e.tablas.expediente_archivos.filter((a) => a.origen === "celular")).toHaveLength(2);
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody.archivos).toHaveLength(2);
    await e.llamar({ accion: "celular_quitar", codigo, archivo_id: f1.id });
    expect((await e.llamar({ accion: "celular_info", codigo })).jsonBody.archivos).toHaveLength(1);
    // Otro usuario del registro ve lo que quedó desde la compu
    expect((await e.llamar({ accion: "ver", archivo_id: e.tablas.expediente_archivos[1].id }, "tok-fati2")).statusCode).toBe(200);
    // Un usuario de otro registro no
    expect((await e.llamar({ accion: "ver", archivo_id: e.tablas.expediente_archivos[1].id }, "tok-otro")).statusCode).toBe(404);
    await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-fati");
    expect((await e.llamar({ accion: "celular_iniciar_subida", codigo, ...subir })).statusCode).toBe(410);
    expect(e.auditoria()).toEqual(["celular_abrir", "subir", "subir", "borrar", "ver", "celular_cerrar"]);
  });
});
