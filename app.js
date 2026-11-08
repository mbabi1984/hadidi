import {defaultProgram, references, weekdays} from './data.js';

const KEY='tamareeni.pwa.v2';
const clone=x=>JSON.parse(JSON.stringify(x));
const newState=()=>({version:2,programRevision:5,program:clone(defaultProgram),active:null,history:[],metrics:[],cardio:[],settings:{restSeconds:90,autoRest:true}});
const html=(v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fmt=(n,d=0)=>Number.isFinite(Number(n))?Number(n).toLocaleString('en-US',{maximumFractionDigits:d}):'0';
const pad=n=>String(n).padStart(2,'0');
const localDate=(date=new Date())=>`${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}`;
const dateLabel=x=>{try{return new Date(x.length===10?x+'T12:00:00':x).toLocaleDateString('ar-SA-u-ca-gregory',{year:'numeric',month:'short',day:'numeric'});}catch{return x;}};
const minutes=x=>Math.max(0,Math.round(x/60000));
const durLabel=ms=>`${Math.floor(Math.max(0,ms)/3600000)?Math.floor(ms/3600000)+' س ':''}${Math.floor((Math.max(0,ms)%3600000)/60000)} د`;
const dClock=ms=>`${pad(Math.floor(Math.max(0,ms)/3600000))}:${pad(Math.floor((Math.max(0,ms)%3600000)/60000))}:${pad(Math.floor((Math.max(0,ms)%60000)/1000))}`;
const completed=exercise=>exercise.sets.filter(s=>s.done&&s.reps!==''&&s.weight!=='');
const sessionSets=s=>s.exercises.reduce((a,e)=>a+completed(e).length,0);
const targetSets=s=>s.exercises.reduce((a,e)=>a+e.sets.length,0);
const volume=s=>s.exercises.reduce((a,e)=>a+completed(e).reduce((sum,set)=>sum+Number(set.weight)*Number(set.reps)*(e.weightMultiplier||1),0),0);
const alertText=(v)=>toast(v);
let db;
try{const saved=JSON.parse(localStorage.getItem(KEY));db=saved?.version===2&&Array.isArray(saved.program)&&Array.isArray(saved.history)?saved:newState();}catch{db=newState();}
// Update only exercises with unchanged old defaults; retain custom edits, session drafts and history.
function migrateProgram(state){
  const revision=state.programRevision||0;
  const replace=(routineId,oldId,oldEnglish,newId,newArabic,newEnglish,options={})=>{
    const routine=state.program.find(r=>r.id===routineId);
    const ex=routine?.exercises.find(x=>x.id===oldId&&x.en===oldEnglish);
    if(ex)Object.assign(ex,{id:newId,ar:newArabic,en:newEnglish,...options});
  };
  if(revision<3){
    replace('upper-a','triceps_pushdown','Triceps Pushdown','triceps_machine','ترايسبس جهاز','Triceps Machine');
    replace('upper-a','biceps_curl','Cable Biceps Curl','biceps_machine','بايسبس كيرل جهاز','Biceps Curl Machine',{tip:'مرجع الكيبل السابق لا ينطبق على الجهاز الجديد.'});
    replace('upper-b','hammer_curl','Hammer Curl','hammer_dumbbell','هامر كيرل دامبل','Dumbbell Hammer Curl',{weightMultiplier:2,tip:'سجّل وزن الدمبل الواحد لكل يد. الحجم التدريبي يُحسب لليدين معًا.'});
    replace('upper-b','triceps_machine','Triceps Machine','triceps_overhead','تمديد ترايسبس فوق الرأس كيبل','Overhead Cable Triceps Extension',{tip:'خفّف الوزن أو غيّر التمرين عند ألم الكتف.'});
  }
  if(revision<4){
    const lower=state.program.find(r=>r.id==='lower-a');
    const core=lower?.exercises.find(x=>x.id==='pallof_press'&&x.en==='Cable Pallof Press'&&x.sets===2&&x.min===10&&x.max===12);
    if(core)Object.assign(core,{id:'ab_crunch_machine',ar:'كرنش البطن (جهاز)',en:'Abdominal Crunch Machine',sets:3,min:10,max:15,tip:'تحكم بثني البطن دون ألم في أسفل الظهر.'});
  }
  if(revision<5){
    // Balance workout days, but change the set count only on old default presets.
    for(const [routineId,exId,oldSets] of [['upper-a','seated_row',3],['upper-a','biceps_machine',3],['upper-b','straight_arm',3]]){
      const routine=state.program.find(r=>r.id===routineId);
      const ex=routine?.exercises.find(e=>e.id===exId&&e.sets===oldSets);
      if(ex)ex.sets=2;
    }
    // Migrate forearm work off the upper days to the ends of lower days.
    for(const [oldRoutineId,newRoutineId,exId] of [['upper-a','lower-a','wrist_curl'],['upper-b','lower-b','reverse_wrist_curl']]){
      const oldRoutine=state.program.find(r=>r.id===oldRoutineId);
      const newRoutine=state.program.find(r=>r.id===newRoutineId);
      if(!newRoutine)continue;
      const oldIndex=oldRoutine?.exercises.findIndex(x=>x.id===exId)??-1;
      const moved=oldIndex>=0?oldRoutine.exercises.splice(oldIndex,1)[0]:null;
      if(!newRoutine.exercises.some(e=>e.id===exId)){
        const fresh=defaultProgram.find(r=>r.id===newRoutineId)?.exercises.find(e=>e.id===exId);
        if(moved||fresh)newRoutine.exercises.push(moved||clone(fresh));
      }
    }
  }
  state.programRevision=5;
}
migrateProgram(db);
try{localStorage.setItem(KEY,JSON.stringify(db));}catch{}
db.settings={restSeconds:90,autoRest:true,...db.settings};db.metrics=Array.isArray(db.metrics)?db.metrics:[];db.cardio=Array.isArray(db.cardio)?db.cardio:[];
let route='home';let selectedStrengthId='chest_press';let restEnd=0;let installPrompt=null;let toastTimer=null;let timerFinished=false;
const view=document.getElementById('view');const dialog=document.getElementById('modal');const modalContent=document.getElementById('modal-content');
function persist(){try{localStorage.setItem(KEY,JSON.stringify(db));return true;}catch(e){toast('ذاكرة المتصفح ممتلئة؛ صدّر نسخة احتياطية');return false;}}
function toast(msg){const el=document.getElementById('toast');el.textContent=msg;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),3300);}
function navigate(page){route=page;render();window.scrollTo({top:0,behavior:'instant'});}
function modal(markup){modalContent.innerHTML=markup;dialog.showModal();}
function closeModal(){if(dialog.open)dialog.close();}
function showConfirm(title,description,yesAction,extra=''){
  modal(`<h3>${html(title)}</h3><p class="sub">${html(description)}</p><div class="modal-actions"><button class="btn ghost" data-action="close-modal">تراجع</button><button class="btn danger" data-action="${html(yesAction)}" ${extra}>تأكيد</button></div>`);
}
function baseline(exId){
  for(const s of [...db.history].sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt))){
    const ex=s.exercises.find(e=>e.id===exId&&completed(e).length);
    if(ex)return {date:s.endedAt,entries:completed(ex).map(set=>[Number(set.weight),Number(set.reps)]),fromHistory:true};
  }
  return references[exId]||null;
}
function rName(id){return db.program.find(r=>r.id===id)?.name||id;}
function todayRoutine(){return db.program.find(r=>r.day===new Date().getDay());}
function getRoutine(id){return db.program.find(r=>r.id===id);}
function render(){
  document.querySelectorAll('[data-tab]').forEach(b=>b.classList.toggle('active',b.dataset.tab===route||((route==='session'||route==='editor')&&b.dataset.tab==='home')));
  if(route==='session'&&!db.active)route='home';
  const screens={home:renderHome,session:renderSession,history:renderHistory,progress:renderProgress,settings:renderSettings,editor:renderEditor};
  view.innerHTML=(screens[route]||renderHome)();
  updateTimers();
}
function renderHome(){
  const suggestion=todayRoutine();const last=[...db.history].sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt))[0];
  const total=db.history.length,weekStart=new Date();weekStart.setDate(weekStart.getDate()-((weekStart.getDay()+1)%7));weekStart.setHours(0,0,0,0);
  const thisWeek=db.history.filter(s=>Date.parse(s.endedAt)>=weekStart.getTime()).length;
  return `<div class="eyebrow">4-DAY UPPER / LOWER</div><h1 class="h1">جاهز لتمرينك؟</h1><p class="sub">جدولك الشخصي مع حفظ تلقائي للأوزان والعدات. كل حصة تسجلها تصير مرجع للحصة اللي بعدها.</p>
  ${db.active?`<div class="card hero"><div class="flex between"><span class="pill accent">● حصة قيد التنفيذ</span><span class="muted small">${dateLabel(db.active.startedAt)}</span></div><h2>${html(db.active.name)}</h2><p class="sub">${sessionSets(db.active)} / ${targetSets(db.active)} جولات مكتملة</p><div class="progress-line"><span style="width:${targetSets(db.active)?100*sessionSets(db.active)/targetSets(db.active):0}%"></span></div><button class="btn primary full mt" data-action="resume">أكمل تمرينك ←</button></div>`:''}
  <div class="card"><div class="flex between mb"><strong>أسبوعك الرياضي</strong><span class="pill">اليوم: ${weekdays[new Date().getDay()]}</span></div><div class="daily">${[6,0,1,2,3,4,5].map(d=>{const r=db.program.find(x=>x.day===d);return `<div class="day ${new Date().getDay()===d?'today':''}"><span class="tiny">${weekdays[d].slice(0,3)}</span><b>${r?html(r.name):d===1||d===5?'كارديو':'راحة'}</b></div>`}).join('')}</div>${suggestion?`<p class="small muted mt">مقترح اليوم: <strong style="color:var(--accent)">${html(suggestion.name)}</strong></p>`:'<p class="small muted mt">يوم للمشي أو الكارديو أو الراحة حسب جدولك.</p>'}</div>
  <div class="stat-grid mb"><div class="stat"><strong>${total}</strong><span>حصة محفوظة</span></div><div class="stat"><strong>${thisWeek}</strong><span>حصص هذا الأسبوع</span></div><div class="stat"><strong>${last?fmt(volume(last)/1000,1):'0'}</strong><span>طن في آخر حصة</span></div></div>
  <h2 class="section-title">اختر يوم التمرين</h2><div class="routine-grid">${db.program.map(r=>`<section class="card routine-card"><div><span class="tag">${html(r.english)}</span><h3>${html(r.name)}</h3><p>${html(r.focus)} • ${r.exercises.reduce((sum,ex)=>sum+ex.sets,0)} جولة مخططة</p></div><button class="btn ${suggestion?.id===r.id?'primary':'blue'}" data-action="start" data-id="${html(r.id)}">${suggestion?.id===r.id?'ابدأ تمرين اليوم':'ابدأ'}</button></section>`).join('')}</div>
  ${last?`<h2 class="section-title">آخر حصة محفوظة</h2><div class="card history-item"><div><h3>${html(last.name)} <span class="pill">${dateLabel(last.endedAt)}</span></h3><p>${sessionSets(last)} جولة • ${durLabel(Date.parse(last.endedAt)-Date.parse(last.startedAt))} • ${fmt(volume(last))} كغ حجم</p></div><button class="btn sm" data-action="view-session" data-id="${html(last.id)}">التفاصيل</button></div>`:''}
  <p class="small muted">الأوزان المرجعية المسبقة مأخوذة من سجلاتك الأخيرة وليست حصصًا مُضافة للسجل. تستطيع تعديل أي وزن أو تمرين.</p>`;
}
function lastHtml(ex){const last=baseline(ex.id);if(!last)return `<div class="last-record">لم يُسجَّل أداء سابق لهذا التمرين على نفس الجهاز. ابدأ بوزن مناسب.</div>`;
  const s=last.entries.map(([w,reps])=>`${fmt(w,1)} كغ × ${reps}`).join(' | ');
  const allTop=last.fromHistory&&last.entries.length>=ex.sets.length&&last.entries.every(([,reps])=>reps>=ex.max);
  return `<div class="last-record"><strong>آخر أداء ${last.fromHistory?'محفوظ':'مرجعي'}:</strong> ${dateLabel(last.date)}<div class="ltr" style="direction:ltr;text-align:left;display:block">${html(s)}</div>${allTop?`<span class="pill accent">كل الجولات بلغت ${ex.max} عدة — فكّر بزيادة صغيرة إذا كانت التقنية ممتازة</span>`:''}</div>`;
}
function renderSession(){const s=db.active;if(!s)return '';
  const done=sessionSets(s),goal=targetSets(s),pct=goal?100*done/goal:0;
  return `<div class="flex between mb"><button class="btn sm ghost" data-action="go-home">‹ الأيام</button><span class="eyebrow">جلسة مباشرة • ${dateLabel(s.startedAt)}</span></div>
  <div class="session-hero"><div class="flex between"><div><h1 class="h1" style="margin:0">${html(s.name)}</h1><span class="small muted">${html(s.focus)}</span></div><div style="text-align:left"><span class="small muted">مدة الحصة</span><div class="session-time" id="session-clock">${dClock(Date.now()-Date.parse(s.startedAt))}</div></div></div>
  <div class="flex between mt"><span class="small" id="live-progress">${done} / ${goal} جولة</span><span class="small" id="live-volume">حجم ${fmt(volume(s))} كغ</span></div><div class="progress-line"><span id="live-progress-bar" style="width:${pct}%"></span></div></div>
  <div class="rest-widget" id="rest-widget"><div><div class="small muted">مؤقت الراحة</div><div class="rest-count" id="rest-count">${fmt(db.settings.restSeconds)} ث</div></div><div class="actions" style="flex:0"><button class="btn sm" data-action="rest-start">ابدأ</button><button class="btn sm ghost" data-action="rest-stop">إيقاف</button></div></div>
  ${s.exercises.map((ex,i)=>`<article class="card scroll-top" id="ex-${i}"><div class="flex between"><span class="pill">${i+1} / ${s.exercises.length}</span><span class="pill">${ex.min}–${ex.max} عدة</span></div><h2 class="exercise-title mt">${html(ex.ar)}</h2><div class="exercise-en">${html(ex.en)}</div>${ex.tip?`<p class="small muted mt">💡 ${html(ex.tip)}</p>`:''}${lastHtml(ex)}
  <div class="table-wrap"><table class="sets"><thead><tr><th>جولة</th><th>الوزن (كغ)</th><th>العدات</th><th>تم</th></tr></thead><tbody>${ex.sets.map((set,j)=>`<tr class="${set.done?'set-done-row':''}"><td><span class="small">${j+1}</span></td><td><input aria-label="وزن الجولة ${j+1} في ${html(ex.ar)}" class="set-input" inputmode="decimal" type="number" min="0" max="10000" step="0.5" placeholder="—" value="${html(set.weight)}" data-ex="${i}" data-set="${j}" data-input="weight" /></td><td><input aria-label="عدات الجولة ${j+1} في ${html(ex.ar)}" class="set-input" inputmode="numeric" type="number" min="1" max="999" step="1" placeholder="—" value="${html(set.reps)}" data-ex="${i}" data-set="${j}" data-input="reps" /></td><td><button class="set-complete ${set.done?'done':''}" aria-label="${set.done?'إلغاء إتمام':'إتمام'} الجولة ${j+1}" aria-pressed="${set.done}" data-action="toggle-set" data-ex="${i}" data-set="${j}">${set.done?'✓':'○'}</button></td></tr>`).join('')}</tbody></table></div>
  <div class="mini-footer"><div class="actions"><button class="btn sm ghost" data-action="add-set" data-ex="${i}">+ جولة</button><button class="btn sm ghost" data-action="remove-set" data-ex="${i}" ${ex.sets.length<=1?'disabled':''}>− جولة</button></div><span class="small muted">${completed(ex).length}/${ex.sets.length} مكتملة</span></div>
  <details class="mt"><summary class="small muted" style="cursor:pointer">ملاحظات التمرين</summary><textarea class="note-input mt" data-note="${i}" placeholder="مثل وضع المقعد، ألم، تعديل الجهاز...">${html(ex.note||'')}</textarea></details></article>`).join('')}
  <div class="card"><label class="field-label" for="session-note">ملاحظات الحصة بالكامل</label><textarea id="session-note" class="note-input" placeholder="إحساسك بالطاقة، التقنية، وضع الكتف...">${html(s.note||'')}</textarea></div>
  <div class="footer-bar"><button class="btn primary full" data-action="finish">✓ إنهاء الحصة ونسخ الملخص</button><div class="flex between mt"><span class="small muted">يتم حفظ التقدم تلقائيًا</span><button class="btn ghost sm danger" data-action="discard-prompt">إلغاء الحصة</button></div></div>`;
}
function sessionSummary(s){const lines=[`🏋️ تماريني | ${s.name}`,`📅 ${dateLabel(s.endedAt||s.startedAt)}`,`⏱️ المدة: ${durLabel(Date.parse(s.endedAt||new Date().toISOString())-Date.parse(s.startedAt))}`,`✅ الجولات: ${sessionSets(s)} / ${targetSets(s)}`,`📦 حجم التدريب: ${fmt(volume(s),1)} كغ`,`━━━━━━━━━━━━━━━━`];
  s.exercises.forEach((ex,i)=>{const sets=completed(ex);if(!sets.length)return;lines.push(`${i+1}. ${ex.ar} (${ex.en})`);sets.forEach((set,n)=>lines.push(`   ${n+1}) ${fmt(set.weight,1)} كغ × ${set.reps} عدة`));if(ex.note?.trim())lines.push(`   📝 ${ex.note.trim()}`);lines.push('');});
  if(s.note?.trim())lines.push(`📝 ملاحظات الحصة: ${s.note.trim()}`);
  lines.push('تم تسجيل التمرين عبر تطبيق تماريني');return lines.join('\n');
}
async function copyText(value){
  try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(value);toast('تم نسخ ملخص التمرين ✓');return true;}}catch{}
  const ta=document.createElement('textarea');ta.value=value;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:0;opacity:0;';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,ta.value.length);
  let success=false;try{success=document.execCommand('copy');}catch{}ta.remove();toast(success?'تم النسخ ✓':'تعذر النسخ تلقائيًا؛ يمكنك تحديد النص من الملخص');return success;
}
function finish(){const s=db.active;if(!s)return;
  if(sessionSets(s)<1){toast('سجّل جولة مكتملة واحدة على الأقل');return;}
  const copySession=()=>{
    s.endedAt=new Date().toISOString();s.id='session_'+Date.now()+'_'+Math.random().toString(36).slice(2,7);
    db.history.unshift(clone(s));db.active=null;restEnd=0;persist();
    const summary=sessionSummary(s);void copyText(summary);navigate('history');showSummary(s);
  };
  if(sessionSets(s)<targetSets(s)){showConfirm('إنهاء الحصة الآن؟',`أنجزت ${sessionSets(s)} من ${targetSets(s)} جولة. سيتم تضمين الجولات المكتملة فقط في الملخص.`, 'finish-confirm');pendingFinish=copySession;}else copySession();
}
let pendingFinish=null;
function showSummary(s){modal(`<h3>${html(s.name)} — ملخص الحصة</h3><p class="small muted">الجولات الفعلية التي علّمتها مكتملة. الملخص قابل للنسخ أو المشاركة.</p><div class="summary-text" id="summary-text">${html(sessionSummary(s))}</div><div class="modal-actions"><button class="btn primary" data-action="copy-summary" data-id="${html(s.id)}">نسخ الكل</button><button class="btn blue" data-action="share-summary" data-id="${html(s.id)}">مشاركة</button><button class="btn ghost" data-action="close-modal">إغلاق</button></div>`);}
function findSession(id){return db.history.find(s=>s.id===id);}
async function shareSummary(s){if(!s)return;const text=sessionSummary(s);if(navigator.share){try{await navigator.share({title:`تماريني - ${s.name}`,text});return;}catch(e){if(e.name==='AbortError')return;}}void copyText(text);}
function renderHistory(){const sessions=[...db.history].sort((a,b)=>Date.parse(b.endedAt)-Date.parse(a.endedAt));
  return `<div class="eyebrow">YOUR WORKOUT LOG</div><h1 class="h1">سجل التمارين</h1><p class="sub">كل حصة محفوظة مع وزن وعدات كل جولة. تستطيع الرجوع إلى أي ملخص ونسخه من جديد.</p>
  ${!sessions.length?`<div class="empty"><span class="symbol">▤</span>لا توجد حصص محفوظة بعد. ابدأ أول حصة لتظهر هنا.</div>`:sessions.map(s=>`<article class="card history-item"><div><span class="pill">${dateLabel(s.endedAt)}</span><h3>${html(s.name)}</h3><p>${sessionSets(s)} جولة مكتملة • ${durLabel(Date.parse(s.endedAt)-Date.parse(s.startedAt))}<br/>${fmt(volume(s),1)} كغ حجم تمرين</p></div><button class="btn sm" data-action="view-session" data-id="${html(s.id)}">عرض / نسخ</button></article>`).join('')}
  ${sessions.length?`<button class="btn ghost full mt" data-action="export-csv">تصدير كل الجولات إلى CSV</button>`:''}`;
}
function chartSvg(records,key,label){const arr=records.filter(r=>Number(r[key])>0).sort((a,b)=>a.date.localeCompare(b.date)).slice(-16);if(arr.length<2)return `<p class="small muted">أدخل قياسين على الأقل حتى يظهر الرسم البياني.</p>`;
  const vals=arr.map(r=>Number(r[key]));let min=Math.min(...vals),max=Math.max(...vals);const delta=Math.max(1,max-min);min-=delta*.18;max+=delta*.18;
  const points=vals.map((v,i)=>[33+i*310/(vals.length-1),145-120*(v-min)/(max-min)]);
  const path=points.map(([x,y],i)=>(i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1)).join(' ');
  return `<svg class="chart" viewBox="0 0 380 183" role="img" aria-label="تطور ${html(label)}"><line x1="33" y1="25" x2="343" y2="25" class="chart-grid"/><line x1="33" y1="85" x2="343" y2="85" class="chart-grid"/><line x1="33" y1="145" x2="343" y2="145" class="chart-grid"/><text x="4" y="29" class="chart-label">${fmt(max,1)}</text><text x="4" y="149" class="chart-label">${fmt(min,1)}</text><path class="chart-line" d="${path}"/>${points.map(([x,y],i)=>`<circle class="chart-dot" cx="${x}" cy="${y}" r="4"><title>${html(arr[i].date)}: ${fmt(vals[i],1)}</title></circle>`).join('')}<text x="33" y="171" class="chart-label">${html(arr[0].date.slice(5))}</text><text x="309" y="171" class="chart-label">${html(arr[arr.length-1].date.slice(5))}</text></svg>`;
}
function weeklyBars(){const weeks=[];const today=new Date();today.setHours(0,0,0,0);const saturday=new Date(today);saturday.setDate(today.getDate()-((today.getDay()+1)%7));
  for(let i=7;i>=0;i--){const start=new Date(saturday);start.setDate(start.getDate()-7*i);const end=new Date(start);end.setDate(start.getDate()+7);const n=db.history.filter(s=>{const t=Date.parse(s.endedAt);return t>=start.getTime()&&t<end.getTime();}).length;weeks.push({label:`${start.getDate()}/${start.getMonth()+1}`,count:n});}
  return `<div class="week-bars">${weeks.map(w=>`<div class="week-col"><span>${w.count}</span><div class="week-bar" style="height:${Math.max(3,Math.min(100,w.count/4*100))}%"></div><span>${w.label}</span></div>`).join('')}</div>`;
}
function strengthHtml(exId){
  const records=[];
  for(const s of db.history){
    const ex=s.exercises.find(e=>e.id===exId);
    if(!ex||!completed(ex).length)continue;
    const sets=completed(ex);
    records.push({date:localDate(new Date(s.endedAt)),weight:Math.max(...sets.map(x=>Number(x.weight))),reps:Math.max(...sets.map(x=>Number(x.reps)))});
  }
  records.sort((a,b)=>a.date.localeCompare(b.date));
  if(!records.length){const old=references[exId];return `<p class="small muted">لم تسجل أي حصة جديدة لهذا التمرين بعد.${old?' آخر مرجع سابق: '+dateLabel(old.date)+' — '+old.entries.map(x=>x[0]+' كغ × '+x[1]).join('، '):''}</p>`;}
  const highest=Math.max(...records.map(x=>x.weight));
  const last=records.at(-1);const first=records[0];
  return `<div class="stat-grid mt mb"><div class="stat"><strong>${fmt(last.weight,1)}</strong><span>آخر أعلى وزن (كغ)</span></div><div class="stat"><strong>${fmt(highest,1)}</strong><span>أعلى وزن مسجل</span></div><div class="stat"><strong>${records.length}</strong><span>حصص مسجلة</span></div></div>${chartSvg(records,'weight','وزن التمرين')}<p class="small muted">الرسم يعرض أعلى وزن لجولة مكتملة في كل حصة. القيم المرجعية السابقة لا تُحسب كحصص جديدة.</p>`;
}
function renderProgress(){const count=db.history.length;const sums=db.history.reduce((a,s)=>({sets:a.sets+sessionSets(s),vol:a.vol+volume(s)}),{sets:0,vol:0});const m=[...db.metrics].sort((a,b)=>b.date.localeCompare(a.date));
  return `<div class="eyebrow">PROGRESS & BODY METRICS</div><h1 class="h1">تقدّمك</h1><p class="sub">راقب استمرارية المقاومة وحجم التدريب، وسجل الوزن ومحيط الخصر. تغيّر الخصر مع الحفاظ على القوة مهم لهدفك.</p>
  <div class="stat-grid mb"><div class="stat"><strong>${count}</strong><span>حصص</span></div><div class="stat"><strong>${sums.sets}</strong><span>جولات</span></div><div class="stat"><strong>${fmt(sums.vol/1000,1)}</strong><span>طن إجمالي</span></div></div>
  <div class="card"><h3 style="margin-top:0">الحصص خلال آخر 8 أسابيع</h3>${weeklyBars()}</div>
  <div class="card"><h3 style="margin-top:0">تطور أوزان تمارينك</h3><label class="field-label" for="strength-ex">اختر التمرين</label><select id="strength-ex" class="mb">${[...new Map(db.program.flatMap(r=>r.exercises).map(e=>[e.id,e])).values()].map(ex=>`<option value="${html(ex.id)}" ${selectedStrengthId===ex.id?'selected':''}>${html(ex.ar)}</option>`).join('')}</select><div id="strength-panel">${strengthHtml(selectedStrengthId)}</div></div>
  <div class="card"><h3 style="margin-top:0">قياس جديد</h3><div class="field-row"><div><label class="field-label" for="metric-weight">الوزن (كغ)</label><input class="field" id="metric-weight" inputmode="decimal" type="number" min="1" max="400" step="0.1" placeholder="مثال: 99" /></div><div><label class="field-label" for="metric-waist">الخصر (سم)</label><input class="field" id="metric-waist" inputmode="decimal" type="number" min="1" max="250" step="0.1" placeholder="مثال: 104" /></div></div><label class="field-label" for="metric-date">التاريخ</label><input class="field mb" type="date" id="metric-date" value="${localDate()}"/><label class="field-label" for="metric-note">ملاحظات (اختياري)</label><textarea class="note-input mb" id="metric-note" placeholder="مثل صور تقدم جديدة، إحساسك، نشاطك..."></textarea><button class="btn primary full" data-action="save-metric">حفظ القياس</button></div>
  <div class="card"><h3 style="margin-top:0">تغيّر محيط الخصر (سم)</h3>${chartSvg(db.metrics,'waist','الخصر')}</div><div class="card"><h3 style="margin-top:0">تغيّر الوزن (كغ)</h3>${chartSvg(db.metrics,'weight','الوزن')}</div>
  <h2 class="section-title">آخر القياسات</h2>${m.length?m.map(x=>`<div class="card history-item"><div><strong>${dateLabel(x.date)}</strong><p>${x.weight?html(x.weight)+' كغ وزن':''}${x.weight&&x.waist?' • ':''}${x.waist?html(x.waist)+' سم خصر':''}${x.note?'<br/>'+html(x.note):''}</p></div><button class="btn sm ghost" data-action="delete-metric-prompt" data-id="${html(x.id)}">حذف</button></div>`).join(''):'<div class="empty">لا توجد قياسات محفوظة بعد.</div>'}
  <h2 class="section-title">سجل الكارديو والمشي</h2><div class="card"><div class="field-row"><div><label class="field-label" for="cardio-min">الدقائق</label><input class="field" id="cardio-min" inputmode="numeric" type="number" min="0" max="1000" placeholder="25"/></div><div><label class="field-label" for="cardio-steps">الخطوات</label><input class="field" id="cardio-steps" inputmode="numeric" type="number" min="0" max="100000" placeholder="12000"/></div></div><div class="field-row"><div><label class="field-label" for="cardio-type">نوع النشاط</label><select id="cardio-type"><option>مشي</option><option>جري</option><option>جهاز مشي</option><option>تجديف</option><option>دراجة</option><option>نشاط آخر</option></select></div><div><label class="field-label" for="cardio-date">التاريخ</label><input class="field" id="cardio-date" type="date" value="${localDate()}"/></div></div><button class="btn blue full" data-action="save-cardio">حفظ النشاط</button></div>
  ${db.cardio.slice().sort((a,b)=>b.date.localeCompare(a.date)).slice(0,10).map(c=>`<div class="card history-item"><div><strong>${html(c.type)} — ${dateLabel(c.date)}</strong><p>${c.minutes?c.minutes+' دقيقة':''}${c.minutes&&c.steps?' • ':''}${c.steps?fmt(c.steps)+' خطوة':''}</p></div><button class="btn sm ghost" data-action="delete-cardio" data-id="${html(c.id)}">حذف</button></div>`).join('')}`;
}
function renderSettings(){return `<div class="eyebrow">PERSONALIZE & BACKUP</div><h1 class="h1">الإعدادات</h1><p class="sub">بياناتك محفوظة داخل المتصفح على هذا الجهاز، دون حساب أو اتصال بخادم. خذ نسخة احتياطية بانتظام.</p>
  <div class="card"><h3 style="margin-top:0">مؤقت الراحة</h3><div class="setting-row"><div><strong>مدة الراحة</strong><div class="small muted">بالثواني بعد الجولات</div></div><select id="rest-seconds" style="width:110px"><option value="60" ${db.settings.restSeconds===60?'selected':''}>60 ث</option><option value="90" ${db.settings.restSeconds===90?'selected':''}>90 ث</option><option value="120" ${db.settings.restSeconds===120?'selected':''}>120 ث</option><option value="180" ${db.settings.restSeconds===180?'selected':''}>180 ث</option></select></div><div class="setting-row"><div><strong>مؤقت تلقائي</strong><div class="small muted">يبدأ بعد إتمام الجولة</div></div><input type="checkbox" id="auto-rest" class="toggle" ${db.settings.autoRest?'checked':''}/></div></div>
  <div class="card"><h3 style="margin-top:0">تعديل جدولك</h3><p class="small muted">غيّر الجولات والمدى أو أضف واحذف تمارين حسب جهاز النادي. التغيير لا يمس السجل السابق.</p><button class="btn blue full" data-action="open-editor">تعديل البرنامج والتمارين</button></div>
  <div class="card"><h3 style="margin-top:0">النسخ الاحتياطي والبيانات</h3><p class="small muted">ملف JSON يحفظ البرنامج والسجل والقياسات. يمكنك استعادته على جهاز آخر.</p><div class="actions"><button class="btn primary" data-action="export-json">تنزيل نسخة احتياطية JSON</button><button class="btn" data-action="import-trigger">استيراد نسخة JSON</button></div><input class="hide" id="import-file" type="file" accept=".json,application/json"/><button class="btn ghost full mt" data-action="export-csv">تصدير سجل الجولات CSV</button><p class="small muted mt">للنقل إلى جوال آخر: صدّر JSON من الجهاز القديم، افتح التطبيق بالجديد، واستورد الملف.</p></div>
  <div class="card"><h3 style="margin-top:0">تثبيت التطبيق والعمل دون إنترنت</h3><p class="small muted">على آيفون: افتح رابط GitHub Pages في Safari ثم مشاركة ← إضافة إلى الشاشة الرئيسية. على أندرويد: Chrome ← ⋮ ← تثبيت التطبيق أو إضافة إلى الشاشة الرئيسية. بعد فتحه أول مرة على الإنترنت، يعمل دون اتصال.</p><button class="btn blue full" data-action="install">تثبيت التطبيق / عرض التعليمات</button></div>
  <div class="card"><h3 style="margin-top:0">إدارة البيانات</h3><p class="small muted">${db.history.length} حصص، ${db.metrics.length} قياسات، ${db.cardio.length} أنشطة كارديو.</p><button class="btn danger full" data-action="clear-prompt">حذف جميع البيانات والعودة للبرنامج الأصلي</button></div>
  <p class="small muted">الإصدار 5.0 • بدون حساب أو اشتراكات • وحدة الأوزان كغ. إزالة بيانات الموقع أو المتصفح قد تمسح السجلات إذا لم تحفظ نسخة JSON.</p>`;}
