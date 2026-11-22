/* eslint-disable */
// Proposal engine of the UrjaCon Proposal Studio (owner's file), ported as an ES module.
// compute()/filtered()/applyProduct()/setKey() are pure state helpers; renderDocument() fills the
// 11-page proposal inside an iframe document (see components/leads/ProposalFrame.js).
import CATALOG from "./catalog.json";
import ASSETS from "./assets.json";
import qrcode from "./qrcode";

export { ASSETS };
let state = null, doc = null, media = {};
const $ = id => doc.getElementById(id);
/* ================= constants ================= */
const STRUCTS = [
  {k:"Standard",      sub:"Ground Mount/ RCC Roof",              mat:"GI Structure",             img:"structLow", src:["Normal","RCC Ballast"]},
  {k:"RCC Structure", sub:"RCC Roof – Fixed Structure",          mat:"GI Structure",             img:"structLow", src:["RCC Structure"]},
  {k:"Elevated 2 mtr",sub:"Elevated Residential Option - 2 mtr", mat:"GI Structure",             img:"structure", src:["Elevated"]},
  {k:"Elevated 3 mtr",sub:"Elevated Residential Option - 3 mtr", mat:"GI Structure",             img:"structure", src:[]},
  {k:"Sheet Roof",    sub:"Tin Shed / Sheet Roof",               mat:"Aluminium Rail Structure", img:"structLow", src:["Sheet Roof"]},
  {k:"Ground Mount",  sub:"Ground Mount",                        mat:"GI Structure",             img:"structLow", src:[]},
  {k:"Carport",       sub:"Carport",                             mat:"GI Structure",             img:"structure", src:[]}
];
const EARTHS = [{k:"Aluminium",src:"Aluminium"},{k:"Copper",src:"Copper"},{k:"GI Strip",src:"GI Strip"}];
const AC_SIZES = ["2C x 4 Sqmm","2C x 6 Sqmm","2C x 10 Sqmm","4C x 4 Sqmm","4C x 6 Sqmm","4C x 10 Sqmm","4C x 16 Sqmm","3.5C x 25 Sqmm"];
const BASE_BRANDS = [
  {name:"TATA",panel:true,inv:false},{name:"WAAREE",panel:true,inv:true},{name:"ADANI",panel:true,inv:true},
  {name:"PREMIER",panel:true,inv:true},{name:"TEJAS",panel:true,inv:false},{name:"UTL",panel:true,inv:true},
  {name:"MICROTEK",panel:true,inv:true},{name:"SOLIS",panel:false,inv:true},{name:"GOODWE",panel:false,inv:true},
  {name:"SOLAX",panel:false,inv:true},{name:"FOX",panel:false,inv:true},{name:"POLYCAB",panel:false,inv:true},{name:"DEYE",panel:false,inv:true}
];
const BRAND_LABEL = {WAAREE:"Waaree",TATA:"Tata Power",ADANI:"Adani",PREMIER:"Premier",UTL:"UTL",TEJAS:"UrjaCon Tejas",MICROTEK:"Microtek",DEYE:"Deye",GOODWE:"GoodWe",SOLAX:"Solax",SOLIS:"Solis",FOX:"Fox ESS",POLYCAB:"Polycab"};
const CAT_BRAND = {Tata:"TATA",Waaree:"WAAREE",Adani:"ADANI",Premier:"PREMIER",UTL:"UTL",Microtek:"MICROTEK",Tejas:"TEJAS"};
const MONTH_PROFILE = [26000,27000,31500,33600,34500,28000,18500,19300,26500,28700,24000,19300];
/* usable share of battery energy — same basis as the price list "Backup hrs @ 1 kW" */
const DOD = {"Li-ion":0.81,"Lead Acid":0.45};
const NDCR_STRUCT = {"Standard":"Ground Mount / RCC Ballast","Sheet Roof":"Sheet Roof","RCC Structure":"RCC Structure"};
const ST_SHORT = {Chhattisgarh:"CG",Odisha:"Odisha"};

const DEF = {
  ref:"URC-298/P/1.1", date:"", cust:"Ramesh Sahu", contact:"", phone:"", addr:"Saraipali", locLink:"",
  plist:"CL",
  seg:"Domestic", sys:"On-Grid", region:"Chhattisgarh", dcr:"DCR", brandF:"", kwF:"", q:"", prodCode:"",
  kw:3, kwp:"", phase:"1ph", structType:"Standard", structSub:"Ground Mount/ RCC Roof", structMat:"GI Structure",
  structLen:"As per site conditions", structWid:"As per site conditions", structAdd:"",
  earthType:"Aluminium", earthAdd:"", ecTxt2:"Multicore 16 Sqmm",
  acSize:"2C x 4 Sqmm", acMat:"Copper", acBrand:"Havells", acAdd:"", otherAdd:"", dcTxt2:"Polycab 1C x 4 Sqmm",
  batType:"Li-ion", batCount:1, batVolt:48, batAh:100, batWar:"", batMax:"",
  panelBrand:"TATA", cellType:"P-Type Mono PERC", wp:595, modules:"", panelWar:"25 Years",
  invBrand:"SOLIS", invModel:"", invCount:1, invWar:"8 Years", wiOn:"off",
  manPrice:"", priceMode:"total", rate:179500, gst:8.9, projCost:"", descLine:"Roof Top Solar System Cost",
  subsidyOn:"auto", subCentral:"", subState:"", finOn:"on", expandKw:"", suitOn:"on", gstSplitOn:"off", sqftKw:75, noteTxt:"", designLink:"",
  genKw:1500, tariff:7.5, treeF:0.03584, co2F:35, chartType:"monthly", escal:3,
  cable:"Polycab/ Havells", wPerf:"25", wInv:"8", wBos:"5", bosTxt:"MNRE approved",
  d1:7, d2:15, d3:20, d4:10,
  prep:"Abhishek Agrawal", prepPhone:"+918881145000", prepCo:"Urjacon Infratech Pvt Ltd",
  advTxt:[
    "Predictable energy costs: lock in your electricity rates for decades and shield yourself from rising tariffs.",
    "Fast return on investment, within a few years.",
    "25 years linear performance warranty at an affordable cost.",
    "Highly efficient solar panels and inverter give the highest yields.",
    "Use free terrace / roof space to earn, and reduce heat on the top floor.",
    "Industry-leading onsite warranty for inverters.",
    "Reduce your carbon footprint with clean, renewable energy.",
    "Panels shield the roof and soften the sound of rain."].join("\n"),
  scopeTxt:[
    "Preparation of Engineering Drawing, Design for solar structure and solar power plant as per relevant IS standard",
    "Supply of Solar Modules, Inverters, Structures, Cables, and Balance of Plant",
    "Installation of structure, solar modules, inverter, AC-DC cable, LT panel etc for solar power plant",
    "Installation of monitoring and controlling system for solar power plant",
    "Commissioning of Solar Power Plant and supply of power to LT panel of SGD",
    "Zero Export Device installation"].join("\n"),
  custScopeTxt:["Water for concrete works","Power Required for operating tools & equipment"].join("\n"),
  termsTxt:[
    "Packing is included in the offer",
    "Transportation charges, civil and digging works are at our scope",
    "Prices quotes are firm and valid for 30 days from the date of offer. After this period a reconfirmation from our office should be taken",
    "Water supply at site will be provided by customer free of cost during the time of installation and commissioning",
    "Closed, covered, locked stores will be provided by customer during the time of installation and commissioning",
    "Delivery: 2-3 weeks from the date of technically and commercially cleared order",
    "Force Major clause: this quotation as well as the resulting contract are subject to the standard force majeure condition",
    "No hidden charges."].join("\n"),
  payTxt:["90% advance along with Purchase Order.","Balance 10% after installation and commissioning"].join("\n"),
  bankTxt:["Account Name: | Urjacon Infratech Private Limited","Account Number: | 783205500210","Account type: | Current Account","IFSC Code: | ICIC0007832","Branch: | ICICI Bank, Saraipali","GST : | 22AADCU8462A1ZN"].join("\n")
};


