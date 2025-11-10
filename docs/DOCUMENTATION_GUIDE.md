# ZMART V0.69 - Documentation Guide
**The Bulletproof Documentation System**
**Last Updated:** November 8, 2025

---

## 📊 Documentation Structure

Our documentation is organized into a bulletproof hierarchical system where everything is interconnected and easily findable.

### Root Level (Single Source of Truth)
```
/
├── README.md                 - User-facing project overview
├── CLAUDE.md                - Complete project instructions (you are here)
└── CURRENT_STATUS.md        - Live project status (CHECK THIS FIRST!)
```

### Documentation Directory
```
/docs/
├── DOCUMENTATION_GUIDE.md   - This file (explains the structure)
├── 00_MASTER_INDEX.md       - Complete navigation hub
│
├── orientation/             - "Where things are" documents
│   ├── PROJECT_STRUCTURE.md     - Complete file tree with descriptions
│   ├── ENVIRONMENT_GUIDE.md     - Credentials & environment variables
│   ├── SERVICE_ARCHITECTURE.md  - How services connect
│   └── CREDENTIALS_MAP.md       - Which service uses what
│
├── specifications/          - Core implementation specs
│   ├── 03_SOLANA_PROGRAM_DESIGN.md     - 18 Anchor instructions
│   ├── 05_LMSR_MATHEMATICS.md          - LMSR formulas & math
│   ├── 06_STATE_MANAGEMENT.md          - 6-state FSM
│   ├── 07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md - Hybrid architecture
│   ├── 08_DATABASE_SCHEMA.md           - Supabase schema
│   ├── CORE_LOGIC_INVARIANTS.md        - Blueprint compliance
│   ├── EVM_TO_SOLANA_TRANSLATION.md    - Pattern mapping
│   └── SOLANA_PROGRAM_ARCHITECTURE.md  - Program structure
│
├── workflow/                - Development processes
│   ├── IMPLEMENTATION_PHASES.md   - 14-week roadmap
│   ├── TODO_CHECKLIST.md         - Task tracking
│   ├── DEVELOPMENT_WORKFLOW.md   - Git & PR process
│   ├── DEFINITION_OF_DONE.md     - Quality gates
│   ├── FRONTEND_SCOPE_V1.md      - Frontend boundaries
│   └── SCHEMA_MANAGEMENT.md      - Database workflow
│
├── guides/                  - Operational guides
│   ├── DEPLOYMENT_GUIDE.md           - How to deploy
│   ├── TESTING_GUIDE.md             - Testing strategies
│   ├── CREDENTIAL_ROTATION_GUIDE.md  - Security procedures
│   ├── EXTERNAL_SERVICES_SETUP_GUIDE.md - Service setup
│   └── ISSUE_RESOLUTION_LIBRARY.md   - Problem solutions
│
├── stories/                 - Implementation stories
│   └── [30+ story files]
│
└── archive/2025-11/         - Historical documents
    └── [40+ archived status documents]
```

---

## 🗺️ Navigation Map

### "I need to know..." → "Go here:"

| Question | Primary Document | Supporting Documents |
|----------|------------------|----------------------|
| **Current project status?** | [CURRENT_STATUS.md](/CURRENT_STATUS.md) | [TODO_CHECKLIST.md](/docs/workflow/TODO_CHECKLIST.md) |
| **Where is X located?** | [PROJECT_STRUCTURE.md](/docs/orientation/PROJECT_STRUCTURE.md) | [00_MASTER_INDEX.md](/docs/00_MASTER_INDEX.md) |
| **Which credential goes where?** | [ENVIRONMENT_GUIDE.md](/docs/orientation/ENVIRONMENT_GUIDE.md) | [CREDENTIALS_MAP.md](/docs/orientation/CREDENTIALS_MAP.md) |
| **How do services connect?** | [SERVICE_ARCHITECTURE.md](/docs/orientation/SERVICE_ARCHITECTURE.md) | [07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md](/docs/specifications/07_ON_CHAIN_OFF_CHAIN_INTEGRATION.md) |
| **What's the roadmap?** | [IMPLEMENTATION_PHASES.md](/docs/workflow/IMPLEMENTATION_PHASES.md) | [TODO_CHECKLIST.md](/docs/workflow/TODO_CHECKLIST.md) |
| **How to deploy?** | [DEPLOYMENT_GUIDE.md](/docs/guides/DEPLOYMENT_GUIDE.md) | [EXTERNAL_SERVICES_SETUP_GUIDE.md](/docs/guides/EXTERNAL_SERVICES_SETUP_GUIDE.md) |
| **How to test?** | [TESTING_GUIDE.md](/docs/guides/TESTING_GUIDE.md) | [DEFINITION_OF_DONE.md](/docs/workflow/DEFINITION_OF_DONE.md) |
| **Technical specs?** | [specifications/](/docs/specifications/) | [CORE_LOGIC_INVARIANTS.md](/docs/specifications/CORE_LOGIC_INVARIANTS.md) |
| **Development process?** | [DEVELOPMENT_WORKFLOW.md](/docs/workflow/DEVELOPMENT_WORKFLOW.md) | [DEFINITION_OF_DONE.md](/docs/workflow/DEFINITION_OF_DONE.md) |

