#!/usr/bin/env bash
set -uo pipefail

PASS_COUNT=0
FAIL_COUNT=0
PENDING_COUNT=0
CHECK_RESULTS=()

PROOF_DIR=".mault"
PROOF_FILE="$PROOF_DIR/verify-step5.proof"

record_result() { CHECK_RESULTS+=("CHECK $1: $2 - $3"); }
print_pass()    { echo "[PASS]    CHECK $1: $2"; PASS_COUNT=$((PASS_COUNT + 1)); record_result "$1" "PASS" "$2"; }
print_fail()    { echo "[FAIL]    CHECK $1: $2"; FAIL_COUNT=$((FAIL_COUNT + 1)); record_result "$1" "FAIL" "$2"; }
print_pending() { echo "[PENDING] CHECK $1: $2"; PENDING_COUNT=$((PENDING_COUNT + 1)); record_result "$1" "PENDING" "$2"; }

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "ERROR: Not a git repository."
  exit 1
fi

DEFAULT_BRANCH=$(gh repo view --json defaultBranchRef -q '.defaultBranchRef.name' 2>/dev/null || echo "main")

write_proof_file() {
  local sha epoch iso token
  sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
  epoch=$(date +%s)
  iso=$(date -u +"%Y-%m-%dT%H:%M:%SZ" 2>/dev/null || date +"%Y-%m-%dT%H:%M:%S")
  token="MAULT-STEP5-${sha}-${epoch}-9/9"
  mkdir -p "$PROOF_DIR"
  if [ ! -f "$PROOF_DIR/.gitignore" ]; then
    printf '*\n!.gitignore\n' > "$PROOF_DIR/.gitignore"
  fi
  {
    echo "MAULT-STEP5-PROOF"
    echo "=================="
    echo "Timestamp: $epoch"
    echo "DateTime: $iso"
    echo "GitSHA: $sha"
    echo "Checks: 9/9 PASS"
    for r in "${CHECK_RESULTS[@]}"; do
      echo "  $r"
    done
    echo "=================="
    echo "Token: $token"
  } > "$PROOF_FILE"
  echo ""
  echo "Proof file written: $PROOF_FILE"
  echo "Token: $token"
}

check_proof_staleness() {
  if [ -f "$PROOF_FILE" ]; then
    local proof_sha current_sha
    proof_sha=$(grep '^GitSHA:' "$PROOF_FILE" | awk '{print $2}')
    current_sha=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
    if [ "$proof_sha" != "$current_sha" ]; then
      echo "WARNING: Proof file STALE (proof: $proof_sha, HEAD: $current_sha). Deleting."
      rm -f "$PROOF_FILE"
    fi
  fi
}

STACK="node"

echo "========================================"
echo "  MAULT Step 5 TDD Framework Verification"
echo "  Detected stack: $STACK"
echo "========================================"
echo ""

check_1() {
  if [ ! -f ".mault/verify-step4.proof" ]; then
    print_fail 1 "Step 4 not complete."
    return
  fi
  local token
  token=$(grep '^Token:' .mault/verify-step4.proof | awk '{print $2}') || true
  local owner repo
  owner=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
  repo=$(gh repo view --json name -q '.name' 2>/dev/null) || true
  if [ -n "$owner" ] && [ -n "$repo" ]; then
    local enforce_admins approval_count
    enforce_admins=$(gh api "repos/${owner}/${repo}/branches/${DEFAULT_BRANCH}/protection/enforce_admins" -q '.enabled' 2>/dev/null) || true
    approval_count=$(gh api "repos/${owner}/${repo}/branches/${DEFAULT_BRANCH}/protection/required_pull_request_reviews" -q '.required_approving_review_count' 2>/dev/null) || true
    if [ "$enforce_admins" != "true" ]; then
      print_fail 1 "Step 4 proof exists but enforce_admins is OFF."
      return
    fi
    if [ -z "$approval_count" ] || [ "$approval_count" -lt 1 ] 2>/dev/null; then
      print_fail 1 "Step 4 proof exists but PR approvals required is ${approval_count:-0}."
      return
    fi
  fi
  print_pass 1 "Step 4 proof exists (${token:-unknown}), branch protection verified"
}

check_2() {
  local missing=""
  for dir in tests/unit tests/integration tests/mocks; do
    if [ ! -d "$dir" ]; then missing="${missing}${dir} "; fi
  done
  if [ -z "$missing" ]; then
    print_pass 2 "Test directory pyramid exists"
  else
    print_fail 2 "Missing test directories: ${missing}"
  fi
}

check_3() {
  if [ -f "jest.config.ts" ] || [ -f "jest.config.js" ] || [ -f "jest.config.mjs" ]; then
    print_pass 3 "Test runner configuration found"
  elif [ -f "package.json" ] && grep -q '"jest"' package.json 2>/dev/null; then
    print_pass 3 "Test runner configuration found"
  else
    print_fail 3 "No test runner config."
  fi
}

