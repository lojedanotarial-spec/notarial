// Lógica pura de las fichas de personas del registro (api/_personas.js). Spec: specs/personas-expediente/ (T1.1).
import { describe, it, expect } from "vitest";
import {
  CAMPOS_FICHA, normalizarTexto, normalizarDni, limpiarDatosFicha, armarFilaFicha, fichaNueva, sinNombre,
  buscarDuplicada, camposCambiados, fichaPublica,
} from "../../api/_personas.js";

describe("normalizarTexto / normalizarDni", () => {
  it("compara sin tildes, mayúsculas, signos ni espacios de más", () => {
    expect(normalizarTexto("  Pérez   GÓMEZ, ")).toBe("perez gomez");
    expect(normalizarTexto("O'Brien-Smith")).toBe("o brien smith");
    expect(normalizarTexto(null)).toBe("");
  });
  it("el documento queda sin puntos ni espacios; vacío es null (no '')", () => {
    expect(normalizarDni("20.123.456")).toBe("20123456");
    expect(normalizarDni(" 20 123 456 ")).toBe("20123456");
    expect(normalizarDni("")).toBeNull();
    expect(normalizarDni("   ")).toBeNull();
    expect(normalizarDni(null)).toBeNull();
    expect(normalizarDni("ab-123")).toBe("AB123");
  });
});

describe("limpiarDatosFicha", () => {
  it("devuelve solo las columnas permitidas: el navegador no puede elegir el registro ni el id", () => {
    const r = limpiarDatosFicha({ apellido: " García ", nombre: "Juan", registro_id: "111", id: "x", tipo: "juridica", representaciones: [1], updated_at: "ayer" }, { crear: true });
    expect(r).toEqual({ ok: true, datos: { apellido: "García", nombre: "Juan" } });
  });
  it("solo incluye lo que vino (sirve para editar un dato sin tocar el resto)", () => {
    expect(limpiarDatosFicha({ notas: "casada con Pérez" })).toEqual({ ok: true, datos: { notas: "casada con Pérez" } });
  });
  it("para crear exige apellido o nombre; para editar no", () => {
    expect(limpiarDatosFicha({ notas: "x" }, { crear: true }).ok).toBe(false);
    expect(limpiarDatosFicha({ apellido: "  " }, { crear: true }).ok).toBe(false);
    expect(limpiarDatosFicha({ nombre: "Ana" }, { crear: true }).ok).toBe(true);
  });
  it("el DNI vacío es null y se guarda sin puntos", () => {
    expect(limpiarDatosFicha({ apellido: "A", nro_doc: "" }, { crear: true }).datos.nro_doc).toBeNull();
    expect(limpiarDatosFicha({ apellido: "A", nro_doc: "20.123.456" }, { crear: true }).datos.nro_doc).toBe("20123456");
    expect(limpiarDatosFicha({ apellido: "A", nro_doc: 20123456 }, { crear: true }).datos.nro_doc).toBe("20123456");
  });
  it("rechaza un estado civil o un género fuera de la lista, y acepta la unión convivencial", () => {
    expect(limpiarDatosFicha({ estado_civil: "conviviente" }).ok).toBe(false);
    expect(limpiarDatosFicha({ genero: "X" }).ok).toBe(false);
    expect(limpiarDatosFicha({ estado_civil: "Unión convivencial" })).toEqual({ ok: true, datos: { estado_civil: "unión convivencial" } });
    expect(limpiarDatosFicha({ estado_civil: "" })).toEqual({ ok: true, datos: { estado_civil: "" } });
    expect(limpiarDatosFicha({ estado_civil: "Soltero" }).datos.estado_civil).toBe("soltero");
  });
  it("rechaza datos demasiado largos o con formato raro", () => {
    expect(limpiarDatosFicha({ apellido: "x".repeat(201) }).ok).toBe(false);
    expect(limpiarDatosFicha({ notas: "x".repeat(2001) }).ok).toBe(false);
    expect(limpiarDatosFicha({ notas: "x".repeat(2000) }).ok).toBe(true);
    expect(limpiarDatosFicha({ apellido: { a: 1 } }).ok).toBe(false);
    expect(limpiarDatosFicha("hola").ok).toBe(true);
  });
  it("cubre todos los datos de una parte del editor (barrio, manzana, casa, provincia, país, notas)", () => {
    for (const c of ["barrio", "manzana", "casa", "provincia", "pais", "notas", "estado_civil", "cuit", "fecha_nac", "departamento"]) expect(CAMPOS_FICHA).toContain(c);
    for (const c of ["id", "registro_id", "created_at", "updated_at", "representaciones", "tipo"]) expect(CAMPOS_FICHA).not.toContain(c);
  });
});

