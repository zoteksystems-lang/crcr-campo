// Agente de Documentación — llena la Boleta APA con datos que YA existen en otras
// pantallas del app (nunca inventa nada), arma el SBAR por plantilla, y exporta.
// Reemplaza autoBot()/genSBAR() (llamadas a IA).
import {TNIV} from '../data.js';

function setIfEmpty(obj, key, value, autoSet, path){
  if(value && !obj[key]){ obj[key]=value; autoSet.add(path); }
}

// ctx: {incidente:{u,s,hd,hl}, notas:[{txt}], despacho:{codigos,probables,epp,resumen}|null,
//       diagnosticos:[ENF...]}
// Devuelve el set de rutas ("cod","sam.S",...) que el motor llenó, para marcarlas 🤖 en la UI.
export function autocompletarBoleta(boleta, ctx){
  const auto=new Set();
  if(ctx.incidente){
    setIfEmpty(boleta,'un',ctx.incidente.u,auto,'un');
    setIfEmpty(boleta,'hsal',ctx.incidente.hd,auto,'hsal');
    setIfEmpty(boleta,'hle',ctx.incidente.hl,auto,'hle');
  }
  if(ctx.despacho){
    const codTxt=ctx.despacho.codigos.map(c=>c.cod).join(', ');
    setIfEmpty(boleta,'cod',codTxt,auto,'cod');
    setIfEmpty(boleta,'id',ctx.despacho.resumen,auto,'id');
  }
  if(ctx.diagnosticos && ctx.diagnosticos.length){
    setIfEmpty(boleta,'dx1',`${ctx.diagnosticos[0].t} (${ctx.diagnosticos[0].e||'—'})`,auto,'dx1');
    if(ctx.diagnosticos[1])setIfEmpty(boleta,'dx2',`${ctx.diagnosticos[1].t} (${ctx.diagnosticos[1].e||'—'})`,auto,'dx2');
  }
  if(ctx.notas && ctx.notas.length && !boleta.hal){
    boleta.hal=ctx.notas.map(n=>`• ${n.txt}`).join('\n');
    auto.add('hal');
  }
  return auto;
}

export function generarSBAR(boleta){
  const b=boleta;
  const ant=Object.entries(b.ant||{}).filter(([,v])=>v).map(([k])=>k).join(', ')||'sin antecedentes referidos';
  const nivel=b.trc?TNIV[b.trc]:null;
  return [
`🏥 REPORTE SBAR — ENTREGA HOSPITALARIA`,
``,
`S — SITUACIÓN`,
`Paciente: ${b.nom||'—'} · ${b.edad||'—'} años · ${b.gen||'—'}`,
`Triage: ${b.trc||'—'}${nivel?` (${nivel.l})`:''}`,
``,
`B — BACKGROUND`,
`Antecedentes: ${ant}`,
`Evento: ${b.sam?.E||b.id||'—'}`,
``,
`A — ASSESSMENT`,
`Dx probable: ${[b.dx1,b.dx2,b.dx3].filter(Boolean).join(' / ')||'—'}`,
`SV: FC ${b.sv1?.fc||'—'} · FR ${b.sv1?.fr||'—'} · PA ${b.sv1?.pa1||'—'}/${b.sv1?.pa2||'—'} · SpO₂ ${b.sv1?.spo2||'—'}% · GCS ${b.sv1?.gcs||'—'}`,
`Hallazgos: ${b.hal||'—'}`,
``,
`R — RECOMMENDATION`,
`Tratamiento realizado: ${b.int||'—'}`,
`Destino: ${b.dest||'—'} · Médico receptor: ${b.med||'—'}`
  ].join('\n');
}

// Volcado completo de la boleta en texto plano, para imprimir o compartir sin conexión.
export function exportarBoletaTexto(boleta){
  const b=boleta;
  const trip=(b.trip||[]).map(t=>`  ${t.p}: ${t.n||'—'}`).join('\n');
  const ant=Object.entries(b.ant||{}).filter(([,v])=>v).map(([k])=>k).join(', ')||'—';
  return [
`═══ BITÁCORA APA — CRUZ ROJA COSTARRICENSE ═══`,
`Unidad: ${b.un||'—'}  Placa: ${b.pl||'—'}  Consecutivo: ${b.co||'—'}  Formulario: ${b.fo||'—'}`,
`Tripulación:`,trip,
``,
`— Despacho —`,
`Salida: ${b.hsal||'—'}  Llegada escena: ${b.hle||'—'}  Llegada hospital: ${b.hlh||'—'}  En base: ${b.hba||'—'}`,
`Código CRC: ${b.cod||'—'}  Tipo: ${b.td||'—'}`,
`Dirección: ${b.prov||''} ${b.cant||''} ${b.cal||''} ${b.av||''} ${b.os||''}`.replace(/\s+/g,' ').trim(),
`Info despacho: ${b.id||'—'}`,
``,
`— Paciente —`,
`${b.nom||'—'}  Cédula: ${b.ced||'—'}  Edad: ${b.edad||'—'}  Género: ${b.gen||'—'}`,
`Domicilio: ${b.dp||''} ${b.dc||''} ${b.do_||''}`.replace(/\s+/g,' ').trim(),
`Acompañante: ${b.ac||'—'}  Tel: ${b.tel||'—'}`,
`Triage: ${b.trc||'—'}`,
``,
`— Signos vitales (1ª toma ${b.sv1?.h||'—'}) —`,
`FC ${b.sv1?.fc||'—'} · FR ${b.sv1?.fr||'—'} · PA ${b.sv1?.pa1||'—'}/${b.sv1?.pa2||'—'} · SpO₂ ${b.sv1?.spo2||'—'}% · GCS ${b.sv1?.gcs||'—'} · Temp ${b.sv1?.temp||'—'} · Glu ${b.sv1?.glu||'—'}`,
`Peso/Talla: ${b.sv1?.pe||'—'}kg / ${b.sv1?.ta||'—'}cm`,
``,
`— Antecedentes —`,
ant,
`SAMPLE — S:${b.sam?.S||'—'} A:${b.sam?.A||'—'} M:${b.sam?.M||'—'} P:${b.sam?.P||'—'} L:${b.sam?.L||'—'} E:${b.sam?.E||'—'}`,
`Hallazgos físicos: ${b.hal||'—'}`,
``,
`— Impresión diagnóstica —`,
[b.dx1,b.dx2,b.dx3].filter(Boolean).join(' / ')||'—',
``,
`— Tratamiento —`,
b.int||'—',
`Observaciones: ${b.obs||'—'}`,
``,
`— Destino —`,
`${b.dest||'—'}  Médico receptor: ${b.med||'—'}`,
`═══════════════════════════════════════════`
  ].join('\n');
}
