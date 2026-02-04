// tower.js v1.0
// made by las-r on github

// tower.js - Updated Tower selection logic

async function chooseTower() {
    setStatus("Searching for a tower...");
    
    const settings = {
        canon: document.getElementById("canon").checked,
        monthly: document.getElementById("monthly").checked,
        pom: document.getElementById("pom").checked,
        som: document.getElementById("som").checked,
        eventx: document.getElementById("event").checked,
        unreleased: document.getElementById("unreleased").checked,
        removed: document.getElementById("removed").checked
    };

    const anyFilterActive = Object.values(settings).some(val => val === true);

    let attempts = 0;
    const maxAttempts = 100;
    
    while (attempts < maxAttempts) {
        attempts++;
        
        const batchNames = Array.from({length: 12}, () => 
            towers[Math.floor(Math.random() * towers.length)]
        );

        const batchData = await Promise.all(batchNames.map(name => getTowerData(name)));

        const validTower = batchData.find(t => {
            if (!anyFilterActive) return true;
            if (t.isNotAllowed) return false;

            const loc = t.location ? t.location.toLowerCase() : "";
            const isPoM = loc.includes("pit of misery");
            const isSoM = loc.includes("summit of memories");
            const isMonthly = loc.includes("time-lost") || t.isMonthly;

            if (isPoM) return settings.pom;
            if (isSoM) return settings.som;
            if (isMonthly) return settings.monthly;
            if (t.isEvent) return settings.eventx;
            if (t.isUnreleased) return settings.unreleased;
            if (t.isDeconfirmed) return settings.removed;
            if (t.isCanon) return settings.canon;

            return false;
        });

        if (validTower) {
            tower = validTower;
            return tower;
        }
    }

    setStatus("No tower found. Change filters.");
}
