# Marketing module authorization

The `/api/marketing/*` endpoints pass through the same granular module authorization middleware as other Aura modules. The `marketing` module is included in the account permission catalog so master administrators can explicitly grant view/create/edit/delete permissions. Every data query is additionally scoped to the authenticated user's `enterprise_id`.
