@echo off
echo Starting backend
start cmd /k "cd musclemapai-backend && python main.py"

echo Starting frontend
start cmd /k "cd musclemapai-frontend && npm start"

echo All services launched.