function renderEditor(){return `<div class="flex between mb"><button class="btn sm ghost" data-action="go-settings">‹ الإعدادات</button><span class="eyebrow">EDIT PLAN</span></div><h1 class="h1">تعديل البرنامج</h1><p class="sub">التغييرات تحفظ فورًا وتُطبق على الحصص الجديدة. إذا كانت حصة مفتوحة، تبقى كما بدأت.</p>
  ${db.program.map((r,ri)=>`<article class="card"><div class="flex between"><h2 class="section-title" style="margin:0">${html(r.name)}</h2><span class="pill">${r.exercises.length} تمارين</span></div><p class="small muted">${html(r.focus)}</p>
  ${r.exercises.map((x,ei)=>`<div class="edit-ex"><div style="flex:1;min-width:0"><div class="name">${html(x.ar)}</div><div class="tiny muted">${html(x.en)}</div><div class="tiny muted">${x.sets} جولات • ${x.min}–${x.max} عدة</div></div><div class="controls"><button class="round-btn" title="أعلى" aria-label="رفع التمرين" data-action="move-ex" data-ri="${ri}" data-ei="${ei}" data-dir="-1" ${ei===0?'disabled':''}>↑</button><button class="round-btn" title="أسفل" aria-label="خفض التمرين" data-action="move-ex" data-ri="${ri}" data-ei="${ei}" data-dir="1" ${ei===r.exercises.length-1?'disabled':''}>↓</button><button class="round-btn" title="تعديل" aria-label="تعديل التمرين" data-action="edit-ex" data-ri="${ri}" data-ei="${ei}">✎</button><button class="round-btn" title="حذف" aria-label="حذف التمرين" data-action="remove-ex-prompt" data-ri="${ri}" data-ei="${ei}">×</button></div></div>`).join('')}
  <button class="btn sm blue full mt" data-action="add-ex" data-ri="${ri}">+ أضف تمرينًا</button></article>`).join('')}
  <button class="btn ghost full" data-action="reset-program-prompt">استعادة الجدول الأصلي</button>`;}
