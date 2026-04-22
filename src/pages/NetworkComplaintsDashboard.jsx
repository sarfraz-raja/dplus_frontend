import React, { useEffect } from 'react';

const COLORS = {
  no_signal:'#E24B4A', call_drop:'#EF9F27',
  poor_throughput:'#378ADD', slow_data:'#1D9E75', sms_fail:'#7F77DD'
};
const OP_COLORS = { jio:'#378ADD', airtel:'#E24B4A', vi:'#7F77DD', bsnl:'#1D9E75' };
const ISSUE_LABELS = { no_signal:'No signal', call_drop:'Call drop', poor_throughput:'Poor throughput', slow_data:'Slow data', sms_fail:'SMS failure' };
const OPERATORS = ['jio','airtel','vi','bsnl'];
const OP_NAMES = { jio:'Jio', airtel:'Airtel', vi:'Vi', bsnl:'BSNL' };
const CIRCLES = ['Delhi','Mumbai','Bangalore','Chennai','Kolkata','Pune','Hyderabad'];

function rand(a,b){ return Math.floor(Math.random()*(b-a+1))+a; }

function genData(op,circle,type){
  const base={jio:4800,airtel:4100,vi:3200,bsnl:2100};
  const typeW={no_signal:0.24,call_drop:0.22,poor_throughput:0.20,slow_data:0.19,sms_fail:0.15};
  const circleW={Delhi:0.20,Mumbai:0.22,Bangalore:0.17,Chennai:0.15,Kolkata:0.13,Pune:0.07,Hyderabad:0.06};
  let total=0;
  const byType={},byCircle={},byOp={};
  OPERATORS.forEach(o=>{
    let opBase=base[o]+rand(-200,200);
    if(op!=='all'&&op!==o){byOp[o]=0;return;}
    byOp[o]=opBase; total+=opBase;
    Object.keys(ISSUE_LABELS).forEach(t=>{
      if(type!=='all'&&type!==t)return;
      let v=Math.round(opBase*typeW[t]*(0.85+Math.random()*0.3));
      byType[t]=(byType[t]||0)+v;
    });
  });
  CIRCLES.forEach(c=>{
    if(circle!=='all'&&c.toLowerCase()!==circle)return;
    byCircle[c]=Math.round(total*circleW[c]*(0.8+Math.random()*0.4));
  });
  return {total,byType,byCircle,byOp};
}

function genTrend(){
  const days=[],labels=[];
  for(let i=29;i>=0;i--){
    const d=new Date(Date.now()-i*86400000);
    labels.push(d.toLocaleDateString('en-IN',{day:'2-digit',month:'short'}));
    days.push(rand(80,320));
  }
  return {labels,values:days};
}

const recentData=[
  {time:'2m ago',op:'Airtel',issue:'No signal',circle:'Delhi',sev:'crit'},
  {time:'7m ago',op:'Jio',issue:'Call drop',circle:'Mumbai',sev:'high'},
  {time:'12m ago',op:'Vi',issue:'Poor throughput',circle:'Bangalore',sev:'high'},
  {time:'18m ago',op:'BSNL',issue:'Slow data',circle:'Kolkata',sev:'med'},
  {time:'23m ago',op:'Airtel',issue:'SMS failure',circle:'Chennai',sev:'med'},
  {time:'31m ago',op:'Jio',issue:'No signal',circle:'Pune',sev:'crit'},
];

const slaData={
  jio:{resolution:91,response:4.2,escalated:3},
  airtel:{resolution:88,response:5.1,escalated:5},
  vi:{resolution:78,response:7.8,escalated:9},
  bsnl:{resolution:65,response:11.2,escalated:14},
};

let c1inst,c2inst,c3inst;
function destroyCharts(){[c1inst,c2inst,c3inst].forEach(c=>{if(c)c.destroy();});}

function renderMetrics(data){
  const el=document.getElementById('metrics');
  const cards=[
    {label:'Total complaints',val:data.total.toLocaleString('en-IN'),delta:'+12% vs last month',cls:'up'},
    {label:'Avg resolution time',val:'6.8 hrs',delta:'-0.4 hrs vs last month',cls:'down'},
    {label:'Call drop rate',val:'18.3%',delta:'+1.2% vs last month',cls:'up'},
    {label:'Active reporters',val:'24,810',delta:'+8% vs last month',cls:'down'},
  ];
  el.innerHTML=cards.map(c=>`<div class="mcard"><div class="mlabel">${c.label}</div><div class="mval">${c.val}</div><div class="mdelta ${c.cls}">${c.delta}</div></div>`).join('');
}

