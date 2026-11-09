// Identificación y nombre automáticos (UC-4) en la API (api/drive.js): celular_identificar, identificar, y la marca "pendiente"
// al subir. Con la base, Google y el modelo de mentira. Spec: specs/documentacion-celular-expediente/. Cubre TB.4 y TB.5.
import { describe, it, expect, vi } from "vitest";
import { GoogleError } from "../../api/_driveGoogle.js";
import { ErrorIA } from "../../api/_driveIA.js";
import { T0, MB, entorno, RESPUESTA_IA } from "./_driveHarness.js";

const MIN = 60_000;
const JPEG = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(5000, 7)]).toString("base64");
const respuestaIA = (extra = {}) => ({ texto: JSON.stringify({ ...RESPUESTA_IA, ...extra }), entrada: 1372, salida: 221, parada: "end_turn" });
const confirmar = (codigo, id = "file-1") => ({ accion: "celular_confirmar", codigo, drive_file_id: id });

// QR abierto por Fátima en e853b, con la identificación prendida para el celular (y opcionalmente la compu).
async function conQR(opciones = {}) {
  const e = entorno({ config: { identificar: true, ...opciones.config }, ...opciones });
  e.conectar("853");
  const r = await e.llamar({ accion: "celular_crear", expediente_id: "e853b" }, "tok-fati");
  return { e, codigo: r.jsonBody.url.split("/s/")[1] };
}
async function conFoto(opciones) {
  const q = await conQR(opciones);
  const subida = await q.e.llamar(confirmar(q.codigo));
  return { ...q, id: subida.jsonBody.archivo.id, subida };
}
const identificar = (e, codigo, id, miniatura = JPEG) => e.llamar({ accion: "celular_identificar", codigo, archivo_id: id, miniatura });
const fila = (e) => e.tablas.expediente_archivos[0];

describe("TB.4 · al subir queda 'pendiente' (solo si la identificación está prendida)", () => {
  it("apagada: no se marca nada y nunca se llama al modelo", async () => {
    const q = await conQR({ config: { identificar: false } });
    const r = await q.e.llamar(confirmar(q.codigo));
    expect(r.jsonBody.archivo.identificacion).toBe(null);
    expect(q.e.ia.consultar).not.toHaveBeenCalled();
  });
  it("prendida: una imagen queda 'pendiente'; un PDF queda 'sin identificar' (no se identifican en esta versión)", async () => {
    const q = await conQR();
    expect((await q.e.llamar(confirmar(q.codigo))).jsonBody.archivo.identificacion).toBe("pendiente");
    q.e.google.metadatos.mockImplementationOnce(async (a, id) => ({ id, name: "escaneo.pdf", size: "5000", mimeType: "application/pdf", parents: ["carpeta-exp"], trashed: false }));
    expect((await q.e.llamar(confirmar(q.codigo, "file-2"))).jsonBody.archivo.identificacion).toBe("sin_identificar");
    expect(q.e.ia.consultar).not.toHaveBeenCalled();
  });
  it("desde la compu solo con 'Automático' y solo si el interruptor de la compu está prendido", async () => {
    const apagado = entorno({ config: { identificar: true, identificarCompu: false } }); apagado.conectar("853");
    const body = { accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "otro", identificar: true };
    expect((await apagado.llamar(body, "tok-fati")).jsonBody.archivo.identificacion).toBe(null);
    const prendido = entorno({ config: { identificarCompu: true } }); prendido.conectar("853");
    expect((await prendido.llamar({ ...body, identificar: true }, "tok-fati")).jsonBody.archivo.identificacion).toBe("pendiente");
    const manual = entorno({ config: { identificarCompu: true } }); manual.conectar("853");
    expect((await manual.llamar({ ...body, identificar: false }, "tok-fati")).jsonBody.archivo.identificacion).toBe(null);
  });
  it("estado avisa a la pantalla si la compu puede ofrecer 'Automático'", async () => {
    const e = entorno({ config: { identificarCompu: true } }); e.conectar("853");
    expect((await e.llamar({ accion: "estado" }, "tok-fati")).jsonBody.identificar_compu).toBe(true);
  });
});

