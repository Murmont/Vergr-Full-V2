@echo off
echo === VERGR Full Build ===
echo.

echo [1/5] Building React SPA...
node node_modules/vite/bin/vite.js build
if %ERRORLEVEL% NEQ 0 (
    echo BUILD FAILED
    exit /b 1
)

echo [2/5] Moving SPA into dist\app...
mkdir dist\app 2>nul
mkdir dist\app\assets 2>nul
move /Y dist\index.html dist\app\index.html >nul
move /Y dist\assets\* dist\app\assets\ >nul
rmdir dist\assets 2>nul

echo [3/5] Fixing asset paths in SPA...
powershell -Command "(Get-Content dist\app\index.html) -replace 'src=\"/assets/', 'src=\"/app/assets/' -replace 'href=\"/assets/', 'href=\"/app/assets/' | Set-Content dist\app\index.html"

echo [4/5] Copying static pages into dist...
copy /Y site\index.html dist\index.html
copy /Y site\store.html dist\store.html
copy /Y site\download.html dist\download.html
copy /Y site\privacy.html dist\privacy.html
copy /Y site\terms.html dist\terms.html
copy /Y site\help.html dist\help.html
copy /Y site\styles.css dist\styles.css
copy /Y site\shared.js dist\shared.js

echo [5/5] Copying assets...
xcopy public\backgrounds dist\backgrounds /E /I /Y /Q
xcopy public\icons dist\icons /E /I /Y /Q
copy /Y public\manifest.json dist\manifest.json >nul 2>&1
copy /Y public\sw.js dist\sw.js >nul 2>&1
copy /Y public\firebase-messaging-sw.js dist\firebase-messaging-sw.js >nul 2>&1
copy /Y public\app-ads.txt dist\app-ads.txt >nul 2>&1

echo.
echo === Build complete ===
echo Deploy with: firebase deploy --only hosting
