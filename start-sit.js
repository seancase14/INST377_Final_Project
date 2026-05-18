const API_KEY  = "238ff3a5ccmshdd69f623fa3f532p1d316bjsn8d9e01da3064";
const API_HOST = "tank01-nfl-live-in-game-real-time-statistics-nfl.p.rapidapi.com";
const BASE_URL = "https://" + API_HOST;

const OPTIONS = {
method: "GET",
headers: {
    "X-RapidAPI-Key":  API_KEY,
    "X-RapidAPI-Host": API_HOST
}
};

// Initialize supabase
const supabaseClient = supabase.createClient("https://rgsmaqqmagqqdpkipist.supabase.co", "sb_publishable_R-yeVq0HOzoUnjebGIWg7g_w_rB5KAt");

// Create array of NFL skill position players
var allPlayers = [];
fetch(BASE_URL + "/getNFLPlayerList", OPTIONS)
.then(res => res.json())
.then(data => {
    allPlayers = (data.body).filter(function(p) {
    return p.pos === "QB" || p.pos === "RB" || p.pos === "WR" || p.pos === "TE";
    });
    populateSelect("select-a", allPlayers);
    populateSelect("select-b", allPlayers);
})

// Add players to select options
function populateSelect(selId, players) {
    const sel = document.getElementById(selId);
    const currentVal = sel.value;
    sel.innerHTML = "<option value=''>Select Player</option>";
    players.forEach(function(p) {
        const label = p.longName + " (" + p.pos + ", " + p.team + ")";
        sel.add(new Option(label, p.playerID));
    });
    if (currentVal) sel.value = currentVal;
}

// Filter dropdown list based on search bar
function filterSelect(selId, query) {
    const filtered = query.trim() === ""
        ? allPlayers
        : allPlayers.filter(function(p) {
            return p.longName.toLowerCase().indexOf(query.toLowerCase()) !== -1;
        });
    populateSelect(selId, filtered);
}

// Compare players based on stats
function compare() {
    const idA = document.getElementById("select-a").value;
    const idB = document.getElementById("select-b").value;

    if (!idA || !idB) { alert("Please select both players."); return; }
    if (idA === idB)  { alert("Please select two different players."); return; }

    setLoading(true);
    document.getElementById("player-box").style.display = "none";
    document.getElementById("recommendation").style.display = "none";

    Promise.all([
        fetchPlayerInfo(idA),
        fetchPlayerInfo(idB),
        fetchPlayerGames(idA),
        fetchPlayerGames(idB)
    ])
    .then(function(results) {
        const infoA  = results[0];
        const infoB  = results[1];
        const gamesA = results[2];
        const gamesB = results[3];

        const statsA = buildStats(infoA, gamesA);
        const statsB = buildStats(infoB, gamesB);

        const scoreA = statsA.seasonAvg;
        const scoreB = statsB.seasonAvg;

        getStats("player-a", infoA, statsA, scoreA >= scoreB ? "start" : "sit");
        getStats("player-b", infoB, statsB, scoreB >  scoreA ? "start" : "sit");
        getRecommendation(infoA, infoB, statsA, statsB, scoreA, scoreB);

        document.getElementById("player-box").style.display = "grid";
        document.getElementById("recommendation").style.display = "block";

        const starter = scoreA >= scoreB ? infoA : infoB;
        
        // Add record of all comparisons to supabase
        supabaseClient.from("comparisons").insert({
            player_a:       infoA.longName,
            player_b:       infoB.longName,
            recommendation: starter.longName,
            score_a:        scoreA.toFixed(1),
            score_b:        scoreB.toFixed(1),
            compared_at:    new Date().toISOString()
        })
        .then(function(result) {
            console.log("saved: ", result);
        });
    })
    .then(function() {
        setLoading(false);
    });
}

// Get player info from the API
function fetchPlayerInfo(playerID) {
    return fetch(BASE_URL + "/getNFLPlayerInfo?playerID=" + playerID + "&getStats=true", OPTIONS)
        .then(function(res) { return res.json(); })
        .then(function(data) {
        const body = data.body;
        return (Array.isArray(body) ? body[0] : body) || {};
        });
}

