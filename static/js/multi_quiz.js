// multi_quiz.js — fully magical Hogwarts Sorting Quiz

let PARTS = QUIZ_PARTS;
let currentPartKey = null;
let currentQuestionIndex = 0;
let currentAnswers = [];
let completed = {};
let resultsCache = {};

const partsListEl = () => document.getElementById("parts-list");
const quizArea = () => document.getElementById("quiz-area");
const partHeader = () => document.getElementById("part-header");
const quizContainer = () => document.getElementById("quiz-container");
const partResultArea = () => document.getElementById("part-result-list");
const finalResult = () => document.getElementById("final-result");
const sortingHatModal = () => document.getElementById("sorting-hat-modal");
const hatText = () => document.getElementById("hat-text");

document.addEventListener("DOMContentLoaded", () => {
  renderPartsMenu();
  document.getElementById("finalize").addEventListener("click", showFinalProfile);
  document.getElementById("view-completed").addEventListener("click", showCompletedParts);
  document.getElementById("next-question").addEventListener("click", nextQuestion);
  document.getElementById("prev-question").addEventListener("click", prevQuestion);
  document.getElementById("submit-part").addEventListener("click", submitCurrentPart);
  document.getElementById("retake-all")?.addEventListener("click", retakeAll);
  document.getElementById("show-hat")?.addEventListener("click", () => showSortingHat());

  const hatClose = document.getElementById("hat-close");
  if (hatClose) hatClose.addEventListener("click", hideSortingHat);

  document.addEventListener('keydown', (e) => {
    if (quizArea() && !quizArea().classList.contains('hidden')){
      if (e.key === 'ArrowRight') nextQuestion();
      if (e.key === 'ArrowLeft') prevQuestion();
      if (e.key === 'Enter') {
        const el = document.activeElement;
        if (el && el.tagName === 'INPUT' && el.type === 'radio') el.checked = true;
      }
    }
  });

  ensureToastContainer();
});

/* --- Render parts menu --- */
function renderPartsMenu(){
  const el = partsListEl();
  el.innerHTML = "";
  for(const [key, part] of Object.entries(PARTS)){
    const card = document.createElement("div");
    card.className = "part-card";
    card.dataset.part = key;

    const icon = document.createElement("div");
    icon.className = "icon";
    const emojis = {house:"🏠",patronus:"🦌",wand:"🪄",bestie:"🤝",enemy:"⚔️",skills:"📚",quidditch:"🏆",extras:"🎓"};
    icon.textContent = emojis[key] || "✨";

    const meta = document.createElement("div");
    meta.style.flex="1";
    meta.innerHTML=`<h4>${part.name}</h4><p>${part.desc||""}</p><small>Questions: ${part.questions.length}</small>`;

    const status = document.createElement("div");
    status.className="status";
    status.innerHTML = completed[key]?`<small style="color:limegreen">Completed ✓</small>`:`<small style="color:var(--muted)">Not completed</small>`;

    card.append(icon, meta, status);
    card.addEventListener("click",()=>openPart(key));
    el.appendChild(card);
  }
}

/* --- Open part --- */
function openPart(key){
  currentPartKey=key;
  currentQuestionIndex=0;
  currentAnswers=Array(PARTS[key].questions.length).fill(null);
  quizArea().classList.remove("hidden");
  finalResult().classList.add("hidden");
  partResultArea().innerHTML="";
  renderCurrentQuestion();
  partHeader().textContent=`${PARTS[key].name} — ${PARTS[key].desc}`;
  window.scrollTo({top:0,behavior:"smooth"});
}

/* --- Render question --- */
function renderCurrentQuestion(){
  const qObj = PARTS[currentPartKey].questions[currentQuestionIndex];
  quizContainer().innerHTML="";

  const qDiv = document.createElement("div");
  qDiv.className="question";

  const title=document.createElement("h3");
  title.textContent=`${currentQuestionIndex+1}. ${qObj.q}`;
  qDiv.appendChild(title);

  const opts=document.createElement("div");
  opts.className="options";

  const optKeys=Array.isArray(qObj.options)?qObj.options:Object.keys(qObj.options);
  optKeys.forEach(opt=>{
    const id=`p_${currentPartKey}_q${currentQuestionIndex}_${sanitizeId(opt)}`;
    const label=document.createElement("label");
    label.htmlFor=id;
    label.className=(currentAnswers[currentQuestionIndex]===opt)?"option-label selected":"option-label";

    const radio=document.createElement("input");
    radio.type="radio"; radio.name=`q_${currentQuestionIndex}`; radio.value=opt; radio.id=id;
    if(currentAnswers[currentQuestionIndex]===opt) radio.checked=true;

    radio.addEventListener("change",(e)=>{
      document.querySelectorAll('.options .option-label').forEach(l=>l.classList.remove('selected'));
      label.classList.add('selected');
      currentAnswers[currentQuestionIndex]=e.target.value;
      updateProgressBar();
      wandSparkleEffect(label);
    });

    const txt=document.createElement('span'); txt.className='option-content'; txt.textContent=' '+opt;
    label.append(radio,txt);
    opts.appendChild(label);
  });

  qDiv.appendChild(opts);
  quizContainer().appendChild(qDiv);

  setTimeout(()=>{
    const first=quizContainer().querySelector('input[type=radio]');
    if(first) first.focus();
    updateProgressBar();
  },40);
}