const inr = (n,dec=0) => { const neg=n<0; n=Math.abs(n); let [i,f]=n.toFixed(dec).split(".");
  let l3=i.slice(-3), rest=i.slice(0,-3); if(rest) l3=","+l3; rest=rest.replace(/\B(?=(\d{2})+(?!\d))/g,",");
  return (neg?"-":"")+rest+l3+(dec?"."+f:""); };
const lakh = n => n>=1e7 ? (n/1e7).toFixed(2)+" Cr" : n>=1e5 ? (n/1e5).toFixed(2)+" Lakh" : inr(n);
const num = v => { const n=parseFloat(v); return isFinite(n)?n:0; };
const kwStr = k => (Math.round(k*1000)/1000).toString();
const esc = s => String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const fmtDate = s => { if(!s) return ""; const [y,m,d]=s.split("-"); return `${d}/${m}/${y}`; };
const today = () => { const d=new Date(), p=n=>String(n).padStart(2,"0"); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`; };
const addDays = (d,n) => { const t=new Date((d||today())+"T00:00:00"); t.setDate(t.getDate()+n); const p=x=>String(x).padStart(2,"0"); return `${t.getFullYear()}-${p(t.getMonth()+1)}-${p(t.getDate())}`; };


const BUILTIN_LOGOS = {WAAREE:ASSETS.waaree, TATA:ASSETS.tata, SOLIS:ASSETS.solis, POLYCAB:ASSETS.polycab, HAVELLS:ASSETS.havells};
const logoOf = b => (media.logos||{})[b] || BUILTIN_LOGOS[b] || null;
const product = () => PRODUCTS.find(p=>p.code===state.prodCode) || null;
const isML = () => state.plist==="ML";
const pPrice = p => isML()?p.prM:p.pr;
const pCode  = p => isML()?p.m:p.c;
export const priceOf = (st,p) => { state=st; return pPrice(p); };
export const codeOf = (st,p) => { state=st; return pCode(p); };
export const productOf = (st) => { state=st; return product(); };
const PRODUCTS = CATALOG.map(p=>{
  const large=!!p.large;
  const kind = p.cat==="On-Grid + Battery" ? "On-Grid + Battery inverter" : p.sys;
  const desc = large ? `${p.brand} NDCR · ${p.kw} kW AC / ${p.kwp} kWp DC`
                     : `${p.brand} ${p.kw} kW ${kind}${p.bat?" · "+p.bat:""}${p.tag?" · "+p.tag+(p.payopt?" ("+p.payopt+")":""):""}`;
  return {...p, code:p.c, desc, comm:large, panels:p.n, pwatt:p.w, phase:p.ph,
    structOpts: large ? p.so : [["Normal",0],["Elevated",p.ht||0],["Sheet Roof",0]],
    earthOpts: large ? [["Aluminium",0]] : [["Aluminium",0],["Copper",p.cu||0]]};
});
function invBrandFrom(s){
  s=(s||"").toLowerCase();
  for(const [k,v] of [["solis","SOLIS"],["polycab","POLYCAB"],["deye","DEYE"],["microtek","MICROTEK"],["utl","UTL"],["goodwe","GOODWE"],["waaree","WAAREE"]]) if(s.includes(k)) return v;
  return null;
}

/* ================= site location =================
   Accepts a Google Maps link (any form) or plain "lat, long". Gives the link to open and, when present, the coordinates. */
function siteLoc(v){
  v=String(v||"").trim(); if(!v) return null;
  let m = v.match(/!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/) || v.match(/@(-?\d{1,2}\.\d+),\s*(-?\d{1,3}\.\d+)/) || v.match(/[?&](?:q|ll|query|destination)=(?:loc:)?(-?\d{1,2}\.\d+)(?:,|%2C)\s*(-?\d{1,3}\.\d+)/i);
  if(!m && !/^https?:/i.test(v)) m = v.match(/^\s*(-?\d{1,2}(?:\.\d+)?)\s*[, ]\s*(-?\d{1,3}(?:\.\d+)?)\s*$/);
  const lat=m?+m[1]:null, lng=m?+m[2]:null, ok=m && Math.abs(lat)<=90 && Math.abs(lng)<=180;
  if(/^https?:\/\//i.test(v)) return {url:v, lat:ok?lat:null, lng:ok?lng:null};
  if(ok) return {url:`https://www.google.com/maps?q=${lat},${lng}`, lat, lng};
  return {url:"https://www.google.com/maps/search/?api=1&query="+encodeURIComponent(v), lat:null, lng:null, text:v};
}
function qrDataUrl(text){
  try{ const q=qrcode(0,"M"); q.addData(text); q.make(); return q.createDataURL(6,2); }catch(e){ return ""; }
}


