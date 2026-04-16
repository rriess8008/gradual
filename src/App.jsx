import { useState, useEffect, useRef, useCallback } from "react";

// ─── FIREBASE CONFIG — paste your values here ─────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBZsBDO0mWE1HpXdvutbmn5o3Ph70khheY",
  authDomain: "gradual-61ff2.firebaseapp.com",
  projectId: "gradual-61ff2",
  storageBucket: "gradual-61ff2.firebasestorage.app",
  messagingSenderId: "78960749843",
  appId: "1:78960749843:web:9198a0effd8f640c293ee6"
};
const FIREBASE_ENABLED = Object.values(FIREBASE_CONFIG).every(v => v !== "");

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────────
const C = {
  bg:        "#F5F2ED",
  bgCard:    "#FFFFFF",
  bgInput:   "#F0EDE8",
  border:    "#D8D0C4",
  borderMed: "#B8AFA4",
  text:      "#1A1612",
  textMed:   "#4A4238",
  textSub:   "#7A7068",
  textMute:  "#A09890",
  accent:    "#2D6A4F",
  accentLt:  "#52B788",
  accentBg:  "#D8F3DC",
  warn:      "#E07B39",
  warnBg:    "#FEF0E6",
  danger:    "#C0392B",
  dangerBg:  "#FDECEA",
  p1:        "#C0392B",
  p2:        "#E07B39",
  p3:        "#2D6A4F",
  pNone:     "#A09890",
  shadow:    "0 2px 12px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06)",
  shadowLg:  "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.08)",
};

const PRIORITY_CONFIG = {
  high:   { label:"High",   color:C.p1,    bg:C.dangerBg, icon:"▲" },
  medium: { label:"Medium", color:C.p2,    bg:C.warnBg,   icon:"◆" },
  low:    { label:"Low",    color:C.p3,    bg:C.accentBg, icon:"▼" },
  none:   { label:"None",   color:C.pNone, bg:"transparent", icon:"—" },
};

const STATES     = [0,1,2,3,4];
const STATE_LABELS = ["Not started","25% done","Halfway there","Almost done","Complete"];
const STATE_PCT  = [0,25,50,75,100];
const uid        = () => Math.random().toString(36).slice(2,10);
const shareUrl   = id => `${window.location.origin}${window.location.pathname}?share=${id}`;
const getShareId = () => new URLSearchParams(window.location.search).get("share");

function formatDate(iso) {
  if (!iso) return null;
  const d = new Date(iso+"T00:00:00");
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d-today)/86400000);
  if (diff < 0)  return { label: diff===-1?"Yesterday":`${Math.abs(diff)}d ago`, overdue:true };
  if (diff === 0) return { label:"Today",    urgent:true };
  if (diff === 1) return { label:"Tomorrow", soon:true };
  if (diff <= 7)  return { label:`${diff}d`, soon:true };
  return { label: d.toLocaleDateString("en-US",{month:"short",day:"numeric"}), overdue:false };
}

// ─── FIREBASE INIT (auth + firestore) ────────────────────────────────────────
let _fb = null;
async function initFirebase() {
  if (!FIREBASE_ENABLED) return false;
  if (_fb) return _fb;
  try {
    const { initializeApp, getApps } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js");
    const { getFirestore, collection, getDocs, setDoc, deleteDoc, doc, query, where } =
      await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js");
    const {
      getAuth, onAuthStateChanged,
      createUserWithEmailAndPassword, signInWithEmailAndPassword,
      signOut, GoogleAuthProvider, signInWithPopup, updateProfile,
    } = await import("https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js");

    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    const db   = getFirestore(app);
    const auth = getAuth(app);

    _fb = { db, auth, collection, getDocs, setDoc, deleteDoc, doc, query, where,
            onAuthStateChanged, createUserWithEmailAndPassword,
            signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup,
            updateProfile };
    return _fb;
  } catch(e) { console.error("Firebase init failed",e); return false; }
}

// ─── SAMPLE DATA ─────────────────────────────────────────────────────────────
const SAMPLE = [];

// ─── PROGRESS CHECKBOX ───────────────────────────────────────────────────────
function ProgressBox({ state, onClick, size=26, readonly }) {
  const pct = STATE_PCT[state]/100;
  const isComplete  = state===4;
  const hasProgress = state>0;
  const cx=10,cy=10,r=7.5;

  function polarToXY(p) {
    const a = p*2*Math.PI - Math.PI/2;
    return [cx+r*Math.cos(a), cy+r*Math.sin(a)];
  }
  function pieSlicePath(p) {
    if (p<=0) return "";
    if (p>=1) return `M${cx},${cy} m0,-${r} a${r},${r} 0 1,1 -0.001,0 Z`;
    const [x1,y1]=polarToXY(0), [x2,y2]=polarToXY(p);
    return `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${p>0.5?1:0},1 ${x2},${y2} Z`;
  }

  return (
    <button onClick={readonly?undefined:onClick} title={STATE_LABELS[state]}
      style={{ width:size, height:size, borderRadius:"50%",
        border:`2px solid ${isComplete?C.accent:hasProgress?C.accentLt:C.border}`,
        background:C.bgCard, cursor:readonly?"default":"pointer", flexShrink:0, padding:0,
        display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s",
        boxShadow:hasProgress?`0 0 0 3px ${C.accentBg}`:"none" }}>
      <svg width={size-4} height={size-4} viewBox="0 0 20 20">
        <circle cx={cx} cy={cy} r={r} fill={C.bgInput}/>
        {!isComplete&&hasProgress&&<path d={pieSlicePath(pct)} fill={C.accentLt} opacity="0.9"/>}
        {isComplete&&<>
          <circle cx={cx} cy={cy} r={r} fill={C.accent}/>
          <path d="M6 10.5L8.5 13L14 7.5" stroke="white" strokeWidth="1.8"
            strokeLinecap="round" strokeLinejoin="round" fill="none"/>
        </>}
        {!isComplete&&hasProgress&&
          <text x={cx} y={cy+3.5} textAnchor="middle" fontSize="5.5" fontWeight="700"
            fill={C.accent} fontFamily="system-ui,sans-serif">{STATE_PCT[state]}</text>}
      </svg>
    </button>
  );
}

// ─── DRAG HANDLE ─────────────────────────────────────────────────────────────
function DragHandle({ onMouseDown }) {
  return (
    <div onMouseDown={onMouseDown} className="drag-handle"
      style={{ cursor:"grab", padding:"4px 3px", flexShrink:0, opacity:0,
        transition:"opacity 0.15s", display:"flex", flexDirection:"column", gap:3 }}>
      {[0,1,2].map(i=>(
        <div key={i} style={{display:"flex",gap:3}}>
          {[0,1].map(j=><div key={j} style={{width:3,height:3,borderRadius:"50%",background:C.borderMed}}/>)}
        </div>
      ))}
    </div>
  );
}

