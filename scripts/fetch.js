// fetch.js v1.1

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

async function fetchCategoryMembers(category, namespace = 0) {
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
                if (member.ns === namespace) {
                    if (member.title.includes("User blog:")) return;
                    if (member.title.includes("Finale") && ["Realm", "Subrealm", "Realms", "Subrealms"].includes(category)) return;
                    
                    pages.push(member.title);
                }
            });
        }
        cmcontinue = data.continue ? data.continue.cmcontinue : "";
    } while (cmcontinue);
    return pages;
}

async function getTowerNames() {
    const metaSourceCategories = ["Tower_Type", "Tower_Types", "NEAT_Type", "NEAT_Types"];
    const uniqueTypes = new Set(["Tower", "Steeple", "Citadel", "Obelisk", "Mini_Tower"]);

    for (const metaCat of metaSourceCategories) {
        setStatus(`Fetching types from Category:${metaCat}...`);
        const foundSubCats = await fetchCategoryMembers(metaCat, 14);
        
        for (const subCat of foundSubCats) {
            const cleanName = subCat.replace(/^Category:/, "");
            uniqueTypes.add(cleanName);
        }
    }

    const categoriesToSearch = new Set();
    for (const type of uniqueTypes) {
        categoriesToSearch.add(type);
        categoriesToSearch.add(type + "s");
        categoriesToSearch.add(type + "es");
    }

    const categories = [...categoriesToSearch];

    const out = new Set();
    for (const cat of categories) {
        setStatus(`Fetching towers from Category:${cat}...`);
        const members = await fetchCategoryMembers(cat, 0);

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
    const html = await fetchPageHTML(name.replace(/ /g, "_"));
    const doc = new DOMParser().parseFromString(html, "text/html");
    const pageText = (doc.body.textContent || "").toLowerCase();

    const isDeconfirmed = pageText.includes("contains deconfirmed content") || pageText.includes("contains removed content") || pageText.includes("contains scrapped content");
    const isMonthly = pageText.includes("part of a monthly challenge");
    const isUnreleased = pageText.includes("contains unreleased content");
    const isEvent = pageText.includes("part of an event");
    const isNotAllowed = (
        pageText.includes("summit of memories") && pageText.includes("(classic)") && pageText.includes("previously located in")
    );
    const isCanon = !(isDeconfirmed || isEvent || isMonthly || isNotAllowed || isUnreleased || pageText.includes("contains non-canon content"));

    const typeEl = getInfoboxField(doc, "Type") || getInfoboxField(doc, "Tower Type");
    let detectedType = typeEl ? typeEl.textContent.trim() : null;

    if (!detectedType) {
        if (name.includes("Steeple of ")) detectedType = "Steeple";
        else if (name.includes("Citadel of ")) detectedType = "Citadel";
        else if (name.includes("Obelisk of ")) detectedType = "Obelisk";
        else if (name.includes("Tower Rush")) detectedType = "Tower Rush";
        else if (name.startsWith("Tower of ")) detectedType = "Tower";
        else detectedType = "Mini Tower";
    }

    const data = {
        name,
        isDeconfirmed,
        isMonthly,
        isUnreleased,
        isEvent,
        isNotAllowed,
        isCanon,
        type: detectedType,
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
