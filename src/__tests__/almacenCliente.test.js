// Cliente del almacén propio: subida directa a la dirección firmada y "Descargar todo".
import { describe, it, expect, vi } from "vitest";
import JSZip from "jszip";
import {
  MENSAJE_CORTE, subirAUrlFirmada, MENSAJE_SUBIDA_RECHAZADA, LIMITE_ZIP_BYTES, totalBytes, nombresParaZip, nombreZip, textoPapelera, textoArchivos, opcionesFotoMaxima, progresoPorPasos,
} from "../utils/driveCliente.js";
import { armarZip, CANCELADO } from "../utils/descargarTodo.js";

const MB = 1024 * 1024;

function xhrFalso({ status = 200, evento = "load" } = {}) {
  const obj = { upload: {}, headers: {}, open: vi.fn(), setRequestHeader(k, v) { obj.headers[k] = v; }, status };
  obj.send = vi.fn(() => {
    Promise.resolve().then(() => {
      if (evento === "load") obj.onload?.();
      else obj[evento === "error" ? "onerror" : "onabort"]?.();
    });
  });
  return obj;
}
const clase = (obj) => function XHR() { return obj; };

describe("subir a la dirección firmada del almacén", () => {
  it("manda el archivo por PUT con su tipo y termina bien con cualquier 2xx (sin cuerpo)", async () => {
    const x = xhrFalso({ status: 200 });
    await expect(subirAUrlFirmada("https://r2/x?firma=1", { size: 3 }, "image/jpeg", null, clase(x))).resolves.toBeUndefined();
    expect(x.open).toHaveBeenCalledWith("PUT", "https://r2/x?firma=1");
    expect(x.headers["Content-Type"]).toBe("image/jpeg");
    expect(x.send).toHaveBeenCalledWith({ size: 3 });
  });
  it("sin tipo usa application/octet-stream", async () => {
    const x = xhrFalso();
    await subirAUrlFirmada("u", { size: 1 }, "", null, clase(x));
    expect(x.headers["Content-Type"]).toBe("application/octet-stream");
  });
  it("informa el avance", async () => {
    const x = xhrFalso();
    const seg = vi.fn();
    const p = subirAUrlFirmada("u", { size: 1 }, "image/png", seg, clase(x));
    x.upload.onprogress({ lengthComputable: true, loaded: 1, total: 4 });
    await p;
    expect(seg).toHaveBeenCalledWith(0.25);
  });
  it("si el almacén rechaza (403, 500) o se corta la red, falla con un mensaje claro", async () => {
    for (const status of [403, 500]) {
      await expect(subirAUrlFirmada("u", {}, "x/y", null, clase(xhrFalso({ status })))).rejects.toThrow(MENSAJE_SUBIDA_RECHAZADA);
    }
    await expect(subirAUrlFirmada("u", {}, "x/y", null, clase(xhrFalso({ evento: "error" })))).rejects.toThrow(MENSAJE_CORTE);
    await expect(subirAUrlFirmada("u", {}, "x/y", null, clase(xhrFalso({ evento: "abort" })))).rejects.toThrow(MENSAJE_CORTE);
  });
});

describe("Descargar todo: nombres, tamaño y papelera", () => {
  it("el límite sugerido es de 300 MB y se suma solo lo que tiene tamaño", () => {
    expect(LIMITE_ZIP_BYTES).toBe(300 * MB);
    expect(totalBytes([{ tamano: 10 }, { tamano: "5" }, { tamano: null }, {}, { tamano: -3 }])).toBe(15);
  });
  it("los nombres repetidos no se pisan y conservan la extensión", () => {
    const r = nombresParaZip([{ nombre: "DNI.jpg" }, { nombre: "dni.JPG" }, { nombre: "DNI.jpg" }, { nombre: "Poder" }, { nombre: "Poder" }]);
    expect(r.map((x) => x.nombre)).toEqual(["DNI.jpg", "dni (2).JPG", "DNI (3).jpg", "Poder", "Poder (2)"]);
  });
  it("saca lo que Windows y Mac rechazan y no deja nombres vacíos", () => {
    const r = nombresParaZip([{ nombre: 'a/b\\c:d*e?f"g<h>i|j.pdf' }, { nombre: "   " }, { nombre: "..." }, { nombre: null }, { nombre: "x\n\u0000y.png" }]);
    expect(r.map((x) => x.nombre)).toEqual(["a_b_c_d_e_f_g_h_i_j.pdf", "archivo", "archivo (2)", "archivo (3)", "xy.png"]);
  });
  it("el nombre del comprimido sale del expediente, limpio y acotado", () => {
    expect(nombreZip("Compraventa García / Pérez")).toBe("Compraventa García Pérez.zip");
    expect(nombreZip("")).toBe("Expediente.zip");
    expect(nombreZip(undefined)).toBe("Expediente.zip");
    expect(nombreZip("x".repeat(200)).length).toBe(84);
  });
  it("dice cuánto falta para que se elimine un archivo borrado", () => {
    expect(textoPapelera(20)).toBe("Se elimina en 20 días");
    expect(textoPapelera(1)).toBe("Se elimina mañana");
    expect(textoPapelera(0)).toBe("Se elimina hoy");
    expect(textoPapelera(undefined)).toBe("Se elimina hoy");
  });
});