describe("TB.5 · identificar desde el celular", () => {
  it("camino feliz: llama al modelo UNA vez con la miniatura, renombra en Drive y en la base, y audita con los tokens", async () => {
    const { e, codigo, id } = await conFoto();
    const r = await identificar(e, codigo, id);
    expect(r.statusCode).toBe(200);
    expect(r.jsonBody).toMatchObject({ identificado: true, archivo: { nombre: "DNI García Juan - anverso.jpg", tipo: "dni", identificacion: "ok" } });
    expect(e.ia.consultar).toHaveBeenCalledTimes(1);
    expect(e.ia.consultar).toHaveBeenCalledWith(JPEG);
    expect(e.google.renombrar).toHaveBeenCalledWith("acceso-1", "file-1", "DNI García Juan - anverso.jpg");
    expect(fila(e)).toMatchObject({ nombre: "DNI García Juan - anverso.jpg", tipo: "dni", identificacion: "ok", nombre_original: "dni.jpg" });
    const a = e.tablas.drive_auditoria.at(-1);
    expect(a).toMatchObject({ accion: "identificar", usuario_id: "u-fati" });
    expect(a.detalle).toMatchObject({ de: "dni.jpg", a: "DNI García Juan - anverso.jpg", tipo: "dni", modelo: "claude-haiku-5-5", tokens_entrada: 1372, tokens_salida: 221 });
  });
  it("conserva la extensión del archivo original", async () => {
    const q = await conQR();
    q.e.google.metadatos.mockImplementationOnce(async (a, id) => ({ id, name: "IMG_4821.HEIC", size: "5000", mimeType: "image/heic", parents: ["carpeta-exp"], trashed: false }));
    const id = (await q.e.llamar(confirmar(q.codigo))).jsonBody.archivo.id;
    await identificar(q.e, q.codigo, id);
    expect(fila(q.e).nombre).toBe("DNI García Juan - anverso.heic");
  });
  it("un solo intento por archivo: repetir la llamada, o llamarla dos veces a la vez, no vuelve a pagar", async () => {
    const { e, codigo, id } = await conFoto();
    const [a, b] = await Promise.all([identificar(e, codigo, id), identificar(e, codigo, id)]);
    expect(e.ia.consultar).toHaveBeenCalledTimes(1);
    expect([a.jsonBody.identificado, b.jsonBody.identificado].filter(Boolean)).toHaveLength(1);
    const c = await identificar(e, codigo, id);
    expect(c.jsonBody).toMatchObject({ identificado: false, archivo: { nombre: "DNI García Juan - anverso.jpg", identificacion: "ok" } });
    expect(e.ia.consultar).toHaveBeenCalledTimes(1);
  });
  it("con la identificación apagada no hace nada ni llama al modelo", async () => {
    const q = await conQR({ config: { identificar: false } });
    const id = (await q.e.llamar(confirmar(q.codigo))).jsonBody.archivo.id;
    const r = await identificar(q.e, q.codigo, id);
    expect(r.jsonBody.identificado).toBe(false);
    expect(q.e.ia.consultar).not.toHaveBeenCalled();
    expect(fila(q.e).identificacion).toBe(null);
  });
  it("si el nombre ya existe en el expediente, agrega (2)", async () => {
    const { e, codigo, id } = await conFoto();
    e.tablas.expediente_archivos.push({ id: "otro", expediente_id: "e853b", almacen: "escribania", nombre: "DNI García Juan - anverso.jpg", borrado_en: null });
    const r = await identificar(e, codigo, id);
    expect(r.jsonBody.archivo.nombre).toBe("DNI García Juan - anverso (2).jpg");
  });
  it("un archivo quitado con el mismo nombre no cuenta como duplicado", async () => {
    const { e, codigo, id } = await conFoto();
    e.tablas.expediente_archivos.push({ id: "borrado", expediente_id: "e853b", almacen: "escribania", nombre: "DNI García Juan - anverso.jpg", borrado_en: "2026-11-09T15:00:00Z" });
    expect((await identificar(e, codigo, id)).jsonBody.archivo.nombre).toBe("DNI García Juan - anverso.jpg");
  });

  it("ante cualquier duda queda 'Sin identificar', con su nombre original y sin tocar Drive", async () => {
    const casos = {
      "no legible": respuestaIA({ legible: false }),
      "confianza baja": respuestaIA({ confianza: "baja" }),
      "JSON roto": { texto: "{\"tipo\":\"dni\",\"descripcion\":", entrada: 1372, salida: 1000, parada: "max_tokens" },
      "sin texto": { texto: "", entrada: 1372, salida: 1000, parada: "max_tokens" },
      "otro sin descripción": respuestaIA({ tipo: "otro", descripcion: "" }),
    };
    for (const [caso, resp] of Object.entries(casos)) {
      const { e, codigo, id } = await conFoto({ ia: { consultar: vi.fn(async () => resp) } });
      const r = await identificar(e, codigo, id);
      expect(r.statusCode, caso).toBe(200);
      expect(r.jsonBody, caso).toMatchObject({ identificado: false, archivo: { nombre: "dni.jpg", identificacion: "sin_identificar" } });
      expect(e.google.renombrar, caso).not.toHaveBeenCalled();
      expect(fila(e), caso).toMatchObject({ nombre: "dni.jpg", identificacion: "sin_identificar" });
    }
  });
  it("si el modelo falla (caído, saturado, tarda, sin clave), la subida ya estaba guardada y queda 'Sin identificar'", async () => {
    for (const motivo of ["api", "saturada", "timeout", "red", "sin_clave"]) {
      const { e, codigo, id } = await conFoto({ ia: { consultar: vi.fn(async () => { throw new ErrorIA(motivo); }) } });
      const r = await identificar(e, codigo, id);
      expect(r.statusCode, motivo).toBe(200);
      expect(fila(e), motivo).toMatchObject({ nombre: "dni.jpg", identificacion: "sin_identificar", almacen: "escribania" });
      expect(e.tablas.drive_auditoria.map((a) => a.accion), motivo).not.toContain("identificar");
    }
  });
  it("una miniatura inválida no llega al modelo: ni vacía, ni de otro formato, ni enorme", async () => {
    for (const mini of ["", "no es base64 !!", Buffer.from("texto plano").toString("base64"), Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(500_000)]).toString("base64"), null, 5]) {
      const { e, codigo, id } = await conFoto();
      const r = await identificar(e, codigo, id, mini);
      expect(r.jsonBody.archivo.identificacion).toBe("sin_identificar");
      expect(e.ia.consultar).not.toHaveBeenCalled();
    }
  });
  it("CASO REAL: si la foto se quita mientras el modelo la mira, NO se renombra ni se audita como identificada", async () => {
    const { e, codigo, id } = await conFoto();
    e.ia.consultar.mockImplementationOnce(async () => {
      fila(e).borrado_en = new Date(T0).toISOString();   // la persona toca "Quitar" justo mientras se identifica
      return { texto: JSON.stringify(RESPUESTA_IA), entrada: 1372, salida: 221, parada: "end_turn" };
    });
    const r = await identificar(e, codigo, id);
    expect(r.jsonBody.identificado).toBe(false);
    expect(e.google.renombrar).not.toHaveBeenCalled();
    expect(fila(e).nombre).toBe("dni.jpg");
    expect(e.tablas.drive_auditoria.map((a) => a.accion)).not.toContain("identificar");
  });
  it("si Drive no deja renombrar, el nombre en la base tampoco cambia (no quedan desfasados)", async () => {
    const { e, codigo, id } = await conFoto({ google: { renombrar: vi.fn(async () => { throw new GoogleError({ status: 404 }); }) } });
    const r = await identificar(e, codigo, id);
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "dni.jpg", identificacion: "sin_identificar" });
    expect(fila(e).nombre).toBe("dni.jpg");
  });

  it("PRIVACIDAD: de lo que lee el modelo solo se guardan el nombre y el tipo, nada de números, domicilios ni fechas", async () => {
    const conDatos = { ...JSON.parse(respuestaIA().texto), nro_doc: "30123456", domicilio: "Calle Falsa 123", fecha_nac: "01/01/1990", cuit: "20-30123456-1" };
    const { e, codigo, id } = await conFoto({ ia: { consultar: vi.fn(async () => ({ texto: JSON.stringify(conDatos), entrada: 1372, salida: 221, parada: "end_turn" })) } });
    const r = await identificar(e, codigo, id);
    const todo = JSON.stringify(e.tablas) + JSON.stringify(r.jsonBody);
    expect(todo).not.toMatch(/30123456|Falsa|1990/);
  });
  it("PRIVACIDAD: el modelo solo recibe la miniatura, nunca datos del Drive, tokens ni del usuario", async () => {
    const { e, codigo, id } = await conFoto();
    await identificar(e, codigo, id);
    const args = e.ia.consultar.mock.calls[0];
    expect(args).toEqual([JPEG]);
  });
});

