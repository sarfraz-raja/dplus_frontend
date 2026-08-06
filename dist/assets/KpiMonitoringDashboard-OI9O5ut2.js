import{u as Y,j as e,I as de,J as ne,L as ce,a as pe,U as be,K as S,N as ue,O as ke}from"./index-DdwJvUZd.js";import{u as me,l as I,r as s}from"./vendor-react-BzgCPtYD.js";import{o as ge}from"./commonFunnction-B-1Je1Ab.js";import{aU as he,aK as fe,aL as ve}from"./vendor-icons-CVtxk4Ds.js";function we({data:d=[],color:l="#378ADD",height:c=40,isDark:i=null}){const{theme:o}=Y(),p=typeof i=="boolean"?i:o==="dark",k=d.map(m=>m.value),a=d.map(m=>m.label),n={grid:{left:4,right:4,top:6,bottom:16},xAxis:{type:"category",data:a,boundaryGap:!1,axisLine:{show:!1},axisLabel:{fontSize:9,interval:Math.max(0,Math.ceil(a.length/10)-1)}},yAxis:{type:"value",show:!1},tooltip:{trigger:"axis"},series:[{type:"line",data:k,smooth:!0,symbol:"circle",symbolSize:3,itemStyle:{color:l,borderColor:"#ffffff",borderWidth:1.5},lineStyle:{width:1.5,color:l},areaStyle:{color:l,opacity:.08}}]};return e.jsx(de,{option:n,theme:ne(p),style:{height:c,width:"100%"},notMerge:!0,lazyUpdate:!0})}const xe={getLiveMonitoring:(d="")=>async l=>{const c=`${Date.now()}_${Math.random()}`;l(ce({requestId:c}));try{const i=await pe.get({url:`${be.kpiEngineLiveMonitoring}${d?"?"+d:""}`});if(!i){l(S({requestId:c,message:"Network error — could not reach the KPI Engine API (check connectivity/CORS)."}));return}if(i.status!==200){l(S({requestId:c,message:`KPI Engine API returned status ${i.status}.`}));return}const o=i.data,p=Array.isArray(o?.data)?o.data:Array.isArray(o?.data?.data)?o.data.data:Array.isArray(o)?o:null;if(!p){console.warn("[kpi-engine/live-monitoring] Unexpected response shape:",o),l(S({requestId:c,message:"Unexpected API response shape (see console)."}));return}if(p.length===0){l(S({requestId:c,message:null}));return}const k=o?.count??o?.data?.count??p.length;l(ue({requestId:c,data:p,count:k}))}catch(i){l(S({requestId:c,message:i?.message||"Failed to fetch live monitoring data"}))}}},u=d=>({type:"kpiLive",field:d}),O=[{i:"stat-0",x:0,y:0,w:24,h:14},{i:"stat-1",x:24,y:0,w:24,h:14},{i:"stat-2",x:48,y:0,w:24,h:14},{i:"stat-3",x:72,y:0,w:24,h:14},{i:"stat-4",x:96,y:0,w:24,h:14},{i:"stat-5",x:120,y:0,w:24,h:14},{i:"gauge-0",x:0,y:14,w:27,h:36},{i:"spark-0",x:27,y:14,w:29,h:36},{i:"spark-1",x:56,y:14,w:29,h:36},{i:"spark-2",x:85,y:14,w:30,h:36},{i:"spark-4",x:115,y:14,w:29,h:36},{i:"kpiTable-0",x:0,y:50,w:96,h:99},{i:"degraded-0",x:96,y:50,w:48,h:99},{i:"degraded-map-0",x:0,y:149,w:144,h:88}],ye={"stat-0":{type:"statCard",title:"Availability",dataSource:u("stats.0")},"stat-1":{type:"statCard",title:"Data Volume",dataSource:u("stats.1")},"stat-2":{type:"statCard",title:"Voice Traffic",dataSource:u("stats.2")},"stat-3":{type:"statCard",title:"Data SR",dataSource:u("stats.3")},"stat-4":{type:"statCard",title:"Voice DR",dataSource:u("stats.4")},"stat-5":{type:"statCard",title:"Voice SR",dataSource:u("stats.5")},"gauge-0":{type:"gaugeCard",title:"Availability (%)",dataSource:u("gauge")},"spark-0":{type:"sparklineCard",title:"Data Volume (MB)",dataSource:u("sparklines.0")},"spark-1":{type:"sparklineCard",title:"Voice Traffic",dataSource:u("sparklines.1")},"spark-2":{type:"sparklineCard",title:"Data SR (%)",dataSource:u("sparklines.2")},"spark-4":{type:"sparklineCard",title:"Voice SR (%)",dataSource:u("sparklines.4")},"degraded-map-0":{type:"degradedCellsMap",title:"Degraded Cells Map",dataSource:u("degradedCells")},"degraded-0":{type:"degradedCellsTable",title:"Top Degraded Cells",dataSource:u("degradedCells")},"kpiTable-0":{type:"kpiTable",title:"KPIs",dataSource:u("kpiTableProps")}},M="dy3-kpi-dashboard-grid-layout-v10",D={rna:{tint:"#72b0df",darkFrom:"#2a415b",darkTo:"#1c253a"},payload:{tint:"#dfd484",darkFrom:"#6a5736",darkTo:"#332a1a"},ul:{tint:"#95f7d0",darkFrom:"#213a41",darkTo:"#212539"},gauge:"#95f7d0",trend:"#72b0df",statusOk:"#34d399",statusWarn:"#f5c542",statusCrit:"#f2b155"},V={colorEnabled:!1,color:"#8b93a7",bold:!0,size:12},F={colorEnabled:!1,color:"#8b93a7",bold:!0,size:14},U={colorEnabled:!1,color:"#eef1f6",bold:!1,size:14},W={rna:"Availability / Data SR",payload:"Data Volume / Voice DR",ul:"Voice Traffic / Voice SR",gauge:"Availability gauge",trend:"Table trend line",statusOk:"Status: OK",statusWarn:"Status: Warning",statusCrit:"Status: Critical"},Ne={technology:["2G","3G","4G","5G"],region:["Lilongwe","Blantyre","Mzuzu","Zomba"],siteName:["TN20232_4G_BULI_TC","TN20455_5G_KAWALE","TN18820_4G_NDIRANDE"],cellName:["4G_BULI_TC_L1800_2","5G_KAWALE_N78_1","4G_NDIRANDE_L2600_1"]},je=[{value:0,label:"Off"},{value:6e4,label:"1 min"},{value:3e5,label:"5 min"},{value:9e5,label:"15 min"}];function _e(d){return d?d.toLocaleString("en-IN",{hour:"2-digit",minute:"2-digit",day:"2-digit",month:"short"}):"—"}function Ce(d,l){const c=Array.isArray(d)?d.filter(a=>a&&typeof a=="object"):[],i=c[0]||{},o=a=>a==null||a===""?"—":`${Number(a).toFixed(1)}%`,p=(a,n="")=>a==null||a===""?"—":`${Number(a).toFixed(1)}${n}`,k=a=>c.slice(0,24).slice().reverse().map((n,m)=>({label:n.starttime?String(n.starttime).slice(11,16):String(m),value:Number(n[a]??0)}));return{gaugeValue:Math.round(Number(i.network_availability??0)),gauge:{value:Math.round(Number(i.network_availability??0)),color:l.gauge},stats:(()=>{const a=[l.rna,l.payload,l.ul];return[{label:"Availability",fullName:"Radio Network Availability",value:o(i.network_availability),deltaUp:!0,icon:e.jsx("i",{className:"fas fa-shield-halved"})},{label:"Data Volume",fullName:"Downlink Data Volume",value:p(i.data_trafficin_mb," MB"),deltaUp:!0,icon:e.jsx("i",{className:"fas fa-database"})},{label:"Voice Traffic",fullName:"Voice Traffic (Erlangs)",value:p(i.voice_traffic),deltaUp:!0,icon:e.jsx("i",{className:"fas fa-phone-volume"})},{label:"Data SR",fullName:"Packet Data Setup Success Rate",value:o(i.data_setup_success_rate),deltaUp:!0,icon:e.jsx("i",{className:"fas fa-circle-check"})},{label:"Voice DR",fullName:"Call Drop Rate",value:o(i.voice_drop_call_rate),deltaUp:!1,icon:e.jsx("i",{className:"fas fa-phone-slash"})},{label:"Voice SR",fullName:"Call Setup Success Rate",value:o(i.voice_setup_success_rate),deltaUp:!0,icon:e.jsx("i",{className:"fas fa-phone"})}].map((m,g)=>{const w=a[g%a.length];return{...m,delta:"",color:w.tint,darkGradient:[w.darkFrom,w.darkTo]}})})(),sparklines:[{title:"Data Volume (MB)",unit:"",color:l.payload.tint,data:k("data_trafficin_mb")},{title:"Voice Traffic",unit:"",color:l.payload.tint,data:k("voice_traffic")},{title:"Data SR (%)",unit:"%",color:l.rna.tint,data:k("data_setup_success_rate")},{title:"Voice DR (%)",unit:"%",color:l.ul.tint,data:k("voice_drop_call_rate")},{title:"Voice SR (%)",unit:"%",color:l.rna.tint,data:k("voice_setup_success_rate")}],kpiRows:[{name:"Availability",fullName:"Radio Network Availability",field:"network_availability",value:o(i.network_availability),criteria:"> 99%",status:Number(i.network_availability)>=99?"ok":Number(i.network_availability)>=95?"warn":"crit",icon:e.jsx("i",{className:"fas fa-shield-halved"})},{name:"Voice DR",fullName:"Call Drop Rate",field:"voice_drop_call_rate",value:o(i.voice_drop_call_rate),criteria:"< 2%",status:Number(i.voice_drop_call_rate)<=2?"ok":"crit",icon:e.jsx("i",{className:"fas fa-phone-slash"})},{name:"Voice SR",fullName:"Call Setup Success Rate",field:"voice_setup_success_rate",value:o(i.voice_setup_success_rate),criteria:"> 98%",status:Number(i.voice_setup_success_rate)>=98?"ok":"warn",icon:e.jsx("i",{className:"fas fa-phone"})},{name:"Data SR",fullName:"Packet Data Setup Success Rate",field:"data_setup_success_rate",value:o(i.data_setup_success_rate),criteria:"> 98%",status:Number(i.data_setup_success_rate)>=98?"ok":"warn",icon:e.jsx("i",{className:"fas fa-circle-check"})},{name:"Data Volume",fullName:"Downlink Data Volume (MB)",field:"data_trafficin_mb",value:p(i.data_trafficin_mb),criteria:"—",status:"ok",icon:e.jsx("i",{className:"fas fa-database"})},{name:"Voice Traffic",fullName:"Voice Traffic (Erlangs)",field:"voice_traffic",value:p(i.voice_traffic),criteria:"—",status:"ok",icon:e.jsx("i",{className:"fas fa-phone-volume"})}],trendSeries:a=>k(a).map(n=>n.value),trendPoints:a=>k(a),degradedCells:c.filter(a=>a.latitude!=null&&a.longitude!=null&&a.latitude!==""&&a.longitude!=="").slice().sort((a,n)=>Number(a.network_availability??100)-Number(n.network_availability??100)).slice(0,15).map(a=>({cellId:a.cell_name||String(a.did??"—"),kpi:"Availability",delta:o(a.network_availability),latitude:Number(a.latitude),longitude:Number(a.longitude)}))}}function De({embedded:d=!1,showControls:l=!0}){const c=me(),i=I(t=>t.kpiEngine.liveMonitoring),o=I(t=>t.kpiEngine.liveMonitoringLoading),p=I(t=>t.kpiEngine.liveMonitoringError),{theme:k}=Y(),[a,n]=s.useState(null),m=a?a==="dark":k==="dark",[g,w]=s.useState(D),[h,N]=s.useState(V),[f,j]=s.useState(F),[v,_]=s.useState(U),H=h.colorEnabled?h.color:null,[A,P]=s.useState(!1),[C,q]=s.useState(!1),[J,K]=s.useState(()=>{try{const t=JSON.parse(localStorage.getItem(M));return Array.isArray(t)&&t.length?t:O}catch{return O}}),Q=t=>{K(t);try{localStorage.setItem(M,JSON.stringify(t))}catch{}},[X,Z]=s.useState(0),ee=()=>{K(O);try{localStorage.removeItem(M)}catch{}Z(t=>t+1)},[b,te]=s.useState({technology:"",region:"",siteName:"",cellName:""}),[z,ae]=s.useState(0),[re,ie]=s.useState(null),[R,oe]=s.useState([]),G=!b.technology&&!b.region&&!b.siteName&&!b.cellName;s.useEffect(()=>{G&&Array.isArray(i)&&i.length>0&&oe(i)},[i,G]);const T=s.useMemo(()=>{if(!R.length)return Ne;const t=r=>Array.from(new Set(R.map(x=>x[r]).filter(Boolean))).sort();return{technology:t("technology"),region:t("region"),siteName:t("site_name"),cellName:t("cell_name")}},[R]),B=()=>{const t=ge({technology:b.technology,region:b.region,site_name:b.siteName,cell_name:b.cellName});c(xe.getLiveMonitoring(t)),ie(new Date)};s.useEffect(()=>{B()},[b]),s.useEffect(()=>{if(!z)return;const t=setInterval(B,z);return()=>clearInterval(t)},[z,b]);const y=s.useMemo(()=>Ce(i,g),[i,g]),le=s.useMemo(()=>y?{...y,kpiTableProps:{rows:y.kpiRows,statusColors:{ok:g.statusOk,warn:g.statusWarn,crit:g.statusCrit},trendRenderer:(t,r)=>e.jsx(we,{data:y.trendPoints(t.field),color:r,isDark:m,height:d?47:57})}}:null,[y,g,m,d]),E=(t,r)=>{te(x=>({...x,[t]:r}))},L=(t,r,x)=>w($=>({...$,[t]:{...$[t],[r]:x}})),se=(t,r)=>w(x=>({...x,[t]:r}));return e.jsxs(e.Fragment,{children:[e.jsx("style",{children:`
        .kpi-dashboard-root {
          --color-background-primary: #ffffff;
          --color-background-secondary: #f5f4f0;
          --color-background-tertiary: #eeece6;
          --color-text-primary: #1a1a18;
          --color-text-secondary: #5f5e5a;
          --color-border-tertiary: rgba(0,0,0,0.12);
          --color-border-secondary: rgba(0,0,0,0.22);
          --border-radius-md: 8px;
          --border-radius-lg: 12px;
          --font-sans: Aptos, "Aptos Display", "Segoe UI", system-ui, -apple-system, sans-serif;
          font-family: var(--font-sans);
        }
        .kpi-dashboard-root[data-kpi-theme="dark"] {
          --color-background-primary: #1e1e1c;
          --color-background-secondary: #2a2a27;
          --color-background-tertiary: #141412;
          --color-text-primary: #f0ede6;
          --color-text-secondary: #a8a69e;
          --color-border-tertiary: rgba(255,255,255,0.10);
          --color-border-secondary: rgba(255,255,255,0.20);
        }
        .kpi-dashboard-root .card {
          background:var(--color-background-primary);
          border:0.5px solid var(--color-border-tertiary);
          border-radius:var(--border-radius-lg);
          padding:1rem 1.1rem;
        }
        .kpi-dashboard-root .card h3 { font-size:var(--kpi-title-size, 0.875rem); font-weight:var(--kpi-title-weight, 700); color:var(--kpi-title-color, var(--color-text-primary)); margin-bottom:0.75rem; }

        .kpi-section {
          padding: 1.5rem; border-radius: var(--border-radius-lg);
          background: var(--color-background-primary); border: 0.5px solid var(--color-border-tertiary);
          --kpi-bg: var(--color-background-primary);
          --kpi-card-bg: var(--color-background-secondary);
          --kpi-border: var(--color-border-tertiary);
          --kpi-text: var(--color-text-primary);
          --kpi-text-sub: var(--color-text-secondary);
          --kpi-up: #0F6E56; --kpi-down: #b8791e;
        }
        [data-kpi-theme="dark"] .kpi-section {
          --kpi-bg: #10131a; --kpi-card-bg: #10131a; --kpi-border: rgba(255,255,255,0.06);
          --kpi-text: #eef1f6; --kpi-text-sub: #8b93a7;
          --kpi-up: #34d399; --kpi-down: #f2b155;
          background: var(--kpi-bg); border-color: var(--kpi-border);
        }
        .kpi-section-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:1rem; flex-wrap:wrap; gap:0.5rem; }
        .kpi-section-head h2 { font-size:1rem; font-weight:500; color:var(--kpi-text); }
        .kpi-section-head p { font-size:0.75rem; color:var(--kpi-text-sub); margin-top:0.125rem; }
        .kpi-customize-btn, .kpi-reset-btn {
          font-size:0.875rem; padding:0.375rem 0.75rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
        }
        [data-kpi-theme="dark"] .kpi-customize-btn { background:#22273C; }
        /* Highlighted while its panel/mode is actually open, so it's obvious at a glance
           which controls are currently active. */
        .kpi-customize-btn.active {
          background:#EC7D09; border-color:#EC7D09; color:#fff; font-weight:600;
        }
        .kpi-color-panel {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md);
          padding:0.5rem 0.625rem; margin-bottom:0.875rem;
        }
        .kpi-color-sections { display:flex; flex-wrap:wrap; align-items:flex-start; gap:0.875rem; }
        .kpi-color-section { display:flex; flex-direction:column; }
        .kpi-color-section-title { font-size:0.6875rem; font-weight:700; text-transform:uppercase; letter-spacing:0.04em; color:var(--kpi-text-sub); margin-bottom:0.5rem; display:block; }
        [data-kpi-theme="dark"] .kpi-color-section-title { color:rgba(255,255,255,0.7); }
        .kpi-color-grid { display:flex; flex-wrap:wrap; align-items:stretch; gap:0.625rem; }
        .kpi-color-field { display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; color:var(--kpi-text-sub); font-weight:500; white-space:nowrap; }
        .kpi-color-field input[type="color"],
        .kpi-color-subfield input[type="color"] {
          width:1.5rem; height:1.125rem; border:none; outline:none; border-radius:0.25rem; padding:0; background:none; cursor:pointer;
          -webkit-appearance:none; appearance:none;
        }
        .kpi-color-field input[type="color"]::-webkit-color-swatch-wrapper,
        .kpi-color-subfield input[type="color"]::-webkit-color-swatch-wrapper { padding:0; }
        .kpi-color-field input[type="color"]::-webkit-color-swatch,
        .kpi-color-subfield input[type="color"]::-webkit-color-swatch { border:none; border-radius:0.25rem; }
        .kpi-color-field input[type="color"]::-moz-color-swatch,
        .kpi-color-subfield input[type="color"]::-moz-color-swatch { border:none; border-radius:0.25rem; }
        [data-kpi-theme="dark"] .kpi-color-field input[type="color"],
        [data-kpi-theme="dark"] .kpi-color-subfield input[type="color"] {
          border:1px solid rgba(255,255,255,0.55); background-color:var(--kpi-card-bg) !important;
        }
        /* Disabled color inputs (e.g. unchecked "Override color") often get their own
           native washed-out/white background regardless of the base rule above. */
        [data-kpi-theme="dark"] .kpi-color-field input[type="color"]:disabled,
        [data-kpi-theme="dark"] .kpi-color-subfield input[type="color"]:disabled {
          background-color:var(--kpi-card-bg) !important; opacity:0.5;
        }
        .kpi-color-field-group {
          display:flex; flex-direction:column; flex-wrap:wrap; align-items:flex-start;
          gap:0.375rem; column-gap:1.25rem; max-height:8rem;
          border:0.5px solid var(--kpi-border); border-radius:0.375rem; padding:0.5rem 0.625rem;
        }
        .kpi-color-subfield { display:flex; align-items:center; gap:0.375rem; font-size:0.6875rem; color:var(--kpi-text-sub); white-space:nowrap; }
        .kpi-color-field-flat { font-size:0.6875rem; font-weight:400; }
        .kpi-reset-btn-wrap { display:flex; align-items:center; margin-left:auto; }
        [data-kpi-theme="dark"] .kpi-color-field,
        [data-kpi-theme="dark"] .kpi-color-subfield { color:rgba(255,255,255,0.85); }
        .kpi-reset-btn {
          margin-left:auto; font-weight:600; background:#EC7D09; color:#fff; border:none;
          padding:0.5rem 0.875rem; box-shadow:0 1px 3px rgba(0,0,0,0.25);
          width:9.375rem; text-align:center;
        }
        .kpi-reset-btn:hover { opacity:0.9; }
        .kpi-filter-bar { display:flex; flex-wrap:wrap; align-items:center; gap:0.4375rem; margin-bottom:0.875rem; }
        .kpi-filter-bar select,
        .kpi-filter-meta select {
          -webkit-appearance:none; -moz-appearance:none; appearance:none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%238b93a7' stroke-width='1.5'%3E%3Cpath d='M5 7l5 5 5-5'/%3E%3C/svg%3E");
          background-repeat:no-repeat; background-position:right 0.5rem center; background-size:0.75rem;
          padding-right:1.5rem;
        }
        .kpi-filter-bar select {
          font-size:0.875rem; padding-top:0.375rem; padding-bottom:0.375rem; padding-left:0.625rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background-color:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
          width:7.5rem; text-overflow:ellipsis; white-space:nowrap; overflow:hidden;
          color-scheme: light;
        }
        .kpi-filter-meta { display:flex; align-items:center; gap:0.625rem; margin-left:auto; font-size:0.8125rem; color:var(--kpi-text-sub); }
        .kpi-filter-meta select {
          font-size:0.8125rem; padding-top:0.25rem; padding-bottom:0.25rem; padding-left:0.5rem; border-radius:var(--border-radius-md);
          border:0.5px solid var(--kpi-border); background-color:var(--kpi-card-bg); color:var(--kpi-text); cursor:pointer;
          color-scheme: light;
        }
        [data-kpi-theme="dark"] .kpi-filter-bar select,
        [data-kpi-theme="dark"] .kpi-filter-meta select {
          color-scheme: dark !important;
          background-color:#22273C !important;
          color:#eef1f6 !important;
          border-color: rgba(255,255,255,0.14) !important;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%238b93a7' stroke-width='1.5'%3E%3Cpath d='M5 7l5 5 5-5'/%3E%3C/svg%3E");
        }
        /* Fixed px height, not tied to the grid's h/rowHeight snapping — the grid cell just
           needs to be tall enough to contain this without clipping (see kpiDashboardPreset.js). */
        /* height:100% + display:flex/justify-content:center: the card now actually follows
           the grid cell when you drag-resize this widget, and the label/value row stays
           auto-centered at whatever height results — no per-size padding tuning needed. */
        .kpi-stat-card {
          position:relative; height:100%; box-sizing:border-box; border-radius:var(--border-radius-md);
          padding:1.25rem 0.9rem; display:flex; flex-direction:column; justify-content:center;
        }
        .kpi-stat-row { display:flex; align-items:center; justify-content:space-between; gap:0.5rem; min-width:0; }
        .kpi-stat-top { display:flex; align-items:center; gap:0.375rem; font-size:0.75rem; line-height:1; color:var(--kpi-text-sub); min-width:0; flex:1 1 auto; }
        .kpi-stat-icon { font-size:1rem; line-height:1; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; }
        .kpi-stat-icon i, .kpi-stat-icon svg { display:block; }
        /* fa-shield-halved's glyph isn't drawn centered within its own em-box (a known FA
           quirk for shield/pin/bell icons) — scoped nudge, other stat-card icons are fine. */
        .kpi-stat-icon .fa-shield-halved { transform: translateY(1px); }
        .kpi-tooltip { position:relative; cursor:help; }
        .kpi-tooltip::after {
          content: attr(data-tooltip);
          position:absolute; top:100%; left:0; margin-top:0.375rem;
          background:#1c1f2e; color:#eef1f6; font-size:0.6875rem; font-weight:400;
          padding:0.375rem 0.625rem; border-radius:0.375rem; white-space:nowrap;
          box-shadow:0 0.125rem 0.5rem rgba(0,0,0,0.4); border:0.0312rem solid rgba(255,255,255,0.1);
          opacity:0; visibility:hidden; transform:translateY(-0.25rem);
          transition:opacity .12s ease, transform .12s ease; pointer-events:none; z-index:30;
        }
        .kpi-tooltip:hover::after { opacity:1; visibility:visible; transform:translateY(0); }
        .kpi-stat-label { font-size:1.2rem; line-height:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; display:block; min-width:0; }
        [data-kpi-theme="dark"] .kpi-stat-top { color:rgba(255,255,255,0.85); }
        .kpi-stat-value { display:flex; align-items:center; gap:0.3125rem; font-size:1.25rem; font-weight:600; color:var(--kpi-text); text-align:right; white-space:nowrap; flex-shrink:0; }
        .kpi-stat-delta { position:absolute; right:0.9rem; bottom:0.7rem; font-size:0.6875rem; }
        .kpi-stat-delta.up { color:var(--kpi-up); } .kpi-stat-delta.down { color:var(--kpi-down); }
        .kpi-spark-card { height:100%; box-sizing:border-box; display:flex; flex-direction:column; background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.625rem 0.75rem; }
        [data-kpi-theme="dark"] .kpi-spark-card { background:#22273C; }
        .kpi-spark-head { display:flex; justify-content:space-between; font-size:0.6875rem; margin-bottom:0.25rem; }
        .kpi-spark-title { font-size:var(--kpi-title-size, 0.75rem); font-weight:var(--kpi-title-weight, 700); color:var(--kpi-title-color, var(--kpi-text-sub)); }
        [data-kpi-theme="dark"] .kpi-spark-title { color:var(--kpi-title-color, rgba(255,255,255,0.85)); }
        .kpi-gauge-card { height:100%; box-sizing:border-box; background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.5rem 0.75rem; text-align:center; }
        [data-kpi-theme="dark"] .kpi-gauge-card { background:#22273C; }
        .kpi-gauge-title { font-size:var(--kpi-title-size, 0.75rem); font-weight:var(--kpi-title-weight, 700); margin-bottom:0.125rem; color:var(--kpi-title-color, var(--kpi-text-sub)); }
        [data-kpi-theme="dark"] .kpi-gauge-title { color:var(--kpi-title-color, rgba(255,255,255,0.85)); }
        .kpi-status-tbl tbody, .kpi-cells-tbl tbody { display:table-row-group; }
        /* Widget grid (react-grid-layout, via DashboardCanvasEditor) replaces the old hand-laid-out
           .kpi-stats-row/.kpi-spark-row/.kpi-row-last CSS grids — theme its generic widget chrome
           to match this dashboard's card look instead of DashboardCanvasEditor's own light-only default. */
        .kpi-grid-wrap { flex:1 1 auto; min-height:0; }
        /* react-grid-layout's default resize-handle corner marks are a dark, near-invisible
           rgba(0,0,0,0.4) — barely visible against this dashboard's dark cards. */
        .kpi-grid-wrap .react-resizable-handle::after {
          border-right-color: rgba(255,255,255,0.7);
          border-bottom-color: rgba(255,255,255,0.7);
        }
        .kpi-grid-wrap .dbe-canvas-wrap { border:none; padding:0; background:transparent; overflow:visible; }
        /* StatCard/GaugeCard/LineAreaChart already paint their own card chrome
           (.kpi-stat-card/.kpi-gauge-card/.kpi-spark-card) — leave their wrapper bare so they
           don't get boxed twice. Only the two table widgets need the wrapper's own card look. */
        .kpi-grid-wrap .dbe-widget { background:transparent; border:none; padding:0; overflow:hidden; }
        .kpi-grid-wrap .dbe-widget-kpiTable,
        .kpi-grid-wrap .dbe-widget-degradedCellsTable {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-lg);
          padding:1rem 1.1rem; overflow:auto;
        }
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-kpiTable,
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-degradedCellsTable { background:#22273C; }
        /* Scrollbar stays invisible until hover, so the card doesn't look permanently
           "scrollable" at rest — same content, just quieter chrome. Applies to every
           scrollable table card (KPI table + Top Degraded Cells), not just one. */
        .kpi-grid-wrap .dbe-widget-degradedCellsTable,
        .kpi-grid-wrap .dbe-widget-kpiTable { scrollbar-width: none; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable::-webkit-scrollbar,
        .kpi-grid-wrap .dbe-widget-kpiTable::-webkit-scrollbar { width: 0; height: 0; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover { scrollbar-width: thin; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover::-webkit-scrollbar,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover::-webkit-scrollbar { width: 6px; height: 6px; }
        .kpi-grid-wrap .dbe-widget-degradedCellsTable:hover::-webkit-scrollbar-thumb,
        .kpi-grid-wrap .dbe-widget-kpiTable:hover::-webkit-scrollbar-thumb {
          background: rgba(255,255,255,0.25); border-radius: 3px;
        }
        .kpi-grid-wrap .dbe-widget-degradedCellsMap {
          background:var(--kpi-card-bg); border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-lg);
          padding:0; overflow:hidden;
        }
        [data-kpi-theme="dark"] .kpi-grid-wrap .dbe-widget-degradedCellsMap { background:#22273C; }
        .kpi-grid-wrap .dbe-widget .kpi-table-wrap { height:100%; display:flex; flex-direction:column; }
        .kpi-grid-wrap .dbe-widget .kpi-status-tbl { flex:1; }
        .kpi-table-wrap { position:relative; }
        /* KpiTable.jsx's header is now a thead/tr/th (a real table row, sized by the
           table's own colgroup so it structurally can't drift from the body columns below)
           rather than a flex div bled to the card edges with margin. display:flex and
           negative margins don't apply to a tr -- browsers force display:table-row
           regardless -- so this only carries the color/font/background that a table row can
           actually honor; per-cell padding/rounding lives on KpiTable.jsx's own th elements. */
        .kpi-card-header {
          color:var(--kpi-table-title-color, var(--kpi-text));
          font-weight:var(--kpi-table-title-weight, 600); font-size:var(--kpi-table-title-size, 0.875rem);
        }
        [data-kpi-theme="dark"] .kpi-card-header { background:#282E41; }
        .kpi-card-header th { color:inherit; font-weight:inherit; font-size:inherit; }
        .kpi-table-legend {
          margin-left:auto; display:flex; gap:0.625rem;
          white-space:nowrap; font-size:0.625rem; flex-shrink:0;
        }
        .kpi-legend-item { display:flex; align-items:center; gap:0.25rem; font-size:0.625rem; font-weight:400; color:var(--kpi-text-sub); }
        .kpi-legend-dot { width:0.4375rem; height:0.4375rem; border-radius:50%; display:inline-block; margin-right:0.0625rem; flex-shrink:0; }
        .kpi-row-icon { display:inline-flex; align-items:center; margin-right:0.375rem; font-size:0.8125rem; }
        .kpi-status-tbl { border-collapse:collapse; font-size:0.875rem; width:100%; table-layout:fixed; }
        .kpi-cells-tbl { border-collapse:collapse; font-size:0.875rem; width:100%; }
        .kpi-cells-tbl th {
          text-align:left; color:var(--kpi-table-title-color, var(--kpi-text-sub));
          font-weight:var(--kpi-table-title-weight, 600); font-size:var(--kpi-table-title-size, 0.875rem);
          border-bottom:0.0312rem solid var(--kpi-border); overflow:hidden; text-overflow:ellipsis; padding:0.625rem 0.75rem;
        }
        .kpi-status-tbl td:nth-child(1) { width:22%; }
        .kpi-status-tbl td:nth-child(2) { width:16%; }
        .kpi-status-tbl td:nth-child(3) { width:14%; }
        .kpi-status-tbl td:nth-child(4) { width:48%; }
        .kpi-status-tbl td {
          padding:0.9rem 1.1rem; color:var(--kpi-row-color, var(--kpi-text));
          font-weight:var(--kpi-row-weight, 400); font-size:var(--kpi-row-size, inherit);
          border-bottom:0.0312rem solid var(--kpi-border); vertical-align:middle;
        }
        .kpi-cells-tbl td {
          padding:1rem 0.75rem; color:var(--kpi-row-color, var(--kpi-text));
          font-weight:var(--kpi-row-weight, 400); font-size:var(--kpi-row-size, inherit);
          border-bottom:0.0312rem solid var(--kpi-border); vertical-align:middle;
        }
        .kpi-status-tbl tr:last-child td, .kpi-cells-tbl tr:last-child td { border-bottom:none; }
        .kpi-cells-delta.up { color:var(--kpi-up); } .kpi-cells-delta.down { color:var(--kpi-down); }
        @media (max-width: 40rem) {
          .kpi-filter-bar select { font-size:0.6875rem; padding:0.3125rem 0.5rem; }
          .kpi-filter-meta { margin-left:0; flex-basis:100%; justify-content:space-between; }

          /* Fixed % column widths + table-layout:fixed choke at narrow widths (wrapped
             text, a squeezed sliver for the trend chart) — reflow each row into 2 stacked
             rows instead: name/value/criteria on top, trend sparkline full-width below. */
          .kpi-status-tbl,
          .kpi-embedded .kpi-status-tbl { table-layout:auto; font-size:0.75rem; }
          .kpi-status-tbl, .kpi-status-tbl tbody { display:block; width:100%; }
          .kpi-status-tbl tr {
            display:grid;
            grid-template-columns:auto auto 1fr;
            grid-template-areas:"name value criteria" "trend trend trend";
            column-gap:0.5rem; align-items:center; padding:0.5rem 0;
          }
          .kpi-status-tbl td,
          .kpi-embedded .kpi-status-tbl td { padding:0.125rem 0; border-bottom:none; }
          .kpi-status-tbl td:nth-child(1) { grid-area:name; width:auto; white-space:nowrap; }
          .kpi-status-tbl td:nth-child(2) { grid-area:value; width:auto; white-space:nowrap; }
          .kpi-status-tbl td:nth-child(3) { grid-area:criteria; width:auto; white-space:nowrap; justify-self:end; }
          .kpi-status-tbl td:nth-child(4) { grid-area:trend; width:100%; margin-top:0.25rem; }
          .kpi-status-tbl tr { border-bottom:0.0312rem solid var(--kpi-border); }
          .kpi-status-tbl tr:last-child { border-bottom:none; }

          /* Top Degraded Cells has no chart column — just needs room to breathe. */
          .kpi-cells-tbl,
          .kpi-embedded .kpi-cells-tbl { table-layout:auto; font-size:0.75rem; }
          .kpi-cells-tbl td { white-space:nowrap; }
        }

        .kpi-theme-toggle { display:flex; align-items:center; gap:0.125rem; border:0.5px solid var(--kpi-border); border-radius:var(--border-radius-md); padding:0.125rem; background:var(--kpi-card-bg); }
        [data-kpi-theme="dark"] .kpi-theme-toggle { background:#22273C; }
        .kpi-theme-toggle button {
          display:flex; align-items:center; justify-content:center; width:1.625rem; height:1.625rem;
          border:none; border-radius:0.375rem; background:transparent; color:var(--kpi-text-sub); cursor:pointer;
        }
        .kpi-theme-toggle button.active { background:var(--kpi-bg); color:var(--kpi-text); box-shadow:0 0 0 0.5px var(--kpi-border); }

        /* ─── Compact mode when rendered inside a modal (avoids page scroll) ── */
        .kpi-embedded .kpi-section { padding: 1rem; }
        .kpi-embedded .kpi-section-head { margin-bottom: 0.6rem; }
        .kpi-embedded .kpi-stat-card { padding: 1.25rem 0.9rem; }
        .kpi-embedded .kpi-stat-value { font-size: 1.0625rem; }
        .kpi-embedded .kpi-spark-card { padding: 0.375rem 0.625rem; }
        .kpi-embedded .kpi-gauge-card { padding: 0.25rem 0.5rem; }
        .kpi-embedded .kpi-status-tbl,
        .kpi-embedded .kpi-cells-tbl { font-size: 1rem; }
        .kpi-embedded .kpi-status-tbl th,
        .kpi-embedded .kpi-cells-tbl th { padding: 0.25rem 0.375rem; }
        .kpi-embedded .kpi-status-tbl td { padding: 0.75rem 1.1rem; }
        .kpi-embedded .kpi-cells-tbl td { padding: 0.2rem 0.75rem; }
      `}),e.jsx("div",{className:`kpi-dashboard-root${d?" kpi-embedded":""}`,"data-kpi-theme":m?"dark":"light",style:{"--kpi-title-weight":h.bold?700:500,"--kpi-title-size":`${h.size/16}rem`,...h.colorEnabled?{"--kpi-title-color":h.color}:{},"--kpi-table-title-weight":f.bold?700:500,"--kpi-table-title-size":`${f.size/16}rem`,...f.colorEnabled?{"--kpi-table-title-color":f.color}:{},"--kpi-row-weight":v.bold?700:400,"--kpi-row-size":`${v.size/16}rem`,...v.colorEnabled?{"--kpi-row-color":v.color}:{}},children:e.jsxs("div",{className:"kpi-section",children:[!d&&e.jsx("div",{className:"kpi-section-head",children:e.jsxs("div",{children:[e.jsx("h2",{children:"5G KPI Monitoring Dashboard"}),e.jsx("p",{children:"Live — KPI Engine API"})]})}),l&&e.jsxs("div",{className:"kpi-filter-bar",children:[e.jsxs("div",{className:"kpi-theme-toggle",children:[e.jsx("button",{type:"button",title:"Follow app theme",className:a===null?"active":"",onClick:()=>n(null),children:e.jsx(he,{size:14})}),e.jsx("button",{type:"button",title:"Light",className:a==="light"?"active":"",onClick:()=>n("light"),children:e.jsx(fe,{size:14})}),e.jsx("button",{type:"button",title:"Dark",className:a==="dark"?"active":"",onClick:()=>n("dark"),children:e.jsx(ve,{size:14})})]}),e.jsx("button",{type:"button",className:`kpi-customize-btn${A?" active":""}`,onClick:()=>P(t=>!t),children:A?"Close colors":"Customize colors"}),e.jsx("button",{type:"button",className:`kpi-customize-btn${C?" active":""}`,onClick:()=>q(t=>!t),children:C?"Done resizing":"Resize widgets"}),C&&e.jsx("button",{type:"button",className:"kpi-customize-btn active",onClick:ee,children:"Reset layout"}),e.jsxs("select",{value:b.technology,onChange:t=>E("technology",t.target.value),children:[e.jsx("option",{value:"",children:"All Technology"}),T.technology.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:b.region,onChange:t=>E("region",t.target.value),children:[e.jsx("option",{value:"",children:"All Regions"}),T.region.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:b.siteName,onChange:t=>E("siteName",t.target.value),children:[e.jsx("option",{value:"",children:"All Sites"}),T.siteName.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("select",{value:b.cellName,onChange:t=>E("cellName",t.target.value),children:[e.jsx("option",{value:"",children:"All Cells"}),T.cellName.map(t=>e.jsx("option",{value:t,children:t},t))]}),e.jsxs("div",{className:"kpi-filter-meta",children:[e.jsx("span",{children:"Refresh:"}),e.jsx("select",{value:z,onChange:t=>ae(Number(t.target.value)),children:je.map(t=>e.jsx("option",{value:t.value,children:t.label},t.value))}),e.jsxs("span",{children:["Updated: ",_e(re)]})]})]}),A&&e.jsx("div",{className:"kpi-color-panel",children:e.jsxs("div",{className:"kpi-color-sections",children:[e.jsxs("div",{className:"kpi-color-section",children:[e.jsx("div",{className:"kpi-color-section-title",children:"Shaded Cards"}),e.jsx("div",{className:"kpi-color-grid",children:Object.entries(D).filter(([,t])=>typeof t!="string").map(([t])=>e.jsxs("div",{className:"kpi-color-field-group",children:[e.jsx("span",{className:"kpi-color-field",style:{fontWeight:600},children:W[t]||t}),e.jsxs("span",{className:"kpi-color-subfield",children:["light ",e.jsx("input",{type:"color",value:g[t].tint,onChange:r=>L(t,"tint",r.target.value)})]}),e.jsxs("span",{className:"kpi-color-subfield",children:["dark from ",e.jsx("input",{type:"color",value:g[t].darkFrom,onChange:r=>L(t,"darkFrom",r.target.value)})]}),e.jsxs("span",{className:"kpi-color-subfield",children:["dark to ",e.jsx("input",{type:"color",value:g[t].darkTo,onChange:r=>L(t,"darkTo",r.target.value)})]})]},t))})]}),e.jsx("div",{className:"kpi-color-divider"}),e.jsxs("div",{className:"kpi-color-section",children:[e.jsx("div",{className:"kpi-color-section-title",children:"Other Color Controls"}),e.jsx("div",{className:"kpi-color-grid",children:e.jsx("div",{className:"kpi-color-field-group",children:Object.entries(D).filter(([,t])=>typeof t=="string").map(([t])=>e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[W[t]||t,e.jsx("input",{type:"color",value:g[t],onChange:r=>se(t,r.target.value)})]},t))})})]}),e.jsx("div",{className:"kpi-color-divider"}),e.jsxs("div",{className:"kpi-color-section",children:[e.jsx("div",{className:"kpi-color-section-title",children:"Chart Titles"}),e.jsx("div",{className:"kpi-color-grid",children:e.jsxs("div",{className:"kpi-color-field-group",children:[e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:h.colorEnabled,onChange:t=>N(r=>({...r,colorEnabled:t.target.checked}))}),"Override color",e.jsx("input",{type:"color",value:h.color,disabled:!h.colorEnabled,onChange:t=>N(r=>({...r,color:t.target.value}))})]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:h.bold,onChange:t=>N(r=>({...r,bold:t.target.checked}))}),"Bold"]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:["Font size",e.jsx("input",{type:"number",min:"9",max:"20",value:h.size,onChange:t=>N(r=>({...r,size:Number(t.target.value)||V.size})),style:{width:"3rem"}}),"px"]})]})})]}),e.jsx("div",{className:"kpi-color-divider"}),e.jsxs("div",{className:"kpi-color-section",children:[e.jsx("div",{className:"kpi-color-section-title",children:"Table Titles "}),e.jsx("div",{className:"kpi-color-grid",children:e.jsxs("div",{className:"kpi-color-field-group",children:[e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:f.colorEnabled,onChange:t=>j(r=>({...r,colorEnabled:t.target.checked}))}),"Override color",e.jsx("input",{type:"color",value:f.color,disabled:!f.colorEnabled,onChange:t=>j(r=>({...r,color:t.target.value}))})]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:f.bold,onChange:t=>j(r=>({...r,bold:t.target.checked}))}),"Bold"]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:["Font size",e.jsx("input",{type:"number",min:"9",max:"20",value:f.size,onChange:t=>j(r=>({...r,size:Number(t.target.value)||F.size})),style:{width:"3rem"}}),"px"]})]})})]}),e.jsx("div",{className:"kpi-color-divider"}),e.jsxs("div",{className:"kpi-color-section",children:[e.jsx("div",{className:"kpi-color-section-title",children:"Row Text(Table) "}),e.jsx("div",{className:"kpi-color-grid",children:e.jsxs("div",{className:"kpi-color-field-group",children:[e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:v.colorEnabled,onChange:t=>_(r=>({...r,colorEnabled:t.target.checked}))}),"Override color",e.jsx("input",{type:"color",value:v.color,disabled:!v.colorEnabled,onChange:t=>_(r=>({...r,color:t.target.value}))})]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:[e.jsx("input",{type:"checkbox",checked:v.bold,onChange:t=>_(r=>({...r,bold:t.target.checked}))}),"Bold"]}),e.jsxs("label",{className:"kpi-color-field kpi-color-field-flat",children:["Font size",e.jsx("input",{type:"number",min:"9",max:"20",value:v.size,onChange:t=>_(r=>({...r,size:Number(t.target.value)||U.size})),style:{width:"3rem"}}),"px"]})]})})]}),e.jsxs("div",{className:"kpi-reset-btn-wrap",style:{flexDirection:"column",gap:8},children:[e.jsx("button",{type:"button",className:"kpi-reset-btn",onClick:()=>{w(D),N(V),j(F),_(U)},children:"Reset to default"}),e.jsx("button",{type:"button",className:"kpi-reset-btn",onClick:()=>P(!1),children:"Close colors"})]})]})}),o&&e.jsx("div",{style:{padding:"2rem",textAlign:"center",color:"var(--kpi-text-sub)",fontSize:13},children:"Loading live data…"}),!o&&(p||!y)&&e.jsx("div",{style:{padding:"0.75rem 1rem",textAlign:"center",color:"var(--kpi-text-sub)",fontSize:13},children:p?`Error: ${p}`:"No Data Found"}),!o&&e.jsx("div",{className:"kpi-grid-wrap",children:e.jsx(ke,{initialLayout:J,initialWidgets:ye,editable:C,showChrome:!1,onLayoutChange:Q,kpiLiveData:le,isDark:m,titleColor:H},`${C}-${X}`)})]})})]})}export{De as K};
