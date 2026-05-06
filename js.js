const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const resultsText = document.getElementById("resultsText");
const cards = Array.from(document.querySelectorAll(".card"));
const catalogGroups = Array.from(document.querySelectorAll("[data-group]"));
const downloadCatalogButton = document.getElementById("downloadCatalogButton");

const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const chatMessages = document.getElementById("chatMessages");
const chatStatus = document.getElementById("chatStatus");

const watchModal = document.getElementById("watchModal");
const modalOverlay = document.getElementById("modalOverlay");
const closeModalButton = document.getElementById("closeModalButton");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalCategory = document.getElementById("modalCategory");
const modalYear = document.getElementById("modalYear");
const modalDuration = document.getElementById("modalDuration");
const modalRating = document.getElementById("modalRating");
const modalPlayer = document.getElementById("modalPlayer");
const modalVideo = document.getElementById("modalVideo");
const modalVideoSource = document.getElementById("modalVideoSource");
const qualitySelect = document.getElementById("qualitySelect");
const qualityButtons = document.getElementById("qualityButtons");
const playerStatus = document.getElementById("playerStatus");
const fullscreenButton = document.getElementById("fullscreenButton");
const pipButton = document.getElementById("pipButton");

let currentQualityMap = {};
const CHAT_QUEUE_KEY = "darknex_tv_pending_messages";
const VIDEO_DIRECTORY = "film.mp3/";
const SPIDER_MAN_PARTS = [
  {
    title: "Человек-паук",
    description: "История о Питере Паркере, который получает суперсилы и становится героем Нью-Йорка.",
    year: "2002",
    duration: "121 мин",
    rating: "Фильм",
    genre: "Боевик",
    category: "кино",
    tags: "фантастика боевик приключения marvel",
    video: "Chelovek_Pauk_2002_720-kinovasek.net.mp4",
    quality: "720p",
  },
  {
    title: "Человек-паук 2",
    description: "Питер Паркер пытается совмещать обычную жизнь и роль героя, сталкиваясь с новым сильным противником.",
    year: "2004",
    duration: "127 мин",
    rating: "Фильм",
    genre: "Боевик",
    category: "кино",
    tags: "фантастика боевик приключения marvel",
    video: "Chelovek_pauk_2_2004_720-kinovasek.net (2).mp4",
    quality: "720p",
  },
  {
    title: "Человек-паук 3: Враг в отражении",
    description: "Продолжение истории Питера Паркера, где ему приходится сражаться сразу с несколькими угрозами и самим собой.",
    year: "2007",
    duration: "139 мин",
    rating: "Фильм",
    genre: "Боевик",
    category: "кино",
    tags: "фантастика боевик приключения marvel",
    video: "Chelovek_Pauk_3_Vrag_V_Otrazhenii_2007_720-kinovasek.net.mp4",
    quality: "720p",
  },
  {
    title: "Новый Человек-паук: Высокое напряжение",
    description: "Питер Паркер сталкивается с новыми врагами и тяжёлыми выборами, защищая город и близких ему людей.",
    year: "2014",
    duration: "142 мин",
    rating: "Фильм",
    genre: "Фантастика",
    category: "кино",
    tags: "фантастика боевик приключения marvel",
    video: "Novyj_Chelovek_pauk_Vysokoe_napryazhenie_2014_720_kinovasek_net.mp4",
    quality: "720p",
  },
];

function getPendingMessages() {
  try {
    return JSON.parse(localStorage.getItem(CHAT_QUEUE_KEY)) || [];
  } catch (error) {
    return [];
  }
}

function savePendingMessages(messages) {
  localStorage.setItem(CHAT_QUEUE_KEY, JSON.stringify(messages));
}

function resolveVideoPath(filename) {
  if (!filename) {
    return "";
  }

  if (/^(?:https?:|blob:|data:)/i.test(filename) || filename.startsWith(VIDEO_DIRECTORY)) {
    return filename;
  }

  return `${VIDEO_DIRECTORY}${filename}`;
}