function renderOpBars(data){
  const el=document.getElementById('opBars');
  const max=Math.max(...Object.values(data.byOp).filter(v=>v>0))||1;
  el.innerHTML=OPERATORS.map(o=>{
    const v=data.byOp[o]||0;
    const pct=Math.round(v/max*100);
    return `<div class="hbar-row"><div class="hbar-label">${OP_NAMES[o]}</div><div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:${OP_COLORS[o]}"></div></div><div class="hbar-val">${(v/1000).toFixed(1)}k</div></div>`;
  }).join('');
}

function renderCircleBars(data){
  const el=document.getElementById('circleBars');
  const entries=Object.entries(data.byCircle).sort((a,b)=>b[1]-a[1]);
  const max=entries[0]?entries[0][1]:1;
  el.innerHTML=entries.map(([c,v])=>{
    const pct=Math.round(v/max*100);
    return `<div class="hbar-row"><div class="hbar-label">${c}</div><div class="hbar-track"><div class="hbar-fill" style="width:${pct}%;background:#378ADD"></div></div><div class="hbar-val">${(v/1000).toFixed(1)}k</div></div>`;
  }).join('');
}

function renderRecentTbl(){
  const tb=document.getElementById('recentTbl');
  tb.innerHTML=recentData.map(r=>`<tr><td style="color:var(--color-text-secondary)">${r.time}</td><td>${r.op}</td><td>${r.issue}</td><td>${r.circle}</td><td><span class="pill ${r.sev}">${r.sev==='crit'?'Critical':r.sev==='high'?'High':'Medium'}</span></td></tr>`).join('');
}

function renderSLA(){
  const el=document.getElementById('slaRows');
  el.innerHTML=OPERATORS.map(o=>{
    const d=slaData[o];
    const col=d.resolution>=85?'#1D9E75':d.resolution>=75?'#BA7517':'#A32D2D';
    return `<div class="sparkline-row"><div style="width:8px;height:8px;border-radius:50%;background:${OP_COLORS[o]};flex-shrink:0;margin-top:4px"></div><div class="sp-info"><div class="sp-name">${OP_NAMES[o]}</div><div class="sp-sub">Avg response ${d.response}h · ${d.escalated} escalated</div></div><div style="text-align:right"><div class="sp-val" style="color:${col}">${d.resolution}%</div><div style="font-size:10px;color:var(--color-text-secondary)">resolution</div></div></div>`;
  }).join('');
}

function renderLegend1(){
  const el=document.getElementById('leg1');
  el.innerHTML=Object.entries(ISSUE_LABELS).map(([k,v])=>`<span class="leg-item"><span class="leg-dot" style="background:${COLORS[k]}"></span>${v}</span>`).join('');
}

function renderLegend2(){
  const el=document.getElementById('leg2');
  const items=[{l:'2G',c:'#888780'},{l:'3G',c:'#EF9F27'},{l:'4G',c:'#378ADD'},{l:'5G',c:'#1D9E75'}];
  el.innerHTML=items.map(i=>`<span class="leg-item"><span class="leg-dot" style="background:${i.c}"></span>${i.l}</span>`).join('');
}

