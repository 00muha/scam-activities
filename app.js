const STORAGE_KEY = "sauti-community-demo-v1";

const seedPosts = [
  {
    id: "signal-001", title: "Hospital Admission Deposit Pressure", category: "impersonation", categoryLabel: "Fake hospital payment", lookupNumber: "254700000001",
    author: "pixel_scout", initials: "P", avatarColor: "#d8ff3e", age: "8 min ago", createdAt: Date.now() - 8 * 60_000,
    story: "Fictional caller claims a relative is being admitted and demands an immediate deposit to a personal number. The caller refuses to let the family verify through the hospital's published switchboard. Call the hospital directly using a number you find independently.",
    pattern: "Emergency pressure + unverified payment", reports: 340, up: 128, down: 7,
    comments: [
      { author: "mossybyte", text: "Pause and call the hospital using its official published number." },
      { author: "nina.noted", text: "Ask a trusted family member to verify before sending any money." }
    ]
  },
  {
    id: "signal-002", title: "Fake Safaricom Reversal Call", category: "impersonation", categoryLabel: "Safaricom/M-Pesa impersonation", lookupNumber: "254700000002",
    author: "orbit_owl", initials: "O", avatarColor: "#a68bff", age: "24 min ago", createdAt: Date.now() - 24 * 60_000,
    story: "Fictional caller claims to be customer care and says an M-Pesa transaction can only be reversed if you share an OTP or enter a USSD code they provide. Never share an OTP or follow an unsolicited code prompt; contact Safaricom through its official channels.",
    pattern: "Brand impersonation + OTP request", reports: 287, up: 103, down: 4,
    comments: [
      { author: "coffeeandcodes", text: "Customer care should never ask you to disclose an OTP." },
      { author: "byte-sized", text: "Use the official app or published customer-care contact." }
    ]
  },
  {
    id: "signal-003", title: "Bank Account Freeze Warning Call", category: "phishing", categoryLabel: "Bank impersonation", lookupNumber: "254700000003",
    author: "milo.exe", initials: "M", avatarColor: "#ffb49f", age: "52 min ago", createdAt: Date.now() - 52 * 60_000,
    story: "A fictional caller says a bank account is compromised and asks the customer to move funds to a 'safe account' or read out a one-time code. Hang up and call the bank using the number on your card or official app.",
    pattern: "Fear + fake bank security + code request", reports: 211, up: 89, down: 6,
    comments: [{ author: "softreset", text: "A real bank should not ask you to move money to a stranger's safe account." }]
  },
  {
    id: "signal-004", title: "Fake Health-Cover Registration Fee", category: "phishing", categoryLabel: "Health-cover impersonation", lookupNumber: "254700000004",
    author: "fern_finds", initials: "F", avatarColor: "#66e4e6", age: "1 hr ago", createdAt: Date.now() - 60 * 60_000,
    story: "A fictional caller claims to help with health-cover registration and demands an urgent processing fee through a personal number. Verify any registration or payment request through the official government service before paying.",
    pattern: "Public-service impersonation + upfront fee", reports: 186, up: 76, down: 3,
    comments: [
      { author: "mossybyte", text: "Always confirm a fee on the service's official website." },
      { author: "safeandsound", text: "Don't rely on a caller's link to verify the caller." }
    ]
  },
  {
    id: "signal-005", title: "KRA Refund Link with a Catch", category: "phishing", categoryLabel: "Tax-service impersonation", lookupNumber: "254700000005",
    author: "sunny.sideup", initials: "S", avatarColor: "#f49bd4", age: "2 hrs ago", createdAt: Date.now() - 2 * 60 * 60_000,
    story: "A fictional text promises a tax refund and links to a lookalike form asking for bank and identity details. Check tax information by navigating to the official KRA service yourself, not through an unexpected message link.",
    pattern: "Refund bait + lookalike form", reports: 163, up: 64, down: 5,
    comments: [{ author: "orbit_owl", text: "Unexpected refund links are a good reason to verify independently." }]
  },
  {
    id: "signal-006", title: "Job Interview Processing Fee", category: "marketplace", categoryLabel: "Fake job offer", lookupNumber: "254700000006",
    author: "maplebyte", initials: "M", avatarColor: "#ffd467", age: "3 hrs ago", createdAt: Date.now() - 3 * 60 * 60_000,
    story: "A fictional recruiter promises a job after an interview but asks for a processing or uniform fee sent to a personal number. Verify the employer through its official contacts and be cautious of paying to secure a job.",
    pattern: "Job promise + upfront fee", reports: 142, up: 56, down: 2,
    comments: [{ author: "fern_finds", text: "Check the employer's official careers page and contact details." }]
  },
  {
    id: "signal-007", title: "The guaranteed 20% weekly return", category: "investment", categoryLabel: "Investment promise", lookupNumber: "254700000007",
    author: "quietsignal", initials: "Q", avatarColor: "#9ee3a3", age: "5 hrs ago", createdAt: Date.now() - 5 * 60 * 60_000,
    story: "A fictional investing group promises a fixed weekly return with no risk, but says I need to recruit two friends before I can withdraw. Guaranteed gains and recruitment pressure are not an investing plan.",
    pattern: "Guaranteed returns + recruit-to-withdraw", reports: 125, up: 49, down: 8,
    comments: [{ author: "nina.noted", text: "No investment can honestly promise a risk-free weekly return." }]
  },
  {
    id: "signal-008", title: "M-Pesa PIN Reset OTP Request", category: "impersonation", categoryLabel: "Safaricom/M-Pesa impersonation", lookupNumber: "254700000008",
    author: "tessellate", initials: "T", avatarColor: "#ff9b7c", age: "Yesterday", createdAt: Date.now() - 21 * 60 * 60_000,
    story: "A fictional caller claims your M-Pesa PIN needs resetting and asks you to read out the SMS code that just arrived. Never share an OTP or PIN, even if the caller knows your name or recent transaction details.",
    pattern: "PIN reset pretext + OTP theft", reports: 119, up: 44, down: 1,
    comments: [{ author: "milo.exe", text: "An OTP is a key. Keep it to yourself." }]
  },
  {
    id: "signal-009", title: "Loan Approval Fee Before Disbursement", category: "investment", categoryLabel: "Fake loan offer", lookupNumber: "254700000009",
    author: "circuit.bloom", initials: "C", avatarColor: "#9fd6ff", age: "Yesterday", createdAt: Date.now() - 25 * 60 * 60_000,
    story: "A fictional lender guarantees quick approval but first requests a release fee to a personal number. Review the lender and terms using official, independent sources before sending any fee or identity documents.",
    pattern: "Guaranteed loan + upfront release fee", reports: 98, up: 39, down: 3,
    comments: [{ author: "pixel_scout", text: "A promised loan is not proof that the lender is legitimate." }]
  },
  {
    id: "signal-010", title: "WhatsApp Verification Code Request", category: "impersonation", categoryLabel: "Account takeover attempt", lookupNumber: "254700000010",
    author: "bluejay.codes", initials: "B", avatarColor: "#c5b7ff", age: "2 days ago", createdAt: Date.now() - 48 * 60 * 60_000,
    story: "A fictional contact says a verification code was sent to your phone by mistake and asks you to forward it. That code can let them take over your account. Never share login or verification codes.",
    pattern: "Trusted-contact pretext + verification-code theft", reports: 76, up: 31, down: 2,
    comments: [{ author: "safeandsound", text: "Call your contact on their saved number before believing an unusual request." }]
  }
];

