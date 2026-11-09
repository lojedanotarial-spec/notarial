// Identificación EN LOTE en la API (api/drive.js): celular_identificar_lote e identificar_lote. Con la base, Google y el modelo de mentira.
// Spec: specs/documentacion-celular-expediente/. Todas las fotos de una tanda juntas, para emparejar las caras de un mismo documento.
import { describe, it, expect, vi } from "vitest";
import { GoogleError } from "../../api/_driveGoogle.js";
import { ErrorIA } from "../../api/_driveIA.js";
import { T0, MB, entorno, RESPUESTA_IA } from "./_driveHarness.js";

const MIN = 60_000;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5000, 7)]).toString("base64");
const img = (n, extra = {}) => ({ ...RESPUESTA_IA, n, grupo: n, evidencia: "ninguna", ...extra });
const respuesta = (imagenes, extra = {}) => ({ texto: JSON.stringify({ imagenes }), entrada: 6499, salida: 1823, parada: "end_turn", ...extra });
const confirmar = (codigo, id) => ({ accion: "celular_confirmar", codigo, drive_file_id: id });

// QR abierto por Fátima en e853b con la identificación prendida; sube `n` fotos y devuelve sus ids.
async function conFotos(n, opciones = {}) {
  const e = entorno({ config: { identificar: true, ...opciones.config }, ...opciones });
  e.conectar("853");
  const codigo = (await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati")).jsonBody.url.split("/s/")[1];
  const ids = [];
  for (let i = 1; i <= n; i++) {
    e.google.metadatos.mockImplementationOnce(async (a, id) => ({ id, name: `Foto ${i}.jpg`, size: "5000", mimeType: "image/jpeg", parents: ["carpeta-exp"], trashed: false }));
    ids.push((await e.llamar(confirmar(codigo, `file-${i}`))).jsonBody.archivo.id);
  }
  return { e, codigo, ids };
}
const lote = (e, codigo, ids, miniaturas = ids.map(() => JPEG)) =>
  e.llamar({ accion: "celular_identificar_lote", codigo, archivos: ids.map((id, i) => ({ archivo_id: id, miniatura: miniaturas[i] })) });
const nombres = (e) => e.tablas.expediente_archivos.map((a) => a.nombre);

describe("lote del celular: un solo viaje al modelo", () => {
  it("CASO REAL: DNI y licencia, frente y dorso, desordenados: se emparejan y los dorsos heredan el nombre", async () => {
    const lic = (n, extra) => img(n, { tipo: "otro", descripcion: "Licencia de conducir", grupo: 2, evidencia: "numero", ...extra });
    const dni = (n, extra) => img(n, { grupo: 1, evidencia: "numero", apellido: "Ojeda", nombre: "Lucas Matias", ...extra });
    const { e, codigo, ids } = await conFotos(4, { ia: { consultarLote: vi.fn(async () => respuesta([
      lic(1, { lado: "reverso", apellido: "", nombre: "" }), dni(2, { lado: "reverso", apellido: "", nombre: "" }), dni(3, { lado: "anverso" }), lic(4, { lado: "anverso", apellido: "Ojeda", nombre: "Lucas Matias" }),
    ])) } });
    const r = await lote(e, codigo, ids);
    expect(r.statusCode).toBe(200);
    expect(e.ia.consultarLote).toHaveBeenCalledTimes(1);
    expect(e.ia.consultarLote).toHaveBeenCalledWith([JPEG, JPEG, JPEG, JPEG]);
    expect(e.ia.consultar).not.toHaveBeenCalled();
    expect(r.jsonBody.archivos.map((a) => a.nombre)).toEqual([
      "Licencia de conducir Ojeda Lucas Matias - reverso.jpg", "DNI Ojeda Lucas Matias - reverso.jpg",
      "DNI Ojeda Lucas Matias - anverso.jpg", "Licencia de conducir Ojeda Lucas Matias - anverso.jpg",
    ]);
    expect(r.jsonBody.identificados).toBe(4);
    expect(nombres(e)).toEqual(r.jsonBody.archivos.map((a) => a.nombre));
    expect(e.tablas.expediente_archivos.every((a) => a.identificacion === "ok")).toBe(true);
    expect(e.google.renombrar).toHaveBeenCalledTimes(4);
  });
  it("audita cada archivo con su parte de los tokens del lote y si se emparejó", async () => {
    const { e, codigo, ids } = await conFotos(2, { ia: { consultarLote: vi.fn(async () => respuesta([img(1, { grupo: 1, evidencia: "numero" }), img(2, { grupo: 1, evidencia: "numero", apellido: "", nombre: "", lado: "reverso" })], { entrada: 6000, salida: 1800 })) } });
    await lote(e, codigo, ids);
    const a = e.tablas.drive_auditoria.filter((x) => x.accion === "identificar");
    expect(a).toHaveLength(2);
    expect(a[0].detalle).toMatchObject({ modelo: "claude-haiku-5-5", lote: 2, agrupado: true, tokens_entrada: 3000, tokens_salida: 900 });
    expect(a[0].usuario_id).toBe("u-fati");
  });
  it("de a lo sumo 10 por consulta: 12 fotos son dos consultas", async () => {
    const { e, codigo, ids } = await conFotos(12);
    const r = await lote(e, codigo, ids);
    expect(r.statusCode).toBe(200);
    expect(e.ia.consultarLote).toHaveBeenCalledTimes(2);
    expect(e.ia.consultarLote.mock.calls[0][0]).toHaveLength(10);
    expect(e.ia.consultarLote.mock.calls[1][0]).toHaveLength(2);
    expect(r.jsonBody.identificados).toBe(12);
  });
  it("dos fotos que darían el mismo nombre no se pisan: la segunda lleva (2)", async () => {
    const { e, codigo, ids } = await conFotos(2);
    const r = await lote(e, codigo, ids);
    expect(r.jsonBody.archivos.map((a) => a.nombre)).toEqual(["DNI García Juan - anverso.jpg", "DNI García Juan - anverso (2).jpg"]);
  });
  it("un solo intento por archivo: repetir o llamar a la vez no vuelve a gastar", async () => {
    const { e, codigo, ids } = await conFotos(3);
    await Promise.all([lote(e, codigo, ids), lote(e, codigo, ids)]);
    expect(e.ia.consultarLote).toHaveBeenCalledTimes(1);
    const otra = await lote(e, codigo, ids);
    expect(otra.jsonBody.identificados).toBe(0);
    expect(otra.jsonBody.archivos.every((a) => a.identificacion === "ok")).toBe(true);
    expect(e.ia.consultarLote).toHaveBeenCalledTimes(1);
  });
  it("con la identificación apagada no hace nada ni llama al modelo", async () => {
    const q = await conFotos(2, { config: { identificar: false } });
    const r = await lote(q.e, q.codigo, q.ids);
    expect(r.jsonBody.identificados).toBe(0);
    expect(q.e.ia.consultarLote).not.toHaveBeenCalled();
  });
});

describe("lote del celular: cuando algo falla, las demás siguen", () => {
  it("una miniatura inválida queda sin identificar y el resto se identifica igual", async () => {
    const { e, codigo, ids } = await conFotos(3);
    const r = await lote(e, codigo, ids, [JPEG, "no-es-una-imagen", JPEG]);
    expect(r.jsonBody.archivos.map((a) => a.identificacion)).toEqual(["ok", "sin_identificar", "ok"]);
    expect(e.ia.consultarLote).toHaveBeenCalledWith([JPEG, JPEG]);   // la inválida nunca llegó al modelo
    expect(r.jsonBody.archivos[1].nombre).toBe("Foto 2.jpg");
  });
  it("si el modelo falla (caído, saturado, tarda, sin clave), TODAS quedan guardadas y sin identificar", async () => {
    for (const motivo of ["api", "saturada", "timeout", "red", "sin_clave"]) {
      const { e, codigo, ids } = await conFotos(2, { ia: { consultarLote: vi.fn(async () => { throw new ErrorIA(motivo); }) } });
      const r = await lote(e, codigo, ids);
      expect(r.statusCode, motivo).toBe(200);
      expect(r.jsonBody.archivos.map((a) => a.identificacion), motivo).toEqual(["sin_identificar", "sin_identificar"]);
      expect(nombres(e), motivo).toEqual(["Foto 1.jpg", "Foto 2.jpg"]);
      expect(e.google.renombrar, motivo).not.toHaveBeenCalled();
    }
  });
  it("respuesta cortada, rota o con imágenes faltantes: solo las que vinieron bien se renombran", async () => {
    const parcial = await conFotos(3, { ia: { consultarLote: vi.fn(async () => respuesta([img(1), img(3)])) } });
    const r = await lote(parcial.e, parcial.codigo, parcial.ids);
    expect(r.jsonBody.archivos.map((a) => a.identificacion)).toEqual(["ok", "sin_identificar", "ok"]);
    for (const texto of ["{\"imagenes\":[{\"n\":1,\"tipo\":", "", "no es json"]) {
      const roto = await conFotos(2, { ia: { consultarLote: vi.fn(async () => ({ texto, entrada: 1, salida: 2000, parada: "max_tokens" })) } });
      const rr = await lote(roto.e, roto.codigo, roto.ids);
      expect(rr.jsonBody.archivos.map((a) => a.identificacion), texto).toEqual(["sin_identificar", "sin_identificar"]);
    }
  });
  it("si una foto se quita mientras el modelo mira el lote, esa NO se renombra y las otras sí", async () => {
    const { e, codigo, ids } = await conFotos(3);
    e.ia.consultarLote.mockImplementationOnce(async (b) => {
      e.tablas.expediente_archivos[1].borrado_en = new Date(T0).toISOString();   // la persona toca "Quitar" justo en ese momento
      return respuesta(b.map((_, i) => img(i + 1)));
    });
    const r = await lote(e, codigo, ids);
    expect(r.jsonBody.archivos.map((a) => a.identificacion)).toEqual(["ok", "sin_identificar", "ok"]);
    expect(e.tablas.expediente_archivos[1].nombre).toBe("Foto 2.jpg");
    expect(e.google.renombrar).toHaveBeenCalledTimes(2);
  });
  it("si Drive no deja renombrar una, esa conserva su nombre en la base y las otras siguen", async () => {
    const renombrar = vi.fn()
      .mockImplementationOnce(async () => ({ id: "x" }))
      .mockImplementationOnce(async () => { throw new GoogleError({ status: 404 }); })
      .mockImplementationOnce(async () => ({ id: "x" }));
    const { e, codigo, ids } = await conFotos(3, { google: { renombrar } });
    const r = await lote(e, codigo, ids);
    expect(r.jsonBody.archivos.map((a) => a.identificacion)).toEqual(["ok", "sin_identificar", "ok"]);
    expect(e.tablas.expediente_archivos[1].nombre).toBe("Foto 2.jpg");
  });
});

describe("lote del celular: seguridad", () => {
  it("si UNA foto no es de esta sesión, se rechaza todo el pedido y no se gasta el modelo", async () => {
    const { e, codigo, ids } = await conFotos(2);
    e.tablas.expediente_archivos.push({ id: "ajena", expediente_id: "e853b", almacen: "escribania", nombre: "x.jpg", borrado_en: null, drive_file_id: "d", identificacion: "pendiente", sesion_id: "otra" });
    for (const malo of ["ajena", "no-existe"]) {
      expect((await lote(e, codigo, [...ids, malo])).statusCode, malo).toBe(404);
    }
    expect(e.ia.consultarLote).not.toHaveBeenCalled();
    expect(e.tablas.expediente_archivos.find((a) => a.id === "ajena").identificacion).toBe("pendiente");
  });
  it("sesión cerrada, vencida pasada la gracia o código inexistente: rechaza", async () => {
    const { e, codigo, ids } = await conFotos(2);
    expect((await lote(e, "x".repeat(43), ids)).statusCode).toBe(404);
    e.reloj.t = T0 + 36 * MIN;
    expect((await lote(e, codigo, ids)).statusCode).toBe(410);
    expect(e.ia.consultarLote).not.toHaveBeenCalled();
  });
  it("la gracia de 5 minutos alcanza para identificar lo recién subido", async () => {
    const { e, codigo, ids } = await conFotos(2);
    e.reloj.t = T0 + 33 * MIN;
    expect((await lote(e, codigo, ids)).jsonBody.identificados).toBe(2);
  });
  it("pedidos mal formados: vacío, sin lista o con demasiados archivos", async () => {
    const { e, codigo } = await conFotos(1);
    expect((await e.llamar({ accion: "celular_identificar_lote", codigo, archivos: [] })).statusCode).toBe(400);
    expect((await e.llamar({ accion: "celular_identificar_lote", codigo })).statusCode).toBe(400);
    expect((await e.llamar({ accion: "celular_identificar_lote", codigo, archivos: Array.from({ length: 21 }, (_, i) => ({ archivo_id: `x${i}`, miniatura: JPEG })) })).statusCode).toBe(400);
    expect(e.ia.consultarLote).not.toHaveBeenCalled();
  });
  it("el código del celular no sirve para el lote de la compu", async () => {
    const { e, codigo, ids } = await conFotos(1);
    expect((await e.llamar({ accion: "identificar_lote", codigo, archivos: [{ archivo_id: ids[0], miniatura: JPEG }] })).statusCode).toBe(401);
  });
});

describe("lote: privacidad y emparejamiento prudente", () => {
  it("PRIVACIDAD: de lo que lee el modelo solo se guardan nombres y tipos; nada de números, domicilios ni fechas", async () => {
    const conDatos = [img(1, { nro_doc: "30123456", domicilio: "Calle Falsa 123", fecha_nac: "01/01/1990", cuit: "20-30123456-1", evidencia_texto: "Documento 30123456" })];
    const { e, codigo, ids } = await conFotos(1, { ia: { consultarLote: vi.fn(async () => respuesta(conDatos)) } });
    const r = await lote(e, codigo, ids);
    expect(JSON.stringify(e.tablas) + JSON.stringify(r.jsonBody)).not.toMatch(/30123456|Falsa|1990/);
  });
  it("PRIVACIDAD: el modelo recibe solo las miniaturas, nunca datos del Drive ni del usuario", async () => {
    const { e, codigo, ids } = await conFotos(2);
    await lote(e, codigo, ids);
    expect(e.ia.consultarLote.mock.calls[0]).toEqual([[JPEG, JPEG]]);
  });
  it("si el modelo agrupa a dos personas DISTINTAS, nadie hereda el nombre de nadie", async () => {
    const { e, codigo, ids } = await conFotos(3, { ia: { consultarLote: vi.fn(async () => respuesta([
      img(1, { grupo: 1, evidencia: "numero", apellido: "Ojeda", nombre: "Lucas Matias" }),
      img(2, { grupo: 1, evidencia: "numero", apellido: "González", nombre: "Mariana", lado: "reverso" }),
      img(3, { grupo: 1, evidencia: "numero", apellido: "", nombre: "", lado: "reverso" }),
    ])) } });
    const r = await lote(e, codigo, ids);
    expect(r.jsonBody.archivos.map((a) => a.nombre)).toEqual(["DNI Ojeda Lucas Matias - anverso.jpg", "DNI González Mariana - reverso.jpg", "DNI - reverso.jpg"]);
  });
  it("sin evidencia no hay herencia aunque el modelo ponga el mismo grupo", async () => {
    const { e, codigo, ids } = await conFotos(2, { ia: { consultarLote: vi.fn(async () => respuesta([
      img(1, { grupo: 1, evidencia: "ninguna" }), img(2, { grupo: 1, evidencia: "ninguna", apellido: "", nombre: "", lado: "reverso" }),
    ])) } });
    expect((await lote(e, codigo, ids)).jsonBody.archivos[1].nombre).toBe("DNI - reverso.jpg");
  });
});

describe("lote desde la compu", () => {
  async function conArchivosCompu(n, config = { identificarCompu: true }) {
    const e = entorno({ config }); e.conectar("853");
    const ids = [];
    for (let i = 1; i <= n; i++) {
      e.google.metadatos.mockImplementationOnce(async (a, id) => ({ id, name: `IMG_${i}.jpg`, size: "5000", mimeType: "image/jpeg", parents: ["carpeta-exp"], trashed: false }));
      ids.push((await e.llamar({ accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: `file-${i}`, tipo: "otro", identificar: true }, "tok-fati")).jsonBody.archivo.id);
    }
    return { e, ids };
  }
  const pedir = (e, ids, token = "tok-fati2") => e.llamar({ accion: "identificar_lote", archivos: ids.map((id) => ({ archivo_id: id, miniatura: JPEG })) }, token);

  it("identifica juntos lo subido con 'Automático' y lo audita a nombre de quien lo identificó", async () => {
    const { e, ids } = await conArchivosCompu(2);
    const r = await pedir(e, ids);
    expect(r.jsonBody.identificados).toBe(2);
    expect(e.ia.consultarLote).toHaveBeenCalledTimes(1);
    expect(e.tablas.drive_auditoria.filter((a) => a.accion === "identificar").every((a) => a.usuario_id === "u-fati2")).toBe(true);
  });
  it("sin sesión, 401; de otro registro, 404; de expedientes distintos, 400", async () => {
    const { e, ids } = await conArchivosCompu(2);
    expect((await e.llamar({ accion: "identificar_lote", archivos: [{ archivo_id: ids[0], miniatura: JPEG }] })).statusCode).toBe(401);
    expect((await pedir(e, ids, "tok-otro")).statusCode).toBe(404);
    e.tablas.expediente_archivos[1].expediente_id = "e853";
    expect((await pedir(e, ids)).statusCode).toBe(400);
    expect(e.ia.consultarLote).not.toHaveBeenCalled();
  });
  it("lo subido SIN 'Automático' no se identifica, aunque lo pidan", async () => {
    const e = entorno({ config: { identificarCompu: true } }); e.conectar("853");
    const id = (await e.llamar({ accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "poder" }, "tok-fati")).jsonBody.archivo.id;
    const r = await pedir(e, [id]);
    expect(r.jsonBody.identificados).toBe(0);
    expect(e.ia.consultarLote).not.toHaveBeenCalled();
  });
});
