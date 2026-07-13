/*
 * app.js - grouping, formatting and rendering for the stats viewer.
 * parser.js produces a flat { statName: int } object; everything here
 * turns that into a structured, readable page.
 */

// Subclass -> archetype taxonomy (matches the in-game class tree)
const ARCHETYPES = {
  Longbowman: "Archer", Crossbowman: "Archer", Skirmisher: "Archer",
  Devastator: "Vanguard", Raider: "Vanguard", Ambusher: "Vanguard",
  Poleman: "Footman", ManAtArms: "Footman", FieldEngineer: "Footman",
  Crusader: "Knight", Guardian: "Knight", Officer: "Knight",
  Peasant: "Misc", Duke: "Misc", None: "Misc"
};

const COMBAT_STATS = [
  ["Kills", "Kills"],
  ["Deaths", "Deaths"],
  ["DamageInflicted", "Damage inflicted"],
  ["Blocks", "Blocks"],
  ["MultiKills", "Multi-kills"],
  ["KillingSprees", "Killing sprees"],
  ["Revives", "Teammates revived"],
  ["Battlecries", "Battlecries"],
  ["Commendations", "Commendations"],
  ["ItemsConstructed", "Items constructed"],
  ["Suicides", "Suicides"]
];

const FACTIONS = ["Agatha", "Mason", "Tenosia"];

// Steam achievement titles/descriptions. The game's internal API names are
// exactly the keys of the save file's AchievementProgressEx map.
const ACHIEVEMENTS = {
  KILL_10: ["Kill 10 Enemies", "Kill 10 Enemies in a Multiplayer match."],
  KILL_50: ["Kill 50 Enemies", "Kill 50 Enemies in a Multiplayer match."],
  KILL_100: ["Kill 100 Enemies", "Kill 100 Enemies in a Multiplayer match."],
  KILL_250: ["Kill 250 Enemies", "Kill 250 Enemies in a Multiplayer match."],
  KILL_500: ["Kill 500 Enemies", "Kill 500 Enemies in a Multiplayer match."],
  KILL_1000: ["Kill 1000 Enemies", "Kill 1000 Enemies in a Multiplayer match."],
  KILL_1500: ["Kill 1500 Enemies", "Kill 1500 Enemies in a Multiplayer match."],
  KILL_2000: ["Kill 2000 Enemies", "Kill 2000 Enemies in a Multiplayer match."],
  KILL_100_KNIGHT: ["Deus Vult", "Achieve 100 kills as Knight"],
  KILL_100_FOOTMAN: ["Feet on the Ground", "Achieve 100 kills as Footman"],
  KILL_100_VANGUARD: ["Avant-Garde", "Achieve 100 kills as Vanguard"],
  KILL_100_ARCHER: ["Playing the wrong game", "Achieve 100 kills as Archer"],
  KILL_BASTARD_BASTARD: ["Battle Of The Bastards", "Kill an enemy wielding a bastard sword, with a bastard sword"],
  KILL_50_SIEGE: ["Bring Out The Big Guns", "Get 50 kills with siege weapons"],
  KILL_13_BREAD: ["Baker's Dozen", "Kill 13 enemies with bread"],
  KILL_10_UNARMED: ["Night Knight", "Get 10 unarmed kills"],
  KILL_2_UNDER_25: ["Seeing Red", "Achieve 2 kills in a row without dying while under 25 health"],
  KILL_FROM_100M: ["Long Range Menace", "Kill an enemy with a projectile from over 100 meters"],
  "50_KILLS_1_MATCH": ["Brave Brave Sir Robin", "Get 50 kills in one match"],
  CAUSE_FALL_DEATH: ["The Things I Do For Love", "Make an enemy fall to their death"],
  DIE_FIRE: ["This Is Fine", "Die from fire"],
  BE_REVIVED: ["I got better!", "Get revived from a downed state"],
  REVIVE_10: ["Field Medic", "Revive 10 downed teammates"],
  BANDAGE_3X_1_LIFE: ["What Do We Say To the God of Death?", "Bandage yourself 3 times in one life"],
  COUNTER_200: ["The Count", "Successfully counter 200 attacks"],
  DEFLECT_100: ["Yadome", "Deflect 100 projectiles"],
  FIRE_1000: ["Fight In The Shade", "Fire 1000 arrows"],
  MATCHWIN_AGATHA_10: ["Win as Agatha 10 times", "Win as Agatha 10 times"],
  MATCHWIN_MASON_10: ["Win as Mason 10 times", "Win as Mason 10 times"],
  MATCHWIN_CASTLESIEGE_5: ["Win Rudhelm Siege 5 times", "Win Rudhelm Siege 5 times"],
  MATCHWIN_CASTLESIEGE_10: ["Win Rudhelm Siege 10 times", "Win Rudhelm Siege 10 times"],
  MATCHWIN_CASTLESIEGE_25: ["Win Rudhelm Siege 25 times", "Win Rudhelm Siege 25 times"],
  MATCHWIN_DARKFOREST_5: ["Win Dark Forest 5 times", "Win Dark Forest 5 times"],
  MATCHWIN_DARKFOREST_10: ["Win Dark Forest 10 times", "Win Dark Forest 10 times"],
  MATCHWIN_DARKFOREST_25: ["Win Dark Forest 25 times", "Win Dark Forest 25 times"],
  MATCHWIN_LIONSPIRE_5: ["Win Lionspire 5 times", "Win Lionspire 5 times"],
  MATCHWIN_LIONSPIRE_10: ["Win Lionspire 10 times", "Win Lionspire 10 times"],
  MATCHWIN_LIONSPIRE_25: ["Win Lionspire 25 times", "Win Lionspire 25 times"],
  MATCHWIN_COXWELL_5: ["Win Coxwell 5 times", "Win Coxwell 5 times"],
  MATCHWIN_COXWELL_10: ["Win Coxwell 10 times", "Win Coxwell 10 times"],
  MATCHWIN_COXWELL_25: ["Win Coxwell 25 times", "Win Coxwell 25 times"]
};

