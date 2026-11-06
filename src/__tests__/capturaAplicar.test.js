import { describe, it, expect } from "vitest";
import { aplicarCapturaAPartes, aplicarCapturaAVehiculos, agregarPersonaAPartes } from "../utils/capturaAplicar.js";
import { PARTE_VACIA } from "../constants.js";

const comprador = { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20.123.456", tipo_doc: "DNI", fecha_nac: "01/02/1980", calle: "San Martin", numero: "100", localidad: "Godoy Cruz", rol: "comprador" };
const vendedor = { apellido: "GOMEZ", nombre: "MARIA", nro_doc: "27111222", rol: "VENDEDOR", genero: "F" };

describe("aplicar personas de la captura a las partes", () => {
  it("con la parte inicial vacía, la primera persona la ocupa y las otras se agregan", () => {
    const r = aplicarCapturaAPartes([PARTE_VACIA()], [comprador, vendedor], PARTE_VACIA);
    expect(r).toHaveLength(2);
    expect(r.map((p) => [p.apellido, p.rol, p.nroDoc])).toEqual([["PEREZ", "COMPRADOR", "20123456"], ["GOMEZ", "VENDEDOR", "27111222"]]);
    expect(r[0].fechaNac).toBe("01/02/1980");
    expect(r[0].localidad).toBe("Godoy Cruz");
    expect(r[0].departamento).toBe("Ciudad");   // mismo valor por defecto que el manejador existente de Scriba
  });

  it("no pisa lo que ya había: si ya hay partes, agrega", () => {
    const existente = { ...PARTE_VACIA(), apellido: "RUIZ", nroDoc: "30333444", rol: "VENDEDOR" };
    const r = aplicarCapturaAPartes([existente], [comprador], PARTE_VACIA);
    expect(r).toHaveLength(2);
    expect(r[0].apellido).toBe("RUIZ");
  });

  it("la misma persona (mismo DNI) no se duplica: se actualiza su rol", () => {
    const antes = aplicarCapturaAPartes([PARTE_VACIA()], [{ ...comprador, rol: "VENDEDOR" }], PARTE_VACIA);
    const despues = aplicarCapturaAPartes(antes, [{ ...comprador, rol: "COMPRADOR" }], PARTE_VACIA);
    expect(despues).toHaveLength(1);
    expect(despues[0].rol).toBe("COMPRADOR");
  });

  it("un campo vacío de la captura no borra un dato que ya estaba al actualizar", () => {
    const base = aplicarCapturaAPartes([PARTE_VACIA()], [comprador], PARTE_VACIA);
    const r = aplicarCapturaAPartes(base, [{ nro_doc: "20123456", rol: "COMPRADOR", calle: "" }], PARTE_VACIA);
    expect(r[0].calle).toBe("San Martin");
    expect(r[0].apellido).toBe("PEREZ");
  });

  it("sin personas no cambia nada", () => {
    const base = [PARTE_VACIA()];
    expect(aplicarCapturaAPartes(base, [], PARTE_VACIA)).toBe(base);
    expect(aplicarCapturaAPartes(base, undefined, PARTE_VACIA)).toBe(base);
  });

  it("no muta las partes originales", () => {
    const base = [PARTE_VACIA()];
    const copia = JSON.stringify(base);
    agregarPersonaAPartes(base, comprador, PARTE_VACIA);
    expect(JSON.stringify(base)).toBe(copia);
  });
});

describe("aplicar vehículos de la captura", () => {
  const auto = { marca: "FORD", modelo: "FIESTA", dominio: "AB123CD", chasis: "9BF", tipo_vehiculo: "VEHÍCULO" };

  it("agrega el vehículo con tipo y un id propio", () => {
    const r = aplicarCapturaAVehiculos([], [auto]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ marca: "FORD", dominio: "AB123CD", tipo_vehiculo: "VEHÍCULO" });
    expect(r[0].id).toBeDefined();
  });

  it("el mismo dominio se actualiza en vez de duplicarse", () => {
    const una = aplicarCapturaAVehiculos([], [auto]);
    const dos = aplicarCapturaAVehiculos(una, [{ ...auto, modelo: "FIESTA KD" }]);
    expect(dos).toHaveLength(1);
    expect(dos[0].modelo).toBe("FIESTA KD");
  });

  it("varios vehículos distintos se suman", () => {
    expect(aplicarCapturaAVehiculos([], [auto, { ...auto, dominio: "XY999ZZ" }])).toHaveLength(2);
  });
});