const seedRoasts = [
  { author: "reply_guy_404", text: "That 'safe account' sounds safest for the person who owns it. Which isn't you.", target: "fake bank security call", laughs: 84 },
  { author: "lilac_logic", text: "A guaranteed return? So is my guarantee that this ends in a group chat warning.", target: "magic investment club", laughs: 62 },
  { author: "cache_me_outside", text: "Your 'urgent' email has been waiting in my inbox longer than your domain has existed.", target: "fake account alert", laughs: 51 },
  { author: "punny_business", text: "Customer care asked for my OTP? Great, and next the smoke alarm will ask for my house keys.", target: "fake M-Pesa support call", laughs: 47 }
];

const seedHall = [
  { name: "Hospital Deposit Pressure", type: "Fake emergency payment", icon: "🏥", color: "#d8ff3e", reports: 340 },
  { name: "M-Pesa Reversal Call", type: "OTP request", icon: "📱", color: "#a68bff", reports: 287 },
  { name: "Bank Freeze Warning", type: "Safe-account transfer", icon: "🏦", color: "#ffb49f", reports: 211 },
  { name: "Health-Cover Fee", type: "Registration impersonation", icon: "🩺", color: "#66e4e6", reports: 186 },
  { name: "KRA Refund Link", type: "Lookalike form", icon: "🧾", color: "#f49bd4", reports: 163 }
];

