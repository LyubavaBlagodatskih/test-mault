#!/usr/bin/env bash
set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()
TOTAL_CHECKS=18

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step8.proof"

record_result() { CHECK_RESULTS+=("CHECK $1: $2 - $3"); }
print_pass()    { echo "[PASS]    CHECK $1: $2"; PASS_COUNT=$((PASS_COUNT + 1)); record_result "$1" "PASS" "$2"; }
print_fail()    { echo "[FAIL]    CHECK $1: $2"; FAIL_COUNT=$((FAIL_COUNT + 1)); record_result "$1" "FAIL" "$2"; }
print_pending() { echo "[PENDING] CHECK $1: $2"; PENDING_COUNT=$((PENDING_COUNT + 1)); record_result "$1" "PENDING" "$2"; }

if [ -f "$PROOF_FILE" ]; then
    PROOF_SHA=$(grep '^GitSHA:' "$PROOF_FILE" | awk '{print $2}')
    CURRENT_SHA=$(git rev-parse --short HEAD 2>/dev/null)
    if [ "$PROOF_SHA" != "$CURRENT_SHA" ]; then
        echo "Stale proof. Deleting."
        rm -f "$PROOF_FILE"
    fi
fi

DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo "main")

echo "========================================"
echo "  MAULT Step 8 Governance Verification"
echo "========================================"
echo ""

# CHECK 1: Step 6 proof (Step 7 sunset)
if [ -f ".mault/verify-step6.proof" ]; then
    print_pass 1 "Step 6 proof exists"
else
    print_fail 1 "Step 6 not complete"
fi

# CHECK 2: governance scripts directory
if [ -d "scripts/governance" ] && [ "$(ls scripts/governance/*.js scripts/governance/*.mjs 2>/dev/null | wc -l)" -ge 10 ]; then
    print_pass 2 "scripts/governance/ exists with $(ls scripts/governance/*.js scripts/governance/*.mjs 2>/dev/null | wc -l | tr -d ' ') scripts"
else
    print_fail 2 "scripts/governance/ missing or empty"
fi

# CHECK 3: Iron Dome ratchets
if [ -f "scripts/governance/baselines/any-baseline.json" ] && [ -f "scripts/governance/baselines/silent-catches-baseline.json" ]; then
    print_pass 3 "Iron Dome ratchet baselines exist"
else
    print_fail 3 "Iron Dome baselines missing"
fi

# CHECK 4: Mock Tax script runs
if node scripts/governance/check-mock-tax.js >/dev/null 2>&1; then
    print_pass 4 "Mock Tax check passes"
else
    print_fail 4 "Mock Tax check failing"
fi

# CHECK 5: Integration pairing
if node scripts/governance/verify-integration-pairing.js >/dev/null 2>&1; then
    print_pass 5 "Buddy System (integration pairing) passes"
else
    print_fail 5 "Integration pairing failing"
fi

# CHECK 6: Behavioral pairing
if node scripts/governance/verify-behavioral-pairing.js >/dev/null 2>&1; then
    print_pass 6 "Perception Check passes"
else
    print_fail 6 "Behavioral pairing failing"
fi

# CHECK 7: Supply chain
if [ -f "scripts/governance/check-hallucinations.js" ]; then
    print_pass 7 "Supply chain script exists"
else
    print_fail 7 "Supply chain script missing"
fi

# CHECK 8: Coverage fortress baseline
if [ -f "scripts/governance/baselines/coverage-baseline.json" ]; then
    print_pass 8 "Coverage Fortress baseline exists"
else
    print_fail 8 "Coverage baseline missing"
fi

# CHECK 9: SRP guardrails
if node scripts/governance/guardrails-check.js >/dev/null 2>&1; then
    print_pass 9 "SRP Guardrails pass"
else
    print_fail 9 "SRP Guardrails failing"
fi

# CHECK 10: Code health
if node scripts/governance/code-health-check.js >/dev/null 2>&1; then
    print_pass 10 "Code Health passes"
else
    print_fail 10 "Code Health failing"
