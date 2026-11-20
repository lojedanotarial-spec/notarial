# Árbol de carpetas del Explorador — ejemplo (20/11/2026)

Boceto de lo que describió Lucas: por año, dentro de cada año protocolares y no protocolares, y dentro de cada uno una carpeta por acto jurídico. Los protocolares siempre tienen carpeta armada; los no protocolares pueden o no tenerla.

**Es un ejemplo de estructura, no una pantalla.** La clasificación de qué acto es protocolar y cuál no es una suposición mía a confirmar con Fátima: hoy el producto no guarda esa distinción.

```mermaid
flowchart LR
  R["Explorador"] --> A26["2026"]
  R --> A25["2025"]

  A26 --> P26["Protocolares"]
  A26 --> N26["No protocolares"]

  P26 --> CV["Compraventa"]
  P26 --> PO["Poder especial"]
  P26 --> HI["Hipoteca"]

  CV --> E29["Esc. N.º 29 · García c/ Pérez"]
  CV --> E31["Esc. N.º 31 · Rojas c/ Sosa"]

  E29 --> E29a["PDF de cierre del expediente"]
  E29 --> E29b["Escritura redactada"]
  E29 --> E29c["Certificados e informes"]
  E29 --> E29d["DNI de las partes"]

  PO --> E33["Esc. N.º 33 · Poder de López"]
  E33 --> E33a["PDF de cierre del expediente"]
  E33 --> E33b["Documentos y DNI"]

  N26 --> CF["Certificación de firmas"]
  N26 --> AV["Autorización de viaje"]
  N26 --> F8["Cert. de firma F08"]

  CF --> CF1["Carpeta: Cert. firma · Díaz"]
  CF --> CF2["Documento suelto: Cert. firma · Torres"]
  CF1 --> CF1a["Documento y DNI"]

  AV --> AV1["Documento suelto: Aut. viaje · Molina"]

  A25 --> P25["Protocolares"]
  A25 --> N25["No protocolares"]
  P25 --> CV25["Compraventa"]
  CV25 --> E12["Esc. N.º 12 · Acosta c/ Vera"]
  N25 --> CF25["Certificación de firmas"]

  classDef protocolar fill:#e8f1f8,stroke:#3a7ca5,color:#1a2332;
  classDef noprotocolar fill:#fdfcfa,stroke:#7a5f18,color:#1a2332,stroke-dasharray:4 3;
  class P26,P25,CV,PO,HI,E29,E31,E33,CV25,E12 protocolar;
  class N26,N25,CF,AV,F8,CF1,CF2,AV1,CF25 noprotocolar;
```

**Cómo leerlo**
- Azul: protocolar. Siempre tiene su carpeta completa (PDF de cierre, escritura, certificados, DNI de las partes).
- Borde punteado: no protocolar. Puede tener carpeta («Cert. firma · Díaz») o ser solo un documento suelto («Cert. firma · Torres»).
- Los nombres de actos salen de las plantillas que ya existen en el producto (Compraventa, Poder especial, Hipoteca, Cert. firma, Aut. viaje, Cert. F08). Los números de escritura y los apellidos son inventados.

**Decisión final (Lucas, 20/11/26): NO se hace un árbol de carpetas; se hace un sistema de filtros.** Se sigue D26. El orden de este boceto se conserva como **ruta visible** sobre los filtros (año › protocolar o no › acto), con la misma lógica que el papel pero sin árbol. Los filtros del Explorador incluyen: año, protocolar / no protocolar, acto jurídico, persona, estado, y con o sin carpeta.
