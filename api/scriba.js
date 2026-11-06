import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";
import mammoth from "mammoth";
import { buildVars, sustituirVars, contarClausulas } from "../src/utils/templateVars.js";
import { extraerDocumento } from "./vision.js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./_supabaseConfig.js";
import { exigirUsuario } from "./_auth.js";
import { avisarSinRepetir } from "./_telegram.js";
import { MODELOS } from "./_modelos.js";


import { DOCX_MIME } from "../src/utils/docxMime.js";
import { SYSTEM_PROMPT } from "./_scribaPrompt.js";
import { TEMPLATES_MAP, tools } from "./_scribaTools.js";
import { limpiarDatosCaptura, notaDatosCaptura, resolverDistribucion } from "./_capturaScriba.js";
export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // Solo usuarios logueados (gasta crédito de Anthropic). El token de la sesión también arma el
  // cliente de Supabase, así las consultas de las tools corren con los permisos (RLS) del usuario.
  const userToken = await exigirUsuario(req, res);
  if (!userToken) return;

  const { mensaje, mensajes_anteriores = [], contexto = null, registroId = null, documentos_adjuntos = [], datos_captura = null, captura_celular = false } = req.body || {};
  // Datos leídos de las fotos subidas desde el celular: viajan en cada pedido mientras estén pendientes de aplicar
  // (no se guardan en ningún lado del servidor). Se sanean porque vienen del navegador.
  const datosCaptura = captura_celular === true ? limpiarDatosCaptura(datos_captura) : null;
  // Lanzamiento gradual: quien no lo pide (hoy, todos menos el admin) ve exactamente las herramientas de siempre.
  const HERRAMIENTAS_CAPTURA = ["pedir_captura_celular", "distribuir_captura"];
  const herramientas = captura_celular === true ? tools : tools.filter(t => !HERRAMIENTAS_CAPTURA.includes(t.name));

  if (!mensaje?.trim()) {
    return res.status(400).json({ error: "Mensaje requerido" });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: "API key no configurada" });
  }

  // Una vuelta normal tarda 2-30 s (redactar un documento entero con thinking llega a ~30 s), y el
  // loop puede dar hasta 5 vueltas. El tope de la función es 300 s (vercel.json); el timeout por
  // llamada evita que una llamada colgada se coma todo ese margen.
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: 100_000, maxRetries: 1 });
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${userToken}` } },
  });

  const ahora = new Date();
  const fechaHoy = `${ahora.getDate().toString().padStart(2,"0")}/${(ahora.getMonth()+1).toString().padStart(2,"0")}/${ahora.getFullYear()}`;
  const horaHoy  = `${ahora.getUTCHours()-3 < 0 ? ahora.getUTCHours()+21 : ahora.getUTCHours()-3}:${ahora.getUTCMinutes().toString().padStart(2,"0")} (Argentina)`;
  const fechaNota = `\n\n[FECHA Y HORA ACTUAL: ${fechaHoy}, ${horaHoy}]`;

  const rolesCtx = contexto?.rolesPartes
    ? `\nRoles en este instrumento: ${contexto.rolesPartes.map((r,i) => r ? `PARTE_${i+1} = ${r}` : null).filter(Boolean).join(", ")}\nCuando el usuario identifique el rol de una persona (ej: "es el autorizado", "es la autorizante"), usá parte_index en completar_parte para posicionarla correctamente (0 = PARTE_1, 1 = PARTE_2, etc.). Esto reemplaza la búsqueda por DNI y posiciona a la persona exactamente donde corresponde.`
    : "";

  const camposExtraCtx = contexto?.camposExtra?.length
    ? `\n\n[CAMPOS DEL TEMPLATE]\nEste template tiene campos propios que NO son variables del sistema ni datos de partes — se completan con la herramienta 'completar_extravars', usando estos nombres EXACTOS:\n${contexto.camposExtra.map(c => `- ${c.name}${c.label ? ` (${c.label})` : ""}${c.required ? " [requerido]" : ""}`).join("\n")}\nCuando el escribano te dicte precio, seña, plazo, cláusulas u otro dato que corresponda a uno de estos campos, usá 'completar_extravars' — NUNCA 'modificar_documento' para esto.`
    : "";

  const clausulasCtx = contexto?.clausulasDisponibles?.length
    ? `\n\n[CLÁUSULAS DISPONIBLES]\nEste template tiene cláusulas opcionales que se activan o desactivan con la herramienta 'gestionar_clausulas', usando estos slugs EXACTOS:\n${contexto.clausulasDisponibles.map(c => `- ${c.slug} (${c.titulo})${c.descripcion ? ` — ${c.descripcion}` : ""}${c.activa ? " [ACTUALMENTE ACTIVA]" : ""}`).join("\n")}\nCuando el escribano pida sumar o sacar una de estas cláusulas, usá 'gestionar_clausulas' — NUNCA 'modificar_documento' para esto. No inventes slugs que no estén en esta lista.`
    : "";

  const contextoNote = contexto
    ? `\n\n[DOCUMENTO ACTIVO EN EL EDITOR]\nTipo de acto: ${contexto.tipoActo}\nPartes: ${contexto.partes || "no especificadas"}\nFecha del acto: ${contexto.fecha}\nEstado: ${contexto.estado}${rolesCtx}${camposExtraCtx}${clausulasCtx}${contexto.templateContenido ? `\n\nCONTENIDO ACTUAL DEL DOCUMENTO (con variables — ESTE ES EL ÚNICO DOCUMENTO QUE PODÉS MODIFICAR):\n${contexto.templateContenido}\n\nATENCIÓN: Si te piden modificar el documento, usá ESTE texto como base. No generes un instrumento diferente. No cambies el tipo de acto.` : ""}\n\nEl escribano está trabajando en este documento ahora mismo.`
    : "";

  const adjuntosNote = documentos_adjuntos.length
    ? `\n\n[ARCHIVOS ADJUNTOS EN ESTE MENSAJE]\nEl escribano adjuntó ${documentos_adjuntos.length} archivo(s), numerados [Adjunto 0], [Adjunto 1], etc. en el mensaje. Pueden ser CUALQUIER cosa — documento de identidad (DNI en cualquier formato, pasaporte, licencia, partida), de un vehículo (tarjeta verde, título, física o digital), o un documento de referencia libre en PDF, Word (.docx) o imagen (boleto anterior, contrato, plano, ticket, recibo, cualquier otro papel con información útil). Mirá cada uno y decidí:\n- ¿Parece identidad o vehículo? → llamá a 'extraer_documento' con los índices correspondientes (juntos si son caras del mismo documento) ANTES de intentar leerlo vos mismo — es más preciso.\n- ¿Es otra cosa con información útil? → leelo vos directamente y usalo como contexto para redactar, comparar o responder.\n- ¿Genuinamente no podés determinar qué es o para qué lo quiere el escribano? → preguntale en vez de adivinar.`
    : "";

  async function construirUltimoMensaje() {
    if (!documentos_adjuntos.length) return { role: "user", content: mensaje };
    const bloques = await Promise.all(documentos_adjuntos.map(async (d, i) => {
      const esPdf = d.mediaType === "application/pdf";
      const esDocx = d.mediaType === DOCX_MIME;
      let bloque, etiqueta;
      if (esPdf) {
        bloque = { type: "document", source: { type: "base64", media_type: "application/pdf", data: d.data }, title: d.nombre || undefined };
        etiqueta = "documento.pdf";
      } else if (esDocx) {
        let texto;
        try {
          texto = (await mammoth.extractRawText({ buffer: Buffer.from(d.data, "base64") })).value;
        } catch (e) {
          texto = `[No se pudo extraer el texto de este .docx: ${e.message}]`;
        }
        bloque = { type: "document", source: { type: "text", media_type: "text/plain", data: texto }, title: d.nombre || undefined };
        etiqueta = "documento.docx";
      } else {
        bloque = { type: "image", source: { type: "base64", media_type: d.mediaType, data: d.data } };
        etiqueta = "imagen";
      }
      return [{ type: "text", text: `[Adjunto ${i}: ${d.nombre || etiqueta}]` }, bloque];
    }));
    return {
      role: "user",
      content: [
        ...bloques.flat(),
        { type: "text", text: mensaje || "Mirá los archivos adjuntos y decidí qué hacer con ellos." },
      ],
    };
  }
  const ultimoMensaje = await construirUltimoMensaje();

  let messages = [
    ...mensajes_anteriores.map(m => ({ role: m.role, content: m.content })),
    ultimoMensaje,
  ];

  async function ejecutarTool(name, input) {
    if (name === "buscar_personas") {
      function buildPersonasQuery(withRegistro) {
        let q = sb.from("personas")
          .select("apellido, nombre, tipo, genero, tipo_doc, nro_doc, cuit, fecha_nac, estado_civil, nacionalidad, calle, numero, piso, dpto, localidad, departamento, representaciones")
          .limit(8);
        if (withRegistro && registroId) q = q.eq("registro_id", String(registroId));
        if (input.nro_doc) {
          const digits = input.nro_doc.replace(/\D/g, "");
          q = q.ilike("nro_doc", `%${digits}%`);
        } else if (input.nombre) {
          const partes = input.nombre.trim().split(/\s+/);
          const conds = partes.flatMap(p => [`apellido.ilike.%${p}%`, `nombre.ilike.%${p}%`]).join(",");
          q = q.or(conds);
        }
        return q;
      }

      const { data, error } = await buildPersonasQuery(true);
      if (error) return { error: error.message };
      if (data?.length > 0) return { total: data.length, personas: data };

      // fallback sin filtro de registro por si registroId no coincide
      const { data: d2, error: e2 } = await buildPersonasQuery(false);
      if (e2) return { error: e2.message };
      return { total: d2?.length || 0, personas: d2 || [] };
    }
    if (name === "buscar_documentos") {
      let q = sb.from("documentos")
        .select("id, titulo, tipo_acto, estado, created_at, partes")
        .order("updated_at", { ascending: false })
        .limit(10);
      if (registroId) q = q.eq("registro_id", registroId);
      if (input.tipo_acto) q = q.eq("tipo_acto", input.tipo_acto);
      if (input.estado)    q = q.eq("estado", input.estado);
      if (input.titulo)    q = q.ilike("titulo", `%${input.titulo}%`);
      const { data, error } = await q;
      if (error) return { error: error.message };
      return { total: data?.length || 0, documentos: data || [] };
    }
    if (name === "leer_documento") {
      let query = sb.from("documentos").select("id, titulo, tipo_acto, contenido, partes, template_id").eq("id", input.documento_id);
      if (registroId) query = query.eq("registro_id", registroId);
      const { data, error } = await query.maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "No encontré ese documento (verificá el id o puede que no tengas acceso)." };

      const c = data.contenido || {};

      // Documento libre (sin template_id): el cuerpo vive en el propio jsonb, no en 'templates'
      if (!data.template_id) {
        if (!c.templateContenidoLibre) return { error: "No pude reconstruir el texto: documento libre sin contenido guardado.", titulo: data.titulo };
        const varsLibre = buildVars({
          partes:      (data.partes?.length ? data.partes : c.partes) || [],
          escribano:   c.escribano   || {},
          fecha:       c.fecha       || {},
          protocolo:   c.protocolo   || {},
          instrumento: c.instrumento || {},
          extravars:   c.extravarsLibre || {},
        });
        const textoLibre = sustituirVars(c.templateContenidoLibre, varsLibre)
          .replace(/\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~/g, "$1$2$3");
        return { titulo: data.titulo, tipo_acto: data.tipo_acto, contenido: textoLibre.slice(0, 30000) };
      }

      const { data: tpl, error: tplError } = await sb.from("templates").select("contenido").eq("id", data.template_id).maybeSingle();
      if (tplError || !tpl?.contenido) return { error: "No pude reconstruir el texto: falta la plantilla asociada.", titulo: data.titulo };

      const vars = buildVars({
        partes:      (data.partes?.length ? data.partes : c.partes) || [],
        escribano:   c.escribano   || {},
        fecha:       c.fecha       || {},
        protocolo:   c.protocolo   || {},
        instrumento: c.instrumento || {},
      });
      const textoPlano = sustituirVars(tpl.contenido, vars)
        .replace(/\*\*(.+?)\*\*|__(.+?)__|~~(.+?)~~/g, "$1$2$3");
      return { titulo: data.titulo, tipo_acto: data.tipo_acto, contenido: textoPlano.slice(0, 30000) };
    }
    if (name === "leer_template_base") {
      const template = TEMPLATES_MAP[input.slug];
      if (!template) return { error: "Slug no reconocido." };
      const { data: tpl, error } = await sb.from("templates").select("contenido, variables_json").eq("id", template.id).maybeSingle();
      if (error) return { error: error.message };
      if (!tpl?.contenido) return { error: "Ese template no tiene contenido cargado." };
      return {
        slug: input.slug,
        nombre: template.nombre,
        contenido: tpl.contenido.slice(0, 30000),
        variables_json: tpl.variables_json || [],
        clausulas_aprox: contarClausulas(tpl.contenido),
      };
    }
    if (name === "extraer_documento") {
      const imagenes = (input.indices || [])
        .map(i => documentos_adjuntos[i])
        .filter(Boolean)
        .filter(d => d.mediaType !== DOCX_MIME) // un .docx no es analizable como documento de identidad/vehículo
        .map(d => ({ data: d.data, mediaType: d.mediaType }));
      if (!imagenes.length) return { error: "No encontré esos adjuntos como imágenes o PDFs para analizar." };
      try {
        return await extraerDocumento(imagenes);
      } catch (e) {
        return { error: e.message };
      }
    }
    if (name === "validar_cuit") {
      const digits = (input.cuit || "").replace(/\D/g, "");
      if (digits.length !== 11) {
        return { valido: false, motivo: `Debe tener 11 dígitos (2 de prefijo + 8 de DNI + 1 verificador); tiene ${digits.length}.` };
      }
      const nums = digits.split("").map(Number);
      const pesos = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2];
      const suma = nums.slice(0, 10).reduce((acc, n, i) => acc + n * pesos[i], 0);
      const resto = suma % 11;
      let calculado = 11 - resto;
      if (calculado === 11) calculado = 0;
      const cuitNormalizado = `${digits.slice(0, 2)}-${digits.slice(2, 10)}-${digits.slice(10)}`;
      if (calculado === 10) {
        return { valido: false, motivo: "El algoritmo da dígito verificador 10, que no es válido en ningún CUIT real — el número tipeado tiene un error.", cuit_normalizado: cuitNormalizado };
      }
      return {
        valido: calculado === nums[10],
        digito_calculado: calculado,
        digito_declarado: nums[10],
        cuit_normalizado: cuitNormalizado,
      };
    }
    if (name === "validar_limites_inmueble") {
      const lados = Array.isArray(input.lados) ? input.lados : [];
      const problemas = [];

      if (lados.length < 3) {
        problemas.push(`Solo hay ${lados.length} lado(s) descripto(s) — un perímetro cerrado necesita al menos 3.`);
      }

      lados.forEach((l, i) => {
        const n = i + 1;
        if (!l.rumbo || !String(l.rumbo).trim()) problemas.push(`Lado ${n}: falta el rumbo/orientación.`);
        const metros = Number(l.metros);
        if (l.metros == null || isNaN(metros) || metros <= 0) {
          problemas.push(`Lado ${n}: la distancia "${l.metros}" no es un número válido mayor a cero.`);
        }
        if (!l.lindero || !String(l.lindero).trim()) problemas.push(`Lado ${n}: falta con quién/qué linda.`);
      });

      const conteoRumbos = {};
      lados.forEach(l => {
        const r = String(l.rumbo || "").trim().toLowerCase();
        if (r) conteoRumbos[r] = (conteoRumbos[r] || 0) + 1;
      });
      const repetidos = Object.entries(conteoRumbos).filter(([, c]) => c > 1).map(([r]) => r);

      const perimetroTotal = lados.reduce((acc, l) => acc + (Number(l.metros) || 0), 0);

      return {
        completo: problemas.length === 0,
        problemas,
        observacion_rumbos_repetidos: repetidos.length
          ? `Rumbos que aparecen más de una vez: ${repetidos.join(", ")} — puede ser normal en un lote irregular, pero conviene confirmarlo con la escribana.`
          : null,
        cantidad_lados: lados.length,
        perimetro_total_metros: Math.round(perimetroTotal * 100) / 100,
        nota: "Este chequeo verifica completitud y coherencia estructural, NO cierre geométrico exacto — eso lo garantiza el plano de mensura del agrimensor.",
      };
    }
    if (name === "distribuir_captura") {
      // Solo llega acá si va junto a otras herramientas o con un error: si es válida y va sola, se resuelve más abajo.
      const r = resolverDistribucion(datosCaptura, input);
      return r.error ? { error: r.error } : { ok: true, nota: "Preparado: el escribano lo confirma con el botón 'Aplicar todo'." };
    }
    if (name === "pedir_captura_celular") return { ok: true, nota: "Se muestra el código QR al escribano." };
    if (name === "calcular_edad") {
      const parsearFecha = (str) => {
        const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(str || "").trim());
        if (!m) return null;
        const dia = Number(m[1]), mes = Number(m[2]), anio = Number(m[3]);
        const d = new Date(anio, mes - 1, dia);
        if (d.getFullYear() !== anio || d.getMonth() !== mes - 1 || d.getDate() !== dia) return null;
        return d;
      };
      const fmt = (d) => `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;

      const nacDate = parsearFecha(input.fecha_nacimiento);
      if (!nacDate) {
        return { error: `"${input.fecha_nacimiento}" no es una fecha de calendario válida (formato esperado dd/mm/aaaa).` };
      }
      let refDate;
      if (input.fecha_referencia) {
        refDate = parsearFecha(input.fecha_referencia);
        if (!refDate) return { error: `"${input.fecha_referencia}" no es una fecha de calendario válida (formato esperado dd/mm/aaaa).` };
      } else {
        refDate = new Date();
      }
      if (nacDate > refDate) {
        return { error: "La fecha de nacimiento es posterior a la fecha de referencia — revisar los datos, algo está mal cargado." };
      }
      let edad = refDate.getFullYear() - nacDate.getFullYear();
      const huboCumple = (refDate.getMonth() > nacDate.getMonth()) ||
        (refDate.getMonth() === nacDate.getMonth() && refDate.getDate() >= nacDate.getDate());
      if (!huboCumple) edad -= 1;

      return {
        edad_anios: edad,
        es_menor_de_edad: edad < 18,
        fecha_nacimiento_normalizada: fmt(nacDate),
        fecha_referencia_usada: fmt(refDate),
        nota: edad < 18 ? "Persona menor de edad a la fecha de referencia — verificar representación legal según corresponda al tipo de acto." : null,
      };
    }
    return { error: "Herramienta desconocida" };
  }

  try {
    for (let i = 0; i < 5; i++) {
      const response = await client.messages.create({
        model: MODELOS.scriba,
        max_tokens: 8192,
        thinking: { type: "adaptive" },
        system: [
          {
            type: "text",
            text: SYSTEM_PROMPT,
            cache_control: { type: "ephemeral" },
          },
          {
            type: "text",
            text: fechaNota + contextoNote + adjuntosNote + notaDatosCaptura(datosCaptura),
          },
        ],
        tools: herramientas,
        messages,
      });

      if (response.stop_reason === "end_turn") {
        const text = response.content.find(c => c.type === "text");
        return res.status(200).json({ respuesta: text?.text || "" });
      }

      if (response.stop_reason === "tool_use") {
        const toolUses = response.content.filter(c => c.type === "tool_use");

        // Si solo hay abrir_editor o insertar_en_documento, retornar ya
        const insertarDoc = toolUses.find(t => t.name === "insertar_en_documento");
        if (insertarDoc && toolUses.length === 1) {
          const { texto, mensaje: msg } = insertarDoc.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "insertar_texto", texto },
          });
        }

        const modificarDoc = toolUses.find(t => t.name === "modificar_documento");
        if (modificarDoc && toolUses.length === 1) {
          const { contenido, mensaje: msg } = modificarDoc.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "modificar_documento", contenido },
          });
        }

        const completarParte = toolUses.find(t => t.name === "completar_parte");
        if (completarParte && toolUses.length === 1) {
          const { datos, parte_index, mensaje: msg } = completarParte.input;
          const datosConIdx = parte_index !== undefined ? { ...datos, parte_index } : datos;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "completar_parte", datos: datosConIdx },
          });
        }

        const pedirCaptura = toolUses.find(t => t.name === "pedir_captura_celular");
        if (pedirCaptura && toolUses.length === 1) {
          const { modo, rol, mensaje: msg } = pedirCaptura.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "captura_celular", modo: ["libre", "parte", "vehiculos"].includes(modo) ? modo : "libre", rol: rol || null },
          });
        }

        const distribuirCaptura = toolUses.find(t => t.name === "distribuir_captura");
        if (distribuirCaptura && toolUses.length === 1) {
          const r = resolverDistribucion(datosCaptura, distribuirCaptura.input);
          if (!r.error) {
            return res.status(200).json({ respuesta: distribuirCaptura.input.mensaje, accion: r.accion });
          }
          // Con error cae al camino general de abajo: el modelo recibe el error y corrige los números.
        }

        const completarVehiculo = toolUses.find(t => t.name === "completar_vehiculo");
        if (completarVehiculo && toolUses.length === 1) {
          const { vehiculo, titular, mensaje: msg } = completarVehiculo.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "completar_vehiculo", vehiculo, titular },
          });
        }

        const completarExtravars = toolUses.find(t => t.name === "completar_extravars");
        if (completarExtravars && toolUses.length === 1) {
          const { valores, mensaje: msg } = completarExtravars.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "completar_extravars", valores },
          });
        }

        const gestionarClausulas = toolUses.find(t => t.name === "gestionar_clausulas");
        if (gestionarClausulas && toolUses.length === 1) {
          const { activar, desactivar, mensaje: msg } = gestionarClausulas.input;
          return res.status(200).json({
            respuesta: msg,
            accion: { tipo: "gestionar_clausulas", activar: activar || [], desactivar: desactivar || [] },
          });
        }

        const crearDocumentoLibre = toolUses.find(t => t.name === "crear_documento_libre");
        if (crearDocumentoLibre && toolUses.length === 1) {
          const { contenido, campos_libres, mensaje: msg, partes, fecha } = crearDocumentoLibre.input;
          return res.status(200).json({
            respuesta: msg,
            accion: {
              tipo: "crear_documento_libre",
              contenido,
              campos_libres: campos_libres || [],
              partes: partes?.length ? partes : null,
              fecha: fecha || null,
            },
          });
        }

        const abrirEditor = toolUses.find(t => t.name === "abrir_editor");
        const otrasHerramientas = toolUses.filter(t => t.name !== "abrir_editor" && t.name !== "insertar_en_documento");

        if (abrirEditor && otrasHerramientas.length === 0) {
          const { slug, mensaje: msg, partes, fecha } = abrirEditor.input;
          const template = TEMPLATES_MAP[slug];
          return res.status(200).json({
            respuesta: msg,
            accion: {
              tipo: "abrir_editor",
              slug,
              templateId: template?.id || null,
              nombre: template?.nombre || slug,
              partes: partes?.length ? partes : null,
              fecha: fecha || null,
            },
          });
        }

        // Ejecutar todas las herramientas excepto abrir_editor
        // (si Claude llama ambas en el mismo turno, ejecutamos las DB tools primero
        //  y le devolvemos los resultados para que llame abrir_editor en el siguiente turno)
        const toolsAEjecutar = otrasHerramientas.length > 0 ? otrasHerramientas : toolUses;
        const toolResults = await Promise.all(
          toolsAEjecutar.map(async t => ({
            type: "tool_result",
            tool_use_id: t.id,
            content: JSON.stringify(await ejecutarTool(t.name, t.input)),
          }))
        );

        // Si había abrir_editor junto a otras tools, agregar resultado vacío para que el
        // mensaje de assistant sea válido (Anthropic requiere tool_result por cada tool_use)
        if (abrirEditor && otrasHerramientas.length > 0) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: abrirEditor.id,
            content: JSON.stringify({ pendiente: true }),
          });
        }

        messages = [
          ...messages,
          { role: "assistant", content: response.content },
          { role: "user",      content: toolResults },
        ];
        continue;
      }

      // Los modelos 5.5 pueden cortar por sus filtros de seguridad (stop_reason "refusal"): sin esto
      // el usuario recibiría una respuesta vacía sin saber por qué.
      if (response.stop_reason === "refusal") {
        return res.status(200).json({ respuesta: "No puedo ayudar con ese pedido. Reformulalo o probá con otra consulta." });
      }
      const text = response.content.find(c => c.type === "text");
      return res.status(200).json({ respuesta: text?.text || "" });
    }

    return res.status(200).json({ respuesta: "No pude completar la consulta. Intentá de nuevo." });
  } catch (e) {
    console.error("Scriba error:", e);
    // Sin crédito en Anthropic Scriba queda caída para todos: es lo único que merece aviso inmediato.
    if (/credit balance/i.test(e.message || "")) {
      await avisarSinRepetir("scriba-credito", "🔴 Scriba SIN CRÉDITO de Anthropic. Recargá en console.anthropic.com → Plans & Billing. Hasta entonces no responde a nadie.");
    } else {
      await avisarSinRepetir("scriba-error", `⚠️ Scriba falló: ${String(e.message).slice(0, 200)}`);
    }
    return res.status(500).json({ error: e.message });
  }
}
