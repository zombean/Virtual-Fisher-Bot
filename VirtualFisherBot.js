globalThis.usernameInText ??= 'Enter user name here as it displays in discord';
globalThis.acceptable_down_town_percent = 0.75;//%
globalThis.buy_boosts = true;

/*
  To use, copy paste this file into the dev tools console on a private virtual fisher channel
  the bot will flash and make a sound when there is a captcha to solve
  the bot will not solve captchas and is not an AFK bot, ideally best on a second monitor
*/

//Don't touch
globalThis.fish_speed ??= Math.round((Math.random() * 750) + 750);
globalThis.sleep ??= ms => new Promise(resolve => setTimeout(resolve, ms));
globalThis.scrollDown ??=e=>{e.scrollTop = e.scrollHeight};
globalThis.timers ??= [];
globalThis.verify_skip = false;
globalThis.static_drift = 0;
globalThis.debug_enabled = false;
globalThis.statistics = {"Trips":0,"Clan XP":0,"XP":0, "$":0};
globalThis.MINUTE = 60*1000;
globalThis.statistics_duration = MINUTE * 5; //5 minutes
globalThis.pause_flag = false;
globalThis.totals = { up: 0, down: 0, mode: true};
globalThis.sell_invent_ids = [];
globalThis.drift = 500;
globalThis.too_damn_roundings = [];

function is_too_damn_round(number) {
    const is = (number % 10) === 0;

    let has_been = false;

    for(const was of too_damn_roundings) {
        if(was) {
            has_been = true;
            break;
        }
    }

    if(has_been && is) return true;

    if(too_damn_roundings.length >= 10) too_damn_roundings.shift()
    too_damn_roundings.push(is);

    return false;
}

function getDrift() {
	let newDrift, randomChance = 0.5;
	if(drift <= 100) randomChance = 0.1;
	else if(drift <= 200) randomChance = 0.35;
	else if(drift >= 800) randomChance = 0.65;
	else if (drift >= 900) randomChance = 0.9;
    newDrift = drift + ((Math.random() > randomChance) ? 10 : -10);
	if(newDrift <= 0) drift = 0;
	else if(newDrift >= 1000) drift = 1000;
	else drift = newDrift;
    return Math.round(drift/3);
}


function weightedRandom(min, max, exponent = 2) {
    const randomValue = Math.random();
    return Math.round(min + (max - min) * Math.pow(randomValue, exponent));
}

function human_reaction() {
    const drift = getDrift();
    return weightedRandom(0, 1000, 5) + drift - 200 + (Math.random() * 200);
}

function humanization() {
    humanization.buffer ??= [0];
    let idle, buffer_to_avg = 3, avg = humanization.buffer.reduce((a,b)=>a+b)/humanization.buffer.length;
    if(Math.random() < (1/(45 * 20))) idle = weightedRandom((MINUTE * 10) + (Math.random()*30000), MINUTE * 20);
    else if(Math.random() < (1/(5 * 20))) idle = weightedRandom((MINUTE * 1) + (Math.random()*5000), MINUTE * 5);
    else if(Math.random() < (1/(2 * 20))) idle =  weightedRandom(weightedRandom(5000,10000), weightedRandom(20000,30000));
    else {
        idle = human_reaction();
        if(is_too_damn_round(idle)) {
            debug("idle:", idle, "was too damn round!");
            return humanization();
        }
        humanization.buffer.push(idle);
        if(humanization.buffer.length > buffer_to_avg) humanization.buffer.shift();
        avg = humanization.buffer.reduce((a,b)=>a+b)/humanization.buffer.length;
        if((idle < (avg+50)) && (idle > (avg-50))) {
            debug("Rerolling due to sus timers")
            debug("idle:", idle, "avg:", avg.toFixed(0));
            return humanization();
        }
    }
    
    debug("idle:", idle, "avg:", avg.toFixed(0));
    return idle;
}

