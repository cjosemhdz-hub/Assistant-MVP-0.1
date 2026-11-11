import * as XLSX from 'xlsx';

const norm = s => String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
const pick = (row, aliases) => { const keys=Object.keys(row); const k=keys.find(x=>aliases.includes(norm(x))); return k ? row[k] : undefined; };
const num = v => { if(typeof v==='number') return v; const s=String(v??'').replace(/[$,\s]/g,'').replace(/[()]/g,'-'); const n=Number(s); return Number.isFinite(n)?n:0; };
export const money = n => new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN',maximumFractionDigits:2}).format(Number(n)||0);
export const dateText = d => d ? new Date(d).toLocaleDateString('es-MX') : 'Sin fecha';

export async function readWorkbook(file){
  const data=await file.arrayBuffer(); const wb=XLSX.read(data,{type:'array',cellDates:true});
  const sheet=wb.Sheets[wb.SheetNames[0]]; return XLSX.utils.sheet_to_json(sheet,{defval:'',raw:false});
}
export function parseTrialBalance(rows){
  return rows.map((r,i)=>({
    account:String(pick(r,['cuenta','numerodecuenta','codigo','account','nocta'])??'').trim(),
    name:String(pick(r,['nombre','descripcion','nombredelacuenta','accountname'])??'').trim(),
    level:Number(pick(r,['nivel','level'])||0),
    opening:num(pick(r,['saldoinicial','saldoanterior','openingbalance'])),
    debit:num(pick(r,['cargos','debe','debit','debitos'])),
    credit:num(pick(r,['abonos','haber','credit','creditos'])),
    closing:num(pick(r,['saldofinal','saldoactual','saldo','endingbalance'])),
    raw:r, row:i+2
  })).filter(x=>x.account || x.name);
}
export function parseBankRows(rows){
  return rows.map((r,i)=>({date:pick(r,['fecha','date','fechamovimiento']),description:String(pick(r,['concepto','descripcion','description','referencia','beneficiario'])??''),reference:String(pick(r,['referencia','folio','referenciaampliada','rastreo'])??''),deposit:num(pick(r,['abono','deposito','deposit','credito','entrada'])),withdrawal:num(pick(r,['cargo','retiro','withdrawal','debito','salida'])),amount:num(pick(r,['importe','monto','amount'])),row:i+2,raw:r})).filter(x=>x.date || x.description || x.deposit || x.withdrawal || x.amount).map(x=>({...x,amount:x.amount || x.deposit-x.withdrawal}));
}
export function parseCfdiXml(text){
  const doc=new DOMParser().parseFromString(text,'application/xml'); if(doc.querySelector('parsererror')) throw new Error('XML inválido');
  const root=doc.documentElement; const get=(el,n)=>el?.getAttribute(n)||''; const emisor=doc.getElementsByTagNameNS('*','Emisor')[0], receptor=doc.getElementsByTagNameNS('*','Receptor')[0];
  const pagos=[...doc.getElementsByTagNameNS('*','Pago')].map(p=>({fechaPago:get(p,'FechaPago'),monto:num(get(p,'Monto')),formaDePagoP:get(p,'FormaDePagoP'),monedaP:get(p,'MonedaP'),documentos:[...p.getElementsByTagNameNS('*','DoctoRelacionado')].map(d=>({uuid:get(d,'IdDocumento'),serie:get(d,'Serie'),folio:get(d,'Folio'),moneda:get(d,'MonedaDR'),impSaldoAnt:num(get(d,'ImpSaldoAnt')),impPagado:num(get(d,'ImpPagado')),impSaldoInsoluto:num(get(d,'ImpSaldoInsoluto')),numParcialidad:get(d,'NumParcialidad')}))}));
  const nomina=doc.getElementsByTagNameNS('*','Nomina')[0];
  return {uuid:get(doc.getElementsByTagNameNS('*','TimbreFiscalDigital')[0],'UUID'),type:get(root,'TipoDeComprobante'),date:get(root,'Fecha'),series:get(root,'Serie'),folio:get(root,'Folio'),subtotal:num(get(root,'SubTotal')),total:num(get(root,'Total')),currency:get(root,'Moneda'),paymentMethod:get(root,'MetodoPago'),paymentForm:get(root,'FormaPago'),issuer:get(emisor,'Rfc'),issuerName:get(emisor,'Nombre'),receiver:get(receptor,'Rfc'),receiverName:get(receptor,'Nombre'),payroll:!!nomina,payments:pagos,xmlName:''};
}
export function summarizeBalanza(accounts){
  const debit=accounts.reduce((s,a)=>s+a.debit,0), credit=accounts.reduce((s,a)=>s+a.credit,0);
  const closing=accounts.reduce((s,a)=>s+a.closing,0);
  const unclassified=accounts.filter(a=>!a.account || !a.name);
  const suspicious=accounts.filter(a=>a.closing<0 && !/depreciacion|amortizacion|resultado|capital|iva trasladado/i.test(a.name));
  return {count:accounts.length,debit,credit,trialDifference:debit-credit,closingSum:closing,unclassified,suspicious};
}
export function matchBankCfdi(bank,cfdis){
  const used=new Set();
  return bank.map(m=>{
    const candidates=cfdis.map((c,i)=>({c,i,amount:c.total||0,delta:Math.abs(Math.abs(m.amount)-Math.abs(c.total||0))})).filter(x=>!used.has(x.i) && x.delta<=1.00).sort((a,b)=>a.delta-b.delta);
    const hit=candidates[0]; if(hit) used.add(hit.i);
    return {...m,match:hit?{uuid:hit.c.uuid,type:hit.c.type,total:hit.c.total,issuer:hit.c.issuer,receiver:hit.c.receiver}:null,status:hit?'MATCH_MONTO':'PENDIENTE_REVISION'};
  });
}
export function buildMonthlyAnalysis(accounts, period){
  const byName=(re)=>accounts.filter(a=>re.test(`${a.account} ${a.name}`));
  const sum=arr=>arr.reduce((s,a)=>s+Math.abs(a.closing),0);
  const assets=sum(byName(/activo|bancos|clientes|inventario|deudor/i));
  const liabilities=sum(byName(/pasivo|proveedor|acreedor|impuesto por pagar|documentos por pagar/i));
  const equity=sum(byName(/capital|resultado de ejercicios|utilidad|perdida/i));
  const income=sum(byName(/ingreso|venta|servicio|producto financiero/i));
  const expenses=sum(byName(/gasto|costo|nomina|depreciacion|amortizacion/i));
  const netIncome=income-expenses;
  const ratio=(a,b)=>b? a/b:null;
  return {period,assets,liabilities,equity,income,expenses,netIncome,liabilitiesToAssets:ratio(liabilities,assets),netMargin:ratio(netIncome,income),balanceCheck:assets-(liabilities+equity)};
}
