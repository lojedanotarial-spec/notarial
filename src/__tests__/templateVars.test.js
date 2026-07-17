import { describe, it, expect } from "vitest";
import { buildVars, sustituirVars } from "../utils/templateVars";

// ── Fixtures ──────────────────────────────────────────────────────────────────

const mkParte = (overrides = {}) => ({
  nombre:   "CARLOS",
  apellido: "GARCIA",
  genero:   "M",
  nroDoc:   "27345678",
  rol:      "VENDEDOR",
  ...overrides,
});

const escribanoTitular = {
  nombre:          "MARIA JOSE LOPEZ",
  caracter:        "Notaria Titular",
  registro:        "5",
  circunscripcion: "primera",
};

const escribanoAdscripto = {
  nombre:          "JUAN PEREZ",
  caracter:        "Notario Adscripto",
  registro:        "5",
  circunscripcion: "segunda",
};

const fechaBase    = { dia: 10, mes: 0, anio: 2026, ciudad: "Mendoza" }; // enero
const protocoloBase = { nroActa: "42", nroLibro: "7" };

// Helper: buildVars con defaults sensatos, solo se pasan los overrides
const ctx = (overrides = {}) => buildVars({
  partes:      [],
  escribano:   escribanoTitular,
  fecha:       fechaBase,
  protocolo:   protocoloBase,
  instrumento: {},
  extravars:   {},
  vehiculos:   [],
  estilos:     {},
  ...overrides,
});

// Quita solo el marcador ~~fromUser~~ (resaltado de datos de usuario, agregado
// en v0.9.0) para poder testear el CONTENIDO de los bloques sin acoplarse a
// los detalles de showVarHighlight. Deja intactos **bold**/__underline__,
// que sí son parte de lo que estos tests verifican.
const sinTilde = (texto) => (texto || "").replace(/~~/g, "");

// ── 1. Edge cases ─────────────────────────────────────────────────────────────

describe("edge cases", () => {
  it("no explota con partes vacías", () => {
    expect(() => ctx()).not.toThrow();
  });

  it("no explota con todos los defaults en undefined", () => {
    expect(() => buildVars({})).not.toThrow();
  });

  it("slots null en partes no generan variables", () => {
    const vars = ctx({ partes: [null, mkParte()] });
    expect(vars.PARTE_1_NOMBRE).toBeUndefined();
    expect(vars.PARTE_2_NOMBRE).toBe("Carlos");
  });

  it("parte sin nombre ni apellido no explota", () => {
    expect(() => ctx({ partes: [mkParte({ nombre: undefined, apellido: undefined })] })).not.toThrow();
  });

  it("parte sin nroDoc genera DNI vacío", () => {
    const vars = ctx({ partes: [mkParte({ nroDoc: undefined })] });
    expect(vars.PARTE_1_DNI).toBe("");
  });
});

// ── 2. PARTE_N_* campos básicos ───────────────────────────────────────────────

describe("PARTE_N_* básicos", () => {
  it("PARTE_1_NOMBRE en titlecase con default estilos", () => {
    const vars = ctx({ partes: [mkParte()] });
    expect(vars.PARTE_1_NOMBRE).toBe("Carlos");
  });

  it("PARTE_1_APELLIDO siempre uppercase", () => {
    const vars = ctx({ partes: [mkParte({ apellido: "garcia" })] });
    expect(vars.PARTE_1_APELLIDO).toBe("GARCIA");
  });

  it("PARTE_1_COMPLETO = nombre titlecase + apellido uppercase", () => {
    const vars = ctx({ partes: [mkParte()] });
    expect(vars.PARTE_1_COMPLETO).toBe("Carlos GARCIA");
  });

  it("PARTE_1_COMPLETO_UP = nombre uppercase + apellido uppercase", () => {
    const vars = ctx({ partes: [mkParte()] });
    expect(vars.PARTE_1_COMPLETO_UP).toBe("CARLOS GARCIA");
  });

  it("PARTE_1_NOMBRE_UP siempre uppercase", () => {
    const vars = ctx({ partes: [mkParte({ nombre: "carlos alberto" })] });
    expect(vars.PARTE_1_NOMBRE_UP).toBe("CARLOS ALBERTO");
  });

  it("DNI formateado con separador de miles argentino", () => {
    const vars = ctx({ partes: [mkParte({ nroDoc: "27345678" })] });
    expect(vars.PARTE_1_DNI).toBe("27.345.678");
  });

  it("DNI con guiones o letras se limpia antes de formatear", () => {
    const vars = ctx({ partes: [mkParte({ nroDoc: "27-345-678" })] });
    expect(vars.PARTE_1_DNI).toBe("27.345.678");
  });

  it("ROL siempre en mayúsculas", () => {
    const vars = ctx({ partes: [mkParte({ rol: "comprador" })] });
    expect(vars.PARTE_1_ROL).toBe("COMPRADOR");
  });

  it("ESTADO_CIVIL se pasa tal cual", () => {
    const vars = ctx({ partes: [mkParte({ estadoCivil: "casado" })] });
    expect(vars.PARTE_1_ESTADO_CIVIL).toBe("casado");
  });

  it("PARTE_1_CUIT raw si existe", () => {
    const vars = ctx({ partes: [mkParte({ cuit: "20-27345678-4" })] });
    expect(vars.PARTE_1_CUIT).toBe("20-27345678-4");
  });

  it("PARTE_1_CUIT_LABEL vacío sin CUIT", () => {
    const vars = ctx({ partes: [mkParte()] });
    expect(vars.PARTE_1_CUIT_LABEL).toBe("");
  });

  it("PARTE_1_CUIT_LABEL con CUIT incluye prefijo", () => {
    const vars = ctx({ partes: [mkParte({ cuit: "20-27345678-4" })] });
    expect(vars.PARTE_1_CUIT_LABEL).toBe(", C.U.I.T./L. 20-27345678-4");
  });

  it("múltiples partes generan PARTE_1 y PARTE_2", () => {
    const vars = ctx({ partes: [mkParte({ apellido: "GARCIA" }), mkParte({ apellido: "LOPEZ" })] });
    expect(vars.PARTE_1_APELLIDO).toBe("GARCIA");
    expect(vars.PARTE_2_APELLIDO).toBe("LOPEZ");
  });
});

