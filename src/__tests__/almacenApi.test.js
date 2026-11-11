// Archivos del expediente en el almacén propio (R2): la API (api/drive.js con `almacen: "propio"`) con una base y un
// almacén de mentira. Spec: specs/almacenamiento-propio/ (T3.1). Los archivos viejos de Drive siguen en driveApi.test.js.
import { describe, it, expect } from "vitest";
import { T0, MB, entorno } from "./_driveHarness.js";
import { firmarState } from "../../api/_drive.js";
import { CLAVE } from "./_driveHarness.js";

const MIN = 60_000;
const DIA = 24 * 60 * MIN;
const CONTENIDO = Buffer.from("contenido!"); // 10 bytes

// Un entorno con el almacén propio y SIN ninguna conexión de Drive (no hace falta).
const nuevo = (opciones = {}) => entorno({ propio: true, ...opciones });
const iniciar = (e, extra = {}, token = "tok-fati") => e.llamar({
  accion: "iniciar_subida", almacen: "propio", expediente_id: "e853b", nombre: "dni.jpg", mime: "image/jpeg", tamano: CONTENIDO.length, tipo: "dni", ...extra,
}, token);
const confirmar = (e, ticket, extra = {}, token = "tok-fati") => e.llamar({ accion: "confirmar_subida", almacen: "propio", expediente_id: "e853b", ticket, tipo: "dni", ...extra }, token);

// Hace el recorrido completo: pide la dirección, "sube" el archivo y lo confirma.
async function subir(e, { token = "tok-fati", bytes = CONTENIDO, extra = {} } = {}) {
  const r = await iniciar(e, { tamano: bytes.length, ...extra }, token);
  expect(r.statusCode).toBe(200);
  e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, bytes, "image/jpeg");
  const c = await confirmar(e, r.jsonBody.ticket, {}, token);
  return { r, c, id: r.jsonBody.archivo_id };
}

describe("iniciar_subida (almacén propio)", () => {
  it("devuelve una dirección firmada a la zona temporal, sin tocar Google y sin necesitar un Drive conectado", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody).toMatchObject({ almacen: "propio", nombre: "dni.jpg", tipo: "dni", mime: "image/jpeg" });
    expect(r.jsonBody.url_subida).toBe(`https://r2.falso/tmp/${r.jsonBody.archivo_id}?firma=1`);
    expect(r.jsonBody.ticket).toBeTruthy();
    expect(e.almacen.firmarSubida).toHaveBeenCalledWith(`tmp/${r.jsonBody.archivo_id}`);
    expect(e.google.abrirSesionSubida).not.toHaveBeenCalled();
    expect(e.google.renovar).not.toHaveBeenCalled();
    expect(e.tablas.expediente_archivos).toHaveLength(0);   // todavía no se registra nada
  });

  it("sin pedir 'propio' sigue el camino de siempre por Google (los archivos viejos y la pantalla vieja)", async () => {
    const e = nuevo(); e.conectar("853");
    const r = await e.llamar({ accion: "iniciar_subida", expediente_id: "e853b", nombre: "dni.jpg", mime: "image/jpeg", tamano: 3 * MB, tipo: "dni" }, "tok-fati");
    expect(r.jsonBody.sesion_url).toBe("https://upload.google/sesion-1");
    expect(e.almacen.firmarSubida).not.toHaveBeenCalled();
  });

  it("si el servidor no tiene el almacén configurado, 'propio' falla con un mensaje claro y no se cae a Google", async () => {
    const e = entorno();   // sin almacén
    const r = await iniciar(e);
    expect(r.statusCode).toBe(503);
    expect(r.jsonBody.error).toMatch(/no está disponible/);
  });

  it("valida el tamaño antes de firmar nada", async () => {
    const e = nuevo();
    const r = await iniciar(e, { tamano: 26 * MB });
    expect(r.statusCode).toBe(413);
    expect(r.jsonBody.error).toBe("El archivo supera el máximo de 25 MB.");
    expect(e.almacen.firmarSubida).not.toHaveBeenCalled();
  });

  it("exige sesión; un expediente de otro registro es 404 aunque se conozca su id", async () => {
    const e = nuevo();
    expect((await iniciar(e, {}, null)).statusCode).toBe(401);
    expect((await iniciar(e, { expediente_id: "e111" })).statusCode).toBe(404);
    expect((await iniciar(e, { expediente_id: "no-existe" })).statusCode).toBe(404);
    expect(e.almacen.firmarSubida).not.toHaveBeenCalled();
  });
});