/* --- Wand sparkle effect --- */
function wandSparkleEffect(el){
  const sparkle=document.createElement('span');
  sparkle.className='wand-sparkle';
  el.appendChild(sparkle);
  setTimeout(()=>sparkle.remove(),800);
}

/* --- Navigation --- */
function nextQuestion(){saveCurrentSelection(); if(currentQuestionIndex<PARTS[currentPartKey].questions.length-1){currentQuestionIndex++; renderCurrentQuestion();}else{toast("Last question reached. Submit part.")}}
function prevQuestion(){saveCurrentSelection(); if(currentQuestionIndex>0){currentQuestionIndex--; renderCurrentQuestion();}}

/* --- Save selection --- */
function saveCurrentSelection(){
  const radios=document.getElementsByName(`q_${currentQuestionIndex}`);
  for(const r of radios) if(r.checked){currentAnswers[currentQuestionIndex]=r.value; return;}
}

/* --- Submit part --- */
async function submitCurrentPart(){
  saveCurrentSelection();
  for(let i=0;i<currentAnswers.length;i++){
    if(!currentAnswers[i]){toast(`Answer question ${i+1}!`); currentQuestionIndex=i; renderCurrentQuestion(); return;}
  }

  const payload={part:currentPartKey,answers:currentAnswers};
  try{
    const resp=await fetch("/api/submit_part",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await resp.json();
    if(!resp.ok){toast("Error: "+(data.error||resp.statusText)); return;}
    completed[currentPartKey]=[...currentAnswers];
    resultsCache[currentPartKey]=data;
    showPartResultCard(currentPartKey,data);
    quizArea().classList.add("hidden");
    renderPartsMenu();
  }catch(err){toast("Network error: "+err.message);}
}

/* --- Result cards --- */
function showPartResultCard(partKey,data){
  const p=PARTS[partKey];
  const container=partResultArea();
  const wrapper=document.createElement("div");
  wrapper.className="part-result";
  wrapper.innerHTML=`<h3>${p.name} — Result</h3>
    <p><strong style="color:var(--gryff)">${data.result?escapeHtml(String(data.result)):"—"}</strong></p>
    <pre style="white-space:pre-wrap;">${escapeHtml(JSON.stringify(data.scores||{},null,2))}</pre>
    <div style="margin-top:0.6rem;">
      <button class="btn small" onclick="openPart('${partKey}')">Retake</button>
      <button class="btn small" onclick="removeCompleted('${partKey}')">Remove</button>
    </div>`;
  container.prepend(wrapper);
}

/* --- Remove completed --- */
function removeCompleted(partKey){delete completed[partKey]; delete resultsCache[partKey]; renderPartsMenu(); showCompletedParts();}

/* --- Show completed parts --- */
function showCompletedParts(){
  const container=partResultArea();
  container.innerHTML="";
  const heading=document.createElement("h3");
  heading.textContent="Completed Parts"; container.appendChild(heading);
  if(Object.keys(completed).length===0){const p=document.createElement("p"); p.textContent="No parts completed yet."; p.style.color="var(--muted)"; container.appendChild(p); return;}
  for(const k of Object.keys(completed)){
    const r=resultsCache[k];
    const pdiv=document.createElement("div");
    pdiv.className="part-result";
    pdiv.innerHTML=`<h4>${PARTS[k].name}</h4>
      <p>Result: <strong>${r?r.result:"—"}</strong></p>
      <pre style="white-space:pre-wrap;">${JSON.stringify(r?r.scores:{},null,2)}</pre>`;
    container.appendChild(pdiv);
  }
  window.scrollTo({top:container.offsetTop,behavior:"smooth"});
}

/* --- Show final profile --- */
async function showFinalProfile(){
  if(Object.keys(completed).length===0){toast("Complete at least one part first."); return;}
  const payload={answers_by_part:completed};
  try{
    const resp=await fetch("/api/final_result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await resp.json();
    if(!resp.ok){toast("Error: "+(data.error||resp.statusText)); return;}
    renderFinalProfile(data);
  }catch(err){toast("Network error: "+err.message);}
}

function renderFinalProfile(data){
  document.getElementById("final-title").textContent="Your Ultimate Hogwarts Profile";
  document.getElementById("final-desc").textContent=data.house_desc||"";
  ["house","patronus","wand","bestie","enemy","skill","quidditch_role"].forEach(k=>{
    const el=document.getElementById(`final-${k.replace("_role","")}`);
    if(el) el.textContent=data[k]||"—";
  });
  document.getElementById("final-extras").textContent=JSON.stringify(data.extras||{},null,2);

  // animated house bars
  const scoresDiv=document.getElementById("final-scores");
  scoresDiv.innerHTML="";
  ["Gryffindor","Hufflepuff","Ravenclaw","Slytherin"].forEach(h=>{
    const barWrap=document.createElement("div"); barWrap.className="house-score-bar";
    const fill=document.createElement("div"); fill.className=`house-score-fill ${h}`;
    const val=(data.house_scores&&data.house_scores[h])?data.house_scores[h]:0; fill.style.width="0"; fill.textContent=val;
    barWrap.appendChild(fill); scoresDiv.appendChild(barWrap);
    setTimeout(()=>fill.style.width=Math.min(95,val*18)+"%",120);
  });

  const badge=document.getElementById("final-house-badge");
  badge.innerHTML="";
  const crestMap={Gryffindor:'/static/img/crests/gryffindor.svg',Hufflepuff:'/static/img/crests/hufflepuff.svg',Ravenclaw:'/static/img/crests/ravenclaw.svg',Slytherin:'/static/img/crests/slytherin.svg'};
  if(data.house&&crestMap[data.house]){const img=document.createElement('img'); img.src=crestMap[data.house]; img.alt=data.house+' crest'; badge.appendChild(img);} else {badge.textContent='🏰';}

  finalResult().classList.remove("hidden");
  if(data.house)setTimeout(()=>showSortingHat(`The Sorting Hat declares: ${data.house}!`),700);
  window.scrollTo({top:0,behavior:"smooth"});
}

/* --- Sorting Hat modal --- */
function showSortingHat(text){
  const modal=sortingHatModal(); if(!modal) return;
  hatText().textContent="The Sorting Hat whispers...";
  modal.classList.remove("hidden"); modal.setAttribute("aria-hidden","false");
  setTimeout(()=>{hatText().textContent=text||"You are... remarkable."},1200);
}
function hideSortingHat(){const modal=sortingHatModal(); if(!modal) return; modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true");}

/* --- Retake all --- */
function retakeAll(){if(!confirm("Clear completed parts and retake?"))return; completed={}; resultsCache={}; renderPartsMenu(); showCompletedParts(); finalResult().classList.add("hidden");}

/* --- Utilities --- */
function sanitizeId(s){return String(s).replace(/[^\w\-]/g,'_').slice(0,60);}
function escapeHtml(str){return String(str).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}
function toast(msg){ensureToastContainer(); const container=document.getElementById('toast-container'); const t=document.createElement('div'); t.className='toast'; t.setAttribute('role','status'); t.setAttribute('aria-live','polite'); t.textContent=msg; container.appendChild(t); setTimeout(()=>t.style.opacity='0',3200); setTimeout(()=>t.remove(),3800);}
function ensureToastContainer(){if(!document.getElementById('toast-container')){const c=document.createElement('div'); c.id='toast-container'; document.body.appendChild(c);}}

/* --- Progress bar --- */
function updateProgressBar(){
  try{
    const bar=document.getElementById('part-progress'); if(!bar||!currentPartKey)return;
    const total=PARTS[currentPartKey].questions.length;
    const answered=currentAnswers.filter(Boolean).length;
    const pct=Math.round(answered/Math.max(total,1)*100);
    bar.setAttribute('aria-valuenow',pct);
    let inner=bar.querySelector('.progress-inner');
    if(!inner){inner=document.createElement('div'); inner.className='progress-inner'; inner.style.height='100%'; inner.style.borderRadius='8px'; inner.style.background='linear-gradient(90deg,var(--accent), rgba(217,178,106,0.7))'; inner.style.transition='width 320ms ease-in-out'; bar.appendChild(inner);}
    inner.style.width=pct+'%';
  }catch(e){}
}
