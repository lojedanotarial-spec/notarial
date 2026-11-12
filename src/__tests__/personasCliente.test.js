// Lógica del navegador para las personas del expediente (src/utils/personasCliente.js). Spec: specs/personas-expediente/ (T2.1, T3.1, T4.1).
import { describe, it, expect } from "vitest";
import {
  nombreCompleto, textoActualizada, resumenPersona, datosQueFaltan, filtrarLibreta, agruparArchivos, propuestasDeArchivos,
  comparacionLectura, clavePersona, datosDeFicha, vacioFicha, cuitCalculado, validarFicha,
} from "../utils/personasCliente.js";

const AHORA = new Date("2026-11-12T12:00:00-03:00").getTime();
const DIA = 24 * 3600 * 1000;
const p = (id, apellido, nombre, extra = {}) => ({ id, apellido, nombre, nro_doc: null, estado_civil: "", calle: "", localidad: "", ...extra });

describe("nombreCompleto / resumenPersona", () => {
  it("apellido y nombre, y 'Sin nombre' si no hay ninguno", () => {
    expect(nombreCompleto(p("1", "Pérez", "Juan"))).toBe("Pérez, Juan");
    expect(nombreCompleto(p("1", "Pérez", ""))).toBe("Pérez");
    expect(nombreCompleto(p("1", " ", ""))).toBe("Sin nombre");
  });
  it("resume documento y estado civil con puntos en el DNI", () => {
    expect(resumenPersona(p("1", "A", "B", { tipo_doc: "DNI", nro_doc: "31645431", estado_civil: "casado" }))).toBe("DNI 31.645.431 · casado");
    expect(resumenPersona(p("1", "A", "B", { nro_doc: null }))).toBe("Sin documento cargado");
    expect(resumenPersona(p("1", "A", "B", { tipo_doc: "Pasaporte", nro_doc: "AB123" }))).toBe("Pasaporte AB123");
  });
});

describe("textoActualizada", () => {
  it("dice hoy, ayer, hace días, hace meses o la fecha", () => {
    const hace = (n) => new Date(AHORA - n * DIA).toISOString();
    expect(textoActualizada(hace(0), AHORA)).toBe("Actualizada hoy");
    expect(textoActualizada(hace(1), AHORA)).toBe("Actualizada ayer");
    expect(textoActualizada(hace(5), AHORA)).toBe("Actualizada hace 5 días");
    expect(textoActualizada(hace(45), AHORA)).toBe("Actualizada hace 1 mes");
    expect(textoActualizada(hace(100), AHORA)).toBe("Actualizada hace 3 meses");
    expect(textoActualizada(new Date("2025-03-04T15:00:00-03:00").toISOString(), AHORA)).toBe("Actualizada el 04/03/2025");
  });
  it("sin fecha o fecha inválida no inventa nada", () => {
    expect(textoActualizada(null, AHORA)).toBe("");
    expect(textoActualizada("nada", AHORA)).toBe("");
  });
});

describe("datosQueFaltan", () => {
  it("avisa del documento, el estado civil y el domicilio", () => {
    expect(datosQueFaltan(p("1", "A", "B"))).toEqual(["el documento", "el estado civil", "el domicilio"]);
    expect(datosQueFaltan(p("1", "A", "B", { nro_doc: "1", estado_civil: "soltero", calle: "San Martín" }))).toEqual([]);
    expect(datosQueFaltan(p("1", "A", "B", { nro_doc: "1", estado_civil: "soltero", localidad: "Dorrego" }))).toEqual([]);
  });
});

describe("filtrarLibreta", () => {
  const libreta = [p("1", "García", "Juan", { nro_doc: "20123456" }), p("2", "Pérez Gómez", "María", { nro_doc: "30111222" }), p("3", "Álvarez", "Ana"), p("4", "Sosa", "Luis")];
  it("busca por apellido o nombre sin importar tildes ni mayúsculas", () => {
    expect(filtrarLibreta(libreta, "perez").map((x) => x.id)).toEqual(["2"]);
    expect(filtrarLibreta(libreta, "ALVAREZ ana").map((x) => x.id)).toEqual(["3"]);
    expect(filtrarLibreta(libreta, "maria perez").map((x) => x.id)).toEqual(["2"]);
  });
  it("busca por documento con o sin puntos, por el comienzo", () => {
    expect(filtrarLibreta(libreta, "20.123").map((x) => x.id)).toEqual(["1"]);
    expect(filtrarLibreta(libreta, "301112").map((x) => x.id)).toEqual(["2"]);
  });
  it("sin texto devuelve todas ordenadas por apellido, y deja afuera las ya agregadas", () => {
    expect(filtrarLibreta(libreta, "").map((x) => x.id)).toEqual(["3", "1", "2", "4"]);
    expect(filtrarLibreta(libreta, "", new Set(["1", "3"])).map((x) => x.id)).toEqual(["2", "4"]);
  });
  it("limita la cantidad", () => {
    const muchas = Array.from({ length: 50 }, (_, i) => p(String(i), `Apellido${String(i).padStart(2, "0")}`, "X"));
    expect(filtrarLibreta(muchas, "", new Set(), 20)).toHaveLength(20);
  });
});

