# Permission model

Permission codes use the contract `module.resource.action`.

| Code | Purpose |
| --- | --- |
| `vacations.requests.view` | Read organization Leave requests |
| `vacations.requests.create` | Create personal Leave requests |
| `vacations.requests.approve` | Approve, reject or cancel requests |
| `tasks.items.view` | Read tasks |
| `tasks.items.manage` | Create and update tasks |
| `projects.items.view` | Read projects, members and project activity |
| `projects.items.manage` | Manage projects and project membership |
| `incidents.tickets.view` | Read incidents |
| `incidents.tickets.manage` | Manage incidents |
| `treasury.entries.view` | Read Treasury entries |
| `treasury.entries.manage` | Create and progress synthetic aggregated Treasury entries |
| `payroll.runs.view` | Read Payroll runs |
| `payroll.runs.manage` | Create, edit and progress synthetic aggregated Payroll cycles |
| `people.profiles.view` | Read the People directory |
| `people.profiles.manage` | Manage synthetic People profiles and lifecycle |
| `changelog.entries.view` | Read Changelog entries |
| `changelog.entries.manage` | Create, review and publish Changelog entries |
| `profile.self.update` | Update the authenticated profile preferences |
| `analytics.dashboards.view` | Read dashboards and save analytical views |
| `analytics.dashboards.export` | Export permitted aggregate analytics |
| `integrations.runs.view` | Read connector status and synthetic run history |
| `integrations.runs.manage` | Simulate and configure neutral integrations |
| `settings.workspace.manage` | Manage settings, roles and invitations |

Role labels, colors and descriptions may change. Permission codes may not be
repurposed; changes require a migration and application review.
