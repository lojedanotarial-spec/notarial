// Fichas de personas del expediente: la API (api/drive.js) con una base de mentira. Spec: specs/personas-expediente/ (T1.2).
// Lo más importante: un registro NUNCA toca fichas, expedientes ni archivos de otro, y el historial no guarda datos personales.
import { describe, it, expect } from "vitest";
import { entorno } from "./_driveHarness.js";

const unicos = {
  personas: (fs, n) => !!n.nro_doc && fs.some((f) => f.registro_id === n.registro_id && f.nro_doc === n.nro_doc),
  expediente_personas: (fs, n) => fs.some((f) => f.expediente_id === n.expediente_id && f.persona_id === n.persona_id),
};
const ficha = (id, registro, extra = {}) => ({ id, registro_id: registro, tipo: "fisica", apellido: "García", nombre: "Juan", genero: "M", tipo_doc: "DNI", nro_doc: null, estado_civil: "", notas: "", updated_at: "2026-11-01T00:00:00.000Z", ...extra });
const archivo = (id, expedienteId, registro, extra = {}) => ({ id, expediente_id: expedienteId, almacen: "propio", clave: `${registro}/exp/${expedienteId}/${id}`, nombre: `${id}.jpg`, tipo: "dni", borrado_en: null, persona_id: null, ...extra });
const nuevo = (tablas = {}) => entorno({ propio: true, unicos, tablas });
const llamar = (e, cuerpo, token = "tok-fati") => e.llamar(cuerpo, token);

describe("persona_guardar — crear", () => {
  it("crea la ficha en el registro del USUARIO (el navegador no lo elige) y deja el historial", async () => {
    const e = nuevo();
    const r = await llamar(e, { accion: "persona_guardar", datos: { apellido: "García", nombre: "Juan", nro_doc: "20.123.456", registro_id: "111", genero: "M", estado_civil: "casado" } });
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.persona).toMatchObject({ apellido: "García", nro_doc: "20123456", estado_civil: "casado", tipo: "fisica" });
    expect(r.jsonBody.persona.registro_id).toBeUndefined();
    expect(e.tablas.personas).toHaveLength(1);
    expect(e.tablas.personas[0].registro_id).toBe("853");
    expect(e.auditoria()).toEqual(["persona_crear"]);
  });

  it("con un expediente, además la agrega a él", async () => {
    const e = nuevo();
    const r = await llamar(e, { accion: "persona_guardar", expediente_id: "e853", datos: { apellido: "García", nombre: "Juan" } });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.expediente_personas).toEqual([expect.objectContaining({ expediente_id: "e853", persona_id: r.jsonBody.persona.id, agregada_por: "u-fati" })]);
    expect(e.auditoria()).toEqual(["persona_crear", "persona_agregar"]);
  });

  it("dos personas sin documento se guardan las dos (el vacío es null y no choca)", async () => {
    const e = nuevo();
    expect((await llamar(e, { accion: "persona_guardar", datos: { apellido: "Pérez", nombre: "Ana", nro_doc: "" } })).statusCode).toBe(200);
    expect((await llamar(e, { accion: "persona_guardar", datos: { apellido: "Sosa", nombre: "Luis", nro_doc: "" } })).statusCode).toBe(200);
    expect(e.tablas.personas).toHaveLength(2);
    expect(e.tablas.personas.every((p) => p.nro_doc === null)).toBe(true);
  });

  it("sin apellido ni nombre, estado civil o género inválidos: 400 y no escribe nada", async () => {
    const e = nuevo();
    for (const datos of [{ notas: "x" }, { apellido: "A", estado_civil: "conviviente" }, { apellido: "A", genero: "Z" }]) {
      const r = await llamar(e, { accion: "persona_guardar", datos });
      expect(r.statusCode).toBe(400);
      expect(r.jsonBody.error).toBeTruthy();
    }
    expect(e.tablas.personas).toHaveLength(0);
    expect(e.tablas.drive_auditoria).toHaveLength(0);
  });

  it("el estado civil queda concordado con el género", async () => {
    const e = nuevo();
    const r = await llamar(e, { accion: "persona_guardar", datos: { apellido: "Pérez", nombre: "Ana", genero: "F", estado_civil: "casado" } });
    expect(r.jsonBody.persona.estado_civil).toBe("casada");
  });

  it("sin sesión: 401; con un expediente de otro registro: 404 y no crea nada", async () => {
    const e = nuevo();
    expect((await e.llamar({ accion: "persona_guardar", datos: { apellido: "A" } })).statusCode).toBe(401);
    const r = await llamar(e, { accion: "persona_guardar", expediente_id: "e111", datos: { apellido: "A", nombre: "B" } });
    expect(r.statusCode).toBe(404);
    expect(e.tablas.personas).toHaveLength(0);
  });
});

