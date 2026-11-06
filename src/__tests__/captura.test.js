import { describe, it, expect } from "vitest";
import {
  generarCodigo, hashCodigo, calcularVencimientos, renovarExpiracion, codigoVigente,
  armarEtiqueta, esperadasPara, fusionarPersonas, camposNoLeidos, clasificarFoto,
  fusionarVehiculosPorGrupo, armarResultadoLibre, armarResultadoParte, debePurgarse, ESTADO_AL_PURGAR,
  INACTIVIDAD_MS, VENCE_DURO_MS, PURGA_MS, MIN,
} from "../../api/_captura.js";

const T0 = Date.parse("2026-11-06T12:00:00Z");

describe("códigos y vencimientos", () => {
  it("el código es largo, distinto cada vez y se guarda solo como hash", () => {
    const a = generarCodigo(), b = generarCodigo();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(40);
    expect(hashCodigo(a)).toMatch(/^[0-9a-f]{64}$/);
    expect(hashCodigo(a)).not.toContain(a);
    expect(hashCodigo(a)).toBe(hashCodigo(a));
  });

  it("vencimientos: 10 min de inactividad, 60 min tope duro, 24 h para destruir", () => {
    const v = calcularVencimientos(T0);
    expect(Date.parse(v.expira_en) - T0).toBe(INACTIVIDAD_MS);
    expect(Date.parse(v.vence_duro) - T0).toBe(VENCE_DURO_MS);
    expect(Date.parse(v.purgar_en) - T0).toBe(PURGA_MS);
  });

  it("la actividad corre el vencimiento pero nunca pasa del tope duro", () => {
    const c = { ...calcularVencimientos(T0), estado: "abierta" };
    const renovada = renovarExpiracion(c, T0 + 50 * MIN);
    expect(Date.parse(renovada)).toBe(T0 + 60 * MIN);            // 50 + 10 = 60: justo el tope
    const sobre = renovarExpiracion(c, T0 + 58 * MIN);
    expect(Date.parse(sobre)).toBe(T0 + 60 * MIN);               // 58 + 10 > 60: queda en el tope
  });

  it("un código vencido, cancelado o entregado no sirve", () => {
    const c = { ...calcularVencimientos(T0), estado: "abierta" };
    expect(codigoVigente(c, T0 + 5 * MIN)).toBe(true);
    expect(codigoVigente(c, T0 + 11 * MIN)).toBe(false);          // 10 min sin actividad
    expect(codigoVigente({ ...c, estado: "cancelada" }, T0 + MIN)).toBe(false);
    expect(codigoVigente({ ...c, estado: "entregada" }, T0 + MIN)).toBe(false);
    expect(codigoVigente(null, T0)).toBe(false);
    const renovado = { ...c, expira_en: renovarExpiracion(c, T0 + 9 * MIN) };
    expect(codigoVigente(renovado, T0 + 15 * MIN)).toBe(true);     // la actividad a los 9 min lo extendió
    expect(codigoVigente(renovado, T0 + 61 * MIN)).toBe(false);    // pero el tope duro manda
  });
});

describe("etiquetas y expectativas", () => {
  it("parte: dice de quién", () => {
    expect(armarEtiqueta("parte", { rol: "comprador" })).toBe("Frente y dorso del documento del COMPRADOR");
    expect(armarEtiqueta("parte", {})).toBe("Frente y dorso del documento de la persona");
  });
  it("no deja pasar marcado raro en la etiqueta", () => {
    expect(armarEtiqueta("libre", { etiqueta: "<b>hola</b>" })).toBe("bhola/b");
  });
  it("parte espera 2 fotos; libre, ninguna", () => {
    expect(esperadasPara("parte").minimo).toBe(2);
    expect(esperadasPara("libre")).toEqual({});
  });
});

