import{j as e}from"./index-CEgXaN74.js";import{r as C}from"./vendor-react-CYp-4i8T.js";import"./vendor-deckgl-DlOxSbWe.js";import"./vendor-ui-CJnwd1W6.js";import"./vendor-icons-D-GSsNZj.js";const v={no_signal:"#E24B4A",call_drop:"#EF9F27",poor_throughput:"#378ADD",slow_data:"#1D9E75",sms_fail:"#7F77DD"},f={jio:"#378ADD",airtel:"#E24B4A",vi:"#7F77DD",bsnl:"#1D9E75"},h={no_signal:"No signal",call_drop:"Call drop",poor_throughput:"Poor throughput",slow_data:"Slow data",sms_fail:"SMS failure"},u=["jio","airtel","vi","bsnl"],y={jio:"Jio",airtel:"Airtel",vi:"Vi",bsnl:"BSNL"},B=["Delhi","Mumbai","Bangalore","Chennai","Kolkata","Pune","Hyderabad"];function c(o,r){return Math.floor(Math.random()*(r-o+1))+o}function A(o,r,a){const t={jio:4800,airtel:4100,vi:3200,bsnl:2100},l={no_signal:.24,call_drop:.22,poor_throughput:.2,slow_data:.19,sms_fail:.15},s={Delhi:.2,Mumbai:.22,Bangalore:.17,Chennai:.15,Kolkata:.13,Pune:.07,Hyderabad:.06};let d=0;const i={},b={},x={};return u.forEach(n=>{let g=t[n]+c(-200,200);if(o!=="all"&&o!==n){x[n]=0;return}x[n]=g,d+=g,Object.keys(h).forEach(p=>{if(a!=="all"&&a!==p)return;let D=Math.round(g*l[p]*(.85+Math.random()*.3));i[p]=(i[p]||0)+D})}),B.forEach(n=>{r!=="all"&&n.toLowerCase()!==r||(b[n]=Math.round(d*s[n]*(.8+Math.random()*.4)))}),{total:d,byType:i,byCircle:b,byOp:x}}function N(){const o=[],r=[];for(let a=29;a>=0;a--){const t=new Date(Date.now()-a*864e5);r.push(t.toLocaleDateString("en-IN",{day:"2-digit",month:"short"})),o.push(c(80,320))}return{labels:r,values:o}}const S=[{time:"2m ago",op:"Airtel",issue:"No signal",circle:"Delhi",sev:"crit"},{time:"7m ago",op:"Jio",issue:"Call drop",circle:"Mumbai",sev:"high"},{time:"12m ago",op:"Vi",issue:"Poor throughput",circle:"Bangalore",sev:"high"},{time:"18m ago",op:"BSNL",issue:"Slow data",circle:"Kolkata",sev:"med"},{time:"23m ago",op:"Airtel",issue:"SMS failure",circle:"Chennai",sev:"med"},{time:"31m ago",op:"Jio",issue:"No signal",circle:"Pune",sev:"crit"}],$={jio:{resolution:91,response:4.2,escalated:3},airtel:{resolution:88,response:5.1,escalated:5},vi:{resolution:78,response:7.8,escalated:9},bsnl:{resolution:65,response:11.2,escalated:14}};let j,w,k;function E(){[j,w,k].forEach(o=>{o&&o.destroy()})}function F(o){const r=document.getElementById("metrics"),a=[{label:"Total complaints",val:o.total.toLocaleString("en-IN"),delta:"+12% vs last month",cls:"up"},{label:"Avg resolution time",val:"6.8 hrs",delta:"-0.4 hrs vs last month",cls:"down"},{label:"Call drop rate",val:"18.3%",delta:"+1.2% vs last month",cls:"up"},{label:"Active reporters",val:"24,810",delta:"+8% vs last month",cls:"down"}];r.innerHTML=a.map(t=>`<div class="mcard"><div class="mlabel">${t.label}</div><div class="mval">${t.val}</div><div class="mdelta ${t.cls}">${t.delta}</div></div>`).join("")}function M(o){const r=document.getElementById("opBars"),a=Math.max(...Object.values(o.byOp).filter(t=>t>0))||1;r.innerHTML=u.map(t=>{const l=o.byOp[t]||0,s=Math.round(l/a*100);return`<div class="hbar-row"><div class="hbar-label">${y[t]}</div><div class="hbar-track"><div class="hbar-fill" style="width:${s}%;background:${f[t]}"></div></div><div class="hbar-val">${(l/1e3).toFixed(1)}k</div></div>`}).join("")}function L(o){const r=document.getElementById("circleBars"),a=Object.entries(o.byCircle).sort((l,s)=>s[1]-l[1]),t=a[0]?a[0][1]:1;r.innerHTML=a.map(([l,s])=>{const d=Math.round(s/t*100);return`<div class="hbar-row"><div class="hbar-label">${l}</div><div class="hbar-track"><div class="hbar-fill" style="width:${d}%;background:#378ADD"></div></div><div class="hbar-val">${(s/1e3).toFixed(1)}k</div></div>`}).join("")}function z(){const o=document.getElementById("recentTbl");o.innerHTML=S.map(r=>`<tr><td style="color:var(--color-text-secondary)">${r.time}</td><td>${r.op}</td><td>${r.issue}</td><td>${r.circle}</td><td><span class="pill ${r.sev}">${r.sev==="crit"?"Critical":r.sev==="high"?"High":"Medium"}</span></td></tr>`).join("")}function _(){const o=document.getElementById("slaRows");o.innerHTML=u.map(r=>{const a=$[r],t=a.resolution>=85?"#1D9E75":a.resolution>=75?"#BA7517":"#A32D2D";return`<div class="sparkline-row"><div style="width:8px;height:8px;border-radius:50%;background:${f[r]};flex-shrink:0;margin-top:4px"></div><div class="sp-info"><div class="sp-name">${y[r]}</div><div class="sp-sub">Avg response ${a.response}h · ${a.escalated} escalated</div></div><div style="text-align:right"><div class="sp-val" style="color:${t}">${a.resolution}%</div><div style="font-size:10px;color:var(--color-text-secondary)">resolution</div></div></div>`}).join("")}function O(){const o=document.getElementById("leg1");o.innerHTML=Object.entries(h).map(([r,a])=>`<span class="leg-item"><span class="leg-dot" style="background:${v[r]}"></span>${a}</span>`).join("")}function I(){const o=document.getElementById("leg2"),r=[{l:"2G",c:"#888780"},{l:"3G",c:"#EF9F27"},{l:"4G",c:"#378ADD"},{l:"5G",c:"#1D9E75"}];o.innerHTML=r.map(a=>`<span class="leg-item"><span class="leg-dot" style="background:${a.c}"></span>${a.l}</span>`).join("")}function m(){const o=document.getElementById("opFilter").value,r=document.getElementById("circleFilter").value,a=document.getElementById("typeFilter").value,t=A(o,r,a),l=N();F(t),M(t),L(t),O(),I(),z(),_(),E();const s=Object.keys(h);j=new window.Chart(document.getElementById("c1"),{type:"doughnut",data:{labels:s.map(i=>h[i]),datasets:[{data:s.map(i=>t.byType[i]||0),backgroundColor:s.map(i=>v[i]),borderWidth:0,hoverOffset:4}]},options:{responsive:!0,maintainAspectRatio:!1,cutout:"62%",plugins:{legend:{display:!1},tooltip:{callbacks:{label:i=>" "+i.label+": "+i.parsed.toLocaleString("en-IN")}}}}}),w=new window.Chart(document.getElementById("c2"),{type:"line",data:{labels:l.labels,datasets:[{data:l.values,borderColor:"#378ADD",borderWidth:2,pointRadius:0,tension:.4,fill:!0,backgroundColor:"rgba(55,138,221,0.08)"}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{x:{ticks:{maxTicksLimit:6,font:{size:10}},grid:{display:!1}},y:{ticks:{font:{size:10}},grid:{color:"rgba(128,128,128,0.1)"}}}}});const d=[c(8,15),c(12,20),c(45,60),c(18,30)];k=new window.Chart(document.getElementById("c3"),{type:"bar",data:{labels:["2G","3G","4G","5G"],datasets:[{data:d,backgroundColor:["#888780","#EF9F27","#378ADD","#1D9E75"],borderWidth:0,borderRadius:4}]},options:{responsive:!0,maintainAspectRatio:!1,plugins:{legend:{display:!1}},scales:{x:{ticks:{font:{size:11}},grid:{display:!1}},y:{ticks:{font:{size:10}},grid:{color:"rgba(128,128,128,0.1)"}}}}})}const J=()=>(C.useEffect(()=>(new Promise(r=>{if(window.Chart){r();return}const a=document.createElement("script");a.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",a.onload=r,document.head.appendChild(a)}).then(()=>m()),()=>E()),[]),e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        :root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f5f4f0;
          --color-background-tertiary: #eeece6;
          --color-text-primary: #1a1a18;
          --color-text-secondary: #5f5e5a;
          --color-border-tertiary: rgba(0,0,0,0.12);
          --color-border-secondary: rgba(0,0,0,0.22);
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
          --font-sans: system-ui, -apple-system, sans-serif;
        }
        @media (prefers-color-scheme: dark) {
          :root {
            --color-background-primary: #1e1e1c;
            --color-background-secondary: #2a2a27;
            --color-background-tertiary: #141412;
            --color-text-primary: #f0ede6;
            --color-text-secondary: #a8a69e;
            --color-border-tertiary: rgba(255,255,255,0.10);
            --color-border-secondary: rgba(255,255,255,0.20);
          }
        }
        .dash { width: 100%; padding: 1.5rem; font-family: var(--font-sans); color: var(--color-text-primary); }
        .topbar { display:flex; align-items:flex-start; justify-content:space-between; margin-bottom:1.25rem; flex-wrap:wrap; gap:8px; }
        .topbar h1 { font-size:20px; font-weight:500; color:var(--color-text-primary); }
        .topbar p { font-size:13px; color:var(--color-text-secondary); margin-top:3px; }
        .filters { display:flex; gap:8px; flex-wrap:wrap; align-items:center; }
        .filters select {
          font-size:13px; padding:6px 10px;
          border-radius:var(--border-radius-md);
          border:0.5px solid var(--color-border-secondary);
          background:var(--color-background-primary);
          color:var(--color-text-primary); cursor:pointer;
        }
        .badge { font-size:11px; padding:3px 8px; border-radius:999px; font-weight:500; }
        .badge.live { background:#E1F5EE; color:#0F6E56; }
        .metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:10px; margin-bottom:1.25rem; }
        .mcard { background:var(--color-background-secondary); border-radius:var(--border-radius-md); padding:12px 14px; }
        .mcard .mlabel { font-size:12px; color:var(--color-text-secondary); margin-bottom:4px; }
        .mcard .mval { font-size:22px; font-weight:500; color:var(--color-text-primary); }
        .mcard .mdelta { font-size:11px; margin-top:3px; }
        .mdelta.up { color:#A32D2D; } .mdelta.down { color:#0F6E56; }
        .row2 { display:grid; grid-template-columns:1.4fr 1fr; gap:12px; margin-bottom:12px; }
        .row3 { display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; margin-bottom:12px; }
        .row-last { display:grid; grid-template-columns:1fr 1fr; gap:12px; }
        .card {
          background:var(--color-background-primary);
          border:0.5px solid var(--color-border-tertiary);
          border-radius:var(--border-radius-lg);
          padding:1rem 1.1rem;
        }
        .card h3 { font-size:14px; font-weight:500; color:var(--color-text-primary); margin-bottom:12px; }
        .legend { display:flex; flex-wrap:wrap; gap:10px; margin-bottom:10px; }
        .leg-item { display:flex; align-items:center; gap:5px; font-size:11px; color:var(--color-text-secondary); }
        .leg-dot { width:10px; height:10px; border-radius:2px; flex-shrink:0; }
        .tbl { width:100%; border-collapse:collapse; font-size:12px; }
        .tbl th { text-align:left; color:var(--color-text-secondary); font-weight:400; padding:5px 8px; border-bottom:0.5px solid var(--color-border-tertiary); }
        .tbl td { padding:6px 8px; color:var(--color-text-primary); border-bottom:0.5px solid var(--color-border-tertiary); }
        .tbl tr:last-child td { border-bottom:none; }
        .pill { font-size:10px; padding:2px 7px; border-radius:999px; font-weight:500; display:inline-block; }
        .pill.crit { background:#FCEBEB; color:#A32D2D; }
        .pill.high { background:#FAEEDA; color:#854F0B; }
        .pill.med  { background:#E6F1FB; color:#185FA5; }
        .hbar-row { display:flex; align-items:center; gap:8px; margin-bottom:7px; font-size:12px; }
        .hbar-label { width:72px; color:var(--color-text-secondary); text-align:right; flex-shrink:0; font-size:11px; }
        .hbar-track { flex:1; height:8px; background:var(--color-background-secondary); border-radius:4px; overflow:hidden; }
        .hbar-fill { height:100%; border-radius:4px; }
        .hbar-val { width:32px; font-size:11px; color:var(--color-text-secondary); flex-shrink:0; }
        .sparkline-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; padding-bottom:10px; border-bottom:0.5px solid var(--color-border-tertiary); }
        .sparkline-row:last-child { border-bottom:none; margin-bottom:0; padding-bottom:0; }
        .sp-info { flex:1; }
        .sp-name { font-size:13px; font-weight:500; color:var(--color-text-primary); }
        .sp-sub { font-size:11px; color:var(--color-text-secondary); }
        .sp-val { font-size:15px; font-weight:500; color:var(--color-text-primary); text-align:right; min-width:36px; }
        @media (max-width: 768px) {
          .metrics { grid-template-columns: repeat(2, minmax(0,1fr)); }
          .row2, .row3, .row-last { grid-template-columns: 1fr; }
        }
      `}),e.jsxs("div",{className:"dash",children:[e.jsxs("div",{className:"topbar",children:[e.jsxs("div",{children:[e.jsx("h1",{children:"Network complaints dashboard"}),e.jsx("p",{children:"Crowdsourced reports across India · last 30 days"})]}),e.jsxs("div",{className:"filters",children:[e.jsxs("select",{id:"opFilter",onChange:()=>m(),children:[e.jsx("option",{value:"all",children:"All operators"}),e.jsx("option",{value:"jio",children:"Jio"}),e.jsx("option",{value:"airtel",children:"Airtel"}),e.jsx("option",{value:"vi",children:"Vi"}),e.jsx("option",{value:"bsnl",children:"BSNL"})]}),e.jsxs("select",{id:"circleFilter",onChange:()=>m(),children:[e.jsx("option",{value:"all",children:"All circles"}),e.jsx("option",{value:"delhi",children:"Delhi"}),e.jsx("option",{value:"mumbai",children:"Mumbai"}),e.jsx("option",{value:"bangalore",children:"Bangalore"}),e.jsx("option",{value:"chennai",children:"Chennai"}),e.jsx("option",{value:"kolkata",children:"Kolkata"})]}),e.jsxs("select",{id:"typeFilter",onChange:()=>m(),children:[e.jsx("option",{value:"all",children:"All issue types"}),e.jsx("option",{value:"no_signal",children:"No signal"}),e.jsx("option",{value:"call_drop",children:"Call drop"}),e.jsx("option",{value:"poor_throughput",children:"Poor throughput"}),e.jsx("option",{value:"slow_data",children:"Slow data"}),e.jsx("option",{value:"sms_fail",children:"SMS failure"})]}),e.jsx("span",{className:"badge live",children:"Live"})]})]}),e.jsx("div",{className:"metrics",id:"metrics"}),e.jsxs("div",{className:"row2",children:[e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Complaints by issue type"}),e.jsx("div",{className:"legend",id:"leg1"}),e.jsx("div",{style:{position:"relative",width:"100%",height:"220px"},children:e.jsx("canvas",{id:"c1"})})]}),e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Operator comparison"}),e.jsx("div",{id:"opBars"})]})]}),e.jsxs("div",{className:"row3",children:[e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Trend — last 30 days"}),e.jsx("div",{style:{position:"relative",width:"100%",height:"160px"},children:e.jsx("canvas",{id:"c2"})})]}),e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Network type breakdown"}),e.jsx("div",{className:"legend",id:"leg2"}),e.jsx("div",{style:{position:"relative",width:"100%",height:"140px"},children:e.jsx("canvas",{id:"c3"})})]}),e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Top circles"}),e.jsx("div",{id:"circleBars"})]})]}),e.jsxs("div",{className:"row-last",children:[e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Recent high-severity complaints"}),e.jsxs("table",{className:"tbl",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{children:"Time"}),e.jsx("th",{children:"Operator"}),e.jsx("th",{children:"Issue"}),e.jsx("th",{children:"Circle"}),e.jsx("th",{children:"Severity"})]})}),e.jsx("tbody",{id:"recentTbl"})]})]}),e.jsxs("div",{className:"card",children:[e.jsx("h3",{children:"Operator SLA snapshot"}),e.jsx("div",{id:"slaRows"})]})]})]})]}));export{J as default};