describe("agruparArchivos", () => {
  it("separa los archivos por persona y deja aparte los sin asignar o de una persona que ya no está", () => {
    const personas = [p("p1", "A", "A"), p("p2", "B", "B")];
    const archivos = [{ id: "a1", persona_id: "p1" }, { id: "a2", persona_id: "p1" }, { id: "a3", persona_id: null }, { id: "a4", persona_id: "p9" }, { id: "a5" }];
    const g = agruparArchivos(archivos, personas);
    expect(g.porPersona.get("p1").map((a) => a.id)).toEqual(["a1", "a2"]);
    expect(g.porPersona.get("p2")).toEqual([]);
    expect(g.sinAsignar.map((a) => a.id)).toEqual(["a3", "a4", "a5"]);
  });
});

describe("propuestasDeArchivos (T3.1)", () => {
  const delExpediente = [p("p1", "Pérez", "Juan")];
  const libreta = [p("p1", "Pérez", "Juan"), p("p2", "Gómez", "Ana"), p("p3", "Sosa", "Luis")];
  const arch = (id, ap, no, extra = {}) => ({ id, persona_id: null, ident_apellido: ap, ident_nombre: no, ...extra });

  it("un archivo cuyo titular ya está en el expediente se propone asignarlo", () => {
    const r = propuestasDeArchivos([arch("a1", "Pérez", "Juan"), arch("a2", "PEREZ", "juan")], delExpediente, libreta);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ tipo: "asignar", persona: { id: "p1" } });
    expect(r[0].archivos.map((a) => a.id)).toEqual(["a1", "a2"]);
  });
  it("si está en la libreta pero no en el expediente, se propone agregar la existente", () => {
    const r = propuestasDeArchivos([arch("a1", "Gómez", "Ana")], delExpediente, libreta);
    expect(r[0]).toMatchObject({ tipo: "agregar", persona: { id: "p2" } });
  });
  it("si no existe en ningún lado, se propone crearla con el nombre leído", () => {
    const r = propuestasDeArchivos([arch("a1", "Núñez", "Marta"), arch("a2", "Núñez", "Marta")], delExpediente, libreta);
    expect(r[0]).toMatchObject({ tipo: "crear", apellido: "Núñez", nombre: "Marta" });
    expect(r[0].archivos).toHaveLength(2);
  });
  it("no depende del orden apellido/nombre", () => {
    const r = propuestasDeArchivos([arch("a1", "Juan", "Pérez")], delExpediente, libreta);
    expect(r[0]).toMatchObject({ tipo: "asignar", persona: { id: "p1" } });
  });
  it("ignora los archivos ya asignados, sin nombre leído o sin identificar", () => {
    const r = propuestasDeArchivos([arch("a1", "Pérez", "Juan", { persona_id: "p1" }), arch("a2", null, null), arch("a3", "", ""), { id: "a4", persona_id: null }], delExpediente, libreta);
    expect(r).toEqual([]);
  });
  it("agrupa por persona y ordena por apellido", () => {
    const r = propuestasDeArchivos([arch("a1", "Zárate", "Rosa"), arch("a2", "Núñez", "Marta"), arch("a3", "Zárate", "Rosa")], [], []);
    expect(r.map((x) => x.apellido)).toEqual(["Núñez", "Zárate"]);
  });
  it("no propone a quien el usuario ya descartó", () => {
    const r = propuestasDeArchivos([arch("a1", "Núñez", "Marta")], [], [], new Set([clavePersona("Núñez", "Marta")]));
    expect(r).toEqual([]);
  });
});

