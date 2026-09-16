```javascript
/* =========================================================
   SUNDAY SUPER LEAGUE
   SEASON 2
   MYSQL + PHP API VERSION
========================================================= */


const API_BASE = "./api/api.php";


const state = {

    teams: [],

    fixtures: [],

    results: {},

    matchFilter: "all",

    roundFilter: "all",

    currentView: "dashboard",

    adminUnlocked: false

};


/* =========================================================
   API
========================================================= */

async function api(endpoint = "", options = {}) {

    const response = await fetch(
        API_BASE + endpoint,
        {
            ...options,

            headers: {
                "Content-Type": "application/json",

                ...(options.headers || {})
            }
        }
    );


    let data;

    try {

        data = await response.json();

    } catch {

        throw new Error(
            "Invalid server response."
        );

    }


    if (!response.ok || data.success === false) {

        throw new Error(
            data.message ||
            "Server request failed."
        );

    }


    return data;

}


/* =========================================================
   LOAD DATA
========================================================= */

async function loadData() {

    try {

        const teamData =
            await api("/teams");


        const matchData =
            await api("/matches");


        state.teams =
            teamData.teams;


        state.fixtures =
            matchData.matches;


        state.results = {};


        state.fixtures.forEach(
            match => {

                if (
                    match.status === "COMPLETED" &&
                    match.home_score !== null &&
                    match.away_score !== null
                ) {

                    state.results[match.id] = {

                        home:
                            Number(match.home_score),

                        away:
                            Number(match.away_score),

                        date:
                            match.match_date

                    };

                }

            }
        );


        renderAll();


        populateAdminFixtures();


        createRoundButtons();


    } catch (error) {

        console.error(error);

        showConnectionError(
            error.message
        );

    }

}


/* =========================================================
   CONNECTION ERROR
========================================================= */

function showConnectionError(message) {

    const dashboard =
        document.getElementById(
            "dashboardView"
        );


    if (!dashboard) return;


    const error =
        document.createElement("div");


    error.className =
        "connection-error";


    error.innerHTML = `

        <h3>
            Database Connection Error
        </h3>

        <p>
            ${message}
        </p>

        <p>
            Please check your PHP API and MySQL
            configuration.
        </p>

    `;


    dashboard.prepend(error);

}


/* =========================================================
   TEAM
========================================================= */

function getTeam(id) {

    return state.teams.find(
        team => team.id === id
    );

}


/* =========================================================
   LOGO
========================================================= */

function teamLogo(team, extraClass = "") {

    if (!team) return "";


    return `

        <img
            class="team-logo ${extraClass}"
            src="${escapeHTML(team.logo_url || "")}"
            alt="${escapeHTML(team.name)}"
            onerror="this.style.display='none'"
        >

    `;

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {

        return "";

    }


    return String(value)

        .replaceAll("&", "&amp;")

        .replaceAll("<", "&lt;")

        .replaceAll(">", "&gt;")

        .replaceAll('"', "&quot;")

        .replaceAll("'", "&#039;");

}


/* =========================================================
   DATE
========================================================= */

function formatDate(date) {

    if (!date) return "-";


    const parts =
        String(date).split("-");


    if (parts.length !== 3) {

        return date;

    }


    return `${parts[2]}-${parts[1]}-${parts[0]}`;

}


/* =========================================================
   STANDINGS
========================================================= */

function calculateStandings() {

    const table = {};


    state.teams.forEach(team => {

        table[team.id] = {

            id: team.id,

            player: team.player,

            name: team.name,

            short_code:
                team.short_code,

            logo_url:
                team.logo_url,

            mp: 0,

            w: 0,

            d: 0,

            l: 0,

            gf: 0,

            ga: 0,

            gd: 0,

            pts: 0

        };

    });


    Object.entries(
        state.results
    ).forEach(
        ([matchId, result]) => {

            const match =
                state.fixtures.find(
                    item =>
                        item.id === matchId
                );


            if (!match) return;


            const home =
                table[match.home_team_id];


            const away =
                table[match.away_team_id];


            if (!home || !away) return;


            const homeScore =
                Number(result.home);


            const awayScore =
                Number(result.away);


            home.mp++;
            away.mp++;


            home.gf += homeScore;
            home.ga += awayScore;


            away.gf += awayScore;
            away.ga += homeScore;


            if (homeScore > awayScore) {

                home.w++;

                home.pts += 3;

                away.l++;

            }

            else if (
                homeScore < awayScore
            ) {

                away.w++;

                away.pts += 3;

                home.l++;

            }

            else {

                home.d++;

                away.d++;

                home.pts++;

                away.pts++;

            }

        }
    );


    Object.values(table)
        .forEach(team => {

            team.gd =
                team.gf - team.ga;

        });


    return Object.values(table)
        .sort(
            (a, b) =>

                b.pts - a.pts ||

                b.gd - a.gd ||

                b.gf - a.gf ||

                a.ga - b.ga
        );

}


/* =========================================================
   RENDER ALL
========================================================= */

function renderAll() {

    renderDashboard();

    renderLeagueTable();

    renderMatches();

    renderFixtures();

    renderStatistics();

    renderTeams();

    renderInter();

    renderChampion();

}


/* =========================================================
   DASHBOARD
========================================================= */

function renderDashboard() {

    const total =
        state.fixtures.length;


    const completed =
        Object.keys(
            state.results
        ).length;


    let goals = 0;


    Object.values(
        state.results
    ).forEach(result => {

        goals +=
            Number(result.home) +
            Number(result.away);

    });


    setText(
        "completedMatches",
        completed
    );


    setText(
        "totalMatches",
        total
    );


    setText(
        "totalGoals",
        goals
    );


    const percent =
        total > 0
            ? Math.round(
                completed / total * 100
            )
            : 0;


    setText(
        "completionPercent",
        `${percent}%`
    );


    const progress =
        document.getElementById(
            "progress"
        );


    if (progress) {

        progress.style.width =
            `${percent}%`;

    }


    const standings =
        calculateStandings();


    const leader =
        standings[0];


    if (leader && leader.mp > 0) {

        setText(
            "topTeam",
            `${leader.name} · ${leader.player} · ${leader.pts} pts`
        );

    }

    else {

        setText(
            "topTeam",
            "No results yet"
        );

    }


    const completedMatches =
        state.fixtures.filter(
            match =>
                state.results[match.id]
        );


    const latest =
        completedMatches.length
            ? completedMatches[
                completedMatches.length - 1
            ]
            : null;


    if (latest) {

        const result =
            state.results[latest.id];


        setText(
            "latestResult",

            `${latest.home_name} ${result.home} - ${result.away} ${latest.away_name} · ${formatDate(result.date)}`
        );

    }

    else {

        setText(
            "latestResult",
            "No completed matches"
        );

    }


    const next =
        state.fixtures.find(
            match =>
                !state.results[match.id]
        );


    if (next) {

        setText(
            "nextMatch",

            `M${String(next.match_number).padStart(3, "0")} · ${next.home_name} vs ${next.away_name}`
        );

    }

    else {

        setText(
            "nextMatch",
            "All matches completed"
        );

    }

}


/* =========================================================
   LEAGUE TABLE
========================================================= */

function renderLeagueTable() {

    const tbody =
        document.getElementById(
            "leagueTableBody"
        );


    if (!tbody) return;


    const standings =
        calculateStandings();


    tbody.innerHTML = "";


    standings.forEach(
        (team, index) => {

            const row =
                document.createElement("tr");


            row.innerHTML = `

                <td>
                    ${index + 1}
                </td>

                <td>

                    <div class="team-cell">

                        ${teamLogo(team)}

                        <div>

                            <strong>
                                ${escapeHTML(team.name)}
                            </strong>

                            <small>
                                ${escapeHTML(team.player)}
                            </small>

                        </div>

                    </div>

                </td>

                <td>${team.mp}</td>

                <td>${team.w}</td>

                <td>${team.d}</td>

                <td>${team.l}</td>

                <td>${team.gf}</td>

                <td>${team.ga}</td>

                <td>${team.gd}</td>

                <td>
                    <strong>
                        ${team.pts}
                    </strong>
                </td>

            `;


            tbody.appendChild(row);

        }
    );

}


/* =========================================================
   MATCHES
========================================================= */

function renderMatches() {

    const container =
        document.getElementById(
            "matchesList"
        );


    if (!container) return;


    let matches =
        [...state.fixtures];


    if (
        state.matchFilter ===
        "completed"
    ) {

        matches =
            matches.filter(
                match =>
                    state.results[match.id]
            );

    }


    if (
        state.matchFilter ===
        "upcoming"
    ) {

        matches =
            matches.filter(
                match =>
                    !state.results[match.id]
            );

    }


    container.innerHTML = "";


    matches.forEach(match => {

        const result =
            state.results[match.id];


        const home =
            getTeam(
                match.home_team_id
            );


        const away =
            getTeam(
                match.away_team_id
            );


        const card =
            document.createElement(
                "div"
            );


        card.className =
            "match-card";


        card.innerHTML = `

            <div class="match-round">
                Round ${match.round_number}
                · Match ${match.match_number}
            </div>


            <div class="match-teams">

                <div class="match-team">

                    ${teamLogo(home)}

                    <span>
                        ${escapeHTML(match.home_name)}
                    </span>

                </div>


                <div class="match-score">

                    ${
                        result
                            ? `${result.home} - ${result.away}`
                            : "VS"
                    }

                </div>


                <div class="match-team">

                    <span>
                        ${escapeHTML(match.away_name)}
                    </span>

                    ${teamLogo(away)}

                </div>

            </div>


            <div class="match-date">

                ${
                    result
                        ? formatDate(result.date)
                        : "Upcoming"
                }

            </div>

        `;


        container.appendChild(card);

    });

}


/* =========================================================
   ROUND BUTTONS
========================================================= */

function createRoundButtons() {

    const container =
        document.getElementById(
            "roundButtons"
        );


    if (!container) return;


    const rounds =
        [
            ...new Set(
                state.fixtures.map(
                    match =>
                        match.round_number
                )
            )
        ]
        .sort(
            (a, b) => a - b
        );


    container.innerHTML = "";


    rounds.forEach(round => {

        const button =
            document.createElement(
                "button"
            );


        button.className =
            "round-btn";


        button.dataset.round =
            round;


        button.textContent =
            `Round ${round}`;


        container.appendChild(button);

    });

}


/* =========================================================
   FIXTURES
========================================================= */

function renderFixtures() {

    const container =
        document.getElementById(
            "fixturesList"
        );


    if (!container) return;


    let matches =
        [...state.fixtures];


    if (
        state.roundFilter !==
        "all"
    ) {

        matches =
            matches.filter(
                match =>
                    String(
                        match.round_number
                    ) ===
                    String(
                        state.roundFilter
                    )
            );

    }


    container.innerHTML = "";


    matches.forEach(match => {

        const result =
            state.results[match.id];


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "fixture-row";


        row.innerHTML = `

            <span>
                M${String(
                    match.match_number
                ).padStart(3, "0")}
            </span>


            <span>
                ${escapeHTML(
                    match.home_name
                )}
            </span>


            <strong>

                ${
                    result
                        ? `${result.home} - ${result.away}`
                        : "VS"
                }

            </strong>


            <span>
                ${escapeHTML(
                    match.away_name
                )}
            </span>


            <span>

                ${
                    result
                        ? formatDate(
                            result.date
                        )
                        : "Upcoming"
                }

            </span>

        `;


        container.appendChild(row);

    });

}


/* =========================================================
   STATISTICS
========================================================= */

function renderStatistics() {

    const standings =
        calculateStandings();


    if (!standings.length) return;


    const mostGoals =
        [...standings]
            .sort(
                (a, b) =>
                    b.gf - a.gf
            )[0];


    const mostConceded =
        [...standings]
            .sort(
                (a, b) =>
                    b.ga - a.ga
            )[0];


    const bestDefence =
        [...standings]
            .sort(
                (a, b) =>
                    a.ga - b.ga
            )[0];


    const bestGD =
        [...standings]
            .sort(
                (a, b) =>
                    b.gd - a.gd
            )[0];


    setText(
        "mostGoals",

        mostGoals
            ? `${mostGoals.name} (${mostGoals.gf})`
            : "-"
    );


    setText(
        "mostConceded",

        mostConceded
            ? `${mostConceded.name} (${mostConceded.ga})`
            : "-"
    );


    setText(
        "leastConceded",

        bestDefence
            ? `${bestDefence.name} (${bestDefence.ga})`
            : "-"
    );


    setText(
        "bestGD",

        bestGD
            ? `${bestGD.name} (${bestGD.gd})`
            : "-"
    );

}


/* =========================================================
   TEAMS
========================================================= */

function renderTeams() {

    const container =
        document.getElementById(
            "teamsList"
        );


    if (!container) return;


    container.innerHTML = "";


    state.teams.forEach(team => {

        const card =
            document.createElement(
                "div"
            );


        card.className =
            "team-card";


        card.innerHTML = `

            ${teamLogo(team)}


            <h3>
                ${escapeHTML(team.name)}
            </h3>


            <p>
                Player:
                ${escapeHTML(team.player)}
            </p>


            <span>
                ${escapeHTML(team.short_code)}
            </span>

        `;


        container.appendChild(card);

    });

}


/* =========================================================
   INTER MILAN
========================================================= */

function renderInter() {

    const container =
        document.getElementById(
            "interFixtures"
        );


    if (!container) return;


    const matches =
        state.fixtures.filter(
            match =>
                match.home_team_id === "inter" ||
                match.away_team_id === "inter"
        );


    container.innerHTML = "";


    matches.forEach(match => {

        const result =
            state.results[match.id];


        let outcome =
            "Upcoming";


        if (result) {

            const isHome =
                match.home_team_id ===
                "inter";


            const interScore =
                isHome
                    ? result.home
                    : result.away;


            const opponentScore =
                isHome
                    ? result.away
                    : result.home;


            if (
                interScore >
                opponentScore
            ) {

                outcome = "WIN";

            }

            else if (
                interScore ===
                opponentScore
            ) {

                outcome = "DRAW";

            }

            else {

                outcome = "LOSS";

            }

        }


        const row =
            document.createElement(
                "div"
            );


        row.className =
            "fixture-row";


        row.innerHTML = `

            <span>
                M${match.match_number}
            </span>


            <span>
                ${escapeHTML(
                    match.home_name
                )}
            </span>


            <strong>

                ${
                    result
                        ? `${result.home} - ${result.away}`
                        : "VS"
                }

            </strong>


            <span>
                ${escapeHTML(
                    match.away_name
                )}
            </span>


            <span>
                ${outcome}
            </span>

        `;


        container.appendChild(row);

    });

}


/* =========================================================
   CHAMPION
========================================================= */

function renderChampion() {

    const container =
        document.getElementById(
            "champion"
        );


    if (!container) return;


    const total =
        state.fixtures.length;


    const completed =
        Object.keys(
            state.results
        ).length;


    if (
        completed <
        total
    ) {

        container.innerHTML = `

            <div class="panel">

                <h3>
                    Champion Not Declared
                </h3>

                <p>
                    All ${total} matches must be
                    completed before the champion
                    is declared.
                </p>

                <p>
                    Completed:
                    ${completed}/${total}
                </p>

            </div>

        `;

        return;

    }


    const champion =
        calculateStandings()[0];


    if (!champion) return;


    container.innerHTML = `

        <div class="champion-card">

            ${teamLogo(
                champion,
                "champion-logo"
            )}

            <h2>
                ${escapeHTML(
                    champion.name
                )}
            </h2>

            <p>
                ${escapeHTML(
                    champion.player
                )}
            </p>

            <strong>
                ${champion.pts} Points
            </strong>

        </div>

    `;

}


/* =========================================================
   ADMIN
========================================================= */

function openAdmin() {

    const modal =
        document.getElementById(
            "adminModal"
        );


    if (!modal) return;


    modal.classList.add("show");


    if (state.adminUnlocked) {

        showAdminPanel();

    }

    else {

        showAdminLogin();

    }

}


function closeAdmin() {

    const modal =
        document.getElementById(
            "adminModal"
        );


    if (modal) {

        modal.classList.remove(
            "show"
        );

    }

}


function showAdminLogin() {

    document.getElementById(
        "adminLogin"
    ).style.display = "block";


    document.getElementById(
        "adminPanel"
    ).style.display = "none";

}


function showAdminPanel() {

    document.getElementById(
        "adminLogin"
    ).style.display = "none";


    document.getElementById(
        "adminPanel"
    ).style.display = "block";

}


/* =========================================================
   ADMIN LOGIN
========================================================= */

async function unlockAdmin() {

    const pin =
        document.getElementById(
            "adminPin"
        ).value;


    const error =
        document.getElementById(
            "adminError"
        );


    if (!pin) {

        error.textContent =
            "Enter the administrator PIN.";

        return;

    }


    /*
       The simple API version uses the
       admin PIN stored server-side.

       Do not put the PIN into this JS file.
    */

    try {

        const result =
            await api(
                "/login",
                {
                    method: "POST",

                    body:
                        JSON.stringify({
                            pin: pin
                        })
                }
            );


        if (result.success) {

            state.adminUnlocked =
                true;


            error.textContent = "";


            showAdminPanel();


            populateAdminFixtures();

        }

    }

    catch (err) {

        error.textContent =
            err.message ||
            "Invalid PIN.";

    }

}


/* =========================================================
   LOGOUT
========================================================= */

function logoutAdmin() {

    state.adminUnlocked =
        false;


    document.getElementById(
        "adminPin"
    ).value = "";


    showAdminLogin();

}


/* =========================================================
   ADMIN FIXTURES
========================================================= */

function populateAdminFixtures() {

    const select =
        document.getElementById(
            "adminFixture"
        );


    if (!select) return;


    select.innerHTML = `

        <option value="">
            Select Match
        </option>

    `;


    state.fixtures.forEach(
        match => {

            const option =
                document.createElement(
                    "option"
                );


            option.value =
                match.id;


            option.textContent =

                `M${String(
                    match.match_number
                ).padStart(3, "0")} · ${
                    match.home_name
                } vs ${
                    match.away_name
                }`;


            select.appendChild(
                option
            );

        }
    );

}


/* =========================================================
   LOAD ADMIN MATCH
========================================================= */

function loadAdminMatch() {

    const id =
        document.getElementById(
            "adminFixture"
        ).value;


    const result =
        state.results[id];


    const home =
        document.getElementById(
            "homeScore"
        );


    const away =
        document.getElementById(
            "awayScore"
        );


    const date =
        document.getElementById(
            "matchDate"
        );


    if (!id) {

        home.value = "";

        away.value = "";

        date.value = "";

        return;

    }


    if (result) {

        home.value =
            result.home;


        away.value =
            result.away;


        date.value =
            result.date || "";

    }

    else {

        home.value = "";

        away.value = "";

        date.value = "";

    }

}


/* =========================================================
   SAVE RESULT
========================================================= */

async function saveResult() {

    if (!state.adminUnlocked) {

        alert(
            "Please login as administrator."
        );

        return;

    }


    const matchId =
        document.getElementById(
            "adminFixture"
        ).value;


    const homeValue =
        document.getElementById(
            "homeScore"
        ).value;


    const awayValue =
        document.getElementById(
            "awayScore"
        ).value;


    const date =
        document.getElementById(
            "matchDate"
        ).value;


    if (!matchId) {

        alert(
            "Please select a match."
        );

        return;

    }


    if (
        homeValue === "" ||
        awayValue === ""
    ) {

        alert(
            "Please enter both scores."
        );

        return;

    }


    const homeScore =
        Number(homeValue);


    const awayScore =
        Number(awayValue);


    if (
        homeScore < 0 ||
        awayScore < 0
    ) {

        alert(
            "Scores cannot be negative."
        );

        return;

    }


    try {

        await api(
            `/matches/${matchId}`,
            {
                method: "PUT",

                body:
                    JSON.stringify({

                        home_score:
                            homeScore,

                        away_score:
                            awayScore,

                        match_date:
                            date || null

                    })

            }
        );


        await loadData();


        alert(
            "Result saved successfully."
        );

    }

    catch (error) {

        console.error(error);

        alert(
            error.message ||
            "Unable to save result."
        );

    }

}


/* =========================================================
   DELETE RESULT
========================================================= */

async function deleteResult() {

    if (!state.adminUnlocked) {

        alert(
            "Please login as administrator."
        );

        return;

    }


    const matchId =
        document.getElementById(
            "adminFixture"
        ).value;


    if (!matchId) {

        alert(
            "Please select a match."
        );

        return;

    }


    if (
        !confirm(
            "Delete this match result?"
        )
    ) {

        return;

    }


    try {

        await api(
            `/matches/${matchId}`,
            {
                method: "DELETE"
            }
        );


        await loadData();


        loadAdminMatch();


        alert(
            "Result deleted successfully."
        );

    }

    catch (error) {

        alert(
            error.message ||
            "Unable to delete result."
        );

    }

}


/* =========================================================
   RESET TOURNAMENT
========================================================= */

async function resetTournament() {

    if (!state.adminUnlocked) {

        alert(
            "Please login as administrator."
        );

        return;

    }


    if (
        !confirm(
            "WARNING!\n\n" +
            "This will delete ALL tournament results.\n\n" +
            "Continue?"
        )
    ) {

        return;

    }


    if (
        !confirm(
            "Are you absolutely sure?"
        )
    ) {

        return;

    }


    try {

        await api(
            "/reset",
            {
                method: "POST"
            }
        );


        await loadData();


        alert(
            "Tournament reset successfully."
        );

    }

    catch (error) {

        alert(
            error.message ||
            "Tournament reset failed."
        );

    }

}


/* =========================================================
   NAVIGATION
========================================================= */

function showView(view) {

    const views =
        document.querySelectorAll(
            ".view"
        );


    views.forEach(
        element => {

            element.classList.remove(
                "active-view"
            );

        }
    );


    const selected =
        document.getElementById(
            `${view}View`
        );


    if (selected) {

        selected.classList.add(
            "active-view"
        );

    }


    document.querySelectorAll(
        ".nav-btn"
    ).forEach(button => {

        button.classList.toggle(
            "active",
            button.dataset.view === view
        );

    });


    state.currentView =
        view;

}


/* =========================================================
   EVENTS
========================================================= */

document.addEventListener(
    "click",
    event => {

        const nav =
            event.target.closest(
                ".nav-btn"
            );


        if (nav) {

            showView(
                nav.dataset.view
            );

            return;

        }


        const filter =
            event.target.closest(
                ".filter-btn"
            );


        if (filter) {

            document.querySelectorAll(
                ".filter-btn"
            ).forEach(button => {

                button.classList.remove(
                    "active"
                );

            });


            filter.classList.add(
                "active"
            );


            state.matchFilter =
                filter.dataset.filter;


            renderMatches();


            return;

        }


        const round =
            event.target.closest(
                ".round-btn"
            );


        if (round) {

            document.querySelectorAll(
                ".round-btn"
            ).forEach(button => {

                button.classList.remove(
                    "active"
                );

            });


            round.classList.add(
                "active"
            );


            state.roundFilter =
                round.dataset.round;


            renderFixtures();

        }

    }
);


/* =========================================================
   ADMIN FIXTURE
========================================================= */

document.addEventListener(
    "change",
    event => {

        if (
            event.target.id ===
            "adminFixture"
        ) {

            loadAdminMatch();

        }

    }
);


/* =========================================================
   ESCAPE ADMIN MODAL
========================================================= */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key === "Escape"
        ) {

            closeAdmin();

        }

    }
);


/* =========================================================
   UTILITY
========================================================= */

function setText(id, value) {

    const element =
        document.getElementById(id);


    if (element) {

        element.textContent =
            value;

    }

}


/* =========================================================
   START
========================================================= */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        loadData();

    }
);
```
