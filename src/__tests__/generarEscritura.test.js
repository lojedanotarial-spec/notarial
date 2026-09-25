import { describe, it, expect } from "vitest";
import { generarEscritura } from "../utils/generarEscritura";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mkParte = (overrides = {}) => ({
  id:       crypto.randomUUID(),
  nombre:   "CARLOS",
  apellido: "GARCIA",
  genero:   "M",
  nroDoc:   "27345678",
  cuit:     "20-27345678-9",
  nacionalidad: "argentina",
  estadoCivil:  "casado",
  fechaNac: "1980-05-10",
  rol:      "COMPRADOR",
  calle:    "San Martín",
  numero:   "1234",
  localidad: "Mendoza",
  ...overrides,
});

const escribano = {
  nombre:              "MARIA JOSE LOPEZ",
  caracter:            "Notaria Titular",
  registro:            "5",
  circunscripcion:     "primera",
  localidad_registro:  "Ciudad de Mendoza",
};

const fecha = { dia: 10, mes: 8, anio: 2026 }; // 10 de septiembre de 2026

const mkBarrio = (overrides = {}) => ({
  nombre: "Barrio Portal del Algarrobal",
  transmitente: "Cooperativa El Algarrobal",
  cuit: "33-54516418-9",
  matricula: "700062588",
  plano: "03-51952",
  frente: "Calle Los Alamos",
  ...overrides,
});

const mkLote = (overrides = {}) => ({
  manzana: "U",
  lote: "25",
  nroEscritura: "29",
  fechaEscritura: "10/09/2026",
  supMensura: "210,49",
  supTitulo1: "210,49",
  norte: "Lote N° 24", norteM: "21,14",
  sur:   "Lote N° 26", surM:   "21,14",
  este:  "Calle Los Alamos", esteM: "10,00",
  oeste: "Lote N° 30", oesteM: "10,00",
  precio: "50000000",
  retencionGanancias: "1500000",
  certRegistro: "3018489", fechaRegistro: "01/08/2026",
  certCatastro: "2026000032590", fechaCatastro: "02/08/2026",
  nomenclatura: "03-03-03-0001-00001",
  avaluo: "12000000",
  padronRentas: "03-76386-9",
  padronMuni: "67201",
  partes: [mkParte()],
  ...overrides,
});

// Template mínimo que ejercita variables de partes, escribano e inmueble.
const TEMPLATE = `
<p>{{PARTE_1_COMPLETO}}, DNI {{PARTE_1_DNI}}, {{PARTE_1_ROL}}</p>
<p>{{PARTE_2_COMPLETO}}, DNI {{PARTE_2_DNI}}, {{PARTE_2_ROL}}</p>
<p>{{COMPARECE_TEXTO}}</p>
<p>Escribano: {{ESCRIBANO_NOMBRE}} - Registro {{ESCRIBANO_REGISTRO}}</p>
<p>Manzana {{MANZANA}} Lote {{LOTE}}</p>
<p>Superficie: {{SUP_MENSURA}} - {{SUP_MENSURA_LETRAS}}</p>
<p>Límites: {{LIMITES}}</p>
<p>Precio: {{PRECIO_NUMEROS}} - {{PRECIO_LETRAS}}</p>
<p>Certificado registro: {{CERT_REGISTRO_NRO}} del {{CERT_REGISTRO_FECHA}}</p>
<p>Nomenclatura: {{NOMENCLATURA}} - Avalúo: {{AVALUO}}</p>
<p>Transmitente: {{TRANSMITENTE_NOMBRE}} CUIT {{TRANSMITENTE_CUIT}}</p>
<p>Adquirentes: {{ADQUIRENTES_TEXTO}}</p>
<p>Encabezado: {{ADQUIRENTES_ENCABEZADO}}</p>
`;

function generar(lote = mkLote(), barrio = mkBarrio()) {
  return generarEscritura(TEMPLATE, lote, barrio, escribano, fecha, lote.nroEscritura);
}

// ── UC-1: lote con más de un adquirente ────────────────────────────────────────