function detectQualityLabel(filename) {
  const match = filename.match(/(2160|1440|1080|720|480|360)p/i);
  if (match) {
    return `${match[1]}p`;
  }

  return "Исходное качество";
}

function hasInlineVideo(card) {
  return Boolean(card.dataset.video);
}

function updateWatchButtonsState() {
  cards.forEach((card) => {
    const watchButton = card.querySelector(".watch-button");

    if (!watchButton) {
      return;
    }

    const hasVideo = hasInlineVideo(card);
    watchButton.disabled = !hasVideo;
    watchButton.textContent = hasVideo ? "Смотреть" : "Нет видео";
    watchButton.title = hasVideo
      ? "Открыть видео во встроенном плеере"
      : "Для этой карточки видеофайл пока не добавлен";
  });
}

function setPlayerStatus(text) {
  playerStatus.textContent = text;
}

function getDetectedQualityLabel() {
  if (!modalVideo.videoHeight) {
    return "";
  }

  return `${modalVideo.videoHeight}p`;
}

function syncQualityWithMetadata() {
  const detectedQuality = getDetectedQualityLabel();
  const qualityEntries = Object.entries(currentQualityMap);

  if (!detectedQuality || qualityEntries.length !== 1) {
    return;
  }

  const [[currentLabel, currentFile]] = qualityEntries;

  if (currentLabel === detectedQuality) {
    return;
  }

  currentQualityMap = {
    [detectedQuality]: currentFile,
  };

  qualitySelect.innerHTML = `<option value="${detectedQuality}">${detectedQuality}</option>`;
  renderQualityControls();
  setActiveQuality(detectedQuality);
}

function updatePlayerButtonsState(hasVideo) {
  const fullscreenSupported = Boolean(
    modalVideo.requestFullscreen || modalVideo.webkitRequestFullscreen
  );
  const pipSupported = Boolean(
    document.pictureInPictureEnabled && modalVideo.requestPictureInPicture
  );

  fullscreenButton.disabled = !hasVideo || !fullscreenSupported;
  pipButton.disabled = !hasVideo || !pipSupported;
  pipButton.hidden = !pipSupported;
}

function updatePlayerStatusFromMetadata() {
  if (!modalVideoSource.src) {
    setPlayerStatus("Выбери карточку с видео, и фильм откроется прямо на сайте.");
    return;
  }

  const qualityLabel = qualitySelect.value || getDetectedQualityLabel() || "исходное качество";
  const resolutionLabel =
    modalVideo.videoWidth && modalVideo.videoHeight
      ? `${modalVideo.videoWidth}×${modalVideo.videoHeight}`
      : "разрешение определяется";

  setPlayerStatus(`Просмотр на сайте • ${qualityLabel} • ${resolutionLabel}`);
}

async function tryAutoplayVideo() {
  try {
    await modalVideo.play();
    updatePlayerStatusFromMetadata();
  } catch (error) {
    setPlayerStatus("Видео загружено. Если автозапуск не сработал, нажми Play.");
  }
}

async function openFullscreenPlayer() {
  const requestFullscreen = modalVideo.requestFullscreen || modalVideo.webkitRequestFullscreen;

  if (!requestFullscreen) {
    return;
  }

  try {
    await requestFullscreen.call(modalVideo);
  } catch (error) {}
}

async function togglePictureInPictureMode() {
  if (!document.pictureInPictureEnabled || !modalVideo.requestPictureInPicture) {
    return;
  }

  try {
    if (document.pictureInPictureElement === modalVideo) {
      await document.exitPictureInPicture();
    } else {
      await modalVideo.requestPictureInPicture();
    }
  } catch (error) {}
}

function updatePictureInPictureButtonLabel() {
  if (pipButton.hidden) {
    return;
  }

  pipButton.textContent =
    document.pictureInPictureElement === modalVideo
      ? "Закрыть мини-окно"
      : "Картинка в картинке";
}

function updateChatStatus() {
  const isOnline = navigator.onLine;
  chatStatus.textContent = isOnline ? "онлайн" : "офлайн";
  chatStatus.classList.toggle("offline", !isOnline);
}

