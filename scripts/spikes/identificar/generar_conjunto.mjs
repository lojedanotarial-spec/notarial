// TB.0 (b): arma el conjunto de prueba en fotos_prueba/ (carpeta ignorada por git):
//  - documentos INVENTADOS (tarjeta verde frente y dorso, poder de 2 hojas, formulario 08, partida de nacimiento, un ticket) con
//    datos de ejemplo, renderizados con Chrome y con 4 variantes realistas de mala calidad cada uno;
//  - 2 variantes (original y mala) de cada ejemplar oficial del DNI bajado por bajar_oficiales.mjs;
//  - 2 imágenes sin documento (para comprobar que NO inventa).
// Escribe fotos_prueba/verdad.json con la respuesta correcta de cada imagen, para medir la precisión exacta.
// Los documentos inventados llevan un pie "DOCUMENTO DE PRUEBA - SIN VALIDEZ" y no imitan logos ni medidas de seguridad.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import sharp from "sharp";

const RAIZ = path.resolve("../../../fotos_prueba");
const HTML = path.join(RAIZ, "_html");
const SINT = path.join(RAIZ, "sinteticos");
const OFIC = path.join(RAIZ, "oficiales");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
for (const d of [HTML, SINT]) fs.mkdirSync(d, { recursive: true });

const pie = `<div style="position:absolute;bottom:14px;left:0;right:0;text-align:center;font:11px Arial;color:rgba(0,0,0,.45);letter-spacing:.08em">DOCUMENTO DE PRUEBA - SIN VALIDEZ</div>`;
const base = (cuerpo, fondo = "#fff") => `<!doctype html><meta charset="utf-8"><body style="margin:0;width:1600px;height:1000px;position:relative;background:${fondo};font-family:Arial,Helvetica,sans-serif">${cuerpo}${pie}</body>`;
const campo = (rotulo, valor, x, y, ancho = 360) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${ancho}px"><div style="font-size:15px;color:#2d5a2d;letter-spacing:.05em">${rotulo}</div><div style="font-size:30px;font-weight:bold;color:#111;margin-top:4px">${valor}</div></div>`;

