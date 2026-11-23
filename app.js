const STORAGE_KEY = "examguard_demo_data_v1";
let currentStudent = null;
let currentQuestion = 0;
let answers = {};
let secondsLeft = 600;
let timerId = null;
let inactivityId = null;
let inactivityWarned = false;
let examActive = false;
let events = [];

const questions = [
 {q:"Which activity is part of the software development life cycle?",o:["Requirement analysis","Playing games","Photo editing","Social networking"],a:0},
 {q:"Which document describes what a software system should do?",o:["User requirements specification","Wallpaper","Invoice","Music file"],a:0},
 {q:"What is the main purpose of software testing?",o:["To find defects and verify behaviour","To change the screen colour","To increase file size","To avoid documentation"],a:0},
 {q:"Which tool is commonly used for browser automation testing?",o:["Selenium","Paint","Calculator","Notepad"],a:0},
 {q:"What does a project milestone represent?",o:["A significant project checkpoint","A programming error","A database password","A browser tab"],a:0}
];

function getData(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{sessions:[],events:[]}}catch{return {sessions:[],events:[]}}}
function saveData(data){localStorage.setItem(STORAGE_KEY,JSON.stringify(data))}
function timeNow(){return new Date().toLocaleString()}
function notify(msg){const t=document.getElementById("toast");t.textContent=msg;t.classList.add("show");setTimeout(()=>t.classList.remove("show"),2400)}
function record(type,detail){
 if(!currentStudent)return;
 const item={time:timeNow(),student:currentStudent.name,roll:currentStudent.roll,type,detail};
 events.unshift(item);
 const data=getData();data.events.unshift(item);saveData(data);
 renderMiniLog();renderDashboard();
}
function switchView(view){
 document.querySelectorAll(".nav").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
 document.getElementById("student-view").classList.toggle("hidden",view!=="student");
 document.getElementById("teacher-view").classList.toggle("hidden",view!=="teacher");
 document.getElementById("page-title").textContent=view==="student"?"Student examination":"Teacher dashboard";
 document.getElementById("crumb").textContent=view==="student"?"STUDENT EXAM":"TEACHER DASHBOARD";
 if(view==="teacher")renderDashboard();
}
document.querySelectorAll(".nav").forEach(b=>b.addEventListener("click",()=>switchView(b.dataset.view)));