const categoryLabels = {
  phishing: "Phishing & fake alerts",
  marketplace: "Marketplace bait",
  impersonation: "Impersonation",
  investment: "Investment promise",
  other: "Other tactic"
};

const avatarColors = ["#d8ff3e", "#a68bff", "#66e4e6", "#ffb49f", "#f49bd4", "#9ee3a3", "#ffd467"];
const state = loadState();
let activeCategory = "all";
let activeComposerType = "report";
let activeRoastIndex = 0;
let toastTimer;

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    if (saved && Array.isArray(saved.posts)) {
      return {
        posts: [...saved.posts.filter((post) => !seedPosts.some((seedPost) => seedPost.id === post.id)), ...seedPosts.map((post) => ({ ...post, comments: [...post.comments] }))],
        votes: saved.votes && typeof saved.votes === "object" ? saved.votes : {}
      };
    }
  } catch (error) {
    console.warn("SAUTI demo state could not be restored.", error);
  }
  return { posts: seedPosts.map((post) => ({ ...post, comments: [...post.comments] })), votes: {} };
}

function saveState() {
  try {
    const savedPosts = state.posts.map(({ lookupNumber, ...post }) => post);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ posts: savedPosts, votes: state.votes }));
  } catch (error) {
    showToast("This browser could not save the demo state.");
  }
}

function makeElement(tag, className, text) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text !== undefined) element.textContent = text;
  return element;
}

function getVisiblePosts() {
  const searchTerm = document.querySelector("#search-input").value.trim().toLowerCase();
  const sortBy = document.querySelector("#sort-select").value;
  const visible = state.posts.filter((post) => {
    const categoryMatch = activeCategory === "all" || post.category === activeCategory;
    const searchMatch = !searchTerm || [post.title, post.story, post.author, post.pattern, post.categoryLabel].some((value) => value.toLowerCase().includes(searchTerm));
    return categoryMatch && searchMatch;
  });
  visible.sort((first, second) => {
    if (sortBy === "newest") return second.createdAt - first.createdAt;
    if (sortBy === "reported") return second.reports - first.reports;
    return (second.up - second.down) - (first.up - first.down);
  });
  return visible;
}

function makeAvatar(author, initials, color) {
  return makeElement("span", "avatar", initials || author.slice(0, 1).toUpperCase());
}

function renderComment(comment) {
  const row = makeElement("div", "comment");
  const author = makeElement("strong", "", `@${comment.author}`);
  row.append(author, document.createTextNode(comment.text));
  return row;
}

