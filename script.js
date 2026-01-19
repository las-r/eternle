// eternle script v0.3.1
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
async function getTowerNames(noncanon = false) {
    const html = await fetchPageHTML("Tower");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const out = new Set();
    const links = doc.querySelectorAll("a");
    for (const a of links) {
        const name = a.textContent.trim();
        const lower = name.toLowerCase();
        if (
            name.length >= 13 &&
            !name.includes("(") &&
            (   
                lower.includes("tower") ||
                lower.startsWith("tower of ") ||
                lower.startsWith("steeple of ") ||
                lower.startsWith("citadel of ") ||
                lower.startsWith("obelisk of ")
            )
        ) {out.add(name);}
    }
    return [...out];
}
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

// data functions
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

    const data = {
        name,
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
    if (locEl) {
        data.location = locEl.textContent.replace(/\s+/g, " ").trim();
    }

    const diffEl = getInfoboxField(doc, "Difficulty");
    if (diffEl) {
        data.difficulty = diffEl.textContent.trim();
    }

    const creatorEl = getInfoboxField(doc, "Creator(s)");
    if (creatorEl) {
        data.creators = cleanCreators(creatorEl);
    }

    return data;
}

// constants
const typ = document.getElementById("towertype");
const loc = document.getElementById("location");
const dif = document.getElementById("difficulty");
const cre = document.getElementById("creators");
const inp = document.getElementById("guess");

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
async function init() {
    setStatus("Loading towers…");

    towers = await getTowerNames();
    if (!towers.length) {
        setStatus("Failed to load towers.");
        return;
    }

    const chosen = towers[Math.floor(Math.random() * towers.length)];
    tower = await getTowerData(chosen);

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

    const guess = inp.value.trim().toLowerCase();
    inp.value = "";

    const towersLower = towers.map(t => t.toLowerCase());

    if (!towersLower.includes(guess) && !towerAcronyms.includes(guess) && !document.getElementById("status").textContent == msg) {
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
