let USE_STATIC_HP=true;
const STATIC_HP=72;
const MOCK_POINTS=[
 {t:"2025-08-26T08:00:00+09:00",hp:100},
 {t:"2025-08-26T12:00:00+09:00",hp:80},
 {t:"2025-08-26T16:00:00+09:00",hp:60},
 {t:"2025-08-26T20:00:00+09:00",hp:40},
 {t:"2025-08-27T00:00:00+09:00",hp:20}
];
let wrap,progress,percent,sub,c;
function create(){
 if(document.getElementById("hp-ext-widget"))return;
 wrap=document.createElement("div");
 wrap.id="hp-ext-widget";
 wrap.style.cursor="grab";
 const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
 svg.setAttribute("viewBox","0 0 100 100");
 svg.style.transform="rotate(-90deg)";
 svg.style.transformOrigin="50% 50%";
 const bg=document.createElementNS("http://www.w3.org/2000/svg","circle");
 bg.setAttribute("cx","50");
 bg.setAttribute("cy","50");
 bg.setAttribute("r","45");
 bg.setAttribute("class","ring-bg");
 progress=document.createElementNS("http://www.w3.org/2000/svg","circle");
 progress.setAttribute("cx","50");
 progress.setAttribute("cy","50");
 progress.setAttribute("r","45");
 progress.setAttribute("class","ring-fg");
 svg.appendChild(bg);
 svg.appendChild(progress);
 wrap.appendChild(svg);
 const center=document.createElement("div");
 center.className="hp-center";
 percent=document.createElement("div");
 percent.className="hp-percent";
 center.appendChild(percent);
 wrap.appendChild(center);
 sub=document.createElement("div");
 sub.className="hp-sub";
 wrap.appendChild(sub);
 document.body.appendChild(wrap);
 c=2*Math.PI*45;
 progress.style.strokeDasharray=c;
 progress.style.strokeDashoffset=c;
}
function update(){
 const hp=getHP();
 percent.textContent=hp+"%";
 progress.style.strokeDashoffset=c*(100-hp)/100;
 progress.style.stroke=hp>=60?"#4caf50":hp>=30?"#ff9800":"#f44336";
 sub.textContent=USE_STATIC_HP?"mock":new Date().toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"});
}
function getHP(){
 if(USE_STATIC_HP)return STATIC_HP;
 const now=new Date();
 let last=MOCK_POINTS[0].hp;
 for(const p of MOCK_POINTS){
  const pt=new Date(p.t);
  if(pt<=now)last=p.hp;else break;
 }
 return last;
}
function load(){
 chrome.storage.sync.get(["hpExtPos","hpExtMode"],res=>{
  if(res.hpExtPos){
   wrap.style.left=res.hpExtPos.left+"px";
   wrap.style.top=res.hpExtPos.top+"px";
  }else{
   wrap.style.right="16px";
   wrap.style.bottom="16px";
  }
  USE_STATIC_HP=res.hpExtMode==="timeline"?false:true;
  update();
 });
}
function drag(){
 let sx,sy,dragging=false;
 wrap.addEventListener("mousedown",e=>{
  e.preventDefault();
  const r=wrap.getBoundingClientRect();
  sx=e.clientX-r.left;
  sy=e.clientY-r.top;
  wrap.style.left=r.left+"px";
  wrap.style.top=r.top+"px";
  wrap.style.right="";
  wrap.style.bottom="";
  dragging=true;
  wrap.style.cursor="grabbing";
 });
 document.addEventListener("mousemove",e=>{
  if(!dragging)return;
  wrap.style.left=e.clientX-sx+"px";
  wrap.style.top=e.clientY-sy+"px";
 });
 document.addEventListener("mouseup",()=>{
  if(!dragging)return;
  dragging=false;
  wrap.style.cursor="grab";
  chrome.storage.sync.set({hpExtPos:{left:parseInt(wrap.style.left),top:parseInt(wrap.style.top)}});
 });
}
create();
load();
drag();
chrome.storage.onChanged.addListener(ch=>{
 if(ch.hpExtMode){
  USE_STATIC_HP=ch.hpExtMode.newValue==="timeline"?false:true;
  update();
 }
});
setInterval(update,30000);
