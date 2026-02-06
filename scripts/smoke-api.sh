#!/usr/bin/env bash
set -euo pipefail

BASE_URL=${1:-http://localhost:5175}

expect_status() {
  local url=$1
  local expected=$2
  local payload=$3

  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" -H "Content-Type: application/json" -d "$payload" "$url")

  if [[ "$status" != "$expected" ]]; then
    echo "Expected $expected but got $status for $url"
    exit 1
  fi
}

echo "Running API validation smoke checks against $BASE_URL"

expect_status "$BASE_URL/api/auth/sync" 400 '{"email":"not-an-email","fullName":""}'
expect_status "$BASE_URL/api/projects" 400 '{"name":"","buildings":"oops"}'
expect_status "$BASE_URL/api/projects/abc" 400 '{"name":"Project","buildings":[]}'
expect_status "$BASE_URL/api/projects/1/site-areas" 400 '{"area_type":"unknown"}'
expect_status "$BASE_URL/api/site-areas/abc" 400 '{"area_type":"landscape"}'

echo "Smoke checks passed."