function startRoutine(id){const r=getRoutine(id);if(!r)return;if(db.active){showConfirm('لديك حصة غير منتهية', 'يجب إنهاء الحصة الحالية أو إلغاؤها قبل بدء حصة جديدة. هل تريد إلغاء الحصة الحالية؟','replace-draft',`data-id="${html(id)}"`);return;}
  db.active={routineId:r.id,name:r.name,focus:r.focus,startedAt:new Date().toISOString(),note:'',exercises:r.exercises.map(x=>{const last=baseline(x.id)?.entries||[];return {...clone(x),note:'',sets:Array.from({length:x.sets},(_,i)=>({weight:last[i]?.[0]??last.at(-1)?.[0]??'',reps:'',done:false}))};})};persist();navigate('session');}
function updateLive(){if(!db.active)return;const done=sessionSets(db.active),total=targetSets(db.active);const p=document.getElementById('live-progress'),v=document.getElementById('live-volume'),b=document.getElementById('live-progress-bar');if(p)p.textContent=`${done} / ${total} جولة`;if(v)v.textContent=`حجم ${fmt(volume(db.active))} كغ`;if(b)b.style.width=(total?100*done/total:0)+'%';}
function setDone(exi,si){const x=db.active?.exercises[exi],set=x?.sets[si];if(!set)return;if(!set.done){const w=Number(set.weight),r=Number(set.reps);if(set.weight===''||set.reps===''||!Number.isFinite(w)||w<0||!Number.isInteger(r)||r<1||r>999){toast('أدخل وزنًا صحيحًا وعدد العدات ثم اضغط إتمام');return;}set.done=true;if(db.settings.autoRest)startRest();}else set.done=false;persist();const row=document.querySelector(`[data-ex="${exi}"][data-set="${si}"][data-action="toggle-set"]`);if(row){row.textContent=set.done?'✓':'○';row.classList.toggle('done',set.done);row.setAttribute('aria-pressed',String(set.done));row.closest('tr').classList.toggle('set-done-row',set.done);}updateLive();}
function startRest(){restEnd=Date.now()+db.settings.restSeconds*1000;timerFinished=false;updateTimers();}
function updateTimers(){if(db.active){const clock=document.getElementById('session-clock');if(clock)clock.textContent=dClock(Date.now()-Date.parse(db.active.startedAt));}
  const count=document.getElementById('rest-count');const widget=document.getElementById('rest-widget');if(count){const left=Math.max(0,Math.ceil((restEnd-Date.now())/1000));count.textContent=left?`${Math.floor(left/60)}:${pad(left%60)}`:`${db.settings.restSeconds} ث`;widget?.classList.toggle('timer-on',left>0);}
  if(restEnd&&Date.now()>=restEnd&&!timerFinished){restEnd=0;timerFinished=true;toast('انتهت الراحة — جاهز للجولة التالية');try{navigator.vibrate?.([200,80,200]);const Ctx=window.AudioContext||window.webkitAudioContext;if(Ctx){const ctx=new Ctx(),osc=ctx.createOscillator(),gain=ctx.createGain();osc.connect(gain);gain.connect(ctx.destination);gain.gain.value=.045;osc.frequency.value=740;osc.start();osc.stop(ctx.currentTime+.19);osc.onended=()=>ctx.close();}}catch{}}}
