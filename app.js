const QUESTIONS_PER_ROUND = 10;
const DAN_VALUES = [2, 3, 4, 5, 6, 7, 8, 9];
const RESULTS_ENDPOINT = window.GUGUSTAR_RESULTS_ENDPOINT || "";
const GROWTH_STAGES = [
  { name: "씨앗", icon: "🌰", stars: 0, message: "별을 모아 씨앗을 깨워 보세요!" },
  { name: "새싹", icon: "🌱", stars: 10, message: "작은 새싹이 쏙 올라왔어요!" },
  { name: "잎", icon: "🌿", stars: 30, message: "초록 잎이 힘차게 자라고 있어요!" },
  { name: "꽃", icon: "🌸", stars: 60, message: "별빛을 머금은 꽃이 활짝 피었어요!" },
  { name: "별나무", icon: "🌳", stars: 100, message: "멋진 별나무를 완성했어요!" },
];

const state = {
  selectedDans: new Set(),
  questions: [],
  questionIndex: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  roundStars: 0,
  mistakes: [],
  locked: false,
  soundOn: true,
  studentClass: "",
  studentNumber: "",
  resultSubmitted: false,
  starsBeforeRound: 0,
  totalStars: Number(localStorage.getItem("gugustar-total") || 0),
  mastered: JSON.parse(localStorage.getItem("gugustar-mastered") || "{}"),
};

const elements = {
  screens: document.querySelectorAll(".screen"),
  homeScreen: document.querySelector("#homeScreen"),
  gameScreen: document.querySelector("#gameScreen"),
  resultScreen: document.querySelector("#resultScreen"),
  danGrid: document.querySelector("#danGrid"),
  selectedSummary: document.querySelector("#selectedSummary"),
  playButton: document.querySelector("#playButton"),
  totalStars: document.querySelector("#totalStars"),
  walletStageIcon: document.querySelector("#walletStageIcon"),
  growthPlant: document.querySelector("#growthPlant"),
  growthIcon: document.querySelector("#growthIcon"),
  growthStageName: document.querySelector("#growthStageName"),
  growthMessage: document.querySelector("#growthMessage"),
  growthProgress: document.querySelector("#growthProgress"),
  growthProgressFill: document.querySelector("#growthProgressFill"),
  growthProgressText: document.querySelector("#growthProgressText"),
  growthStarTotal: document.querySelector("#growthStarTotal"),
  growthStages: document.querySelector("#growthStages"),
  resultGrowth: document.querySelector("#resultGrowth"),
  resultGrowthIcon: document.querySelector("#resultGrowthIcon"),
  resultGrowthTitle: document.querySelector("#resultGrowthTitle"),
  resultGrowthMessage: document.querySelector("#resultGrowthMessage"),
  resultGrowthFill: document.querySelector("#resultGrowthFill"),
  roundStars: document.querySelector("#roundStars"),
  questionCount: document.querySelector("#questionCount"),
  progressFill: document.querySelector("#progressFill"),
  streakText: document.querySelector("#streakText"),
  roundLabel: document.querySelector("#roundLabel"),
  factorA: document.querySelector("#factorA"),
  factorB: document.querySelector("#factorB"),
  answerBox: document.querySelector("#answerBox"),
  choiceGrid: document.querySelector("#choiceGrid"),
  speechBubble: document.querySelector("#speechBubble"),
  feedbackOverlay: document.querySelector("#feedbackOverlay"),
  feedbackIcon: document.querySelector("#feedbackIcon"),
  feedbackTitle: document.querySelector("#feedbackTitle"),
  feedbackDetail: document.querySelector("#feedbackDetail"),
  toast: document.querySelector("#toast"),
  studentClass: document.querySelector("#studentClass"),
  studentNumber: document.querySelector("#studentNumber"),
  submitResultButton: document.querySelector("#submitResultButton"),
  submitStatus: document.querySelector("#submitStatus"),
};