const MODES = [
  ["MatchesCompletedTeamObjective", "Team Objective"],
  ["MatchesCompletedTeamDeathmatch", "Team Deathmatch"],
  ["MatchesCompletedFreeForAll", "Free-for-All"],
  ["MatchesCompletedLastTeamStanding", "Last Team Standing"],
  ["MatchesCompletedBrawl", "Brawl"],
  ["MatchesCompletedArena", "Arena"]
];

// ---------- formatting ----------

function camelToTitle(text) {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z])([A-Z][a-z])/g, "$1 $2");
}

function fmtInt(n) {
  return n.toLocaleString("en-US");
}

// Stat-tile values auto-compact: 1,284 / 12.9K / 4.2M
function fmtCompact(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e5) return (n / 1e3).toFixed(1) + "K";
  return fmtInt(n);
}

function fmtRatio(kills, deaths) {
  if (deaths <= 0) return kills > 0 ? kills.toFixed(2) : "-";
  return (kills / deaths).toFixed(2);
}

// Playtime values are stored in seconds
function fmtDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return fmtInt(h) + "h " + m + "m";
  const s = seconds % 60;
  return m + "m " + s + "s";
}

function fmtPercent(x) {
  return (x * 100).toFixed(1) + "%";
}

// ---------- grouping ----------

// Turn the flat stat map into a structured model. Every input key ends up
// somewhere; anything unrecognized lands in `other` so nothing is dropped.
function groupStats(raw) {
  const used = new Set();
  const get = key => {
    used.add(key);
    return raw[key] || 0;
  };

  const combat = COMBAT_STATS
    .map(([key, label]) => ({ key, label, value: get(key) }));

  const factions = FACTIONS.map(name => {
    const wins = get("Wins" + name);
    const losses = get("Losses" + name);
    const total = wins + losses;
    return { name, wins, losses, total, rate: total > 0 ? wins / total : 0 };
  });

  const modes = MODES.map(([key, label]) => ({ label, count: get(key) }));
  const matchesTotal = get("MatchesCompleted");
  const ffa = {
    first: get("FFAFirst"),
    second: get("FFASecond"),
    third: get("FFAThird")
  };

  // Pivot SubClass<Stat><Name> and Weapon<Stat><Name> keys into rows
  const classes = {};
  const weapons = {};
  for (const key in raw) {
    let m = key.match(/^SubClass(Kills|Deaths|Takedowns|Playtime)(.+)$/);
    if (m) {
      used.add(key);
      const name = m[2];
      classes[name] = classes[name] ||
        { name, kills: 0, deaths: 0, takedowns: 0, playtime: 0 };
      classes[name][m[1].toLowerCase()] = raw[key];
      continue;
    }
    m = key.match(/^Weapon(Kills|Deaths|Takedowns)(.+)$/);
    if (m) {
      used.add(key);
      const name = m[2];
      weapons[name] = weapons[name] ||
        { name, kills: 0, deaths: 0, takedowns: 0 };
      weapons[name][m[1].toLowerCase()] = raw[key];
    }
  }

  const classRows = Object.values(classes).map(c => ({
    ...c,
    label: camelToTitle(c.name),
    archetype: ARCHETYPES[c.name] || "Misc",
    kd: c.deaths > 0 ? c.kills / c.deaths : c.kills
  }));

  const weaponRows = Object.values(weapons).map(w => ({
    ...w,
    label: camelToTitle(w.name)
  }));

  // Remaining keys: SCREAMING_SNAKE ones are challenge/achievement counters,
  // the rest are genuine misc stats
  const other = [];
  const challenges = [];
  for (const key in raw) {
    if (used.has(key)) continue;
    if (/^[A-Z0-9_]+$/.test(key)) {
      challenges.push({ key, value: raw[key] });
    } else {
      other.push({ key, label: camelToTitle(key), value: raw[key] });
    }
  }
  challenges.sort((a, b) => b.value - a.value || a.key.localeCompare(b.key));

  const kills = raw.Kills || 0;
  const deaths = raw.Deaths || 0;
  const wins = factions.reduce((a, f) => a + f.wins, 0);
  const losses = factions.reduce((a, f) => a + f.losses, 0);
  const playtime = classRows.reduce((a, c) => a + c.playtime, 0);

  return {
    kpis: {
      kills, deaths, wins, losses, playtime,
      damage: raw.DamageInflicted || 0,
      matches: matchesTotal
    },
    combat, factions, modes, matchesTotal, ffa,
    classRows, weaponRows, other, challenges
  };
}

