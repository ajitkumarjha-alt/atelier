#!/bin/bash

# Team Management Feature Test Script

echo "========================================="
echo "Testing Team Management Features"
echo "========================================="

BASE_URL="http://localhost:5175"
SUPER_ADMIN="lodhaatelier@gmail.com"

echo ""
echo "Test 1: Get addable users for SUPER_ADMIN"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/users/addable" \
  -H "x-dev-user-email: $SUPER_ADMIN" | jq .

echo ""
echo "Test 2: Get project team for project 1"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/projects/1/team" \
  -H "x-dev-user-email: $SUPER_ADMIN" | jq .

echo ""
echo "Test 3: Check health endpoint"
echo "-----------------------------------------"
curl -s "$BASE_URL/api/health" | jq .

echo ""
echo "========================================="
echo "Tests Complete!"
echo "========================================="