describe("confirmar_subida (almacén propio)", () => {
  it("mueve el archivo a su lugar definitivo, borra el temporal, lo registra y lo audita", async () => {
    const e = nuevo();
    const { c, id } = await subir(e);
    expect(c.statusCode).toBe(200);
    const final = `853/exp/e853b/${id}`;
    expect(e.almacen.objetos.has(final)).toBe(true);
    expect(e.almacen.objetos.has(`tmp/${id}`)).toBe(false);
    expect(e.tablas.expediente_archivos).toEqual([expect.objectContaining({
      id, expediente_id: "e853b", clave: final, almacen: "propio", nombre: "dni.jpg", tipo: "dni", mime_type: "image/jpeg",
      tamano: CONTENIDO.length, subido_por: "u-fati", origen: "compu",
    })]);
    expect(c.jsonBody.archivo).toMatchObject({ id, nombre: "dni.jpg", tamano: CONTENIDO.length, almacen: "propio" });   // la pantalla lo necesita para el texto de "Borrar"
    expect(JSON.stringify(c.jsonBody)).not.toContain("853/exp");   // la clave interna no sale al navegador
    expect(e.auditoria()).toEqual(["subir"]);
    expect(e.google.metadatos).not.toHaveBeenCalled();
  });

  it("es idempotente: confirmar dos veces no duplica el archivo ni el historial", async () => {
    const e = nuevo();
    const { r, id } = await subir(e);
    const otra = await confirmar(e, r.jsonBody.ticket);
    expect(otra.statusCode).toBe(200);
    expect(otra.jsonBody.archivo.id).toBe(id);
    expect(e.tablas.expediente_archivos).toHaveLength(1);
    expect(e.auditoria()).toEqual(["subir"]);
  });

  it("si lo subido pasa de 25 MB lo rechaza, borra el temporal y no registra nada", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    e.almacen.ponerGrande(`tmp/${r.jsonBody.archivo_id}`, 30 * MB);
    const c = await confirmar(e, r.jsonBody.ticket);
    expect(c.statusCode).toBe(413);
    expect(c.jsonBody.error).toBe("El archivo supera el máximo de 25 MB.");
    expect(e.almacen.objetos.size).toBe(0);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });

  it("si lo subido no coincide con lo declarado (subida cortada o cambiada) lo rechaza y limpia", async () => {
    const e = nuevo();
    const r = await iniciar(e, { tamano: 100 });
    e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, CONTENIDO);   // son 10 bytes, no 100
    const c = await confirmar(e, r.jsonBody.ticket);
    expect(c.statusCode).toBe(400);
    expect(c.jsonBody.error).toMatch(/no se completó/);
    expect(e.almacen.objetos.size).toBe(0);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });

  it("si no llegó a subir nada, avisa sin registrar", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    const c = await confirmar(e, r.jsonBody.ticket);
    expect(c.statusCode).toBe(400);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });

  it("rechaza un ticket alterado, inventado, vencido o de otro expediente", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, CONTENIDO);
    const t = r.jsonBody.ticket;
    for (const malo of [t.slice(0, -2) + "xx", "", "inventado", `${t}.extra`]) {
      expect((await confirmar(e, malo)).statusCode, malo).toBe(400);
    }
    // vencido
    e.reloj.t = T0 + 31 * MIN;
    expect((await confirmar(e, t)).statusCode).toBe(400);
    e.reloj.t = T0;
    // el ticket de un expediente no sirve para confirmar en otro
    expect((await confirmar(e, t, { expediente_id: "e853" })).statusCode).toBe(400);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
    expect(e.almacen.objetos.has(`tmp/${r.jsonBody.archivo_id}`)).toBe(true);   // nada se movió
  });

  it("un ticket de otro registro no sirve ni siquiera para quien lo robó (404 del expediente ajeno)", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, CONTENIDO);
    const c = await confirmar(e, r.jsonBody.ticket, {}, "tok-otro");
    expect(c.statusCode).toBe(404);
    expect(e.tablas.expediente_archivos).toHaveLength(0);
  });

  it("un ticket firmado con otra clave no vale", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, CONTENIDO);
    const falso = firmarState({ id: r.jsonBody.archivo_id, r: "853", e: "e853b", n: "x.jpg", m: "image/jpeg", t: "dni", z: 10, exp: T0 + 10 * MIN }, Buffer.alloc(32, 9).toString("base64"));
    expect((await confirmar(e, falso)).statusCode).toBe(400);
    // y con la clave correcta, el mismo contenido sí
    const bueno = firmarState({ id: r.jsonBody.archivo_id, r: "853", e: "e853b", n: "x.jpg", m: "image/jpeg", t: "dni", z: 10, exp: T0 + 10 * MIN }, CLAVE);
    expect((await confirmar(e, bueno)).statusCode).toBe(200);
  });

  it("si falla al guardar la fila, no deja el archivo definitivo huérfano", async () => {
    const e = nuevo();
    const r = await iniciar(e);
    e.almacen.poner(`tmp/${r.jsonBody.archivo_id}`, CONTENIDO);
    const desde = e.sb.from.bind(e.sb);
    e.deps.sb = { from: (t) => {
      const b = desde(t);
      return t !== "expediente_archivos" ? b : { ...b, insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: "XX", message: "caída" } }) }) }) };
    } };
    const c = await confirmar(e, r.jsonBody.ticket);
    expect(c.statusCode).toBe(500);
    expect([...e.almacen.objetos.keys()].filter((k) => !k.startsWith("tmp/"))).toEqual([]);
  });
});

