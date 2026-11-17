import { describe, it, expect } from "vitest";
import { agruparLecturas, fusionarGrupo, fusionarPersonas, indiceQueCoincide } from "../utils/fusionPersonas";

const garcia = { apellido: "GARCÍA", nombre: "JUAN CARLOS", nro_doc: "20.123.456", fecha_nac: "04/03/1980", calle: "SAN MARTIN", numero: "123", localidad: "DORREGO" };
const perez = { apellido: "PÉREZ", nombre: "ANA", nro_doc: "27.555.888", fecha_nac: "10/10/1985" };

describe("agruparLecturas: varias fotos y varias personas", () => {
  it("el frente y el dorso del mismo DNI son una sola persona; el dorso (solo dirección) se suma", () => {
    const frente = { persona: { apellido: "GARCÍA", nombre: "JUAN CARLOS", nro_doc: "20123456", fecha_nac: "04/03/1980" }, tipo_documento: "DNI", foto: "frente.jpg" };
    const dorso = { persona: { calle: "SAN MARTIN", numero: "123", localidad: "DORREGO" }, tipo_documento: "DNI", foto: "dorso.jpg" };
    const { personas, sinAtribuir } = agruparLecturas([frente, dorso]);
    expect(personas).toHaveLength(1);
    expect(sinAtribuir).toBe(0);
    expect(personas[0]).toMatchObject({ apellido: "GARCÍA", calle: "SAN MARTIN", localidad: "DORREGO" });
    expect(personas[0]._fotos.sort()).toEqual(["dorso.jpg", "frente.jpg"]);
  });

  it("un DNI y una licencia de la MISMA persona se unen (aunque la licencia traiga el nombre en otro orden)", () => {
    const dni = { persona: { ...garcia, nro_doc: "20123456" }, tipo_documento: "DNI", foto: "a" };
    const licencia = { persona: { apellido: "Juan Carlos", nombre: "García" }, tipo_documento: "licencia", foto: "b" }; // sin número
    const { personas } = agruparLecturas([dni, licencia]);
    expect(personas).toHaveLength(1);
  });

  it("dos personas distintas en la misma foto quedan separadas", () => {
    const { personas } = agruparLecturas([{ persona: garcia, tipo_documento: "DNI", foto: "x" }, { persona: perez, tipo_documento: "DNI", foto: "x" }]);
    expect(personas).toHaveLength(2);
    expect(personas.map((p) => p.apellido).sort()).toEqual(["GARCÍA", "PÉREZ"]);
  });

  it("con dos personas, una foto sin nombre ni número NO se inventa como tercera persona: queda sin atribuir", () => {
    const dorso = { persona: { calle: "BELGRANO", numero: "45" }, tipo_documento: "DNI", foto: "dorso" };
    const { personas, sinAtribuir } = agruparLecturas([{ persona: garcia, foto: "a" }, { persona: perez, foto: "b" }, dorso]);
    expect(personas).toHaveLength(2);
    expect(sinAtribuir).toBe(1);
    expect(personas.every((p) => p.calle !== "BELGRANO")).toBe(true);
  });

  it("si el DNI y la licencia traen domicilios distintos, lo avisa (y gana el DNI)", () => {
    const dni = { persona: { ...garcia, calle: "SAN MARTIN", nro_doc: "20123456" }, tipo_documento: "DNI", foto: "dni" };
    const lic = { persona: { ...garcia, calle: "BELGRANO", nro_doc: "20123456" }, tipo_documento: "licencia", foto: "lic" };
    const { personas } = agruparLecturas([lic, dni]);
    expect(personas[0].calle).toBe("SAN MARTIN");
    expect(personas[0]._discrepancias).toEqual([{ campo: "calle", valores: ["SAN MARTIN", "BELGRANO"] }]);
  });

  it("el mismo domicilio escrito distinto (tildes, mayúsculas) no es discrepancia", () => {
    const a = { persona: { ...garcia, localidad: "Dorrego", nro_doc: "20123456" }, tipo_documento: "DNI", foto: "a" };
    const b = { persona: { ...garcia, localidad: "DORREGO", nro_doc: "20123456" }, tipo_documento: "licencia", foto: "b" };
    expect(agruparLecturas([a, b]).personas[0]._discrepancias).toEqual([]);
  });

  it("sin nada legible: lista vacía", () => {
    expect(agruparLecturas([{ persona: {}, foto: "a" }])).toEqual({ personas: [], sinAtribuir: 1 });
    expect(agruparLecturas([])).toEqual({ personas: [], sinAtribuir: 0 });
    expect(agruparLecturas(undefined)).toEqual({ personas: [], sinAtribuir: 0 });
  });
});

describe("indiceQueCoincide: cuál de las personas leídas es la de esta ficha", () => {
  const leidas = [{ ...garcia }, { ...perez }];
  it("por número de documento", () => { expect(indiceQueCoincide({ nro_doc: "27555888" }, leidas)).toBe(1); });
  it("por nombre, sin importar orden ni tildes", () => { expect(indiceQueCoincide({ apellido: "garcia", nombre: "juan carlos" }, leidas)).toBe(0); });
  it("ficha vacía: no hay cuál elegir (se pregunta)", () => { expect(indiceQueCoincide({}, leidas)).toBe(-1); });
  it("ficha de otra persona: se pregunta", () => { expect(indiceQueCoincide({ apellido: "Sosa", nombre: "Luis", nro_doc: "30111222" }, leidas)).toBe(-1); });
});

describe("la fusión del servidor (captura) no cambió", () => {
  it("solo avisa discrepancias de los campos que identifican a la persona", () => {
    const items = [
      { persona: { ...garcia, nro_doc: "20123456", calle: "A" }, tipo_documento: "DNI", foto: 1 },
      { persona: { ...garcia, nro_doc: "20123456", calle: "B" }, tipo_documento: "licencia", foto: 2 },
    ];
    expect(fusionarPersonas(items)[0]._discrepancias).toEqual([]);
    expect(fusionarGrupo(items)._discrepancias).toEqual([]);
  });
});
