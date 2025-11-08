# Root Directory Organization Plan

## Current State (21 files + 6 directories)

### 📄 Documentation Files (10 in root - should be organized)
1. CHANGES_LOG.md
2. COMPLETE_CLEAN_DEPLOYMENT.md
3. CONTRACTS_TO_RESTORE.md
4. DEPLOYMENT_SCRIPTS_GUIDE.md
5. FRONTEND_SETUP_VERIFICATION.md
6. JUDGE_QUICKSTART.md
7. QUICK_REFERENCE.txt
8. README.md ← Keep in root
9. SCRIPTS_ANALYSIS.md
10. SCRIPTS_FINAL_ANALYSIS.md

### 🔧 Scripts/Utilities (6 in root - should be organized)
1. check-backend-status.js
2. deploy-hackathon.js
3. quick-deploy.sh
4. setup-backend.js
5. setup-env.js
6. verify-setup.js

### 🗄️ Database (1)
1. supabase_migration_walletconnect_sessions.sql

### ⚙️ Config Files (3 in root - correct)
1. package.json ← Keep in root
2. package-lock.json ← Keep in root
3. .env.deployment.example ← Keep in root

### 📁 Directories (6 - correct)
1. backend/
2. contracts/
3. frontend/
4. docs/ (currently exists)
5. trash/
6. node_modules/

---

## Proposed Organization

### Root (Keep Essential Files Only)
```
/
├── README.md                    ← Main documentation
├── package.json                 ← NPM config
├── package-lock.json           ← NPM lock
├── .env.deployment.example     ← Environment template
├── .gitignore                  ← Git config
├── backend/                    ← Backend services
├── contracts/                  ← Smart contracts
├── frontend/                   ← Frontend app
├── docs/                       ← All documentation
├── scripts/                    ← NEW: Root-level scripts
├── database/                   ← NEW: Database migrations
└── trash/                      ← Archived files
```

---

## Reorganization Actions

### 1. Create New Directories
- **scripts/** - Root-level deployment/setup scripts
- **database/** - Database migrations and schemas

### 2. Move Documentation Files to docs/
Create subdirectories in docs/:
```
docs/
├── deployment/
│   ├── COMPLETE_CLEAN_DEPLOYMENT.md
│   ├── DEPLOYMENT_SCRIPTS_GUIDE.md
│   └── QUICK_REFERENCE.txt
├── guides/
│   ├── JUDGE_QUICKSTART.md
│   └── FRONTEND_SETUP_VERIFICATION.md
├── analysis/
│   ├── CONTRACTS_TO_RESTORE.md
│   ├── SCRIPTS_ANALYSIS.md
│   └── SCRIPTS_FINAL_ANALYSIS.md
└── CHANGES_LOG.md
```

### 3. Move Scripts to scripts/
```
scripts/
├── deployment/
│   ├── deploy-hackathon.js
│   └── quick-deploy.sh
├── setup/
│   ├── setup-backend.js
│   ├── setup-env.js
│   └── verify-setup.js
└── monitoring/
    └── check-backend-status.js
```

### 4. Move Database Files to database/
```
database/
└── migrations/
    └── supabase_migration_walletconnect_sessions.sql
```

---

## Benefits

✅ **Clean Root** - Only essential config and README
✅ **Organized Docs** - Easy to find documentation by category
✅ **Organized Scripts** - Scripts grouped by purpose
✅ **Scalable** - Easy to add new docs/scripts without cluttering root
✅ **Professional** - Standard project structure

---

## Implementation Order

1. Create new directories (scripts/, database/)
2. Create subdirectories in docs/ (deployment/, guides/, analysis/)
3. Move documentation files
4. Move script files
5. Move database files
6. Update any import paths if needed
7. Commit changes

