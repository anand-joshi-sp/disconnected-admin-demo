# Disconnected Admin Demo

Static demo fixture for **Disconnected Application** connector demos (aggregate, read, create, modify, enable/disable, delete).

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx --yes serve .
```

## Sign in

Sign-in uses **User Name** and **Password** fields (credentials are configured on the source, not shown on the login page).

## Features

| Area | Details |
|------|---------|
| **Users** | List columns: Username, User ID, Status, Role |
| **Roles** | Catalog tab: Role Name, Role Description |
| **New user** | Assign role; default status Enabled |
| **Edit user** | Change status (Enabled / Disabled), change role |
| **Delete user** | Select row → Delete User → confirm |

Seed users include `ajoshi2`, `imiron`, and `jdoe` (Disabled).

## Navigation (complex app flow)

After sign-in, the app opens **Dashboard**. For user/role demos, navigate:

1. Top bar → **User Management** (`#nav-user-management`)
2. Sub-tabs → **Users** (`#sub-nav-users`) or **Roles** (`#sub-nav-roles`)

Other top modules (Operations, Reports, System Settings, Audit Log) are sample areas for multi-step captures.

## Connector hints

Stable selectors for capture:

- Login: `#login-user`, `#login-password`, `#login-submit`
- Account detail (read / Scan Account): `#/user-management/users/detail/<userId>` — `#account-detail`, `#user-form`, no `#users-table` on screen
- List: `#users-table`, `#find-form`, `#search`, `a.update-user` (Open)
- Main nav: `#nav-dashboard`, `#nav-user-management`, `#nav-operations`, …
- User Management sub-nav: `#user-management-tabs`, `#sub-nav-users`, `#sub-nav-roles`, `#sub-nav-groups`
- Users: `#users-table`, `#user-search`, `#search`, `#btn-new-user`, `#btn-edit-user`, `#btn-delete-user`, `a.edit-user`
- User form: `#user-form`, `#field-username`, `#field-user-id`, `#field-status`, `#field-role`, `#btn-save-user`
- Roles: `#roles-table`

Suggested status mapping on the source:

- `enableStatus=Status=Enabled`
- `disableStatus=Status=Disabled`

(Map to the schema attribute names you publish from aggregation/read.)

## Account aggregation (1000 users, 500 per page)

The user list is paged (500 rows per page), so aggregation must use `nextButton` pagination. A
recording with pagination `none` reads only the first page and reports 500 accounts as complete;
`infiniteScroll` reports `noGrowth`, because scrolling never loads more rows.

1. **Re-record** `account#aggregate` on the user list with pagination:
   - **mode:** `nextButton`
   - **selector:** `#btn-user-next` (an `<a>` when another page exists — not a disabled button)
   - **maxPages:** at least `3` (1000 users ÷ 500 rows)
   - **settleMs:** `500`–`1000`
2. **Grid:** `#users-table`, rows `#user-rows > tr`, identity column **Username** (`td[data-identity]` or column 2).
3. **Pre-steps:** sign-in → User Management → Users → `#/user-management/users/page/1`. Do not record
   a click on **Next** or on the table container as a step; Next belongs in the pagination setting.
4. After deploy, confirm manually: page 1 shows 1–500, click **Next**, URL becomes `.../users/page/2` and rows 501–1000 appear.

## Deploy on Render

1. Push this folder to a GitHub repo (root = this directory).
2. New **Static Site**, connect repo, leave build empty, publish path `.`.
3. Optional: use `render.yaml` in this folder as a blueprint.