const OSM_BIAS="80.0,24.5,87.6,17.5";            /* prefer Chhattisgarh / Odisha results */
async function geoSearch(q){
  const u="https://nominatim.openstreetmap.org/search?format=jsonv2&limit=6&countrycodes=in&accept-language=en&viewbox="+OSM_BIAS+"&q="+encodeURIComponent(q);
  const r=await fetch(u,{headers:{"Accept":"application/json"}}); if(!r.ok) throw new Error("search "+r.status);
  return (await r.json()).map(x=>({lat:+x.lat,lng:+x.lon,name:x.display_name||q})).filter(x=>isFinite(x.lat)&&isFinite(x.lng));
}
function loadTile(z,x,y){ return new Promise(res=>{ const n=1<<z, im=new Image(); im.crossOrigin="anonymous";
  im.onload=()=>res(im); im.onerror=()=>res(null); im.src=`https://tile.openstreetmap.org/${z}/${((x%n)+n)%n}/${y}.png`; }); }
async function buildMap(lat,lng,z){
  const W=1100,H=650,T=256,n=1<<z;
  const px=(lng+180)/360*n*T, sy=Math.sin(lat*Math.PI/180), py=(0.5-Math.log((1+sy)/(1-sy))/(4*Math.PI))*n*T;
  const x0=px-W/2, y0=py-H/2, cv=document.createElement("canvas"); cv.width=W; cv.height=H; const g=cv.getContext("2d");
  g.fillStyle="#e8e6e1"; g.fillRect(0,0,W,H);
  const jobs=[]; for(let tx=Math.floor(x0/T); tx<=Math.floor((x0+W)/T); tx++) for(let ty=Math.floor(y0/T); ty<=Math.floor((y0+H)/T); ty++){
    if(ty<0||ty>=n) continue; jobs.push(loadTile(z,tx,ty).then(im=>({im,dx:Math.round(tx*T-x0),dy:Math.round(ty*T-y0)}))); }
  const tiles=await Promise.all(jobs); let ok=0; tiles.forEach(t=>{ if(t.im){ g.drawImage(t.im,t.dx,t.dy,T,T); ok++; } });
  if(!ok) throw new Error("tiles");
  const cx=W/2, cy=H/2;                              /* pin */
  g.fillStyle="rgba(0,0,0,.25)"; g.beginPath(); g.ellipse(cx,cy+2,12,5,0,0,7); g.fill();
  g.fillStyle="#e11d48"; g.strokeStyle="#fff"; g.lineWidth=3; g.beginPath(); g.moveTo(cx,cy); g.bezierCurveTo(cx-26,cy-30,cx-20,cy-62,cx,cy-62); g.bezierCurveTo(cx+20,cy-62,cx+26,cy-30,cx,cy); g.closePath(); g.fill(); g.stroke();
  g.fillStyle="#fff"; g.beginPath(); g.arc(cx,cy-42,8,0,7); g.fill();
  const at="© OpenStreetMap contributors"; g.font="13px Arial"; const tw=g.measureText(at).width;
  g.fillStyle="rgba(255,255,255,.85)"; g.fillRect(W-tw-14,H-22,tw+14,22); g.fillStyle="#333"; g.fillText(at,W-tw-7,H-7);
  return cv.toDataURL("image/jpeg",0.88);               /* throws if a tile came without CORS */
}

/* ================= subsidy (PM Surya Ghar, domestic DCR) ================= */
function centralSubsidy(kw){ if(kw<=0) return 0; return Math.round(Math.min(kw,2)*30000 + Math.max(0,Math.min(kw,3)-2)*18000); }
function stateSubsidy(kw,region){
  if(kw<=0) return 0;
  if(region==="Chhattisgarh") return 30000;
  return kw>=3 ? 60000 : kw>=2 ? 50000 : 0;     /* Odisha: 60k for 3 kW+, 50k at 2 kW (price list) */
}


/* ================= option adders ================= */
function structAdder(p,key){
  const s=STRUCTS.find(x=>x.k===key); if(!p||!s) return null;
  for(const name of s.src){ const o=(p.structOpts||[]).find(x=>x[0]===name); if(o) return o[1]; }
  return null;                                   /* not in price list → manual */
}
function earthAdder(p,key){ if(!p) return null; const o=(p.earthOpts||[]).find(x=>x[0]===key); return o?o[1]:null; }