document.getElementById("login-form").addEventListener("submit",e=>{
 e.preventDefault();
 const name=document.getElementById("student-name").value.trim();
 const roll=document.getElementById("roll-number").value.trim();
 const code=document.getElementById("exam-code").value.trim();
 if(!name||!roll||!code)return;
 currentStudent={name,roll,code,started:timeNow(),submitted:false};
 currentQuestion=0;answers={};events=[];secondsLeft=600;examActive=true;
 const data=getData();data.sessions.unshift(currentStudent);saveData(data);
 document.getElementById("login-panel").classList.add("hidden");
 document.getElementById("exam-panel").classList.remove("hidden");
 document.getElementById("candidate-line").textContent=`Candidate: ${name} · Roll no: ${roll}`;
 record("Login","Student entered the exam portal");
 record("Exam started","Assessment timer started");
 showQuestion();startTimer();resetInactivity();
 notify("Exam session started");
});
function showQuestion(){
 const q=questions[currentQuestion];
 document.getElementById("question-count").textContent=`QUESTION ${String(currentQuestion+1).padStart(2,"0")} / ${questions.length}`;
 document.getElementById("question-text").textContent=q.q;
 document.getElementById("options").innerHTML=q.o.map((option,i)=>`<label class="option"><input type="radio" name="answer" value="${i}" ${answers[currentQuestion]===i?"checked":""}> ${String.fromCharCode(65+i)}. ${option}</label>`).join("");
 document.getElementById("prev-btn").disabled=currentQuestion===0;
 document.getElementById("next-btn").textContent=currentQuestion===questions.length-1?"Review answers":"Next question →";
}
function storeAnswer(){const selected=document.querySelector('input[name="answer"]:checked');if(selected)answers[currentQuestion]=Number(selected.value)}
document.getElementById("prev-btn").addEventListener("click",()=>{storeAnswer();if(currentQuestion>0){currentQuestion--;showQuestion()}});
document.getElementById("next-btn").addEventListener("click",()=>{storeAnswer();if(currentQuestion<questions.length-1){currentQuestion++;showQuestion()}else notify("You are on the final question. Review and submit.")});
function startTimer(){clearInterval(timerId);timerId=setInterval(()=>{secondsLeft--;const m=Math.floor(secondsLeft/60),s=secondsLeft%60;document.getElementById("timer").textContent=`${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`;if(secondsLeft<=0)finishExam(true)},1000)}
function resetInactivity(){clearTimeout(inactivityId);if(!examActive)return;inactivityId=setTimeout(()=>{if(examActive&&!inactivityWarned){inactivityWarned=true;record("Inactivity","No keyboard, pointer or scroll activity for 30 seconds");notify("Inactivity event recorded")}},30000)}
["mousemove","keydown","click","scroll","touchstart"].forEach(event=>document.addEventListener(event,()=>{if(examActive){inactivityWarned=false;resetInactivity()}},{passive:true}));
document.addEventListener("visibilitychange",()=>{if(examActive&&document.hidden){record("Tab hidden","Exam page became hidden; candidate may have switched tabs or windows");notify("Tab visibility event recorded")}else if(examActive&&!document.hidden){record("Tab visible","Exam page became visible again")}});
document.getElementById("submit-btn").addEventListener("click",()=>{if(examActive&&confirm("Submit your examination now?"))finishExam(false)});
function finishExam(auto){
 if(!examActive)return;storeAnswer();examActive=false;clearInterval(timerId);clearTimeout(inactivityId);
 const score=questions.reduce((n,q,i)=>n+(answers[i]===q.a?1:0),0);
 const data=getData();const session=data.sessions.find(s=>s.roll===currentStudent.roll&&s.started===currentStudent.started);
 if(session){session.submitted=true;session.score=score;session.finished=timeNow()}saveData(data);
 document.getElementById("exam-panel").classList.add("hidden");document.getElementById("result-panel").classList.remove("hidden");
 document.getElementById("final-score").textContent=`${score}/${questions.length}`;
 document.getElementById("result-summary").textContent=auto?"Time expired. Your answers were submitted automatically.":"Your answers have been submitted successfully.";
 record("Exam submitted",`Score: ${score}/${questions.length}${auto?" (time expired)":""}`);
 renderDashboard();
}
function renderMiniLog(){
 document.getElementById("event-total").textContent=events.length;
 document.getElementById("student-mini-log").innerHTML=events.slice(0,5).map(e=>`<div class="mini-event"><b>${escapeHtml(e.type)}</b>${escapeHtml(e.detail)}<br><span>${escapeHtml(e.time)}</span></div>`).join("")||'<p class="empty">No activity yet.</p>';
}
function escapeHtml(v){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function renderDashboard(){
 const data=getData();document.getElementById("sessions-count").textContent=data.sessions.length;document.getElementById("events-count").textContent=data.events.length;document.getElementById("submitted-count").textContent=data.sessions.filter(s=>s.submitted).length;
 const tbody=document.getElementById("activity-table");
 tbody.innerHTML=data.events.length?data.events.slice(0,100).map(e=>`<tr><td>${escapeHtml(e.time)}</td><td>${escapeHtml(e.student)}</td><td>${escapeHtml(e.roll)}</td><td class="event-cell">${escapeHtml(e.type)}</td><td>${escapeHtml(e.detail)}</td></tr>`).join(""):'<tr><td colspan="5" class="empty-cell">No activity records yet. Start a student demo first.</td></tr>';
 document.getElementById("session-list").innerHTML=data.sessions.length?data.sessions.map(s=>`<div class="session-row"><div><b>${escapeHtml(s.name)}</b> · ${escapeHtml(s.roll)}<br><span>${escapeHtml(s.started)}</span></div><span>${s.submitted?"Submitted · "+s.score+"/5":"In progress"}</span></div>`).join(""):'<p class="empty-cell">No sessions recorded yet.</p>';
}
document.getElementById("export-btn").addEventListener("click",()=>{
 const data=getData();if(!data.events.length){notify("No activity data to export");return}
 const rows=[["Time","Student","Roll number","Event","Detail"],...data.events.map(e=>[e.time,e.student,e.roll,e.type,e.detail])];
 const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(",")).join("\n");
 const blob=new Blob([csv],{type:"text/csv"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="examguard-activity-records.csv";a.click();URL.revokeObjectURL(url);
});
document.getElementById("clear-btn").addEventListener("click",()=>{if(confirm("Clear all locally stored demo sessions and activity records?")){saveData({sessions:[],events:[]});renderDashboard();notify("Demo records cleared")}});
document.getElementById("new-session-btn").addEventListener("click",()=>{clearInterval(timerId);clearTimeout(inactivityId);currentStudent=null;events=[];document.getElementById("result-panel").classList.add("hidden");document.getElementById("login-panel").classList.remove("hidden");document.getElementById("login-form").reset();document.getElementById("exam-code").value="SEPM-06";document.getElementById("student-mini-log").innerHTML='<p class="empty">No activity yet.</p>';document.getElementById("event-total").textContent="0";});
renderDashboard();