// ── 3. Formato de nombres (estilos) ───────────────────────────────────────────

describe("nombresFormato", () => {
  it("titlecase_upper (default): nombre en titlecase, apellido uppercase", () => {
    const vars = ctx({ partes: [mkParte()], estilos: { nombresFormato: "titlecase_upper" } });
    expect(vars.PARTE_1_NOMBRE).toBe("Carlos");
    expect(vars.PARTE_1_APELLIDO).toBe("GARCIA");
  });

  it("uppercase: nombre en uppercase", () => {
    const vars = ctx({ partes: [mkParte()], estilos: { nombresFormato: "uppercase" } });
    expect(vars.PARTE_1_NOMBRE).toBe("CARLOS");
    expect(vars.PARTE_1_APELLIDO).toBe("GARCIA");
  });

  it("titlecase_both: apellido también en titlecase", () => {
    const vars = ctx({ partes: [mkParte()], estilos: { nombresFormato: "titlecase_both" } });
    expect(vars.PARTE_1_NOMBRE).toBe("Carlos");
    expect(vars.PARTE_1_APELLIDO).toBe("Garcia");
    expect(vars.PARTE_1_COMPLETO).toBe("Carlos Garcia");
  });

  it("nombre compuesto con titlecase_upper", () => {
    const vars = ctx({ partes: [mkParte({ nombre: "RAUL ALBERTO" })] });
    expect(vars.PARTE_1_NOMBRE).toBe("Raul Alberto");
  });
});

// ── 4. Concordancias de género ────────────────────────────────────────────────

describe("concordancias de género", () => {
  it("ARTICULO: el señor para M, la señora para F", () => {
    const mVars = ctx({ partes: [mkParte({ genero: "M" })] });
    const fVars = ctx({ partes: [mkParte({ genero: "F" })] });
    expect(mVars.PARTE_1_ARTICULO).toBe("el señor");
    expect(fVars.PARTE_1_ARTICULO).toBe("la señora");
  });

  it("ARTICULO_LA_EL: El para M, La para F", () => {
    const mVars = ctx({ partes: [mkParte({ genero: "M" })] });
    const fVars = ctx({ partes: [mkParte({ genero: "F" })] });
    expect(mVars.PARTE_1_ARTICULO_LA_EL).toBe("El");
    expect(fVars.PARTE_1_ARTICULO_LA_EL).toBe("La");
  });

  it("NACIDO_A: nacido para M, nacida para F", () => {
    const mVars = ctx({ partes: [mkParte({ genero: "M" })] });
    const fVars = ctx({ partes: [mkParte({ genero: "F" })] });
    expect(mVars.PARTE_1_NACIDO_A).toBe("nacido");
    expect(fVars.PARTE_1_NACIDO_A).toBe("nacida");
  });

  it("DEL_DE_LA: del para M, de la para F", () => {
    const mVars = ctx({ partes: [mkParte({ genero: "M" })] });
    const fVars = ctx({ partes: [mkParte({ genero: "F" })] });
    expect(mVars.PARTE_1_DEL_DE_LA).toBe("del");
    expect(fVars.PARTE_1_DEL_DE_LA).toBe("de la");
  });
});

// ── 5. Concordancia de nacionalidad ───────────────────────────────────────────

describe("fmtNacionalidad", () => {
  const testNac = (nac, genero, expected) => {
    const vars = ctx({ partes: [mkParte({ nacionalidad: nac, genero })] });
    expect(vars.PARTE_1_NACIONALIDAD).toBe(expected);
  };

  it("argentina → argentino para M",     () => testNac("argentina",  "M", "argentino"));
  it("argentina sin cambio para F",       () => testNac("argentina",  "F", "argentina"));
  it("uruguaya → uruguayo para M",        () => testNac("uruguaya",   "M", "uruguayo"));
  it("chilena → chileno para M",          () => testNac("chilena",    "M", "chileno"));
  it("boliviana → boliviano para M",      () => testNac("boliviana",  "M", "boliviano"));
  it("peruana → peruano para M",          () => testNac("peruana",    "M", "peruano"));
  it("paraguaya → paraguayo para M",      () => testNac("paraguaya",  "M", "paraguayo"));
  it("brasileña → brasileño para M",      () => testNac("brasileña",  "M", "brasileño"));
  it("venezolana → venezolano para M",    () => testNac("venezolana", "M", "venezolano"));
  it("colombiana → colombiano para M",    () => testNac("colombiana", "M", "colombiano"));
  it("desconocida sin cambio para M",     () => testNac("italiana",   "M", "italiana"));
  it("sin nacionalidad → vacío",          () => testNac(undefined,    "M", ""));

  it("mayúsculas en input también se convierten", () => {
    const vars = ctx({ partes: [mkParte({ nacionalidad: "ARGENTINA", genero: "M" })] });
    expect(vars.PARTE_1_NACIONALIDAD).toBe("argentino");
  });
});

