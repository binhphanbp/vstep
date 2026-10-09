#!/bin/bash
# The first real measurement, in one command (needs GEMINI_API_KEY; costs money).
#   bash scripts/grading-eval/first-run.sh [model]
# Uses the tune split, so the held-out split stays unread for the final figure.
set -e
MODEL="${1:-gemini-3.8-flash}"
cd "$(dirname "$0")/../.."
if [ -z "$GEMINI_API_KEY" ]; then echo "GEMINI_API_KEY is not set" >&2; exit 1; fi
npx tsx scripts/grading-eval/run.ts ellipse --model "$MODEL" --split tune --n 40
npx tsx scripts/grading-eval/run.ts stability --model "$MODEL" --split tune --n 8 --repeat 3
npx tsx scripts/grading-eval/run.ts perturb --model "$MODEL" --split tune --n 8