describe("persona_guardar — duplicados", () => {
  const base = () => nuevo({ personas: [ficha("p1", "853", { nro_doc: "20123456", apellido: "García", nombre: "Juan", estado_civil: "soltero", notas: "vieja" })] });

  it("mismo documento: avisa y devuelve la ficha existente SIN escribir nada", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", datos: { apellido: "Garcia", nombre: "J.", nro_doc: "20.123.456", estado_civil: "casado" } });
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.duplicada).toMatchObject({ por: "dni", persona: { id: "p1", apellido: "García", estado_civil: "soltero" } });
    expect(r.jsonBody.persona).toBeUndefined();
    expect(e.tablas.personas).toHaveLength(1);
    expect(e.tablas.personas[0].estado_civil).toBe("soltero");
    expect(e.tablas.drive_auditoria).toHaveLength(0);
  });

  it("con actualizar_existente actualiza la ficha con lo no vacío y NO crea otra", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", actualizar_existente: true, expediente_id: "e853",
      datos: { apellido: "García", nombre: "Juan", nro_doc: "20123456", estado_civil: "casado", notas: "", barrio: "Centro" } });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.personas).toHaveLength(1);
    expect(e.tablas.personas[0]).toMatchObject({ id: "p1", estado_civil: "casado", barrio: "Centro", notas: "vieja" });   // lo vacío no borra lo que había
    expect(e.tablas.personas[0].updated_at).not.toBe("2026-11-01T00:00:00.000Z");
    expect(e.tablas.expediente_personas).toHaveLength(1);   // y queda en el expediente
    expect(e.auditoria()).toEqual(["persona_editar", "persona_agregar"]);
  });

  it("sin documento pero mismo apellido y nombre: avisa por nombre", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", datos: { apellido: "GARCIA", nombre: "juan" } });
    expect(r.jsonBody.duplicada).toMatchObject({ por: "nombre", persona: { id: "p1" } });
    expect(e.tablas.personas).toHaveLength(1);
  });

  it("el mismo documento en OTRO registro no es un duplicado", async () => {
    const e = nuevo({ personas: [ficha("p9", "111", { nro_doc: "20123456" })] });
    const r = await llamar(e, { accion: "persona_guardar", datos: { apellido: "García", nombre: "Juan", nro_doc: "20123456" } });
    expect(r.jsonBody.duplicada).toBeUndefined();
    expect(e.tablas.personas).toHaveLength(2);
  });
});

describe("persona_guardar — editar", () => {
  const base = () => nuevo({ personas: [
    ficha("p1", "853", { nro_doc: "20123456", genero: "M", estado_civil: "casado" }),
    ficha("p2", "853", { nro_doc: "30111222", apellido: "Pérez", nombre: "Ana", genero: "F" }),
    ficha("p9", "111", { nro_doc: "99999999" }),
  ] });

  it("edita solo lo enviado, actualiza la fecha y el historial dice QUÉ campos cambiaron, sin los valores", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p1", datos: { estado_civil: "viudo", notas: "viudo de Rodríguez, secreto" } });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.personas[0]).toMatchObject({ estado_civil: "viudo", notas: "viudo de Rodríguez, secreto", apellido: "García", nro_doc: "20123456" });
    const fila = e.tablas.drive_auditoria[0];
    expect(fila.accion).toBe("persona_editar");
    expect(fila.detalle.campos).toEqual(["estado_civil", "notas"]);
    expect(JSON.stringify(e.tablas.drive_auditoria)).not.toMatch(/Rodríguez|García|20123456|viudo/);
  });

  it("cambiar el género concuerda el estado civil", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p1", datos: { genero: "F" } });
    expect(r.jsonBody.persona.estado_civil).toBe("casada");
  });

  it("no se puede dejar la ficha sin nombre", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p1", datos: { apellido: "", nombre: "" } });
    expect(r.statusCode).toBe(400);
    expect(e.tablas.personas[0].apellido).toBe("García");
  });

  it("si el documento ya es de otra ficha del registro: 409 y no cambia nada", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p1", datos: { nro_doc: "30.111.222" } });
    expect(r.statusCode).toBe(409);
    expect(r.jsonBody.codigo).toBe("dni_repetido");
    expect(e.tablas.personas[0].nro_doc).toBe("20123456");
  });

  it("una ficha de OTRO registro no existe para mí: 404 y queda intacta", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p9", datos: { notas: "hackeada" } });
    expect(r.statusCode).toBe(404);
    expect(e.tablas.personas[2].notas).toBe("");
  });

  it("sin cambios reales no escribe ni deja historial", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_guardar", persona_id: "p1", datos: { apellido: "García" } });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.drive_auditoria).toHaveLength(0);
  });
});