export function compute(S0){
  state=S0;
  const s=S0, p=product(), ml=isML();
  const kw=num(s.kw), g=num(s.gst)/100;
  const kwp = s.kwp!=="" && num(s.kwp)>0 ? num(s.kwp) : kw;
  const sa = s.structAdd!=="" ? num(s.structAdd) : (structAdder(p,s.structType) ?? 0);
  const ea = s.earthAdd!=="" ? num(s.earthAdd) : (earthAdder(p,s.earthType) ?? 0);
  const wi = p && p.wi && s.wiOn==="on" ? p.wi : 0;
  const man = p && p.comm && s.manPrice!=="" && num(s.manPrice)>0 ? num(s.manPrice) : 0;   /* NDCR: price typed by hand, GST included */
  const extras = (man?0:sa) + ea + wi + num(s.acAdd) + num(s.otherAdd);
  let base, amount, gstAmt, grand, perKw, whole=true;
  if(man) base=man;
  else if(p) base=pPrice(p);
  else if(s.priceMode==="total") base=num(s.rate);
  else { whole=extras!==0; const a=Math.round(num(s.rate)*kw*100)/100; base=a+Math.floor(a*g*100+1e-6)/100;
         if(!whole){ amount=a; gstAmt=Math.floor(a*g*100+1e-6)/100; grand=Math.floor(a+gstAmt+1e-6); perKw=num(s.rate); } }
  if(whole){ grand=Math.round(base+extras); amount=Math.round(grand/(1+g)); gstAmt=grand-amount; perKw=kw?amount/kw:0; }
  const listSub = p && p.sub>0;
  const subOn = s.subsidyOn==="on" || (s.subsidyOn==="auto" && (p ? listSub : (s.seg==="Domestic" && s.dcr==="DCR")));
  const cenAuto = listSub ? Math.min(p.sub,centralSubsidy(p.kw)) : centralSubsidy(kw);
  const sttAuto = listSub ? p.sub-cenAuto : stateSubsidy(kw,s.region);
  const cen = subOn ? (s.subCentral!==""?num(s.subCentral):cenAuto) : 0;
  const stt = subOn ? (s.subState!==""?num(s.subState):sttAuto) : 0;
  const subsidy=cen+stt, net=grand-subsidy;
  const projCost = s.projCost!=="" ? num(s.projCost) : net;
  const units=Math.round(kwp*num(s.genKw)), annual=Math.round(units*num(s.tariff));
  const payback = annual? Math.floor(projCost/annual*100)/100 : 0;
  const trees=Math.round(units*num(s.treeF)), co2=Math.round(kwp*num(s.co2F));
  const escal=num(s.escal)/100; let life=0, beYear=0; const cum=[];
  for(let y=1;y<=25;y++){ life+=annual*Math.pow(1+escal,y-1); cum.push(life); if(!beYear && life>=projCost) beYear=y; }
  const autoMods = num(s.wp)? Math.ceil(kwp*1000/num(s.wp)-1e-9):0;
  /* price-list count only while wattage and DC size are still the product's own; otherwise recalculate */
  const listMods = p && p.panels && num(s.wp)===p.pwatt && Math.abs(kwp-p.kwp)<1e-6;
  const modules = s.modules!=="" ? s.modules : (listMods ? p.panels : autoMods);
  const hyb = s.sys==="Hybrid";
  const bn=num(s.batCount), kwh = bn*num(s.batVolt)*num(s.batAh)/1000, dod=DOD[s.batType]||0.81, usable=kwh*dod;
  let fin=null;
  if(p && p.dp && s.finOn==="on"){
    const dp=ml?p.dpM:p.dp, loan=Math.max(0,net-dp), r=p.roi/1200, n=60;
    const emi=Math.round(loan*r/(1-Math.pow(1+r,-n)));
    fin={dp,loan,roi:p.roi,emi,save:Math.round(annual/12),cash:Math.round(annual/12)-emi};
  }
  return {p,ml,man,kw,kwp,g,sa:man?0:sa,ea,wi,extras,amount,gstAmt,grand,perKw,whole,subOn,cen,stt,subsidy,net,projCost,units,annual,payback,trees,co2,life:Math.round(life),beYear,cum,autoMods,modules,hyb,bn,kwh,dod,usable,fin};
}


function acFor(p){
  if(p.large) return "4C x 16 Sqmm";
  if(p.ph==="3ph") return (p.kw>=8 || p.sys==="Hybrid") ? "4C x 6 Sqmm" : "4C x 4 Sqmm";
  return (p.kw>=6 || (p.sys==="Hybrid" && p.bat && p.kw>=5)) ? "2C x 6 Sqmm" : "2C x 4 Sqmm";
}
export function applyProduct(S0,p){
  state=S0;
  const s=S0;
  s.prodCode=p.code; s.kw = p.large ? p.kwp : p.kw; s.kwp=p.kwp; s.phase=p.phase||s.phase;
  s.panelBrand=CAT_BRAND[p.brand]||s.panelBrand; s.cellType=p.pt||s.cellType;
  s.wp=p.pwatt||s.wp; s.modules=""; s.panelWar="25 Years";
  s.wiOn="off";
  const ib=invBrandFrom(p.inv); if(ib) s.invBrand=ib;
  s.invCount=1;
  if(p.large){
    if(p.inv2){ s.invModel=`${p.inv2[0]} kW + ${p.inv2[1]} kW On-grid string inverters`; s.invCount=2; }
    else s.invModel=`${p.kw} kW On-grid string inverter`;
  } else s.invModel = /hybrid/i.test(p.inv) ? p.inv : (p.batready ? `${p.kw} kW battery-ready hybrid inverter` : "");
  if(p.iw){ s.invWar=p.iw; s.wInv=(p.iw.match(/\d+/)||[s.wInv])[0]; }
  s.acSize=acFor(p); s.acBrand="Havells"; s.dcTxt2="Polycab 1C x 4 Sqmm"; s.ecTxt2="Multicore 16 Sqmm";
  if(p.bn){ s.batType=p.li?"Li-ion":"Lead Acid"; s.batCount=p.bn; s.batVolt=p.bv; s.batAh=p.bah; s.batWar=p.bwar||""; s.batMax=p.bmax?`${p.bmax} kW`:""; }
  else if(p.batready){ s.batCount=0; s.batWar=""; s.batMax=""; }
  s.structAdd=""; s.earthAdd=""; s.subCentral=""; s.subState=""; s.projCost=""; s.manPrice="";
  if(p.comm && !["Standard","RCC Structure","Sheet Roof"].includes(s.structType)) s.structType="Standard";
  const st=STRUCTS.find(x=>x.k===s.structType); if(st){ s.structSub= p.comm && s.structType==="Standard" ? "Ground Mount / RCC Ballast" : st.sub; s.structMat=st.mat; }
  s.descLine = "Roof Top Solar System Cost";
}


export function filtered(S0,useBrand=true){
  state=S0;
  const s=S0, q=s.q.trim().toLowerCase();
  return PRODUCTS.filter(p=>{
    if(p.seg!==s.seg || p.sys!==s.sys) return false;
    if(p.st && p.st!==s.region) return false;
    if(p.dcr!==s.dcr) return false;
    if(useBrand && s.brandF && p.brand!==s.brandF) return false;
    if(s.kwF && String(p.kw)!==String(s.kwF)) return false;
    if(q && !(p.c.toLowerCase().includes(q)||p.m.toLowerCase().includes(q)||p.desc.toLowerCase().includes(q))) return false;
    return true;
  });
}