describe("TB.5 · seguridad de celular_identificar", () => {
  it("solo archivos de SU sesión: uno ajeno, de la compu, de otro expediente o inexistente es 404 y no gasta modelo", async () => {
    const { e, codigo } = await conFoto();
    const base = { almacen: "escribania", nombre: "x.jpg", borrado_en: null, drive_file_id: "d", identificacion: "pendiente" };
    e.tablas.expediente_archivos.push(
      { ...base, id: "de-otra-sesion", expediente_id: "e853b", sesion_id: "otra" },
      { ...base, id: "de-la-compu", expediente_id: "e853b", sesion_id: null },
      { ...base, id: "de-otro-expediente", expediente_id: "e853", sesion_id: e.tablas.drive_sesiones_celular[0].id },
    );
    for (const id of ["de-otra-sesion", "de-la-compu", "de-otro-expediente", "no-existe"]) {
      expect((await identificar(e, codigo, id)).statusCode, id).toBe(404);
    }
    expect(e.ia.consultar).not.toHaveBeenCalled();
  });
  it("sesión cerrada, vencida (pasada la gracia) o código inexistente: rechaza", async () => {
    const { e, codigo, id } = await conFoto();
    expect((await identificar(e, "x".repeat(43), id)).statusCode).toBe(404);
    e.reloj.t = T0 + 36 * MIN;
    expect((await identificar(e, codigo, id)).statusCode).toBe(410);
    expect(e.ia.consultar).not.toHaveBeenCalled();
  });
  it("la gracia de 5 minutos alcanza para identificar lo recién subido", async () => {
    const { e, codigo, id } = await conFoto();
    e.reloj.t = T0 + 33 * MIN;
    expect((await identificar(e, codigo, id)).jsonBody.identificado).toBe(true);
  });
  it("una sesión cerrada desde la compu no identifica", async () => {
    const { e, codigo, id } = await conFoto();
    await e.llamar({ accion: "celular_cerrar", sesion_id: e.tablas.drive_sesiones_celular[0].id }, "tok-fati");
    expect((await identificar(e, codigo, id)).statusCode).toBe(410);
  });
});