describe("armarZip (con JSZip de verdad)", () => {
  const lista = [{ id: "1", nombre: "DNI.jpg" }, { id: "2", nombre: "DNI.jpg" }, { id: "3", nombre: "Poder.pdf" }];
  it("arma un comprimido con todos los archivos, con nombres únicos y el contenido intacto", async () => {
    const traer = vi.fn(async (a) => new Blob([`contenido-${a.id}`]));
    const seg = [];
    const { blob, fallidos, incluidos } = await armarZip(lista, { traer, JSZip, onProgreso: (p) => seg.push(p) });
    expect(fallidos).toEqual([]);
    expect(incluidos).toBe(3);
    const zip = await JSZip.loadAsync(await blob.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["DNI (2).jpg", "DNI.jpg", "Poder.pdf"]);
    expect(await zip.file("DNI (2).jpg").async("string")).toBe("contenido-2");
    expect(seg.map((p) => p.hechos)).toEqual([0, 1, 2, 3]);
    expect(seg.at(-1)).toMatchObject({ armando: true, total: 3 });
  });
  it("un archivo que no se puede bajar no frena a los demás y queda anotado", async () => {
    const traer = async (a) => { if (a.id === "2") throw new Error("ya no está"); return new Blob(["x"]); };
    const { blob, fallidos, incluidos } = await armarZip(lista, { traer, JSZip });
    expect(fallidos).toEqual(["DNI.jpg"]);
    expect(incluidos).toBe(2);
    expect(Object.keys((await JSZip.loadAsync(await blob.arrayBuffer())).files).sort()).toEqual(["DNI.jpg", "Poder.pdf"]);
  });
  it("se puede cancelar a la mitad: corta antes del próximo archivo y no baja el resto", async () => {
    let paradas = 0;
    const traer = vi.fn(async () => new Blob(["x"]));
    await expect(armarZip(lista, { traer, JSZip, debeParar: () => paradas++ >= 1 })).rejects.toThrow(CANCELADO);
    expect(traer).toHaveBeenCalledTimes(1);
  });
  it("sin archivos arma un comprimido vacío sin fallar", async () => {
    const { blob, incluidos } = await armarZip([], { traer: async () => new Blob([]), JSZip });
    expect(incluidos).toBe(0);
    expect(blob.size).toBeGreaterThan(0);
  });
});

describe("cámara de la página", () => {
  it("pide la foto a la mayor resolución del sensor y sin flash", () => {
    expect(opcionesFotoMaxima({ imageWidth: { max: 4000 }, imageHeight: { max: 3000 } })).toEqual({ fillLightMode: "off", imageWidth: 4000, imageHeight: 3000 });
  });
  it("si el equipo no informa resolución, igual pide sin flash", () => {
    for (const caps of [undefined, null, {}, { imageWidth: { max: 0 } }, { imageWidth: { max: 4000 } }]) expect(opcionesFotoMaxima(caps)).toEqual({ fillLightMode: "off" });
  });
  it("el progreso se avisa una vez por cada 5 % y siempre llega al 100 %", () => {
    const visto = [];
    const p = progresoPorPasos((x) => visto.push(x));
    for (let i = 0; i <= 1000; i++) p(i / 1000);
    expect(visto.length).toBeLessThanOrEqual(21);
    expect(visto[0]).toBe(0);
    expect(visto.at(-1)).toBe(1);
    expect(visto).toEqual([...visto].sort((a, b) => a - b));
  });
  it("valores raros no rompen el progreso", () => {
    const visto = [];
    const p = progresoPorPasos((x) => visto.push(x));
    p(-3); p(7); p(NaN);
    expect(visto.length).toBeGreaterThan(0);
  });
});

describe("aviso al eliminar un expediente", () => {
  it("dice cuántos archivos tiene y qué pasa con ellos", () => {
        expect(textoArchivos(undefined)).toMatch(/revisando/);
    expect(textoArchivos(0)).toBe("No tiene archivos.");
    expect(textoArchivos(1)).toBe("Tiene 1 archivo: deja de verse ya y se elimina del almacenamiento a los 30 días.");
    expect(textoArchivos(12)).toBe("Tiene 12 archivos: dejan de verse ya y se eliminan del almacenamiento a los 30 días.");
    expect(textoArchivos(null)).toMatch(/30 días/);
  });
});