// ---------- rendering ----------

const state = {
  model: null,
  weaponSort: { col: "kills", dir: -1 },
  classSort: { col: "playtime", dir: -1 },
  weaponSearch: "",
  hideUnused: true
};

function renderKpis(k) {
  const winRate = (k.wins + k.losses) > 0 ? k.wins / (k.wins + k.losses) : 0;
  const tiles = [
    ["Kills", fmtCompact(k.kills), fmtInt(k.kills) + " total"],
    ["K/D ratio", fmtRatio(k.kills, k.deaths), fmtCompact(k.deaths) + " deaths"],
    ["Playtime", Math.floor(k.playtime / 3600).toLocaleString("en-US") + "h", fmtDuration(k.playtime)],
    ["Win rate", fmtPercent(winRate), fmtInt(k.wins) + "W - " + fmtInt(k.losses) + "L"],
    ["Damage inflicted", fmtCompact(k.damage), fmtInt(k.damage) + " total"],
    ["Matches", fmtCompact(k.matches), "completed"]
  ];
  return tiles.map(([label, value, sub]) => `
    <div class="tile">
      <div class="tile-label">${label}</div>
      <div class="tile-value">${value}</div>
      <div class="tile-sub">${sub}</div>
    </div>`).join("");
}

function renderCombat(rows) {
  return rows.map(r => `
    <div class="row">
      <span class="row-label">${r.label}</span>
      <span class="row-value">${fmtInt(r.value)}</span>
    </div>`).join("");
}

function renderFactions(factions) {
  return factions.map(f => `
    <div class="faction">
      <div class="faction-head">
        <span class="row-label">${f.name}</span>
        <span class="row-value">${fmtInt(f.wins)}W - ${fmtInt(f.losses)}L
          <span class="muted">(${f.total > 0 ? fmtPercent(f.rate) : "no matches"})</span>
        </span>
      </div>
      <div class="meter"><div class="meter-fill" style="width:${(f.rate * 100).toFixed(1)}%"></div></div>
    </div>`).join("");
}

function renderModes(modes, total, ffa) {
  const rows = modes.map(m => `
    <div class="row">
      <span class="row-label">${m.label}</span>
      <span class="row-value">${fmtInt(m.count)}</span>
    </div>`).join("");
  const podium = `
    <div class="row podium">
      <span class="row-label">Scoreboard placements</span>
      <span class="row-value">
        <span title="Matches finished 1st on the scoreboard">1st: ${fmtInt(ffa.first)}</span> &middot;
        <span title="Matches finished 2nd on the scoreboard">2nd: ${fmtInt(ffa.second)}</span> &middot;
        <span title="Matches finished 3rd on the scoreboard">3rd: ${fmtInt(ffa.third)}</span>
      </span>
    </div>
    <p class="caption">Placements are stored under "FFA" names internally but count
      top scoreboard finishes in every mode (verified by diffing save snapshots
      between sessions). The 3rd-place counter rarely writes - another quirk of
      the game's own tracking.</p>`;
  return `
    <div class="row total-row">
      <span class="row-label">All modes</span>
      <span class="row-value">${fmtInt(total)}</span>
    </div>` + rows + podium;
}