describe("TB.5 · identificar desde la compu", () => {
  async function conArchivoCompu(config = { identificarCompu: true }) {
    const e = entorno({ config }); e.conectar("853");
    const id = (await e.llamar({ accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "otro", identificar: true }, "tok-fati")).jsonBody.archivo.id;
    return { e, id };
  }
  it("renombra lo subido con 'Automático' y queda a nombre de quien lo identificó", async () => {
    const { e, id } = await conArchivoCompu();
    const r = await e.llamar({ accion: "identificar", archivo_id: id, miniatura: JPEG }, "tok-fati2");
    expect(r.jsonBody).toMatchObject({ identificado: true, archivo: { nombre: "DNI García Juan - anverso.jpg", tipo: "dni", identificacion: "ok" } });
    expect(e.tablas.drive_auditoria.at(-1)).toMatchObject({ accion: "identificar", usuario_id: "u-fati2" });
  });
  it("sin sesión, 401; de otro registro, 404", async () => {
    const { e, id } = await conArchivoCompu();
    expect((await e.llamar({ accion: "identificar", archivo_id: id, miniatura: JPEG })).statusCode).toBe(401);
    expect((await e.llamar({ accion: "identificar", archivo_id: id, miniatura: JPEG }, "tok-otro")).statusCode).toBe(404);
    expect(e.ia.consultar).not.toHaveBeenCalled();
  });
  it("lo subido SIN 'Automático' no se identifica aunque alguien llame a la acción", async () => {
    const e = entorno({ config: { identificarCompu: true } }); e.conectar("853");
    const id = (await e.llamar({ accion: "confirmar_subida", expediente_id: "e853b", drive_file_id: "file-1", tipo: "poder" }, "tok-fati")).jsonBody.archivo.id;
    const r = await e.llamar({ accion: "identificar", archivo_id: id, miniatura: JPEG }, "tok-fati");
    expect(r.jsonBody.identificado).toBe(false);
    expect(e.ia.consultar).not.toHaveBeenCalled();
    expect(e.tablas.expediente_archivos[0]).toMatchObject({ nombre: "dni.jpg", tipo: "poder" });
  });
  it("con el interruptor de la compu apagado, tampoco", async () => {
    const { e, id } = await conArchivoCompu({ identificarCompu: false });
    expect((await e.llamar({ accion: "identificar", archivo_id: id, miniatura: JPEG }, "tok-fati")).jsonBody.identificado).toBe(false);
    expect(e.ia.consultar).not.toHaveBeenCalled();
  });
});

describe("TB.5 · corregir a mano después de identificar", () => {
  it("un renombre manual pisa el automático y queda marcado como 'manual'", async () => {
    const { e, codigo, id } = await conFoto();
    await identificar(e, codigo, id);
    const r = await e.llamar({ accion: "renombrar", archivo_id: id, nombre: "DNI García Juan Carlos - anverso" }, "tok-fati");
    expect(r.jsonBody.archivo).toMatchObject({ nombre: "DNI García Juan Carlos - anverso.jpg", identificacion: "manual" });
    expect(fila(e).nombre_original).toBe("dni.jpg");
  });
});