---

## 🔗 Cross-Reference Network

Every document is interconnected. Here's how they reference each other:

### Core Triangle (Always Start Here)
```
CURRENT_STATUS.md ←→ CLAUDE.md ←→ IMPLEMENTATION_PHASES.md
         ↓                ↓                    ↓
   TODO_CHECKLIST   PROJECT_STRUCTURE   CORE_LOGIC_INVARIANTS
```

### Orientation Documents (Finding Things)
```
PROJECT_STRUCTURE.md → Shows where everything is
         ↓
ENVIRONMENT_GUIDE.md → Shows credentials & env vars
         ↓
SERVICE_ARCHITECTURE.md → Shows how things connect
         ↓
CREDENTIALS_MAP.md → Shows credential usage
```

### Implementation Flow
```
CORE_LOGIC_INVARIANTS.md → What to build (blueprint)
         ↓
03_SOLANA_PROGRAM_DESIGN.md → How to build (specs)
         ↓
IMPLEMENTATION_PHASES.md → When to build (roadmap)
         ↓
TODO_CHECKLIST.md → Track progress (tasks)
```

---

## 📚 Document Categories Explained

### 1. Orientation Documents
**Purpose:** Help you find things quickly
- Use when: You're lost or looking for something specific
- Key docs: PROJECT_STRUCTURE.md (file locations), ENVIRONMENT_GUIDE.md (credentials)
- Time to answer: <30 seconds

### 2. Specification Documents
**Purpose:** Technical implementation details
- Use when: Building features or understanding architecture
- Key docs: 03_SOLANA_PROGRAM_DESIGN.md (programs), 05_LMSR_MATHEMATICS.md (formulas)
- Authoritative source for technical decisions

### 3. Workflow Documents
**Purpose:** How we work and build
- Use when: Starting new work or checking processes
- Key docs: IMPLEMENTATION_PHASES.md (roadmap), DEVELOPMENT_WORKFLOW.md (git process)
- Ensures consistent development practices

### 4. Guide Documents
**Purpose:** Step-by-step operational procedures
- Use when: Deploying, testing, or troubleshooting
- Key docs: DEPLOYMENT_GUIDE.md, TESTING_GUIDE.md
- Practical instructions for common tasks

### 5. Story Documents
**Purpose:** Feature implementation tracking
- Use when: Working on specific features
- Format: One story per feature branch
- Links implementation to requirements

---

## 🎯 Quick Start Paths

### For New Developers
1. Start with [README.md](/README.md) - Project overview
2. Read [CURRENT_STATUS.md](/CURRENT_STATUS.md) - Current state
3. Review [PROJECT_STRUCTURE.md](/docs/orientation/PROJECT_STRUCTURE.md) - Where things are
4. Study [IMPLEMENTATION_PHASES.md](/docs/workflow/IMPLEMENTATION_PHASES.md) - What to build
5. Follow [DEVELOPMENT_WORKFLOW.md](/docs/workflow/DEVELOPMENT_WORKFLOW.md) - How to work

### For Backend Development
1. Check [CURRENT_STATUS.md](/CURRENT_STATUS.md) - What's deployed
2. Review [SERVICE_ARCHITECTURE.md](/docs/orientation/SERVICE_ARCHITECTURE.md) - Service connections
3. Read [ENVIRONMENT_GUIDE.md](/docs/orientation/ENVIRONMENT_GUIDE.md) - Required credentials
4. Follow [DEPLOYMENT_GUIDE.md](/docs/guides/DEPLOYMENT_GUIDE.md) - How to deploy
5. Use [TODO_CHECKLIST.md](/docs/workflow/TODO_CHECKLIST.md) - Track progress

### For Solana Development
1. Study [CORE_LOGIC_INVARIANTS.md](/docs/specifications/CORE_LOGIC_INVARIANTS.md) - Blueprint rules
2. Read [03_SOLANA_PROGRAM_DESIGN.md](/docs/specifications/03_SOLANA_PROGRAM_DESIGN.md) - Program specs
3. Review [05_LMSR_MATHEMATICS.md](/docs/specifications/05_LMSR_MATHEMATICS.md) - LMSR formulas
4. Check [EVM_TO_SOLANA_TRANSLATION.md](/docs/specifications/EVM_TO_SOLANA_TRANSLATION.md) - Pattern translations

### For Testing
1. Read [TESTING_GUIDE.md](/docs/guides/TESTING_GUIDE.md) - Testing strategies
2. Review [DEFINITION_OF_DONE.md](/docs/workflow/DEFINITION_OF_DONE.md) - Quality gates
3. Check test files in PROJECT_STRUCTURE.md
4. Follow testing procedures for your component

