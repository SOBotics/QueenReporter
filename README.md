# QueenReporter

Queen Reporter is a small userscript that adds a flag listener to comment flags on stackoverflow and reports them to [HeatDetector](https://github.com/SOBotics/SOCVFinder) in the [SOBotics SO-Chat room](https://chat.stackoverflow.com/rooms/111347).

## Usage

Follow the browser-specific instructions below. If you installed it correctly, a new icon should have appeared next to comments on stackoverflow:

![](https://i.imgur.com/BodGYct.jpg)

When you click on it, you can give a quick feedback in the popup. This will NOT flag the post accordingly!

![](https://i.imgur.com/SPgSin9.jpg)

Further automatic feedback will be sent when flagging a comment. Choosing one using the icon is not necessary after!  
Currently the automatic feedback is as follows:

Flagname | Feedback sent
---------|--------------
harassment/bigotry/abuse | tp
unfriendly or unkind | nc
no longer needed | fp
something else | -

The flagging dialog contains a checkbox that can be used to disable automatic feedback for that comment:

![](https://i.imgur.com/SzBOJb1.jpg)

### Chrome / Firefox

1. Install TamperMonkey [for Chrome](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)  / [for Firefox](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey for FF](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
2. Click to [install](https://github.com/SOBotics/QueenReporter/raw/master/QueenReporter.user.js)
3. Tampermonkey/Greasemonkey should open up and give you the option to install the extension

## Notes

This was written and tested with Tampermonkey 4.6.5757. If you are using Greasemonkey, please inform me about possible issues and I will see if I can get it fixed.