describe("persona_agregar / persona_quitar", () => {
  const base = () => nuevo({
    personas: [ficha("p1", "853"), ficha("p9", "111")],
    expediente_personas: [{ id: "m1", expediente_id: "e853", persona_id: "p1" }],
    expediente_archivos: [archivo("a1", "e853", "853", { persona_id: "p1" }), archivo("a2", "e853b", "853", { persona_id: "p1" }), archivo("a3", "e853", "853")],
  });

  it("agrega una ficha del registro al expediente; repetir no duplica ni falla", async () => {
    const e = base();
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e853b", persona_id: "p1" })).statusCode).toBe(200);
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e853b", persona_id: "p1" })).statusCode).toBe(200);
    expect(e.tablas.expediente_personas.filter((m) => m.expediente_id === "e853b")).toHaveLength(1);
    expect(e.auditoria()).toEqual(["persona_agregar"]);
  });

  it("no mezcla registros: ni una ficha ajena en mi expediente ni mi ficha en un expediente ajeno", async () => {
    const e = base();
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e853", persona_id: "p9" })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e111", persona_id: "p1" })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e111", persona_id: "p9" }, "tok-fati")).statusCode).toBe(404);
    expect(e.tablas.expediente_personas).toHaveLength(1);
  });

  it("ni siquiera el administrador mezcla registros: la ficha tiene que ser del registro del expediente", async () => {
    const e = base();
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e853", persona_id: "p9" }, "tok-admin")).statusCode).toBe(404);
    expect((await llamar(e, { accion: "persona_agregar", expediente_id: "e853b", persona_id: "p1" }, "tok-admin")).statusCode).toBe(200);
  });

  it("quitar saca a la persona del expediente, deja sus archivos de ese expediente sin asignar y NO borra la ficha ni los archivos", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_quitar", expediente_id: "e853", persona_id: "p1" });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.expediente_personas).toHaveLength(0);
    expect(e.tablas.personas).toHaveLength(2);
    expect(e.tablas.expediente_archivos).toHaveLength(3);
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a1").persona_id).toBeNull();
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a2").persona_id).toBe("p1");   // el de otro expediente no se toca
    expect(e.auditoria()).toEqual(["persona_quitar"]);
  });

  it("quitar en un expediente de otro registro: 404", async () => {
    const e = base();
    expect((await llamar(e, { accion: "persona_quitar", expediente_id: "e111", persona_id: "p1" })).statusCode).toBe(404);
  });
});

describe("persona_borrar", () => {
  const base = () => nuevo({
    personas: [ficha("p1", "853"), ficha("p9", "111")],
    expediente_personas: [{ id: "m1", expediente_id: "e853", persona_id: "p1" }, { id: "m2", expediente_id: "e853b", persona_id: "p1" }],
  });

  it("borra la ficha y deja el historial en CADA expediente en el que estaba", async () => {
    const e = base();
    const r = await llamar(e, { accion: "persona_borrar", persona_id: "p1" });
    expect(r.statusCode).toBe(200);
    expect(e.tablas.personas.map((p) => p.id)).toEqual(["p9"]);
    const filas = e.tablas.drive_auditoria.filter((a) => a.accion === "persona_borrar");
    expect(filas.map((a) => a.expediente_id).sort()).toEqual(["e853", "e853b"]);
    expect(JSON.stringify(filas)).not.toMatch(/García|Juan/);
  });

  it("una ficha de otro registro no se puede borrar: 404 y queda", async () => {
    const e = base();
    expect((await llamar(e, { accion: "persona_borrar", persona_id: "p9" })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "persona_borrar", persona_id: "p9" }, "tok-admin")).statusCode).toBe(404);
    expect(e.tablas.personas).toHaveLength(2);
  });

  it("una ficha que no existe: 404", async () => {
    expect((await llamar(base(), { accion: "persona_borrar", persona_id: "nada" })).statusCode).toBe(404);
  });
});