function renderPost(post) {
  const card = makeElement("article", `report-card${post.isNew ? " is-demo-new" : ""}`);
  card.dataset.postId = post.id;

  const top = makeElement("div", "post-topline");
  const authorWrap = makeElement("div", "post-author");
  const avatar = makeAvatar(post.author, post.initials, post.avatarColor);
  avatar.style.backgroundColor = post.avatarColor || avatarColors[0];
  const authorMeta = makeElement("div", "author-meta");
  const authorName = makeElement("strong", "", `@${post.author}`);
  const age = makeElement("span", "", `· ${post.age || "just now"}`);
  authorMeta.append(authorName, age);
  const phoneDisplay = post.phoneDisplay || (post.lookupNumber ? maskKenyanNumber(post.lookupNumber) : "");
  if (phoneDisplay) authorMeta.append(makeElement("span", "post-phone", `· ${phoneDisplay}`));
  authorWrap.append(avatar, authorMeta);
  const category = makeElement("span", `post-tag t-${post.category}`, post.categoryLabel);
  top.append(authorWrap, category);
  if (post.source === "main-site") top.append(makeElement("span", "source-tag", "MAIN SITE DETECTED"));

  const title = makeElement("h3", "post-title", post.title);
  const story = makeElement("p", "post-copy", post.story);
  const pattern = makeElement("span", "post-pattern");
  pattern.append(makeElement("span", "", "✳"), document.createTextNode(post.pattern));

  const actions = makeElement("div", "post-actions");
  const voteGroup = makeElement("div", "vote-group");
  const selectedVote = state.votes[post.id];
  const upButton = makeVoteButton(post, "up", selectedVote === "up");
  const downButton = makeVoteButton(post, "down", selectedVote === "down");
  voteGroup.append(upButton, downButton);

  const commentsButton = makeElement("button", "post-action-button", ` ${post.comments.length} comments`);
  commentsButton.type = "button";
  commentsButton.dataset.action = "toggle-comments";
  commentsButton.prepend(makeElement("span", "", "▤"));
  const shareButton = makeElement("button", "post-action-button", " Share");
  shareButton.type = "button";
  shareButton.dataset.action = "share";
  shareButton.prepend(makeElement("span", "", "↗"));
  const reportCount = makeElement("span", "report-count");
  reportCount.append(document.createTextNode("community flags "), makeElement("b", "", String(post.reports)));
  actions.append(voteGroup, commentsButton, shareButton, reportCount);

  const commentsPanel = makeElement("div", "comments-panel");
  commentsPanel.hidden = true;
  commentsPanel.dataset.commentsPanel = "true";
  const commentList = makeElement("div", "comment-list");
  post.comments.forEach((comment) => commentList.append(renderComment(comment)));
  const commentForm = document.createElement("form");
  commentForm.className = "comment-form";
  commentForm.dataset.action = "add-comment";
  const commentInput = document.createElement("input");
  commentInput.type = "text";
  commentInput.maxLength = 180;
  commentInput.required = true;
  commentInput.placeholder = "Add a helpful thought...";
  commentInput.setAttribute("aria-label", "Add a comment");
  const commentSubmit = makeElement("button", "", "Reply");
  commentSubmit.type = "submit";
  commentForm.append(commentInput, commentSubmit);
  commentsPanel.append(commentList, commentForm);

  card.append(top, title, story, pattern, actions, commentsPanel);
  return card;
}

function makeVoteButton(post, direction, isSelected) {
  const button = makeElement("button", `vote-button${isSelected ? ` is-${direction}` : ""}`);
  button.type = "button";
  button.dataset.action = "vote";
  button.dataset.direction = direction;
  button.setAttribute("aria-label", `${direction === "up" ? "Upvote" : "Downvote"} ${post.title}`);
  button.setAttribute("aria-pressed", String(isSelected));
  button.append(makeElement("span", "", direction === "up" ? "↑" : "↓"), makeElement("span", "vote-count", String(post[direction])));
  return button;
}

function renderFeed() {
  const list = document.querySelector("#post-list");
  const visiblePosts = getVisiblePosts();
  list.replaceChildren(...visiblePosts.map(renderPost));
  document.querySelector("#empty-state").hidden = visiblePosts.length > 0;
  document.querySelector("#load-more").hidden = visiblePosts.length === 0;
  document.querySelector("#all-count").textContent = String(state.posts.length);
  const note = document.querySelector("#active-filter-note");
  note.textContent = activeCategory === "all" ? "" : `Showing ${categoryLabels[activeCategory] || activeCategory} signals · ${visiblePosts.length} found`;
  renderNumberDirectory();
}

function renderNumberDirectory() {
  const list = document.querySelector("#number-directory-list");
  if (!list) return;
  const numbers = new Map();
  state.posts.forEach((post) => {
    const display = post.phoneDisplay || (post.lookupNumber ? maskKenyanNumber(post.lookupNumber) : "");
    if (!display) return;
    const key = post.lookupNumber || `display:${display}`;
    const entry = numbers.get(key) || { number: post.lookupNumber || "", display, reports: 0, title: post.title };
    entry.reports += 1;
    numbers.set(key, entry);
  });
  const entries = [...numbers.values()].sort((first, second) => second.reports - first.reports || first.display.localeCompare(second.display));
  list.replaceChildren(...entries.map((entry) => {
    const item = makeElement("li", "number-directory-item");
    const button = makeElement("button", "number-directory-button");
    button.type = "button";
    button.dataset.lookupNumber = entry.number;
    button.dataset.lookupDisplay = entry.display;
    button.append(makeElement("span", "directory-number", entry.display), makeElement("span", "directory-summary", `${entry.reports} ${entry.reports === 1 ? "report" : "reports"} · ${entry.title}`));
    item.append(button);
    return item;
  }));
  document.querySelector("#directory-count").textContent = String(entries.length);
}