function sortArrow(sort, col) {
  if (sort.col !== col) return "";
  return sort.dir === -1 ? " ▾" : " ▴";
}

function sortRows(rows, sort) {
  const { col, dir } = sort;
  return [...rows].sort((a, b) => {
    const av = a[col], bv = b[col];
    if (typeof av === "string") return dir * av.localeCompare(bv);
    return dir * (av - bv);
  });
}

function renderClassTable() {
  const sort = state.classSort;
  const rows = sortRows(state.model.classRows, sort);
  const head = [
    ["label", "Subclass"], ["archetype", "Class"], ["playtime", "Playtime"],
    ["kills", "Kills"], ["takedowns", "Takedowns"], ["deaths", "Deaths"], ["kd", "K/D"]
  ].map(([col, title]) =>
    `<th data-col="${col}" class="${col === "label" || col === "archetype" ? "left" : "num"}">${title}${sortArrow(sort, col)}</th>`
  ).join("");

  const body = rows.map(r => `
    <tr>
      <td class="left"><b>${r.label}</b></td>
      <td class="left muted">${r.archetype}</td>
      <td class="num">${fmtDuration(r.playtime)}</td>
      <td class="num">${fmtInt(r.kills)}</td>
      <td class="num">${fmtInt(r.takedowns)}</td>
      <td class="num">${fmtInt(r.deaths)}</td>
      <td class="num">${fmtRatio(r.kills, r.deaths)}</td>
    </tr>`).join("");

  return `<table id="class-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`;
}

function renderWeaponTable() {
  const sort = state.weaponSort;
  const all = state.model.weaponRows;
  const search = state.weaponSearch.trim().toLowerCase();

  let rows = all;
  if (state.hideUnused) rows = rows.filter(w => w.kills || w.deaths || w.takedowns);
  if (search) rows = rows.filter(w => w.label.toLowerCase().includes(search));
  rows = sortRows(rows, sort);

  const maxKills = Math.max(1, ...all.map(w => w.kills));
  const head = [
    ["label", "Weapon"], ["kills", "Kills"], ["takedowns", "Takedowns"], ["deaths", "Deaths"]
  ].map(([col, title]) =>
    `<th data-col="${col}" class="${col === "label" ? "left" : "num"}">${title}${sortArrow(sort, col)}</th>`
  ).join("");

  const body = rows.map(w => `
    <tr>
      <td class="left"><b>${w.label}</b></td>
      <td class="num bar-cell">
        <span class="bar-track"><span class="bar" style="width:${(w.kills / maxKills * 100).toFixed(1)}%"></span></span>
        <span class="bar-value">${fmtInt(w.kills)}</span>
      </td>
      <td class="num">${fmtInt(w.takedowns)}</td>
      <td class="num">${fmtInt(w.deaths)}</td>
    </tr>`).join("");

  const caption = `Showing ${rows.length} of ${all.length} weapons` +
    (state.hideUnused ? " (unused hidden)" : "") + ".";

  // The game's own weapon-death tracking is sparse: it appears to log deaths
  // while holding a weapon, and only rarely. Report how much it covers.
  const weaponDeaths = all.reduce((a, w) => a + w.deaths, 0);
  const totalDeaths = state.model.kpis.deaths;
  let deathsNote = "";
  if (totalDeaths > 0) {
    const pct = (weaponDeaths / totalDeaths * 100).toFixed(0);
    deathsNote = `<p class="caption">Note: the Deaths column is a quirk of the game's
      own tracking, not a parsing error - in this file it records only
      ${fmtInt(weaponDeaths)} of ${fmtInt(totalDeaths)} total deaths (~${pct}%),
      and the counts follow the weapons the player uses, so it seems to log
      "deaths while holding this weapon" and to do so only rarely.
      Treat it as a curiosity.</p>`;
  }

  return `<table id="weapon-table"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
    <p class="caption">${caption}</p>${deathsNote}`;
}