function updateCatalogGroupsVisibility() {
  catalogGroups.forEach((group) => {
    const hasVisibleCards = Array.from(group.querySelectorAll(".card")).some(
      (card) => !card.classList.contains("hidden")
    );

    group.classList.toggle("hidden", !hasVisibleCards);
  });
}

function filterCards(query) {
  const normalizedQuery = query.trim().toLowerCase();
  let visibleCount = 0;

  cards.forEach((card) => {
    const title = (card.dataset.title || "").toLowerCase();
    const category = (card.dataset.category || "").toLowerCase();
    const genre = (card.dataset.genre || "").toLowerCase();
    const description = (card.dataset.description || "").toLowerCase();
    const isMatch =
      !normalizedQuery ||
      title.includes(normalizedQuery) ||
      category.includes(normalizedQuery) ||
      genre.includes(normalizedQuery) ||
      description.includes(normalizedQuery);

    card.classList.toggle("hidden", !isMatch);

    if (isMatch) {
      visibleCount += 1;
    }
  });

  updateCatalogGroupsVisibility();

  if (!normalizedQuery) {
    resultsText.textContent = "Показаны все карточки";
    return;
  }

  resultsText.textContent =
    visibleCount > 0
      ? `Найдено: ${visibleCount}`
      : "Ничего не найдено, попробуй другой запрос";
}