function update(){
  const op=document.getElementById('opFilter').value;
  const circle=document.getElementById('circleFilter').value;
  const type=document.getElementById('typeFilter').value;
  const data=genData(op,circle,type);
  const trend=genTrend();
  renderMetrics(data); renderOpBars(data); renderCircleBars(data);
  renderLegend1(); renderLegend2(); renderRecentTbl(); renderSLA();
  destroyCharts();

  const issueKeys=Object.keys(ISSUE_LABELS);
  c1inst=new window.Chart(document.getElementById('c1'),{
    type:'doughnut',
    data:{labels:issueKeys.map(k=>ISSUE_LABELS[k]),datasets:[{data:issueKeys.map(k=>data.byType[k]||0),backgroundColor:issueKeys.map(k=>COLORS[k]),borderWidth:0,hoverOffset:4}]},
    options:{responsive:true,maintainAspectRatio:false,cutout:'62%',plugins:{legend:{display:false},tooltip:{callbacks:{label:ctx=>' '+ctx.label+': '+ctx.parsed.toLocaleString('en-IN')}}}}
  });

  c2inst=new window.Chart(document.getElementById('c2'),{
    type:'line',
    data:{labels:trend.labels,datasets:[{data:trend.values,borderColor:'#378ADD',borderWidth:2,pointRadius:0,tension:0.4,fill:true,backgroundColor:'rgba(55,138,221,0.08)'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:6,font:{size:10}},grid:{display:false}},y:{ticks:{font:{size:10}},grid:{color:'rgba(128,128,128,0.1)'}}}}
  });

  const netData=[rand(8,15),rand(12,20),rand(45,60),rand(18,30)];
  c3inst=new window.Chart(document.getElementById('c3'),{
    type:'bar',
    data:{labels:['2G','3G','4G','5G'],datasets:[{data:netData,backgroundColor:['#888780','#EF9F27','#378ADD','#1D9E75'],borderWidth:0,borderRadius:4}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{font:{size:11}},grid:{display:false}},y:{ticks:{font:{size:10}},grid:{color:'rgba(128,128,128,0.1)'}}}}
  });
}

const NetworkComplaintsDashboard = () => {
  useEffect(() => {
    const loadChartJS = () => new Promise((resolve) => {
      if (window.Chart) { resolve(); return; }
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });

    loadChartJS().then(() => update());

    return () => destroyCharts();
  }, []);

  return (
    <>
      <style>{`
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
      `}</style>

      <div className="dash">
        <div className="topbar">
          <div>
            <h1>Network complaints dashboard</h1>
            <p>Crowdsourced reports across India · last 30 days</p>
          </div>
          <div className="filters">
            <select id="opFilter" onChange={() => update()}>
              <option value="all">All operators</option>
              <option value="jio">Jio</option>
              <option value="airtel">Airtel</option>
              <option value="vi">Vi</option>
              <option value="bsnl">BSNL</option>
            </select>
            <select id="circleFilter" onChange={() => update()}>
              <option value="all">All circles</option>
              <option value="delhi">Delhi</option>
              <option value="mumbai">Mumbai</option>
              <option value="bangalore">Bangalore</option>
              <option value="chennai">Chennai</option>
              <option value="kolkata">Kolkata</option>
            </select>
            <select id="typeFilter" onChange={() => update()}>
              <option value="all">All issue types</option>
              <option value="no_signal">No signal</option>
              <option value="call_drop">Call drop</option>
              <option value="poor_throughput">Poor throughput</option>
              <option value="slow_data">Slow data</option>
              <option value="sms_fail">SMS failure</option>
            </select>
            <span className="badge live">Live</span>
          </div>
        </div>

        <div className="metrics" id="metrics"></div>

        <div className="row2">
          <div className="card">
            <h3>Complaints by issue type</h3>
            <div className="legend" id="leg1"></div>
            <div style={{position:'relative',width:'100%',height:'220px'}}><canvas id="c1"></canvas></div>
          </div>
          <div className="card">
            <h3>Operator comparison</h3>
            <div id="opBars"></div>
          </div>
        </div>

        <div className="row3">
          <div className="card">
            <h3>Trend — last 30 days</h3>
            <div style={{position:'relative',width:'100%',height:'160px'}}><canvas id="c2"></canvas></div>
          </div>
          <div className="card">
            <h3>Network type breakdown</h3>
            <div className="legend" id="leg2"></div>
            <div style={{position:'relative',width:'100%',height:'140px'}}><canvas id="c3"></canvas></div>
          </div>
          <div className="card">
            <h3>Top circles</h3>
            <div id="circleBars"></div>
          </div>
        </div>

        <div className="row-last">
          <div className="card">
            <h3>Recent high-severity complaints</h3>
            <table className="tbl">
              <thead><tr><th>Time</th><th>Operator</th><th>Issue</th><th>Circle</th><th>Severity</th></tr></thead>
              <tbody id="recentTbl"></tbody>
            </table>
          </div>
          <div className="card">
            <h3>Operator SLA snapshot</h3>
            <div id="slaRows"></div>
          </div>
        </div>
      </div>
    </>
  );
};

export default NetworkComplaintsDashboard;
