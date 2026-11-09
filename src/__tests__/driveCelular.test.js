// Subir documentación al expediente desde el celular: lógica pura (api/_driveCelular.js, src/utils/driveCliente.js).
// Spec: specs/documentacion-celular-expediente/. Cubre T3.1 y T3.2.
import { describe, it, expect } from "vitest";
import {
  SESION_VENCE_MS, GRACIA_CONFIRMAR_MS, LIMPIEZA_SESIONES_MS,
  calcularVencimientoSesion, motivoSesionInvalida, sesionVigente, urlSesion, puedeQuitar, resumenSesionParaCelular,
  vencimientoLimpieza,
} from "../../api/_driveCelular.js";
import { ACCIONES_AUDITORIA, armarAuditoria } from "../../api/_drive.js";
import { nombreFotoCamara } from "../utils/driveCliente.js";

const T0 = Date.UTC(2026, 10, 9, 15, 0, 0);
const MIN = 60_000;
const sesion = (extra = {}) => ({ id: "s1", expediente_id: "e1", registro_numero: "9876", usuario_id: "u1", creada_en: new Date(T0).toISOString(), expira_en: new Date(T0 + 30 * MIN).toISOString(), cerrada_en: null, ...extra });

describe("vigencia de la sesión (30 minutos)", () => {
  it("vence a los 30 minutos de generada", () => {
    expect(SESION_VENCE_MS).toBe(30 * MIN);
    expect(new Date(calcularVencimientoSesion(T0)).getTime()).toBe(T0 + 30 * MIN);
  });
  it("sirve hasta el último instante y deja de servir al vencer", () => {
    expect(sesionVigente(sesion(), T0 + 1)).toBe(true);
    expect(sesionVigente(sesion(), T0 + 30 * MIN - 1)).toBe(true);
    expect(sesionVigente(sesion(), T0 + 30 * MIN)).toBe(false);
    expect(motivoSesionInvalida(sesion(), T0 + 31 * MIN)).toBe("vencida");
    expect(motivoSesionInvalida(sesion(), T0 + 1)).toBe(null);
  });
  it("cerrada desde la compu o inexistente", () => {
    expect(motivoSesionInvalida(sesion({ cerrada_en: new Date(T0 + MIN).toISOString() }), T0 + 2 * MIN)).toBe("cerrada");
    expect(sesionVigente(sesion({ cerrada_en: new Date(T0).toISOString() }), T0 + 1)).toBe(false);
    expect(motivoSesionInvalida(null, T0)).toBe("inexistente");
    expect(motivoSesionInvalida(undefined, T0)).toBe("inexistente");
  });
  it("cerrada pesa más que vencida (es lo que más le sirve a quien está en el celular)", () => {
    const s = sesion({ cerrada_en: new Date(T0 + MIN).toISOString() });
    expect(motivoSesionInvalida(s, T0 + 60 * MIN)).toBe("cerrada");
  });
});

describe("gracia para confirmar una subida que ya empezó", () => {
  it("la gracia es de 5 minutos y solo vale para confirmar", () => {
    expect(GRACIA_CONFIRMAR_MS).toBe(5 * MIN);
    const vencida = T0 + 32 * MIN;
    expect(motivoSesionInvalida(sesion(), vencida)).toBe("vencida");
    expect(motivoSesionInvalida(sesion(), vencida, { paraConfirmar: true })).toBe(null);
    expect(motivoSesionInvalida(sesion(), T0 + 35 * MIN - 1, { paraConfirmar: true })).toBe(null);
    expect(motivoSesionInvalida(sesion(), T0 + 35 * MIN, { paraConfirmar: true })).toBe("vencida");
  });
  it("la gracia NO revive una sesión cerrada", () => {
    const s = sesion({ cerrada_en: new Date(T0 + MIN).toISOString() });
    expect(motivoSesionInvalida(s, T0 + 2 * MIN, { paraConfirmar: true })).toBe("cerrada");
  });
});

describe("URL del QR", () => {
  it("arma la dirección de la página del celular", () => {
    expect(urlSesion("https://notarial.lat", "abc_DEF-123")).toBe("https://notarial.lat/s/abc_DEF-123");
  });
});

describe("qué puede quitar el celular", () => {
  const archivo = (extra = {}) => ({ id: "a1", expediente_id: "e1", sesion_id: "s1", borrado_en: null, ...extra });
  it("solo lo subido en esa misma sesión y expediente, que no esté ya borrado", () => {
    expect(puedeQuitar(archivo(), sesion())).toBe(true);
    expect(puedeQuitar(archivo({ sesion_id: "otra" }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ sesion_id: null }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ expediente_id: "e2" }), sesion())).toBe(false);
    expect(puedeQuitar(archivo({ borrado_en: new Date(T0).toISOString() }), sesion())).toBe(false);
    expect(puedeQuitar(null, sesion())).toBe(false);
    expect(puedeQuitar(archivo(), null)).toBe(false);
  });
});