function download(name,body,type){const blob=new Blob([body],{type});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast('تم تجهيز ملف التنزيل');}
function exportJson(){download(`tamareeni-backup-${localDate()}.json`,JSON.stringify({format:'tamareeni-v2',exportedAt:new Date().toISOString(),data:db},null,2),'application/json;charset=utf-8');}
function csvQuote(s){return '"'+String(s??'').replaceAll('"','""')+'"';}
function exportCsv(){const header=['تاريخ الحصة','اليوم','التمرين','الجولة','الوزن كغ','العدات','الحجم كغ','ملاحظات التمرين','ملاحظات الحصة'];const rows=[header];
  db.history.forEach(s=>s.exercises.forEach(ex=>completed(ex).forEach((set,i)=>rows.push([s.endedAt,s.name,ex.ar,i+1,set.weight,set.reps,Number(set.weight)*Number(set.reps)*(ex.weightMultiplier||1),ex.note||'',s.note||'']))));
  download(`tamareeni-sets-${localDate()}.csv`,'\ufeff'+rows.map(row=>row.map(csvQuote).join(',')).join('\r\n'),'text/csv;charset=utf-8');}
function validBackup(x){return x&&x.version===2&&Array.isArray(x.program)&&Array.isArray(x.history)&&Array.isArray(x.metrics)&&Array.isArray(x.cardio)&&x.settings&&typeof x.settings==='object'&&x.history.length<100000&&x.program.length<100;}
async function importJson(file){if(!file)return;try{if(file.size>15_000_000)throw Error('الملف كبير جدًا');const parsed=JSON.parse(await file.text());const x=parsed?.format==='tamareeni-v2'?parsed.data:parsed;if(!validBackup(x))throw Error('الملف ليس نسخة احتياطية صالحة من تماريني');pendingImport=x;showConfirm('استيراد النسخة الاحتياطية؟','سيتم استبدال بيانات هذا الجهاز بالكامل ببيانات الملف. يُفضّل تنزيل نسخة احتياطية أولاً.','import-confirm');}catch(err){toast(err.message||'فشل استيراد الملف');}}
let pendingImport=null;
function metricSave(){const weight=document.getElementById('metric-weight').value,waist=document.getElementById('metric-waist').value,date=document.getElementById('metric-date').value,note=document.getElementById('metric-note').value;
  if(!date||(!weight&&!waist)){toast('أدخل التاريخ وواحدًا من القياسين');return;}if(weight&&(Number(weight)<1||Number(weight)>400)||waist&&(Number(waist)<1||Number(waist)>250)){toast('تحقق من قيم القياس');return;}
  db.metrics.push({id:'m_'+Date.now(),date,weight:weight?Number(weight):null,waist:waist?Number(waist):null,note});persist();render();toast('تم حفظ القياس ✓');}
