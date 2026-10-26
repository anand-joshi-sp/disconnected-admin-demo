# Disconnected Admin Demo

Static demo fixture for **Disconnected Application** connector demos (aggregate, read, create, modify, enable/disable, delete).

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx --yes serve .
```

## Sign in

- **Username:** `admin`
- **Password:** `admin123`

## Features

| Area | Details |
|------|---------|
| **Users** | List columns: Username, User ID, Status, Role |
| **Roles** | Catalog tab: Role Name, Role Description |
| **New user** | Assign role; default status Enabled |
| **Edit user** | Change status (Enabled / Disabled), change role |
| **Delete user** | Select row → Delete User → confirm |

Seed users include `ajoshi2`, `imiron`, and `jdoe` (Disabled).

## Connector hints

Stable selectors for capture:

- Login: `#login-user`, `#login-password`, `#login-submit`
- Nav: `#nav-users`, `#nav-roles`
- Users: `#users-table`, `#user-search`, `#search`, `#btn-new-user`, `#btn-edit-user`, `#btn-delete-user`, `a.edit-user`
- User form: `#user-form`, `#field-username`, `#field-user-id`, `#field-status`, `#field-role`, `#btn-save-user`
- Roles: `#roles-table`

Suggested status mapping on the source:

- `enableStatus=Status=Enabled`
- `disableStatus=Status=Disabled`

(Map to the schema attribute names you publish from aggregation/read.)

## Deploy on Render

1. Push this folder to a GitHub repo (root = this directory).
2. New **Static Site**, connect repo, leave build empty, publish path `.`.
3. Optional: use `render.yaml` in this folder as a blueprint.