function renderHall() {
  const hall = document.querySelector("#leaderboard");
  hall.replaceChildren(...seedHall.map((entry, index) => {
    const item = makeElement("li");
    const rank = makeElement("span", "rank-number", String(index + 1).padStart(2, "0"));
    const icon = makeElement("span", "rank-icon", entry.icon);
    icon.style.backgroundColor = entry.color;
    const copy = makeElement("span", "rank-copy");
    copy.append(makeElement("b", "", entry.name), makeElement("small", "", entry.type));
    const reports = makeElement("span", "rank-reports", entry.reports.toLocaleString());
    item.append(rank, icon, copy, reports);
    return item;
  }));
}

function renderRoast() {
  const roast = seedRoasts[activeRoastIndex];
  const container = document.querySelector("#featured-roast");
  const quote = makeElement("span", "quote-mark", "“");
  const text = makeElement("p", "", roast.text);
  const byline = makeElement("div", "roast-byline");
  byline.append(makeElement("span", "roast-avatar", roast.author.slice(0, 1).toUpperCase()));
  const details = makeElement("span");
  details.append(makeElement("b", "", `@${roast.author}`), makeElement("small", "", `on the ${roast.target}`));
  byline.append(details, makeElement("span", "laugh-count", `😂 ${roast.laughs}`));
  container.replaceChildren(quote, text, byline);
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 2400);
}