function unstick() {
    fish_wait = false;
    pause_for_shop = false;
    last_success_msg = '';
    last_fish_send = 0;
    last_fish = 0;
}

function watchcat() {
    watchcat.whoops ??= 0;
    clearTimeout(watchcat.whoops);
    watchcat.whoops = setTimeout(()=>{
        log("Attempting to unstick");
        unstick();
        watchcat();
    }, 10_000 + (10_000 * Math.random()));
}

async function lastFishTimeDetector() {
    globalThis.last_success_msg ??= lastFBMsg().id;
    globalThis.last_fish_send ??= 0;

    let current_msg = lastFBMsg().id;
    if(current_msg === last_success_msg) return;

    last_success_msg = current_msg;
    stats(lastFBMsg());
    globalThis.last_fish = globalThis.last_fish_send + ((Date.now() - last_fish_send) * .25); //lag adjustment formula (25% between send and seen change)
    fish_wait = false;
    manage_statistics();
}

async function main() {

    log("Starting up ...");
    globalThis.KILL = true;
    globalThis.fish_wait = false;
    globalThis.pause_for_shop = false;

    for(const timer of timers) clearInterval(timer);
    timers.push(setInterval(lastFishTimeDetector, 10));
    timers.push(setInterval(()=>{
        if(totals?.disabled) return;
        totals[totals.mode?"up":"down"] += 1000;
    }, 1000));
    timers.push(setInterval(createOrUpdateFiboGui, 100));
    
    function speedCheck() {
        if(totals.mode == true) return;
        speed(weightedRandom(1000, 2000));
        setTimeout(speedCheck, weightedRandom(60*1000, 60*1000*2));
    }

    speedCheck();

    function lolz() {
        const gnow = Date.now();
        setTimeout(()=>{
            if(gnow - Date.now() > 1100) laggingNotification();
        })
    };

    timers.push(setInterval(lolz, 1000));

    await sleep(1250);
    globalThis.KILL = false;

    while(1) {
        await sleep(10);
        try {
            await loop();
            if(globalThis.KILL) break;
        } catch (err) {
            globalThis.FBErrs ??= [];
            FBErrs.push(err);
            console.error(`FishingBot Error ${err.msg}`, err);
        }
    }
}
main();

let msg_buffer = [];

function log(msg, errMode = false) {
    clearTimeout(log?.timer);
    log.timer = setTimeout(()=>{
        if(!pause_flag)
        log(`fatal script error, please reload page`, true)
    }, 30_000);
    const s_last = secondsSinceLast();
    let mode;
    if(errMode) mode = "error";
    else mode = parseFloat(s_last) < 15 ? "log" : "warn";
    msg = `${s_last.padEnd(4, " ")}> ${msg}`;
    console[mode](msg);
    guiLog("console", msg);
}

function secondsSinceLast() {
    globalThis.last_msg ??= Date.now();
    let ms_since_last = Date.now() - last_msg;
    last_msg = Date.now();
    let seconds_since_last = ms_since_last / 1000;
    return `${seconds_since_last.toFixed(2)}s`
}

function lastMsg() {
    lastMsg.scroller ??= document.querySelector('ol[class*=scrollerInner]');
    const childs = lastMsg.scroller.childNodes;
    return childs[childs.length - 2];
}

function lastmsgs() {
    return  Array.from(document.querySelector('ol[class*=scrollerInner]').childNodes).slice(-11, -1).reverse();
}

function lastFBMsg() {
    for(const msg of lastmsgs()) if(msg.textContent.includes(`${usernameInText}You caught`)) return msg;
    return null;
}

function verificationPassed() {
    for(const msg of lastmsgs()) if(msg.textContent.includes("You may now continue")) return true;
    return false
}

function verifyNeeded() {
    if(verificationPassed()) return;
    for(const msg of lastmsgs()) if(
        msg.textContent.includes("Please use /verify") ||
        msg.textContent.includes("solve the captcha")
    ) return true;
    return false;
}