// ── 6. Fecha de nacimiento ────────────────────────────────────────────────────

describe("fmtFechaNac", () => {
  it("formato ISO AAAA-MM-DD: 1971-08-21", () => {
    const vars = ctx({ partes: [mkParte({ fechaNac: "1971-08-21" })] });
    expect(vars.PARTE_1_FECHA_NAC).toBe("21 de agosto de 1971");
  });

  it("formato DD/MM/AAAA: 21/08/1971", () => {
    const vars = ctx({ partes: [mkParte({ fechaNac: "21/08/1971" })] });
    expect(vars.PARTE_1_FECHA_NAC).toBe("21 de agosto de 1971");
  });

  it("sin fechaNac → vacío", () => {
    const vars = ctx({ partes: [mkParte({ fechaNac: undefined })] });
    expect(vars.PARTE_1_FECHA_NAC).toBe("");
  });

  it("día 1 sin cero inicial", () => {
    const vars = ctx({ partes: [mkParte({ fechaNac: "2000-01-01" })] });
    expect(vars.PARTE_1_FECHA_NAC).toBe("1 de enero de 2000");
  });

  it("mes diciembre (12)", () => {
    const vars = ctx({ partes: [mkParte({ fechaNac: "1990-12-15" })] });
    expect(vars.PARTE_1_FECHA_NAC).toBe("15 de diciembre de 1990");
  });
});

// ── 7. Domicilio ──────────────────────────────────────────────────────────────

describe("fmtDomicilio", () => {
  it("domicilio con calle, número y localidad", () => {
    const vars = ctx({ partes: [mkParte({ calle: "Av. España", numero: "456", localidad: "Mendoza" })] });
    expect(vars.PARTE_1_DOMICILIO).toBe("Av. España, 456, Mendoza");
  });

  it("domicilio completo con todos los campos", () => {
    const p = mkParte({
      barrio: "Las Heras", manzana: "A", casa: "3",
      calle: "Calle Nueva", numero: "100",
      piso: "2", dpto: "B",
      localidad: "Las Heras", departamento: "Capital",
      provincia: "Mendoza", pais: "Argentina",
    });
    const vars = ctx({ partes: [p] });
    expect(vars.PARTE_1_DOMICILIO).toBe(
      "Barrio Las Heras, Manzana A, Casa 3, Calle Nueva, 100, piso 2, dpto. B, Las Heras, Capital, Mendoza, Argentina"
    );
  });

  it("domicilio sin campos → vacío", () => {
    const vars = ctx({ partes: [mkParte({ calle: undefined, numero: undefined })] });
    expect(vars.PARTE_1_DOMICILIO).toBe("");
  });
});

// ── 8. IDENTIDAD_ACTA ─────────────────────────────────────────────────────────

describe("PARTE_N_IDENTIDAD_ACTA", () => {
  it("incluye nombre, DNI y domicilio cuando están presentes", () => {
    const vars = ctx({
      partes: [mkParte({ calle: "Calle Falsa", numero: "123", nroDoc: "27345678" })],
    });
    const acta = sinTilde(vars.PARTE_1_IDENTIDAD_ACTA);
    expect(acta).toContain("Carlos GARCIA");
    expect(acta).toContain("Documento Nacional de Identidad número 27.345.678");
    expect(acta).toContain("domicilio en Calle Falsa, 123");
  });

  it("incluye fechaNac con nacido/nacida", () => {
    const vars = ctx({
      partes: [mkParte({ fechaNac: "1980-03-10", genero: "F" })],
    });
    expect(sinTilde(vars.PARTE_1_IDENTIDAD_ACTA)).toContain("nacida el día 10 de marzo de 1980");
  });

  it("sin DNI omite la sección DNI", () => {
    const vars = ctx({ partes: [mkParte({ nroDoc: undefined })] });
    expect(vars.PARTE_1_IDENTIDAD_ACTA).not.toContain("Documento Nacional de Identidad");
  });
});

// ── 9. Escribano ──────────────────────────────────────────────────────────────

