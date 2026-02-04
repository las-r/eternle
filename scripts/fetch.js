// fetch.js v1.0
// made by las-r on github

// fetching functions
async function fetchPageHTML(page) {
    const url = wikiUrl +
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
        const url = wikiUrl +
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
    const categories = ["Towers", "Steeples", "Citadels", "Mini_Towers", "Obelisks", "Tower_Rushes", "Tower", "Steeple", "Citadel", "Mini_Tower", "Obelisk", "Tower_Rush", "ANaGCs", "CTaSs", "DNaCs", "Fake_NEATs", "NBiPs", "NEaNEaTs", "NEATs", "NEAT_Rushes", "OoaOs", "PAPs"];
    const out = new Set();
    for (const cat of categories) {
        setStatus(`Fetching Category:${cat}...`);
        const members = await fetchCategoryMembers(cat);

        for (const name of members) {
            const lower = name.toLowerCase();
            if (lower.includes("category:") || lower.includes("(disambiguation)")) continue;
            if (categories.map(v => typeof v === "string" && v.endsWith("s") ? v.slice(0, -1) : v).includes(name)) continue;

            out.add(name);
        }
    }
    const finalArray = [...out];
    setStatus(`Fetched ${finalArray.length} towers.`);
    return finalArray;
}

// parsing functions
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
    const html = await fetchPageHTML(name.replace(" ", "_"));
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pageText = (doc.body.textContent || "").toLowerCase();;
    const isDeconfirmed = pageText.includes("contains deconfirmed content") || pageText.includes("contains removed content") || pageText.includes("contains scrapped content");
    const isMonthly = pageText.includes("part of a monthly challenge");
    const isUnreleased = pageText.includes("contains unreleased content");
    const isEvent = pageText.includes("part of an event");
    const isNotAllowed = (
        pageText.includes("Summit of Memories") && pageText.includes("(Classic)") && pageText.includes("Previously Located In")
    )
    const isCanon = !(isDeconfirmed || isEvent || isMonthly || isNotAllowed || isUnreleased)
    const data = {
        name,
        isDeconfirmed,
        isMonthly,
        isUnreleased,
        isEvent,
        isNotAllowed,
        isCanon,
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