async function boost() {

    globalThis.last_boost ??= Date.now();
    if((Date.now() - last_boost) < 10 * MINUTE) return;

    log("boosting");

    pause_for_shop = true;
    await sleep(1000 + human_reaction());

    for(const btn of [
        "Return", "Shop", "🔥", 
        "Worker (30m)", "Fish Boost (20m)", "Treasure Boost (20m)", 
        "Worker (10m)", "Fish Boost (5m)", "Treasure Boost (5m)", 
    ]) {
        while(await click(btn) == false) {
            watchcat();
        }
        await sleep(250 + human_reaction());
    }
    
    last_boost = Date.now() + weightedRandom(10_000, 20_000, 2);
    pause_for_shop = false;
}

function isWaitMsg(content) {
    if(!content.textContent.includes("Only you can see this • Dismiss message")) return false;
    if(!content.textContent.includes("You must wait")) return false;
    return true;
}

function waiting() {
    let truthy = false;
    for(const msg of lastmsgs()) if(isWaitMsg(msg)) {
        decipherSpeed(msg?.textContent);
        msg.querySelector('a').click();
        truthy = true;
        fish_wait = false;
    }
    return truthy;
}

function raw_fish_now() {
    if(globalThis?.hard_pause) return;
    for(const btn of Array.from(document.querySelectorAll('button')).reverse()) { 
        if(btn.textContent !== "Fish Again") continue; 
        btn.click();
        globalThis.last_fish_send = Date.now();
        fish_wait = true;
        break; 
    }
}

async function raw_sell_now() {
    log("selling");
    await sleep(human_reaction());
    let skip_first = true;
    for(const btn of Array.from(document.querySelectorAll('button')).reverse()) { 
        if(btn.textContent !== "Sell") continue;
        if(skip_first) {
            skip_first = false;
            continue;
        }
        btn.click();
        break; 
    }
}

function debug(...msgs) {
    if(!debug_enabled) return;
    const string = `debug> ${msgs.join(' ')}`;
    console.warn(string);
    guiLog("console", string);
}

function is_unreasonble_wait(projected_down) {
    const up_time_percent = totals.up / (totals.up + totals.down + projected_down);
    return up_time_percent <= acceptable_down_town_percent;
}

async function fish() {

    if(lastMsg().textContent.includes("interaction failed")) {
        raw_fish_now();
        await sleep(2000 + human_reaction());
        return;
    } 

    globalThis.last_fish ??= Date.now();
    if((Date.now() - last_fish) < fish_speed) return;

    if(fish_wait) return;
    if(pause_for_shop) return;
    
    let idle = humanization();
    debug("idle assigned:", idle);

    let interval, end_time = Date.now() + idle;
    let idle_shop_trigger = idle > 120_000;

    if(idle > 3000 && is_unreasonble_wait(idle)) {
        debug(`Skipping a sleep of ${(idle/1000).toFixed(0)}s`);
        idle = human_reaction();
    }

    totals.mode = true;
    if(idle > 3000) {
        totals.mode = false;
        raw_sell_now();
        log(`Entering sleep for ${(idle/1000).toFixed(1)} seconds`)
        let timeleft = end_time - Date.now();
        while(timeleft > 0) {
            let seconds_left = (timeleft/1000).toFixed(0);
            if(seconds_left>5) log(`Remaining sleep time ${seconds_left}s`);
            watchcat();

            if(seconds_left < 60 && idle_shop_trigger) {
                shop_whilst_idle();
                idle_shop_trigger = false;
            }

            await sleep(timeleft > 5000 ? 5000 : timeleft);

            if(globalThis?.skip_wait) {
                timeleft = 0;
                skip_wait = false;
            }

            timeleft -= 5000;
        }

    } else await sleep(idle);

    clearInterval(interval);

    watchcat(); //this point is exactly where watchcat needs to be

    log('fishing');
    raw_fish_now();
    await sleep(1500);
    if(waiting()) return log(`We were too quick`);
}