function setCategory(category) {
  activeCategory = category;
  document.querySelectorAll(".feed-tab").forEach((tab) => {
    const isSelected = tab.dataset.filter === category;
    tab.classList.toggle("is-selected", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
  });
  renderFeed();
  document.querySelector("#feed").scrollIntoView({ behavior: "smooth", block: "start" });
}

function setComposerType(type) {
  activeComposerType = type;
  document.querySelectorAll(".type-option").forEach((button) => button.classList.toggle("is-active", button.dataset.composerType === type));
  const isRoast = type === "roast";
  document.querySelector("#composer-title").textContent = isRoast ? "Write a roast." : "Drop a signal.";
  document.querySelector("#title-label").firstChild.textContent = isRoast ? "Give your roast a short title" : "What should we call this tactic?";
  document.querySelector("#report-options").hidden = isRoast;
  document.querySelector("#phone-label").hidden = isRoast;
  document.querySelector("#report-phone").required = !isRoast;
  document.querySelector("#story-label").firstChild.textContent = isRoast ? "Roast the tactic, not a person" : "What was the tell?";
  document.querySelector("#report-story").placeholder = isRoast ? "Keep it witty, not personal. No real names or private details." : "Describe the pressure, promise, or red flag. Leave identifying details out.";
  document.querySelector("#submit-post").innerHTML = isRoast ? "Submit roast <span>↗</span>" : "Post signal <span>↗</span>";
}

function openComposer(type, phoneNumber = "") {
  setComposerType(type || "report");
  document.querySelector("#composer-form").reset();
  document.querySelector("#report-phone").value = phoneNumber ? formatKenyanLocal(phoneNumber) : "";
  document.querySelector("#character-count").textContent = "0 / 420";
  document.querySelector("#composer-error").textContent = "";
  document.querySelector("#composer-dialog").showModal();
  document.querySelector("#report-title").focus();
}

function handleVote(button) {
  const card = button.closest(".report-card");
  const post = state.posts.find((item) => item.id === card.dataset.postId);
  if (!post) return;
  const direction = button.dataset.direction;
  const previousVote = state.votes[post.id];
  if (previousVote) post[previousVote] = Math.max(0, post[previousVote] - 1);
  if (previousVote === direction) {
    delete state.votes[post.id];
  } else {
    state.votes[post.id] = direction;
    post[direction] += 1;
  }
  saveState();
  renderFeed();
}

function handleComment(form) {
  const card = form.closest(".report-card");
  const input = form.querySelector("input");
  const text = input.value.trim();
  if (!text) return;
  const post = state.posts.find((item) => item.id === card.dataset.postId);
  if (!post) return;
  post.comments.push({ author: "you_demo", text });
  saveState();
  renderFeed();
  const updatedCard = document.querySelector(`[data-post-id="${CSS.escape(post.id)}"]`);
  updatedCard.querySelector("[data-comments-panel]").hidden = false;
  updatedCard.querySelector(".comment-form input").focus();
  showToast("Your demo comment was added.");
}

function handlePostSubmit(event) {
  event.preventDefault();
  const title = document.querySelector("#report-title").value.trim();
  const story = document.querySelector("#report-story").value.trim();
  const error = document.querySelector("#composer-error");
  if (!title || !story) {
    error.textContent = "Add a short title and a description before posting.";
    return;
  }
  if (activeComposerType === "roast") {
    seedRoasts.unshift({ author: "you_demo", text: story, target: title, laughs: 0 });
    activeRoastIndex = 0;
    renderRoast();
    document.querySelector("#composer-dialog").close();
    showToast("Your roast is now in the demo corner.");
    return;
  }
  const phoneInput = document.querySelector("#report-phone").value;
  const normalizedPhone = normalizeKenyanNumber(phoneInput);
  if (!normalizedPhone) {
    error.textContent = "Enter a valid Kenyan mobile number, such as 0712 345 678 or +254 712 345 678.";
    document.querySelector("#report-phone").focus();
    return;
  }
  const category = document.querySelector("#report-category").value;
  const authorInput = document.querySelector("#report-author").value.trim().replace(/^@/, "");
  const author = authorInput || "you_demo";
  const newPost = {
    id: `community-${Date.now()}`, title, category, categoryLabel: categoryLabels[category], author,
    lookupNumber: normalizedPhone, phoneDisplay: maskKenyanNumber(normalizedPhone),
    initials: author.slice(0, 1).toUpperCase(), avatarColor: avatarColors[Math.floor(Math.random() * avatarColors.length)],
    age: "just now", createdAt: Date.now(), story, pattern: "Community-submitted tactic", reports: 1, up: 0, down: 0, comments: [], isNew: true
  };
  state.posts.unshift(newPost);
  saveState();
  document.querySelector("#composer-dialog").close();
  document.querySelector("#search-input").value = "";
  document.querySelector("#sort-select").value = "newest";
  activeCategory = "all";
  document.querySelectorAll(".feed-tab").forEach((tab) => {
    const isSelected = tab.dataset.filter === "all";
    tab.classList.toggle("is-selected", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
  });
  renderFeed();
  document.querySelector("#feed").scrollIntoView({ behavior: "smooth", block: "start" });
  showToast("Your demo signal is live in this browser session.");
}

function registerDetection(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new TypeError("SAUTI detection must be an object.");
  }

  const scamType = String(payload.scamType || payload.type || "Scam detected").trim().slice(0, 60);
  const sourceId = String(payload.id || payload.detectionId || "").trim().slice(0, 120);
  if (sourceId && state.posts.some((post) => post.sourceDetectionId === sourceId)) {
    return state.posts.find((post) => post.sourceDetectionId === sourceId).id;
  }

  const title = String(payload.title || `${scamType} alert`).trim().slice(0, 72);
  const story = String(payload.description || payload.summary || "Detected by the connected main website. Review the detection details there.").trim().slice(0, 420);
  const rawPhone = String(payload.phoneNumber || "").trim();
  const normalizedPhone = rawPhone ? normalizeKenyanNumber(rawPhone) : "";
  if (rawPhone && !normalizedPhone) {
    throw new TypeError("SAUTI accepts phone numbers only in Kenyan mobile formats: 07…, 01…, or +254….");
  }

  const id = `main-detection-${globalThis.crypto?.randomUUID?.() || Date.now()}`;
  const post = {
    id,
    sourceDetectionId: sourceId,
    source: "main-site",
    title,
    category: "other",
    categoryLabel: scamType || "Scam detected",
    author: "sauti_detector",
    initials: "S",
    avatarColor: "#66e4e6",
    lookupNumber: normalizedPhone || undefined,
    phoneDisplay: normalizedPhone ? maskKenyanNumber(normalizedPhone) : "",
    age: "just now",
    createdAt: Date.now(),
    story,
    pattern: `Detected by main website · ${scamType || "Scam detected"}`,
    reports: 0,
    up: 0,
    down: 0,
    comments: [],
    isNew: true
  };

  state.posts.unshift(post);
  saveState();
  document.querySelector("#search-input").value = "";
  document.querySelector("#sort-select").value = "newest";
  activeCategory = "all";
  document.querySelectorAll(".feed-tab").forEach((tab) => {
    const isSelected = tab.dataset.filter === "all";
    tab.classList.toggle("is-selected", isSelected);
    tab.setAttribute("aria-selected", String(isSelected));
  });
  renderFeed();
  showToast("Main-site detection added to the SAUTI feed.");
  return id;
}

window.SAUTI = Object.freeze({ registerDetection });
window.addEventListener("sauti:detection", (event) => {
  try {
    registerDetection(event.detail);
  } catch (error) {
    console.warn("SAUTI could not register the detection.", error);
    showToast(error.message);
  }
});

if ("BroadcastChannel" in window) {
  const detectionChannel = new BroadcastChannel("sauti-detections");
  detectionChannel.addEventListener("message", (event) => {
    try {
      registerDetection(event.data);
    } catch (error) {
      console.warn("SAUTI could not register the broadcast detection.", error);
      showToast(error.message);
    }
  });
}

function normalizeKenyanNumber(value) {
  const digits = value.replace(/\D/g, "");
  if (/^0[17]\d{8}$/.test(digits)) return `254${digits.slice(1)}`;
  if (/^[17]\d{8}$/.test(digits)) return `254${digits}`;
  if (/^254[17]\d{8}$/.test(digits)) return digits;
  return "";
}

function formatKenyanLocal(value) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return national.replace(/^(\d{3})(\d{3})(\d{0,3}).*/, (_, first, middle, last) => [first, middle, last].filter(Boolean).join(" "));
}