function shuffle(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function showScreen(screen) {
  elements.screens.forEach((item) => item.classList.remove("active"));
  screen.classList.add("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getGrowthInfo(stars) {
  let stageIndex = 0;
  GROWTH_STAGES.forEach((stage, index) => {
    if (stars >= stage.stars) stageIndex = index;
  });
  const stage = GROWTH_STAGES[stageIndex];
  const nextStage = GROWTH_STAGES[stageIndex + 1] || null;
  const progress = nextStage
    ? ((stars - stage.stars) / (nextStage.stars - stage.stars)) * 100
    : 100;
  return {
    stage,
    stageIndex,
    nextStage,
    progress: Math.max(0, Math.min(100, progress)),
  };
}

function renderGrowthStages(currentIndex) {
  elements.growthStages.innerHTML = GROWTH_STAGES.map(
    (stage, index) => `
      <div class="growth-stage ${index <= currentIndex ? "unlocked" : ""} ${
        index === currentIndex ? "current" : ""
      }">
        <span aria-hidden="true">${stage.icon}</span>
        <strong>${stage.name}</strong>
        <small>${stage.stars}⭐</small>
      </div>
    `,
  ).join("");
}

function updateGrowthView() {
  const info = getGrowthInfo(state.totalStars);
  elements.walletStageIcon.textContent = info.stage.icon;
  elements.growthIcon.textContent = info.stage.icon;
  elements.growthStageName.textContent = info.stage.name;
  elements.growthMessage.textContent = info.stage.message;
  elements.growthStarTotal.textContent = state.totalStars;
  elements.growthProgressFill.style.width = `${info.progress}%`;
  elements.growthProgress.setAttribute("aria-valuenow", String(Math.round(info.progress)));
  elements.growthProgressText.textContent = info.nextStage
    ? `${info.nextStage.name}까지 별 ${info.nextStage.stars - state.totalStars}개`
    : "별나무를 완성했어요!";
  renderGrowthStages(info.stageIndex);
}

function updateResultGrowth(previousStars) {
  const before = getGrowthInfo(previousStars);
  const after = getGrowthInfo(state.totalStars);
  const evolved = after.stageIndex > before.stageIndex;
  elements.resultGrowth.classList.toggle("evolved", evolved);
  elements.resultGrowthIcon.textContent = after.stage.icon;
  elements.resultGrowthTitle.textContent = evolved
    ? `${after.stage.name}(으)로 성장했어요!`
    : `${after.stage.name}이(가) 별빛을 받았어요!`;
  elements.resultGrowthMessage.textContent = after.nextStage
    ? `${after.nextStage.name}까지 별 ${after.nextStage.stars - state.totalStars}개가 남았어요.`
    : "최고 단계 달성! 별나무를 계속 반짝이게 해 주세요.";
  elements.resultGrowthFill.style.width = `${after.progress}%`;
}

function renderDanButtons() {
  elements.danGrid.innerHTML = "";
  DAN_VALUES.forEach((dan) => {
    const button = document.createElement("button");
    button.className = "dan-button";
    button.type = "button";
    button.textContent = `${dan}단`;
    button.dataset.dan = dan;
    button.setAttribute("aria-pressed", "false");
    button.setAttribute("aria-label", `${dan}단 선택`);
    if ((state.mastered[dan] || 0) >= 8) button.classList.add("mastered");
    button.addEventListener("click", () => toggleDan(dan, button));
    elements.danGrid.appendChild(button);
  });
}

function toggleDan(dan, button) {
  playTone("tap");
  if (state.selectedDans.has(dan)) {
    state.selectedDans.delete(dan);
    button.classList.remove("selected");
    button.setAttribute("aria-pressed", "false");
  } else {
    state.selectedDans.add(dan);
    button.classList.add("selected");
    button.setAttribute("aria-pressed", "true");
  }
  const selected = [...state.selectedDans].sort((a, b) => a - b);
  elements.selectedSummary.textContent = selected.length
    ? selected.map((value) => `${value}단`).join(", ")
    : "아직 없어요";
  updatePlayEligibility();
}

function updatePlayEligibility() {
  const studentClass = elements.studentClass.value;
  const studentNumber = Number(elements.studentNumber.value);
  const hasStudentInfo =
    Boolean(studentClass) &&
    Number.isInteger(studentNumber) &&
    studentNumber >= 1 &&
    studentNumber <= 40;
  elements.playButton.disabled = !state.selectedDans.size || !hasStudentInfo;
}

function buildQuestions() {
  const selected = [...state.selectedDans];
  const pool = [];
  selected.forEach((dan) => {
    for (let multiplier = 1; multiplier <= 9; multiplier += 1) {
      pool.push({ a: dan, b: multiplier, answer: dan * multiplier });
    }
  });

  const shuffledPool = shuffle(pool);
  const questions = [];
  while (questions.length < QUESTIONS_PER_ROUND) {
    const next = shuffledPool[questions.length % shuffledPool.length];
    questions.push({ ...next });
    if (questions.length % shuffledPool.length === 0) shuffledPool.reverse();
  }
  return shuffle(questions);
}

function makeChoices(question) {
  const correct = question.answer;
  const candidates = new Set([correct]);
  const offsets = shuffle([-10, -5, -4, -3, -2, -1, 1, 2, 3, 4, 5, 10]);

  offsets.forEach((offset) => {
    if (candidates.size >= 4) return;
    const value = correct + offset;
    if (value > 0 && value <= 81) candidates.add(value);
  });

  let fallback = 2;
  while (candidates.size < 4) {
    if (fallback !== correct) candidates.add(fallback);
    fallback += 1;
  }
  return shuffle([...candidates]);
}

function startGame() {
  updatePlayEligibility();
  if (elements.playButton.disabled) {
    showToast("반·번호와 연습할 단을 모두 선택해 주세요");
    return;
  }
  state.studentClass = elements.studentClass.value;
  state.studentNumber = String(Number(elements.studentNumber.value));
  state.starsBeforeRound = state.totalStars;
  state.resultSubmitted = false;
  state.questions = buildQuestions();
  state.questionIndex = 0;
  state.correct = 0;
  state.streak = 0;
  state.bestStreak = 0;
  state.roundStars = 0;
  state.mistakes = [];
  state.locked = false;
  elements.roundStars.textContent = "0";
  const selected = [...state.selectedDans].sort((a, b) => a - b);
  elements.roundLabel.textContent =
    selected.length === 1 ? `${selected[0]}단 모험` : "섞어서 모험";
  showScreen(elements.gameScreen);
  renderQuestion();
  playTone("start");
}

function renderQuestion() {
  state.locked = false;
  const question = state.questions[state.questionIndex];
  elements.factorA.textContent = question.a;
  elements.factorB.textContent = question.b;
  elements.answerBox.textContent = "?";
  elements.answerBox.className = "answer-box";
  elements.questionCount.textContent = `${state.questionIndex + 1} / ${QUESTIONS_PER_ROUND}`;
  elements.progressFill.style.width = `${((state.questionIndex + 1) / QUESTIONS_PER_ROUND) * 100}%`;
  elements.streakText.textContent =
    state.streak >= 2 ? `🔥 ${state.streak}문제 연속 정답!` : "연속 정답에 도전!";
  elements.speechBubble.textContent = getEncouragement();
  elements.choiceGrid.innerHTML = "";

  makeChoices(question).forEach((choice) => {
    const button = document.createElement("button");
    button.className = "choice-button";
    button.type = "button";
    button.textContent = choice;
    button.dataset.value = choice;
    button.setAttribute("aria-label", `정답 ${choice}`);
    button.addEventListener("click", () => checkAnswer(choice, button));
    elements.choiceGrid.appendChild(button);
  });
}

function getEncouragement() {
  if (state.streak >= 5) return "와! 별빛 속도야!";
  if (state.streak >= 3) return "감이 딱 왔구나!";
  const messages = ["천천히 생각해 봐!", "넌 할 수 있어!", "곱해서 답을 찾아봐!", "좋아, 다음 별로!"];
  return messages[state.questionIndex % messages.length];
}

function checkAnswer(value, button) {
  if (state.locked) return;
  state.locked = true;
  const question = state.questions[state.questionIndex];
  const isCorrect = value === question.answer;
  const buttons = [...elements.choiceGrid.querySelectorAll(".choice-button")];
  buttons.forEach((item) => {
    item.disabled = true;
    if (Number(item.dataset.value) === question.answer) item.classList.add("correct-choice");
  });

  elements.answerBox.textContent = question.answer;
  if (isCorrect) {
    button.classList.add("correct-choice");
    elements.answerBox.classList.add("correct");
    state.correct += 1;
    state.streak += 1;
    state.bestStreak = Math.max(state.bestStreak, state.streak);
    const bonus = state.streak >= 3 ? 2 : 1;
    state.roundStars += bonus;
    elements.roundStars.textContent = state.roundStars;
    showFeedback(true, bonus);
    playTone("correct");
  } else {
    button.classList.add("wrong-choice");
    elements.answerBox.classList.add("wrong");
    state.mistakes.push(question);
    state.streak = 0;
    showFeedback(false, 0, question);
    playTone("wrong");
  }

  setTimeout(() => {
    hideFeedback();
    state.questionIndex += 1;
    if (state.questionIndex >= QUESTIONS_PER_ROUND) finishGame();
    else renderQuestion();
  }, isCorrect ? 900 : 1450);
}

function showFeedback(isCorrect, bonus, question) {
  elements.feedbackIcon.textContent = isCorrect ? (bonus === 2 ? "🌟" : "⭐") : "🌱";
  elements.feedbackTitle.textContent = isCorrect ? "정답!" : "괜찮아!";
  elements.feedbackDetail.textContent = isCorrect
    ? bonus === 2
      ? "연속 정답 보너스 별 +2"
      : "반짝이는 별을 찾았어!"
    : `${question.a} × ${question.b} = ${question.answer}이야`;
  elements.feedbackOverlay.classList.add("show");
  elements.feedbackOverlay.setAttribute("aria-hidden", "false");
}

function hideFeedback() {
  elements.feedbackOverlay.classList.remove("show");
  elements.feedbackOverlay.setAttribute("aria-hidden", "true");
}

function finishGame() {
  const previousStars = state.totalStars;
  state.totalStars += state.roundStars;
  localStorage.setItem("gugustar-total", state.totalStars);
  elements.totalStars.textContent = state.totalStars;
  updateGrowthView();
  updateResultGrowth(previousStars);

  [...state.selectedDans].forEach((dan) => {
    const questionsForDan = state.questions.filter((question) => question.a === dan);
    const wrongForDan = state.mistakes.filter((question) => question.a === dan);
    const correctForDan = questionsForDan.length - wrongForDan.length;
    state.mastered[dan] = Math.max(state.mastered[dan] || 0, correctForDan);
  });
  localStorage.setItem("gugustar-mastered", JSON.stringify(state.mastered));

  document.querySelector("#correctCount").textContent = state.correct;
  document.querySelector("#earnedStars").textContent = state.roundStars;
  document.querySelector("#bestStreak").textContent = state.bestStreak;
  elements.submitResultButton.disabled = false;
  elements.submitResultButton.classList.remove("submitted");
  elements.submitResultButton.innerHTML =
    '<span aria-hidden="true">📨</span> 선생님께 제출하기';
  elements.submitStatus.textContent = `${state.studentClass}반 ${state.studentNumber}번의 결과예요.`;

  const title = document.querySelector("#resultTitle");
  const message = document.querySelector("#resultMessage");
  const badge = document.querySelector("#resultBadge");

  if (state.correct === 10) {
    title.textContent = "구구별 대장 탄생!";
    message.textContent = "모든 문제를 맞혔어요. 정말 완벽해요!";
    badge.textContent = "🏆";
  } else if (state.correct >= 7) {
    title.textContent = "구구별이 반짝반짝!";
    message.textContent = "거의 다 왔어요. 멋진 실력이에요!";
    badge.textContent = "🌟";
  } else {
    title.textContent = "오늘도 한 뼘 성장!";
    message.textContent = "틀려도 괜찮아요. 다시 하면 더 잘할 수 있어요!";
    badge.textContent = "🚀";
  }

  const reviewBox = document.querySelector("#reviewBox");
  const reviewList = document.querySelector("#reviewList");
  const uniqueMistakes = [
    ...new Map(
      state.mistakes.map((question) => [`${question.a}-${question.b}`, question]),
    ).values(),
  ];
  reviewBox.hidden = uniqueMistakes.length === 0;
  reviewList.innerHTML = uniqueMistakes
    .map(
      (question) =>
        `<span class="review-chip">${question.a} × ${question.b} = ${question.answer}</span>`,
    )
    .join("");

  showScreen(elements.resultScreen);
  playTone(state.correct >= 7 ? "finish" : "start");
}

async function submitResult() {
  if (state.resultSubmitted) return;
  if (!RESULTS_ENDPOINT) {
    elements.submitStatus.textContent =
      "아직 선생님 스프레드시트와 연결되지 않았어요.";
    showToast("선생님 설정이 필요해요");
    return;
  }

  elements.submitResultButton.disabled = true;
  elements.submitResultButton.textContent = "제출하는 중…";
  const selectedDans = [...state.selectedDans].sort((a, b) => a - b);
  const uniqueMistakes = [
    ...new Map(
      state.mistakes.map((question) => [`${question.a}-${question.b}`, question]),
    ).values(),
  ];
  const payload = {
    studentClass: state.studentClass,
    studentNumber: state.studentNumber,
    dans: selectedDans.map((dan) => `${dan}단`).join(", "),
    correct: state.correct,
    total: QUESTIONS_PER_ROUND,
    mistakes:
      uniqueMistakes.length === 0
        ? "없음"
        : uniqueMistakes
            .map((question) => `${question.a}×${question.b}=${question.answer}`)
            .join(", "),
    bestStreak: state.bestStreak,
    stars: state.roundStars,
    playedAt: new Date().toLocaleString("ko-KR"),
  };

  try {
    await fetch(RESULTS_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
    });
    state.resultSubmitted = true;
    elements.submitResultButton.classList.add("submitted");
    elements.submitResultButton.innerHTML =
      '<span aria-hidden="true">✓</span> 제출 완료!';
    elements.submitStatus.textContent =
      "선생님께 안전하게 전달했어요. 정말 잘했어요!";
    playTone("finish");
  } catch {
    elements.submitResultButton.disabled = false;
    elements.submitResultButton.innerHTML =
      '<span aria-hidden="true">↻</span> 다시 제출하기';
    elements.submitStatus.textContent =
      "인터넷 연결을 확인하고 다시 눌러 주세요.";
  }
}

let audioContext;
function playTone(type) {
  if (!state.soundOn) return;
  try {
    audioContext ||= new AudioContext();
    const now = audioContext.currentTime;
    const notes = {
      tap: [440],
      start: [392, 523],
      correct: [523, 659, 784],
      wrong: [330, 294],
      finish: [523, 659, 784, 1046],
    }[type];
    notes.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, now + index * 0.09);
      gain.gain.exponentialRampToValueAtTime(0.12, now + index * 0.09 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + index * 0.09 + 0.12);
      oscillator.connect(gain).connect(audioContext.destination);
      oscillator.start(now + index * 0.09);
      oscillator.stop(now + index * 0.09 + 0.14);
    });
  } catch {
    // The game remains fully usable when audio is unavailable.
  }
}