async function loop() {
    if(!pause_flag) scrollDown(document.querySelector('div[class*=scroller][tabindex="-1"]'));

    if(verifyNeeded() && verify_skip == false && pause_flag == false) {
        log("We need to verify :(");
        flashUntilFocus();
        pause();
        return;
    }

    if(globalThis.pause_flag) return watchcat();

    await boost();
    await fish();
}

function decipherSpeed(msg) {
    if(typeof msg != "string") return;
	if(!msg.includes("Your cooldown")) return;
	let ms = parseFloat(msg.split("Your cooldown:")[1].split("Only")[0]);
	ms = Math.round(ms*1000);
    if(fish_speed === ms) return;
	speed(ms);
}

function speed(speed) {
    log(`Updated fish speed to ${speed}`);
    fish_speed = speed;
}

function pause(msg = "bot paused") {
    globalThis.pause_flag = true;
    totals.mode = false;
    log(msg);
}

function resume() {
    log("bot resumed");
    globalThis.pause_flag = false;
}

function harderPause() {
    globalThis.hard_pause = true;
    totals.disabled = true;
    globalThis.pause_interval = setInterval(()=>{
        globalThis.pause_flag = true;
        totals.mode = false;
    }, 100);
}

function harderResume() {
    globalThis.hard_pause = false;
    totals.mode = true;
    totals.disabled = false;
    globalThis.totals = { up: 0, down: 0, mode: true};
    clearInterval(globalThis?.pause_interval);
}

async function click(text) {
    for(const msg of lastmsgs())
    for(const btn of msg.querySelectorAll('button'))
        if(btn?.textContent?.includes(text)) {
            await sleep(human_reaction());
            btn?.click();
            return true;
        }

    for(const msg of lastmsgs())
    for(const btn of msg.querySelectorAll('button'))
        if(btn?.querySelector('img')?.getAttribute("alt")?.includes(text)) {
            await sleep(human_reaction());
            btn?.click();
            return true;
        }

    await sleep(0);
    return false;
}

async function shop_whilst_idle() {
    return //log("Skipping shop function...");
    let id = Date.now();

    shop_whilst_idle[id] = true; 
    setTimeout(()=>{
        shop_whilst_idle[id] = false;
    }, 60_000);

    for(const btn of [
        "Sell", "Return", "Shop",
        "⬆", 
        "Better Fish", "More Chests", "Better Fish", "More Chests", 
        "arrow_right", 
        "Artifact", "Better Chests", "Experienced", "Artifact", "Better Chests", "Experienced", 
        "arrow_left", 
        "Salesman", "Salesman",
        "Back", "fb_lavafish", "Fish Ovens", "Bait", "Aquatic", "Ultimate", 
        "arrow_right",
        "Highly", "Boost", 
        "Back"
    ]) {
        if(shop_whilst_idle[id] == false) return;
        log(`clicking ${btn}`);
        while(await click(btn) == false) {
            watchcat();
        }
        await sleep(1500 + human_reaction());
    }
}

function stats(msg) {
    msg = msg.textContent;

    if(msg.includes("You are now level")) {
        let new_level = parseInt(msg.split("You are now level ")[1].split(".")[0]);
        if(new_level >= stats?.level ?? 0) onLevelUp(new_level);
        stats.level = new_level;
    }
}

function skip() {
    log("Skipping wait");
    globalThis.skip_wait = true;
}

function getXp(lines) {
    for(const line of lines.reverse()) 
        if(line.slice(-2) === "XP") 
            return parseInt(line.replaceAll(',', ''))

    return 0;
}