export function setKey(S0,k,v){
  state=S0;
  const s=S0, prev=s[k]; s[k]=v;
  if(["seg","sys","region","dcr"].includes(k)){
    s.brandF=""; s.kwF="";
    if(k==="seg"){ s.dcr = v==="Domestic"?"DCR":"NDCR"; s.structType="Standard"; s.tariff = v==="Domestic"?7.5:8; }
    const p=product(); if(p && !filtered(s,false).includes(p)) s.prodCode="";   /* product no longer fits the filters */
    if(!s.prodCode){ const first=filtered(s,false)[0]; if(first) applyProduct(s,first); }
  }
  if(k==="brandF" && v){                       /* brand chip also switches the selected product to that brand (same size), so the rate follows the brand */
    const cur=product();
    if(!cur || cur.brand!==v){
      const c=filtered(s,true);
      const pick = cur ? (c.find(x=>x.kw===cur.kw && x.kwp===cur.kwp && x.ph===cur.ph) || c.find(x=>x.kw===cur.kw && x.ph===cur.ph)
                          || c.slice().sort((x,y)=>Math.abs(x.kwp-cur.kwp)-Math.abs(y.kwp-cur.kwp))[0]) : c[0];
      if(pick){ applyProduct(s,pick); }
    }
  }
  if(k==="structType"){ const st=STRUCTS.find(x=>x.k===v); if(st){ const p=product(); s.structSub = p&&p.comm&&v==="Standard" ? "Ground Mount / RCC Ballast" : st.sub; s.structMat=st.mat; } s.structAdd=""; }
  if(k==="earthType"){ s.earthAdd=""; if(v==="GI Strip") s.ecTxt2="GI Strip 25x3 mm"; else if(prev==="GI Strip") s.ecTxt2="Multicore 16 Sqmm"; }
  if(k==="wiOn"){ const p=product(); s.invBrand = v==="on" ? "WAAREE" : (p&&invBrandFrom(p.inv)) || s.invBrand; }
  return s;
}

function sizeMismatch(c){
  const p=c.p; if(!p||!p.comm||c.man) return null;
  if(Math.abs(c.kwp-p.kwp)<=p.kwp*0.005) return null;
  const near=PRODUCTS.filter(x=>x.comm&&x.brand===p.brand).sort((a,b)=>Math.abs(a.kwp-c.kwp)-Math.abs(b.kwp-c.kwp)||a.kw-b.kw).slice(0,3);
  return {near};
}

