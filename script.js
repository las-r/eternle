// eternle script v0.4
// by las-r on github

// helper functions
function getAcronym(n) {
    return n
        .split(/[\s-]+/)
        .filter(Boolean)
        .map(w => w[0])
        .join("");
}
function setStatus(msg) {
    document.getElementById("status").textContent = msg;
}
function setRemaining(msg) {
    document.getElementById("remaining").textContent = msg;
}
function endGame() {
    gameOver = true;
    typ.innerHTML = typ.textContent === "???" ? `<i>${tower.type}</i>` : tower.type;
    dif.innerHTML = dif.textContent === "???" ? `<i>${tower.difficulty}</i>` : tower.difficulty;
    loc.innerHTML = loc.textContent === "???" ? `<i>${tower.location}</i>` : tower.location;
    cre.innerHTML = cre.textContent === "???" ? `<i>${tower.creators}</i>` : tower.creators;
}
function saveSettings() {
    const settings = {
        monthly: document.getElementById("monthly").checked,
        pom: document.getElementById("pom").checked,
        eventx: document.getElementById("event").checked,
        unreleased: document.getElementById("unreleased").checked,
        removed: document.getElementById("removed").checked
    };
    localStorage.setItem("eternle_settings", JSON.stringify(settings));
}
function loadSettings() {
    const saved = localStorage.getItem("eternle_settings");
    if (!saved) return;
    const settings = JSON.parse(saved);
    document.getElementById("monthly").checked = settings.monthly;
    document.getElementById("pom").checked = settings.pom;
    document.getElementById("event").checked = settings.eventx;
    document.getElementById("unreleased").checked = settings.unreleased;
    document.getElementById("removed").checked = settings.removed;
}

// info fetch functions
async function fetchPageHTML(page) {
    const url =
        "https://jtoh.fandom.com/api.php?" +
        new URLSearchParams({
            action: "parse",
            page,
            prop: "text",
            format: "json",
            origin: "*"
        });
    const json = await (await fetch(url)).json();
    return json.parse?.text?.["*"] ?? "";
}
async function fetchCategoryMembers(category) {
    const pages = [];
    let cmcontinue = "";
    do {
        const url = "https://jtoh.fandom.com/api.php?" + 
            new URLSearchParams({
                action: "query",
                list: "categorymembers",
                cmtitle: `Category:${category}`,
                cmlimit: "max",
                format: "json",
                origin: "*",
                cmcontinue: cmcontinue
            });

        const response = await fetch(url);
        const data = await response.json();
        
        if (data.query && data.query.categorymembers) {
            data.query.categorymembers.forEach(member => {
                if (member.ns === 0) {
                    pages.push(member.title);
                }
            });
        }
        cmcontinue = data.continue ? data.continue.cmcontinue : "";
    } while (cmcontinue);
    return pages;
}
async function getTowerNames() {
    const categories = ["Towers", "Steeples", "Citadels", "Mini_Towers", "Obelisks"];
    const out = new Set();
    for (const cat of categories) {
        setStatus(`Fetching ${cat.replaceAll("_", " ")}...`);
        const members = await fetchCategoryMembers(cat);
        
        for (const name of members) {
            const lower = name.toLowerCase();
            if (lower.includes("category:") || lower.includes("(disambiguation)")) continue;
            if (["Tower", "Steeple", "Citadel", "Mini Tower", "Tower Rush", "Tower Whitelist"].includes(name)) continue;

            out.add(name);
        }
    }
    const finalArray = [...out];
    console.log(`Loaded ${finalArray.length} towers from categories.`);
    console.log()
    setStatus("Done fetching!");
    return finalArray;
}