describe("comparacionLectura (T4.1): lo leído nunca pisa lo escrito", () => {
  const lectura = { apellido: "GARCÍA", nombre: "JUAN CARLOS", nro_doc: "20.123.456", tipo_doc: "DNI", genero: "m", fecha_nac: "04/03/1980", nacionalidad: "Argentina", calle: "SAN MARTIN", numero: "123", localidad: "DORREGO", departamento: "Guaymallén", estado_civil: "" };

  it("completa solo los campos vacíos y cuenta lo leído", () => {
    const ficha = { ...vacioFicha(), apellido: "García", nombre: "" };
    const r = comparacionLectura(ficha, lectura);
    expect(r.rellenar).toMatchObject({ nombre: "Juan Carlos", nro_doc: "20123456", genero: "M", fecha_nac: "04/03/1980", calle: "San Martin", localidad: "Dorrego" });
    expect(r.rellenar.apellido).toBeUndefined();   // ya estaba
    expect(r.discrepancias).toEqual([]);
    expect(r.leidos).toBeGreaterThan(5);
  });
  it("marca discrepancias en vez de pisar: 'El DNI dice X · Tenés Y'", () => {
    const ficha = { ...vacioFicha(), apellido: "García", nombre: "Pedro", nro_doc: "20123456", fecha_nac: "05/03/1980" };
    const r = comparacionLectura(ficha, lectura);
    expect(r.rellenar.nombre).toBeUndefined();
    expect(r.rellenar.fecha_nac).toBeUndefined();
    expect(r.discrepancias).toEqual([
      { campo: "nombre", dni: "Juan Carlos", actual: "Pedro" },
      { campo: "fecha_nac", dni: "04/03/1980", actual: "05/03/1980" },
    ]);
  });
  it("lo que es igual salvo tildes, mayúsculas o puntos no es una discrepancia", () => {
    const ficha = { ...vacioFicha(), apellido: "garcia", nombre: "juan carlos", nro_doc: "20123456" };
    const r = comparacionLectura(ficha, lectura);
    expect(r.discrepancias).toEqual([]);
  });
  it("calcula el CUIT cuando hay documento y género y no hay CUIT", () => {
    const r = comparacionLectura({ ...vacioFicha() }, lectura);
    expect(r.rellenar.cuit).toMatch(/^2[03]-20123456-\d$/);
    const con = comparacionLectura({ ...vacioFicha(), cuit: "20-20123456-6" }, lectura);
    expect(con.rellenar.cuit).toBeUndefined();
  });
  it("el estado civil leído solo se usa si es de la lista y queda concordado con el género", () => {
    const f = { ...vacioFicha(), genero: "F" };
    expect(comparacionLectura(f, { ...lectura, genero: "", estado_civil: "Casado" }).rellenar.estado_civil).toBe("casada");
    expect(comparacionLectura(f, { ...lectura, genero: "", estado_civil: "conviviente" }).rellenar.estado_civil).toBeUndefined();
  });
  it("una lectura vacía o inválida no cambia nada ni rompe", () => {
    for (const l of [null, undefined, {}, { personas: [] }]) {
      const r = comparacionLectura(vacioFicha(), l);
      expect(r).toMatchObject({ rellenar: {}, discrepancias: [], leidos: 0 });
    }
  });
  it("acepta el resultado completo del lector ({ personas: [..] })", () => {
    const r = comparacionLectura(vacioFicha(), { personas: [lectura] });
    expect(r.rellenar.apellido).toBe("García");
  });
});

describe("datosDeFicha", () => {
  it("arma lo que se manda al servidor: solo las columnas editables, sin el id ni el registro", () => {
    const d = datosDeFicha({ id: "x", registro_id: "853", updated_at: "z", created_at: "z", apellido: "A", nombre: "B", notas: "n", representaciones: [] });
    expect(d).toMatchObject({ apellido: "A", nombre: "B", notas: "n" });
    expect(d.id).toBeUndefined();
    expect(d.registro_id).toBeUndefined();
    expect(d.representaciones).toBeUndefined();
    expect(d.updated_at).toBeUndefined();
  });
});

describe("cuitCalculado / validarFicha", () => {
  it("calcula el CUIT solo con DNI de 7 u 8 números y género", () => {
    expect(cuitCalculado({ tipo_doc: "DNI", nro_doc: "31645431", genero: "M" })).toMatch(/^20-31645431-\d$/);
    expect(cuitCalculado({ tipo_doc: "DNI", nro_doc: "6123456", genero: "F" })).toMatch(/^27-06123456-\d$/);
    expect(cuitCalculado({ tipo_doc: "DNI", nro_doc: "31645431", genero: "" })).toBe("");
    expect(cuitCalculado({ tipo_doc: "Pasaporte", nro_doc: "31645431", genero: "M" })).toBe("");
    expect(cuitCalculado({ tipo_doc: "DNI", nro_doc: "123", genero: "M" })).toBe("");
  });
  it("pide al menos apellido o nombre", () => {
    expect(validarFicha({ apellido: " ", nombre: "" }).apellido).toBeTruthy();
    expect(validarFicha({ apellido: "", nombre: "Ana" })).toEqual({});
  });
  it("valida el DNI (solo para DNI/LE/LC) y la fecha de nacimiento", () => {
    expect(validarFicha({ apellido: "A", tipo_doc: "DNI", nro_doc: "123" }).nro_doc).toBeTruthy();
    expect(validarFicha({ apellido: "A", tipo_doc: "DNI", nro_doc: "" })).toEqual({});
    expect(validarFicha({ apellido: "A", tipo_doc: "Pasaporte", nro_doc: "AB12" })).toEqual({});
    expect(validarFicha({ apellido: "A", fecha_nac: "31/02/1980" }).fecha_nac).toBeTruthy();
    expect(validarFicha({ apellido: "A", fecha_nac: "04/03/1980" })).toEqual({});
    expect(validarFicha({ apellido: "A", fecha_nac: "04/03/2999" }).fecha_nac).toBeTruthy();
    expect(validarFicha({ apellido: "A", fecha_nac: "4/3/80" }).fecha_nac).toBeTruthy();
  });
});