// ── Documentos inventados ────────────────────────────────────────────────────
const DOCS = {
  tarjeta_frente: {
    html: base(`<div style="position:absolute;inset:40px;border:6px solid #3d7a3d;border-radius:28px;background:linear-gradient(135deg,#cfe8c3,#e9f5df 60%,#cfe8c3)"></div>
      <div style="position:absolute;left:90px;top:80px;font-size:34px;font-weight:bold;color:#1f4d1f">CÉDULA DE IDENTIFICACIÓN DEL AUTOMOTOR</div>
      ${campo("DOMINIO", "AB 123 CD", 90, 190)}${campo("MARCA", "FORD", 520, 190)}${campo("MODELO", "FOCUS 1.6 TREND", 860, 190, 600)}
      ${campo("TIPO", "SEDAN 5 PUERTAS", 90, 340, 420)}${campo("AÑO MOD.", "2019", 520, 340)}${campo("COLOR", "GRIS PLATA", 860, 340)}
      ${campo("N° DE CHASIS", "8AFZZZFHCKJ123456", 90, 490, 600)}${campo("N° DE MOTOR", "HNJA1234567", 860, 490, 600)}
      ${campo("TITULAR", "RODRÍGUEZ SÁNCHEZ, MARTÍN EZEQUIEL", 90, 650, 1300)}${campo("DNI", "30.123.456", 90, 790)}`),
    verdad: { tipo: "tarjeta_verde", lado: "anverso", apellido: "", nombre: "" },
  },
  tarjeta_dorso: {
    html: base(`<div style="position:absolute;inset:40px;border:6px solid #3d7a3d;border-radius:28px;background:linear-gradient(135deg,#cfe8c3,#e9f5df 60%,#cfe8c3)"></div>
      ${campo("TITULAR:", "RODRÍGUEZ SÁNCHEZ, MARTÍN EZEQUIEL", 90, 120, 1300)}${campo("DOCUMENTO:", "DNI 30.123.456", 90, 260, 700)}${campo("DOMICILIO:", "AV. ESPAÑA 1450 - CIUDAD DE MENDOZA", 90, 400, 1300)}
      ${campo("AUTORIZADO:", "DE LA FUENTE, CAROLINA", 90, 600, 1300)}${campo("DOCUMENTO:", "DNI 34.987.654", 90, 740, 700)}
      <div style="position:absolute;right:110px;top:140px;font-size:20px;color:#2d5a2d;text-align:right">Registro Seccional<br>Mendoza N° 0 (ejemplo)<br>Emisión: 12/03/2024</div>`),
    verdad: { tipo: "tarjeta_verde", lado: "reverso", apellido: "", nombre: "" },
  },
  poder_1: {
    html: base(`<div style="position:absolute;left:120px;right:120px;top:70px;font:22px 'Times New Roman',serif;line-height:1.55;color:#111;text-align:justify">
      <div style="text-align:right;font-size:18px">FOLIO 045</div>
      <div style="text-align:center;font-weight:bold;font-size:28px;margin:18px 0">ESCRITURA NÚMERO CIENTO VEINTITRÉS<br>PODER ESPECIAL</div>
      En la ciudad de Mendoza, a los nueve días del mes de noviembre del año dos mil veintiséis, ante mí, Escribano Titular del Registro número nueve mil ochocientos setenta y seis, COMPARECE: don MARTÍN EZEQUIEL RODRÍGUEZ SÁNCHEZ, argentino, mayor de edad, casado, con domicilio en Avenida España mil cuatrocientos cincuenta, de esta ciudad, quien justifica su identidad en los términos del artículo 306 del Código Civil y Comercial y MANIFIESTA: Que confiere PODER ESPECIAL a favor de doña CAROLINA DE LA FUENTE, argentina, mayor de edad, para que en su nombre y representación realice los siguientes actos: a) Gestionar ante el Registro de la Propiedad del Automotor la transferencia del vehículo marca Ford, modelo Focus, dominio AB 123 CD; b) Firmar formularios, solicitudes y toda documentación necesaria;</div>
      <div style="position:absolute;bottom:60px;left:0;right:0;text-align:center;font:18px 'Times New Roman',serif;color:#222">Hoja 1 de 2</div>`, "#fbfaf4"),
    verdad: { tipo: "poder", lado: null, pagina: 1, paginas_total: 2, apellido: "", nombre: "" },
  },
  poder_2: {
    html: base(`<div style="position:absolute;left:120px;right:120px;top:70px;font:22px 'Times New Roman',serif;line-height:1.55;color:#111;text-align:justify">
      <div style="text-align:right;font-size:18px">FOLIO 046</div>
      c) Abonar aranceles, tasas e impuestos; d) Cumplir con la verificación policial y retirar la documentación; y en general, realizar todos los actos y gestiones que fueren menester para el mejor cumplimiento del presente mandato, el que se confiere con facultades de sustitución. LEÍDA que le fue, la otorgante se ratifica de su contenido y firma ante mí, doy fe.
      <div style="margin-top:130px;display:flex;justify-content:space-around"><div style="border-top:2px solid #111;padding-top:8px;width:420px;text-align:center">Martín E. Rodríguez Sánchez</div><div style="border-top:2px solid #111;padding-top:8px;width:420px;text-align:center">Escribano autorizante</div></div></div>
      <div style="position:absolute;bottom:60px;left:0;right:0;text-align:center;font:18px 'Times New Roman',serif;color:#222">Hoja 2 de 2</div>`, "#fbfaf4"),
    verdad: { tipo: "poder", lado: null, pagina: 2, paginas_total: 2, apellido: "", nombre: "" },
  },
  formulario08: {
    html: base(`<div style="position:absolute;inset:50px;border:3px solid #333"></div>
      <div style="position:absolute;left:90px;top:80px;font-size:36px;font-weight:bold;color:#222">FORMULARIO 08 — SOLICITUD TIPO</div>
      <div style="position:absolute;left:90px;top:135px;font-size:22px;color:#444">Registro Nacional de la Propiedad del Automotor — Transferencia de dominio</div>
      ${campo("DOMINIO", "AB 123 CD", 90, 220)}${campo("MARCA / MODELO", "FORD FOCUS 1.6 TREND", 520, 220, 800)}
      ${campo("VENDEDOR (TITULAR)", "RODRÍGUEZ SÁNCHEZ, MARTÍN EZEQUIEL", 90, 380, 1100)}${campo("COMPRADOR", "PÉREZ LUCERO, JUAN IGNACIO", 90, 530, 1100)}
      ${campo("PRECIO DECLARADO", "$ 9.500.000", 90, 690)}${campo("FECHA", "09/11/2026", 520, 690)}`),
    verdad: { tipo: "formulario", lado: null, apellido: "", nombre: "" },
  },
  partida: {
    html: base(`<div style="position:absolute;inset:40px;border:10px double #7a5a2a;background:#fbf4df"></div>
      <div style="position:absolute;left:0;right:0;top:90px;text-align:center;font:bold 40px 'Times New Roman',serif;color:#4a3410">ACTA DE NACIMIENTO</div>
      <div style="position:absolute;left:0;right:0;top:150px;text-align:center;font:22px 'Times New Roman',serif;color:#4a3410">Registro del Estado Civil y Capacidad de las Personas</div>
      <div style="position:absolute;left:150px;right:150px;top:250px;font:28px 'Times New Roman',serif;line-height:1.8;color:#222">Apellido: <b>IBÁÑEZ CARRIZO</b><br>Nombre: <b>VALENTINA SOFÍA</b><br>Fecha de nacimiento: 14 de marzo de 2015<br>Lugar: Mendoza, Argentina<br>Padre: Carlos Alberto Ibáñez<br>Madre: Lucía Carrizo<br>Acta N° 4521 — Tomo 3 — Folio 87</div>`),
    verdad: { tipo: "otro", lado: null, apellido: "Ibáñez Carrizo", nombre: "Valentina Sofía", descripcion_contiene: "nacimiento" },
  },
  ticket: {
    html: base(`<div style="position:absolute;left:520px;top:30px;width:560px;height:930px;background:#fff;box-shadow:0 0 20px rgba(0,0,0,.2);font:24px 'Courier New',monospace;padding:30px;box-sizing:border-box;color:#111;line-height:1.7">
      <div style="text-align:center;font-weight:bold">SUPERMERCADO EL SOL S.A.</div><div style="text-align:center">TICKET FACTURA B</div><hr>
      Pan lactal ........ $ 2.400<br>Leche 1L ......... $ 1.900<br>Yerba 1kg ........ $ 6.800<br>Fideos 500g ...... $ 1.700<br><hr>TOTAL ............ $ 12.800<br>09/11/2026 15:42</div>`, "#c9c4b8"),
    verdad: { tipo: "otro", lado: null, apellido: "", nombre: "", aceptar_sin_identificar: true },
  },
};