function getFish(lines) {

    function fishFromLine(line) {
        return {
            name: line.split("  ")[1],
            number: parseInt(line.split("  ")[0])
        }
    }

    let reading_fish = false;
    let fish = {};
    for(const line of lines) {
        if(line.includes("You caught")) {
            reading_fish = true;
            const scuffed_fish_msg = line.split(":").slice(-1)[0];
            const fishies = fishFromLine(scuffed_fish_msg);
            fish[fishies.name] = fishies.number;
            continue
        }
        if(isNaN(parseInt(line[0]))) return fish;
        const fishies = fishFromLine(line);
        fish[fishies.name] = fishies.number;
        if(reading_fish === false) continue;
    }

    return fish;
}


function getChests(lines) {
    let type = false, rarity, found = {};
    for(const line of lines) {
        if(!line.includes("found")) continue
        if(line.includes("box")) type = "box";
        if(line.includes("crate")) type = "crate";
        if(line.includes("chest")) type = "chest";
        rarity = line.split(type)[0].split(" ").slice(-2, -1)[0];
    }

    if(type === false) return found;

    for(const line of lines) {
        if(line.includes("You got")) {

            const trimmed = line.split("You got ")[1].split(" from")[0];
            if(trimmed[0] === '$') {
                found["$"] = parseInt(trimmed.replaceAll(',', '').slice(1));
                continue;
            }
            const number = parseInt(trimmed.split(" ")[0].replaceAll(',', ''));
            const name = trimmed.split(" ").slice(1).join(" ");
            found[name] = number; 

        } else if(line.includes("You found")) {
            if(line.includes(type)) continue;
            const charm = line.split(" Charm")[0].split(" ").slice(-1)[0];
            found[charm + " Charm"] ??= 0;
            if(line.includes("found a")) {
                found[charm + " Charm"] += 1;
                continue;
            }
            const pos_number = line.replaceAll(',','').split(charm)[0].split(" ").slice(-2, -1)[0];
            found[charm + " Charm"] += parseInt(pos_number);

        } 
    }

    return {type, rarity, found};
}

 function getLevelUpBonus(lines) {
    for(const line of lines) {
        if(!line.includes("for leveling up")) continue
        const money = line.split(" ")[0].replaceAll(',', '').slice(1);
        return parseInt(money);
    }
    return 0;
}

function getStatistics(msg) {
    const lines = msg.textContent.split('\n');
    const findings = {};
    findings.xpGain = getXp([...lines]);
    findings.fishGain = getFish([...lines]);
    findings.chestGain = getChests([...lines]);
    findings.levelUpBonus = getLevelUpBonus([...lines]);
    return findings
}

function statistics_add(name, amount = 1) {
    statistics[name] ??= 0;
    statistics[name] += amount;
    setTimeout(()=>{
        statistics[name] -= amount;
    }, statistics_duration);
}

