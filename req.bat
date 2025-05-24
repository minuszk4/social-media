@echo off
cd /d "%~dp0"

echo Installing backend dependencies...
cd back-end
if exist req.txt (
    for /f "delims=" %%i in (req.txt) do (
        echo Installing %%i...
        npm install %%i
    )
) else (
    echo req.txt not found in back-end
)
cd ..

echo Installing frontend dependencies...
cd front-end
if exist req.txt (
    for /f "delims=" %%i in (req.txt) do (
        echo Installing %%i...
        npm install %%i
    )
) else (
    echo req.txt not found in front-end
)
cd ..

echo Installation complete!
pause