function addMessage(text, sender, options = {}) {
  const message = document.createElement("div");
  message.className = `message ${sender}`;
  if (options.pending) {
    message.classList.add("pending");
  }
  message.textContent = text;

  if (options.id) {
    message.dataset.messageId = options.id;
  }

  chatMessages.appendChild(message);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function renderPendingMessages() {
  const pendingMessages = getPendingMessages();
  pendingMessages.forEach((item) => {
    addMessage(`${item.text} (ожидает отправки)`, "user", {
      pending: true,
      id: item.id,
    });
  });
}

function markMessageAsSent(id) {
  const pendingMessage = chatMessages.querySelector(`[data-message-id="${id}"]`);

  if (!pendingMessage) {
    return;
  }

  pendingMessage.textContent = pendingMessage.textContent.replace(" (ожидает отправки)", "");
  pendingMessage.classList.remove("pending");
}

function flushPendingMessages() {
  if (!navigator.onLine) {
    return;
  }

  const pendingMessages = getPendingMessages();

  if (!pendingMessages.length) {
    return;
  }

  pendingMessages.forEach((item, index) => {
    window.setTimeout(() => {
      markMessageAsSent(item.id);
      addMessage(getBotReply(item.text), "assistant");
    }, 350 * (index + 1));
  });

  savePendingMessages([]);
}

function renderQualityControls() {
  qualityButtons.innerHTML = "";

  Object.keys(currentQualityMap).forEach((quality, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "quality-button";
    if (index === 0) {
      button.classList.add("active");
    }
    button.textContent = quality;
    button.dataset.quality = quality;
    qualityButtons.appendChild(button);
  });
}

function setActiveQuality(qualityName) {
  const buttons = qualityButtons.querySelectorAll(".quality-button");
  buttons.forEach((button) => {
    button.classList.toggle("active", button.dataset.quality === qualityName);
  });

  qualitySelect.value = qualityName;
}

function applyCollectionPart(card, part) {
  card.dataset.title = part.title;
  card.dataset.description = part.description;
  card.dataset.year = part.year;
  card.dataset.duration = part.duration;
  card.dataset.rating = part.rating;
  card.dataset.category = part.category;
  card.dataset.genre = part.tags;
  card.dataset.video = part.video;
  card.dataset.quality = part.quality;

  const title = card.querySelector(".collection-title");
  const description = card.querySelector(".collection-description");
  const genre = card.querySelector(".collection-genre");
  const year = card.querySelector(".collection-year");

  if (title) {
    title.textContent = part.title;
  }
  if (description) {
    description.textContent = part.description;
  }
  if (genre) {
    genre.textContent = part.genre;
  }
  if (year) {
    year.textContent = part.year;
  }
}

function initCollectionCards() {
  const collectionCards = document.querySelectorAll("[data-collection='spider-man']");

  collectionCards.forEach((card) => {
    applyCollectionPart(card, SPIDER_MAN_PARTS[0]);

    card.querySelectorAll(".part-button").forEach((button) => {
      button.addEventListener("click", () => {
        const partIndex = Number(button.dataset.part);
        const part = SPIDER_MAN_PARTS[partIndex];

        if (!part) {
          return;
        }

        card.querySelectorAll(".part-button").forEach((item) => {
          item.classList.toggle("active", item === button);
        });

        applyCollectionPart(card, part);
        filterCards(searchInput.value);
      });
    });
  });
}

function switchVideoQuality(selectedQuality) {
  const selectedFile = currentQualityMap[selectedQuality];

  if (!selectedFile) {
    return;
  }

  const currentTime = modalVideo.currentTime || 0;
  const shouldResume = !modalVideo.paused;

  setActiveQuality(selectedQuality);
  setPlayerStatus("Переключаем качество видео...");
  modalVideoSource.src = encodeURI(resolveVideoPath(selectedFile));
  modalVideo.load();

  modalVideo.addEventListener(
    "loadedmetadata",
    () => {
      syncQualityWithMetadata();
      updatePlayerStatusFromMetadata();
      modalVideo.currentTime = currentTime;

      if (shouldResume) {
        modalVideo.play().catch(() => {});
      }
    },
    { once: true }
  );
}

function downloadTextFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function openWatchModal(card) {
  modalTitle.textContent = card.dataset.title;
  modalDescription.textContent = card.dataset.description;
  modalCategory.textContent = card.dataset.category;
  modalYear.textContent = `Год: ${card.dataset.year}`;
  modalDuration.textContent = `Длительность: ${card.dataset.duration}`;
  modalRating.textContent = card.dataset.rating;

  if (card.dataset.video) {
    const qualityName = card.dataset.quality || detectQualityLabel(card.dataset.video);
    currentQualityMap = {
      [qualityName]: card.dataset.video,
    };

    qualitySelect.innerHTML = Object.keys(currentQualityMap)
      .map((quality) => `<option value="${quality}">${quality}</option>`)
      .join("");
    renderQualityControls();
    setActiveQuality(qualityName);
    setPlayerStatus("Загружаем видео в хорошем доступном качестве...");
    updatePlayerButtonsState(true);

    modalVideoSource.src = encodeURI(resolveVideoPath(card.dataset.video));
    modalVideo.classList.remove("hidden");
    modalPlayer.classList.add("has-video");
    modalVideo.load();
    modalVideo.addEventListener(
      "loadedmetadata",
      () => {
        syncQualityWithMetadata();
        updatePlayerStatusFromMetadata();
        tryAutoplayVideo();
      },
      { once: true }
    );
  } else {
    modalVideo.pause();
    modalVideo.removeAttribute("src");
    modalVideoSource.src = "";
    modalVideo.classList.add("hidden");
    modalPlayer.classList.remove("has-video");
    qualitySelect.innerHTML = '<option value="">Видео недоступно</option>';
    qualityButtons.innerHTML = "";
    currentQualityMap = {};
    setPlayerStatus("Для этой карточки видеофайл пока не добавлен.");
    updatePlayerButtonsState(false);
  }

  watchModal.classList.remove("hidden");
  watchModal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
}

function closeWatchModal() {
  modalVideo.pause();

  if (document.pictureInPictureElement === modalVideo && document.exitPictureInPicture) {
    document.exitPictureInPicture().catch(() => {});
  }

  watchModal.classList.add("hidden");
  watchModal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
}

function downloadMovieCard(card) {
  const content = [
    `Название: ${card.dataset.title}`,
    `Категория: ${card.dataset.category}`,
    `Жанры: ${card.dataset.genre}`,
    `Год: ${card.dataset.year}`,
    `Длительность: ${card.dataset.duration}`,
    `Рейтинг: ${card.dataset.rating}`,
    "",
    `Описание: ${card.dataset.description}`,
  ].join("\n");

  downloadTextFile(`${card.dataset.title}.txt`, content);
}

function getBotReply(text) {
  const message = text.toLowerCase();

  if (message.includes("аниме")) {
    return "Сейчас в списке аниме есть 'Унесённые призраками' и 'Твоё имя'.";
  }

  if (message.includes("мульт") || message.includes("дет")) {
    return "В разделе мультфильмов уже есть 'Холодное сердце' и 'Тайна Коко'.";
  }

  if (message.includes("кино") || message.includes("фильм")) {
    return "В разделе фильмов уже есть 'Человек-паук', 'Побег из Шоушенка', 'Аватар' и 'Аватар: Путь воды'.";
  }

  if (message.includes("фантаст")) {
    return "Для фантастики подойдут 'Аватар', 'Аватар: Путь воды', 'Человек-паук' и 'Твоё имя'.";
  }

  if (message.includes("семейн") || message.includes("семья")) {
    return "Для семейного просмотра лучше всего подойдут 'Тайна Коко', 'Холодное сердце' и 'Унесённые призраками'.";
  }

  return "Теперь каталог разделён отдельно на фильмы, аниме и мультфильмы. Можешь искать по названию или категории.";
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  filterCards(searchInput.value);
});