export function renderDocument(d, S0, m){
  state=S0; media={logos:{},panelImg:{},invImg:{},struct:{},map:null,design:null,...(m||{})}; doc=d;
  doc.querySelectorAll("[data-src]").forEach(el=>{ const v=ASSETS[el.dataset.src]; if(v && el.getAttribute("src")!==v) el.setAttribute("src",v); });
  const c=compute(S0), s=S0, p=c.p;
  const panelL=BRAND_LABEL[s.panelBrand]||s.panelBrand, invL=BRAND_LABEL[s.invBrand]||s.invBrand;
  const phaseTxt = s.phase==="3ph"?"3 Phase":"1 Phase";
  const batReady = c.hyb && !c.bn;
  const sysWord = c.hyb ? (batReady?"On-Grid (battery-ready)":"Hybrid") : "On-Grid";
  const idealU = Math.round(c.units/12/10)*10;
  const B = {
    ...s, date:fmtDate(s.date), kwTxt:`${kwStr(c.kw)} KW`, sysWord,
    salute:`${(s.contact||s.cust).trim()} Ji ,`,
    perKw:inr(c.perKw,2), amount:inr(c.amount,c.whole?0:2), gstAmt:inr(c.gstAmt,c.whole?0:2), grand:inr(c.grand),
    gst:kwStr(num(s.gst)), panelBrandTxt:panelL, invBrandTxt:invL, modulesN:String(c.modules),
    kwpTxt:`${kwStr(c.kwp)} kWp`,
    dcLine: p&&p.large ? `Inverter (AC) ${p.kw} kW · ${c.modules} × ${s.wp} Wp` : `DC ${kwStr(c.kwp)} kWp · ${c.modules} × ${s.wp} Wp`,
    invLine: `${invL}${num(s.invCount)>1?" × "+s.invCount:""} · ${phaseTxt}`,
    structType: p&&p.comm ? (NDCR_STRUCT[s.structType]||s.structType) : s.structType.replace(/ \d mtr$/,""),
    invType: c.hyb ? (batReady?"Battery-ready Hybrid Inverter":"Hybrid Inverter") : (s.phase==="3ph"?"String Inverter (3 Phase)":"String Inverter"),
    descSub: `${p&&!c.man&&!sizeMismatch(c)?pCode(p)+(c.wi?"-WI":"")+" · ":""}${panelL} ${s.dcr} · ${sysWord} · ${phaseTxt}`,
    subLbl: `Less: PM Surya Ghar Subsidy (Central ₹ ${inr(c.cen)} + ${s.region} State ₹ ${inr(c.stt)})`,
    subAmt: `(-) ${inr(c.subsidy)}`, netAmt: inr(c.net),
    acTxt: `${s.acBrand} ${s.acSize} ${s.acMat}`, dcTxt: s.dcTxt2, ecTxt: s.ecTxt2,
    earthTxt: `${s.earthType} – ${s.bosTxt}`,
    batType: s.batType, batCount: String(s.batCount), batRating:`${s.batVolt} V × ${s.batAh} Ah`,
    batKwh: `${(Math.round(c.kwh*100)/100)} kWh`, batDod:`≈ ${Math.round(c.usable*10)/10} kWh`,
    batUnits: `≈ ${Math.round(c.usable*10)/10} hours @ 1 kW load`, batWar: s.batWar||"As per manufacturer", batMax: s.batMax||"As per inverter rating",
    kwNum: kwStr(c.kw), validTill: fmtDate(addDays(s.date,30)),
    sysLine: `${panelL} ${s.dcr} · ${phaseTxt}`,
    segSys: `${s.seg} · ${sysWord}`, dcrPhase: `${s.dcr} · ${phaseTxt}`,
    genTxt: `${inr(c.units)} units / year`,
    escTxt: num(s.escal) ? `; long-term chart assumes ${kwStr(num(s.escal))}% yearly tariff increase` : "",
    gstSplit: (()=>{ const g=num(s.gst), sup=Math.round((g-0.3*18)/0.7*100)/100; return sup>0?`(${kwStr(sup)}% on 70% supply + 18% on 30% installation)`:""; })(),
    idealUnits: `${inr(idealU)} units`, idealBill: `₹ ${inr(Math.round(idealU*num(s.tariff)/100)*100)}`,
    idealArea: `${inr(p&&p.area?p.area:Math.round(c.kwp*num(s.sqftKw)/10)*10)} sq ft`
  };
  doc.querySelectorAll("[data-b]").forEach(el=>{ el.textContent = B[el.dataset.b] ?? ""; });
  doc.querySelectorAll("[data-list]").forEach(el=>{
    const lines=String(s[el.dataset.list]||"").split("\n").map(x=>x.trim()).filter(Boolean);
    el.innerHTML=lines.map((l,i)=>`<li>${el.dataset.num?(i+1)+". ":(el.dataset.bullet||"")}${esc(l)}</li>`).join("");
  });
  $("bankBlk").innerHTML=String(s.bankTxt).split("\n").filter(x=>x.trim()).map(l=>{
    const [a,b]=l.split("|"); return `<div><span>${esc(a.trim().replace(/\s*:$/,""))}</span><b>${esc((b||"").trim())}</b></div>`;}).join("");

  /* brand logo, or a dashed space kept for it until the logo is uploaded */
  const brandBlock=(name,label)=>{ const l=logoOf(name);
    return l?`<img src="${l}" alt="${esc(label)}">`:`<div class="logo-slot">${esc(label.toUpperCase())}<small>logo</small></div>`; };
  $("panelLogo").innerHTML=brandBlock(s.panelBrand,panelL);
  $("invLogo").innerHTML=brandBlock(s.invBrand,invL);
  $("batLogo").innerHTML=brandBlock(s.invBrand,invL);
  const mr=$("invModelRow"); mr.hidden=!String(s.invModel).trim(); mr.nextElementSibling.hidden=mr.hidden;
  const cb=String(s.cable).toUpperCase().split(/[\/,&]+/).map(x=>x.trim()).filter(Boolean);
  $("cableLogos").innerHTML=cb.map(n=>brandBlock(n,n.charAt(0)+n.slice(1).toLowerCase()).replace('class="logo-slot"','class="logo-slot" style="width:80px;height:30px;font-size:9px"')).join("");
  doc.querySelectorAll(".pg-foot").forEach(f=>f.innerHTML=`<span>Urjacon Infratech Pvt Ltd · Thana Chowk, Saraipali, Mahasamund (CG) 493558</span><span>${esc(s.prepPhone)} · Sales@urjacon.com · www.urjacon.com</span>`);
  $("batBlk").hidden=!c.hyb || !c.bn;

  /* images */
  const st=STRUCTS.find(x=>x.k===s.structType)||STRUCTS[0];
  const img = { map: media.map || ASSETS.map, struct: media.struct[s.structType] || ASSETS[st.img],
    panelImg: media.panelImg[s.panelBrand] || ASSETS.panel, invImg: media.invImg[s.invBrand] || ASSETS.inverter, design: media.design || "" };
  doc.querySelectorAll("[data-img]").forEach(el=>{ const v=img[el.dataset.img]; if(v && el.src!==v) el.src=v; });
  const has3d=!!img.design;
  $("d3Wrap").hidden=!has3d; $("locWrap").classList.toggle("w3d",has3d);
  const lk=$("d3Link"); lk.hidden=!s.designLink.trim(); if(s.designLink.trim()) lk.href=s.designLink.trim();

  /* site location: QR + link on the Project Location page */
  const L=siteLoc(s.locLink), lq=$("locQr"); lq.hidden=!L;
  if(L){ const qr=qrDataUrl(L.url);
    lq.innerHTML=`${qr?`<img src="${qr}" alt="QR">`:""}<div><b>Site location</b><span>${L.lat!=null?`${L.lat.toFixed(5)}° N, ${L.lng.toFixed(5)}° E`:esc(L.text||s.addr||"")}</span><a href="${esc(L.url)}" target="_blank" rel="noopener">Open in Google Maps &#x2197;</a><em>Scan the QR to reach the site</em></div>`; }

  /* cover facts + glance */
  const costLbl = c.subsidy ? "Net cost after subsidy" : "Project cost";
  $("cvFacts").innerHTML=[`${c.modules} × ${s.wp} Wp panels`,`${invL} inverter`,`${inr(c.units)} units / year`].map(x=>`<span>${esc(x)}</span>`).join("");
  $("glance").innerHTML=[
    ["Plant capacity",`${kwStr(c.kw)} kW`,`${sysWord} · ${phaseTxt}`],
    ["Solar modules",`${c.modules} × ${s.wp} Wp`,`${panelL} · ${s.cellType}`],
    ["Inverter",invL,B.invType],
    ["Yearly generation",`${inr(c.units)} units`,`≈ ${inr(Math.round(c.units/12))} units / month`],
    (s.seg==="Commercial" && !c.subsidy) ? ["Project cost",`₹ ${inr(Math.round(c.amount))}`,"Excluding GST"]
      : [costLbl,`₹ ${inr(c.projCost)}`,c.subsidy?`Total ₹ ${inr(c.grand)} − subsidy ₹ ${inr(c.subsidy)}`:"Inclusive of GST"],
    ["Payback",`${c.payback.toFixed(1)} years`,`Saves ≈ ₹ ${inr(c.annual)} / year`]
  ].map(([k,v,x],i)=>`<div class="${i>3?"hot":""}"><span>${k}</span><b>${esc(v)}</b><em>${esc(x)}</em></div>`).join("");

  /* included services (price list service highlights) */
  $("svc").innerHTML=[
    "Inclusive of GST &amp; department fee", "25 years panel performance warranty", `${esc(s.wInv)} years inverter warranty`, `${esc(s.wBos)} years onsite service warranty`,
    "All civil &amp; wiring work included", c.subsidy?"Assistance in getting subsidy":"Assistance in net-metering", "Assistance in bank finance", "No hidden cost"
  ].map(x=>`<div>${x}</div>`).join("");

  /* quotation: subsidy rows, pay-flow, notes, finance */
  $("subRows").hidden=!c.subsidy;
  const fl=$("flow"); fl.hidden=!c.subsidy;
  if(c.subsidy) fl.innerHTML=`<div><span>You pay UrjaCon</span><b>₹ ${inr(c.grand)}</b><em>Total incl. GST</em></div><i>−</i>
    <div class="g"><span>Subsidy to your bank a/c</span><b>₹ ${inr(c.subsidy)}</b><em>PM Surya Ghar · Central + State</em></div><i>=</i>
    <div class="k"><span>Your effective cost</span><b>₹ ${inr(c.net)}</b><em>for ${kwStr(c.kw)} kW ${esc(sysWord)}</em></div>`;
  const notes=[];
  if(c.subsidy){
    notes.push(`Eligible for PM Surya Ghar Muft Bijli Yojana subsidy of ₹ ${inr(c.subsidy)} (Central ₹ ${inr(c.cen)} + ${s.region} State ₹ ${inr(c.stt)}) for ${kwStr(c.kw)} KW domestic DCR system.`);
    notes.push(p&&p.payopt==="Cheque" ? `Cheque option: customer pays the net cost ₹ ${inr(c.net)} and gives a cheque equal to the subsidy amount ₹ ${inr(c.subsidy)}.`
      : `Subsidy is credited by the Government directly to the consumer's bank account after installation and net-metering; Total Payable is payable to Urjacon.`);
  }
  if(c.hyb && c.bn) notes.push(`Battery backup: ${s.batCount} × ${s.batVolt}V ${s.batAh}Ah ${s.batType} = ${Math.round(c.kwh*100)/100} kWh, usable ≈ ${Math.round(c.usable*10)/10} units (1 kW load for ~${Math.round(c.usable*10)/10} hours).`);
  if(batReady) notes.push(`Battery-ready hybrid inverter included — a battery bank can be added later for backup.`);
  if(num(s.expandKw)) notes.push(`This plant is expandable up to ${kwStr(num(s.expandKw))} KW`);
  String(s.noteTxt||"").split("\n").map(x=>x.trim()).filter(Boolean).forEach(x=>notes.push(x));
  $("noteBlk").hidden=!notes.length;
  $("noteLines").innerHTML=notes.map(n=>`<div>${esc(n)}</div>`).join("");
  const fb=$("finBlk"); fb.hidden=!c.fin;
  if(c.fin){ const f=c.fin;
    fb.innerHTML=`<div class="fin-h"><b>Easy bank finance option</b><span>5 years · ${f.roi}% p.a. · indicative, subject to bank approval</span></div>
    <div class="fin-g"><div><span>Down payment</span><b>₹ ${inr(f.dp)}</b></div><div><span>Loan amount</span><b>₹ ${inr(f.loan)}</b></div>
    <div class="e"><span>EMI / month</span><b>₹ ${inr(f.emi)}</b></div><div><span>Solar saving / month</span><b>₹ ${inr(f.save)}</b></div>
    <div class="${f.cash>=0?"p":"n"}"><span>${f.cash>=0?"Extra in pocket / month":"Net outgo / month"}</span><b>₹ ${inr(Math.abs(f.cash))}</b></div></div>`; }
  doc.querySelector(".qt .muted[data-b=gstSplit]").hidden = s.gstSplitOn!=="on";
  doc.querySelector(".ideal").hidden = s.suitOn!=="on";

  /* savings */
  const tiles=[
    ["ic_payback","Payback Period",`${c.payback.toFixed(2)} Years`,1],
    ["ic_gen","Yearly Generation",`${inr(c.units)} Units`,0],
    ["ic_save","Annual Savings",`₹ ${inr(c.annual)}`,1],
    ["ic_cost",c.subsidy?"Net Project Cost":"Project Cost",`₹ ${inr(c.projCost)}`,0],
    ["ic_tree","Trees Saved",`${inr(c.trees)}`,0],
    ["ic_co2","CO₂ Reduction",`${inr(c.co2)} Tonnes`,0]];
  $("savTiles").innerHTML=tiles.map(([ic,l,v,hot])=>`<div class="tile${hot?" hot":""}"><img src="${ASSETS[ic]}" alt=""><div><span>${l}</span><b>${v}</b></div></div>`).join("");
  if(s.chartType==="bill25"){ drawBill25(c.annual, num(s.escal)/100); $("chTitle").textContent="Electricity bill: before vs after solar"; $("chSub").textContent="25 years"; }
  else { drawChart(c.annual); $("chTitle").textContent="Monthly savings"; $("chSub").textContent=`≈ ₹ ${inr(Math.round(c.annual/12))} average per month`; }
  drawBreakEven(c); $("beSub").textContent=`25-year savings ≈ ₹ ${lakh(c.life)}`;

  /* warranty strip + kit + recap */
  const ws=[["Solar panels",`${s.wPerf} Years`,"Linear performance warranty"],["Inverter",`${s.wInv} Years`,"Manufacturer warranty"],["Onsite service",`${s.wBos} Years`,"Balance of system &amp; workmanship"]];
  if(c.hyb && c.bn && s.batWar) ws.push(["Battery",esc(s.batWar),"Manufacturer warranty"]);
  $("wstrip").innerHTML=ws.map(([k,v,x])=>`<div><span>${k}</span><b>${v}</b><em>${x}</em></div>`).join("");
  const kit=[["Solar modules",`${c.modules} × ${s.wp} Wp ${esc(panelL)}`],["Inverter",`${esc(invL)}${s.invModel?" · "+esc(s.invModel):""}`],["Mounting structure",`${esc(B.structType)} · ${esc(s.structMat)}`],
    ["AC &amp; DC cabling",esc(s.cable)],["ACDB / DCDB &amp; protection","MCB, SPD, fuses"],["Earthing &amp; lightning arrestor",`${esc(s.earthType)} earthing kit`]];
  if(c.hyb && c.bn) kit.push(["Battery bank",`${s.batCount} × ${s.batVolt}V ${s.batAh}Ah ${esc(s.batType)}`]);
  kit.push(["Net-metering",c.subsidy?"Application, subsidy &amp; DISCOM liaison":"Application &amp; DISCOM liaison"]);
  $("kit").innerHTML=kit.map(([k,v],i)=>`<div><i>${i+1}</i><div><b>${k}</b><span>${v}</span></div></div>`).join("");
  $("recap").innerHTML=`<div><span>Proposal</span><b>${esc(s.ref)}</b></div><div><span>System</span><b>${kwStr(c.kw)} kW ${esc(sysWord)}</b></div><div><span>Total payable</span><b>₹ ${inr(c.grand)}</b></div>${c.subsidy?`<div><span>Net after subsidy</span><b>₹ ${inr(c.net)}</b></div>`:""}<div><span>Valid until</span><b>${B.validTill}</b></div>`;

}

