// eternle script v0.2
// by las-r on github

// helper functions
function getAcronym(n) {
    let words = n.split(" ");
    let out = "";
    for (let i = 0; i < words.length; i++) {
        out += words[i][0];
    }
    return out;
}
function setStatus(msg) {
    document.getElementById("status").textContent = msg;
}
function setRemaining(msg) {
    document.getElementById("remaining").textContent = msg;
}
function endGame() {
    gameOver = true;
    if (typ.textContent == "???") typ.innerHTML = `<i>${tower.type}</i>`; 
    else typ.textContent = tower.type;
    if (dif.textContent == "???") dif.innerHTML = `<i>${tower.difficulty}</i>`; 
    else dif.textContent = tower.difficulty;
    if (loc.textContent == "???") loc.innerHTML = `<i>${tower.location}</i>`; 
    else loc.textContent = tower.location;
    if (cre.textContent == "???") cre.innerHTML = `<i>${tower.creators}</i>`; 
    else cre.textContent = tower.creators;
}
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
    return json.parse.text["*"];
}

// tower functions
async function getTowerNames(noncanon = false) {
    const html = await fetchPageHTML("Tower");
    const doc = new DOMParser().parseFromString(html, "text/html");
    const isItalic = el =>
        !el
            ? false
            : ((el.getAttribute("style") || "").includes("italic") ||
               isItalic(el.parentElement));
    const container = [...doc.querySelectorAll("div[style]")].find(d =>
        d.style.cssText.includes("border: 3px solid") &&
        d.style.cssText.includes("theme-accent-color")
    );
    if (!container) return [];
    const out = new Set();
    for (const c of container.children) {
        if (!noncanon && c.textContent.trim() === "Other") break;
        c.querySelectorAll("a").forEach(a => {
            const n = a.textContent.trim();
            const l = n.toLowerCase();
            if (
                n &&
                !isItalic(a) &&
                n.length >= 13 &&
                !n.includes("(") &&
                (
                    l.includes("tower") ||
                    l.includes("steeple") ||
                    l.includes("citadel")
                )
            ) {
                out.add(n);
            }
        });
    }
    return [...out];
}
async function getTowerData(name) {
    const html = await fetchPageHTML(name);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const data = {
        name,
        type: name.includes("Steeple")
            ? "Steeple"
            : name.includes("Citadel")
            ? "Citadel"
            : name.includes("Obelisk")
            ? "Obelisk"
            : name.includes("Tower Rush")
            ? "Tower Rush"
            : "Tower",
        difficulty: "Unknown",
        location: "Unknown",
        creators: "Unknown"
    };

    // helper: find value after a label
    function getField(label) {
        const labelEl = [...doc.querySelectorAll("h3, h4, b")]
            .find(e => e.textContent.trim().toLowerCase() === label.toLowerCase());
        if (!labelEl) return null;
        let el = labelEl.nextElementSibling;
        while (el && !el.textContent.trim()) {
            el = el.nextElementSibling;
        }
        return el?.textContent;
    }

    // get data
    const locRaw = getField("Located In");
    if (locRaw) {
        data.location = locRaw.replace(/\s+/g, " ").trim();
    }
    const diffRaw = getField("Difficulty");
    if (diffRaw) {
        data.difficulty = diffRaw.trim().split(" ").slice(0, 3).join(" ");
    }
    const creatorRaw = getField("Creator(s)");
    if (creatorRaw) {
        data.creators = creatorRaw.trim();
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
const guesses = 5
let towers = [];
let towerAcronyms = [];

// variables
let guessesLeft = guesses;
let gameOver = false;
let tower;
let revealIndex = 0;

// init
async function init() {
    setStatus("Loading towers…");
    towers = await getTowerNames();
    const chosen = towers[Math.floor(Math.random() * towers.length)];
    tower = await getTowerData(chosen);
    for (let i = 0; i < towers.length; i++) {
        towerAcronyms.push(getAcronym(towers[i]))
    }
    typ.textContent = "???";
    dif.textContent = "???";
    loc.textContent = "???";
    cre.textContent = "???";
    setRemaining(`Guesses left: ${guessesLeft}`);
    setStatus("");
}
init();

// guess handling
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

    let towersLower = towers.map(t => t.toLowerCase());
    let towerAcronymsLower = towerAcronyms.map(a => a.toLowerCase());
    if (!towersLower.includes(guess) && !towerAcronymsLower.includes(guess)) {
        setStatus("Enter a valid tower.");
        return;
    }

    if (guess === tower.name.toLowerCase() || guess == getAcronym(tower.name.toLowerCase())) {
        setStatus(`Correct! (${guesses - guessesLeft} guesses)`);
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

    setStatus("Wrong guess.");
    setRemaining(`Guesses left: ${guessesLeft}`);
}

// keypress event
document.onkeypress = function(e) {
    e = e || window.event;
    if (e.key == "Enter") {
        submitGuess();
    }
}
