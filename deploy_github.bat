@echo off
chcp 65001 >nul
echo ===========================================================================
echo 🚀 SRI SRI ❤️ AI SOS - GITHUB & 24/7 CLOUD ONE-CLICK DEPLOY SCRIPT
echo ===========================================================================
echo.

cd /d "%~dp0"

echo [1/3] Checking Git Status...
git status
echo.

echo [2/3] Checking GitHub CLI Authentication...
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo.
    echo 🔑 GitHub માં લૉગિન કરવું જરૂરી છે.
    echo તમારા બ્રાઉઝરમાં GitHub ખૂલશે, ત્યાં લૉગિન/અપ્રુવ કરો...
    echo.
    gh auth login --web -p https
)

echo.
echo [3/3] Creating GitHub Repository & Pushing Code...
gh repo create sri-sri-ai-sos --public --source=. --remote=origin --push
if %errorlevel% neq 0 (
    echo.
    echo Repository કદાચ પહેલેથી બનેલી છે, સીધો પુશ કરી રહ્યા છીએ...
    git push -u origin master
)

echo.
echo ===========================================================================
echo 🎉 GITHUB PUSH COMPLETED SUCCESSFULLY!
echo હવે https://render.com પર જઈને આ રિપોઝિટરી સિલેક્ટ કરો.
echo તે આપોઆપ 24/7 લાઈવ કાયમી સર્વર શરૂ કરી દેશે!
echo ===========================================================================
pause
