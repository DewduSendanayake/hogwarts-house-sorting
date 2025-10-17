function renderQuiz() {
  const quizDiv = document.getElementById("quiz");
  QUIZ.forEach((q, i) => {
    const qDiv = document.createElement("div");
    qDiv.className = "question";
    const qTitle = document.createElement("h3");
    qTitle.textContent = (i+1) + ". " + q.q;
    qDiv.appendChild(qTitle);
    const optsDiv = document.createElement("div");
    optsDiv.className = "options";
    q.options.forEach(opt => {
      const id = `q${i}_${opt.replace(/\s+/g,'_')}`;
      const label = document.createElement("label");
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q${i}`;
      radio.value = opt;
      label.appendChild(radio);
      label.append(" " + opt);
      optsDiv.appendChild(label);
    });
    qDiv.appendChild(optsDiv);
    quizDiv.appendChild(qDiv);
  });
}

function collectAnswers() {
  const answers = [];
  for (let i = 0; i < QUIZ.length; i++) {
    const radios = document.getElementsByName(`q${i}`);
    let chosen = null;
    for (const r of radios) {
      if (r.checked) chosen = r.value;
    }
    answers.push(chosen);
  }
  return answers;
}

async function submitQuiz() {
  const answers = collectAnswers();
  // validate
  for (let i=0;i<answers.length;i++) {
    if (!answers[i]) {
      alert("Please answer question " + (i+1));
      return;
    }
  }
  const resp = await fetch('/api/sort', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({answers})
  });
  if (!resp.ok) {
    const err = await resp.json();
    alert("Error: " + (err.error || resp.statusText));
    return;
  }
  const data = await resp.json();
  const result = document.getElementById("result");
  result.classList.remove("hidden");
  result.innerHTML = `<h2>Your house: ${data.house}</h2>
                      <pre>${JSON.stringify(data.scores, null, 2)}</pre>`;
  window.scrollTo({top: document.body.scrollHeight, behavior: 'smooth'});
}

document.addEventListener("DOMContentLoaded", () => {
  renderQuiz();
  document.getElementById("submit").addEventListener("click", submitQuiz);
});