// data functions
function getInfoboxField(doc, label) {
    const items = doc.querySelectorAll(".pi-item.pi-data");

    for (const item of items) {
        const lab = item.querySelector(".pi-data-label");
        const val = item.querySelector(".pi-data-value");

        if (!lab || !val) continue;

        if (lab.textContent.trim().toLowerCase() === label.toLowerCase()) {
            return val;
        }
    }
    return null;
}
function cleanCreators(container) {
    const liNames = [...container.querySelectorAll("li")]
        .map(li => li.textContent.trim())
        .filter(Boolean);
    if (liNames.length > 0) return liNames.join(", ");
    const linkNames = [...container.querySelectorAll("a")]
        .map(a => a.textContent.trim())
        .filter(Boolean);
    if (linkNames.length > 0) return linkNames.join(", ");
    const spanNames = [...container.querySelectorAll("span#VerifiedBuilder")]
        .map(s => s.textContent.trim())
        .filter(Boolean);
    if (spanNames.length > 0) return spanNames.join(", ");
    return container.textContent
        .replace(/\[[^\]]*\]/g, "")
        .replace(/\s+/g, " ")
        .trim();
}
async function getTowerData(name) {
    const html = await fetchPageHTML(name);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pageText = (doc.body.textContent || "").toLowerCase();;
    const isDeconfirmed = pageText.includes("contains deconfirmed content");
    const isMonthly = pageText.includes("part of a monthly challenge");
    const isUnreleased = pageText.includes("contains unreleased content");
    const isEvent = pageText.includes("part of an event");
    const isNotAllowed = (
        pageText.includes("Summit of Memories") && pageText.includes("(Classic)") && pageText.includes("Previously Located In")
    )
    const data = {
        name,
        isDeconfirmed,
        isMonthly,
        isUnreleased,
        isEvent,
        isNotAllowed,
        type:
            name.includes("Steeple of ") ? "Steeple" :
            name.includes("Citadel of ") ? "Citadel" :
            name.includes("Obelisk of ") ? "Obelisk" :
            name.includes(" Tower Rush") ? "Tower Rush" :
            name.startsWith("Tower of ") ? "Tower" :
            "Mini Tower",
        difficulty: "Unknown",
        location: "Unknown",
        creators: "Unknown"
    };
    const locEl = getInfoboxField(doc, "Located In");
    if (locEl) data.location = locEl.textContent.replace(/\s+/g, " ").trim();
    const diffEl = getInfoboxField(doc, "Difficulty");
    if (diffEl) data.difficulty = diffEl.textContent.trim();
    const creatorEl = getInfoboxField(doc, "Creator(s)");
    if (creatorEl) data.creators = cleanCreators(creatorEl);
    return data;
}

// load settings
loadSettings();

// constants
const typ = document.getElementById("towertype");
const loc = document.getElementById("location");
const dif = document.getElementById("difficulty");
const cre = document.getElementById("creators");
const inp = document.getElementById("guess");

const monthly = document.getElementById("monthly").checked;
const pom = document.getElementById("pom").checked;
const eventx = document.getElementById("event").checked;
const unreleased = document.getElementById("unreleased").checked;
const removed = document.getElementById("removed").checked;

const revealOrder = ["type", "location", "difficulty", "creators"];
const guesses = 5;

// game state
let towers = [];
let towerAcronyms = [];
let guessesLeft = guesses;
let gameOver = false;
let tower;
let revealIndex = 0;

// init
async function chooseTower() {
    tower = await getTowerData(towers[Math.floor(Math.random() * towers.length)]);
    let location = tower.location ? tower.location.toLowerCase() : "";

    if (!tower.isNotAllowed) {
        if ((location.includes("time-lost") || tower.isMonthly) && !monthly) return await chooseTower();
        if (location == "pit of misery" && !pom) return await chooseTower();
        if (tower.isEvent && !eventx) return await chooseTower();
        if (tower.isUnreleased && !unreleased) return await chooseTower();
        if (tower.isDeconfirmed && !removed) return await chooseTower();
    }
    else return await chooseTower();

    return tower;
}
async function init() {
    setStatus("Loading towers…");
    towers = await getTowerNames();
    if (!towers.length) {
        setStatus("Failed to load towers.");
        return;
    }
    setStatus("Choosing tower...");
    await chooseTower();
    setStatus("Tower chosen!");
    towerAcronyms = towers.map(t => getAcronym(t).toLowerCase());
    typ.textContent = "???";
    dif.textContent = "???";
    loc.textContent = "???";
    cre.textContent = "???";
    guessesLeft = guesses;
    revealIndex = 0;
    gameOver = false;
    setRemaining(`Guesses left: ${guessesLeft}`);
    setStatus("");
    inp.focus();
}
init();

// game
function revealNext() {
    const key = revealOrder[revealIndex++];
    if (!key) return;

    if (key === "type") typ.textContent = tower.type;
    if (key === "difficulty") dif.textContent = tower.difficulty;
    if (key === "location") loc.textContent = tower.location;
    if (key === "creators") cre.textContent = tower.creators;
}
function submitGuess() {
    if (gameOver) return;
    let guess = inp.value.trim().toLowerCase();
    guess = guess.split("(")[0].trim()
    inp.value = "";
    const towersLower = towers.map(t => t.toLowerCase());
    if (!towersLower.includes(guess) && !towerAcronyms.includes(guess)) {
        setStatus("Enter a valid tower.");
        return;
    }
    if (
        guess === tower.name.toLowerCase() ||
        guess === getAcronym(tower.name).toLowerCase()
    ) {
        setStatus(`Correct! (${guesses - guessesLeft + 1} guesses)`);
        endGame();
        return;
    }
    guessesLeft--;
    revealNext();
    if (guessesLeft <= 0) {
        setStatus(`Out of guesses! It was ${tower.name} (${getAcronym(tower.name)}).`);
        endGame();
        return;
    }
    setRemaining(`Guesses left: ${guessesLeft}`);
    setStatus("Wrong guess.");
}

// input
document.addEventListener("keypress", e => {
    if (e.key === "Enter") submitGuess();
});
const optionIds = ["monthly", "pom", "event", "unreleased", "removed"];
optionIds.forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
        saveSettings();
        setStatus("Settings saved! Refresh to apply to new game.");
    });
});