/* ================= charts ================= */
function niceStep(max,n){ const raw=max/n, mag=Math.pow(10,Math.floor(Math.log10(raw||1))), r=raw/mag; return (r<=1?1:r<=2?2:r<=2.5?2.5:r<=5?5:10)*mag; }
const axLbl = v => v>=1e7 ? (v/1e7).toFixed(v%1e7?1:0)+" Cr" : v>=1e5 ? (v/1e5).toFixed(v%1e5?1:0)+" L" : inr(Math.round(v));
function drawChart(annual){
  const W=985,L=92,R=965,T=24,B=340, sum=MONTH_PROFILE.reduce((a,b)=>a+b,0);
  const vals=MONTH_PROFILE.map(v=>annual*v/sum), max=Math.max(...vals,1), step=niceStep(max,5), top=Math.ceil(max/step)*step;
  const y=v=>B-(v/top)*(B-T), bw=(R-L)/12;
  const months=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  let g="";
  for(let v=0; v<=top+1e-6; v+=step){ g+=`<line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" stroke="#ececec"/><text x="${L-12}" y="${y(v)+5}" text-anchor="end" font-size="15" fill="#777">₹ ${axLbl(v)}</text>`; }
  const hi=Math.max(...vals);
  vals.forEach((v,i)=>{ const x=L+i*bw+bw*0.16, w=bw*0.68;
    g+=`<rect x="${x}" y="${y(v)}" width="${w}" height="${B-y(v)}" rx="5" fill="${v===hi?"#141414":"#FDBA42"}"/><text x="${x+w/2}" y="${y(v)-8}" text-anchor="middle" font-size="13.5" font-weight="600" fill="#444">${axLbl(v)}</text><text x="${x+w/2}" y="${B+24}" text-anchor="middle" font-size="15.5" fill="#666">${months[i]}</text>`; });
  g+=`<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="#bbb"/>`;
  const sv=$("chart"); sv.setAttribute("viewBox","0 0 985 380"); sv.innerHTML=g;
}
function drawBill25(annual, es){
  const L=92,R=965,T=40,B=330, before=[], after=[];
  for(let i=0;i<25;i++){ const b=annual*Math.pow(1+es,i); before.push(b); after.push(b*0.03); }
  const max=Math.max(...before,1), step=niceStep(max,5), top=Math.ceil(max/step)*step, y=v=>B-(v/top)*(B-T), bw=(R-L)/25;
  let g="";
  for(let v=0; v<=top+1e-6; v+=step){ g+=`<line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" stroke="#ececec"/><text x="${L-12}" y="${y(v)+5}" text-anchor="end" font-size="15" fill="#777">₹ ${axLbl(v)}</text>`; }
  before.forEach((v,i)=>{ const x=L+i*bw; g+=`<rect x="${x+bw*0.16}" y="${y(v)}" width="${bw*0.34}" height="${B-y(v)}" rx="2" fill="#FDBA42"/><rect x="${x+bw*0.54}" y="${y(after[i])}" width="${bw*0.3}" height="${B-y(after[i])}" rx="2" fill="#141414"/><text x="${x+bw/2}" y="${B+22}" text-anchor="middle" font-size="14" fill="#666">${i+1}</text>`; });
  g+=`<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="#bbb"/><rect x="${L+8}" y="6" width="26" height="12" rx="2" fill="#FDBA42"/><text x="${L+42}" y="17" font-size="15" fill="#666">Bill before solar</text><rect x="${L+190}" y="6" width="26" height="12" rx="2" fill="#141414"/><text x="${L+224}" y="17" font-size="15" fill="#666">Bill after solar</text><text x="${(L+R)/2}" y="${B+46}" text-anchor="middle" font-size="14.5" fill="#777">Year</text>`;
  const sv=$("chart"); sv.setAttribute("viewBox","0 0 985 385"); sv.innerHTML=g;
}
function drawBreakEven(c){
  const L=92,R=965,T=30,B=262, cum=c.cum, inv=c.projCost;
  const max=Math.max(cum[24],inv,1), step=niceStep(max,4), top=Math.ceil(max/step)*step, y=v=>B-(v/top)*(B-T), bw=(R-L)/25;
  let g="";
  for(let v=0; v<=top+1e-6; v+=step){ g+=`<line x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}" stroke="#ececec"/><text x="${L-12}" y="${y(v)+5}" text-anchor="end" font-size="15" fill="#777">₹ ${axLbl(v)}</text>`; }
  cum.forEach((v,i)=>{ const x=L+i*bw+bw*0.17, w=bw*0.66, paid=c.beYear && i+1>=c.beYear;
    g+=`<rect x="${x}" y="${y(v)}" width="${w}" height="${Math.max(1,B-y(v))}" rx="3" fill="${paid?"#FDBA42":"#d9d9d9"}"/>`;
    if((i+1)%5===0||i===0||i+1===c.beYear) g+=`<text x="${x+w/2}" y="${B+22}" text-anchor="middle" font-size="14.5" font-weight="${i+1===c.beYear?700:400}" fill="${i+1===c.beYear?"#141414":"#666"}">${i+1}</text>`; });
  g+=`<line x1="${L}" x2="${R}" y1="${B}" y2="${B}" stroke="#bbb"/>`;
  if(inv>0){ const yy=y(inv);
    g+=`<line x1="${L}" x2="${R}" y1="${yy}" y2="${yy}" stroke="#141414" stroke-width="2" stroke-dasharray="7 5"/>`;
    const lbl=`Your investment ₹ ${inr(inv)}${c.beYear?` · recovered in year ${c.beYear}`:""}`, tw=lbl.length*8.3+22, tx=L+14, ty=Math.max(22,yy-32);
    g+=`<rect x="${tx}" y="${ty}" width="${tw}" height="24" rx="4" fill="#141414"/><text x="${tx+tw/2}" y="${ty+17}" text-anchor="middle" font-size="14.5" font-weight="600" fill="#FDBA42">${lbl}</text>`; }
  g+=`<rect x="${L+8}" y="4" width="26" height="12" rx="2" fill="#d9d9d9"/><text x="${L+42}" y="15" font-size="14.5" fill="#666">Recovering investment</text><rect x="${L+236}" y="4" width="26" height="12" rx="2" fill="#FDBA42"/><text x="${L+270}" y="15" font-size="14.5" fill="#666">Pure savings (cumulative)</text><text x="${(L+R)/2}" y="${B+46}" text-anchor="middle" font-size="14.5" fill="#777">Year</text>`;
  const sv=$("chartBE"); sv.setAttribute("viewBox","0 0 985 315"); sv.innerHTML=g;
}

/* ================= misc builders ================= */

export { DEF, STRUCTS, EARTHS, AC_SIZES, BASE_BRANDS, BRAND_LABEL, CAT_BRAND, PRODUCTS, NDCR_STRUCT, DOD, ST_SHORT, inr, num, kwStr, lakh, today, addDays, fmtDate, siteLoc, structAdder, earthAdder, invBrandFrom, geoSearch, buildMap, sizeMismatch };
