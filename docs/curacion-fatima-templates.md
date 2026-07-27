# Para Fátima — qué actos priorizar en Notarial

## Por qué te pasamos esto

Notarial hoy puede armar **51 tipos de actos** (compraventas, poderes, sucesiones básicas, actas, certificaciones, etc.). Esos 51 salieron del formulario de fichas que en su momento nos pasaste. Pero ese formulario tenía muchas más — **563 en total** — y la mayoría todavía no están cargadas en el sistema.

El problema es que ese formulario es un tratado que cubre casi todo lo que existe en el derecho notarial, no un ranking de lo que realmente hacés en el día a día. Antes de ponernos a construir actos nuevos, necesitamos que nos digas **cuáles de estos usás de verdad** — así construimos primero lo que te resuelve algo real, y no lo que suena importante en la teoría pero nunca se usa.

## Cómo marcar cada uno

Para cada grupo, poné una de estas cuatro:

- **Frecuente** — te aparece seguido, sería un alivio tenerlo en el sistema
- **A veces** — cae de vez en cuando, útil pero no urgente
- **Rara vez** — hace mucho no te toca, o casi nunca
- **Nunca** — no es parte de tu práctica, ni hace falta

No hace falta que sepas los nombres técnicos exactos — te dejamos 2-3 ejemplos de lo que entraría en cada grupo para que reconozcas de qué se trata.

---

## Grupo 1: actos que hoy el sistema NO tiene (ninguna variante)

### Inmuebles y propiedad

| Marcá | Grupo | Ejemplos |
|---|---|---|
| ⬜ | **Barrios cerrados / countries / clubes de campo** (propiedad horizontal especial) | reglamentos de barrios privados, adecuación de countries existentes |
| ⬜ | **Reglamento de propiedad horizontal común** (edificios) | armar el reglamento de un edificio, modificarlo por unidades nuevas |
| ⬜ | **Fideicomiso inmobiliario** | fideicomiso al construir, transmitir el dominio fiduciario |
| ⬜ | **Comodato** (préstamo de uso, sin pago) | comodato de una casa, de un auto |
| ⬜ | **Permuta** (canjear un inmueble por otro) | permutar casa por casa, con vuelto en dinero |
| ⬜ | **Uso** (derecho real de uso) | uso gratuito u oneroso de una vivienda |
| ⬜ | **Habitación** (derecho real de habitación) | habitación gratuita u onerosa |
| ⬜ | **Dación en pago** | entregar un inmueble para cancelar una deuda |
| ⬜ | **Escrituras por tracto abreviado** | comprar directo de una sucesión sin escriturar antes a nombre de los herederos |
| ⬜ | **Servidumbres personales puntuales** (agua, luz, paso a favor de un servicio) | servidumbre para una empresa de electricidad o de agua |
| ⬜ | **Abandono / dominio con condición o plazo** | cláusulas puntuales de dominio revocable |
| ⬜ | **Cesión de derechos posesorios** | ceder la posesión de un inmueble sin título |

### Contratos comerciales

| Marcá | Grupo | Ejemplos |
|---|---|---|
| ⬜ | **Leasing** | leasing de inmueble, ejercicio de la opción de compra |
| ⬜ | **Contratos de comercialización** | agencia, concesión, distribución |
| ⬜ | **Contratos asociativos** | unión transitoria, agrupación de colaboración, consorcio |
| ⬜ | **Comisión** | comisión de venta de auto o mercadería |
| ⬜ | **Cesión de la posición contractual** | ceder un contrato de alquiler o un boleto a un tercero |
| ⬜ | **Cesión / asunción de deuda** | que otro asuma tu deuda |
| ⬜ | **Contratos agrarios** | arrendamiento rural, pastoreo, aparcería |
| ⬜ | **Renta vitalicia** | constituir una renta vitalicia onerosa |
| ⬜ | **Contratos varios** | consultoría, garaje, contradocumento |

### Sociedades y personas jurídicas

| Marcá | Grupo | Ejemplos |
|---|---|---|
| ⬜ | **Constitución de otras sociedades** (colectiva, capital e industria, comandita) | sociedades poco comunes, distintas a SA/SRL |
| ⬜ | **Fusión / escisión / transformación de sociedades** | fusionar dos sociedades, transformar una SA en SAS |
| ⬜ | **Sociedades de la Sección IV** (informales) | subsanar o disolver una sociedad no inscripta |
| ⬜ | **Convenios entre socios** (sindicación de acciones) | acuerdos privados entre socios |
| ⬜ | **Fundación / Asociación civil / Simple asociación** | constituir una ONG o fundación |

### Familia y sucesiones

| Marcá | Grupo | Ejemplos |
|---|---|---|
| ⬜ | **Convenciones matrimoniales** | elegir régimen de bienes antes o durante el matrimonio |
| ⬜ | **Partición de bienes por fin de la comunidad** (divorcio) | repartir bienes al separarse |
| ⬜ | **Convenios entre padres/madres** | plan de parentalidad, delegación de responsabilidad parental |
| ⬜ | **Testamentos con legado específico** | dejar un bien puntual por testamento, con o sin condición |
| ⬜ | **Comparecencia de menores** (representados o por sí mismos) | un menor firmando solo, con tutor, o con sus padres |

### Otros

| Marcá | Grupo | Ejemplos |
|---|---|---|
| ⬜ | **Directivas anticipadas** (voluntad anticipada / autoprotección) | directivas médicas, sobre el patrimonio |
| ⬜ | **Afectación / desafectación de vivienda** (bien de familia) | proteger o liberar la vivienda familiar |
| ⬜ | **Cláusulas sueltas de obligaciones** (mora, cláusula penal, rendición de cuentas, recibos) | cláusulas puntuales que hoy se escriben a mano dentro de otro documento |

---

## Grupo 2: actos que el sistema YA tiene, pero de forma genérica

Estos ya se pueden generar, pero solo en su versión general — las variantes específicas (una cláusula particular, un caso especial) hoy hay que escribirlas a mano en el editor.

| Marcá | Grupo | Ya existe como... |
|---|---|---|
| ⬜ | **Sociedad Anónima** — variantes específicas de constitución | `estatuto_sa` (genérico) |
| ⬜ | **Boletos y instrumentos previos a la escritura** — variantes específicas | `boleto_compraventa` (genérico) |
| ⬜ | **Compraventa** — variantes más allá de asentimiento conyugal / UIF | `compraventa_urbana/rural/ph/lote` (2 cláusulas ya cargadas) |
| ⬜ | **Donación** — variantes específicas | `donacion_inmueble/hijo/reserva_uso` |
| ⬜ | **Poderes** — variantes específicas | `poder_administracion/especial/general/irrevocable` |
| ⬜ | **Testamentos** — más allá de la protocolización | `aprobacion_testamento` |
| ⬜ | **Locación** — variantes específicas | `locacion_inmueble/comercial` |
| ⬜ | **Actas notariales** — variantes específicas | 6 tipos de acta ya cargados |
| ⬜ | **Condominio** — variantes específicas | `convenio_division` |

---

## Qué hacemos con esto

Con lo que marques **Frecuente**, armamos el orden real de construcción de templates nuevos — de a poco, no todos juntos. Lo que marques **Nunca** o **Rara vez** directamente lo dejamos afuera del radar por ahora, así no perdemos tiempo en algo que no te sirve.