describe("lo que ve el celular", () => {
  const archivos = [
    { id: "a1", nombre: "Foto 1.jpg", tamano: 3000, mime_type: "image/jpeg", sesion_id: "s1", borrado_en: null, drive_file_id: "SECRETO-DRIVE", subido_por: "u1", expediente_id: "e1", identificacion: "pendiente" },
    { id: "a2", nombre: "Ajeno.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: "otra", borrado_en: null, drive_file_id: "x", subido_por: "u2", expediente_id: "e1" },
    { id: "a3", nombre: "Quitado.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: "s1", borrado_en: "2026-11-09T15:05:00Z", drive_file_id: "y", expediente_id: "e1" },
    { id: "a4", nombre: "Previo.jpg", tamano: 10, mime_type: "image/jpeg", sesion_id: null, borrado_en: null, drive_file_id: "z", expediente_id: "e1" },
  ];
  it("solo los archivos de SU sesión, sin los quitados, y con los campos justos", () => {
    const r = resumenSesionParaCelular(sesion(), { nombre: "Compraventa García", registro_id: "9876" }, archivos, T0 + MIN);
    expect(r).toMatchObject({ vigente: true, motivo: null, expediente_nombre: "Compraventa García" });
    expect(r.archivos.map((a) => a.id)).toEqual(["a1"]);
    expect(Object.keys(r.archivos[0]).sort()).toEqual(["id", "mime_type", "nombre", "tamano"]);
  });
  it("no expone el registro, el usuario, el id de Drive ni nada interno", () => {
    const r = resumenSesionParaCelular(sesion(), { nombre: "X", registro_id: "9876" }, archivos, T0 + MIN);
    expect(JSON.stringify(r)).not.toMatch(/SECRETO-DRIVE|9876|u1|u2|drive_file_id|registro|usuario|e1/);
  });
  it("vencida o cerrada: informa el motivo y no lista archivos", () => {
    const v = resumenSesionParaCelular(sesion(), { nombre: "X" }, archivos, T0 + 40 * MIN);
    expect(v).toMatchObject({ vigente: false, motivo: "vencida", archivos: [] });
    const c = resumenSesionParaCelular(sesion({ cerrada_en: "2026-11-09T15:01:00Z" }), { nombre: "X" }, archivos, T0 + 2 * MIN);
    expect(c).toMatchObject({ vigente: false, motivo: "cerrada", archivos: [] });
  });
  it("inexistente: nada que mostrar", () => {
    expect(resumenSesionParaCelular(null, null, [], T0)).toEqual({ vigente: false, motivo: "inexistente", expediente_nombre: null, expira_en: null, archivos: [] });
  });
});

describe("limpieza de sesiones viejas", () => {
  it("se borran las de más de 7 días", () => {
    expect(LIMPIEZA_SESIONES_MS).toBe(7 * 24 * 3600 * 1000);
    expect(new Date(vencimientoLimpieza(T0)).getTime()).toBe(T0 - 7 * 24 * 3600 * 1000);
  });
});

describe("auditoría de la subida por celular", () => {
  it("las acciones nuevas existen y se pueden armar", () => {
    for (const a of ["celular_abrir", "celular_cerrar", "renombrar"]) {
      expect(ACCIONES_AUDITORIA).toContain(a);
      expect(() => armarAuditoria({ registro: "9876", accion: a })).not.toThrow();
    }
  });
});

describe("nombre de las fotos de la cámara (mientras no haya identificación automática)", () => {
  const f = new Date(2026, 10, 9, 15, 30, 1); // 9/11/2026 15:30:01 hora local
  it("lleva la fecha y la hora", () => {
    expect(nombreFotoCamara(f)).toBe("Foto 09-11-2026 15.30.01.jpg");
    expect(nombreFotoCamara(new Date(2026, 0, 5, 9, 4, 7))).toBe("Foto 05-01-2026 09.04.07.jpg");
  });
  it("dos fotos en el mismo segundo no chocan", () => {
    expect(nombreFotoCamara(f, 1)).toBe("Foto 09-11-2026 15.30.01.jpg");
    expect(nombreFotoCamara(f, 2)).toBe("Foto 09-11-2026 15.30.01 (2).jpg");
    expect(nombreFotoCamara(f, 3)).toBe("Foto 09-11-2026 15.30.01 (3).jpg");
  });
  it("sin caracteres que Drive o Windows rechacen", () => {
    expect(nombreFotoCamara(f, 2)).not.toMatch(/[\\/:*?"<>|]/);
  });
});
