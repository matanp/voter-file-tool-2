# Infrastructure Script Architecture Decision

## Problem

Originally, the setup process used multiple independent bash scripts executed sequentially via `bash script.sh`. This approach had a critical flaw: **each `bash` invocation creates a new shell session**, causing environment variables (like `PATH`, `NVM_DIR`, etc.) to not persist between scripts.

### Specific Issue

The `03-build-packages.sh` script failed with `pnpm: command not found` even though `01-install-dependencies.sh` installed pnpm globally. This happened because:

1. Script 01 installed pnpm via `npm install -g pnpm` in its own shell session
2. Script 03 ran in a new shell session and loaded nvm
3. After loading nvm, pnpm was not in PATH because the installation from script 01 didn't persist

## Solution: Hybrid Master Script Approach

We implemented a **hybrid approach** that combines the benefits of modular scripts with environment persistence:

### Architecture

- **Master Script** (`00-setup-all.sh`): Loads nvm once at the start, then sources all individual scripts
- **Individual Scripts**: Remain modular and focused, but are designed to be sourced (not executed)
- **Environment Persistence**: All scripts share the same shell session, so environment variables persist

### Implementation

```bash
# Master script loads nvm once
source "$SCRIPT_DIR/01-install-dependencies.sh"
source "$SCRIPT_DIR/02-setup-project.sh"
source "$SCRIPT_DIR/03-build-packages.sh"
# ... etc
```

### Benefits

1. **Environment Persistence**: nvm, pnpm, and other tools are loaded once and available to all scripts
2. **Modularity Maintained**: Individual scripts remain focused and testable
3. **No Redundant Setup**: nvm is loaded once instead of multiple times
4. **Easier Debugging**: Can still run individual scripts for testing (with proper environment setup)
5. **Clearer Structure**: Master script shows the complete setup flow at a glance

### Trade-offs

**Pros:**
- Solves the environment persistence issue
- Maintains code modularity
- Reduces redundant nvm loading
- Simpler Terraform configuration (one script call)

**Cons:**
- Scripts must be aware they're being sourced (not executed)
- Individual scripts can't be run standalone without environment setup
- Slightly more complex than a single monolithic script

### Alternative Approaches Considered

1. **Single Monolithic Script**: Rejected - too hard to maintain and debug
2. **Keep Current + Fix PATH**: Accepted initially, but hybrid is cleaner long-term
3. **Environment File**: Rejected - adds complexity without solving the core issue

## Usage

### In Terraform (Production)

```bash
bash infrastructure/scripts/00-setup-all.sh
```

### For Development/Debugging

Individual scripts can still be run, but require environment setup first:

```bash
# Load nvm first
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Then source the script
source infrastructure/scripts/03-build-packages.sh
```

## Script Design Principles

When creating or modifying setup scripts:

1. **Assume Environment**: Scripts should assume nvm/npm/pnpm are available (loaded by master script)
2. **Add Safety Checks**: Include verification that required tools are available
3. **Document Sourcing**: Add a comment noting the script is designed to be sourced
4. **No Exit on Missing Env**: If environment isn't set up, provide helpful error messages

## Date

This decision was made in response to the pnpm PATH issue encountered during deployment setup.
