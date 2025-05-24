@echo off

REM 
docker ps | findstr redis >nul
IF ERRORLEVEL 1 (
    echo Redis container is not running. Starting it now...
    docker start redis-server >nul 2>&1
    IF ERRORLEVEL 1 (
        echo Redis container not found. Creating and starting a new one...
        docker run -d --name redis-server -p 6379:6379 redis
    )
) ELSE (
    echo Redis container is already running.
)

REM 
start cmd /k "cd /d back-end && npm run dev"

REM 
start cmd /k "cd /d front-end && npm run dev"
