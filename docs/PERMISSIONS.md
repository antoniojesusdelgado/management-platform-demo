# Permission model

Permission codes use the contract `module.resource.action`.

| Code | Purpose |
| --- | --- |
| `vacations.requests.view` | Read organization Leave requests |
| `vacations.requests.create` | Create personal Leave requests |
| `vacations.requests.approve` | Approve, reject or cancel requests |
| `tasks.items.view` | Read tasks |
| `tasks.items.manage` | Create and update tasks |
| `incidents.tickets.view` | Read incidents |
| `incidents.tickets.manage` | Manage incidents |
| `treasury.entries.view` | Read Treasury entries |
| `payroll.runs.view` | Read Payroll runs |
| `people.profiles.view` | Read the People directory |
| `changelog.entries.view` | Read Changelog entries |
| `settings.workspace.manage` | Manage settings, roles and invitations |

Role labels, colors and descriptions may change. Permission codes may not be
repurposed; changes require a migration and application review.
