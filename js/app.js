(function () {
  "use strict";

  var DB_KEY = "disconnected-admin-demo-v3";
  var SESSION_KEY = "disconnected-admin-demo-session";
  var LOOKUP_KEY = "disconnected-admin-demo-account-lookup";
  var ADMIN_USER = "admin";
  var ADMIN_PASS = "admin123";
  var SEED_USER_COUNT = 1000;
  var SEED_ROLE_COUNT = 100;

  var SEED_FIRST = ["Avery", "Blake", "Casey", "Drew", "Emery", "Finley", "Gray", "Harper", "Jordan", "Kai", "Logan", "Morgan", "Noah", "Parker", "Quinn", "Reese", "Taylor", "Alex", "Blair", "Cameron"];
  var SEED_LAST = ["Adler", "Brooks", "Chen", "Diaz", "Ellis", "Foster", "Garcia", "Hughes", "Johnson", "Khan", "Lopez", "Murphy", "Nguyen", "Patel", "Reed", "Singh", "Turner", "Walsh", "Young", "Shaw"];

  var MAIN_SECTIONS = [
    { id: "dashboard", label: "Dashboard", navId: "nav-dashboard" },
    { id: "operations", label: "Operations", navId: "nav-operations" },
    { id: "reports", label: "Reports", navId: "nav-reports" },
    { id: "user-management", label: "User Management", navId: "nav-user-management" },
    { id: "settings", label: "System Settings", navId: "nav-settings" },
    { id: "audit", label: "Audit Log", navId: "nav-audit" }
  ];

  var UM_TABS = [
    { id: "users", label: "Users", navId: "sub-nav-users" },
    { id: "roles", label: "Roles", navId: "sub-nav-roles" },
    { id: "groups", label: "Groups", navId: "sub-nav-groups" }
  ];

  var appEl = document.getElementById("app");

  var state = {
    section: "dashboard",
    umTab: "users",
    query: "",
    userPage: 1,
    userPageSize: 1000,
    rolePage: 1,
    rolePageSize: 500,
    userView: "list",
    detailUserId: null,
    detailTab: "profile",
    selectedUserId: null,
    modal: null,
    formError: "",
    toast: "",
    loginError: ""
  };

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loadDb() {
    var serverDb = loadServerDb();
    if (isUsableDb(serverDb)) return serverDb;

    var initial;
    try {
      var saved = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (isUsableDb(saved)) initial = saved;
    } catch (e) { /* seed */ }
    if (!initial) initial = seedDb();
    saveDb(initial);
    return initial;
  }

  function isUsableDb(value) {
    return value && value.users && value.roles
      && value.users.length > 0
      && value.roles.length >= SEED_ROLE_COUNT;
  }

  function loadServerDb() {
    try {
      var request = new XMLHttpRequest();
      request.open("GET", "/api/db", false);
      request.send();
      if (request.status === 200) return JSON.parse(request.responseText);
    } catch (e) { /* local/static fallback */ }
    return null;
  }

  function saveDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    try {
      var request = new XMLHttpRequest();
      request.open("PUT", "/api/db", false);
      request.setRequestHeader("Content-Type", "application/json");
      request.send(JSON.stringify(db));
    } catch (e) { /* local/static fallback */ }
  }

  function seedRoles() {
    var roles = [
      { id: "role-risk-mgr", name: "Risk Manager", description: "Manage risk files, assignments, and escalations." },
      { id: "role-frontline", name: "Risk - Front Line User", description: "Create and edit front-line risk submissions." },
      { id: "role-file-mgr", name: "Common - File Manager", description: "Manage files without delete or close privileges." },
      { id: "role-feedback-mgr", name: "Feedback Manager", description: "Respond to feedback and manage feedback workflows." },
      { id: "role-security", name: "Security Administrator", description: "Administer users, roles, and security settings." }
    ];
    var modules = ["Risk", "Feedback", "Security", "Claims", "Operations"];
    for (var r = roles.length + 1; r <= SEED_ROLE_COUNT; r++) {
      var pad = r < 10 ? "00" + r : r < 100 ? "0" + r : String(r);
      var mod = modules[(r - 1) % modules.length];
      roles.push({
        id: "role-" + pad,
        name: mod + " Role " + pad,
        description: "Demo entitlement role " + pad + " for " + mod.toLowerCase() + " module access and reporting."
      });
    }
    return roles;
  }

  function seedDb() {
    var roles = seedRoles();
    var roleIds = roles.map(function (role) { return role.id; });
    var users = [
      { userId: "U-10001", username: "imiron", status: "Enabled", roleId: "role-frontline", displayName: "Ian Miron" },
      { userId: "U-10002", username: "ajoshi2", status: "Enabled", roleId: "role-risk-mgr", displayName: "Anand Joshi" },
      { userId: "U-10003", username: "jdoe", status: "Disabled", roleId: "role-file-mgr", displayName: "Jane Doe" },
      { userId: "U-10004", username: "ppatel", status: "Enabled", roleId: "role-feedback-mgr", displayName: "Priya Patel" },
      { userId: "U-10005", username: "cadmin", status: "Enabled", roleId: "role-security", displayName: "Chris Admin" }
    ];
    for (var i = users.length + 1; i <= SEED_USER_COUNT; i++) {
      var n = i;
      var first = SEED_FIRST[(n - 1) % SEED_FIRST.length];
      var last = SEED_LAST[(n - 1) % SEED_LAST.length];
      var pad = n < 10 ? "000" + n : n < 100 ? "00" + n : n < 1000 ? "0" + n : String(n);
      users.push({
        userId: "U-" + (10000 + n),
        username: "user" + pad,
        status: n % 17 === 0 ? "Disabled" : "Enabled",
        roleId: roleIds[n % roleIds.length],
        displayName: first + " " + last
      });
    }
    return {
      roles: roles,
      users: users,
      groups: [
        { name: "Front Line Users", description: "Default front-line access bundle.", status: "Active" },
        { name: "Risk Managers", description: "Escalation and file management group.", status: "Active" },
        { name: "Security Administrators", description: "Full admin center access.", status: "Active" }
      ],
      operations: [
        { id: "OP-2201", type: "Incident", owner: "Risk Desk", status: "Open", updated: "2026-10-24" },
        { id: "OP-2202", type: "Feedback", owner: "Patient Relations", status: "In Review", updated: "2026-10-23" }
      ],
      audit: [
        { when: "2026-10-26 09:14", actor: "admin", action: "Sign in", target: "Portal" },
        { when: "2026-10-25 16:02", actor: "cadmin", action: "User updated", target: "ajoshi2" }
      ]
    };
  }

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  var db = loadDb();
  if (!db.groups) db.groups = seedDb().groups;
  if (!db.operations) db.operations = seedDb().operations;
  if (!db.audit) db.audit = seedDb().audit;

  var session = loadSession();

  function roleName(roleId) {
    var r = db.roles.find(function (x) { return x.id === roleId; });
    return r ? r.name : "—";
  }

  function findUser(userId) {
    return db.users.find(function (u) { return u.userId === userId; });
  }

  function findUserByUsername(username) {
    var key = String(username || "").trim().toLowerCase();
    return db.users.find(function (u) { return u.username.toLowerCase() === key; });
  }

  function filteredUsers() {
    var q = state.query.trim().toLowerCase();
    if (!q) return db.users.slice();
    return db.users.filter(function (u) {
      var blob = (u.username + " " + u.userId + " " + u.status + " " + roleName(u.roleId) + " " + (u.displayName || "")).toLowerCase();
      return blob.indexOf(q) >= 0;
    });
  }

  function navHash(section, umTab) {
    if (section === "user-management") {
      if (umTab === "users" && state.userView === "new") return "#/user-management/users/new";
      if (umTab === "users" && state.userView === "detail" && state.detailUserId) {
        return "#/user-management/users/detail/" + encodeURIComponent(state.detailUserId);
      }
      return "#/user-management/" + (umTab || "users");
    }
    return "#/" + section;
  }

  function usersListPageHash(page) {
    var p = page || state.userPage || 1;
    return "#/user-management/users/page/" + p;
  }

  function rolesListPageHash(page) {
    var p = page || state.rolePage || 1;
    return "#/user-management/roles/page/" + p;
  }

  function usersListHash() {
    return usersListPageHash(1);
  }

  function goUserPage(page) {
    state.userView = "list";
    state.detailUserId = null;
    state.userPage = page;
    location.hash = usersListPageHash(page);
    render();
  }

  function goRolePage(page) {
    state.rolePage = page;
    location.hash = rolesListPageHash(page);
    render();
  }

  function pagerControl(id, label, href, enabled) {
    if (!enabled) {
      return '<span class="btn is-disabled" aria-disabled="true">' + esc(label) + "</span>";
    }
    return '<a href="' + href + '" class="btn pager-link" id="' + id + '">' + esc(label) + "</a>";
  }

  function setRoute(section, umTab) {
    state.section = section;
    if (section === "user-management") {
      state.umTab = umTab || "users";
      if (state.umTab !== "users") {
        state.userView = "list";
        state.detailUserId = null;
      }
    } else {
      state.userView = "list";
      state.detailUserId = null;
    }
    location.hash = navHash(section, state.umTab);
    render();
  }

  function goUsersList() {
    state.userView = "list";
    state.detailUserId = null;
    state.formError = "";
    location.hash = usersListHash();
    render();
  }

  function goUserNew() {
    state.userView = "new";
    state.detailUserId = null;
    state.detailTab = "profile";
    state.formError = "";
    location.hash = "#/user-management/users/new";
    render();
  }

  function goUserDetail(userId) {
    state.userView = "detail";
    state.detailUserId = userId;
    state.detailTab = "profile";
    state.formError = "";
    state.selectedUserId = userId;
    location.hash = "#/user-management/users/detail/" + encodeURIComponent(userId);
    render();
  }

  function showToast(msg) {
    state.toast = msg;
    render();
    setTimeout(function () {
      state.toast = "";
      render();
    }, 2800);
  }

  function loginHtml() {
    return (
      '<section id="login-screen">' +
        '<form class="login-card" id="login-form">' +
          "<h1>Disconnected Admin</h1>" +
          '<p class="sub">Enterprise demo fixture — multi-module navigation and user administration.</p>' +
          (state.loginError ? '<div class="error" id="login-error">' + esc(state.loginError) + "</div>" : "") +
          '<label class="field" for="login-user"><span>User Name</span><input id="login-user" name="username" autocomplete="username" required /></label>' +
          '<label class="field" for="login-password"><span>Password</span><input id="login-password" name="password" type="password" autocomplete="current-password" required /></label>' +
          '<button class="btn primary" id="login-submit" type="submit">Sign in</button>' +
        "</form>" +
      "</section>"
    );
  }

  function mainNavHtml() {
    return MAIN_SECTIONS.map(function (s) {
      var active = state.section === s.id ? " active" : "";
      var href = s.id === "user-management" ? navHash("user-management", state.umTab) : navHash(s.id);
      return '<a href="' + href + '" id="' + s.navId + '" class="main-nav-link' + active + '">' + esc(s.label) + "</a>";
    }).join("");
  }

  function umSubNavHtml() {
    return UM_TABS.map(function (t) {
      var active = state.umTab === t.id ? " active" : "";
      var href = t.id === "users" ? usersListPageHash(1) : (t.id === "roles" ? rolesListPageHash(1) : navHash("user-management", t.id));
      return '<a href="' + href + '" id="' + t.navId + '" class="sub-nav-link' + active + '">' + esc(t.label) + "</a>";
    }).join("");
  }

  function breadcrumbHtml() {
    var sectionLabel = (MAIN_SECTIONS.find(function (s) { return s.id === state.section; }) || {}).label || state.section;
    var parts = ["Admin Center", sectionLabel];
    if (state.section === "user-management") {
      var tabLabel = (UM_TABS.find(function (t) { return t.id === state.umTab; }) || {}).label || state.umTab;
      parts.push(tabLabel);
      if (state.umTab === "users" && state.userView === "new") parts.push("Create User");
      if (state.umTab === "users" && state.userView === "detail" && state.detailUserId) {
        var du = findUser(state.detailUserId);
        parts.push(du ? du.username : state.detailUserId);
      }
    }
    return '<nav class="breadcrumb" id="breadcrumb" aria-label="Breadcrumb">' +
      parts.map(function (p, i) {
        return (i ? '<span class="sep">›</span>' : "") + '<span class="crumb">' + esc(p) + "</span>";
      }).join("") +
      "</nav>";
  }

  function shellHtml(body) {
    var umBar = state.section === "user-management"
      ? '<div class="sub-bar" id="user-management-bar"><span class="sub-bar-label">User Management</span><nav class="sub-nav" id="user-management-tabs">' + umSubNavHtml() + "</nav></div>"
      : "";
    return (
      '<div id="app-shell">' +
        '<header class="top-bar">' +
          '<span class="product" id="product-name">Disconnected Admin</span>' +
          '<nav class="top-nav" id="main-nav">' + mainNavHtml() + "</nav>" +
          '<span class="top-spacer"></span>' +
          '<span class="session-user" id="session-user">' + esc(session && session.username ? session.username : "") + "</span>" +
          '<button type="button" id="btn-logout">Sign out</button>' +
        "</header>" +
        umBar +
        '<main id="main-content">' + breadcrumbHtml() + '<div id="content">' + body + "</div></main>" +
        (state.toast ? '<div class="toast" id="toast">' + esc(state.toast) + "</div>" : "") +
        modalHtml() +
      "</div>"
    );
  }

  function dashboardHtml() {
    var enabled = db.users.filter(function (u) { return u.status === "Enabled"; }).length;
    return (
      '<h1 class="page-title">Operations Dashboard</h1>' +
      '<p class="hint">Use <strong>User Management</strong> for account aggregate, read, and provisioning demos.</p>' +
      '<div class="card-grid">' +
        card("Active users", enabled + " / " + db.users.length, "Accounts currently enabled in the directory.", "#/user-management/users", "Open Users") +
        card("Local roles", String(db.roles.length), "Role catalog used for assignment.", "#/user-management/roles", "Open Roles") +
        card("Open operations", String(db.operations.length), "Sample workflow queue (read-only demo).", "#/operations", "Operations") +
        card("Audit events", String(db.audit.length), "Recent sign-in and change history.", "#/audit", "Audit Log") +
      "</div>"
    );
  }

  function card(title, stat, text, link, linkLabel) {
    return '<article class="info-card"><h3>' + esc(title) + '</h3><div class="stat">' + esc(stat) + "</div><p>" + esc(text) +
      '</p><a class="card-link" href="' + link + '">' + esc(linkLabel) + " →</a></article>";
  }

  function operationsHtml() {
    var rows = db.operations.map(function (o) {
      return "<tr><td>" + esc(o.id) + "</td><td>" + esc(o.type) + "</td><td>" + esc(o.owner) + "</td><td>" + esc(o.status) + "</td><td>" + esc(o.updated) + "</td></tr>";
    }).join("");
    return (
      "<h1 class=\"page-title\">Operations Queue</h1>" +
      '<p class="hint">Illustrates a second business module — connector captures must navigate away from the dashboard to reach User Management.</p>' +
      simpleTable(["Work ID", "Type", "Owner", "Status", "Last Updated"], rows)
    );
  }

  function reportsHtml() {
    return (
      "<h1 class=\"page-title\">Reports</h1>" +
      '<div class="panel">' +
        '<h3>Available reports</h3>' +
        '<ul class="link-list">' +
          "<li><a href=\"#\" id=\"report-user-access\">User access summary</a></li>" +
          "<li><a href=\"#\" id=\"report-role-matrix\">Role assignment matrix</a></li>" +
          "<li><a href=\"#\" id=\"report-disabled-accounts\">Disabled accounts</a></li>" +
        "</ul>" +
        '<p class="hint">Report links are placeholders in this fixture.</p>' +
      "</div>"
    );
  }

  function settingsHtml() {
    return (
      "<h1 class=\"page-title\">System Settings</h1>" +
      '<div class="form-panel">' +
        '<label class="field"><span>Default session timeout (minutes)</span><input id="setting-session-timeout" type="number" value="30" /></label>' +
        '<label class="field"><span>Password policy</span><select id="setting-password-policy"><option>Standard</option><option>Strict</option></select></label>' +
        '<label class="field toggle-row"><input id="setting-mfa" type="checkbox" /> Require MFA for administrators</label>' +
        '<button type="button" class="btn" id="btn-save-settings" disabled>Save (demo)</button>' +
      "</div>"
    );
  }

  function auditHtml() {
    var rows = db.audit.map(function (a) {
      return "<tr><td>" + esc(a.when) + "</td><td>" + esc(a.actor) + "</td><td>" + esc(a.action) + "</td><td>" + esc(a.target) + "</td></tr>";
    }).join("");
    return "<h1 class=\"page-title\">Audit Log</h1>" + simpleTable(["Timestamp", "Actor", "Action", "Target"], rows);
  }

  function groupsHtml() {
    var rows = db.groups.map(function (g) {
      return "<tr><td>" + esc(g.name) + "</td><td>" + esc(g.description) + "</td><td>" + esc(g.status) + "</td></tr>";
    }).join("");
    return (
      "<h1 class=\"page-title\">User Groups</h1>" +
      '<p class="hint">Supplementary tab under User Management — shows nested navigation depth.</p>' +
      simpleTable(["Group Name", "Description", "Status"], rows, "groups-table")
    );
  }

  function simpleTable(headers, rowHtml, tableId) {
    var idAttr = tableId ? ' id="' + tableId + '"' : "";
    return '<div class="table-wrap"><table class="data"' + idAttr + "><thead><tr>" +
      headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("") +
      "</tr></thead><tbody>" + (rowHtml || '<tr><td colspan="' + headers.length + '" class="empty">No data</td></tr>') + "</tbody></table></div>";
  }

  function userRowHtml(u, selectedUserId) {
    return (
      "<tr class=\"" + (selectedUserId === u.userId ? "selected" : "") + "\" data-user-id=\"" + esc(u.userId) + "\">" +
        "<td><input type=\"radio\" name=\"user-pick\" class=\"user-row-pick\" value=\"" + esc(u.userId) + "\"" + (selectedUserId === u.userId ? " checked" : "") + " /></td>" +
        '<td data-identity="' + esc(u.username) + '">' + esc(u.username) + "</td>" +
        "<td>" + esc(u.userId) + "</td>" +
        "<td><span class=\"status-pill " + (u.status === "Enabled" ? "enabled" : "disabled") + "\" data-status=\"" + esc(u.status) + "\">" + esc(u.status) + "</span></td>" +
        "<td>" + esc(roleName(u.roleId)) + "</td>" +
        '<td class="row-actions">' +
          '<a href="#/user-management/users/detail/' + encodeURIComponent(u.userId) + '" class="update-user open-user" data-user-id="' + esc(u.userId) + '">Open</a>' +
          '<span class="action-sep">|</span>' +
          '<a href="#/user-management/users/detail/' + encodeURIComponent(u.userId) + '" class="edit-user" data-user-id="' + esc(u.userId) + '">Edit</a>' +
        "</td>" +
      "</tr>"
    );
  }

  function usersPageHtml() {
    var all = filteredUsers();
    var total = all.length;
    var pageSize = state.userPageSize;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (state.userPage > pages) state.userPage = pages;
    if (state.userPage < 1) state.userPage = 1;
    var start = (state.userPage - 1) * pageSize;
    var rows = all.slice(start, start + pageSize);
    var sel = state.selectedUserId;
    var tbody = rows.length
      ? rows.map(function (u) {
          return userRowHtml(u, sel);
        }).join("")
      : '<tr><td colspan="6" class="empty">No users match your search.</td></tr>';

    var from = total ? start + 1 : 0;
    var to = Math.min(start + pageSize, total);
    var pager =
      '<div class="list-pager" id="user-pager" data-list-page="' + state.userPage + '" data-list-pages="' + pages + '">' +
        '<span id="user-page-info">' + from + "–" + to + " of " + total + " users</span>" +
        pagerControl("btn-user-prev", "Previous", usersListPageHash(state.userPage - 1), state.userPage > 1) +
        '<span class="page-num" id="user-page-num">Page ' + state.userPage + " / " + pages + "</span>" +
        pagerControl("btn-user-next", "Next", usersListPageHash(state.userPage + 1), state.userPage < pages) +
        '<label class="page-size">Rows <select id="user-page-size">' +
          [100, 500, 1000].map(function (n) {
            return '<option value="' + n + '"' + (pageSize === n ? " selected" : "") + ">" + n + "</option>";
          }).join("") +
        "</select></label>" +
      "</div>";

    return (
      "<h1 class=\"page-title\">Users</h1>" +
      '<p class="hint">Fixture ships with <strong>' + db.users.length + "</strong> seeded accounts, all shown by default.</p>" +
      '<div class="toolbar" id="users-toolbar">' +
        '<button type="button" class="btn primary" id="btn-new-user">New User</button>' +
        '<button type="button" class="btn" id="btn-edit-user"' + (sel ? "" : " disabled") + ">Edit User</button>" +
        '<button type="button" class="btn danger" id="btn-delete-user"' + (sel ? "" : " disabled") + ">Delete User</button>" +
        '<div class="find-form" id="find-form">' +
          '<input type="search" id="user-search" name="username" placeholder="Search username, user id, status, role" value="' + esc(state.query) + '" />' +
          '<button type="button" class="btn" id="search">Search</button>' +
        "</div>" +
      "</div>" +
      '<div class="table-wrap" id="user-list-panel" data-page="user-list" data-list-page="' + state.userPage + '">' +
        '<table class="data" id="users-table" data-page="' + state.userPage + '">' +
          "<thead><tr><th></th><th>Username</th><th>User ID</th><th>Status</th><th>Role</th><th>Actions</th></tr></thead>" +
          '<tbody id="user-rows" data-page="' + state.userPage + '">' + tbody + "</tbody>" +
        "</table>" +
      "</div>" +
      pager
    );
  }

  function rolesPageHtml() {
    var total = db.roles.length;
    var pageSize = state.rolePageSize;
    var pages = Math.max(1, Math.ceil(total / pageSize));
    if (state.rolePage > pages) state.rolePage = pages;
    if (state.rolePage < 1) state.rolePage = 1;
    var start = (state.rolePage - 1) * pageSize;
    var pageRoles = db.roles.slice(start, start + pageSize);
    var tbody = pageRoles.map(function (r) {
      return roleRowHtml(r);
    }).join("");
    var from = total ? start + 1 : 0;
    var to = Math.min(start + pageSize, total);
    var pager =
      '<div class="list-pager" id="role-pager" data-list-page="' + state.rolePage + '">' +
        '<span id="role-page-info">' + from + "–" + to + " of " + total + " roles</span>" +
        pagerControl("btn-role-prev", "Previous", rolesListPageHash(state.rolePage - 1), state.rolePage > 1) +
        '<span class="page-num">Page ' + state.rolePage + " / " + pages + "</span>" +
        pagerControl("btn-role-next", "Next", rolesListPageHash(state.rolePage + 1), state.rolePage < pages) +
      "</div>";
    return (
      "<h1 class=\"page-title\">Roles</h1>" +
      '<p class="hint">Reference catalog with <strong>' + total + "</strong> seeded roles (paginated in the UI).</p>" +
      '<div class="table-wrap" id="role-list-panel" data-page="role-list">' +
        '<table class="data" id="roles-table">' +
          "<thead><tr><th>Role Name</th><th>Role Description</th></tr></thead>" +
          "<tbody id=\"role-rows\">" + (tbody || '<tr><td colspan="2" class="empty">No roles</td></tr>') + "</tbody>" +
        "</table>" +
      "</div>" +
      pager
    );
  }

  function roleRowHtml(role) {
    return "<tr data-role-id=\"" + esc(role.id) + "\"><td>" + esc(role.name) + "</td><td>" + esc(role.description || "") + "</td></tr>";
  }

  function detailDraft(isNew) {
    if (isNew) {
      return {
        userId: "U-" + (10010 + db.users.length),
        username: "",
        status: "Enabled",
        roleId: db.roles[0] ? db.roles[0].id : "",
        displayName: ""
      };
    }
    var u = findUser(state.detailUserId);
    if (!u) return null;
    return {
      _editUserId: u.userId,
      userId: u.userId,
      username: u.username,
      status: u.status,
      roleId: u.roleId,
      displayName: u.displayName || ""
    };
  }

  function userDetailPageHtml(isNew) {
    var d = detailDraft(isNew);
    if (!d) {
      return '<p class="error">User not found.</p><button type="button" class="btn" id="btn-back-users">Back to list</button>';
    }
    var title = isNew ? "Create User" : "User Details — " + d.username;
    var roleDesc = (db.roles.find(function (r) { return r.id === d.roleId; }) || {}).description || "";
    var profileTab = state.detailTab === "profile";
    return (
      '<section id="account-detail" class="account-detail-page" data-page="account-detail" aria-label="Account detail">' +
        '<input type="hidden" id="page-kind" name="pageKind" value="account-detail" />' +
        "<h1 class=\"page-title\">" + esc(title) + "</h1>" +
        '<p class="hint">Dedicated account page (no user list on screen) for read / scan captures.</p>' +
        (state.formError ? '<div class="error">' + esc(state.formError) + "</div>" : "") +
        '<div class="detail-tabs" id="user-detail-tabs">' +
          '<button type="button" class="detail-tab' + (profileTab ? " active" : "") + '" data-detail-tab="profile" id="tab-user-details">User Details</button>' +
          '<button type="button" class="detail-tab' + (!profileTab ? " active" : "") + '" data-detail-tab="roles" id="tab-roles">Roles</button>' +
        "</div>" +
        '<form id="user-form" class="detail-form">' +
          '<div id="user-details"' + (profileTab ? "" : ' hidden') + ">" +
            '<div class="form-grid">' +
              '<label class="field" for="field-username"><span>Username *</span></label>' +
              '<input id="field-username" name="username" required value="' + esc(d.username) + '"' + (isNew ? "" : " readonly") + " />" +
              '<label class="field" for="field-user-id"><span>User ID *</span></label>' +
              '<input id="field-user-id" name="userId" required value="' + esc(d.userId) + '"' + (isNew ? "" : " readonly") + " />" +
              '<label class="field" for="field-status"><span>Status</span></label>' +
              '<select id="field-status" name="status">' +
                '<option value="Enabled"' + (d.status === "Enabled" ? " selected" : "") + ">Enabled</option>" +
                '<option value="Disabled"' + (d.status === "Disabled" ? " selected" : "") + ">Disabled</option>" +
              "</select>" +
              '<label class="field" for="field-role"><span>Role *</span></label>' +
              '<select id="field-role" name="roleId" required>' + roleOptions(d.roleId) + "</select>" +
              '<label class="field" for="field-display"><span>Display name</span></label>' +
              '<input id="field-display" name="displayName" value="' + esc(d.displayName || "") + '" />' +
            "</div>" +
          "</div>" +
          '<div id="user-roles-panel"' + (profileTab ? ' hidden' : "") + ">" +
            '<p class="hint">Roles assigned to this account (managed on the User Details tab).</p>' +
            '<div class="access-box" id="assigned-roles">' + esc(roleName(d.roleId)) + "</div>" +
            '<p class="role-desc" id="role-description">' + esc(roleDesc) + "</p>" +
          "</div>" +
        "</form>" +
        '<div class="detail-actions">' +
          '<button type="button" class="btn" id="btn-back-users">Back to list</button>' +
          '<button type="button" class="btn primary" id="btn-save-user">Save</button>' +
        "</div>" +
      "</section>"
    );
  }

  function userManagementBody() {
    if (state.umTab === "roles") return rolesPageHtml();
    if (state.umTab === "groups") return groupsHtml();
    if (state.umTab === "users" && state.userView === "new") return userDetailPageHtml(true);
    if (state.umTab === "users" && state.userView === "detail") return userDetailPageHtml(false);
    return usersPageHtml();
  }

  function pageBody() {
    if (state.section === "dashboard") return dashboardHtml();
    if (state.section === "operations") return operationsHtml();
    if (state.section === "reports") return reportsHtml();
    if (state.section === "settings") return settingsHtml();
    if (state.section === "audit") return auditHtml();
    if (state.section === "user-management") return userManagementBody();
    return dashboardHtml();
  }

  function roleOptions(selectedId) {
    return db.roles.map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (r.id === selectedId ? " selected" : "") + ">" + esc(r.name) + "</option>";
    }).join("");
  }

  function deleteConfirmHtml() {
    var u = findUser(state.selectedUserId);
    if (!u) return "";
    return (
      '<div class="backdrop" id="delete-modal-backdrop">' +
        '<section class="dialog" id="delete-modal" role="dialog">' +
          "<header><h2>Delete User</h2></header>" +
          '<div class="body"><p>Delete user <strong>' + esc(u.username) + "</strong> (" + esc(u.userId) + ")?</p></div>" +
          '<footer><button type="button" class="btn" id="btn-cancel-delete">Cancel</button>' +
          '<button type="button" class="btn danger" id="btn-confirm-delete">Delete</button></footer>' +
        "</section>" +
      "</div>"
    );
  }

  function modalHtml() {
    if (state.modal === "delete") return deleteConfirmHtml();
    return "";
  }

  // Recordings saved as infinite scroll stop with noGrowth unless the container is already
  // at the bottom. Both lists render every row, so report that position immediately.
  function sealListPanel(id) {
    var el = document.getElementById(id);
    if (!el) return;
    el.style.setProperty("overflow", "visible", "important");
    el.style.setProperty("max-height", "none", "important");
    el.style.setProperty("height", "auto", "important");
    try {
      Object.defineProperty(el, "scrollTop", {
        configurable: true,
        get: function () {
          return Math.max(0, el.scrollHeight - el.clientHeight);
        },
        set: function () {}
      });
    } catch (e) {}
  }

  function render() {
    if (!session) {
      appEl.innerHTML = loginHtml();
      return;
    }
    appEl.innerHTML = shellHtml(pageBody());
    sealListPanel("user-list-panel");
    sealListPanel("role-list-panel");
  }

  function saveUserForm(form) {
    state.formError = "";
    var data = new FormData(form);
    var username = String(data.get("username") || "").trim();
    var userId = String(data.get("userId") || "").trim();
    var status = String(data.get("status") || "Enabled");
    var roleId = String(data.get("roleId") || "");
    var displayName = String(data.get("displayName") || "").trim();

    if (!username || !userId || !roleId) {
      state.formError = "Username, User ID, and Role are required.";
      render();
      return;
    }
    if (status !== "Enabled" && status !== "Disabled") status = "Enabled";

    var isNew = state.userView === "new";
    var editId = isNew ? null : state.detailUserId;
    if (editId) {
      var existing = findUser(editId);
      if (!existing) {
        goUsersList();
        return;
      }
      existing.status = status;
      existing.roleId = roleId;
      existing.displayName = displayName;
      saveDb(db);
      showToast("User updated.");
      goUsersList();
      return;
    }

    if (findUserByUsername(username)) {
      state.formError = "Username already exists.";
      render();
      return;
    }
    if (findUser(userId)) {
      state.formError = "User ID already exists.";
      render();
      return;
    }

    db.users.push({ userId: userId, username: username, status: status, roleId: roleId, displayName: displayName });
    saveDb(db);
    state.selectedUserId = userId;
    showToast("User created.");
    goUsersList();
  }

  function deleteSelectedUser() {
    var id = state.selectedUserId;
    if (!id) return;
    db.users = db.users.filter(function (u) { return u.userId !== id; });
    saveDb(db);
    state.selectedUserId = null;
    state.modal = null;
    showToast("User deleted.");
  }

  function parseHash() {
    var raw = (location.hash || "#/dashboard").replace(/^#\/?/, "");
    var parts = raw.split("/").filter(Boolean);
    if (!parts.length) {
      state.section = "dashboard";
      return;
    }
    if (parts[0] === "user-management") {
      state.section = "user-management";
      if (parts[1] === "roles") {
        state.umTab = "roles";
        state.userView = "list";
        state.detailUserId = null;
        if (parts[2] === "page" && parts[3]) {
          state.rolePage = Math.max(1, parseInt(parts[3], 10) || 1);
        } else {
          state.rolePage = 1;
        }
        return;
      }
      if (parts[1] === "groups") {
        state.umTab = "groups";
        state.userView = "list";
        state.detailUserId = null;
        return;
      }
      if (parts[1] === "users") {
        state.umTab = "users";
        if (parts[2] === "new") {
          state.userView = "new";
          state.detailUserId = null;
          return;
        }
        if (parts[2] === "detail" && parts[3]) {
          var lookup = sessionStorage.getItem(LOOKUP_KEY);
          var requested = lookup && (findUser(lookup) || findUserByUsername(lookup));
          state.userView = "detail";
          state.detailUserId = requested ? requested.userId : decodeURIComponent(parts[3]);
          state.selectedUserId = state.detailUserId;
          sessionStorage.removeItem(LOOKUP_KEY);
          return;
        }
        if (parts[2] === "page" && parts[3]) {
          state.userView = "list";
          state.detailUserId = null;
          state.userPage = Math.max(1, parseInt(parts[3], 10) || 1);
          return;
        }
        state.userView = "list";
        state.detailUserId = null;
        state.userPage = 1;
        return;
      }
      state.umTab = "users";
      state.userView = "list";
      state.detailUserId = null;
      return;
    }
    var known = MAIN_SECTIONS.some(function (s) { return s.id === parts[0]; });
    state.section = known ? parts[0] : "dashboard";
  }

  appEl.addEventListener("submit", function (e) {
    if (e.target.id === "login-form") {
      e.preventDefault();
      var fd = new FormData(e.target);
      var user = String(fd.get("username") || "").trim();
      var pass = String(fd.get("password") || "");
      if (user.toLowerCase() === ADMIN_USER && pass === ADMIN_PASS) {
        session = { username: ADMIN_USER, at: Date.now() };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        state.loginError = "";
        setRoute("dashboard", "users");
      } else {
        state.loginError = "Invalid user name or password.";
        render();
      }
    }
    if (e.target.id === "user-form") {
      e.preventDefault();
      saveUserForm(e.target);
    }
  });

  appEl.addEventListener("click", function (e) {
    var t = e.target;

    if (t.id === "btn-logout") {
      session = null;
      sessionStorage.removeItem(SESSION_KEY);
      state.modal = null;
      state.selectedUserId = null;
      render();
      return;
    }

    if (t.classList && t.classList.contains("main-nav-link")) {
      return;
    }
    if (t.classList && t.classList.contains("sub-nav-link")) {
      return;
    }

    if (t.id === "btn-new-user") { goUserNew(); return; }
    if (t.id === "btn-edit-user" && state.selectedUserId) { goUserDetail(state.selectedUserId); return; }
    if (t.id === "btn-back-users") { goUsersList(); return; }
    if (t.id === "btn-delete-user" && state.selectedUserId) { state.modal = "delete"; render(); return; }
    if (t.id === "search") {
      state.query = (document.getElementById("user-search") || {}).value || "";
      goUserPage(1);
      return;
    }
    if (t.classList && t.classList.contains("edit-user")) {
      return;
    }
    if (t.id === "btn-save-user") {
      var form = document.getElementById("user-form");
      if (form) saveUserForm(form);
      return;
    }
    if (t.dataset && t.dataset.detailTab) {
      state.detailTab = t.dataset.detailTab;
      render();
      return;
    }
    if (t.id === "btn-cancel-delete" || (t.id === "delete-modal-backdrop" && t.target === t)) {
      state.modal = null;
      render();
      return;
    }
    if (t.id === "btn-confirm-delete") { deleteSelectedUser(); return; }
    if (t.classList && t.classList.contains("user-row-pick")) {
      state.selectedUserId = t.value;
      render();
      return;
    }
  });

  appEl.addEventListener("change", function (e) {
    if (e.target.classList && e.target.classList.contains("user-row-pick")) {
      state.selectedUserId = e.target.value;
      render();
      return;
    }
    if (e.target.id === "user-page-size") {
      state.userPageSize = parseInt(e.target.value, 10) || 1000;
      goUserPage(1);
    }
  });

  appEl.addEventListener("input", function (e) {
    if (e.target.id === "user-search") {
      state.query = e.target.value;
      sessionStorage.setItem(LOOKUP_KEY, e.target.value);
    }
  });

  appEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "user-search") {
      state.query = e.target.value;
      goUserPage(1);
    }
  });

  window.addEventListener("hashchange", function () {
    parseHash();
    if (session) render();
  });

  parseHash();
  render();
})();