describe("armarFilaFicha / fichaNueva", () => {
  it("el estado civil concuerda con el género: casado + F = casada", () => {
    expect(armarFilaFicha({ genero: "M", estado_civil: "casado" }, { genero: "F" }).estado_civil).toBe("casada");
    expect(armarFilaFicha({ genero: "F", estado_civil: "viuda" }, { estado_civil: "viudo" }).estado_civil).toBe("viuda");
    expect(armarFilaFicha({ genero: "F", estado_civil: "unión convivencial" }, { genero: "M" }).estado_civil).toBe("unión convivencial");
  });
  it("no toca el estado civil si no cambió ni el estado ni el género", () => {
    expect(armarFilaFicha({ genero: "F", estado_civil: "casado" }, { notas: "x" }).estado_civil).toBe("casado");
  });
  it("una ficha nueva lleva el registro del servidor, DNI como tipo por defecto, sin documento (null) y sin pisar nada", () => {
    const f = fichaNueva({ apellido: "García", nombre: "Juan", genero: "M", estado_civil: "casado" }, "853", "2026-11-12T10:00:00.000Z");
    expect(f).toMatchObject({ registro_id: "853", tipo: "fisica", tipo_doc: "DNI", nro_doc: null, apellido: "García", estado_civil: "casado", barrio: "", notas: "", representaciones: [], updated_at: "2026-11-12T10:00:00.000Z" });
  });
  it("sinNombre detecta una ficha sin apellido ni nombre", () => {
    expect(sinNombre({ apellido: " ", nombre: "" })).toBe(true);
    expect(sinNombre({ apellido: "", nombre: "Ana" })).toBe(false);
  });
});

describe("buscarDuplicada", () => {
  const fichas = [
    { id: "p1", apellido: "García", nombre: "Juan", nro_doc: "20123456" },
    { id: "p2", apellido: "Pérez Gómez", nombre: "María", nro_doc: null },
    { id: "p3", apellido: "Sosa", nombre: "Ana", nro_doc: "" },
  ];
  it("por documento, aunque venga con puntos y aunque el nombre sea otro", () => {
    expect(buscarDuplicada(fichas, { nro_doc: "20.123.456", apellido: "Otro", nombre: "Nombre" })).toEqual({ por: "dni", persona: fichas[0] });
  });
  it("sin documento, por apellido y nombre (sin tildes ni mayúsculas)", () => {
    expect(buscarDuplicada(fichas, { nro_doc: "", apellido: "PEREZ GOMEZ", nombre: "maria" })).toEqual({ por: "nombre", persona: fichas[1] });
  });
  it("con documento nuevo NO avisa por nombre repetido (pueden ser homónimos)", () => {
    expect(buscarDuplicada(fichas, { nro_doc: "99999999", apellido: "García", nombre: "Juan" })).toBeNull();
  });
  it("no se avisa a sí misma al editar", () => {
    expect(buscarDuplicada(fichas, { nro_doc: "20123456" }, "p1")).toBeNull();
    expect(buscarDuplicada(fichas, { nro_doc: "", apellido: "Sosa", nombre: "Ana" }, "p3")).toBeNull();
  });
  it("sin documento ni nombre no hay nada que comparar", () => {
    expect(buscarDuplicada(fichas, { nro_doc: "", apellido: "", nombre: "" })).toBeNull();
    expect(buscarDuplicada([], { nro_doc: "1" })).toBeNull();
  });
});

describe("camposCambiados / fichaPublica", () => {
  it("lista los NOMBRES de los campos que cambiaron, nunca los valores", () => {
    const antes = { apellido: "García", estado_civil: "soltero", notas: "" };
    const lista = camposCambiados(antes, { apellido: "García", estado_civil: "casado", notas: "con Pérez" });
    expect(lista).toEqual(["estado_civil", "notas"]);
    expect(JSON.stringify(lista)).not.toMatch(/casado|Pérez|García/);
  });
  it("ignora lo que no vino y lo que no cambió ('' = null)", () => {
    expect(camposCambiados({ nro_doc: null, notas: "" }, { nro_doc: "", notas: "" })).toEqual([]);
    expect(camposCambiados({ apellido: "A" }, {})).toEqual([]);
  });
  it("la ficha pública no lleva el registro", () => {
    expect(fichaPublica({ id: "p", registro_id: "853", apellido: "A" })).toEqual({ id: "p", apellido: "A" });
    expect(fichaPublica(null)).toBeNull();
  });
});