describe("fusionar personas", () => {
  const dniFrente = { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20.123.456", fecha_nac: "01/02/1980", genero: "M" };
  const dniDorso = { apellido: "", nombre: "", nro_doc: "20123456", calle: "San Martin", numero: "100", localidad: "Godoy Cruz" };

  it("frente y dorso del mismo DNI dan una sola persona con los datos de las dos caras", () => {
    const r = fusionarPersonas([
      { persona: dniFrente, tipo_documento: "DNI", foto: 0 },
      { persona: dniDorso, tipo_documento: "DNI", foto: 1 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ apellido: "PEREZ", nombre: "JUAN", calle: "San Martin", fecha_nac: "01/02/1980" });
    expect(r[0]._fotos).toEqual([0, 1]);
    expect(r[0]._discrepancias).toEqual([]);
  });

  it("dos personas distintas quedan separadas", () => {
    const r = fusionarPersonas([
      { persona: dniFrente, tipo_documento: "DNI", foto: 0 },
      { persona: { apellido: "GOMEZ", nombre: "MARIA", nro_doc: "27111222" }, tipo_documento: "DNI", foto: 1 },
    ]);
    expect(r).toHaveLength(2);
  });

  it("sin número de documento empareja por apellido y nombre, sin importar tildes ni mayúsculas", () => {
    const r = fusionarPersonas([
      { persona: { apellido: "Núñez", nombre: "Ana" }, tipo_documento: "DNI", foto: 0 },
      { persona: { apellido: "NUNEZ", nombre: "ANA", calle: "Rivadavia" }, tipo_documento: "DNI", foto: 1 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].calle).toBe("Rivadavia");
  });

  it("DNI y licencia de la misma persona: prevalece el DNI y se marca la diferencia", () => {
    const r = fusionarPersonas([
      { persona: { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456", fecha_nac: "01/02/1980" }, tipo_documento: "licencia", foto: 0 },
      { persona: { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456", fecha_nac: "02/02/1980" }, tipo_documento: "DNI", foto: 1 },
    ]);
    expect(r).toHaveLength(1);
    expect(r[0].fecha_nac).toBe("02/02/1980");
    expect(r[0]._discrepancias).toEqual([{ campo: "fecha_nac", valores: ["02/02/1980", "01/02/1980"] }]);
  });

  it("un campo vacío no se inventa", () => {
    const [p] = fusionarPersonas([{ persona: { apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456" }, tipo_documento: "DNI", foto: 0 }]);
    expect(p.fecha_nac).toBeUndefined();
    expect(camposNoLeidos(p)).toEqual(["fecha de nacimiento"]);
  });

  it("ignora entradas sin persona", () => {
    expect(fusionarPersonas([{ foto: 0 }, null])).toEqual([]);
  });
});

describe("clasificar fotos y vehículos", () => {
  const frente = { tipo_documento: "tarjeta_verde", vehiculo: { dominio: "ab 123 cd", marca: "FORD" }, titular: { apellido: "PEREZ", nro_doc: "20123456" } };
  const dorso = { tipo_documento: "tarjeta_verde", personas: [{ apellido: "PEREZ", nombre: "JUAN", _rol_sugerido: "AUTORIZANTE" }] };
  const dni = { tipo_documento: "DNI", personas: [{ apellido: "GOMEZ", nombre: "MARIA", nro_doc: "27111222" }] };
  const nada = { tipo_documento: "otro", personas: [], notas: "No es un documento" };

  it("distingue frente de tarjeta, dorso, persona y otra cosa", () => {
    expect(clasificarFoto(frente)).toBe("vehiculo_frente");
    expect(clasificarFoto(dorso)).toBe("vehiculo_dorso");
    expect(clasificarFoto(dni)).toBe("persona");
    expect(clasificarFoto(nada)).toBe("otro");
    expect(clasificarFoto(null)).toBe("otro");
  });

  it("vehículos: respeta los grupos que armó el usuario", () => {
    const r = fusionarVehiculosPorGrupo([
      { res: frente, foto: 0, grupo: 1 },
      { res: dorso, foto: 1, grupo: 1 },
      { res: { ...frente, vehiculo: { dominio: "XY999ZZ", marca: "FIAT" } }, foto: 2, grupo: 2 },
    ]);
    expect(r).toHaveLength(2);
    expect(r[0]).toMatchObject({ grupo: 1, fotos: 2 });
    expect(r[0].vehiculo.marca).toBe("FORD");
    expect(r[0].personas).toHaveLength(1);
    expect(r[1].vehiculo.dominio).toBe("XY999ZZ");
  });

  it("vehículos: un grupo que no se pudo leer se descarta", () => {
    expect(fusionarVehiculosPorGrupo([{ res: nada, foto: 0, grupo: 1 }])).toEqual([]);
  });

  it("modo libre: 2 DNI + 1 tarjeta (frente y dorso) + 1 foto rara", () => {
    const r = armarResultadoLibre([
      { res: dni, foto: 0 },
      { res: { tipo_documento: "DNI", personas: [{ apellido: "PEREZ", nombre: "JUAN", nro_doc: "20123456" }] }, foto: 1 },
      { res: frente, foto: 2 },
      { res: dorso, foto: 3 },
      { res: nada, foto: 4 },
    ]);
    expect(r.personas).toHaveLength(2);
    expect(r.vehiculos).toHaveLength(1);
    expect(r.dorsos).toHaveLength(1);       // el dorso no trae patente: no se adivina de qué auto es
    expect(r.otros).toHaveLength(1);
    expect(r.resumen).toBe("2 personas, 1 vehículo, 1 dorso de tarjeta sin emparejar, 1 foto que no pude clasificar");
  });

  it("modo libre sin nada legible", () => {
    expect(armarResultadoLibre([{ res: nada, foto: 0 }]).resumen).toBe("1 foto que no pude clasificar");
    expect(armarResultadoLibre([]).resumen).toBe("no pude leer nada");
  });

  it("modo libre: el mismo vehículo en dos fotos se junta por dominio aunque cambie el formato", () => {
    const r = armarResultadoLibre([
      { res: frente, foto: 0 },
      { res: { ...frente, vehiculo: { ...frente.vehiculo, dominio: "AB123CD" } }, foto: 1 },
    ]);
    expect(r.vehiculos).toHaveLength(1);
    expect(r.vehiculos[0]._fotos).toEqual([0, 1]);
  });
});

describe("modo parte", () => {
  it("una persona: sigue directo", () => {
    const r = armarResultadoParte({ personas: [{ apellido: "PEREZ", nombre: "JUAN" }] }, 2);
    expect(r.hay_varias).toBe(false);
    expect(r.resumen).toBe("1 persona");
  });
  it("varias personas: hay que preguntar cuál es", () => {
    const r = armarResultadoParte({ personas: [{ apellido: "A", nombre: "B" }, { apellido: "C", nombre: "D" }] }, 3);
    expect(r.hay_varias).toBe(true);
    expect(r.resumen).toBe("2 personas");
  });
  it("sin nadie legible", () => {
    expect(armarResultadoParte({ personas: [{}] }, 1).personas).toEqual([]);
  });
});

describe("purga", () => {
  const base = { ...calcularVencimientos(T0), fotos: [{ id: "a" }], resultado: { x: 1 } };

  it("lote abandonado: se destruye al pasar las 24 h, no antes", () => {
    const c = { ...base, estado: "abierta" };
    expect(debePurgarse(c, T0 + 23 * 60 * MIN)).toBe(false);
    expect(debePurgarse(c, T0 + 24 * 60 * MIN + 1)).toBe(true);
    expect(ESTADO_AL_PURGAR(c)).toBe("vencida");
  });
  it("una captura entregada que todavía guarda algo se limpia enseguida", () => {
    expect(debePurgarse({ ...base, estado: "entregada" }, T0 + MIN)).toBe(true);
    expect(ESTADO_AL_PURGAR({ estado: "entregada" })).toBe("entregada");
  });
  it("una entregada ya vacía no se toca", () => {
    expect(debePurgarse({ ...base, estado: "entregada", fotos: [], resultado: null }, T0 + MIN)).toBe(false);
  });
  it("una cancelada con fotos se limpia", () => {
    expect(debePurgarse({ ...base, estado: "cancelada" }, T0 + MIN)).toBe(true);
  });
});

// ── Servidor: backup y purga con un Supabase de mentira ─────────────────────

import { TABLAS_EXCLUIDAS } from "../../api/cron/backup.js";
import { destruirCaptura, purgarVencidas } from "../../api/_capturaPurga.js";

describe("backup", () => {
  it("no copia la tabla de capturas (datos personales leídos de documentos)", () => {
    expect(TABLAS_EXCLUIDAS.has("capturas")).toBe(true);
  });

  it("no copia el token de Drive ni los enlaces de conexión, pero sí la auditoría", () => {
    expect(TABLAS_EXCLUIDAS.has("drive_conexiones")).toBe(true);
    expect(TABLAS_EXCLUIDAS.has("drive_enlaces")).toBe(true);
    expect(TABLAS_EXCLUIDAS.has("drive_auditoria")).toBe(false);
  });
});

// Imita lo mínimo de supabase-js que usa la purga: encadenable y con "then" al final.
function sbFalso({ filas = [], archivosEnCarpeta = [] } = {}) {
  const estado = { borrados: [], actualizaciones: [], filas };
  const consulta = (resultado) => {
    const q = { not: () => q, lte: () => q, in: () => q, limit: () => q, select: () => q, eq: () => q,
      then: (ok) => Promise.resolve(resultado).then(ok) };
    return q;
  };
  const sb = {
    estado,
    storage: { from: () => ({
      list: async () => ({ data: archivosEnCarpeta.map((name) => ({ name })) }),
      remove: async (rutas) => { estado.borrados.push(...rutas); return { error: null }; },
    }) },
    from: () => ({
      select: () => consulta({ data: estado.filas, error: null }),
      update: (cambios) => ({ eq: async (_c, id) => { estado.actualizaciones.push({ id, ...cambios }); return { error: null }; } }),
    }),
  };
  return sb;
}

describe("destruirCaptura", () => {
  it("borra las fotos (también las huérfanas de la carpeta) y vacía fotos y resultado", async () => {
    const sb = sbFalso({ archivosEnCarpeta: ["a.jpg", "huerfana.jpg"] });
    await destruirCaptura(sb, { id: "C1", estado: "confirmada", fotos: [{ path: "C1/a.jpg" }], resultado: { x: 1 } }, "entregada");
    expect(sb.estado.borrados.sort()).toEqual(["C1/a.jpg", "C1/huerfana.jpg"]);
    expect(sb.estado.actualizaciones).toEqual([{ id: "C1", fotos: [], resultado: null, estado: "entregada" }]);
  });

  it("sin estado final explícito, un lote abandonado queda 'vencida'", async () => {
    const sb = sbFalso();
    await destruirCaptura(sb, { id: "C2", estado: "abierta", fotos: [], resultado: null });
    expect(sb.estado.actualizaciones[0].estado).toBe("vencida");
  });
});

describe("purgarVencidas", () => {
  const vencida = { id: "V1", estado: "abierta", fotos: [{ path: "V1/a.jpg" }], resultado: null, purgar_en: "2020-01-01T00:00:00Z" };
  const vigente = { id: "V2", estado: "abierta", fotos: [{ path: "V2/a.jpg" }], resultado: null, purgar_en: "2999-01-01T00:00:00Z" };

  it("destruye solo lo que pasó el tope de 24 h", async () => {
    const sb = sbFalso({ filas: [vencida, vigente] });
    const n = await purgarVencidas(sb);
    // la consulta falsa devuelve las mismas filas para ambas búsquedas: la vigente se descarta por debePurgarse
    expect(sb.estado.actualizaciones.map((a) => a.id)).toContain("V1");
    expect(sb.estado.actualizaciones.map((a) => a.id)).not.toContain("V2");
    expect(n).toBeGreaterThanOrEqual(1);
  });
});

// ── Utilidades del celular ───────────────────────────────────────────────────

import { calcularEscala, bytesDeBase64, esPdf, dimensionesFinales, LADO_MAXIMO } from "../utils/capturaImagen.js";
import { camposFaltantes } from "../utils/capturaApi.js";

describe("reducir fotos", () => {
  it("achica el lado mayor a 2000 px y nunca agranda", () => {
    expect(calcularEscala(4000, 3000)).toBeCloseTo(0.5);
    expect(calcularEscala(3000, 4000)).toBeCloseTo(0.5);
    expect(calcularEscala(1000, 800)).toBe(1);
    expect(calcularEscala(LADO_MAXIMO, 10)).toBe(1);
  });
  it("las dimensiones finales conservan la proporción y nunca dan 0", () => {
    expect(dimensionesFinales(4000, 3000)).toEqual({ ancho: 2000, alto: 1500 });
    expect(dimensionesFinales(2560, 1440)).toEqual({ ancho: 2000, alto: 1125 });   // fotograma de la cámara en vivo
    expect(dimensionesFinales(1080, 1920)).toEqual({ ancho: 1080, alto: 1920 });   // ya entra: no se toca
    expect(dimensionesFinales(10000, 1)).toEqual({ ancho: 2000, alto: 1 });
  });
  it("calcula los bytes de un base64 sin decodificarlo", () => {
    expect(bytesDeBase64(Buffer.from("hola mundo").toString("base64"))).toBe(10);
    expect(bytesDeBase64(Buffer.from("abc").toString("base64"))).toBe(3);   // sin relleno
    expect(bytesDeBase64(Buffer.from("ab").toString("base64"))).toBe(2);    // un "="
    expect(bytesDeBase64("")).toBe(0);
  });
  it("reconoce un PDF por tipo o por extensión", () => {
    expect(esPdf({ type: "application/pdf", name: "x" })).toBe(true);
    expect(esPdf({ type: "", name: "DNI.PDF" })).toBe(true);
    expect(esPdf({ type: "image/jpeg", name: "x.jpg" })).toBe(false);
  });
});

describe("avisar qué no se pudo leer", () => {
  it("lista los campos clave vacíos", () => {
    expect(camposFaltantes({ apellido: "PEREZ", nombre: "JUAN", nro_doc: "1", fecha_nac: "" })).toEqual(["fecha de nacimiento"]);
    expect(camposFaltantes({})).toEqual(["apellido", "nombre", "número de documento", "fecha de nacimiento"]);
    expect(camposFaltantes({ apellido: "A", nombre: "B", nro_doc: "1", fecha_nac: "01/01/2000" })).toEqual([]);
  });
});
