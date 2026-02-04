// script.js v1.0
// made by las-r on github

// constants
const typ = document.getElementById("towertype");
const loc = document.getElementById("location");
const dif = document.getElementById("difficulty");
const cre = document.getElementById("creators");
const inp = document.getElementById("guess");
const revealOrder = ["type", "location", "difficulty", "creators"];
const guesses = 5;
let wikiUrl = "https://jtoh.fandom.com/api.php?";

// game state
let towers = [];
let towerAcronyms = [];
let guessesLeft = guesses;
let gameOver = false;
let tower;
let revealIndex = 0;

// helper functions
function getAcronym(n) { 
    const parts = n.split(/\s*(?=\()/);  
    const process = (str) => { 
        return str 
            .replace(/[()]/g, "") 
            .split(/[\s-]+/) 
            .filter(word => /[a-z0-9]/i.test(word)) 
            .map(word => word[0]) 
            .join(""); 
    }; 
    const mainAcronym = process(parts[0]); 
    if (parts[1]) { 
        const parenAcronym = process(parts[1]); 
        return `${mainAcronym}(${parenAcronym})`; 
    } 
    return mainAcronym; 
} 

function setStatus(msg) { 
    console.log(msg) 
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
        som: document.getElementById("som").checked, 
        eventx: document.getElementById("event").checked, 
        unreleased: document.getElementById("unreleased").checked, 
        removed: document.getElementById("removed").checked, 
        canon: document.getElementById("canon").checked,
        wiki: document.getElementById("wiki-input").value || "jtoh"
    }; 
    localStorage.setItem("eternle_settings", JSON.stringify(settings)); 
} 

function loadSettings() { 
    const saved = localStorage.getItem("eternle_settings"); 
    const wikiInp = document.getElementById("wiki-input");
    
    if (!saved) {
        wikiInp.value = "jtoh";
        updateWikiUrl("jtoh");
        return;
    }

    const settings = JSON.parse(saved);
    document.getElementById("monthly").checked = settings.monthly; 
    document.getElementById("pom").checked = settings.pom; 
    document.getElementById("event").checked = settings.eventx; 
    document.getElementById("unreleased").checked = settings.unreleased; 
    document.getElementById("removed").checked = settings.removed; 
    document.getElementById("canon").checked = settings.canon; 
    
    const wikiVal = settings.wiki || "jtoh";
    wikiInp.value = wikiVal;
    updateWikiUrl(wikiVal);
}

function updateWikiUrl(subdomain) {
    const cleanSubdomain = subdomain.trim().toLowerCase().replace(".fandom.com", "");
    wikiUrl = `https://${cleanSubdomain || 'jtoh'}.fandom.com/api.php?`;
}

// init 
async function init() {
    setStatus("Loading towers...");
    towers = await getTowerNames();
    if (!towers.length) {
        setStatus("Failed to load towers.");
        return;
    }
    setStatus("Choosing tower...");
    await chooseTower();
    setStatus("Tower chosen.");
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
        setRemaining(`Guesses left: ${guessesLeft}`);
        endGame();
        return;
    }
    setRemaining(`Guesses left: ${guessesLeft}`);
    setStatus("Wrong guess.");
}

// listeners
document.addEventListener("keypress", e => {
    if (e.key === "Enter") submitGuess();
});
const optionIds = ["monthly", "pom", "event", "unreleased", "removed", "canon", "som"];
optionIds.forEach(id => {
    document.getElementById(id).addEventListener("change", () => {
        saveSettings();
    });
});
document.getElementById("wiki-input").addEventListener("input", (e) => {
    updateWikiUrl(e.target.value);
    saveSettings();
});
