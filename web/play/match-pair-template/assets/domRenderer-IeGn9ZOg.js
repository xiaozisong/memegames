const F={id:"dom",mount:({root:b,engine:m})=>{const u=document.createElement("style");u.textContent=`
      #app {
        min-height: 100vh;
        min-height: 100dvh;
        display: grid;
        place-items: center;
      }
      .game-shell {
        width: min(94vw, 600px);
        border-radius: 20px;
        box-shadow: 0 18px 48px rgba(0,0,0,0.28);
        backdrop-filter: blur(16px);
        padding: 16px;
        display: grid;
        gap: 14px;
      }
      .top-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; }
      .score-card, .icon-btn {
        border-radius: 14px;
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
        background: rgba(255,255,255,0.1);
      }
      .score-card { padding: 10px 14px; display: flex; align-items: center; gap: 10px; flex: 1; }
      .score-value { font-size: 22px; font-weight: 800; }
      .icon-btn {
        border: 0; width: 44px; height: 44px; cursor: pointer;
        transition: transform .2s ease, opacity .2s ease;
      }
      .icon-btn:hover { transform: translateY(-1px); opacity: 0.92; }
      .title { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: 0.3px; }
      .subtitle { margin: 2px 0 0; opacity: .88; font-size: 13px; }
      .progress-track { height: 10px; border-radius: 999px; background: rgba(255,255,255,0.18); overflow: hidden; }
      .progress-fill { height: 100%; background: linear-gradient(90deg, #FFD93D, #FFB347); transition: width .25s ease; }
      .board {
        border-radius: 18px;
        box-shadow: inset 0 8px 20px rgba(0,0,0,0.24), 0 10px 24px rgba(0,0,0,0.2);
        padding: 10px;
        display: grid;
        gap: 6px;
        position: relative;
      }
      .board-cell {
        border-radius: 12px;
        box-shadow: inset 0 2px 6px rgba(255,255,255,0.06);
        transition: transform .12s ease, filter .2s ease;
        position: relative;
        overflow: hidden;
        cursor: pointer;
        min-height: 30px;
      }
      .board-cell:hover { transform: translateY(-1px); filter: brightness(1.04); }
      .filled::before {
        content: "";
        position: absolute;
        inset: 0;
        border-radius: inherit;
        background: linear-gradient(165deg, var(--highlight, rgba(255,255,255,0.25)), transparent 55%);
        pointer-events: none;
      }
      .filled::after {
        content: "";
        position: absolute;
        inset: auto 6% 8% 6%;
        height: 18%;
        border-radius: 999px;
        background: var(--shadow, rgba(0,0,0,0.2));
        pointer-events: none;
      }
      .gem-dot {
        position: absolute;
        right: 6px;
        top: 6px;
        width: 9px;
        height: 9px;
        border-radius: 50%;
        background: #ffffff;
        box-shadow: 0 0 0 2px rgba(255,255,255,0.18), 0 0 10px rgba(255,255,255,0.8);
      }
      .tray {
        border-radius: 16px;
        background: rgba(255,255,255,0.09);
        box-shadow: 0 10px 24px rgba(0,0,0,0.2);
        padding: 10px;
        display: grid;
        grid-template-columns: repeat(3, minmax(0,1fr));
        gap: 10px;
      }
      .piece-card {
        border: 0;
        border-radius: 12px;
        background: rgba(255,255,255,0.08);
        min-height: 84px;
        cursor: pointer;
        transition: transform .18s ease, outline-color .18s ease;
        outline: 2px solid transparent;
        box-shadow: 0 8px 18px rgba(0,0,0,0.14);
        padding: 8px;
      }
      .piece-card.selected { transform: translateY(-2px); outline-color: rgba(255,255,255,0.65); }
      .piece-mini { display: grid; gap: 4px; place-content: center; width: 100%; height: 100%; }
      .mini-cell { border-radius: 8px; min-width: 16px; min-height: 16px; background: transparent; }
      .mini-cell.filled { box-shadow: inset 0 2px 4px rgba(255,255,255,0.22); }
      .status-row { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; opacity: 0.95; flex-wrap: wrap; }
      .cta { text-align: center; font-weight: 800; letter-spacing: 2px; color: white; text-shadow: 0 4px 8px rgba(0,0,0,0.3); margin-top: 2px; user-select: none; }
      .overlay {
        position: absolute;
        inset: 8px;
        border-radius: 16px;
        display: grid;
        place-items: center;
        background: rgba(15, 23, 42, 0.66);
        backdrop-filter: blur(6px);
      }
      .overlay-card {
        border-radius: 16px;
        background: rgba(255,255,255,0.14);
        box-shadow: 0 14px 32px rgba(0,0,0,0.28);
        padding: 16px 20px;
        text-align: center;
        max-width: 320px;
      }
      .overlay button {
        margin-top: 10px;
        border: 0;
        border-radius: 12px;
        min-height: 42px;
        padding: 0 16px;
        color: white;
        background: linear-gradient(180deg, #6ea2ff, #3B6AF6);
        cursor: pointer;
        font-weight: 700;
      }
    `,document.head.appendChild(u);const s=document.createElement("section");s.className="game-shell",b.innerHTML="",b.appendChild(s);const f=document.createElement("div");f.className="top-row";const h=document.createElement("div");h.className="score-card";const N=document.createElement("div");h.appendChild(N);const d=document.createElement("button");d.className="icon-btn",d.textContent="⚙",d.type="button",d.addEventListener("click",()=>m.setRelaxHint()),f.append(h,d);const L=document.createElement("div"),y=document.createElement("div");y.className="progress-track";const v=document.createElement("div");v.className="progress-fill",y.appendChild(v);const w=document.createElement("div");w.className="status-row";const n=document.createElement("div");n.className="board";const p=document.createElement("div");p.className="tray";const k=document.createElement("div");k.className="subtitle";const E=document.createElement("div");E.className="cta";const c=document.createElement("div");c.className="overlay",s.append(f,L,y,w,n,p,k,E),n.appendChild(c);const $=[];function H(e){b.style.background=`linear-gradient(${e.colors.bgTop}, ${e.colors.bgBottom})`,s.style.background=e.colors.panel,s.style.color=e.colors.textPrimary,d.style.color=e.colors.iconColor,N.innerHTML=`<div>${e.scoreIcon} Score</div><div class="score-value" style="color:${e.colors.textAccent}">${e.state.score}</div>`,L.innerHTML=`<h2 class="title">${e.title}</h2><p class="subtitle">${e.subtitle}</p>`,E.textContent=e.ctaText,k.textContent=e.state.message,v.style.width=`${Math.min(100,Math.round(e.state.score/e.targetScore*100))}%`,n.style.background=e.colors.boardBg,n.style.gridTemplateColumns=`repeat(${e.cols}, minmax(0, 1fr))`;const P=e.gemTargets.map(t=>`${t.id}: ${e.state.gemProgress[t.id]??0}/${t.required}`).join(" | ");if(w.innerHTML=`
        <span>Moves ${e.state.movesUsed}/${e.moveLimit}</span>
        <span>Target ${e.targetScore}</span>
        <span>${P||"No gem target"}</span>
      `,$.length===0){for(let t=0;t<e.rows;t+=1)for(let o=0;o<e.cols;o+=1){const r=document.createElement("div");r.className="board-cell",r.addEventListener("click",()=>m.placeAt(t,o)),$.push(r),n.appendChild(r)}n.appendChild(c)}for(let t=0;t<e.rows;t+=1)for(let o=0;o<e.cols;o+=1){const r=t*e.cols+o,a=$[r],i=e.state.board[t][o];a.classList.toggle("filled",i.filled),a.style.background=i.filled?i.color:e.colors.gridLine,a.style.setProperty("--highlight",e.colors.highlight),a.style.setProperty("--shadow",e.colors.shadow),a.innerHTML=i.gemId?`<span class="gem-dot" title="${i.gemId}"></span>`:"",i.filled&&a.style.setProperty("box-shadow",`inset 0 2px 6px rgba(255,255,255,0.06), 0 5px 12px ${e.colors.shadow}`)}p.innerHTML="",e.state.bag.forEach((t,o)=>{const r=document.createElement("button");if(r.type="button",r.className=`piece-card ${e.state.selectedPieceIndex===o?"selected":""}`,!t){r.disabled=!0,r.style.opacity="0.35",r.textContent="USED",p.appendChild(r);return}const a=Math.max(...t.cells.map(l=>l.row))+1,i=Math.max(...t.cells.map(l=>l.col))+1,g=document.createElement("div");g.className="piece-mini",g.style.gridTemplateRows=`repeat(${a}, 1fr)`,g.style.gridTemplateColumns=`repeat(${i}, 1fr)`;for(let l=0;l<a;l+=1)for(let T=0;T<i;T+=1){const x=document.createElement("div");x.className="mini-cell",t.cells.some(M=>M.row===l&&M.col===T)&&(x.classList.add("filled"),x.style.background=t.color),g.appendChild(x)}r.appendChild(g),r.addEventListener("click",()=>m.selectPiece(o)),p.appendChild(r)}),c.style.display=e.state.overlay.visible?"grid":"none",c.innerHTML=`
        <div class="overlay-card">
          <h3 style="margin:0 0 8px 0;">${e.state.overlay.title}</h3>
          <p style="margin:0;opacity:.9;">${e.state.overlay.body}</p>
          <button type="button">${e.state.overlay.buttonText}</button>
        </div>
      `;const C=c.querySelector("button");C==null||C.addEventListener("click",()=>m.startOrRestart())}return{render:H,destroy:()=>{s.remove(),u.remove()}}}};export{F as domRendererPlugin};
