@echo off
REM ECDM Core Backend - Install Multer Dependencies
REM Run this script from the ecdm-core-backend directory

echo 📦 Installing Multer for file upload handling...
echo.

REM Install multer
call npm install multer

REM Install multer types
call npm install --save-dev @types/multer

echo.
echo ✅ Multer installation complete!
echo.
echo 📝 Next steps:
echo 1. Ensure the uploads directory exists (auto-created by middleware)
echo 2. Serve static files from /uploads in your Express app
echo 3. Configure CORS if frontend is on a different domain
echo.
pause
