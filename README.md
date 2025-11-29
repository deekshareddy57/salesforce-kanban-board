# Salesforce Kanban Portfolio (SFDX)

Minimal Salesforce DX project scaffold for the Kanban portfolio.

Quick start

1. Install the Salesforce CLI: https://developer.salesforce.com/tools/sfdxcli
2. Authenticate: `sfdx auth:web:login -a DevHub`
3. Create a scratch org: `sfdx force:org:create -s -f config/project-scratch-def.json -a SKPDev`
4. Push source: `sfdx force:source:push`

Files created

- `sfdx-project.json` — project descriptor
- `config/project-scratch-def.json` — scratch org definition
- `force-app/main/default` — metadata source folder