check_4() {
  for config in jest.config.ts jest.config.js jest.config.mjs; do
    if [ -f "$config" ] && grep -q 'coverageThreshold' "$config" 2>/dev/null; then
      print_pass 4 "Coverage thresholds configured"
      return
    fi
  done
  if [ -f "package.json" ] && grep -q 'coverageThreshold' package.json 2>/dev/null; then
    print_pass 4 "Coverage thresholds configured"
    return
  fi
  print_fail 4 "No coverage thresholds."
}

check_5() {
  if [ -d "tests/mocks" ] && ls tests/mocks/*.ts tests/mocks/*.js >/dev/null 2>&1; then
    print_pass 5 "Shared mock infrastructure exists"
  else
    print_pending 5 "No shared mocks."
  fi
}

check_6() {
  local test_cmd=""
  if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
    if [ -f "jest.config.ts" ] || [ -f "jest.config.js" ] || [ -f "jest.config.mjs" ] || \
       grep -q '"jest"' package.json 2>/dev/null; then
      test_cmd="npm test -- --forceExit 2>&1"
    else
      test_cmd="npm test 2>&1"
    fi
  fi
  if [ -z "$test_cmd" ]; then
    print_pending 6 "No test command detected."
    return
  fi
  local output exit_code
  output=$(eval "$test_cmd" 2>&1)
  exit_code=$?
  if [ "$exit_code" -eq 0 ]; then
    if echo "$output" | grep -qiE "pass|passed|OK|[0-9]+ tests?"; then
      print_pass 6 "Tests pass with at least 1 real test"
    else
      print_fail 6 "Test runner exited 0 but no tests found."
    fi
  else
    print_fail 6 "Tests failing (exit code: ${exit_code})."
  fi
}

check_7() {
  local ci_file
  ci_file=$(ls .github/workflows/ci.yml .github/workflows/ci.yaml 2>/dev/null | head -1) || true
  if [ -z "$ci_file" ]; then
    print_fail 7 "No CI workflow found."
    return
  fi
  if ! grep -qE -- 'integration|Integration' "$ci_file" 2>/dev/null; then
    print_fail 7 "CI workflow missing integration job."
    return
  fi
  if ! grep -qE -- '--coverage|--cov|coverageReporters|cov-fail-under|cov_fail_under' "$ci_file" 2>/dev/null; then
    print_fail 7 "CI workflow missing coverage flag."
    return
  fi
  local owner repo
  owner=$(gh repo view --json owner -q '.owner.login' 2>/dev/null) || true
  repo=$(gh repo view --json name -q '.name' 2>/dev/null) || true
  if [ -n "$owner" ] && [ -n "$repo" ]; then
    local protection
    protection=$(gh api "repos/${owner}/${repo}/branches/${DEFAULT_BRANCH}/protection/required_status_checks" -q '.contexts[]' 2>/dev/null) || true
    if [ -n "$protection" ]; then
      if ! echo "$protection" | grep -qiF "integration" 2>/dev/null; then
        print_fail 7 "Integration job exists in CI but is NOT a required branch protection check."
        return
      fi
    fi
  fi
  print_pass 7 "CI has integration job with coverage, required in branch protection"
}

check_8() {
  if [ -f "package.json" ] && grep -qE '"test:tia"|"test:changed"' package.json 2>/dev/null; then
    print_pass 8 "TIA script configured"
  elif [ -f "scripts/test-impact-analysis.js" ]; then
    print_pass 8 "TIA script configured"
  else
    print_fail 8 "No TIA script."
  fi
}

check_9() {
  local issue_url
  issue_url=$(gh issue list --search "[MAULT] Production Readiness: Step 5" --json url -q '.[0].url' 2>/dev/null) || true
  if [ -z "$issue_url" ]; then
    issue_url=$(gh issue list --state closed --search "[MAULT] Production Readiness: Step 5" --json url -q '.[0].url' 2>/dev/null) || true
  fi
  if [ -n "$issue_url" ]; then
    print_pass 9 "Handshake issue: ${issue_url}"
  else
    print_pending 9 "No handshake issue found."
  fi
}

check_proof_staleness
check_1; check_2; check_3; check_4; check_5; check_6; check_7; check_8; check_9

echo ""
echo "========================================"
echo "  PASS: ${PASS_COUNT}/9  FAIL: ${FAIL_COUNT}/9  PENDING: ${PENDING_COUNT}/9"
echo "========================================"

if [ "$FAIL_COUNT" -eq 0 ] && [ "$PENDING_COUNT" -eq 0 ]; then
  write_proof_file
  echo "ALL CHECKS PASSED. Step 5 TDD Framework is complete."
  exit 0
elif [ "$FAIL_COUNT" -gt 0 ]; then
  rm -f "$PROOF_FILE"
  echo "${FAIL_COUNT} check(s) FAILED."
  exit 1
else
  rm -f "$PROOF_FILE"
  echo "${PENDING_COUNT} check(s) PENDING."
  exit 1
fi