describe("UC-1: lote con más de un adquirente", () => {
  it("incluye los datos de todos los adquirentes, no sólo el primero", () => {
    const lote = mkLote({
      partes: [
        mkParte({ nombre: "CARLOS", apellido: "GARCIA", rol: "COMPRADOR", genero: "M" }),
        mkParte({ nombre: "ANA", apellido: "PEREZ", rol: "CÓNYUGE DEL COMPRADOR", genero: "F", nroDoc: "30111222" }),
      ],
    });
    const html = generar(lote);
    expect(html).toContain("Carlos GARCIA");
    expect(html).toContain("27.345.678");
    expect(html).toContain("Ana PEREZ");
    expect(html).toContain("30.111.222");
    // No debe quedar como variable sin resolver
    expect(html).not.toContain("{{PARTE_2_COMPLETO}}");
    expect(html).not.toContain("{{PARTE_2_DNI}}");
  });

  it("con un solo adquirente, la posición 2 queda vacía (no rompe, no inventa datos)", () => {
    const html = generar(mkLote({ partes: [mkParte()] }));
    expect(html).toContain("{{PARTE_2_COMPLETO}}"); // var-empty: sigue mostrando el placeholder
  });

  it("ADQUIRENTES_TEXTO y ADQUIRENTES_ENCABEZADO ya listaban a todos (sin regresión)", () => {
    const lote = mkLote({
      partes: [
        mkParte({ nombre: "CARLOS", apellido: "GARCIA" }),
        mkParte({ nombre: "ANA", apellido: "PEREZ", nroDoc: "30111222" }),
      ],
    });
    const html = generar(lote);
    expect(html).toContain("GARCIA");
    expect(html).toContain("PEREZ");
    expect(html).toMatch(/GARCIA.*Y.*PEREZ/s);
  });
});

// ── UC-2: concordancia de rol y género ─────────────────────────────────────────

describe("UC-2: concordancia de rol y género", () => {
  it("PARTE_N_ROL refleja el rol cargado con la concordancia de género del motor genérico", () => {
    const lote = mkLote({
      partes: [mkParte({ rol: "COMPRADOR/A", genero: "F", nombre: "ANA", apellido: "PEREZ" })],
    });
    const html = generar(lote);
    expect(html).toContain("COMPRADORA");
  });

  it("COMPARECE_TEXTO va en plural cuando hay más de un autorizante", () => {
    const lote = mkLote({
      partes: [
        mkParte({ rol: "AUTORIZANTE", genero: "M" }),
        mkParte({ rol: "AUTORIZANTE", genero: "F", nroDoc: "30111222" }),
      ],
    });
    const html = generar(lote);
    expect(html).toContain("COMPARECEN");
  });

  it("un solo autorizante usa singular", () => {
    const html = generar(mkLote({ partes: [mkParte({ rol: "AUTORIZANTE" })] }));
    expect(html).toContain("COMPARECE");
    expect(html).not.toContain("COMPARECEN");
  });
});

// ── UC-3: variables de inmueble sin regresión ──────────────────────────────────

describe("UC-3: variables de inmueble sin regresión", () => {
  it("genera todas las variables propias del inmueble con el mismo dato cargado", () => {
    const html = generar();
    expect(html).toContain(">U<");
    expect(html).toContain(">25<");
    expect(html).toContain("210,49");
    expect(html).toContain("metros cuadrados");
    expect(html).toContain("Norte: con Lote N° 24 en 21,14 metros");
    expect(html).toContain("50000000");
    expect(html).toContain("PESOS");
    expect(html).toContain("3018489");
    expect(html).toContain("01/08/2026");
    expect(html).toContain("03-03-03-0001-00001");
    expect(html).toContain("12000000");
    expect(html).toContain("Cooperativa El Algarrobal");
    expect(html).toContain("33-54516418-9");
  });

  it("un lote sin adquirentes no rompe la generación", () => {
    expect(() => generar(mkLote({ partes: [] }))).not.toThrow();
  });

  it("un lote con partes undefined no rompe la generación", () => {
    const lote = mkLote();
    delete lote.partes;
    expect(() => generar(lote)).not.toThrow();
  });
});