describe("ver, descargar y borrar (almacén propio)", () => {
  it("ver entrega el archivo por el servidor con cabeceras seguras y deja registro", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    const r = await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati2");
    expect(r.statusCode).toBe(200);
    expect(r.texto).toBe("contenido!");
    expect(r.headers).toMatchObject({
      "content-type": "image/jpeg", "x-content-type-options": "nosniff", "cache-control": "private, no-store",
      "content-security-policy": "default-src 'none'; sandbox",
    });
    expect(r.headers["content-disposition"]).toMatch(/^inline;/);
    expect(e.auditoria()).toEqual(["subir", "ver"]);
    expect(e.google.descargar).not.toHaveBeenCalled();
  });

  it("descargar siempre baja como adjunto", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    const r = await e.llamar({ accion: "descargar", archivo_id: id }, "tok-fati");
    expect(r.headers["content-disposition"]).toMatch(/^attachment;/);
    expect(e.auditoria()).toEqual(["subir", "descargar"]);
  });

  it("de otro registro, o borrado, o sin sesión: nunca se entrega ni se deja registro de acceso", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-otro")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "ver", archivo_id: id })).statusCode).toBe(401);
    await e.llamar({ accion: "borrar", archivo_id: id }, "tok-fati");
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).statusCode).toBe(404);
    expect(e.auditoria()).toEqual(["subir", "borrar"]);
  });

  it("el administrador puede ver archivos de cualquier registro", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-admin")).statusCode).toBe(200);
  });

  it("defensa extra: si una fila apuntara a la clave de otro registro, no se entrega", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    e.almacen.poner("111/exp/e111/ajeno", "secreto-ajeno");
    e.tablas.expediente_archivos[0].clave = "111/exp/e111/ajeno";   // base corrompida o manipulada
    const r = await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati");
    expect(r.statusCode).toBe(404);
    expect(r.texto).not.toContain("secreto-ajeno");
  });

  it("si el objeto ya no está en el almacén, mensaje claro (sin hablar de Drive)", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    e.almacen.objetos.clear();
    const r = await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati");
    expect(r.statusCode).toBe(404);
    expect(r.jsonBody.error).not.toMatch(/drive/i);
  });

  it("borrar oculta el archivo y lo conserva 30 días: el objeto NO se toca", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    const r = await e.llamar({ accion: "borrar", archivo_id: id }, "tok-fati2");
    expect(r.jsonBody).toEqual({ ok: true });
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ borrado_en: new Date(T0).toISOString(), borrado_por: "u-fati2" });
    expect(e.almacen.objetos.has(`853/exp/e853b/${id}`)).toBe(true);
    expect(e.almacen.borrar).toHaveBeenCalledTimes(1);   // solo el temporal de la subida
    expect(e.google.papelera).not.toHaveBeenCalled();
    expect(e.auditoria()).toEqual(["subir", "borrar"]);
  });

  it("borrar de otro registro es 404 y no cambia nada", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    expect((await e.llamar({ accion: "borrar", archivo_id: id }, "tok-otro")).statusCode).toBe(404);
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeUndefined();
  });
});

