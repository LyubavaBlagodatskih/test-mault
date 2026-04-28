#!/usr/bin/env bash
set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()
TOTAL_CHECKS=12

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step6.proof"

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
echo "  MAULT Step 6 Pre-commit Verification"
echo "========================================"
echo ""

# CHECK 1: Step 5 proof exists
if [ -f ".mault/verify-step5.proof" ]; then
    print_pass 1 "Step 5 proof exists"
else
    print_fail 1 "Step 5 not complete."
fi

# CHECK 2: pre-commit installed
export PATH="$HOME/.local/bin:$PATH"
if command -v pre-commit >/dev/null 2>&1; then
    print_pass 2 "pre-commit CLI installed ($(pre-commit --version))"
else
    print_fail 2 "pre-commit CLI not installed."
fi

# CHECK 3: .pre-commit-config.yaml exists
if [ -f ".pre-commit-config.yaml" ]; then
    print_pass 3 "Pre-commit config exists"
else
    print_fail 3 "Missing .pre-commit-config.yaml"
fi

# CHECK 4: Hooks installed (husky or .git/hooks/pre-commit invokes pre-commit)
if [ -f ".husky/pre-commit" ] && grep -q "pre-commit" .husky/pre-commit 2>/dev/null; then
    print_pass 4 "Pre-commit invoked from husky hook"
elif [ -f ".git/hooks/pre-commit" ] && grep -q "pre-commit" .git/hooks/pre-commit 2>/dev/null; then
    print_pass 4 "Pre-commit installed as git hook"
else
    print_fail 4 "Pre-commit not wired to git hooks"
fi

# CHECK 5: pre-commit run --all-files passes
if pre-commit run --all-files >/dev/null 2>&1; then
    print_pass 5 "All pre-commit hooks pass"
else
    print_fail 5 "pre-commit run --all-files failed"
fi

# CHECK 6: CI has validate-pr-title job
if grep -q "validate-pr-title" .github/workflows/ci.yml 2>/dev/null; then
    print_pass 6 "validate-pr-title job in CI"
else
    print_fail 6 "validate-pr-title job missing"
fi

# CHECK 7: CI has validate-branch-name job
if grep -q "validate-branch-name" .github/workflows/ci.yml 2>/dev/null; then
    print_pass 7 "validate-branch-name job in CI"
else
    print_fail 7 "validate-branch-name job missing"
fi

# CHECK 8: Handshake commit with [mault-step6] marker
if git log --all --oneline 2>/dev/null | grep -q "\[mault-step6\]"; then
    print_pass 8 "Handshake commit [mault-step6] exists"
else
    print_fail 8 "No handshake commit found"
fi

# CHECK 9: Pre-commit manifest exists
if [ -f ".mault/pre-commit-manifest.json" ]; then
    print_pass 9 "Pre-commit manifest exists"
else
    print_fail 9 "Missing .mault/pre-commit-manifest.json"
fi

# CHECK 10: Branch protection includes new checks
OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
REPO=$(gh repo view --json name -q '.name' 2>/dev/null) || true
PROTECTION=$(gh api "repos/${OWNER}/${REPO}/branches/${DEFAULT_BRANCH}/protection/required_status_checks" -q '.contexts[]' 2>/dev/null) || true
if echo "$PROTECTION" | grep -q "validate-pr-title" && echo "$PROTECTION" | grep -q "validate-branch-name"; then
    print_pass 10 "Branch protection requires validate-pr-title + validate-branch-name"
else
    print_fail 10 "Branch protection missing new validation checks"
fi

# CHECK 11: Latest CI green on main
RUN_CONCLUSION=$(gh run list --branch "$DEFAULT_BRANCH" --limit 1 --json conclusion -q '.[0].conclusion' 2>/dev/null) || true
if [ "$RUN_CONCLUSION" = "success" ]; then
    print_pass 11 "Latest CI on $DEFAULT_BRANCH succeeded"
else
    print_pending 11 "Latest CI on $DEFAULT_BRANCH: ${RUN_CONCLUSION:-no run}"
fi

# CHECK 12: Handshake issue exists
ISSUE_URL=$(gh issue list --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
if [ -z "$ISSUE_URL" ]; then
    ISSUE_URL=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 6" --json url -q '.[0].url' 2>/dev/null) || true
fi
if [ -n "$ISSUE_URL" ]; then
    print_pass 12 "Handshake issue: $ISSUE_URL"
else
    print_pending 12 "No handshake issue yet"
fi

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/${TOTAL_CHECKS}  FAIL: ${FAIL_COUNT}/${TOTAL_CHECKS}  PENDING: ${PENDING_COUNT}/${TOTAL_CHECKS}"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
    SHA=$(git rev-parse --short HEAD)
    EPOCH=$(date +%s)
    ISO=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
    TOKEN="MAULT-STEP6-${SHA}-${EPOCH}-${TOTAL_CHECKS}/${TOTAL_CHECKS}"
    mkdir -p "$PROOF_DIR"
    [ -f "$PROOF_DIR/.gitignore" ] || printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
    {
        echo "MAULT-STEP6-PROOF"
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
elif [ "$FAIL_COUNT" -gt 0 ]; then
    rm -f "$PROOF_FILE"
    exit 1
else
    rm -f "$PROOF_FILE"
    exit 1
fi
