let h=null;
async function init(){const[t]=await chrome.tabs.query({active:!0,currentWindow:!0});if(t?.url)try{const u=new URL(t.url);u.protocol==="http:"||u.protocol==="https:"?(h=u.hostname,D("dom").textContent=h):(D("dom").textContent="—",D("cw").style.display="none")}catch{D("dom").textContent="—";D("cw").style.display="none"}load()}
function D(i){return document.getElementById(i)}
function load(){chrome.storage.sync.get(["sites","globalEnabled"],d=>{const g=d.globalEnabled!==!1,s=d.sites||{};D("gt").checked=g;h?(D("ct").checked=s[h]!==void 0?s[h]:g,us(D("ct").checked)):us(!1);render(s)})}
function render(s){const e=Object.entries(s).sort((a,b)=>a[0].localeCompare(b[0])),sl=D("sl");if(!e.length){sl.innerHTML='<div class="emp">個別設定はありません</div>';return}sl.innerHTML="";for(const[d,v]of e){const i=document.createElement("div");i.className="item";const n=document.createElement("span");n.className="idom";n.textContent=d;const t=document.createElement("label");t.className="tog";const c=document.createElement("input");c.type="checkbox";c.checked=v;c.onchange=()=>ss(d,c.checked);const sp=document.createElement("span");t.append(c,sp);const r=document.createElement("button");r.className="irm";r.textContent="✕";r.onclick=()=>rs(d);i.append(n,t,r);sl.appendChild(i)}}
function ss(d,v){chrome.storage.sync.get(["sites"],x=>{const s=x.sites||{};s[d]=v;chrome.storage.sync.set({sites:s},()=>{d===h&&us(v)})})}
function rs(d){chrome.storage.sync.get(["sites"],x=>{const s=x.sites||{};delete s[d];chrome.storage.sync.set({sites:s},load)})}
function us(on){D("d").className="dot "+(on?"on":"off");D("st").textContent=on?"有効 — Ctrl+Enterで送信":"無効 — 通常動作"}
D("ct").onchange=()=>{h&&(ss(h,D("ct").checked),setTimeout(load,100))};
D("gt").onchange=()=>chrome.storage.sync.set({globalEnabled:D("gt").checked},load);
D("ca").onclick=()=>{confirm("すべてのサイト個別設定を削除しますか？")&&chrome.storage.sync.set({sites:{}},load)};
init();
