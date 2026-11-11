# Plan técnico y funcional — MFA Assistant

## Objetivo
Un portal web SaaS de MFA Consultores para uso interno y acceso segregado de clientes. Primer caso de uso: revisión mensual de balanza, conciliación bancaria contra CFDI y análisis financiero de balance general y estado de resultados.

## Usuarios y permisos
- MFA Admin: administra organizaciones, catálogos, periodos, reglas y usuarios.
- MFA Staff: carga datos, ejecuta revisiones, documenta y prepara informes.
- Cliente Admin: consulta y carga información de su organización, sujeto a aprobación.
- Cliente Viewer: consulta reportes aprobados y descarga entregables.

## Fuentes del periodo
1. Balanza: cuenta, descripción, nivel, saldo inicial, cargos, abonos, saldo final.
2. Bancos: cuenta bancaria, fecha, concepto, referencia, cargo, abono, saldo, moneda.
3. CFDI: XML emitidos/recibidos, egresos, nómina y REP.
4. Diccionario MFA: mapeo de cuentas, rubros NIF y reglas financieras.
5. Documentación soporte: pólizas, auxiliares, contratos, estados de cuenta y políticas.

## Pipeline de procesamiento
Ingesta → validación de archivo → extracción/normalización → deduplicación → clasificación → reglas determinísticas → conciliación → hallazgos → revisión humana → reporte Excel/PDF → bitácora.

## Diseño de conciliación
- Depósitos: CFDI ingreso emitidos por la entidad; REP que amparen PPD; identificar cobros parciales y pagos agrupados.
- Retiros: CFDI recibidos de gastos/compras, CFDI de nómina y REP cuando proceda; distinguir pagos de obligaciones, traspasos, comisiones, impuestos, préstamos y movimientos no deducibles/no relacionados con CFDI.
- Notas de crédito: vincular CFDI tipo E con CFDI origen; no tratarlas como salida bancaria automáticamente.
- Nómina: conciliar dispersión neta bancaria contra recibos y archivo de dispersión, considerando pagos agrupados, impuestos, cuotas y descuentos.
- REP: vincular UUID relacionado, parcialidad, importe pagado, saldo anterior e insoluto; evitar contar el REP como ingreso adicional al CFDI original.
- Resultado del match debe ser explicable, con score y razones; ningún match automático se marca como definitivo sin regla de aprobación.

## Pruebas contables / NIF
- Integridad aritmética y movimientos del periodo.
- Clasificación y presentación por rubro, corto/largo plazo y naturaleza.
- Devengación, corte, consistencia y comparabilidad.
- Estimaciones y valuación (deterioro, depreciación, amortización, provisiones).
- Partes relacionadas, contingencias, hechos posteriores y revelaciones.
- Cada prueba debe tener: objetivo, cuentas afectadas, evidencia requerida, criterio NIF vigente, tolerancia/materialidad, resultado, limitación, revisor y aprobación.

## Entregable Excel mensual
Hojas previstas: Portada, Resumen Ejecutivo, Balance General, Estado de Resultados, Razones Financieras, Balanza Normalizada, Conciliación Bancaria, CFDI Ingresos, CFDI Egresos, Nómina, REP, Hallazgos NIF, Integridad, Diccionario MFA y Parámetros. Fórmulas y celdas de entrada diferenciadas; cada hallazgo debe referenciar archivo, hoja, fila, UUID o cuenta fuente.