function statistics_display() {
    drawPlayerInfo();
    guiClear("statistics");
    statistics_display.start ??= Date.now();
    let timeToScoreBy = 0, timeSinceStart = Date.now() - statistics_display.start;
    if(timeSinceStart < statistics_duration) {
        timeToScoreBy = timeSinceStart;
    } else {
        timeToScoreBy = statistics_duration;
    }
    const seconds_duration = timeToScoreBy / 1000;
    let lines = 0, charms = {}, crates = {}, boxes = {}, chests = {};
    for(const [name, number] of Object.entries(statistics)) {
        const pSec = number/seconds_duration;
        if(pSec > 0.1) {
            if(name.includes("Charm")) {
                let temp_name = name.split(" ")[0];
                if(temp_name === "Charm") continue;
                charms[temp_name] = formatNumberShorthand(pSec);
                continue;
            }
            if(name.includes("crate")) {
                crates[name.split(" ")[0]] = formatNumberShorthand(pSec);
                continue;
            }
            if(name.includes("box")) {
                boxes[name.split(" ")[0]] = formatNumberShorthand(pSec);
                continue;
            }
            if(name.includes("chest")) {
                chests[name.split(" ")[0]] = formatNumberShorthand(pSec);
                continue;
            }
            guiLog("statistics", `${name}: ${formatNumberShorthand(pSec)} / s`);
            lines++;
        }
    }

    let charmEntries = Object.entries(charms);
    if(charmEntries.length) {
        lines++;
        let string = 'Charms: ';
        for(const [name, pSec] of charmEntries) {
            string += `${name} ${pSec}/s, `;
        }
        guiLog("statistics", string);
    }

    let crateEntries = Object.entries(crates);
    if(crateEntries.length) {
        lines++;
        let string = 'Crates: ';
        for(const [name, pSec] of crateEntries) {
            string += `${name} ${pSec}/s, `;
        }
        guiLog("statistics", string);
    }

    let boxesEntries = Object.entries(boxes);
    if(boxesEntries.length) {
        lines++;
        let string = 'Boxes: ';
        for(const [name, pSec] of boxesEntries) {
            string += `${name} ${pSec}/s, `;
        }
        guiLog("statistics", string);
    }

    let chestEntries = Object.entries(chests);
    if(chestEntries.length) {
        lines++;
        let string = 'Chests: ';
        for(const [name, pSec] of chestEntries) {
            string += `${name} ${pSec}/s, `;
        }
        guiLog("statistics", string);
    }
}

function manage_statistics() {
    const datas = getStatistics(lastFBMsg())
    statistics_add("Clan XP", 5);
    statistics_add("Trips");
    statistics_add("XP", datas.xpGain);
    const sellMoney = findSellData();
    if(sellMoney) statistics_add("$", sellMoney);
    if(datas.levelUpBonus)
        statistics_add("$", datas.levelUpBonus);
    for(const [name, number] of Object.entries(datas.fishGain))
        statistics_add(name, number);
    if(datas.chestGain.type) {
        statistics_add(`${datas.chestGain.rarity} ${datas.chestGain.type}`, 1);
        for(const [name, number] of Object.entries(datas.chestGain.found)) 
            statistics_add(name, number);
    }
    statistics_display();
}

function formatNumberShorthand(number = 0) {
    const suffixes = ["", "K", "M", "B", "T", "Q"];
    let magnitude = 0;
    while (number >= 1000 && magnitude < suffixes.length - 1) {
      number /= 1000;
      magnitude++;
    }
    return number.toFixed(2) + suffixes[magnitude];
}