describe("escribano", () => {
  it("ESCRIBANO_AL_DEL = 'del' para titular", () => {
    const vars = ctx({ escribano: escribanoTitular });
    expect(vars.ESCRIBANO_AL_DEL).toBe("del");
  });

  it("ESCRIBANO_AL_DEL = 'al' para adscripto", () => {
    const vars = ctx({ escribano: escribanoAdscripto });
    expect(vars.ESCRIBANO_AL_DEL).toBe("al");
  });

  it("ESCRIBANO_AL_DEL detecta 'titular' en cualquier posición del caracter", () => {
    const vars = ctx({ escribano: { ...escribanoAdscripto, caracter: "Titular interino" } });
    expect(vars.ESCRIBANO_AL_DEL).toBe("del");
  });

  it("ESCRIBANO_NOMBRE en uppercase por default", () => {
    const vars = ctx({ escribano: { ...escribanoTitular, nombre: "Ana García" } });
    expect(vars.ESCRIBANO_NOMBRE).toBe("ANA GARCÍA");
  });

  it("ESCRIBANO_NOMBRE sin uppercase cuando escribanoUppercase:false", () => {
    const vars = ctx({
      escribano: { ...escribanoTitular, nombre: "Ana García" },
      estilos:   { escribanoUppercase: false },
    });
    expect(vars.ESCRIBANO_NOMBRE).toBe("Ana García");
  });

  it("ESCRIBANO_REGISTRO_LETRAS en letras (default)", () => {
    const vars = ctx({ escribano: { ...escribanoTitular, registro: "5" } });
    expect(vars.ESCRIBANO_REGISTRO_LETRAS).toBe("cinco");
  });

  it("ESCRIBANO_REGISTRO_LETRAS en número con registroFormato numero", () => {
    const vars = ctx({
      escribano: { ...escribanoTitular, registro: "5" },
      estilos:   { registroFormato: "numero" },
    });
    expect(vars.ESCRIBANO_REGISTRO_LETRAS).toBe("5");
  });

  it("ESCRIBANO_REGISTRO_LETRAS devuelve el string crudo si registro es 0 (fix #46, no vacío)", () => {
    const vars = ctx({ escribano: { ...escribanoTitular, registro: "0" } });
    expect(vars.ESCRIBANO_REGISTRO_LETRAS).toBe("0");
  });

  it("ESCRIBANO_CIRCUNSCRIPCION se pasa tal cual", () => {
    const vars = ctx({ escribano: { ...escribanoTitular, circunscripcion: "segunda" } });
    expect(vars.ESCRIBANO_CIRCUNSCRIPCION).toBe("segunda");
  });
});

// ── 10. Fecha ─────────────────────────────────────────────────────────────────

describe("variables de fecha", () => {
  it("FECHA_MES_LETRAS para todos los meses (0=enero, 11=diciembre)", () => {
    const meses = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO",
                   "JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"];
    meses.forEach((mes, i) => {
      const vars = ctx({ fecha: { dia: 1, mes: i, anio: 2026 } });
      expect(vars.FECHA_MES_LETRAS).toBe(mes);
    });
  });

  it("FECHA_DIA_LETRAS es truthy para día 1", () => {
    const vars = ctx({ fecha: { dia: 1, mes: 0, anio: 2026 } });
    expect(vars.FECHA_DIA_LETRAS).toBeTruthy();
  });

  it("FECHA_ANIO_LETRAS para 2026 contiene 'dos mil'", () => {
    const vars = ctx({ fecha: { dia: 1, mes: 0, anio: 2026 } });
    expect(vars.FECHA_ANIO_LETRAS.toLowerCase()).toContain("dos mil");
  });

  it("FECHA_DIA con padding de 2 dígitos", () => {
    const vars = ctx({ fecha: { dia: 5, mes: 0, anio: 2026 } });
    expect(vars.FECHA_DIA).toBe("05");
  });

  it("FECHA_MES con padding de 2 dígitos (mes 0 = mes 01)", () => {
    const vars = ctx({ fecha: { dia: 1, mes: 0, anio: 2026 } });
    expect(vars.FECHA_MES).toBe("01");
  });

  it("FECHA_CIUDAD se pasa tal cual", () => {
    const vars = ctx({ fecha: { ...fechaBase, ciudad: "San Rafael" } });
    expect(vars.FECHA_CIUDAD).toBe("San Rafael");
  });
});

// ── 11. Protocolo ─────────────────────────────────────────────────────────────

describe("protocolo", () => {
  it("PROTOCOLO_ACTA y PROTOCOLO_LIBRO se pasan tal cual", () => {
    const vars = ctx({ protocolo: { nroActa: "100", nroLibro: "3" } });
    expect(vars.PROTOCOLO_ACTA).toBe("100");
    expect(vars.PROTOCOLO_LIBRO).toBe("3");
  });

  it("protocolo vacío → cadenas vacías", () => {
    const vars = ctx({ protocolo: {} });
    expect(vars.PROTOCOLO_ACTA).toBe("");
    expect(vars.PROTOCOLO_LIBRO).toBe("");
  });
});

// ── 12. Autorizantes ─────────────────────────────────────────────────────────