describe("archivo_asignar", () => {
  const base = () => nuevo({
    personas: [ficha("p1", "853"), ficha("p2", "853", { nombre: "Ana" }), ficha("p9", "111")],
    expediente_personas: [{ id: "m1", expediente_id: "e853", persona_id: "p1" }, { id: "m9", expediente_id: "e111", persona_id: "p9" }],
    expediente_archivos: [
      archivo("a1", "e853", "853"), archivo("a2", "e853", "853"), archivo("a3", "e853", "853", { persona_id: "p1" }),
      archivo("a4", "e853", "853", { borrado_en: "2026-11-10T00:00:00.000Z" }), archivo("x1", "e111", "111"),
    ],
  });
  const persona = (e, id) => e.tablas.expediente_archivos.find((a) => a.id === id).persona_id;

  it("asigna uno o varios archivos a una persona del expediente", async () => {
    const e = base();
    const r = await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a1", "a2"], persona_id: "p1" });
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody.asignados).toBe(2);
    expect(persona(e, "a1")).toBe("p1");
    expect(persona(e, "a2")).toBe("p1");
    expect(e.auditoria()).toEqual(["archivo_asignar", "archivo_asignar"]);
  });

  it("persona_id null los deja sin asignar", async () => {
    const e = base();
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a3"], persona_id: null })).statusCode).toBe(200);
    expect(persona(e, "a3")).toBeNull();
  });

  it("asignar no cambia el nombre, el tipo ni el archivo guardado", async () => {
    const e = base();
    await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a1"], persona_id: "p1" });
    expect(e.tablas.expediente_archivos.find((a) => a.id === "a1")).toMatchObject({ nombre: "a1.jpg", tipo: "dni", clave: "853/exp/e853/a1" });
  });

  it("la persona tiene que estar en el expediente del archivo: 409 y no cambia nada", async () => {
    const e = base();
    const r = await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a1"], persona_id: "p2" });
    expect(r.statusCode).toBe(409);
    expect(persona(e, "a1")).toBeNull();
  });

  it("entre registros no hay nada: archivo ajeno, persona ajena o expediente ajeno dan 404 y NADA se asigna", async () => {
    const e = base();
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["x1"], persona_id: null })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["x1"], persona_id: "p9" })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a1"], persona_id: "p9" })).statusCode).toBe(404);
    // Una tanda con un archivo ajeno entre los míos: se rechaza completa.
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a1", "x1"], persona_id: "p1" })).statusCode).toBe(404);
    expect(persona(e, "a1")).toBeNull();
    expect(persona(e, "x1")).toBeNull();
    expect(e.tablas.drive_auditoria).toHaveLength(0);
  });

  it("un archivo en la papelera o inexistente: 404", async () => {
    const e = base();
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a4"], persona_id: "p1" })).statusCode).toBe(404);
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: ["nada"], persona_id: "p1" })).statusCode).toBe(404);
  });

  it("pide una lista de archivos razonable", async () => {
    const e = base();
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: [], persona_id: "p1" })).statusCode).toBe(400);
    expect((await llamar(e, { accion: "archivo_asignar", persona_id: "p1" })).statusCode).toBe(400);
    expect((await llamar(e, { accion: "archivo_asignar", archivo_ids: Array.from({ length: 51 }, (_, i) => `a${i}`), persona_id: "p1" })).statusCode).toBe(400);
  });

  it("asignar un archivo que ya era de esa persona no deja historial de más", async () => {
    const e = base();
    await llamar(e, { accion: "archivo_asignar", archivo_ids: ["a3"], persona_id: "p1" });
    expect(e.tablas.drive_auditoria).toHaveLength(0);
  });
});
