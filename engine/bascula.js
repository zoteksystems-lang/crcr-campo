// Báscula Bluetooth por Web Bluetooth (Chrome en Android, Windows, Mac y
// ChromeOS; Safari de iPhone NO lo soporta). Habla con:
//  - básculas estándar Bluetooth: Weight Scale (0x181D / 0x2A9D) y Body
//    Composition (0x181B / 0x2A9C) — muchas marcas genéricas;
//  - Xiaomi Mi Smart Scale (MI_SCALE / MI SCALE2, formato 0x2A9D) y Mi Body
//    Composition Scale 2 (MIBFS / MIBCS: 13 bytes con peso e impedancia),
//    las que usa Zepp Life.
// La báscula se despierta al subirse; Zepp Life debe estar cerrada para que
// no "se adueñe" de la conexión.

const SERV_PESO=0x181d,SERV_COMP=0x181b;
const CAR_PESO=0x2a9d,CAR_COMP=0x2a9c;

function u16(dv,i){return dv.getUint16(i,true);}
function aDV(datos){
  if(datos instanceof DataView)return datos;
  const a=datos instanceof Uint8Array?datos:Uint8Array.from(datos);
  return new DataView(a.buffer,a.byteOffset,a.byteLength);
}

// Weight Measurement 0x2A9D (estándar; también Mi Scale 1).
export function leerPeso2A9D(datos){
  const dv=aDV(datos),flags=dv.getUint8(0);
  const imperial=(flags&1)!==0;
  let peso=u16(dv,1)*(imperial?0.01*0.45359237:0.005);
  // Mi Scale 1 usa los bits 5 (estable) y 7 (se bajó) del mismo byte.
  return{peso:Math.round(peso*100)/100,estable:(flags&0x20)!==0||!(flags&0x80),bajo:(flags&0x80)!==0};
}

// Mi Body Composition Scale 2 (MIBFS/MIBCS): 13 bytes.
// [0]ctrl0 [1]ctrl1 [2-3]año [4]mes [5]día [6]h [7]m [8]s [9-10]impedancia [11-12]peso
export function leerXiaomi13(datos){
  const dv=aDV(datos);
  if(dv.byteLength<13)return null;
  const c0=dv.getUint8(0),c1=dv.getUint8(1);
  const lbs=(c0&1)!==0,catty=(c1&0x40)!==0;
  const peso=u16(dv,11)/(lbs||catty?100:200)*(lbs?0.45359237:catty?0.5:1);
  const impedancia=(c1&0x02)?u16(dv,9):null;
  return{peso:Math.round(peso*100)/100,impedancia:impedancia&&impedancia<3000?impedancia:null,
    estable:(c1&0x20)!==0,bajo:(c1&0x80)!==0};
}

// Body Composition Measurement 0x2A9C (estándar Bluetooth).
export function leerComp2A9C(datos){
  const dv=aDV(datos),flags=u16(dv,0);
  const imperial=(flags&1)!==0,masa=imperial?0.01*0.45359237:0.005;
  const r={grasa:u16(dv,2)/10,estable:true};
  let i=4;
  if(flags&0x002)i+=7;                               // fecha
  if(flags&0x004)i+=1;                               // usuario
  if(flags&0x008){r.metabolismo=Math.round(u16(dv,i)/4.184);i+=2;} // kJ → kcal
  if(flags&0x010){r.musculoPct=u16(dv,i)/10;i+=2;}
  if(flags&0x020){r.musculo=Math.round(u16(dv,i)*masa*10)/10;i+=2;}
  if(flags&0x040){i+=2;}                              // masa libre de grasa
  if(flags&0x080){i+=2;}                              // masa magra blanda
  if(flags&0x100){r.aguaKg=u16(dv,i)*masa;i+=2;}
  if(flags&0x200){r.impedancia=u16(dv,i)/10;i+=2;}
  if(flags&0x400){r.peso=Math.round(u16(dv,i)*masa*100)/100;i+=2;}
  if(r.aguaKg&&r.peso){r.agua=Math.round(r.aguaKg/r.peso*1000)/10;}
  delete r.aguaKg;
  if(r.grasa===0||r.grasa>=100)delete r.grasa;
  return r;
}

export function soportado(){return !!globalThis.navigator?.bluetooth;}

// Conecta y espera una medición estable. onEstado(texto) informa el avance.
// Devuelve {peso, grasa?, musculo?, agua?, metabolismo?, impedancia?, dispositivo}.
export async function medir(onEstado=()=>{},{tiempo=90000}={}){
  if(!soportado())throw new Error('Este navegador no tiene Bluetooth web. En Android usa Chrome; en iPhone importa los datos o usa el Atajo.');
  const dispositivo=await navigator.bluetooth.requestDevice({
    filters:[{services:[SERV_PESO]},{services:[SERV_COMP]},
      {namePrefix:'MIBFS'},{namePrefix:'MIBCS'},{namePrefix:'MI_SCALE'},{namePrefix:'MI SCALE'}],
    optionalServices:[SERV_PESO,SERV_COMP]
  });
  const xiaomi13=/^MIB[FC]S/i.test(dispositivo.name||'');
  onEstado(`Conectando con ${dispositivo.name||'la báscula'}…`);
  const gatt=await dispositivo.gatt.connect();
  return await new Promise(async(ok,mal)=>{
    const acumulado={dispositivo:dispositivo.name||'Báscula'};
    let listo=false;
    const terminar=(err)=>{
      if(listo)return;listo=true;clearTimeout(t);
      try{gatt.disconnect();}catch{}
      err?mal(err):ok(acumulado);
    };
    const t=setTimeout(()=>acumulado.peso?terminar():terminar(new Error('No llegó una medición estable. Súbete descalzo y quédate quieto.')),tiempo);
    const escuchar=async(servicio,car,lector)=>{
      try{
        const s=await gatt.getPrimaryService(servicio);
        const c=await s.getCharacteristic(car);
        c.addEventListener('characteristicvaluechanged',e=>{
          const r=lector(e.target.value);
          if(!r)return;
          if(r.peso>0)onEstado(`${r.peso.toFixed(1).replace('.',',')} kg${r.estable?'':' (quédate quieto…)'}`);
          if(!r.estable||r.bajo)return;
          for(const [k,v] of Object.entries(r))if(v!==null&&v!==undefined&&!['estable','bajo'].includes(k))acumulado[k]=v;
          // Con impedancia (Xiaomi) o composición completa ya no hace falta esperar más.
          if(acumulado.peso&&(acumulado.impedancia||acumulado.grasa||!xiaomi13))setTimeout(()=>terminar(),1500);
        });
        await c.startNotifications();
        return true;
      }catch{return false;}
    };
    onEstado('Conectada. Súbete a la báscula descalzo…');
    const a=await escuchar(SERV_COMP,CAR_COMP,v=>xiaomi13||v.byteLength===13?leerXiaomi13(v):leerComp2A9C(v));
    const b=await escuchar(SERV_PESO,CAR_PESO,leerPeso2A9D);
    if(!a&&!b)return terminar(new Error('La báscula no ofrece un servicio de peso compatible.'));
  });
}
