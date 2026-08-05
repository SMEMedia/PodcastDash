const overallCsvPath = "extracted_libsyn/Advanced Manufacturing Now.csv";
const episodeCsvPath = "extracted_libsyn/Advanced Manufacturing Now- By Episode.csv";

const state = {
  overall: null,
  episodes: [],
  range: "365",
  metric: "iab",
  query: "",
};

const fmt = new Intl.NumberFormat("en-US");
const dateFmt = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" });
const monthFmt = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric", timeZone: "UTC" });

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && quoted && next === '"') {
      cell += '"';
      i += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      if (row.some((value) => value.trim() !== "")) rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    if (row.some((value) => value.trim() !== "")) rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  return Number(String(value || "0").replace(/,/g, "")) || 0;
}

function parseOverall(rows) {
  const total = {
    iab: toNumber(rows[1]?.[1]),
    unique: toNumber(rows[1]?.[2]),
  };
  const sections = { daily: [], weekly: [], monthly: [] };
  let active = null;

  for (const row of rows.slice(2)) {
    const key = row[0];
    if (key === "Daily Downloads") active = "daily";
    else if (key === "Weekly Downloads") active = "weekly";
    else if (key === "Monthly Downloads") active = "monthly";
    else if (active && key) {
      sections[active].push({
        date: key,
        iab: toNumber(row[1]),
        unique: toNumber(row[2]),
      });
    }
  }

  for (const values of Object.values(sections)) {
    values.sort((a, b) => a.date.localeCompare(b.date));
  }

  return { total, ...sections };
}

function parseEpisodes(rows) {
  return rows.slice(1).map((row) => ({
    title: row[0],
    release: row[1],
    iab: toNumber(row[2]),
    unique: toNumber(row[3]),
  })).sort((a, b) => new Date(b.release) - new Date(a.release));
}

function selectedDaily() {
  if (state.range === "all") return state.overall.daily;
  const days = Number(state.range);
  const maxDate = new Date(`${state.overall.daily.at(-1).date}T00:00:00`);
  const minDate = new Date(maxDate);
  minDate.setDate(maxDate.getDate() - days + 1);
  return state.overall.daily.filter((row) => new Date(`${row.date}T00:00:00`) >= minDate);
}

function sumRows(rows, metric = state.metric) {
  return rows.reduce((sum, row) => sum + row[metric], 0);
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  }[char]));
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function renderKpis() {
  const daily = selectedDaily();
  const latest = state.overall.daily.at(-1);
  const first = state.overall.daily[0];
  const newestEpisode = state.episodes[0];
  const avg = daily.length ? Math.round(sumRows(daily) / daily.length) : 0;

  setText("totalIab", fmt.format(state.overall.total.iab));
  setText("totalIabNote", `${dateFmt.format(new Date(`${first.date}T00:00:00`))} to ${dateFmt.format(new Date(`${latest.date}T00:00:00`))}`);
  setText("totalUnique", fmt.format(state.overall.total.unique));
  setText("totalUniqueNote", `${Math.round((state.overall.total.unique / Math.max(state.overall.total.iab, 1)) * 100)}% of IAB total`);
  setText("rangeTotal", fmt.format(sumRows(daily)));
  setText("rangeNote", `${fmt.format(avg)} average ${state.metric === "iab" ? "IAB" : "unique"} downloads per day`);
  setText("episodeCount", fmt.format(state.episodes.length));
  setText("episodeNote", `Latest release: ${dateFmt.format(new Date(newestEpisode.release))}`);
}