describe("restaurar y ver lo borrado (solo el administrador de Notarial)", () => {
  async function conBorrado() {
    const e = nuevo();
    const { id } = await subir(e);
    await e.llamar({ accion: "borrar", archivo_id: id }, "tok-fati");
    return { e, id };
  }

  it("el administrador restaura dentro de los 30 días: vuelve a verse y queda en el historial", async () => {
    const { e, id } = await conBorrado();
    e.reloj.t = T0 + 29 * DIA;
    const r = await e.llamar({ accion: "restaurar", archivo_id: id }, "tok-admin");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.archivo).toMatchObject({ id });
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeNull();
    expect(e.auditoria()).toEqual(["subir", "borrar", "restaurar"]);
    expect((await e.llamar({ accion: "ver", archivo_id: id }, "tok-fati")).statusCode).toBe(200);
  });

  it("un usuario común no puede restaurar", async () => {
    const { e, id } = await conBorrado();
    expect((await e.llamar({ accion: "restaurar", archivo_id: id }, "tok-fati")).statusCode).toBe(403);
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
  });

  it("pasados los 30 días ya no se puede (el objeto puede haberse eliminado)", async () => {
    const { e, id } = await conBorrado();
    e.reloj.t = T0 + 31 * DIA;
    const r = await e.llamar({ accion: "restaurar", archivo_id: id }, "tok-admin");
    expect(r.statusCode).toBe(410);
    expect(e.tablas.expediente_archivos[0].borrado_en).toBeTruthy();
  });

  it("si el objeto ya no está en el almacén, no restaura una fila que apunta a la nada", async () => {
    const { e, id } = await conBorrado();
    e.almacen.objetos.delete(`853/exp/e853b/${id}`);
    expect((await e.llamar({ accion: "restaurar", archivo_id: id }, "tok-admin")).statusCode).toBe(410);
  });

  it("un archivo que no está borrado, o no existe, da 404", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    expect((await e.llamar({ accion: "restaurar", archivo_id: id }, "tok-admin")).statusCode).toBe(404);
    expect((await e.llamar({ accion: "restaurar", archivo_id: "nada" }, "tok-admin")).statusCode).toBe(404);
  });

  it("listar_borrados: solo el administrador, solo del expediente pedido y con los días que quedan", async () => {
    const { e, id } = await conBorrado();
    e.reloj.t = T0 + 10 * DIA;
    expect((await e.llamar({ accion: "listar_borrados", expediente_id: "e853b" }, "tok-fati")).statusCode).toBe(403);
    const r = await e.llamar({ accion: "listar_borrados", expediente_id: "e853b" }, "tok-admin");
    expect(r.jsonBody.archivos).toEqual([expect.objectContaining({ id, nombre: "dni.jpg", dias_restantes: 20 })]);
    expect((await e.llamar({ accion: "listar_borrados", expediente_id: "e853" }, "tok-admin")).jsonBody.archivos).toEqual([]);
  });
});

describe("renombrar e identificar (almacén propio)", () => {
  it("renombrar cambia solo la base: ni Google ni el almacén se tocan (la clave no lleva el nombre)", async () => {
    const e = nuevo();
    const { id } = await subir(e);
    const r = await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "DNI García Juan - anverso", tipo: "dni" }, "tok-fati2");
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "DNI García Juan - anverso.jpg", identificacion: "manual" });
    expect(e.google.renombrar).not.toHaveBeenCalled();
    expect(e.tablas.expediente_archivos[0].clave).toBe(`853/exp/e853b/${id}`);
    expect(e.auditoria()).toEqual(["subir", "renombrar"]);
  });

  it("la identificación automática renombra en la base sin llamar a Google", async () => {
    const e = nuevo({ config: { identificarCompu: true } });
    const { id } = await subir(e, { extra: {} });
    e.tablas.expediente_archivos[0].identificacion = "pendiente";
    const r = await e.llamar({ accion: "identificar", archivo_id: id, miniatura: `data:image/jpeg;base64,${Buffer.alloc(300, 1).toString("base64")}` }, "tok-fati");
    expect(r.statusCode).toBe(200);
    expect(e.google.renombrar).not.toHaveBeenCalled();
    expect(e.google.renovar).not.toHaveBeenCalled();
  });
});

