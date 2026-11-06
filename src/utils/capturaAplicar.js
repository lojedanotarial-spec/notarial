// Aplicar al documento abierto lo que Scriba distribuyó desde las fotos del celular ("Aplicar todo").
// Misma lógica que los eventos `scriba:completar_parte` y `scriba:completar_vehiculo` de EditorScreen (se copió a
// propósito para no tocar esos manejadores), pero como funciones puras para poder cargar TODO en un solo paso y
// regenerar el documento una sola vez. Spec: specs/captura-documentos-celular/.

const soloDigitos = (s) => String(s || "").replace(/\D/g, "");

// Suma una persona a las partes: si ya está (mismo DNI) actualiza rol y datos; si la única parte está vacía, la ocupa.
export function agregarPersonaAPartes(prev, d, parteVacia) {
  const dniNuevo = soloDigitos(d.nro_doc);
  const nuevaParte = {
    ...parteVacia(),
    apellido:     d.apellido     || "",
    nombre:       d.nombre       || "",
    genero:       d.genero       || "",
    nacionalidad: d.nacionalidad || "",
    tipoDoc:      d.tipo_doc     || "DNI",
    nroDoc:       dniNuevo,
    cuit:         d.cuit         || "",
    fechaNac:     d.fecha_nac    || "",
    estadoCivil:  d.estado_civil || "",
    calle:        d.calle        || "",
    numero:       d.numero       || "",
    piso:         d.piso         || "",
    dpto:         d.dpto         || "",
    barrio:       d.barrio       || "",
    manzana:      d.manzana      || "",
    casa:         d.casa         || "",
    localidad:    d.localidad    || "",
    provincia:    d.provincia    || "",
    pais:         d.pais         || "",
    departamento: d.departamento || "Ciudad",
    rol:          d.rol ? String(d.rol).toUpperCase() : "",
    representaciones: [],
  };
  const idx = dniNuevo ? prev.findIndex((p) => p.nroDoc === dniNuevo) : -1;
  if (idx >= 0) {
    const actualizada = { ...prev[idx] };
    if (d.rol)          actualizada.rol         = String(d.rol).toUpperCase();
    if (d.estado_civil) actualizada.estadoCivil = d.estado_civil;
    if (d.apellido)     actualizada.apellido    = d.apellido;
    if (d.nombre)       actualizada.nombre      = d.nombre;
    if (d.cuit)         actualizada.cuit        = d.cuit;
    if (d.calle)        actualizada.calle       = d.calle;
    const out = [...prev];
    out[idx] = actualizada;
    return out;
  }
  const tieneParcial = prev.length === 1 && !prev[0].apellido && !prev[0].nroDoc;
  return tieneParcial ? [nuevaParte] : [...prev, nuevaParte];
}

// Suma un vehículo: si ya existe el mismo dominio lo actualiza; si no, lo agrega.
export function agregarVehiculo(prev, v, nuevoId = () => Date.now() + Math.random()) {
  const idx = v.dominio ? prev.findIndex((x) => x.dominio === v.dominio) : -1;
  if (idx >= 0) {
    const out = [...prev];
    out[idx] = { ...out[idx], ...v };
    return out;
  }
  return [...prev, { id: nuevoId(), tipo_vehiculo: "VEHÍCULO", ...v }];
}

export function aplicarCapturaAPartes(prev, personas, parteVacia) {
  return (personas || []).reduce((acc, p) => agregarPersonaAPartes(acc, p, parteVacia), prev);
}

export function aplicarCapturaAVehiculos(prev, vehiculos) {
  return (vehiculos || []).reduce((acc, v) => agregarVehiculo(acc, v), prev);
}
