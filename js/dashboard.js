document.addEventListener("DOMContentLoaded", () => {
  let user = "Unknown";


document.getElementById("welcomeMessage").innerText = `Welcome, ${user}!`;

  document.getElementById("welcomeMessage").innerText = `Welcome, ${user.name}!`;

  const tasks = JSON.parse(localStorage.getItem("tasks")) || [];
  const now = new Date();

  // === PROJECT SUMMARY CHART ===
  const statusCounts = { todo: 0, 'in-progress': 0, done: 0 };
  tasks.forEach(t => statusCounts[t.status]++);
  const summaryChart = new Chart(document.getElementById("summaryChart"), {
    type: "doughnut",
    data: {
      labels: ["To Do", "In Progress", "Done"],
      datasets: [{
        data: [statusCounts.todo, statusCounts["in-progress"], statusCounts.done],
        backgroundColor: ["#ccc", "#4a90e2", "#7ed957"]
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label;
              const value = context.raw;
              const total = statusCounts.todo + statusCounts["in-progress"] + statusCounts.done;
              const percent = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });

  // === PRODUCTIVITY SCORE ===
  const productivity = tasks.length === 0 ? 0 :
    Math.round((statusCounts.done / tasks.length) * 100);
  document.getElementById("productivityScore").innerText = `${productivity}%`;

  // Compare to last 7 days
  const recentTasks = tasks.filter(t => {
    const date = new Date(t.dueDate);
    return now - date <= 7 * 86400000;
  });
  const recentDone = recentTasks.filter(t => t.status === "done").length;
  const recentProductivity = recentTasks.length
    ? Math.round((recentDone / recentTasks.length) * 100)
    : 0;
  const delta = productivity - recentProductivity;
  const deltaText = delta === 0 ? "↔ No change" : (delta > 0 ? `⬆️ +${delta}%` : `⬇️ ${delta}%`);
  document.getElementById("productivityDelta").innerText = deltaText;

  // === AVG COMPLETION TIME ===
  const completed = tasks.filter(t => t.status === "done");
  let totalTime = 0;
  let min = Infinity;
  let maxDuration = 0;
  completed.forEach(t => {
    const created = new Date(parseInt(t.id));
    const due = new Date(t.dueDate);
    const duration = due - created;
    totalTime += duration;
    if (duration > maxDuration) maxDuration = duration;
    if (duration < min) min = duration;
  });
  const avg = completed.length ? Math.round(totalTime / completed.length / 86400000) : 0;
  document.getElementById("avgCompletion").innerText = `${avg} days`;
  document.getElementById("longestTask").innerText = `Longest: ${Math.round(maxDuration / 86400000) || 0}d`;
  document.getElementById("shortestTask").innerText = `Shortest: ${Math.round(min / 86400000) || 0}d`;

  // === TASK SHORTCUTS ===
  const quickLinks = document.getElementById("quickLinks");
  tasks.slice(0, 5).forEach(t => {
    const li = document.createElement("li");
    const daysLeft = Math.ceil((new Date(t.dueDate) - now) / 86400000);
    const countdown = daysLeft >= 0 ? `⏳ ${daysLeft}d` : `⚠️ Overdue`;
    const priorityIcon = t.priority === "High" ? "🔥" :
                         t.priority === "Medium" ? "⚠️" :
                         "✅";
    li.innerHTML = `<a href="issue.html?id=${t.id}">${priorityIcon} ${t.title} (${countdown})</a>`;
    quickLinks.appendChild(li);
  });

  // === TRENDS === (daily completions)
  const trendData = {};
  for (let i = 6; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const key = date.toISOString().split("T")[0];
    trendData[key] = 0;
  }
  completed.forEach(t => {
    const key = new Date(t.dueDate).toISOString().split("T")[0];
    if (trendData[key] !== undefined) trendData[key]++;
  });

  const trendValues = Object.values(trendData);
  const trendLabels = Object.keys(trendData);
  const max = Math.max(...trendValues);
  const peakIndex = trendValues.indexOf(max);

  new Chart(document.getElementById("trendChart"), {
    type: "line",
    data: {
      labels: trendLabels,
      datasets: [{
        label: "Completed",
        data: trendValues,
        fill: false,
        borderColor: "#4a90e2",
        backgroundColor: "#4a90e2",
        tension: 0.3,
        pointRadius: trendValues.map((_, i) => i === peakIndex ? 6 : 3),
        pointBackgroundColor: trendValues.map((_, i) => i === peakIndex ? "#4caf50" : "#4a90e2"),
        pointHoverRadius: 7
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            afterLabel: function (context) {
              if (context.dataIndex === peakIndex) {
                return "🟩 Highest Day";
              }
            }
          }
        }
      }
    }
  });

  // === TEAM STATS ===
  const teamData = {};
  tasks.forEach(t => {
    const cat = t.category || "Uncategorized";
    teamData[cat] = (teamData[cat] || 0) + 1;
  });
  const teamTotal = Object.values(teamData).reduce((a, b) => a + b, 0);
  const teamChart = new Chart(document.getElementById("teamChart"), {
    type: "bar",
    data: {
      labels: Object.keys(teamData),
      datasets: [{
        label: "Tasks per Category",
        data: Object.values(teamData),
        backgroundColor: "#f9a825"
      }]
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function (ctx) {
              const value = ctx.raw;
              const percent = ((value / teamTotal) * 100).toFixed(1);
              return `${ctx.label}: ${value} (${percent}%)`;
            }
          }
        }
      }
    }
  });
});