searchInput.addEventListener("input", (event) => {
  filterCards(event.target.value);
});

cards.forEach((card) => {
  const watchButton = card.querySelector(".watch-button");
  const downloadButton = card.querySelector(".download-button");

  watchButton.addEventListener("click", () => {
    openWatchModal(card);
  });

  downloadButton.addEventListener("click", () => {
    downloadMovieCard(card);
  });
});

initCollectionCards();
updateWatchButtonsState();
updatePlayerButtonsState(false);
updatePictureInPictureButtonLabel();
filterCards("");

downloadCatalogButton.addEventListener("click", () => {
  const content = cards
    .map((card) => {
      return [
        `${card.dataset.title} (${card.dataset.category})`,
        `Жанры: ${card.dataset.genre}`,
        `Год: ${card.dataset.year}`,
        `Длительность: ${card.dataset.duration}`,
        `Рейтинг: ${card.dataset.rating}`,
        `Описание: ${card.dataset.description}`,
      ].join("\n");
    })
    .join("\n\n--------------------\n\n");

  downloadTextFile("Каталог-КиноМир.txt", content);
});

closeModalButton.addEventListener("click", closeWatchModal);
modalOverlay.addEventListener("click", closeWatchModal);

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !watchModal.classList.contains("hidden")) {
    closeWatchModal();
  }
});

qualitySelect.addEventListener("change", () => {
  switchVideoQuality(qualitySelect.value);
});

qualityButtons.addEventListener("click", (event) => {
  const target = event.target.closest(".quality-button");

  if (!target) {
    return;
  }

  switchVideoQuality(target.dataset.quality);
});

fullscreenButton.addEventListener("click", openFullscreenPlayer);
pipButton.addEventListener("click", togglePictureInPictureMode);

modalVideo.addEventListener("loadedmetadata", () => {
  syncQualityWithMetadata();
  updatePlayerStatusFromMetadata();
});

modalVideo.addEventListener("enterpictureinpicture", updatePictureInPictureButtonLabel);
modalVideo.addEventListener("leavepictureinpicture", updatePictureInPictureButtonLabel);

updateChatStatus();
renderPendingMessages();
flushPendingMessages();

window.addEventListener("online", () => {
  updateChatStatus();
  flushPendingMessages();
});

window.addEventListener("offline", updateChatStatus);

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const text = chatInput.value.trim();

  if (!text) {
    return;
  }

  if (!navigator.onLine) {
    const pendingMessages = getPendingMessages();
    const messageId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    pendingMessages.push({
      id: messageId,
      text,
    });
    savePendingMessages(pendingMessages);
    addMessage(`${text} (ожидает отправки)`, "user", {
      pending: true,
      id: messageId,
    });
    chatInput.value = "";
    return;
  }

  addMessage(text, "user");
  chatInput.value = "";

  window.setTimeout(() => {
    addMessage(getBotReply(text), "assistant");
  }, 450);
});
