@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo 正在合并 4K 成片，请稍候……
copy /b "BGL_V2_4K60.mp4.part01"+"BGL_V2_4K60.mp4.part02"+"BGL_V2_4K60.mp4.part03"+"BGL_V2_4K60.mp4.part04"+"BGL_V2_4K60.mp4.part05"+"BGL_V2_4K60.mp4.part06"+"BGL_V2_4K60.mp4.part07"+"BGL_V2_4K60.mp4.part08"+"BGL_V2_4K60.mp4.part09"+"BGL_V2_4K60.mp4.part10"+"BGL_V2_4K60.mp4.part11"+"BGL_V2_4K60.mp4.part12"+"BGL_V2_4K60.mp4.part13" "别过来_V2_4K60.mp4" >nul
echo 完成：别过来_V2_4K60.mp4
pause
