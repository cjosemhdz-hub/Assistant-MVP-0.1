# MFA Assistant — MVP 0.1

Plataforma web inicial para revisiones contables, fiscales y financieras mensuales de MFA Consultores. Este paquete es un **prototipo de desarrollo**, no un SaaS listo para producción.

## Qué incluye esta primera entrega

- Interfaz web React + Vite adaptable a escritorio y móvil.
- Carga local de balanza Excel, movimientos bancarios Excel y CFDI XML.
- Lectura inicial de CFDI 4.0, tipos I/E/P/N, UUID, importes y documentos relacionados en complemento de pagos.
- Pruebas aritméticas de balanza, saldos negativos atípicos y datos incompletos.
- Cruce candidato de movimientos bancarios contra CFDI por importe con tolerancia de $1.00 MXN. **No es conciliación definitiva**: falta normalizar fecha, RFC, UUID, moneda, referencia, forma de pago y reglas de parcialidades.
- Análisis financiero mensual preliminar y exportación Excel con resumen, balanza, bancos/CFDI y hallazgos.
- SQL inicial para Supabase con organizaciones, membresías, periodos, archivos, ejecuciones, hallazgos, bitácora y RLS.
- Versiones HTML anteriores de MFA BI preservadas en `docs/` como antecedentes funcionales.

## Ejecutar localmente

Requisitos: Node.js 20+ y npm.

```bash
npm install
npm run dev
```

Abrir la URL local que indique Vite.

## Publicar en Vercel

1. Subir esta carpeta a un repositorio privado de GitHub.
2. Importar el repositorio en Vercel.
3. Framework preset: Vite; build command `npm run build`; output directory `dist`.
4. Para esta versión local no se requieren variables de entorno. No agregar claves privadas al frontend.
5. Configurar Supabase cuando se implemente autenticación, persistencia y almacenamiento. Copiar `.env.example` a `.env.local` y configurar únicamente URL y anon key.

## Estructura

- `src/App.jsx`: interfaz y flujo de carga.
- `src/lib/engine.js`: lectura y reglas preliminares.
- `supabase/migrations/001_initial_schema.sql`: modelo multiempresa y políticas iniciales RLS.
- `templates/`: plantillas de importación.
- `docs/`: antecedentes MFA BI.

## Plan técnico por incrementos

### MVP 0.1 — prototipo local (incluido)
Carga de archivos, validaciones aritméticas, cruce candidato por importe, vista mensual y exportación Excel.

### MVP 0.2 — motor contable confiable
- Diccionario MFA versionado: código, descripción, nivel, naturaleza, rubro NIF, estado financiero, signo de presentación, regla de agrupación y vigencia.
- Importadores configurables por formato de CONTPAQi, bancos y layouts de nómina.
- Control de niveles para no duplicar cuenta mayor, subcuenta y auxiliar.
- Validaciones: cargos=abonos, saldos iniciales/finales, movimientos del periodo, cuentas huérfanas, signos anómalos, periodificación y consistencia de estados.
- Catálogo de pruebas NIF por rubro con evidencia requerida, fuente normativa, versión, materialidad, responsable y estatus. La herramienta reportará alertas; no afirmará cumplimiento NIF solo por una balanza.

### MVP 0.3 — conciliación bancaria y CFDI
- CFDI recibidos y emitidos, notas de crédito, nómina, REP 2.0 y UUID relacionados.
- Extracción de RFC, UUID, fecha, moneda, subtotal, impuestos, total, método y forma de pago.
- Match por importe + fecha + RFC/contraparte + referencia; tolerancias configurables; manejo de pagos parciales, agrupados, comisiones, traspasos, devoluciones y diferencias cambiarias.
- Estados: conciliado, candidato, parcial, sin CFDI, CFDI sin movimiento, requiere revisión.
- Detección de duplicados por UUID y por huella de archivo.

### MVP 0.4 — estados financieros y análisis financiero
- Balance general y estado de resultados por mes desde mapeo aprobado por MFA.
- Razones de liquidez, apalancamiento, capital de trabajo, margen bruto/operativo/neto, ROA/ROE cuando existan datos suficientes.
- Comparativo mensual y anual solo cuando se carguen periodos comparables; en este MVP el alcance es un mes.
- Exportación Excel con fórmulas, fuentes, conciliaciones, notas, hallazgos y cédulas trazables.

### MVP 0.5 — nube multiempresa y clientes
- Supabase Auth, organizaciones, usuarios y roles MFA/cliente.
- Storage privado con políticas RLS y rutas por organización.
- Procesamiento servidor, colas, logs, bitácora y versionado de reglas.
- Aprobación humana antes de cerrar hallazgos o emitir reportes.
- Pruebas de aislamiento entre clientes, respaldos, retención y borrado seguro.

### MVP 0.6 — IA
- OpenAI API llamada exclusivamente desde backend/Edge Function.
- RAG controlado con manuales MFA, criterios contables y fuentes legales versionadas.
- La IA explica hallazgos y redacta comentarios; el motor determinístico calcula importes y ratios.
- Citas a evidencia y trazabilidad de cada respuesta. Prohibido inventar datos o fundamento.

## Reglas contables y de seguridad no negociables

1. Un resultado sin evidencia se marca como pendiente, nunca como cumplido.
2. La IA no sustituye el juicio profesional ni la aprobación del contador.
3. Separación estricta por organización/cliente y mínimo privilegio.
4. No almacenar certificados, contraseñas SAT, e.firma ni claves privadas en el MVP.
5. No ejecutar presentación de declaraciones, pagos ni modificaciones contables automáticas.
6. Validar requisitos de privacidad, avisos, contratos de encargado y tratamiento de datos antes de habilitar clientes.
7. Los estados financieros oficiales requieren mapeo contable revisado y aprobado; las palabras clave actuales solo demuestran el flujo de la interfaz.

## Limitaciones conocidas de 0.1

- El importador asume encabezados reconocibles; todavía no hay asistente de mapeo de columnas.
- La clasificación del balance y resultados usa palabras clave de nombres de cuenta, no el Diccionario MFA aprobado.
- La comparación bancaria usa importe como candidato, no prueba de pago ni conciliación definitiva.
- El análisis de NIF es una lista de áreas de revisión, no una auditoría automatizada completa.
- Los datos permanecen en memoria del navegador y se pierden al recargar; no hay login, nube ni persistencia en esta versión.