function goHome() {
  hideFeedback();
  renderDanButtons();
  const selected = [...state.selectedDans];
  selected.forEach((dan) => {
    const button = elements.danGrid.querySelector(`[data-dan="${dan}"]`);
    if (button) {
      button.classList.add("selected");
      button.setAttribute("aria-pressed", "true");
    }
  });
  showScreen(elements.homeScreen);
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  setTimeout(() => elements.toast.classList.remove("show"), 1400);
}

document.querySelector("#startChoosingButton").addEventListener("click", () => {
  document.querySelector("#missionPanel").scrollIntoView({ behavior: "smooth", block: "center" });
  playTone("tap");
});
elements.playButton.addEventListener("click", startGame);
elements.studentClass.addEventListener("change", updatePlayEligibility);
elements.studentNumber.addEventListener("input", updatePlayEligibility);
elements.submitResultButton.addEventListener("click", submitResult);
document.querySelector("#retryButton").addEventListener("click", startGame);
document.querySelector("#chooseAgainButton").addEventListener("click", goHome);
document.querySelector("#homeButton").addEventListener("click", goHome);
document.querySelector("#quitButton").addEventListener("click", goHome);

document.querySelector("#soundButton").addEventListener("click", () => {
  state.soundOn = !state.soundOn;
  document.querySelector("#soundIcon").textContent = state.soundOn ? "♪" : "×";
  document.querySelector("#soundButton").setAttribute(
    "aria-label",
    state.soundOn ? "소리 끄기" : "소리 켜기",
  );
  if (state.soundOn) playTone("tap");
  showToast(state.soundOn ? "게임 소리를 켰어요" : "게임 소리를 껐어요");
});