function cardioSave(){const minutes=document.getElementById('cardio-min').value,steps=document.getElementById('cardio-steps').value,type=document.getElementById('cardio-type').value,date=document.getElementById('cardio-date').value;
  if(!date||(!minutes&&!steps)||minutes&&(Number(minutes)<0||Number(minutes)>1000)||steps&&(Number(steps)<0||Number(steps)>100000)){toast('أدخل تاريخًا وقيمة صحيحة للنشاط');return;}
  db.cardio.push({id:'c_'+Date.now(),date,minutes:minutes?Number(minutes):null,steps:steps?Number(steps):null,type});persist();render();toast('تم حفظ النشاط ✓');}
function editExercise(ri,ei){const x=db.program[ri]?.exercises[ei];if(!x)return;modal(`<h3>تعديل التمرين</h3><label class="field-label">الاسم بالعربي</label><input class="field mb" id="edit-ar" value="${html(x.ar)}" maxlength="100"/><label class="field-label">الاسم بالإنجليزي</label><input class="field mb" id="edit-en" value="${html(x.en)}" maxlength="100"/><div class="field-row"><div><label class="field-label">الجولات</label><input class="field" id="edit-sets" type="number" min="1" max="12" value="${x.sets}"/></div><div><label class="field-label">أقل عدد عدات</label><input class="field" id="edit-min" type="number" min="1" max="100" value="${x.min}"/></div></div><label class="field-label">أعلى عدد عدات</label><input class="field mb" id="edit-max" type="number" min="1" max="100" value="${x.max}"/><div class="modal-actions"><button class="btn ghost" data-action="close-modal">تراجع</button><button class="btn primary" data-action="save-ex-edit" data-ri="${ri}" data-ei="${ei}">حفظ</button></div>`);}
function addExercise(ri){modal(`<h3>إضافة تمرين</h3><label class="field-label">اسم التمرين بالعربي *</label><input class="field mb" id="edit-ar" maxlength="100" placeholder="مثال: بطن جهاز"/><label class="field-label">الاسم بالإنجليزي (اختياري)</label><input class="field mb" id="edit-en" maxlength="100" placeholder="Ab Crunch"/><div class="field-row"><div><label class="field-label">الجولات</label><input class="field" id="edit-sets" type="number" min="1" max="12" value="3"/></div><div><label class="field-label">أقل عدات</label><input class="field" id="edit-min" type="number" min="1" max="100" value="10"/></div></div><label class="field-label">أعلى عدات</label><input class="field mb" id="edit-max" type="number" min="1" max="100" value="15"/><div class="modal-actions"><button class="btn ghost" data-action="close-modal">تراجع</button><button class="btn primary" data-action="save-ex-add" data-ri="${ri}">إضافة</button></div>`);}
function readExFields(){const ar=document.getElementById('edit-ar')?.value.trim(),en=document.getElementById('edit-en')?.value.trim(),sets=Number(document.getElementById('edit-sets')?.value),min=Number(document.getElementById('edit-min')?.value),max=Number(document.getElementById('edit-max')?.value);
  if(!ar||ar.length>100||!Number.isInteger(sets)||sets<1||sets>12||!Number.isInteger(min)||min<1||!Number.isInteger(max)||max<min||max>100){toast('تحقق من اسم التمرين والجولات ومدى العدات');return null;}return {ar,en,sets,min,max};}