function renderOther(rows, challenges) {
  if (!rows.length && !challenges.length) return "";
  const body = rows.map(r => `
    <div class="row">
      <span class="row-label">${r.label}</span>
      <span class="row-value">${fmtInt(r.value)}</span>
    </div>`).join("");

  let challengeBlock = "";
  if (challenges.length) {
    const done = challenges.filter(c => c.value >= 1).length;
    const items = challenges.map(c => {
      const ach = ACHIEVEMENTS[c.key];
      const label = ach
        ? `<span class="row-label ach"><b>${ach[0]}</b><span class="ach-desc">${ach[1]}</span></span>`
        : `<span class="row-label mono">${c.key}</span>`;
      return `
      <div class="row" title="${c.key}">
        ${label}
        <span class="row-value">${c.value >= 1 ? "Complete" : (c.value * 100).toFixed(0) + "%"}</span>
      </div>`;
    }).join("");
    challengeBlock = `
      <details class="challenges">
        <summary>Achievements (${done} of ${challenges.length} completed)</summary>
        ${items}
      </details>`;
  }

  return `
    <section class="card">
      <h2>Everything else</h2>
      ${body}
      ${challengeBlock}
    </section>`;
}

function renderAll() {
  const m = state.model;
  document.getElementById("results").innerHTML = `
    <div class="tiles">${renderKpis(m.kpis)}</div>

    <div class="card-grid">
      <section class="card">
        <h2>Combat</h2>
        ${renderCombat(m.combat)}
      </section>

      <section class="card">
        <h2>Factions</h2>
        ${renderFactions(m.factions)}
        <h2 class="gap">Matches</h2>
        ${renderModes(m.modes, m.matchesTotal, m.ffa)}
      </section>
    </div>

    <section class="card">
      <h2>Class breakdown</h2>
      <div class="table-wrap" id="class-wrap">${renderClassTable()}</div>
    </section>

    <section class="card">
      <h2>Weapon breakdown</h2>
      <div class="controls">
        <input type="search" id="weapon-search" placeholder="Filter weapons..."
          value="${state.weaponSearch}">
        <label class="toggle">
          <input type="checkbox" id="hide-unused" ${state.hideUnused ? "checked" : ""}>
          Hide unused
        </label>
      </div>
      <div class="table-wrap" id="weapon-wrap">${renderWeaponTable()}</div>
    </section>

    ${renderOther(m.other, m.challenges)}
  `;
  wireResultEvents();
}

// ---------- events ----------

function wireSort(wrapId, sortState, rerender) {
  document.getElementById(wrapId).addEventListener("click", e => {
    const th = e.target.closest("th");
    if (!th) return;
    const col = th.dataset.col;
    if (sortState.col === col) {
      sortState.dir = -sortState.dir;
    } else {
      sortState.col = col;
      sortState.dir = col === "label" || col === "archetype" ? 1 : -1;
    }
    rerender();
  });
}

function wireResultEvents() {
  wireSort("class-wrap", state.classSort, () => {
    document.getElementById("class-wrap").innerHTML = renderClassTable();
  });
  wireSort("weapon-wrap", state.weaponSort, () => {
    document.getElementById("weapon-wrap").innerHTML = renderWeaponTable();
  });
  document.getElementById("weapon-search").addEventListener("input", e => {
    state.weaponSearch = e.target.value;
    document.getElementById("weapon-wrap").innerHTML = renderWeaponTable();
  });
  document.getElementById("hide-unused").addEventListener("change", e => {
    state.hideUnused = e.target.checked;
    document.getElementById("weapon-wrap").innerHTML = renderWeaponTable();
  });
}

function loadStats(raw) {
  state.model = groupStats(raw);
  document.getElementById("intro").classList.add("loaded");
  renderAll();
}

function handleFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const bytes = new Uint8Array(reader.result);
    loadStats(parse(bytes));
  };
  reader.readAsArrayBuffer(file);
}

if (typeof document !== "undefined") {
  const input = document.getElementById("file");
  input.addEventListener("change", e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });

  const drop = document.getElementById("dropzone");
  drop.addEventListener("dragover", e => {
    e.preventDefault();
    drop.classList.add("dragging");
  });
  drop.addEventListener("dragleave", () => drop.classList.remove("dragging"));
  drop.addEventListener("drop", e => {
    e.preventDefault();
    drop.classList.remove("dragging");
    if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
  });

  document.getElementById("copy-path").addEventListener("click", e => {
    navigator.clipboard.writeText("%LOCALAPPDATA%\\Chivalry 2\\Saved\\Cloud");
    e.target.textContent = "Copied";
    setTimeout(() => { e.target.textContent = "Copy"; }, 1500);
  });
}

// Allow the grouping logic to be tested in Node
if (typeof module !== "undefined") {
  module.exports = { groupStats, camelToTitle, fmtDuration, fmtCompact, fmtRatio };
}