// ─── EDITABLE TEXT ────────────────────────────────────────────────────────────
function EditableText({ value, onChange, style, placeholder, readonly }) {
  const [editing,setEditing] = useState(false);
  const [val,setVal]         = useState(value);
  useEffect(()=>setVal(value),[value]);
  if (editing) return (
    <input autoFocus value={val} placeholder={placeholder}
      onChange={e=>setVal(e.target.value)}
      onBlur={()=>{ onChange(val||value); setEditing(false); }}
      onKeyDown={e=>{ if(e.key==="Enter"){ onChange(val||value); setEditing(false); }}}
      style={{...style,background:"transparent",border:"none",
        borderBottom:`2px solid ${C.accent}`,outline:"none",width:"100%",flex:1,padding:0}}/>
  );
  return (
    <span onDoubleClick={readonly?undefined:()=>setEditing(true)}
      title={readonly?undefined:"Double-click to edit"}
      style={{...style,cursor:readonly?"default":"text",flex:1}}>{value}</span>
  );
}

// ─── PRIORITY PICKER ─────────────────────────────────────────────────────────
function PriorityPicker({ value, onChange, readonly }) {
  const [open,setOpen] = useState(false);
  const ref = useRef();
  useEffect(()=>{
    if(!open) return;
    const h = e=>{ if(ref.current&&!ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown",h);
    return ()=>document.removeEventListener("mousedown",h);
  },[open]);
  const cfg = PRIORITY_CONFIG[value||"none"];
  if (readonly) return value&&value!=="none"?(
    <span style={{fontSize:11,fontWeight:600,color:cfg.color,background:cfg.bg,
      padding:"2px 7px",borderRadius:20,fontFamily:"system-ui,sans-serif",
      border:`1px solid ${cfg.color}30`}}>{cfg.icon} {cfg.label}</span>
  ):null;
  return (
    <div ref={ref} style={{position:"relative",flexShrink:0}}>
      <button onClick={()=>setOpen(o=>!o)}
        style={{border:`1px solid ${value&&value!=="none"?cfg.color+"60":C.border}`,
          borderRadius:20,padding:"3px 8px",
          background:value&&value!=="none"?cfg.bg:C.bgInput,
          cursor:"pointer",display:"flex",alignItems:"center",gap:4,transition:"all 0.15s",
          fontFamily:"system-ui,sans-serif",fontSize:11,fontWeight:600,
          color:value&&value!=="none"?cfg.color:C.textMute}}>
        <span>{cfg.icon}</span>
        <span>{value&&value!=="none"?cfg.label:"Priority"}</span>
      </button>
      {open&&(
        <div style={{position:"absolute",top:"calc(100% + 6px)",left:0,zIndex:50,
          background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:10,
          boxShadow:C.shadowLg,minWidth:140,overflow:"hidden",animation:"popIn 0.15s ease"}}>
          {Object.entries(PRIORITY_CONFIG).map(([key,c])=>(
            <button key={key} onClick={()=>{onChange(key);setOpen(false);}}
              style={{width:"100%",background:value===key?c.bg:"transparent",
                border:"none",padding:"9px 14px",cursor:"pointer",display:"flex",
                alignItems:"center",gap:8,transition:"background 0.1s",
                fontFamily:"system-ui,sans-serif",fontSize:13}}
              onMouseEnter={e=>e.currentTarget.style.background=c.bg}
              onMouseLeave={e=>e.currentTarget.style.background=value===key?c.bg:"transparent"}>
              <span style={{color:c.color,fontSize:12}}>{c.icon}</span>
              <span style={{color:C.text,fontWeight:value===key?600:400}}>{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── DUE DATE PICKER ─────────────────────────────────────────────────────────
function DueDatePicker({ value, onChange, readonly }) {
  const info  = value ? formatDate(value) : null;
  const color = info?.overdue?C.danger:info?.urgent?C.warn:info?.soon?C.accent:C.textSub;
  const bg    = info?.overdue?C.dangerBg:info?.urgent?C.warnBg:info?.soon?C.accentBg:C.bgInput;
  if (readonly) return value?(
    <span style={{fontSize:11,color,background:bg,padding:"2px 8px",borderRadius:20,
      fontFamily:"system-ui,sans-serif",fontWeight:500,border:`1px solid ${color}30`}}>
      📅 {info?.label}</span>
  ):null;
  return (
    <div style={{position:"relative",display:"inline-flex",alignItems:"center"}}>
      <label style={{cursor:"pointer"}}>
        <span style={{fontSize:11,color:value?color:C.textMute,
          background:value?bg:C.bgInput,padding:"3px 8px",borderRadius:20,
          border:`1px solid ${value?color+"40":C.border}`,
          fontFamily:"system-ui,sans-serif",fontWeight:500,
          display:"inline-flex",alignItems:"center",gap:4,whiteSpace:"nowrap",transition:"all 0.15s"}}>
          📅 {value?info?.label:"Due date"}
        </span>
        <input type="date" value={value||""} onChange={e=>onChange(e.target.value||null)}
          style={{position:"absolute",opacity:0,width:"100%",height:"100%",top:0,left:0,cursor:"pointer"}}/>
      </label>
      {value&&<button onClick={e=>{e.stopPropagation();onChange(null);}}
        style={{marginLeft:4,background:"none",border:"none",color:C.textMute,
          cursor:"pointer",fontSize:14,lineHeight:1,padding:"0 2px",transition:"color 0.15s"}}
        onMouseEnter={e=>e.currentTarget.style.color=C.danger}
        onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>×</button>}
    </div>
  );
}

// ─── NESTED ITEM (recursive subtasks) ────────────────────────────────────────
function NestedItem({ item, onChange, onDelete, readonly, depth=0 }) {
  const [expanded,setExpanded]     = useState(true);
  const [addingChild,setAddingChild] = useState(false);
  const [childVal,setChildVal]     = useState("");
  const children   = item.subtasks||[];
  const hasKids    = children.length>0;
  const isComplete = item.state===4;
  const d          = Math.min(depth,2);
  const lineColors = ["#D8D0C4","#E4DED8","#EDEAE6"];

  const updateChild = (childId,changes) =>
    onChange({...item,subtasks:children.map(c=>c.id===childId?{...c,...changes}:c)});

  const addChild = () => {
    if(!childVal.trim()) return;
    onChange({...item,subtasks:[...children,{id:`st${uid()}`,text:childVal.trim(),state:0,order:children.length,subtasks:[]}]});
    setChildVal(""); setAddingChild(false);
  };

  return (
    <div style={{animation:"fadeIn 0.18s ease"}}>
      <div style={{display:"flex",alignItems:"flex-start",gap:7,padding:"5px 0",
        borderBottom:`1px solid ${C.bgInput}`}}>
        <div style={{width:2,alignSelf:"stretch",background:lineColors[d],borderRadius:1,flexShrink:0,marginTop:2}}/>
        <ProgressBox state={item.state} size={20-d*2} readonly={readonly}
          onClick={()=>onChange({...item,state:STATES[(STATES.indexOf(item.state)+1)%STATES.length]})}/>
        <div style={{flex:1,minWidth:0}}>
          <EditableText value={item.text} onChange={text=>onChange({...item,text})} readonly={readonly}
            style={{fontSize:14-d,fontFamily:"'Lora',Georgia,serif",fontWeight:400,
              color:isComplete?C.textMute:C.textMed,
              textDecoration:isComplete?"line-through":"none",textDecorationColor:C.textMute,lineHeight:1.4}}/>
          {hasKids&&(
            <button onClick={()=>setExpanded(e=>!e)}
              style={{background:"none",border:"none",cursor:"pointer",padding:0,
                display:"inline-flex",alignItems:"center",gap:3,marginTop:2,
                color:C.textMute,fontFamily:"system-ui,sans-serif",fontSize:11}}>
              <span style={{display:"inline-block",transition:"transform 0.18s",
                transform:expanded?"rotate(0deg)":"rotate(-90deg)"}}>▾</span>
              <span>{children.filter(c=>c.state===4).length}/{children.length}</span>
            </button>
          )}
        </div>
        {!readonly&&(
          <div style={{display:"flex",gap:1,flexShrink:0}}>
            <button onClick={()=>setAddingChild(true)}
              style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",
                fontSize:14,padding:"1px 3px",lineHeight:1,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=C.accent}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>⊕</button>
            <button onClick={onDelete}
              style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",
                fontSize:15,padding:"1px 3px",lineHeight:1,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=C.danger}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>×</button>
          </div>
        )}
      </div>
      {expanded&&hasKids&&(
        <div style={{paddingLeft:20}}>
          {children.map(child=>(
            <NestedItem key={child.id} item={child} depth={depth+1} readonly={readonly}
              onChange={updated=>updateChild(child.id,updated)}
              onDelete={()=>onChange({...item,subtasks:children.filter(c=>c.id!==child.id)})}/>
          ))}
        </div>
      )}
      {addingChild&&!readonly&&(
        <div style={{display:"flex",gap:6,paddingLeft:20,paddingTop:4,paddingBottom:4,animation:"fadeIn 0.15s ease"}}>
          <input autoFocus value={childVal} onChange={e=>setChildVal(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")addChild();if(e.key==="Escape"){setAddingChild(false);setChildVal("");}}}
            placeholder="Add nested item… Enter to save"
            style={{flex:1,background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:6,
              padding:"5px 9px",color:C.text,fontFamily:"'Lora',Georgia,serif",fontSize:13,outline:"none"}}/>
          <button onClick={addChild} style={{background:C.accent,border:"none",borderRadius:6,
            padding:"5px 11px",color:"white",cursor:"pointer",fontSize:13,
            fontFamily:"system-ui,sans-serif",fontWeight:500}}>Add</button>
        </div>
      )}
    </div>
  );
}

// ─── TASK ROW ────────────────────────────────────────────────────────────────
function TaskRow({ task, onToggle, onEdit, onDelete, onSubChange, onDragStart, readonly }) {
  const [expanded,setExpanded] = useState(true);
  const [addingSub,setAddingSub] = useState(false);
  const [subVal,setSubVal]     = useState("");
  const subtasks   = task.subtasks||[];
  const hasSubs    = subtasks.length>0;
  const isComplete = task.state===4;

  function countNodes(items) {
    return items.reduce((acc,s)=>{
      acc.total+=1; acc.done+=s.state===4?1:0;
      if(s.subtasks?.length){const sub=countNodes(s.subtasks);acc.total+=sub.total;acc.done+=sub.done;}
      return acc;
    },{total:0,done:0});
  }
  const counts = hasSubs?countNodes(subtasks):null;
  const subPct = counts?counts.done/counts.total:null;

  const addSub = () => {
    if(!subVal.trim()) return;
    onSubChange([...subtasks,{id:`st${uid()}`,text:subVal.trim(),state:0,order:subtasks.length,subtasks:[]}]);
    setSubVal(""); setAddingSub(false);
  };
  const updateSub = (subId,updated) => onSubChange(subtasks.map(s=>s.id===subId?updated:s));

  return (
    <div style={{animation:"fadeIn 0.2s ease"}} className="task-row">
      <div style={{display:"flex",alignItems:"flex-start",gap:8,padding:"10px 12px",
        borderRadius:8,transition:"background 0.1s",
        background:isComplete?C.bgInput:C.bgCard,marginBottom:2}}
        onMouseEnter={e=>{const h=e.currentTarget.querySelector(".drag-handle");if(h)h.style.opacity="1";}}
        onMouseLeave={e=>{const h=e.currentTarget.querySelector(".drag-handle");if(h)h.style.opacity="0";}}>
        {!readonly&&<DragHandle onMouseDown={onDragStart}/>}
        <ProgressBox state={task.state} onClick={onToggle} size={22} readonly={readonly}/>
        <div style={{flex:1,minWidth:0}}>
          <EditableText value={task.text} onChange={onEdit} readonly={readonly}
            style={{fontSize:15,fontFamily:"'Lora',Georgia,serif",fontWeight:500,
              color:isComplete?C.textMute:C.text,
              textDecoration:isComplete?"line-through":"none",textDecorationColor:C.textMute,
              lineHeight:1.4,display:"block",marginBottom:4}}/>
          <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
            {!readonly&&<PriorityPicker value={task.priority||"none"} onChange={p=>onEdit(task.text,{priority:p})} readonly={readonly}/>}
            {readonly&&task.priority&&task.priority!=="none"&&<PriorityPicker value={task.priority} onChange={()=>{}} readonly/>}
            <DueDatePicker value={task.due||null} onChange={d=>onEdit(task.text,{due:d})} readonly={readonly}/>
            {hasSubs&&(
              <button onClick={()=>setExpanded(e=>!e)}
                style={{background:"none",border:"none",cursor:"pointer",display:"flex",
                  alignItems:"center",gap:4,color:C.textSub,fontSize:12,
                  fontFamily:"system-ui,sans-serif",padding:0}}>
                <span style={{transition:"transform 0.2s",display:"inline-block",
                  transform:expanded?"rotate(0)":"rotate(-90deg)"}}>▾</span>
                <span>{counts.done}/{counts.total} items</span>
                <div style={{width:40,height:3,background:C.border,borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(subPct||0)*100}%`,background:C.accentLt,transition:"width 0.3s ease"}}/>
                </div>
              </button>
            )}
          </div>
        </div>
        {!readonly&&(
          <div style={{display:"flex",gap:2,flexShrink:0,paddingTop:1}}>
            <button onClick={()=>setAddingSub(true)}
              style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",
                fontSize:16,padding:"2px 4px",lineHeight:1,transition:"color 0.15s",fontWeight:300}}
              onMouseEnter={e=>e.currentTarget.style.color=C.accent}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>⊕</button>
            <button onClick={onDelete}
              style={{background:"none",border:"none",color:C.textMute,cursor:"pointer",
                fontSize:18,padding:"2px 4px",lineHeight:1,transition:"color 0.15s"}}
              onMouseEnter={e=>e.currentTarget.style.color=C.danger}
              onMouseLeave={e=>e.currentTarget.style.color=C.textMute}>×</button>
          </div>
        )}
      </div>
      {expanded&&hasSubs&&(
        <div style={{paddingLeft:44,paddingRight:8,paddingBottom:4}}>
          {subtasks.map(sub=>(
            <NestedItem key={sub.id} item={sub} depth={0} readonly={readonly}
              onChange={updated=>updateSub(sub.id,updated)}
              onDelete={()=>onSubChange(subtasks.filter(s=>s.id!==sub.id))}/>
          ))}
        </div>
      )}
      {addingSub&&!readonly&&(
        <div style={{display:"flex",gap:6,padding:"4px 4px 6px 44px",animation:"fadeIn 0.15s ease"}}>
          <input autoFocus value={subVal} onChange={e=>setSubVal(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter")addSub();if(e.key==="Escape"){setAddingSub(false);setSubVal("");}}}
            placeholder="Add subtask… Enter to save, Esc to cancel"
            style={{flex:1,background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:6,
              padding:"6px 10px",color:C.text,fontFamily:"'Lora',Georgia,serif",fontSize:13,outline:"none"}}/>
          <button onClick={addSub} style={{background:C.accent,border:"none",borderRadius:6,
            padding:"6px 12px",color:"white",cursor:"pointer",fontSize:13,
            fontFamily:"system-ui,sans-serif",fontWeight:500}}>Add</button>
        </div>
      )}
    </div>
  );
}

// ─── SHARE MODAL ─────────────────────────────────────────────────────────────
function ShareModal({ list, onToggle, onClose }) {
  const [copied,setCopied] = useState(false);
  const url = list.shareId?shareUrl(list.shareId):null;
  const copy = ()=>{ navigator.clipboard.writeText(url); setCopied(true); setTimeout(()=>setCopied(false),2000); };
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",display:"flex",
      alignItems:"center",justifyContent:"center",zIndex:300,padding:20}} onClick={onClose}>
      <div style={{background:C.bgCard,borderRadius:16,padding:28,maxWidth:460,width:"100%",
        boxShadow:C.shadowLg,animation:"slideUp 0.2s ease"}} onClick={e=>e.stopPropagation()}>
        <h3 style={{fontFamily:"'Lora',Georgia,serif",fontSize:20,color:C.text,marginBottom:6}}>
          Share "{list.title}"</h3>
        <p style={{color:C.textSub,fontSize:14,marginBottom:20,lineHeight:1.6,fontFamily:"system-ui,sans-serif"}}>
          Anyone with the link can view this list (read-only). They can't edit it.</p>
        {!list.shared?(
          <button onClick={()=>onToggle(true)} style={{width:"100%",background:C.accent,border:"none",
            borderRadius:10,padding:"12px",color:"white",fontSize:15,cursor:"pointer",
            fontFamily:"system-ui,sans-serif",fontWeight:600}}>Generate Shareable Link</button>
        ):(
          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            <div style={{display:"flex",gap:8}}>
              <input readOnly value={url} style={{flex:1,background:C.bgInput,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"9px 12px",color:C.textMed,fontSize:12,fontFamily:"monospace",outline:"none"}}/>
              <button onClick={copy} style={{background:copied?C.accentBg:C.bgInput,
                border:`1px solid ${copied?C.accentLt:C.border}`,borderRadius:8,padding:"9px 14px",
                color:copied?C.accent:C.textMed,cursor:"pointer",fontFamily:"system-ui,sans-serif",
                fontSize:13,fontWeight:500,transition:"all 0.2s",whiteSpace:"nowrap"}}>
                {copied?"✓ Copied!":"Copy"}</button>
            </div>
            <button onClick={()=>onToggle(false)} style={{background:C.dangerBg,
              border:`1px solid ${C.danger}30`,borderRadius:8,padding:"8px",color:C.danger,
              cursor:"pointer",fontSize:13,fontFamily:"system-ui,sans-serif",fontWeight:500}}>
              Revoke Link</button>
          </div>
        )}
        <button onClick={onClose} style={{marginTop:14,background:"none",border:"none",
          color:C.textSub,cursor:"pointer",fontSize:13,fontFamily:"system-ui,sans-serif"}}>Close</button>
      </div>
    </div>
  );
}

// ─── LIST CARD ───────────────────────────────────────────────────────────────
function ListCard({ list, onUpdate, onDelete, idx }) {
  const [newTask,setNewTask]   = useState("");
  const [showShare,setShowShare] = useState(false);
  const dragIdx = useRef(null);

  const taskCount = list.tasks.length;
  function sumStates(items) {
    return items.reduce((acc,t)=>{
      acc.total+=1; acc.sum+=t.state;
      if(t.subtasks?.length){const c=sumStates(t.subtasks);acc.total+=c.total;acc.sum+=c.sum;}
      return acc;
    },{total:0,sum:0});
  }
  const {total,sum} = sumStates(list.tasks);
  const prog = total===0?0:sum/(total*4);

  const updateTask = (taskId,changes) =>
    onUpdate({...list,tasks:list.tasks.map(t=>t.id===taskId?{...t,...changes}:t)});
  const addTask = () => {
    if(!newTask.trim()) return;
    onUpdate({...list,tasks:[...list.tasks,{id:`t${uid()}`,text:newTask.trim(),state:0,
      order:list.tasks.length,priority:"none",due:null,subtasks:[]}]});
    setNewTask("");
  };
  const handleDragEnter = (i2) => {
    if(dragIdx.current===null||dragIdx.current===i2) return;
    const tasks=[...list.tasks];
    const [d]=tasks.splice(dragIdx.current,1);
    tasks.splice(i2,0,d);
    dragIdx.current=i2;
    onUpdate({...list,tasks:tasks.map((t,i)=>({...t,order:i}))});
  };
  const toggleShare = (enable) => onUpdate({...list,shared:enable,shareId:enable?uid()+uid():null});

  const done   = list.tasks.filter(t=>t.state===4).length;
  const active = list.tasks.filter(t=>t.state>0&&t.state<4).length;
  const overdueTasks = list.tasks.filter(t=>t.due&&formatDate(t.due)?.overdue&&t.state!==4).length;

  return (
    <>
      {showShare&&<ShareModal list={list} onToggle={toggleShare} onClose={()=>setShowShare(false)}/>}
      <div style={{background:C.bgCard,border:`1px solid ${C.border}`,borderRadius:16,
        padding:"20px 16px 14px",boxShadow:C.shadow,
        animation:`fadeSlide 0.3s ease ${idx*0.05}s both`,display:"flex",flexDirection:"column"}}>
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:8}}>
          <div style={{flex:1,minWidth:0}}>
            <EditableText value={list.title} onChange={title=>onUpdate({...list,title})}
              style={{fontFamily:"'Lora',Georgia,serif",fontSize:18,fontWeight:700,
                color:C.text,letterSpacing:"-0.01em",display:"block"}}/>
            {overdueTasks>0&&<span style={{fontSize:11,color:C.danger,fontFamily:"system-ui,sans-serif",
              fontWeight:500,marginTop:2,display:"block"}}>⚠ {overdueTasks} overdue</span>}
          </div>
          <div style={{display:"flex",gap:6,flexShrink:0,marginLeft:8}}>
            <button onClick={()=>setShowShare(true)} style={{
              background:list.shared?C.accentBg:C.bgInput,
              border:`1px solid ${list.shared?C.accentLt+"60":C.border}`,
              borderRadius:20,padding:"4px 10px",color:list.shared?C.accent:C.textSub,
              cursor:"pointer",fontFamily:"system-ui,sans-serif",fontSize:12,fontWeight:500,transition:"all 0.15s"}}>
              {list.shared?"🔗 Shared":"Share"}</button>
            <button onClick={onDelete} style={{background:"none",border:`1px solid ${C.border}`,
              borderRadius:20,padding:"4px 8px",color:C.textMute,cursor:"pointer",fontSize:12,transition:"all 0.15s"}}
              onMouseEnter={e=>{e.currentTarget.style.borderColor=C.danger;e.currentTarget.style.color=C.danger;}}
              onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMute;}}>✕</button>
          </div>
        </div>
        <div style={{height:5,background:C.bgInput,borderRadius:3,marginBottom:14,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${prog*100}%`,
            background:`linear-gradient(90deg,${C.accent},${C.accentLt})`,
            borderRadius:3,transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)"}}/>
        </div>
        <div>
          {list.tasks.map((task,i)=>(
            <div key={task.id} draggable
              onDragStart={()=>{dragIdx.current=i;}}
              onDragEnter={()=>handleDragEnter(i)}
              onDragEnd={()=>{dragIdx.current=null;}}
              onDragOver={e=>e.preventDefault()}>
              <TaskRow task={task}
                onToggle={()=>updateTask(task.id,{state:STATES[(STATES.indexOf(task.state)+1)%STATES.length]})}
                onEdit={(text,extra={})=>updateTask(task.id,{text,...extra})}
                onDelete={()=>onUpdate({...list,tasks:list.tasks.filter(t=>t.id!==task.id)})}
                onSubChange={subtasks=>updateTask(task.id,{subtasks})}
                onDragStart={()=>{dragIdx.current=i;}}/>
            </div>
          ))}
          {taskCount===0&&(
            <div style={{textAlign:"center",padding:"20px 0",color:C.textMute,
              fontFamily:"'Lora',Georgia,serif",fontStyle:"italic",fontSize:14}}>
              No tasks yet — add one below</div>
          )}
        </div>
        <div style={{display:"flex",gap:8,marginTop:12}}>
          <input value={newTask} onChange={e=>setNewTask(e.target.value)}
            onKeyDown={e=>e.key==="Enter"&&addTask()} placeholder="Add a task…"
            style={{flex:1,background:C.bgInput,border:`1px solid ${C.border}`,borderRadius:8,
              padding:"9px 12px",color:C.text,fontFamily:"'Lora',Georgia,serif",fontSize:14,
              outline:"none",transition:"border-color 0.2s"}}
            onFocus={e=>e.target.style.borderColor=C.accentLt}
            onBlur={e=>e.target.style.borderColor=C.border}/>
          <button onClick={addTask} style={{background:C.accent,border:"none",borderRadius:8,
            padding:"9px 16px",color:"white",fontWeight:700,fontSize:18,cursor:"pointer",
            transition:"background 0.15s",flexShrink:0}}
            onMouseEnter={e=>e.currentTarget.style.background="#235c40"}
            onMouseLeave={e=>e.currentTarget.style.background=C.accent}>+</button>
        </div>
        {taskCount>0&&(
          <div style={{marginTop:10,display:"flex",gap:12,flexWrap:"wrap",
            fontFamily:"system-ui,sans-serif",fontSize:12,color:C.textMute}}>
            <span style={{color:C.accent,fontWeight:500}}>✓ {done} done</span>
            <span style={{color:C.warn,fontWeight:500}}>◨ {active} active</span>
            <span>□ {taskCount-done-active} queued</span>
            {overdueTasks>0&&<span style={{color:C.danger,fontWeight:500}}>⚠ {overdueTasks} overdue</span>}
          </div>
        )}
      </div>
    </>
  );
}

// ─── SHARED VIEW (read-only, no auth needed) ──────────────────────────────────
function SharedView({ shareId }) {
  const [list,setList] = useState(null);
  const [err,setErr]   = useState(null);
  useEffect(()=>{
    initFirebase().then(async fb=>{
      if(!fb){setErr("Firebase not configured.");return;}
      try {
        const snap=await fb.getDocs(fb.collection(fb.db,"gradual-shared"));
        const found=snap.docs.map(d=>d.data()).find(l=>l.shareId===shareId);
        if(found) setList(found); else setErr("List not found or sharing was disabled.");
      } catch { setErr("Failed to load."); }
    });
  },[shareId]);

  if(err||!list) return (
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:C.bg,padding:20}}>
      <div style={{textAlign:"center"}}>
        <div style={{fontSize:40,marginBottom:12}}>🌿</div>
        <div style={{fontFamily:"'Lora',Georgia,serif",fontSize:20,color:C.text,marginBottom:8}}>
          {err?"List not found":"Loading…"}</div>
        {err&&<div style={{color:C.textSub,fontSize:14,fontFamily:"system-ui,sans-serif"}}>{err}</div>}
        <a href={window.location.pathname} style={{display:"block",marginTop:20,color:C.accent,fontSize:14,fontFamily:"system-ui,sans-serif"}}>Open Gradual →</a>
      </div>
    </div>
  );
  const prog = list.tasks.length===0?0:list.tasks.reduce((a,t)=>a+t.state,0)/(list.tasks.length*4);
  return (
    <div style={{minHeight:"100vh",background:C.bg,padding:"40px 20px 60px"}}>
      <div style={{maxWidth:560,margin:"0 auto"}}>
        <div style={{fontFamily:"system-ui,sans-serif",fontSize:11,color:C.textMute,
          letterSpacing:"0.08em",textTransform:"uppercase",marginBottom:8}}>Shared via Gradual · Read-only</div>
        <h1 style={{fontFamily:"'Lora',Georgia,serif",fontSize:32,color:C.text,marginBottom:6}}>{list.title}</h1>
        <div style={{height:4,background:C.border,borderRadius:2,marginBottom:24,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${prog*100}%`,background:C.accentLt,transition:"width 0.5s"}}/>
        </div>
        <div style={{background:C.bgCard,borderRadius:12,padding:"12px 16px",boxShadow:C.shadow}}>
          {list.tasks.map(task=>(
            <TaskRow key={task.id} task={task} readonly
              onToggle={()=>{}} onEdit={()=>{}} onDelete={()=>{}} onSubChange={()=>{}}/>
          ))}
        </div>
        <div style={{marginTop:32,textAlign:"center"}}>
          <a href={window.location.pathname} style={{fontFamily:"system-ui,sans-serif",fontSize:13,color:C.accent}}>
            Create your own lists with Gradual →</a>
        </div>
      </div>
    </div>
  );
}

// ─── AUTH SCREEN ─────────────────────────────────────────────────────────────
function AuthScreen({ onAuth }) {
  const [mode,setMode]       = useState("login"); // "login" | "signup"
  const [email,setEmail]     = useState("");
  const [password,setPassword] = useState("");
  const [name,setName]       = useState("");
  const [error,setError]     = useState("");
  const [loading,setLoading] = useState(false);

  const submit = async () => {
    if(!email||!password) return setError("Please enter email and password.");
    setLoading(true); setError("");
    const fb = await initFirebase();
    if(!fb){ setError("Firebase not configured."); setLoading(false); return; }
    try {
      if(mode==="signup"){
        const cred = await fb.createUserWithEmailAndPassword(fb.auth,email,password);
        if(name) await fb.updateProfile(cred.user,{displayName:name});
      } else {
        await fb.signInWithEmailAndPassword(fb.auth,email,password);
      }
      // onAuth called automatically via onAuthStateChanged
    } catch(e) {
      const msgs = {
        "auth/email-already-in-use":"That email is already registered. Try logging in.",
        "auth/weak-password":"Password must be at least 6 characters.",
        "auth/user-not-found":"No account found with that email.",
        "auth/wrong-password":"Incorrect password.",
        "auth/invalid-email":"Please enter a valid email address.",
        "auth/invalid-credential":"Incorrect email or password.",
      };
      setError(msgs[e.code]||e.message);
    }
    setLoading(false);
  };

  const googleSignIn = async () => {
    setLoading(true); setError("");
    const fb = await initFirebase();
    if(!fb){ setError("Firebase not configured."); setLoading(false); return; }
    try {
      const provider = new fb.GoogleAuthProvider();
      await fb.signInWithPopup(fb.auth,provider);
    } catch(e) {
      if(e.code!=="auth/popup-closed-by-user") setError(e.message);
    }
    setLoading(false);
  };

  const inputStyle = {
    width:"100%", background:C.bgInput, border:`1px solid ${C.border}`,
    borderRadius:8, padding:"11px 14px", color:C.text,
    fontFamily:"system-ui,sans-serif", fontSize:14, outline:"none",
    transition:"border-color 0.2s",
  };

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",padding:20}}>
      <div style={{width:"100%",maxWidth:400,animation:"fadeSlide 0.4s ease both"}}>

        {/* Logo */}
        <div style={{textAlign:"center",marginBottom:32}}>
          <div style={{width:56,height:56,background:C.accent,borderRadius:14,
            display:"inline-flex",alignItems:"center",justifyContent:"center",
            fontSize:28,color:"white",fontWeight:700,fontFamily:"'Lora',Georgia,serif",
            boxShadow:`0 4px 16px ${C.accent}40`,marginBottom:12}}>G</div>
          <h1 style={{fontFamily:"'Lora',Georgia,serif",fontSize:28,fontWeight:700,
            color:C.text,letterSpacing:"-0.02em"}}>Gradual</h1>
          <p style={{color:C.textSub,fontSize:14,fontFamily:"system-ui,sans-serif",marginTop:4}}>
            Track progress on every task</p>
        </div>

        {/* Card */}
        <div style={{background:C.bgCard,borderRadius:16,padding:28,boxShadow:C.shadowLg}}>
          <h2 style={{fontFamily:"'Lora',Georgia,serif",fontSize:20,color:C.text,
            marginBottom:20,fontWeight:600}}>
            {mode==="login"?"Welcome back":"Create your account"}</h2>

          {/* Google button */}
          <button onClick={googleSignIn} disabled={loading}
            style={{width:"100%",background:C.bgCard,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"11px",color:C.text,fontFamily:"system-ui,sans-serif",
              fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",
              justifyContent:"center",gap:10,marginBottom:16,boxShadow:C.shadow,
              transition:"all 0.15s",opacity:loading?0.6:1}}
            onMouseEnter={e=>e.currentTarget.style.borderColor=C.accentLt}
            onMouseLeave={e=>e.currentTarget.style.borderColor=C.border}>
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Continue with Google
          </button>

          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:16}}>
            <div style={{flex:1,height:1,background:C.border}}/>
            <span style={{color:C.textMute,fontSize:12,fontFamily:"system-ui,sans-serif"}}>or</span>
            <div style={{flex:1,height:1,background:C.border}}/>
          </div>

          <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {mode==="signup"&&(
              <input value={name} onChange={e=>setName(e.target.value)}
                placeholder="Your name (optional)" style={inputStyle}
                onFocus={e=>e.target.style.borderColor=C.accentLt}
                onBlur={e=>e.target.style.borderColor=C.border}/>
            )}
            <input value={email} onChange={e=>setEmail(e.target.value)}
              type="email" placeholder="Email address" style={inputStyle}
              onFocus={e=>e.target.style.borderColor=C.accentLt}
              onBlur={e=>e.target.style.borderColor=C.border}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
            <input value={password} onChange={e=>setPassword(e.target.value)}
              type="password" placeholder="Password (min. 6 characters)" style={inputStyle}
              onFocus={e=>e.target.style.borderColor=C.accentLt}
              onBlur={e=>e.target.style.borderColor=C.border}
              onKeyDown={e=>e.key==="Enter"&&submit()}/>
          </div>

          {error&&(
            <div style={{marginTop:12,padding:"10px 12px",background:C.dangerBg,
              border:`1px solid ${C.danger}30`,borderRadius:8,color:C.danger,
              fontSize:13,fontFamily:"system-ui,sans-serif"}}>{error}</div>
          )}

          <button onClick={submit} disabled={loading}
            style={{marginTop:16,width:"100%",background:C.accent,border:"none",
              borderRadius:10,padding:"12px",color:"white",fontSize:15,cursor:"pointer",
              fontFamily:"system-ui,sans-serif",fontWeight:600,transition:"background 0.15s",
              opacity:loading?0.7:1}}
            onMouseEnter={e=>!loading&&(e.currentTarget.style.background="#235c40")}
            onMouseLeave={e=>e.currentTarget.style.background=C.accent}>
            {loading?"Please wait…":mode==="login"?"Sign in":"Create account"}
          </button>

          <p style={{marginTop:16,textAlign:"center",fontFamily:"system-ui,sans-serif",
            fontSize:13,color:C.textSub}}>
            {mode==="login"?"Don't have an account? ":"Already have an account? "}
            <button onClick={()=>{setMode(mode==="login"?"signup":"login");setError("");}}
              style={{background:"none",border:"none",color:C.accent,cursor:"pointer",
                fontFamily:"system-ui,sans-serif",fontSize:13,fontWeight:600,padding:0}}>
              {mode==="login"?"Sign up":"Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── SYNC BADGE ──────────────────────────────────────────────────────────────
function SyncBadge({ status }) {
  const map = {
    synced:  {c:C.accent,   l:"● Synced"},
    syncing: {c:C.warn,     l:"● Syncing…"},
    error:   {c:C.danger,   l:"● Error"},
    offline: {c:C.textMute, l:"○ Local"},
  };
  return <span style={{fontFamily:"system-ui,sans-serif",fontSize:12,fontWeight:500,
    color:map[status].c,transition:"color 0.3s"}}>{map[status].l}</span>;
}

// ─── MAIN APP (authenticated) ────────────────────────────────────────────────
function MainApp({ user, fb }) {
  const [lists,setLists]       = useState([]);
  const [syncStatus,setSyncStatus] = useState("syncing");
  const [showSetup,setShowSetup]   = useState(false);
  const [loaded,setLoaded]         = useState(false);
  const syncTimer = useRef(null);

  // Each user's lists live at: users/{uid}/lists/{listId}
  const userListsCol = () => fb.collection(fb.db,`users/${user.uid}/lists`);
  const userListDoc  = (id) => fb.doc(fb.db,`users/${user.uid}/lists`,id);

  useEffect(()=>{
    const load = async () => {
      try {
        const snap = await fb.getDocs(userListsCol());
        const loaded = snap.docs.map(d=>d.data()).sort((a,b)=>a.order-b.order);
        setLists(loaded);
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
      setLoaded(true);
    };
    load();
  },[user.uid]);

  const syncUp = useCallback((nl)=>{
    if(syncTimer.current) clearTimeout(syncTimer.current);
    setSyncStatus("syncing");
    syncTimer.current = setTimeout(async()=>{
      try {
        await Promise.all(nl.map(l=>fb.setDoc(userListDoc(l.id),l)));
        // Also sync shared lists to public collection for share links
        await Promise.all(nl.filter(l=>l.shared).map(l=>
          fb.setDoc(fb.doc(fb.db,"gradual-shared",l.id),l)
        ));
        setSyncStatus("synced");
      } catch { setSyncStatus("error"); }
    },700);
  },[user.uid]);

  const updateLists = (nl)=>{ setLists(nl); syncUp(nl); };
  const updateList  = (ul)=>updateLists(lists.map(l=>l.id===ul.id?ul:l));
  const deleteList  = async(id)=>{
    const nl=lists.filter(l=>l.id!==id); setLists(nl);
    try {
      await fb.deleteDoc(userListDoc(id));
      await fb.deleteDoc(fb.doc(fb.db,"gradual-shared",id));
    } catch {}
  };
  const addList = ()=>updateLists([...lists,{
    id:`l${uid()}`,title:"New List",order:lists.length,shared:false,shareId:null,tasks:[],
  }]);
  const signOut = ()=>fb.signOut(fb.auth);

  const displayName = user.displayName||user.email?.split("@")[0]||"there";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};color:${C.text};-webkit-font-smoothing:antialiased;}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.96) translateY(-4px)}to{opacity:1;transform:scale(1) translateY(0)}}
        input::placeholder{color:${C.textMute};}
        ::-webkit-scrollbar{width:5px;}
        ::-webkit-scrollbar-thumb{background:${C.border};border-radius:3px;}
        [draggable]{user-select:none;}
        input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;}
      `}</style>

      <div style={{minHeight:"100vh",background:C.bg,padding:"32px 16px 60px"}}>
        <div style={{maxWidth:860,margin:"0 auto 28px",animation:"fadeSlide 0.4s ease both"}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
            flexWrap:"wrap",gap:12,marginBottom:16}}>
            <div>
              <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
                <div style={{width:32,height:32,background:C.accent,borderRadius:8,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  fontSize:16,color:"white",fontWeight:700,fontFamily:"'Lora',Georgia,serif",
                  boxShadow:`0 2px 8px ${C.accent}40`}}>G</div>
                <h1 style={{fontFamily:"'Lora',Georgia,serif",fontSize:"clamp(22px,4vw,32px)",
                  fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>Gradual</h1>
              </div>
              <p style={{fontFamily:"system-ui,sans-serif",fontSize:14,color:C.textSub}}>
                Hey {displayName} — track progress on every task.</p>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
              <SyncBadge status={syncStatus}/>
              <button onClick={signOut} style={{background:C.bgCard,border:`1px solid ${C.border}`,
                borderRadius:8,padding:"7px 14px",color:C.textMed,cursor:"pointer",
                fontFamily:"system-ui,sans-serif",fontSize:13,fontWeight:500,
                boxShadow:C.shadow,transition:"all 0.15s"}}
                onMouseEnter={e=>{e.currentTarget.style.borderColor=C.danger;e.currentTarget.style.color=C.danger;}}
                onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMed;}}>
                Sign out</button>
            </div>
          </div>
          <div style={{display:"flex",gap:16,flexWrap:"wrap",
            fontFamily:"system-ui,sans-serif",fontSize:12,color:C.textMute}}>
            <span>○ Not started</span>
            <span style={{color:C.accentLt}}>25 · 50 · 75% in progress</span>
            <span style={{color:C.accent}}>☑ Complete</span>
            <span>· Click checkbox to cycle · ⊕ add subtask · drag to reorder</span>
          </div>
        </div>

        <div style={{maxWidth:860,margin:"0 auto",
          display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:16}}>
          {lists.map((list,i)=>(
            <ListCard key={list.id} list={list} idx={i}
              onUpdate={updateList} onDelete={()=>deleteList(list.id)}/>
          ))}
          <button onClick={addList} style={{
            background:C.bgCard,border:`2px dashed ${C.border}`,borderRadius:16,
            padding:"48px 22px",color:C.textMute,cursor:"pointer",
            fontFamily:"'Lora',Georgia,serif",fontSize:16,display:"flex",
            alignItems:"center",justifyContent:"center",gap:10,minHeight:120,
            transition:"all 0.2s",boxShadow:"none"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accentLt;e.currentTarget.style.color=C.accent;e.currentTarget.style.boxShadow=C.shadow;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMute;e.currentTarget.style.boxShadow="none";}}>
            <span style={{fontSize:22}}>+</span> New List
          </button>
        </div>

        <div style={{maxWidth:860,margin:"36px auto 0",textAlign:"center",
          fontFamily:"system-ui,sans-serif",fontSize:12,color:C.textMute}}>
          Gradual — make progress visible
        </div>
      </div>
    </>
  );
}

// ─── APP ROOT ────────────────────────────────────────────────────────────────
export default function App() {
  const shareId = getShareId();
  if (shareId) return <SharedView shareId={shareId}/>;

  const [user,setUser]       = useState(undefined); // undefined=loading, null=logged out
  const [fb,setFb]           = useState(null);
  const [fbError,setFbError] = useState(false);

  useEffect(()=>{
    if(!FIREBASE_ENABLED){ setUser(null); setFbError(true); return; }
    initFirebase().then(fbMod=>{
      if(!fbMod){ setUser(null); setFbError(true); return; }
      setFb(fbMod);
      fbMod.onAuthStateChanged(fbMod.auth, u=>setUser(u||null));
    });
  },[]);

  // Loading spinner
  if(user===undefined) return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex",alignItems:"center",
      justifyContent:"center",flexDirection:"column",gap:16}}>
      <div style={{width:40,height:40,background:C.accent,borderRadius:10,
        display:"flex",alignItems:"center",justifyContent:"center",
        color:"white",fontWeight:700,fontSize:20,fontFamily:"'Lora',Georgia,serif",
        animation:"pulse 1.5s ease infinite"}}>G</div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@700&display=swap');
        @keyframes pulse{0%,100%{opacity:0.4}50%{opacity:1}}
        *{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};}
      `}</style>
    </div>
  );

  // Firebase not configured — show local-only mode
  if(fbError||!FIREBASE_ENABLED) return <LocalOnlyApp/>;

  // Not logged in
  if(!user) return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:wght@400;600;700&display=swap');
        *{box-sizing:border-box;margin:0;padding:0;}body{background:${C.bg};}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      <AuthScreen onAuth={setUser}/>
    </>
  );

  // Logged in
  return <MainApp user={user} fb={fb}/>;
}

// ─── LOCAL-ONLY FALLBACK (no Firebase) ───────────────────────────────────────
function LocalOnlyApp() {
  const [lists,setLists] = useState(()=>{
    try{const s=localStorage.getItem("gradual-v3");return s?JSON.parse(s):[];}catch{return [];}
  });
  useEffect(()=>{
    try{localStorage.setItem("gradual-v3",JSON.stringify(lists));}catch{}
  },[lists]);

  const updateLists = nl=>setLists(nl);
  const updateList  = ul=>updateLists(lists.map(l=>l.id===ul.id?ul:l));
  const deleteList  = id=>setLists(lists.filter(l=>l.id!==id));
  const addList     = ()=>updateLists([...lists,{id:`l${uid()}`,title:"New List",order:lists.length,shared:false,shareId:null,tasks:[]}]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:${C.bg};-webkit-font-smoothing:antialiased;}
        @keyframes fadeSlide{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
        @keyframes fadeIn{from{opacity:0}to{opacity:1}}
        @keyframes slideUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(0.96)}to{opacity:1;transform:scale(1)}}
        input::placeholder{color:${C.textMute};}
        [draggable]{user-select:none;}
        input[type="date"]::-webkit-calendar-picker-indicator{opacity:0;}
      `}</style>
      <div style={{minHeight:"100vh",background:C.bg,padding:"32px 16px 60px"}}>
        <div style={{maxWidth:860,margin:"0 auto 28px"}}>
          <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
            <div style={{width:32,height:32,background:C.accent,borderRadius:8,display:"flex",
              alignItems:"center",justifyContent:"center",fontSize:16,color:"white",
              fontWeight:700,fontFamily:"'Lora',Georgia,serif"}}>G</div>
            <h1 style={{fontFamily:"'Lora',Georgia,serif",fontSize:28,fontWeight:700,color:C.text}}>Gradual</h1>
          </div>
          <div style={{padding:"8px 12px",background:C.warnBg,border:`1px solid ${C.warn}40`,
            borderRadius:8,fontFamily:"system-ui,sans-serif",fontSize:13,color:C.warn,marginTop:8}}>
            ⚠ Running in local mode — add your Firebase config to enable accounts and sync.
          </div>
        </div>
        <div style={{maxWidth:860,margin:"0 auto",
          display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(380px,1fr))",gap:16}}>
          {lists.map((list,i)=>(
            <ListCard key={list.id} list={list} idx={i}
              onUpdate={updateList} onDelete={()=>deleteList(list.id)}/>
          ))}
          <button onClick={addList} style={{background:C.bgCard,border:`2px dashed ${C.border}`,
            borderRadius:16,padding:"48px 22px",color:C.textMute,cursor:"pointer",
            fontFamily:"'Lora',Georgia,serif",fontSize:16,display:"flex",
            alignItems:"center",justifyContent:"center",gap:10,minHeight:120,transition:"all 0.2s"}}
            onMouseEnter={e=>{e.currentTarget.style.borderColor=C.accentLt;e.currentTarget.style.color=C.accent;}}
            onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.color=C.textMute;}}>
            <span style={{fontSize:22}}>+</span> New List
          </button>
        </div>
      </div>
    </>
  );
}