function installHelp(){modal('<h3>ثبّت تماريني على جوالك</h3><p class="sub">ارفع محتويات المشروع إلى GitHub Pages وافتح الرابط الآمن HTTPS، ثم:</p><p><strong>أندرويد:</strong> افتح الرابط في Chrome ← قائمة ⋮ ← تثبيت التطبيق / إضافة إلى الشاشة الرئيسية.</p><p><strong>آيفون:</strong> افتح الرابط في Safari ← زر المشاركة ← إضافة إلى الشاشة الرئيسية.</p><p class="small muted">احفظ ملف النسخة الاحتياطية JSON عند تبديل الجوال أو مسح بيانات المتصفح.</p><button class="btn primary full" data-action="close-modal">فهمت</button>');}

// All actions are dispatched from a single place; text inputs do not recreate the page while typing.
document.addEventListener('click',event=>{
  const tab=event.target.closest('[data-tab]');if(tab){navigate(tab.dataset.tab);return;}
  const b=event.target.closest('[data-action]');if(!b)return;const a=b.dataset.action,id=b.dataset.id,ri=Number(b.dataset.ri),ei=Number(b.dataset.ei),si=Number(b.dataset.set),exi=Number(b.dataset.ex);
  switch(a){
    case 'go-home':navigate('home');break;
    case 'go-settings':navigate('settings');break;
    case 'close-modal':closeModal();break;
    case 'start':startRoutine(id);break;
    case 'resume':navigate('session');break;
    case 'replace-draft':closeModal();db.active=null;restEnd=0;persist();startRoutine(id);break;
    case 'discard-prompt':showConfirm('إلغاء الحصة؟','سيتم حذف الحصة الجارية غير المنتهية فقط. الحصص السابقة لن تتأثر.','discard-confirm');break;
    case 'discard-confirm':db.active=null;restEnd=0;persist();closeModal();navigate('home');toast('تم إلغاء الحصة');break;
    case 'toggle-set':setDone(exi,si);break;
    case 'add-set':{const ex=db.active?.exercises[exi];if(ex){const last=ex.sets.at(-1);ex.sets.push({weight:last?.weight||'',reps:'',done:false});persist();render();}break;}
    case 'remove-set':{const ex=db.active?.exercises[exi];if(!ex||ex.sets.length<2)break;if(ex.sets.at(-1).done){toast('ألغِ تحديد الجولة الأخيرة أولًا');break;}ex.sets.pop();persist();render();break;}
    case 'rest-start':startRest();break;
    case 'rest-stop':restEnd=0;updateTimers();break;
    case 'finish':finish();break;
    case 'finish-confirm':closeModal();if(pendingFinish){pendingFinish();pendingFinish=null;}break;
    case 'view-session':{const s=findSession(id);if(s)showSummary(s);break;}
    case 'copy-summary':{const s=findSession(id);if(s)void copyText(sessionSummary(s));break;}
    case 'share-summary':{const s=findSession(id);if(s)void shareSummary(s);break;}
    case 'save-metric':metricSave();break;
    case 'delete-metric-prompt':showConfirm('حذف القياس؟','سيُحذف هذا القياس فقط.','delete-metric-confirm',`data-id="${html(id)}"`);break;
    case 'delete-metric-confirm':db.metrics=db.metrics.filter(x=>x.id!==id);persist();closeModal();render();break;
    case 'save-cardio':cardioSave();break;
    case 'delete-cardio':db.cardio=db.cardio.filter(x=>x.id!==id);persist();render();break;
    case 'export-json':exportJson();break;
    case 'export-csv':exportCsv();break;
    case 'import-trigger':document.getElementById('import-file')?.click();break;
    case 'import-confirm':if(pendingImport){db=clone(pendingImport);migrateProgram(db);pendingImport=null;persist();closeModal();navigate('home');toast('تم استعادة البيانات ✓');}break;
    case 'clear-prompt':showConfirm('حذف جميع البيانات؟','سيُحذف السجل والقياسات والبرنامج المعدّل والحصة المفتوحة نهائيًا من الجهاز. نزّل نسخة احتياطية أولًا.','clear-confirm');break;
    case 'clear-confirm':db=newState();restEnd=0;persist();closeModal();navigate('home');toast('تمت إعادة التهيئة');break;
    case 'open-editor':navigate('editor');break;
    case 'move-ex':{const list=db.program[ri]?.exercises,next=ei+Number(b.dataset.dir);if(list&&next>=0&&next<list.length){[list[ei],list[next]]=[list[next],list[ei]];persist();render();}break;}
    case 'edit-ex':editExercise(ri,ei);break;
    case 'add-ex':addExercise(ri);break;
    case 'save-ex-edit':{const data=readExFields();if(!data)break;Object.assign(db.program[ri].exercises[ei],data);persist();closeModal();render();break;}
    case 'save-ex-add':{const data=readExFields();if(!data)break;db.program[ri].exercises.push({id:'custom_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,5),...data});persist();closeModal();render();break;}
    case 'remove-ex-prompt':showConfirm('حذف التمرين من الجدول؟','لن يتأثر سجل التمارين السابقة.','remove-ex-confirm',`data-ri="${ri}" data-ei="${ei}"`);break;
    case 'remove-ex-confirm':db.program[ri].exercises.splice(ei,1);persist();closeModal();render();break;
    case 'reset-program-prompt':showConfirm('استعادة الجدول الأصلي؟','ستتم إعادة تمارين Upper/Lower الأربعة إلى الوضع الافتراضي. محفوظات التمرين ستبقى.','reset-program-confirm');break;
    case 'reset-program-confirm':db.program=clone(defaultProgram);persist();closeModal();render();toast('تمت استعادة البرنامج الأصلي');break;
    case 'install':if(installPrompt){installPrompt.prompt();void installPrompt.userChoice.then(()=>installPrompt=null);}else installHelp();break;
  }
});
document.addEventListener('input',event=>{
  const el=event.target;if(el.matches('[data-input]')&&db.active){const ex=db.active.exercises[Number(el.dataset.ex)],set=ex?.sets[Number(el.dataset.set)];if(!set)return;set[el.dataset.input]=el.value;if(set.done){set.done=false;const btn=el.closest('tr')?.querySelector('[data-action="toggle-set"]');if(btn){btn.textContent='○';btn.classList.remove('done');btn.setAttribute('aria-pressed','false');el.closest('tr').classList.remove('set-done-row');}}persist();updateLive();}
  if(el.matches('[data-note]')&&db.active){db.active.exercises[Number(el.dataset.note)].note=el.value;persist();}
  if(el.id==='session-note'&&db.active){db.active.note=el.value;persist();}
});
document.addEventListener('change',event=>{
  const el=event.target;if(el.id==='rest-seconds'){db.settings.restSeconds=Number(el.value);persist();}
  if(el.id==='auto-rest'){db.settings.autoRest=el.checked;persist();}
  if(el.id==='strength-ex'){selectedStrengthId=el.value;const panel=document.getElementById('strength-panel');if(panel)panel.innerHTML=strengthHtml(selectedStrengthId);}
  if(el.id==='import-file'){void importJson(el.files?.[0]);el.value='';}
});
dialog.addEventListener('click',event=>{if(event.target===dialog)closeModal();});
document.getElementById('install-shortcut').addEventListener('click',()=>{if(installPrompt){installPrompt.prompt();void installPrompt.userChoice.then(()=>installPrompt=null);}else installHelp();});
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;});
if('serviceWorker' in navigator&&location.protocol!=='file:'){window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(()=>{}));}
setInterval(updateTimers,1000);render();