// ── Chrome → PNG ─────────────────────────────────────────────────────────────
function renderizar(nombre, html) {
  const archivo = path.join(HTML, `${nombre}.html`);
  const png = path.join(HTML, `${nombre}.png`);
  fs.writeFileSync(archivo, html);
  execFileSync(CHROME, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1600,1000", `--screenshot=${png}`, pathToFileURL(archivo).href], { stdio: "ignore" });
  return png;
}

// ── Variantes de mala calidad (sharp) ────────────────────────────────────────
const sombra = (w, h) => Buffer.from(`<svg width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" x2="1"><stop offset="0" stop-color="#000" stop-opacity=".55"/><stop offset=".55" stop-color="#000" stop-opacity="0"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/></svg>`);
const reflejo = (w, h) => Buffer.from(`<svg width="${w}" height="${h}"><defs><radialGradient id="r" cx=".66" cy=".34" r=".34"><stop offset="0" stop-color="#fff" stop-opacity=".95"/><stop offset=".6" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="100%" height="100%" fill="url(#r)"/></svg>`);

async function variante(origen, tipoVariante) {
  let img = sharp(origen);
  const { width: w0, height: h0 } = await img.metadata();
  const escala = (ancho) => ({ width: Math.min(ancho, w0) });
  if (tipoVariante === "normal") return sharp(await img.resize(escala(1400)).jpeg({ quality: 90 }).toBuffer());
  if (tipoVariante === "inclinada_sombra") {
    const rot = await img.resize(escala(1300)).rotate(6, { background: "#8d8a82" }).toBuffer();
    const { width: w, height: h } = await sharp(rot).metadata();
    const con = await sharp(rot).composite([{ input: sombra(w, h) }]).modulate({ brightness: 0.92 }).toBuffer();
    return sharp(await sharp(con).jpeg({ quality: 80 }).toBuffer());
  }
  if (tipoVariante === "reflejo_borrosa") {
    const b = await img.resize(escala(1100)).blur(1.6).toBuffer();
    const { width: w, height: h } = await sharp(b).metadata();
    return sharp(await sharp(b).composite([{ input: reflejo(w, h) }]).jpeg({ quality: 75 }).toBuffer());
  }
  // baja_calidad: chica, de costado (rotada 90°), muy comprimida
  return sharp(await img.resize(escala(700)).rotate(90).jpeg({ quality: 30 }).toBuffer());
}

const verdad = {};
const VARIANTES = ["normal", "inclinada_sombra", "reflejo_borrosa", "baja_calidad"];
for (const [clave, def] of Object.entries(DOCS)) {
  const png = renderizar(clave, def.html);
  for (const v of VARIANTES) {
    const rel = `sinteticos/${clave}__${v}.jpg`;
    await (await variante(png, v)).toFile(path.join(RAIZ, rel));
    verdad[rel] = { ...def.verdad };
  }
  console.log("sintético:", clave);
}

// Ejemplares oficiales: original y una versión "mala"
const OFICIALES = {
  dni_2020_frente: { tipo: "dni", lado: "anverso", apellido: "Martínez", nombre: "Laura" },
  dni_2020_reverso: { tipo: "dni", lado: "reverso", apellido: "Martinez", nombre: "Laura" },
  dni_2023_frente: { tipo: "dni", lado: "anverso", apellido: "Portillo", nombre: "Virgilio" },
  dni_2023_reverso: { tipo: "dni", lado: "reverso", apellido: "Gonzalez Rodriguez", nombre: "Mariana" },
  dni_digital_2026: { tipo: "dni", lado: "anverso", apellido: "Fernandez", nombre: "Alejo" },
  dni_extranjeros_anexo3: { tipo: "dni", lado: null, apellido: "", nombre: "", lado_libre: true },
};
for (const archivo of fs.readdirSync(OFIC)) {
  const clave = path.parse(archivo).name;
  if (!OFICIALES[clave]) continue;
  const origen = path.join(OFIC, archivo);
  for (const v of ["normal", "reflejo_borrosa"]) {
    const rel = `oficiales/${clave}__${v}.jpg`;
    await (await variante(origen, v)).toFile(path.join(RAIZ, rel));
    verdad[rel] = { ...OFICIALES[clave] };
  }
  console.log("oficial:", clave);
}

// Sin documento: no tiene que inventar nada
const ruido = Buffer.alloc(900 * 600 * 3);
for (let i = 0; i < ruido.length; i++) ruido[i] = 90 + ((i * 2654435761) % 60);
await sharp(ruido, { raw: { width: 900, height: 600, channels: 3 } }).blur(8).jpeg({ quality: 70 }).toFile(path.join(RAIZ, "sinteticos/no_documento_borroso.jpg"));
await sharp({ create: { width: 900, height: 600, channels: 3, background: "#222" } }).jpeg({ quality: 70 }).toFile(path.join(RAIZ, "sinteticos/no_documento_oscuro.jpg"));
verdad["sinteticos/no_documento_borroso.jpg"] = { sin_identificar: true };
verdad["sinteticos/no_documento_oscuro.jpg"] = { sin_identificar: true };

fs.writeFileSync(path.join(RAIZ, "verdad.json"), JSON.stringify(verdad, null, 2));
console.log(`\n${Object.keys(verdad).length} imágenes en el conjunto de prueba → fotos_prueba/verdad.json`);
