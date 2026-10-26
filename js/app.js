(function () {
  "use strict";

  var DB_KEY = "disconnected-admin-demo-v1";
  var SESSION_KEY = "disconnected-admin-demo-session";
  var ADMIN_USER = "admin";
  var ADMIN_PASS = "admin123";

  var appEl = document.getElementById("app");

  var state = {
    route: "users",
    query: "",
    selectedUserId: null,
    modal: null,
    draft: null,
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
    try {
      var saved = JSON.parse(localStorage.getItem(DB_KEY) || "null");
      if (saved && saved.users && saved.roles) return saved;
    } catch (e) { /* seed */ }
    return seedDb();
  }

  function saveDb(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function seedDb() {
    var roles = [
      { id: "role-risk-mgr", name: "Risk Manager", description: "Manage risk files, assignments, and escalations." },
      { id: "role-frontline", name: "Risk - Front Line User", description: "Create and edit front-line risk submissions." },
      { id: "role-file-mgr", name: "Common - File Manager", description: "Manage files without delete or close privileges." },
      { id: "role-feedback-mgr", name: "Feedback Manager", description: "Respond to feedback and manage feedback workflows." },
      { id: "role-security", name: "Security Administrator", description: "Administer users, roles, and security settings." }
    ];
    var users = [
      { userId: "U-10001", username: "imiron", status: "Enabled", roleId: "role-frontline", displayName: "Ian Miron" },
      { userId: "U-10002", username: "ajoshi2", status: "Enabled", roleId: "role-risk-mgr", displayName: "Anand Joshi" },
      { userId: "U-10003", username: "jdoe", status: "Disabled", roleId: "role-file-mgr", displayName: "Jane Doe" },
      { userId: "U-10004", username: "ppatel", status: "Enabled", roleId: "role-feedback-mgr", displayName: "Priya Patel" },
      { userId: "U-10005", username: "cadmin", status: "Enabled", roleId: "role-security", displayName: "Chris Admin" }
    ];
    return { roles: roles, users: users };
  }

  function loadSession() {
    try {
      return JSON.parse(sessionStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  var db = loadDb();
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

  function setRoute(route) {
    state.route = route;
    location.hash = "#/" + route;
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
          '<p class="sub">Demo fixture for Disconnected Application connector walkthroughs.</p>' +
          (state.loginError ? '<div class="error" id="login-error">' + esc(state.loginError) + "</div>" : "") +
          '<label class="field">Valley User Name<input id="login-user" name="username" autocomplete="username" required /></label>' +
          '<label class="field">Valley Password<input id="login-password" name="password" type="password" autocomplete="current-password" required /></label>' +
          '<button class="btn primary" id="login-submit" type="submit">Sign On</button>' +
          '<p class="hint" style="margin-top:14px">Demo: <strong>admin</strong> / <strong>admin123</strong></p>' +
        "</form>" +
      "</section>"
    );
  }

  function shellHtml(body) {
    var usersActive = state.route === "users" ? " active" : "";
    var rolesActive = state.route === "roles" ? " active" : "";
    return (
      '<div id="app-shell">' +
        '<header class="top-bar">' +
          '<span class="product">Disconnected Admin</span>' +
          '<nav class="top-nav" id="main-nav">' +
            '<a href="#/users" id="nav-users" class="' + usersActive.trim() + '">Users</a>' +
            '<a href="#/roles" id="nav-roles" class="' + rolesActive.trim() + '">Roles</a>' +
          "</nav>" +
          '<span class="top-spacer"></span>' +
          '<button type="button" id="btn-logout">Sign out</button>' +
        "</header>" +
        '<main id="main-content">' + body + "</main>" +
        (state.toast ? '<div class="toast" id="toast">' + esc(state.toast) + "</div>" : "") +
        modalHtml() +
      "</div>"
    );
  }

  function usersPageHtml() {
    var rows = filteredUsers();
    var sel = state.selectedUserId;
    var tbody = rows.length
      ? rows.map(function (u) {
          var selected = sel === u.userId ? " selected" : "";
          return (
            "<tr class=\"" + selected.trim() + "\" data-user-id=\"" + esc(u.userId) + "\">" +
              "<td><input type=\"radio\" name=\"user-pick\" class=\"user-row-pick\" value=\"" + esc(u.userId) + "\"" + (sel === u.userId ? " checked" : "") + " /></td>" +
              "<td>" + esc(u.username) + "</td>" +
              "<td>" + esc(u.userId) + "</td>" +
              "<td><span class=\"status-pill " + (u.status === "Enabled" ? "enabled" : "disabled") + "\">" + esc(u.status) + "</span></td>" +
              "<td>" + esc(roleName(u.roleId)) + "</td>" +
              "<td><a href=\"#\" class=\"edit-user\" data-user-id=\"" + esc(u.userId) + "\">Edit</a></td>" +
            "</tr>"
          );
        }).join("")
      : '<tr><td colspan="6" class="empty">No users match your search.</td></tr>';

    return (
      "<h1 class=\"page-title\">User Administration</h1>" +
      '<div class="toolbar" id="users-toolbar">' +
        '<button type="button" class="btn primary" id="btn-new-user">New User</button>' +
        '<button type="button" class="btn" id="btn-edit-user"' + (sel ? "" : " disabled") + ">Edit User</button>" +
        '<button type="button" class="btn danger" id="btn-delete-user"' + (sel ? "" : " disabled") + ">Delete User</button>" +
        '<input type="search" id="user-search" name="username" placeholder="Search username, user id, status, role" value="' + esc(state.query) + '" />' +
        '<button type="button" class="btn" id="search">Search</button>' +
      "</div>" +
      '<div class="table-wrap">' +
        '<table class="data" id="users-table">' +
          "<thead><tr><th></th><th>Username</th><th>User ID</th><th>Status</th><th>Role</th><th></th></tr></thead>" +
          "<tbody id=\"user-rows\">" + tbody + "</tbody>" +
        "</table>" +
      "</div>"
    );
  }

  function rolesPageHtml() {
    var tbody = db.roles.map(function (r) {
      return (
        "<tr>" +
          "<td>" + esc(r.name) + "</td>" +
          "<td>" + esc(r.description || "") + "</td>" +
        "</tr>"
      );
    }).join("");
    return (
      "<h1 class=\"page-title\">Local Roles</h1>" +
      '<p class="hint">Reference catalog for role assignment when creating or editing users.</p>' +
      '<div class="table-wrap">' +
        '<table class="data" id="roles-table">' +
          "<thead><tr><th>Role Name</th><th>Role Description</th></tr></thead>" +
          "<tbody>" + tbody + "</tbody>" +
        "</table>" +
      "</div>"
    );
  }

  function roleOptions(selectedId) {
    return db.roles.map(function (r) {
      return '<option value="' + esc(r.id) + '"' + (r.id === selectedId ? " selected" : "") + ">" + esc(r.name) + "</option>";
    }).join("");
  }

  function userFormModalHtml() {
    var d = state.draft;
    var isEdit = !!d._editUserId;
    var title = isEdit ? "Edit User" : "Create User";
    return (
      '<div class="backdrop" id="user-modal-backdrop">' +
        '<section class="dialog" id="user-modal" role="dialog" aria-modal="true">' +
          "<header><h2>" + title + '</h2><button type="button" class="x" id="btn-cancel-user" aria-label="Close">×</button></header>' +
          '<div class="body">' +
            (state.loginError ? '<div class="error">' + esc(state.loginError) + "</div>" : "") +
            '<form id="user-form">' +
              '<div class="form-grid">' +
                '<label class="field" for="field-username"><span>Username *</span></label>' +
                '<input id="field-username" name="username" required value="' + esc(d.username) + '"' + (isEdit ? " readonly" : "") + " />" +
                '<label class="field" for="field-user-id"><span>User ID *</span></label>' +
                '<input id="field-user-id" name="userId" required value="' + esc(d.userId) + '"' + (isEdit ? " readonly" : "") + " />" +
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
            "</form>" +
          "</div>" +
          '<footer><button type="button" class="btn" id="btn-close-user">Cancel</button>' +
          '<button type="button" class="btn primary" id="btn-save-user">Save</button></footer>' +
        "</section>" +
      "</div>"
    );
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
    if (state.modal === "user") return userFormModalHtml();
    if (state.modal === "delete") return deleteConfirmHtml();
    return "";
  }

  function render() {
    if (!session) {
      appEl.innerHTML = loginHtml();
      return;
    }
    var body = state.route === "roles" ? rolesPageHtml() : usersPageHtml();
    appEl.innerHTML = shellHtml(body);
  }

  function openNewUser() {
    state.loginError = "";
    var nextNum = 10010 + db.users.length;
    state.draft = {
      userId: "U-" + nextNum,
      username: "",
      status: "Enabled",
      roleId: db.roles[0] ? db.roles[0].id : "",
      displayName: ""
    };
    state.modal = "user";
    render();
  }

  function openEditUser(userId) {
    var u = findUser(userId);
    if (!u) return;
    state.selectedUserId = userId;
    state.loginError = "";
    state.draft = {
      _editUserId: userId,
      userId: u.userId,
      username: u.username,
      status: u.status,
      roleId: u.roleId,
      displayName: u.displayName || ""
    };
    state.modal = "user";
    render();
  }

  function saveUserForm(form) {
    state.loginError = "";
    var data = new FormData(form);
    var username = String(data.get("username") || "").trim();
    var userId = String(data.get("userId") || "").trim();
    var status = String(data.get("status") || "Enabled");
    var roleId = String(data.get("roleId") || "");
    var displayName = String(data.get("displayName") || "").trim();

    if (!username || !userId || !roleId) {
      state.loginError = "Username, User ID, and Role are required.";
      render();
      return;
    }
    if (status !== "Enabled" && status !== "Disabled") status = "Enabled";

    var editId = state.draft && state.draft._editUserId;
    if (editId) {
      var existing = findUser(editId);
      if (!existing) {
        state.modal = null;
        render();
        return;
      }
      existing.status = status;
      existing.roleId = roleId;
      existing.displayName = displayName;
      saveDb(db);
      state.modal = null;
      showToast("User updated.");
      return;
    }

    if (findUserByUsername(username)) {
      state.loginError = "Username already exists.";
      render();
      return;
    }
    if (findUser(userId)) {
      state.loginError = "User ID already exists.";
      render();
      return;
    }

    db.users.push({
      userId: userId,
      username: username,
      status: status,
      roleId: roleId,
      displayName: displayName
    });
    saveDb(db);
    state.modal = null;
    state.selectedUserId = userId;
    showToast("User created.");
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
    var h = (location.hash || "#/users").replace(/^#\/?/, "");
    state.route = h === "roles" ? "roles" : "users";
  }

  appEl.addEventListener("submit", function (e) {
    if (e.target.id === "login-form") {
      e.preventDefault();
      var fd = new FormData(e.target);
      var user = String(fd.get("username") || "").trim();
      var pass = String(fd.get("password") || "");
      if (user === ADMIN_USER && pass === ADMIN_PASS) {
        session = { username: user, at: Date.now() };
        sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
        state.loginError = "";
        setRoute("users");
      } else {
        state.loginError = "Invalid credentials. Use admin / admin123.";
        render();
      }
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

    if (t.id === "btn-new-user") {
      openNewUser();
      return;
    }
    if (t.id === "btn-edit-user" && state.selectedUserId) {
      openEditUser(state.selectedUserId);
      return;
    }
    if (t.id === "btn-delete-user" && state.selectedUserId) {
      state.modal = "delete";
      render();
      return;
    }
    if (t.id === "search") {
      var inp = document.getElementById("user-search");
      state.query = inp ? inp.value : "";
      render();
      return;
    }
    if (t.classList && t.classList.contains("edit-user")) {
      e.preventDefault();
      openEditUser(t.getAttribute("data-user-id"));
      return;
    }
    if (t.id === "btn-save-user") {
      var form = document.getElementById("user-form");
      if (form) saveUserForm(form);
      return;
    }
    if (t.id === "btn-cancel-user" || t.id === "btn-close-user" || t.id === "user-modal-backdrop") {
      if (t.id === "user-modal-backdrop" && t.target !== t) return;
      state.modal = null;
      state.loginError = "";
      render();
      return;
    }
    if (t.id === "btn-cancel-delete" || (t.id === "delete-modal-backdrop" && t.target === t)) {
      state.modal = null;
      render();
      return;
    }
    if (t.id === "btn-confirm-delete") {
      deleteSelectedUser();
      return;
    }
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
    }
  });

  appEl.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && e.target.id === "user-search") {
      state.query = e.target.value;
      render();
    }
  });

  window.addEventListener("hashchange", function () {
    parseHash();
    if (session) render();
  });

  parseHash();
  render();
})();