describe("autorizantes", () => {
  const autM  = mkParte({ nombre: "JUAN", apellido: "PEREZ", genero: "M",  rol: "Autorizante" });
  const autF  = mkParte({ nombre: "ANA",  apellido: "PEREZ", genero: "F",  rol: "Autorizante" });
  const autM2 = mkParte({ nombre: "LUIS", apellido: "DIAZ",  genero: "M",  rol: "Autorizante" });

  it("autorizante único: COMPARECE singular", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.COMPARECE_TEXTO).toBe("**COMPARECE**");
  });

  it("autorizante único: DICE singular", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.DICE_TEXTO).toBe("**DICE**");
  });

  it("dos autorizantes: COMPARECEN plural", () => {
    const vars = ctx({ partes: [autM, autM2] });
    expect(vars.COMPARECE_TEXTO).toBe("**COMPARECEN**");
    expect(vars.DICE_TEXTO).toBe("**DICEN**");
  });

  it("autorizante singular masculino: DEL_DE_LA_COMPARECIENTE = 'del compareciente'", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.DEL_DE_LA_COMPARECIENTE).toBe("del compareciente");
  });

  it("autorizante singular femenino: DEL_DE_LA_COMPARECIENTE = 'de la compareciente'", () => {
    const vars = ctx({ partes: [autF] });
    expect(vars.DEL_DE_LA_COMPARECIENTE).toBe("de la compareciente");
  });

  it("EL_LA_COMPARECIENTE singular M = 'el compareciente'", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.EL_LA_COMPARECIENTE).toBe("el compareciente");
  });

  it("EL_LA_COMPARECIENTE singular F = 'la compareciente'", () => {
    const vars = ctx({ partes: [autF] });
    expect(vars.EL_LA_COMPARECIENTE).toBe("la compareciente");
  });

  it("AUTORIZANTES_UP en uppercase con nombre y apellido", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.AUTORIZANTES_UP).toBe("JUAN PEREZ");
  });

  it("AUTORIZANTE_CAPACIDAD plural para 2 autorizantes", () => {
    const vars = ctx({ partes: [autM, autM2] });
    expect(vars.AUTORIZANTE_CAPACIDAD).toContain("mayores de edad");
  });

  it("AUTORIZANTE_CAPACIDAD singular para 1 autorizante", () => {
    const vars = ctx({ partes: [autM] });
    expect(vars.AUTORIZANTE_CAPACIDAD).toContain("mayor de edad");
  });
});

// ── 13. Autorizados ───────────────────────────────────────────────────────────

describe("autorizados", () => {
  const autorizante = mkParte({ nombre: "JUAN",  apellido: "PEREZ",    genero: "M", rol: "Autorizante" });
  const autM        = mkParte({ nombre: "PEDRO", apellido: "GOMEZ",    genero: "M", rol: "Autorizado" });
  const autF        = mkParte({ nombre: "LUISA", apellido: "MARTINEZ", genero: "F", rol: "Autorizado" });
  const autM2       = mkParte({ nombre: "LUIS",  apellido: "DIAZ",     genero: "M", rol: "Autorizado" });

  it("autorizado masculino: FACULTADO_TEXTO = 'queda facultado'", () => {
    const vars = ctx({ partes: [autorizante, autM] });
    expect(vars.FACULTADO_TEXTO).toBe("queda facultado");
  });

  it("autorizada femenina: FACULTADO_TEXTO = 'queda facultada'", () => {
    const vars = ctx({ partes: [autorizante, autF] });
    expect(vars.FACULTADO_TEXTO).toBe("queda facultada");
  });

  it("dos autorizados masculinos: FACULTADO_TEXTO = 'quedan facultados'", () => {
    const vars = ctx({ partes: [autorizante, autM, autM2] });
    expect(vars.FACULTADO_TEXTO).toBe("quedan facultados");
  });

  it("EL_AUTORIZADO_TEXTO singular M", () => {
    const vars = ctx({ partes: [autorizante, autM] });
    expect(vars.EL_AUTORIZADO_TEXTO).toBe("El autorizado asume");
  });

  it("EL_AUTORIZADO_TEXTO singular F", () => {
    const vars = ctx({ partes: [autorizante, autF] });
    expect(vars.EL_AUTORIZADO_TEXTO).toBe("La autorizada asume");
  });

  it("AUTORIZADOS_UP en uppercase", () => {
    const vars = ctx({ partes: [autorizante, autM] });
    expect(vars.AUTORIZADOS_UP).toBe("PEDRO GOMEZ");
  });
});

// ── 14. Vehículos ─────────────────────────────────────────────────────────────

