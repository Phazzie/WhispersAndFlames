#!/bin/bash

# Contract Test Verification Script
# This script verifies that all contract tests are properly set up

echo "================================================"
echo "Contract Test Suite Verification"
echo "Whispers and Flames - SDD Implementation"
echo "================================================"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if files exist
echo "Checking contract test files..."
echo ""

files=(
  "src/tests/contracts/GameService.contract.test.ts"
  "src/tests/contracts/AIService.contract.test.ts"
  "src/tests/contracts/AuthService.contract.test.ts"
  "src/tests/contracts/README.md"
  "src/tests/contracts/examples/GameService.memory.test.ts"
  "src/tests/contracts/examples/GameService.pg.test.ts"
  "src/tests/contracts/examples/AIService.mock.test.ts"
  "src/tests/contracts/examples/AIService.real.test.ts"
  "src/tests/contracts/examples/AuthService.mock.test.ts"
  "CONTRACT_TESTS_SUMMARY.md"
)

all_exist=true
for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $file"
  else
    echo -e "✗ $file (MISSING)"
    all_exist=false
  fi
done

echo ""
echo "================================================"
echo "Test Coverage Summary"
echo "================================================"
echo ""

# Count lines
gameservice_lines=$(wc -l < "src/tests/contracts/GameService.contract.test.ts" 2>/dev/null || echo "0")
aiservice_lines=$(wc -l < "src/tests/contracts/AIService.contract.test.ts" 2>/dev/null || echo "0")
authservice_lines=$(wc -l < "src/tests/contracts/AuthService.contract.test.ts" 2>/dev/null || echo "0")
total_lines=$((gameservice_lines + aiservice_lines + authservice_lines))

echo "GameService Contract Tests: $gameservice_lines lines"
echo "AIService Contract Tests:   $aiservice_lines lines"
echo "AuthService Contract Tests: $authservice_lines lines"
echo "-------------------"
echo "Total Contract Tests:       $total_lines lines"
echo ""

# Count test functions (approximate)
gameservice_tests=$(grep -c "it('should" "src/tests/contracts/GameService.contract.test.ts" 2>/dev/null || echo "0")
aiservice_tests=$(grep -c "it('should" "src/tests/contracts/AIService.contract.test.ts" 2>/dev/null || echo "0")
authservice_tests=$(grep -c "it('should" "src/tests/contracts/AuthService.contract.test.ts" 2>/dev/null || echo "0")
total_tests=$((gameservice_tests + aiservice_tests + authservice_tests))

echo "GameService: ~$gameservice_tests test cases"
echo "AIService:   ~$aiservice_tests test cases"
echo "AuthService: ~$authservice_tests test cases"
echo "-------------------"
echo "Total:       ~$total_tests test cases"
echo ""

echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""
echo "1. Run contract tests:"
echo "   ${YELLOW}npm run test -- src/tests/contracts${NC}"
echo ""
echo "2. Test mock implementations:"
echo "   ${YELLOW}npm run test -- examples/GameService.memory.test${NC}"
echo ""
echo "3. Test real implementations (requires env setup):"
echo "   ${YELLOW}DATABASE_URL=... npm run test -- examples/GameService.pg.test${NC}"
echo ""
echo "4. Read documentation:"
echo "   ${YELLOW}cat src/tests/contracts/README.md${NC}"
echo "   ${YELLOW}cat CONTRACT_TESTS_SUMMARY.md${NC}"
echo ""

if [ "$all_exist" = true ]; then
  echo -e "${GREEN}✓ All contract test files are present!${NC}"
  echo ""
  echo "The contract test suite is complete and ready to use."
  exit 0
else
  echo "✗ Some files are missing. Please check the output above."
  exit 1
fi