document.addEventListener("keydown", (event) => {
  if (!elements.gameScreen.classList.contains("active") || state.locked) return;
  const digit = Number(event.key);
  if (!Number.isInteger(digit)) return;
  const buffer = elements.answerBox.dataset.buffer || "";
  const nextBuffer = `${buffer}${digit}`.slice(-2);
  elements.answerBox.dataset.buffer = nextBuffer;
  elements.answerBox.textContent = nextBuffer;

  const exactButton = [...elements.choiceGrid.querySelectorAll(".choice-button")].find(
    (button) => button.dataset.value === nextBuffer,
  );
  if (exactButton && Number(nextBuffer) >= 10) {
    elements.answerBox.dataset.buffer = "";
    checkAnswer(Number(nextBuffer), exactButton);
  } else {
    clearTimeout(window.answerBufferTimer);
    window.answerBufferTimer = setTimeout(() => {
      const currentBuffer = elements.answerBox.dataset.buffer;
      const matchingButton = [...elements.choiceGrid.querySelectorAll(".choice-button")].find(
        (button) => button.dataset.value === currentBuffer,
      );
      elements.answerBox.dataset.buffer = "";
      if (matchingButton) checkAnswer(Number(currentBuffer), matchingButton);
      else elements.answerBox.textContent = "?";
    }, 650);
  }
});

elements.totalStars.textContent = state.totalStars;
updateGrowthView();
renderDanButtons();