describe("vehículos", () => {
  const auto = {
    tipo_vehiculo: "AUTOMÓVIL",
    marca: "FORD",
    modelo: "FOCUS",
    tipo_desc: "Sedán",
    dominio: "ABC123",
    chasis: "9BWZZZ377VT004251",
    motor: "M123456",
  };

  const moto = {
    tipo_vehiculo: "MOTOVEHÍCULO",
    marca: "HONDA",
    modelo: "CB500",
    dominio: "XYZ789",
  };

  it("VEHICULO_1_* con todos los campos", () => {
    const vars = ctx({ vehiculos: [auto] });
    expect(vars.VEHICULO_1_TIPO).toBe("AUTOMÓVIL");
    expect(vars.VEHICULO_1_MARCA).toBe("FORD");
    expect(vars.VEHICULO_1_MODELO).toBe("FOCUS");
    expect(vars.VEHICULO_1_TIPO_DESC).toBe("Sedán");
    expect(vars.VEHICULO_1_DOMINIO).toBe("ABC123");
    expect(vars.VEHICULO_1_CHASIS).toBe("9BWZZZ377VT004251");
    expect(vars.VEHICULO_1_MOTOR).toBe("M123456");
  });

  it("VEHICULOS_LISTA un vehículo: termina en ;", () => {
    const vars = ctx({ vehiculos: [auto] });
    expect(vars.VEHICULOS_LISTA).toMatch(/;$/);
    expect(vars.VEHICULOS_LISTA).toContain("Marca: **FORD**");
    expect(vars.VEHICULOS_LISTA).toContain("Dominio: **ABC123**");
  });

  it("VEHICULOS_LISTA dos vehículos: numerados y separados", () => {
    const vars = ctx({ vehiculos: [auto, moto] });
    expect(vars.VEHICULOS_LISTA).toContain("1)");
    expect(vars.VEHICULOS_LISTA).toContain("2)");
  });

  it("TIPO_VEHICULO con un solo tipo", () => {
    const vars = ctx({ vehiculos: [auto, { ...auto, marca: "RENAULT" }] });
    expect(vars.TIPO_VEHICULO).toBe("AUTOMÓVIL");
  });

  it("TIPO_VEHICULO con tipos mixtos → VEHÍCULOS", () => {
    const vars = ctx({ vehiculos: [auto, moto] });
    expect(vars.TIPO_VEHICULO).toBe("VEHÍCULOS");
  });

  it("TIPO_VEHICULO_MIN para MOTOVEHÍCULO → 'moto vehículo'", () => {
    const vars = ctx({ vehiculos: [moto] });
    expect(vars.TIPO_VEHICULO_MIN).toBe("moto vehículo");
  });

  it("TIPO_VEHICULO_MIN para AUTOMÓVIL → 'vehículo'", () => {
    const vars = ctx({ vehiculos: [auto] });
    expect(vars.TIPO_VEHICULO_MIN).toBe("vehículo");
  });

  it("TIPO_VEHICULO_MIN con tipos mixtos → 'vehículos'", () => {
    const vars = ctx({ vehiculos: [auto, moto] });
    expect(vars.TIPO_VEHICULO_MIN).toBe("vehículos");
  });

  it("VEHICULOS_LISTA chasis aparece solo si está presente", () => {
    const sinChasis = { ...auto, chasis: undefined };
    const vars = ctx({ vehiculos: [sinChasis] });
    expect(vars.VEHICULOS_LISTA).not.toContain("Chasis");
  });
});

// ── 15. Extravars ─────────────────────────────────────────────────────────────

describe("extravars", () => {
  it("extravars se fusionan en vars", () => {
    const vars = ctx({ extravars: { MI_VAR: "valor_custom" } });
    expect(vars.MI_VAR).toBe("valor_custom");
  });

  it("extravars pueden sobreescribir vars existentes", () => {
    const vars = ctx({
      extravars: { PROTOCOLO_ACTA: "SOBREESCRITO" },
      protocolo: protocoloBase,
    });
    expect(vars.PROTOCOLO_ACTA).toBe("SOBREESCRITO");
  });
});

// ── 16. PARTES_F08_BLOQUE ─────────────────────────────────────────────────────