---

## 🔍 Finding Information Fast

### Search Strategies

**By Topic:**
- Status → CURRENT_STATUS.md
- Files → PROJECT_STRUCTURE.md
- Credentials → ENVIRONMENT_GUIDE.md
- Architecture → SERVICE_ARCHITECTURE.md
- Roadmap → IMPLEMENTATION_PHASES.md
- Tasks → TODO_CHECKLIST.md

**By Question Type:**
- "Where is..." → PROJECT_STRUCTURE.md
- "How to..." → guides/ directory
- "What is..." → specifications/ directory
- "When to..." → IMPLEMENTATION_PHASES.md
- "Current..." → CURRENT_STATUS.md

**By Component:**
- Programs → 03_SOLANA_PROGRAM_DESIGN.md
- Backend → SERVICE_ARCHITECTURE.md + backend/ directory
- Database → 08_DATABASE_SCHEMA.md
- Frontend → FRONTEND_SCOPE_V1.md
- Testing → TESTING_GUIDE.md

---

## 📊 Documentation Health Metrics

### Coverage
- ✅ All major components documented
- ✅ All processes defined
- ✅ All credentials mapped
- ✅ All services described
- ✅ Complete file tree available

### Quality
- ✅ Single source of truth established (CURRENT_STATUS.md)
- ✅ No duplicate documents (archived)
- ✅ Clear categorization (5 categories)
- ✅ Complete cross-referencing
- ✅ <30 second navigation to any information

### Maintenance
- Living documents updated regularly
- Historical documents archived monthly
- Status tracked in CURRENT_STATUS.md
- Progress tracked in TODO_CHECKLIST.md
- Documentation guide (this file) maintained

---

## 🚨 Important Rules

### 1. Single Source of Truth
- **Status:** Only CURRENT_STATUS.md (never create new status docs)
- **Tasks:** Only TODO_CHECKLIST.md (aligned with IMPLEMENTATION_PHASES.md)
- **Credentials:** Only ENVIRONMENT_GUIDE.md (backend/.env is live)

### 2. Documentation Updates
- Update CURRENT_STATUS.md when deployment state changes
- Update TODO_CHECKLIST.md daily during active development
- Archive old documents to docs/archive/YYYY-MM/
- Never create duplicate documents with " 2" suffix

### 3. Cross-References
- Every document should link to related documents
- Use relative paths for internal links
- Include "See Also" sections
- Maintain breadcrumb navigation

### 4. Finding Help
1. Check CURRENT_STATUS.md first
2. Use PROJECT_STRUCTURE.md to find code
3. Use ENVIRONMENT_GUIDE.md for credentials
4. Check guides/ for how-to instructions
5. Review specifications/ for technical details

---

## 📞 Support Paths

If you can't find what you need:

1. **Check Navigation:**
   - [00_MASTER_INDEX.md](/docs/00_MASTER_INDEX.md) - Complete index
   - [PROJECT_STRUCTURE.md](/docs/orientation/PROJECT_STRUCTURE.md) - File locations
   - [DOCUMENTATION_GUIDE.md](/docs/DOCUMENTATION_GUIDE.md) - This file

2. **Check Categories:**
   - orientation/ - Finding things
   - specifications/ - Technical details
   - workflow/ - Processes
   - guides/ - Instructions
   - stories/ - Features

3. **Check Status:**
   - [CURRENT_STATUS.md](/CURRENT_STATUS.md) - Overall status
   - [TODO_CHECKLIST.md](/docs/workflow/TODO_CHECKLIST.md) - Task status
   - [IMPLEMENTATION_PHASES.md](/docs/workflow/IMPLEMENTATION_PHASES.md) - Phase status

---

## ✅ Documentation Completeness Checklist

- [x] Project status documented (CURRENT_STATUS.md)
- [x] Complete file tree available (PROJECT_STRUCTURE.md)
- [x] All credentials mapped (ENVIRONMENT_GUIDE.md)
- [x] Service architecture documented (SERVICE_ARCHITECTURE.md)
- [x] Implementation roadmap defined (IMPLEMENTATION_PHASES.md)
- [x] Task tracking system active (TODO_CHECKLIST.md)
- [x] Technical specifications complete (8 spec docs)
- [x] Development workflow defined (DEVELOPMENT_WORKFLOW.md)
- [x] Quality gates established (DEFINITION_OF_DONE.md)
- [x] Deployment guide available (DEPLOYMENT_GUIDE.md)
- [x] Testing guide available (TESTING_GUIDE.md)
- [x] Cross-references established (all docs interconnected)
- [x] Archives organized (docs/archive/2025-11/)
- [x] Navigation guide created (this document)

**Documentation System Status: BULLETPROOF ✅**

---

*This is your map to the documentation. Start with CURRENT_STATUS.md, navigate with PROJECT_STRUCTURE.md, and build with IMPLEMENTATION_PHASES.md.*