describe("estado", () => {
  it("avisa que el almacén propio está disponible, sin pedir ninguna conexión", async () => {
    const e = nuevo();
    const r = await e.llamar({ accion: "estado" }, "tok-fati");
    expect(r.jsonBody).toMatchObject({ propio: true });
    expect((await entorno().llamar({ accion: "estado" }, "tok-fati")).jsonBody.propio).toBe(false);
  });
});

describe("subir desde el celular (almacén propio)", () => {
  async function conQR(e = nuevo()) {
    const r = await e.llamar({ accion: "celular_crear", almacen: "propio", expediente_id: "e853b" }, "tok-fati");
    return { e, r, codigo: r.jsonBody.url?.split("/s/")[1], sesionId: r.jsonBody.sesion_id };
  }
  const foto = { nombre: "IMG_4821.jpg", mime: "image/jpeg", tamano: CONTENIDO.length };

  it("abrir el QR no exige ningún Drive conectado", async () => {
    const { r, e } = await conQR();
    expect(r.statusCode).toBe(200);
    expect(e.tablas.drive_conexiones).toHaveLength(0);
  });

  it("el celular sube y confirma: queda del usuario que generó el QR, con origen celular y la sesión", async () => {
    const { e, codigo, sesionId } = await conQR();
    const i = await e.llamar({ accion: "celular_iniciar_subida", almacen: "propio", codigo, ...foto });
    expect(i.statusCode).toBe(200);
    expect(i.jsonBody.url_subida).toContain(`/tmp/${i.jsonBody.archivo_id}`);
    e.almacen.poner(`tmp/${i.jsonBody.archivo_id}`, CONTENIDO);
    const c = await e.llamar({ accion: "celular_confirmar", almacen: "propio", codigo, ticket: i.jsonBody.ticket });
    expect(c.statusCode).toBe(200);
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ almacen: "propio", origen: "celular", sesion_id: sesionId, subido_por: "u-fati", expediente_id: "e853b" });
    const info = await e.llamar({ accion: "celular_info", codigo });
    expect(info.jsonBody.archivos).toHaveLength(1);
    expect(JSON.stringify(info.jsonBody)).not.toContain("853/exp");
  });

  it("con una sesión cerrada no se firma nada; el ticket de una sesión no sirve en otra", async () => {
    const { e, codigo, sesionId } = await conQR();
    const i = await e.llamar({ accion: "celular_iniciar_subida", almacen: "propio", codigo, ...foto });
    await e.llamar({ accion: "celular_cerrar", sesion_id: sesionId }, "tok-fati");
    expect((await e.llamar({ accion: "celular_iniciar_subida", almacen: "propio", codigo, ...foto })).statusCode).toBe(410);
    e.almacen.poner(`tmp/${i.jsonBody.archivo_id}`, CONTENIDO);
    expect((await e.llamar({ accion: "celular_confirmar", almacen: "propio", codigo, ticket: i.jsonBody.ticket })).statusCode).toBe(410);
  });

  it("quitar una foto la oculta (recuperable 30 días) y solo puede quitar lo de su propia sesión", async () => {
    const { e, codigo } = await conQR();
    const i = await e.llamar({ accion: "celular_iniciar_subida", almacen: "propio", codigo, ...foto });
    e.almacen.poner(`tmp/${i.jsonBody.archivo_id}`, CONTENIDO);
    const c = await e.llamar({ accion: "celular_confirmar", almacen: "propio", codigo, ticket: i.jsonBody.ticket });
    const id = c.jsonBody.archivo.id;
    const ajena = await subir(e);   // un archivo subido desde la compu, de otra "sesión"
    expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id: ajena.id })).statusCode).toBe(404);
    expect((await e.llamar({ accion: "celular_quitar", codigo, archivo_id: id })).jsonBody).toEqual({ ok: true });
    expect(e.tablas.expediente_archivos.find((f) => f.id === id).borrado_en).toBeTruthy();
    expect(e.almacen.objetos.has(`853/exp/e853b/${id}`)).toBe(true);
    expect(e.google.papelera).not.toHaveBeenCalled();
  });
});