// Get info of player's games
function fetchPlayerGames(playerID) {
    return fetch(BASE_URL + "/getNFLGamesForPlayer?playerID=" + playerID + "&fantasyPoints=true&season=2025", OPTIONS)
        .then(function(res) { return res.json(); })
        .then(function(data) {
        console.log("games for " + playerID + ":", data);
        const body = data.body;
        if (!body) return [];
        return Object.entries(body).map(function(entry) {
            const gameID = entry[0];
            const game   = entry[1];
            game.gameID  = gameID;
            return game;
        });
        })
        .then(function(games) {
        if (games.length) console.log("first game object:", JSON.stringify(games[0]));
        return games;
        })
}

// Get specific stats from the API
function buildStats(info, games) {
    // Sort games by date
    const sorted = games
        .filter(function(g) { return g && g.gameID; })
        .sort(function(a, b) { return b.gameID > a.gameID ? 1 : -1; });

    // Get famtasy points for a specific player
    function getFpts(g) {
        return parseFloat(
        (g.fantasyPointsDefault && g.fantasyPointsDefault.halfPPR) || g.fantasyPoints);
    }

    const last3 = sorted.slice(0, 3).map(getFpts);

    const allPts = sorted.map(getFpts);

    let seasonAvg = 0;
    if (allPts.length > 0) {
        let total = allPts.reduce(function(a, b) {
            return a + b;
        }, 0);

        seasonAvg = total / allPts.length;
    }

    let recentAvg = 0;
    if (last3.length > 0) {
        let total = 0;

    for (let i = 0; i < last3.length; i++) {
        total += last3[i];
    }
    recentAvg = total / last3.length;
    }

    return {
        last3:     last3,
        seasonAvg: seasonAvg,
        recentAvg: recentAvg,
        games:     allPts.length
    };
}

// Get player stats and display them
function getStats(elId, info, stats, verdict) {
    const el = document.getElementById(elId);
    el.className = "card " + verdict + " animate__animated animate__fadeInUp";

    let pointsHtml = "";
    if (stats.last3.length > 0) {
        let points = [];
        for (let i = 0; i < stats.last3.length; i++) {
            let value = stats.last3[i];
            points.push("<span class='point'>" + value.toFixed(1) + "</span>");
        }
        pointsHtml = points.join("");
    } else {
        pointsHtml = "<span class='point'>—</span>";
    }

    el.innerHTML =
        "<h3>" + (info.longName) + "</h3>" +
        "<div class='info'>" + (info.pos) + " · " + (info.team) + " · #" + (info.jerseyNum) + "</div>" +
        "<div class='stat'>Season Avg: " + stats.seasonAvg.toFixed(1) + " pts/game</div>" +
        "<div class='stat'>Recent Avg (Last 3 games): " + stats.recentAvg.toFixed(1) + " pts/game</div>" +
        "<div class='stat' style='flex-direction:column;gap:6px'>Last 3 Games<div class='points'>" + pointsHtml + "</div></div>" +
        "<div class='stat'>Games Played " + (stats.games - 1) + "</div>" + "<canvas id='chart-" + elId + "' style='margin-top:1rem;'></canvas>";
 
    var labels = stats.last3.map(function(_, i) { return "Game " + (stats.last3.length - i); });
 
    new Chart(document.getElementById("chart-" + elId), {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: "Fantasy Points",
          data: stats.last3,
          backgroundColor: verdict === "start" ? "blue" : "lightgray"
        }]
      },
      options: {
        plugins: { legend: { display: false } },
        scales: {
          y: { beginAtZero: true, title: { display: true, text: "Pts" } }
        }
      }
    });
  }

// Logic for recommendation
function getRecommendation(infoA, infoB, statsA, statsB, scoreA, scoreB) {
    const starter      = scoreA >= scoreB ? infoA  : infoB;
    const starterStats = scoreA >= scoreB ? statsA : statsB;
    const bench        = scoreA >= scoreB ? infoB  : infoA;
    const diff         = Math.abs(scoreA - scoreB).toFixed(1);

    document.getElementById("recommendation").innerHTML =
        "<strong>Start " + starter.longName + "</strong> — " +
        diff + " more pts/game on average this season. " +
        "Recent avg: " + starterStats.recentAvg.toFixed(1) + " pts. " +
        "Bench " + bench.longName + ".";
    }

// Add loading logic when API is called
function setLoading(on) {
    document.getElementById("loading").style.display = on ? "block" : "none";
    document.getElementById("calculate").disabled = on;
}