function maskKenyanNumber(value) {
  const digits = value.replace(/\D/g, "");
  const national = digits.startsWith("254") ? digits.slice(3) : digits.startsWith("0") ? digits.slice(1) : digits;
  return `+254 ${national.slice(0, 1)}•• ••• ${national.slice(-3)}`;
}

function renderNumberLookup(normalizedNumber, displayOverride = "") {
  const result = document.querySelector("#number-results");
  const matches = normalizedNumber
    ? state.posts.filter((post) => post.lookupNumber === normalizedNumber)
    : state.posts.filter((post) => post.phoneDisplay === displayOverride);
  const maskedDisplay = displayOverride || maskKenyanNumber(normalizedNumber);
  result.replaceChildren();
  result.hidden = false;

  const heading = makeElement("div", "number-result-heading");
  heading.append(document.createTextNode(matches.length ? "Community signals for" : "No demo signals for"), makeElement("span", "number-chip", maskedDisplay));
  result.append(heading, makeElement("p", "number-result-note", "Community submissions are unverified reports, not proof of wrongdoing. Do not confront or harass anyone based on a lookup."));

  if (matches.length) {
    const list = makeElement("div", "number-result-list");
    matches.forEach((post) => {
      const item = makeElement("article", "number-result-item");
      item.append(makeElement("strong", "", post.title), makeElement("p", "", post.story), makeElement("span", "", `${post.categoryLabel} · ${post.reports} community flags`));
      list.append(item);
    });
    result.append(list);
    return;
  }

  const actions = makeElement("div", "number-result-actions");
  const reportButton = makeElement("button", "button button-dark", "Share what happened");
  reportButton.type = "button";
  reportButton.dataset.reportNumber = normalizedNumber;
  const cancelButton = makeElement("button", "text-button", "Dismiss");
  cancelButton.type = "button";
  cancelButton.addEventListener("click", () => { result.hidden = true; });
  actions.append(reportButton, cancelButton);
  result.append(makeElement("p", "number-result-note", "No matching demo reports were found. You can add a community note; your full number stays in this tab and appears masked in the feed."), actions);
}