function createOrUpdateFiboGui() {
    const fiboGui = document.getElementById("fiboGui");
    const pauseResumeLabel = globalThis.hard_pause ? "Resume" : "Stop";

    if (fiboGui) {
        const pauseResumeButton = fiboGui.querySelector(".pause-resume-button");
        if (pauseResumeButton) {
            pauseResumeButton.textContent = pauseResumeLabel;
            pauseResumeButton.onclick = globalThis[globalThis.hard_pause ? "harderResume" : "harderPause"];
        }
        return;
    }

    const newFiboGui = document.createElement("div");
    newFiboGui.id = "fiboGui";
    newFiboGui.style.position = "fixed";
    newFiboGui.style.top = "0px";
    newFiboGui.style.left = "0px";
    newFiboGui.style.width = "288px"
    newFiboGui.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    newFiboGui.style.color = "white";
    newFiboGui.style.padding = "10px";
    newFiboGui.style.border = "1px solid white";
    newFiboGui.style.zIndex = 9999;
    newFiboGui.style.fontFamily = "Consolas, monospace";

    const playerDiv = document.createElement("div");
    playerDiv.id = "fibo_player";
    playerDiv.style.width = "400px";
    playerDiv.style.height = "200px";
    playerDiv.style.overflow = "hidden";
    playerDiv.style.fontFamily = "Consolas, monospace";
    playerDiv.style.fontSize = "12px";
    newFiboGui.appendChild(playerDiv);

    const statisticsDiv = document.createElement("div");
    statisticsDiv.id = "fibo_statistics";
    statisticsDiv.style.width = "400px";
    statisticsDiv.style.height = "200px";
    statisticsDiv.style.overflow = "hidden";
    statisticsDiv.style.fontFamily = "Consolas, monospace";
    statisticsDiv.style.fontSize = "12px";
    newFiboGui.appendChild(statisticsDiv);

    const consoleDiv = document.createElement("div");
    consoleDiv.id = "fibo_console";
    consoleDiv.style.width = "400px";
    consoleDiv.style.height = "200px";
    consoleDiv.style.overflow = "hidden";
    consoleDiv.style.fontFamily = "Consolas, monospace";
    consoleDiv.style.fontSize = "12px";
    newFiboGui.appendChild(consoleDiv);

    const pauseResumeButton = document.createElement("button");
    pauseResumeButton.className = "pause-resume-button";
    pauseResumeButton.textContent = pauseResumeLabel;
    pauseResumeButton.style.padding = "5px";
    pauseResumeButton.style.margin = "5px";
    pauseResumeButton.onclick = globalThis[pause_flag ? "resume" : "pause"];
    pauseResumeButton.style.fontFamily = "Consolas, monospace";
    newFiboGui.appendChild(pauseResumeButton);

    const skipButton = document.createElement("button");
    skipButton.textContent = "Skip sleep";
    skipButton.style.padding = "5px";
    skipButton.style.margin = "5px";
    skipButton.onclick = skip;
    skipButton.style.fontFamily = "Consolas, monospace";
    newFiboGui.appendChild(skipButton);

    const verifiedBtn = document.createElement("button");
    verifiedBtn.textContent = "Verified";
    verifiedBtn.style.padding = "5px";
    verifiedBtn.style.margin = "5px";
    verifiedBtn.onclick = ()=>{
        verify_skip = true;
        setTimeout(()=>{
            verify_skip = false;
        }, 120_000);
    }
    newFiboGui.appendChild(verifiedBtn);
    /*
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.id = "speedAdjust";
    textInput.value = 3500;
    newFiboGui.appendChild(textInput);

    const speedAdjustBtn = document.createElement("button");
    speedAdjustBtn.textContent = "Adjust speed";
    speedAdjustBtn.style.padding = "5px";
    speedAdjustBtn.style.margin = "5px";
    speedAdjustBtn.onclick = ()=>{
        const speedVal = parseInt(document.getElementById("speedAdjust").value);
        if(isNaN(speedVal)) return;
        speed(speedVal);
    }
    newFiboGui.appendChild(speedAdjustBtn);
    */

    document.body.appendChild(newFiboGui);
}

function guiLog(type, text) {
    guiLog.console ??= document.getElementById("fibo_console");
    guiLog.statistics ??= document.getElementById("fibo_statistics");
    if (guiLog[type]) {
        const divElement = document.createElement("div");
        divElement.textContent = text;
        guiLog[type].appendChild(divElement);
        guiLog[type].scrollTop = guiLog[type].scrollHeight;
    }
}

function guiClear(type) {
    guiClear.console ??= document.getElementById("fibo_console");
    guiClear.statistics ??= document.getElementById("fibo_statistics");
    guiClear[type].innerHTML = "";
}

