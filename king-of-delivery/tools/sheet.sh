#!/bin/bash
# usage: tools/sheet.sh <name> <t1> <t2> ...   -> scratchpad/sheets/<name>.png (contact sheet)
SP=/tmp/claude-0/-home-user-Claude-code/f717c2b6-b13d-5a45-b9b6-ae77d5652042/scratchpad
name=$1; shift
out=$SP/frames_$name; rm -rf $out; mkdir -p $out $SP/sheets
node "$(dirname "$0")/still.js" $out "$@" | grep -v "^/" 
montage $out/*.png -tile 4x -geometry 480x270+3+3 -background '#222' -fill '#ddd' -pointsize 14 -label '%t' $SP/sheets/$name.png
echo $SP/sheets/$name.png