document.querySelector("#number-search-form").addEventListener("submit", (event) => {
  event.preventDefault();
  const input = document.querySelector("#number-search-input");
  const normalized = normalizeKenyanNumber(input.value);
  if (!normalized) {
    input.setCustomValidity("Use a Kenyan mobile number such as 0712 345 678 or +254 712 345 678.");
    input.reportValidity();
    return;
  }
  input.setCustomValidity("");
  renderNumberLookup(normalized);
});

document.querySelector("#number-search-input").addEventListener("input", (event) => event.target.setCustomValidity(""));
document.querySelector("#number-results").addEventListener("click", (event) => {
  const button = event.target.closest("[data-report-number]");
  if (button) openComposer("report", button.dataset.reportNumber);
});
document.querySelector("#number-directory-list").addEventListener("click", (event) => {
  const button = event.target.closest("[data-lookup-number]");
  if (!button) return;
  renderNumberLookup(button.dataset.lookupNumber, button.dataset.lookupDisplay);
  document.querySelector("#number-check").scrollIntoView({ behavior: "smooth", block: "center" });
});

document.querySelector("#post-list").addEventListener("click", (event) => {
  const button = event.target.closest("button");
  if (!button) return;
  if (button.dataset.action === "vote") handleVote(button);
  if (button.dataset.action === "toggle-comments") {
    const panel = button.closest(".report-card").querySelector("[data-comments-panel]");
    panel.hidden = !panel.hidden;
  }
  if (button.dataset.action === "share") {
    const post = state.posts.find((item) => item.id === button.closest(".report-card").dataset.postId);
    const url = `${location.href.split("#")[0]}#${post.id}`;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(url).then(() => showToast("Signal link copied.")).catch(() => showToast("Signal link ready: use your browser's address bar."));
    } else {
      showToast("Signal link ready: use your browser's address bar.");
    }
  }
});

document.querySelector("#post-list").addEventListener("submit", (event) => {
  if (event.target.matches(".comment-form")) {
    event.preventDefault();
    handleComment(event.target);
  }
});

document.querySelectorAll(".feed-tab").forEach((tab) => tab.addEventListener("click", () => setCategory(tab.dataset.filter)));
document.querySelectorAll("[data-trend]").forEach((button) => button.addEventListener("click", () => setCategory(button.dataset.trend)));
document.querySelector("#search-input").addEventListener("input", renderFeed);
document.querySelector("#sort-select").addEventListener("change", renderFeed);
document.querySelector("#clear-filters").addEventListener("click", () => {
  document.querySelector("#search-input").value = "";
  setCategory("all");
});
document.querySelectorAll("[data-open-composer]").forEach((button) => button.addEventListener("click", () => openComposer(button.dataset.openComposer)));
document.querySelectorAll("[data-composer-type]").forEach((button) => button.addEventListener("click", () => setComposerType(button.dataset.composerType)));
document.querySelector("#composer-form").addEventListener("submit", handlePostSubmit);
document.querySelector("#report-story").addEventListener("input", (event) => {
  document.querySelector("#character-count").textContent = `${event.target.value.length} / 420`;
});
document.querySelector(".dialog-close").addEventListener("click", () => document.querySelector("#composer-dialog").close());
document.querySelector("#composer-dialog").addEventListener("click", (event) => {
  if (event.target === event.currentTarget) event.currentTarget.close();
});
document.querySelector(".search-toggle").addEventListener("click", () => {
  document.querySelector("#feed").scrollIntoView({ behavior: "smooth" });
  setTimeout(() => document.querySelector("#search-input").focus(), 350);
});

document.querySelectorAll(".primary-nav [data-view]").forEach((link) => link.addEventListener("click", () => {
  document.querySelectorAll(".primary-nav .nav-link").forEach((item) => item.classList.toggle("is-active", item === link));
  document.querySelector(".primary-nav").classList.remove("is-open");
  document.querySelector(".mobile-menu").setAttribute("aria-expanded", "false");
}));
document.querySelector(".mobile-menu").addEventListener("click", (event) => {
  const menu = document.querySelector(".primary-nav");
  const isOpen = menu.classList.toggle("is-open");
  event.currentTarget.setAttribute("aria-expanded", String(isOpen));
});
document.querySelector("#next-roast").addEventListener("click", () => {
  activeRoastIndex = (activeRoastIndex + 1) % seedRoasts.length;
  renderRoast();
});

renderHall();
renderRoast();
renderFeed();