fi

# CHECK 11: Mutation testing config (script present, threshold known)
if [ -f "scripts/governance/check-mutation-score.js" ]; then
    print_pass 11 "Mutation testing script present"
else
    print_fail 11 "Mutation testing missing"
fi

# CHECK 12: Gitleaks CI step
if grep -q "gitleaks" .github/workflows/ci.yml 2>/dev/null; then
    print_pass 12 "Gitleaks CI step configured"
else
    print_fail 12 "Gitleaks not in CI"
fi

# CHECK 13: governance job in CI
if grep -q "^  governance:" .github/workflows/ci.yml 2>/dev/null; then
    print_pass 13 "governance CI job exists"
else
    print_fail 13 "governance CI job missing"
fi

# CHECK 14: governance manifest
if [ -f ".mault/governance-manifest.json" ]; then
    print_pass 14 "Governance manifest exists"
else
    print_fail 14 "Governance manifest missing"
fi

# CHECK 15: Handshake commit [mault-step8]
LOG_OUTPUT=$(git log --all --oneline 2>/dev/null || true)
if echo "$LOG_OUTPUT" | grep -q "\[mault-step8\]"; then
    print_pass 15 "Handshake commit [mault-step8] exists"
else
    print_fail 15 "No handshake commit"
fi

# CHECK 16: Branch protection has governance + gitleaks
OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
REPO=$(gh repo view --json name -q '.name' 2>/dev/null) || true
PROTECTION=$(gh api "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection/required_status_checks" -q '.contexts[]' 2>/dev/null) || true
if echo "$PROTECTION" | grep -q "governance" && echo "$PROTECTION" | grep -q "gitleaks"; then
    print_pass 16 "Branch protection requires governance + gitleaks"
else
    print_fail 16 "Branch protection missing governance/gitleaks checks"
fi

# CHECK 17: Latest CI on main green
RUN_CONCLUSION=$(gh run list --branch "$DEFAULT_BRANCH" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null) || true
if [ "$RUN_CONCLUSION" = "success" ]; then
    print_pass 17 "Latest CI on $DEFAULT_BRANCH succeeded"
else
    print_pending 17 "Latest CI: ${RUN_CONCLUSION:-pending}"
fi

# CHECK 18: Handshake issue
ISSUE_URL=$(gh issue list --search "[MAULT] Production Readiness: Step 8" --json url -q '.[0].url' 2>/dev/null) || true
if [ -z "$ISSUE_URL" ]; then
    ISSUE_URL=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 8" --json url -q '.[0].url' 2>/dev/null) || true
fi
if [ -n "$ISSUE_URL" ]; then
    print_pass 18 "Handshake issue: $ISSUE_URL"
else
    print_pending 18 "No handshake issue yet"
fi

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/${TOTAL_CHECKS}  FAIL: ${FAIL_COUNT}/${TOTAL_CHECKS}  PENDING: ${PENDING_COUNT}/${TOTAL_CHECKS}"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
    SHA=$(git rev-parse --short HEAD)
    EPOCH=$(date +%s)
    ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    TOKEN="MAULT-STEP8-${SHA}-${EPOCH}-${TOTAL_CHECKS}/${TOTAL_CHECKS}"
    mkdir -p "$PROOF_DIR"
    [ -f "$PROOF_DIR/.gitignore" ] || printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
    {
        echo "MAULT-STEP8-PROOF"
        echo "=================="
        echo "Timestamp: $EPOCH"
        echo "DateTime: $ISO"
        echo "GitSHA: $SHA"
        echo "Checks: ${TOTAL_CHECKS}/${TOTAL_CHECKS} PASS"
        for r in "${CHECK_RESULTS[@]}"; do echo "  $r"; done
        echo "=================="
        echo "Token: $TOKEN"
    } > "$PROOF_FILE"
    echo ""
    echo "Proof written: $PROOF_FILE"
    echo "Token: $TOKEN"
    exit 0
else
    rm -f "$PROOF_FILE"
    exit 1
fi