function flashUntilFocus() {
    flashUntilFocus.is_flashing ??= false;
    if(flashUntilFocus.is_flashing) return;
    flashUntilFocus.is_flashing = true;
    // Create the overlay element
    const overlay = document.createElement('div');
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100%';
    overlay.style.height = '100%';
    overlay.style.zIndex = 99999;
    overlay.style.background = 'red';
    overlay.style.opacity = '0.5';
    overlay.style.transition = 'opacity 0.25s';
    overlay.style.pointerEvents = 'none'; // Allows interactions with elements underneath

    document.body.appendChild(overlay);

    function toggleOpacity() {
    tonal(); 
      if (overlay.style.opacity === '0.5') {
        overlay.style.opacity = '0.1';
      } else {
        overlay.style.opacity = '0.5';
      }
    }
  
    // Start toggling opacity every 750ms
    const flashInterval = setInterval(toggleOpacity, 500);
  
    // Define the event handler function
    function onFocusHandler() {
        flashUntilFocus.is_flashing = false;
        clearInterval(flashInterval); // Stop toggling opacity
        document.body.removeChild(overlay); // Remove the overlay

        // Remove the event listener after it's been triggered
        window.removeEventListener('focus', onFocusHandler);
    }

    // Add the event listener
    window.addEventListener('focus', onFocusHandler);
}


function beep(freq, duration) {
/*if you want to beep without using a wave file*/
    beep.context ??= new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = beep.context.createOscillator();
    oscillator.type = "sine";
    oscillator.frequency.value = freq;
    oscillator.connect(beep.context.destination);
    oscillator.start(); 
    // Beep for 500 milliseconds
    setTimeout(function () {
        oscillator.stop();
    }, duration);                
};

function tonal() {
    for(let i=0;i<30;i++) {
        beep(i*100, 250);
    }
}

function onLevelUp(level) {
    stats.level = level;
    log(`you reached level ${level} Gratz!`);
    switch(parseInt(level)) {
        case 30: {
            log("You unlocked Wise Bait!");
            break;
        }
        case 35: {
            log("10% increased sale price");
            break;
        }
        case 40 : {
            log("You unlocked Fish Bait!");
            break;
        }
        case 50: {
            pause("Please change biome");
            flashUntilFocus();
            break;
        }
        case 60: {
            log("You unlocked Artifact magnets");
            break;
        }
        case 100: {
            pause("Please change biome");
            flashUntilFocus();
            break;
        }
        case 150: {
            pause("Please buy sushi");
            break;
        }
        case 250: {
            pause("Please change biome");
            flashUntilFocus();
            break;
        }
        case 500: {
            pause("Please change biome");
            flashUntilFocus();
            break;
        }
    }
}

async function changeBiome(biome) {
    pause();
    await sleep(fish_speed + human_reaction());
}

window.onfocus = function() {
    if(globalThis?.hard_pause) return;
    pause();
};

window.onblur = function() {
    if(globalThis?.hard_pause) return;
    resume();
};

function laggingNotification() {
    flashUntilFocus();
    pause();
    log("You are lagging");
    log("please leave part of the page visible;");
    log("Alternatively, press F5 to disable the bot");
    log("> Lagging disrupts our anti ban methods");
    log("this is NOT an AFK bot");
}

function findSellData() {//You now have $63,308,281!
    if(sell_invent_ids.length > 10) sell_invent_ids.shift();
    for(const msg of lastmsgs()) {
        if(!(msg.textContent.includes("sold your entire") && msg.textContent.includes(globalThis?.usernameInText))) continue;
        if(sell_invent_ids.includes(msg.id)) continue;
        sell_invent_ids.push(msg.id);
        const money = msg.textContent.split("$")[1].split(".")[0].replaceAll(',', '');
        const total = msg.textContent.split("$")[2].split("!")[0].replaceAll(',', '');
        stats.money = parseInt(total);
        return parseInt(money);
    }
}

function displayPlayerInfo(lines) {
    const div = document.querySelector('#fibo_player');
    if(!div) return;
    div.innerHTML = "";
    for(const line of lines) {
        const textNode = document.createElement("div");
        textNode.textContent = line;
        div.appendChild(textNode);
    }
}

function drawPlayerInfo() {
    displayPlayerInfo([
        `level ${stats?.level ?? "Unknown"}`,
        `$${formatNumberShorthand(stats?.money) ?? "Unknown"}`,
        `Fishing speed: ${fish_speed}`
    ])
}
