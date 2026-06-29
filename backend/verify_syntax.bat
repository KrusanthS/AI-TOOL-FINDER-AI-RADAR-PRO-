@echo off
cd /d "%~dp0"
echo Verifying backend syntax...
echo.
set FILES=src\services\llmConsultantService.js src\services\capabilitySearchService.js src\services\toolValidationService.js src\services\intentCacheService.js src\services\intentWebDiscoveryService.js src\services\recommendationService.js src\services\aiConsultantOrchestrator.js src\controllers\consultantController.js src\routes\consultant.js src\models\Tool.js src\app.js
set FAILED=0
for %%F in (%FILES%) do (
  node --check "%%F"
  if errorlevel 1 (
    echo SYNTAX_ERROR: %%F
    set FAILED=1
  ) else (
    echo OK: %%F
  )
)
echo.
if %FAILED%==0 (echo ALL BACKEND FILES: SYNTAX OK) else (echo SYNTAX ERRORS FOUND)