function linePath(rows, key, width, height, pad) {
  const max = Math.max(...rows.flatMap((row) => [row.iab, row.unique]), 1);
  return rows.map((row, index) => {
    const x = pad.left + (index / Math.max(rows.length - 1, 1)) * (width - pad.left - pad.right);
    const y = pad.top + (1 - row[key] / max) * (height - pad.top - pad.bottom);
    return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(" ");
}

function areaPath(rows, key, width, height, pad) {
  const line = linePath(rows, key, width, height, pad);
  const baseY = height - pad.bottom;
  const startX = pad.left;
  const endX = width - pad.right;
  return `${line} L${endX},${baseY} L${startX},${baseY} Z`;
}

function renderLineChart() {
  const rows = selectedDaily();
  const width = 920;
  const height = 520;
  const pad = { top: 22, right: 28, bottom: 42, left: 52 };
  const max = Math.max(...rows.flatMap((row) => [row.iab, row.unique]), 1);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((ratio) => {
    const y = pad.top + ratio * (height - pad.top - pad.bottom);
    const value = Math.round(max * (1 - ratio));
    return `<line class="axis" x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}"></line><text x="8" y="${y + 4}" fill="#68746f" font-size="12">${fmt.format(value)}</text>`;
  }).join("");
  const first = rows[0];
  const last = rows.at(-1);

  document.getElementById("trendSubtitle").textContent = `${dateFmt.format(new Date(`${first.date}T00:00:00`))} to ${dateFmt.format(new Date(`${last.date}T00:00:00`))}`;
  document.getElementById("dailyChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Daily download trend">
      ${grid}
      <path class="area-iab" d="${areaPath(rows, "iab", width, height, pad)}"></path>
      <path class="line-iab" d="${linePath(rows, "iab", width, height, pad)}"></path>
      <path class="line-unique" d="${linePath(rows, "unique", width, height, pad)}"></path>
      <text x="${pad.left}" y="${height - 12}" fill="#68746f" font-size="12">${first.date}</text>
      <text x="${width - pad.right - 78}" y="${height - 12}" fill="#68746f" font-size="12">${last.date}</text>
    </svg>
  `;
}

function renderMonthlyChart() {
  const rows = state.overall.monthly.slice(-18);
  const width = 520;
  const height = 255;
  const pad = { top: 18, right: 14, bottom: 34, left: 44 };
  const max = Math.max(...rows.map((row) => row[state.metric]), 1);
  const barWidth = (width - pad.left - pad.right) / rows.length;
  const bars = rows.map((row, index) => {
    const value = row[state.metric];
    const h = (value / max) * (height - pad.top - pad.bottom);
    const x = pad.left + index * barWidth + 3;
    const y = height - pad.bottom - h;
    return `<rect x="${x}" y="${y}" width="${Math.max(5, barWidth - 6)}" height="${h}" rx="3" fill="${state.metric === "iab" ? "#0f766e" : "#c2410c"}"><title>${row.date}: ${fmt.format(value)}</title></rect>`;
  }).join("");
  const labels = [rows[0], rows.at(-1)].map((row, index) => {
    const x = index === 0 ? pad.left : width - pad.right - 70;
    return `<text x="${x}" y="${height - 10}" fill="#68746f" font-size="12">${monthFmt.format(new Date(`${row.date}-01T00:00:00Z`))}</text>`;
  }).join("");

  document.getElementById("monthlyChart").innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly downloads">
      <line class="axis" x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}"></line>
      <text x="5" y="${pad.top + 10}" fill="#68746f" font-size="12">${fmt.format(max)}</text>
      ${bars}
      ${labels}
    </svg>
  `;
}

function renderBars(id, rows, options = {}) {
  const metric = options.metric || state.metric;
  const max = Math.max(...rows.map((row) => row[metric]), 1);
  document.getElementById(id).innerHTML = rows.map((row) => {
    const pct = Math.max(2, (row[metric] / max) * 100);
    const label = options.label ? options.label(row) : row.date;
    return `
      <div class="bar-row">
        <div class="bar-label" title="${escapeHtml(label)}">${escapeHtml(label)}</div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%"></div></div>
        <div class="bar-value">${fmt.format(row[metric])}</div>
      </div>
    `;
  }).join("");
}

function renderEpisodeBars() {
  const top = [...state.episodes].sort((a, b) => b[state.metric] - a[state.metric]).slice(0, 8);
  document.getElementById("episodeBars").innerHTML = top.map((episode) => `
    <div class="bar-row">
      <div class="episode-title">
        <strong title="${escapeHtml(episode.title)}">${escapeHtml(episode.title)}</strong>
        <span>${dateFmt.format(new Date(episode.release))}</span>
      </div>
      <div class="bar-value">${fmt.format(episode[state.metric])}</div>
    </div>
  `).join("");
}

function renderTable() {
  const query = state.query.trim().toLowerCase();
  const rows = state.episodes.filter((episode) => {
    return !query || `${episode.title} ${episode.release}`.toLowerCase().includes(query);
  }).slice(0, 150);

  document.getElementById("tableNote").textContent = `${fmt.format(rows.length)} visible of ${fmt.format(state.episodes.length)} episodes`;
  document.getElementById("episodeTable").innerHTML = rows.map((episode) => `
    <tr>
      <td>${escapeHtml(episode.title)}</td>
      <td>${dateFmt.format(new Date(episode.release))}</td>
      <td>${fmt.format(episode.iab)}</td>
      <td>${fmt.format(episode.unique)}</td>
    </tr>
  `).join("");
}

function render() {
  renderKpis();
  renderLineChart();
  renderMonthlyChart();
  renderBars("weeklyBars", [...state.overall.weekly].sort((a, b) => b[state.metric] - a[state.metric]).slice(0, 10));
  renderEpisodeBars();
  renderTable();
}

async function init() {
  document.getElementById("rangeSelect").addEventListener("change", (event) => {
    state.range = event.target.value;
    render();
  });
  document.getElementById("metricSelect").addEventListener("change", (event) => {
    state.metric = event.target.value;
    render();
  });
  document.getElementById("episodeSearch").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderTable();
  });

  try {
    const [overallText, episodeText] = await Promise.all([
      fetch(overallCsvPath).then((response) => response.text()),
      fetch(episodeCsvPath).then((response) => response.text()),
    ]);
    state.overall = parseOverall(parseCsv(overallText));
    state.episodes = parseEpisodes(parseCsv(episodeText));
    render();
  } catch (error) {
    document.querySelector(".shell").innerHTML = `<div class="error">Could not load the CSV files. Start a local server from this folder and reopen the dashboard.</div>`;
    console.error(error);
  }
}

init();