describe("PARTES_F08_BLOQUE", () => {
  it("vacío si no hay partes", () => {
    const vars = ctx();
    expect(vars.PARTES_F08_BLOQUE).toBe("");
  });

  it("parte única masculina: comienza con 'ha sido puesta en mi presencia por el señor'", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR", genero: "M" })] });
    expect(vars.PARTES_F08_BLOQUE).toMatch(/^ha sido puesta en mi presencia por el señor /);
  });

  it("parte única femenina: comienza con 'ha sido puesta en mi presencia por la señora'", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDORA", genero: "F" })] });
    expect(vars.PARTES_F08_BLOQUE).toMatch(/^ha sido puesta en mi presencia por la señora /);
  });

  it("nombre aparece en negrita+subrayado con estilos default", () => {
    const vars = ctx({ partes: [mkParte({ nombre: "CARLOS", apellido: "GARCIA", rol: "VENDEDOR" })] });
    expect(vars.PARTES_F08_BLOQUE).toContain("**__Carlos GARCIA__**");
  });

  it("sin marcadores en el nombre cuando nombresNegrita=false y nombresSubrayado=false", () => {
    const vars = ctx({
      partes:  [mkParte({ rol: "VENDEDOR" })],
      estilos: { nombresNegrita: false, nombresSubrayado: false },
    });
    // El nombre no lleva marcadores; el ROL sí lleva **ROL** (siempre)
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("por el señor Carlos GARCIA,");
    expect(vars.PARTES_F08_BLOQUE).not.toContain("**__");
  });

  it("solo negrita (sin subrayado)", () => {
    const vars = ctx({
      partes:  [mkParte({ rol: "VENDEDOR" })],
      estilos: { nombresNegrita: true, nombresSubrayado: false },
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("**Carlos GARCIA**");
    expect(vars.PARTES_F08_BLOQUE).not.toContain("__");
  });

  it("nombre uppercase con nombresFormato uppercase", () => {
    const vars = ctx({
      partes:  [mkParte({ rol: "VENDEDOR" })],
      estilos: { nombresFormato: "uppercase", nombresNegrita: false, nombresSubrayado: false },
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("CARLOS GARCIA");
  });

  it("apellido en titlecase con nombresFormato titlecase_both", () => {
    const vars = ctx({
      partes:  [mkParte({ rol: "VENDEDOR" })],
      estilos: { nombresFormato: "titlecase_both", nombresNegrita: false, nombresSubrayado: false },
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("Carlos Garcia");
  });

  it("ROL en negrita y uppercase: **VENDEDOR**", () => {
    const vars = ctx({ partes: [mkParte({ rol: "vendedor" })] });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("**VENDEDOR**");
  });

  it("cierre singular masculino: 'El compareciente manifiesta'", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR", genero: "M" })] });
    expect(vars.PARTES_F08_BLOQUE).toContain("El compareciente manifiesta");
  });

  it("cierre singular femenino: 'La compareciente manifiesta'", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDORA", genero: "F" })] });
    expect(vars.PARTES_F08_BLOQUE).toContain("La compareciente manifiesta");
  });

  it("cierre plural: 'Los comparecientes manifiestan'", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "VENDEDOR",  genero: "M", nombre: "CARLOS", apellido: "GARCIA" }),
        mkParte({ rol: "COMPRADOR", genero: "M", nombre: "PEDRO",  apellido: "LOPEZ"  }),
      ],
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("Los comparecientes manifiestan");
  });

  it("acta y libro incluidos en el cierre", () => {
    const vars = ctx({
      partes:    [mkParte({ rol: "VENDEDOR" })],
      protocolo: { nroActa: "99", nroLibro: "12" },
    });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("Acta número 99");
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("Libro de Requerimientos para Certificaciones de Firmas número 12");
  });

  it("segunda parte masculina: conector '; y el señor'", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "VENDEDOR",  genero: "M", nombre: "CARLOS", apellido: "GARCIA" }),
        mkParte({ rol: "COMPRADOR", genero: "M", nombre: "PEDRO",  apellido: "LOPEZ"  }),
      ],
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("; y el señor ");
  });

  it("segunda parte femenina: conector '; y la señora'", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "VENDEDOR",  genero: "M", nombre: "CARLOS", apellido: "GARCIA" }),
        mkParte({ rol: "COMPRADORA", genero: "F", nombre: "ANA",   apellido: "RODRIGUEZ" }),
      ],
    });
    expect(vars.PARTES_F08_BLOQUE).toContain("; y la señora ");
  });

  it("'el que' para M, 'la que' para F en la fórmula de firma", () => {
    const mVars = ctx({ partes: [mkParte({ rol: "VENDEDOR",  genero: "M" })] });
    const fVars = ctx({ partes: [mkParte({ rol: "VENDEDORA", genero: "F" })] });
    expect(mVars.PARTES_F08_BLOQUE).toContain("el que firma en su carácter de");
    expect(fVars.PARTES_F08_BLOQUE).toContain("la que firma en su carácter de");
  });

  it("'nacido' para M, 'nacida' para F con fechaNac", () => {
    const mVars = ctx({ partes: [mkParte({ rol: "VENDEDOR",  genero: "M", fechaNac: "1980-06-15" })] });
    const fVars = ctx({ partes: [mkParte({ rol: "VENDEDORA", genero: "F", fechaNac: "1980-06-15" })] });
    expect(sinTilde(mVars.PARTES_F08_BLOQUE)).toContain("nacido el 15 de junio de 1980");
    expect(sinTilde(fVars.PARTES_F08_BLOQUE)).toContain("nacida el 15 de junio de 1980");
  });

  it("CUIT formateado con puntos cuando está presente", () => {
    const vars = ctx({
      partes: [mkParte({ rol: "VENDEDOR", cuit: "20-27345678-4" })],
    });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("C.U.I.T./L. número 20-27.345.678-4");
  });

  it("sin CUIT: no aparece C.U.I.T. en el bloque", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR" })] });
    expect(vars.PARTES_F08_BLOQUE).not.toContain("C.U.I.T.");
  });

  it("estadoCivil incluido si existe", () => {
    const vars = ctx({
      partes: [mkParte({ rol: "VENDEDOR", estadoCivil: "casado" })],
    });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("quien manifiesta ser de estado civil casado");
  });

  it("sin estadoCivil: no aparece 'estado civil' en el bloque", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR" })] });
    expect(vars.PARTES_F08_BLOQUE).not.toContain("estado civil");
  });

  it("domicilio incluido si existe", () => {
    const vars = ctx({
      partes: [mkParte({ rol: "VENDEDOR", calle: "Av. España", numero: "500", localidad: "Mendoza" })],
    });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain("con domicilio en Av. España, 500, Mendoza, de ésta Provincia de Mendoza");
  });

  it("sin domicilio: no aparece 'con domicilio en' en el bloque", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR" })] });
    expect(vars.PARTES_F08_BLOQUE).not.toContain("con domicilio en");
  });

  it("nacionalidad concordada: argentina → argentino para M", () => {
    const vars = ctx({
      partes: [mkParte({ rol: "VENDEDOR", genero: "M", nacionalidad: "argentina" })],
    });
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toContain(", argentino,");
  });

  it("sin nacionalidad: no aparece coma extra de nationalidad", () => {
    const vars = ctx({ partes: [mkParte({ rol: "VENDEDOR", nacionalidad: undefined })] });
    // Debe ir directo a ", con Documento"
    expect(sinTilde(vars.PARTES_F08_BLOQUE)).toMatch(/\*\*, con Documento Nacional/);
  });

  // ── Ordenamiento F08 ──────────────────────────────────────────────────────

  it("ordenamiento: COMPRADOR en input primero → VENDEDOR primero en output", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "COMPRADOR", nombre: "ANA",    apellido: "RODRIGUEZ" }),
        mkParte({ rol: "VENDEDOR",  nombre: "CARLOS", apellido: "GARCIA"    }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    expect(bloque.indexOf("Carlos")).toBeLessThan(bloque.indexOf("Ana"));
  });

  it("CO-VENDEDOR aparece antes de COMPRADOR", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "COMPRADOR",  nombre: "ANA",    apellido: "RODRIGUEZ" }),
        mkParte({ rol: "CO-VENDEDOR", nombre: "PEDRO", apellido: "LOPEZ"     }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    expect(bloque.indexOf("Pedro")).toBeLessThan(bloque.indexOf("Ana"));
  });

  it("orden completo: VENDEDOR < CO-VENDEDOR < CÓNYUGE VENDEDOR < COMPRADOR", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "COMPRADOR",            nombre: "D", apellido: "D" }),
        mkParte({ rol: "CÓNYUGE DEL VENDEDOR", nombre: "C", apellido: "C" }),
        mkParte({ rol: "CO-VENDEDOR",           nombre: "B", apellido: "B" }),
        mkParte({ rol: "VENDEDOR",              nombre: "A", apellido: "A" }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    const posA = bloque.indexOf("**__A A__**");
    const posB = bloque.indexOf("**__B B__**");
    const posC = bloque.indexOf("**__C C__**");
    const posD = bloque.indexOf("**__D D__**");
    expect(posA).toBeLessThan(posB);
    expect(posB).toBeLessThan(posC);
    expect(posC).toBeLessThan(posD);
  });

  it("partes sin rol reconocido van al final", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "ROL_DESCONOCIDO", nombre: "ZORRO", apellido: "EXTRA" }),
        mkParte({ rol: "VENDEDOR",         nombre: "CARLOS", apellido: "GARCIA" }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    expect(bloque.indexOf("Carlos")).toBeLessThan(bloque.indexOf("Zorro"));
  });

  it("variante con acento en CÓNYUGE DEL COMPRADOR también se ordena", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "CÓNYUGE DEL COMPRADOR", nombre: "ANA",    apellido: "B" }),
        mkParte({ rol: "COMPRADOR",              nombre: "PEDRO",  apellido: "A" }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    // COMPRADOR (g:1,o:0) < CÓNYUGE DEL COMPRADOR (g:1,o:2)
    expect(bloque.indexOf("Pedro")).toBeLessThan(bloque.indexOf("Ana"));
  });

  it("CONYUGE sin tilde también es reconocido en el ordenamiento", () => {
    const vars = ctx({
      partes: [
        mkParte({ rol: "CONYUGE DEL VENDEDOR", nombre: "B", apellido: "B" }),
        mkParte({ rol: "VENDEDOR",              nombre: "A", apellido: "A" }),
      ],
    });
    const bloque = vars.PARTES_F08_BLOQUE;
    expect(bloque.indexOf("**__A A__**")).toBeLessThan(bloque.indexOf("**__B B__**"));
  });
});

