#!/bin/bash
# Double-click to start the planner, then open http://localhost:5174
cd "$(dirname "$0")"
open "http://localhost:5174" &
python3 serve.py 5174