// ── 17. sustituirVars ─────────────────────────────────────────────────────────

describe("sustituirVars", () => {
  it("reemplaza variable conocida", () => {
    expect(sustituirVars("Hola {{NOMBRE}}", { NOMBRE: "CARLOS" })).toBe("Hola CARLOS");
  });

  it("múltiples variables en un texto", () => {
    expect(sustituirVars("{{A}} y {{B}}", { A: "uno", B: "dos" })).toBe("uno y dos");
  });

  it("deja intacta variable desconocida", () => {
    expect(sustituirVars("{{NOMBRE}} {{DESCONOCIDA}}", { NOMBRE: "X" })).toBe("X {{DESCONOCIDA}}");
  });

  it("texto sin variables no cambia", () => {
    expect(sustituirVars("texto plano sin variables", {})).toBe("texto plano sin variables");
  });

  it("variable vacía elimina la coma doble resultante: 'A, , B' → 'A, B'", () => {
    expect(sustituirVars("A, {{VAR}}, B", { VAR: "" })).toBe("A, B");
  });

  it("variable vacía elimina 'coma espacio punto y coma': 'A, ; B' → 'A; B'", () => {
    expect(sustituirVars("A, {{VAR}}; B", { VAR: "" })).toBe("A; B");
  });

  it("variable vacía elimina paréntesis vacíos: '({{VAR}})' → ''", () => {
    expect(sustituirVars("({{VAR}})", { VAR: "" })).toBe("");
  });

  it("variable con valor preserva la puntuación", () => {
    expect(sustituirVars("DNI {{DNI}}, domicilio", { DNI: "27.345.678" })).toBe("DNI 27.345.678, domicilio");
  });

  it("variable undefined deja el placeholder", () => {
    expect(sustituirVars("{{EXISTE}} {{NO_EXISTE}}", { EXISTE: "ok" })).toBe("ok {{NO_EXISTE}}");
  });
});
