// ==UserScript==
// @name         Queen Reporter
// @namespace    https://github.com/SOBotics
// @version      0.8.4
// @description  Quick feedback to Heat Detector
// @author       geisterfurz007
// @include	 https://stackoverflow.com/*
// @grant        GM_addStyle
// @grant        GM_xmlhttpRequest
// @downloadURL https://github.com/SOBotics/QueenReporter/raw/master/QueenReporter.user.js
// @updateURL https://github.com/SOBotics/QueenReporter/raw/master/QueenReporter.meta.js
// ==/UserScript==

const room = 111347;
const test_room = 167908;

const feedbackString = "@Queen feedback ";

let commentId = undefined;

(function() {

	'use strict';

	if (typeof GM !== 'object') {
		GM = {};
	}

	if (typeof GM_xmlhttpRequest === 'function' && !GM.xmlHttpRequest) {
		GM.xmlHttpRequest = GM_xmlhttpRequest;
	}

	GM_addStyle(".comment-queen-feedback-icon::after {content: \"🐝\"} .comment-queen-feedback-icon.queen-feedback-sent::after {content: \"🍯\"} .comment-queen-feedback-icon dl {display: inline-block} .comment-queen-feedback-icon.queen-popup-closed dl {display:none}");

	window.addEventListener("click", ev => {
        if (ev.target.classList.contains("comment-queen-feedback-icon")) {
            ev.target.classList.toggle("queen-popup-closed");
			commentId = $(ev.target).parents("li.comment").attr("data-comment-id");
        } else {
            $(".comment-queen-feedback-icon").addClass("queen-popup-closed");
        }
    });
	addFlagIdListener();
    addQuickFeedback();

    //Listener to react to the opened comment flagging popup
	addXHRListener(checkPopup);

	//When comments are loaded because a new one is added, there are more than a few comments or a comment was posted at the bottom of a longer thread, the whole comment section is reloaded causing the icon to be removed
	//Because of that we need another request listener that checks when the comments for a certain post are requested so they can be added after that.
    addXHRListener(checkCommentReload);
})();

function addFlagIdListener(preSelector) {
	preSelector = (preSelector || "").trim() + " ";
	
	$(preSelector + "div.comment-flagging").click(function(ev) {
		commentId = $(ev.target).parents("li.comment").attr("data-comment-id");
		
		let observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (!mutation.addedNodes) return;
				
				let nodeArray = Array.from(mutation.addedNodes); 
				
				if (nodeArray.some(node => node.classList.contains("s-modal-overlay"))) {
					$("#modal-base div.ai-center button.js-modal-close")
						.after($("<label><input id='queenAutoFeedbackEnabled' type='checkbox' checked='checked'>Queen Autofeedback enabled</label>"));
						
					observer.disconnect();
				}
				
			})
		});
		
		observer.observe(document.body, {
			  childList: true
			  , subtree: true
			  , attributes: false
			  , characterData: false
		});
		
	});
}

function addQuickFeedback(preSelector) {
	preSelector = preSelector || "";
	preSelector = preSelector.trim() + " ";
    $(preSelector + ".comment-actions > div:nth-child(2)").after(getQueenFeedbackElement);
}

function addXHRListener(callback) {
	let open = XMLHttpRequest.prototype.open;
	XMLHttpRequest.prototype.open = function() {
		this.addEventListener('load', callback.bind(null, this), false);
		open.apply(this, arguments);
	};
}

function checkPopup(xhr) {
	let matches = /flags\/comments\/\d+\/popup\?_=\d+/.exec(xhr.responseURL);
	if (matches !== null && xhr.status === 200) {
		$(".js-modal-submit").on("click", checkReport);
	}
}

function checkCommentReload(xhr) {
    let matches = /posts\/(\d+)\/comments(\?_=\d+)?/.exec(xhr.responseURL);
    if (matches !== null && xhr.status === 200) {
		let postId = matches[1];
		let post = document.getElementById("answer-" + postId) || document.getElementById("question");
		let preSelector = "#" + post.getAttribute("id");
        addQuickFeedback(preSelector);
		addFlagIdListener(preSelector);
    }
}

function checkReport(event) {
	if (!$("#queenAutoFeedbackEnabled").is(":checked")) {
		return;
	}
	
	let results = $("input[name='comment-flag-type']:checked");
	if (results.length > 0) {
		let link = getCommentUrl(commentId);
		let flagName = results[0].id;
		if (flagName.indexOf("Rude") > -1) {
			validateFeedbackRequired(link, "tp", commentId);
		} else if (flagName.indexOf("Unwelcoming") > -1) {
			validateFeedbackRequired(link, "nc", commentId);
		} else if (flagName.indexOf("NoLongerNeeded") > -1) { //Modflag shouldn't really feedback fp; 
			validateFeedbackRequired(link, "fp", commentId);
		}
	}
}


function getCommentUrl(commentId) {
	let id = "#comment-"+commentId;
	return $(id + " .comment-link").prop("href");
}

function validateFeedbackRequired(commentUrl, feedback, commentId) {

	function sendFeedback() {
		sendChatMessage(feedbackString + commentUrl + " " + feedback, r => handleResponse(r, commentId));
	}

	if (feedback === "tp")
		return sendFeedback();
	
	let fullURL = "http://api.higgs.sobotics.org/Reviewer/v2/Check?contentId=" + commentId + "&contentSite=" + (new URL(commentUrl)).host + "&contentType=comment"
	console.log(fullURL);
	
	GM.xmlHttpRequest({
		method: "GET",
		url: fullURL,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
//		data: "contentUrl=" + encodeURIComponent(commentUrl),
		onload: function (r) {
			let reports = JSON.parse(r.responseText);
			console.log(reports);
			if (reports.length > 0 && reports.some(report => report.dashboard === "Hydrant")) {
				sendFeedback();
			} else {
				displayToaster("Feedback not needed.", "#E4EB31");
			}
		}
	});
}

function sendChatMessage(msg, cb) {
  GM.xmlHttpRequest({
    method: 'GET',
    url: 'https://chat.stackoverflow.com/rooms/' + room,
    onload: function (response) {
      var fkey = response.responseText.match(/hidden" value="([\dabcdef]{32})/)[1];
      GM.xmlHttpRequest({
        method: 'POST',
        url: 'https://chat.stackoverflow.com/chats/' + room + '/messages/new',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        data: 'text=' + encodeURIComponent(msg.trim()) + '&fkey=' + fkey,
        onload: function (r) {
			if (cb) cb(r);
        }
      });
    }
  });
}

function handleResponse(r, commentId) {
	if (r.status === 200) {
		addSnack("Reported to Queen!", true);
		$("#comment-" + commentId + " .comment-queen-feedback-icon").addClass("queen-feedback-sent");
	}
	else
		addSnack("Failed to report!", false);
}

function getQueenFeedbackElement() {
	let div = document.createElement("div");
	let anchor = document.createElement("a");
	anchor.classList.add("comment-queen-feedback-icon", "queen-popup-closed");

	//For onHover; I might add a checkbox somewhere where one can choose to have it onHover/onClick
	//anchor.addEventListener("mouseover", () => anchor.classList.add("queen-popup-closed"));
	//anchor.addEventListener("mouseout", () => anchor.classList.add("queen-popup-closed"));

	let dl = document.createElement("dl");
	dl.style = "margin: 0px; z-index: 1; position: absolute; white-space: nowrap; background: rgb(255, 255, 255) none repeat scroll 0% 0%; padding: 5px; border: 1px solid rgb(159, 166, 173); box-shadow: rgba(36, 39, 41, 0.3) 0px 2px 4px; cursor: default;";

	let options = getOptions();
	options.forEach(o => dl.appendChild(getDDWithText(o.report, o.desc)));

	anchor.appendChild(dl);

	div.appendChild(anchor);
	return div;
}

function getDDWithText(report, description) {
	let result = document.createElement("dd");
	result.style = "padding-left: 5px; padding-right: 5px;";

	let anchor = document.createElement("a");
	anchor.style = "display: inline-block; margin-top: 5px; width: auto;";
	anchor.innerText = description;

	anchor.addEventListener("click", ev => {
		let cId = $(ev.target).parents(".comment").attr("data-comment-id");
		validateFeedbackRequired(getCommentUrl(cId), report, cId);
		//sendChatMessage(feedbackString + getCommentUrl(cId) + " " + report);
	});

	result.appendChild(anchor);
	return result;
}

function addSnack(message, isSuccessMessage) {
	let color = "#" + (isSuccessMessage ? "00690c" : "ba1701");  //padding 10px
	
	displayToaster(message, color);
}

function getOptions() {
	return [
		{
			report: "tp",
			desc: "Rude / Abusive"
		},
		{
			report: "nc",
			desc: "Not constructive"
		},
		{
			report: "fp",
			desc: "Not harmful"
		},
		{
			report: "sk",
			desc: "Hard to classify"
		}
	];
}

//Stolen from AF and slightly altered; Thanks Rob ;)
function displayToaster(message, colour, textColour, duration) {
	let possWrapper = document.getElementById("snackbar");
	let popupWrapper = possWrapper ? $(possWrapper) : $('<div>').addClass('hide').hide().attr('id', 'snackbar');
	let popupDelay = 2000;
	let toasterTimeout = null;
	let toasterFadeTimeout = null;
	
	let div = $('<div>')
		.css({
		'background-color': colour,
		'padding': '10px'
	})
		.text(message);
	if (textColour) {
		div.css('color', textColour);
	}
	popupWrapper.append(div);
	popupWrapper.removeClass('hide').addClass('show').show();
	function hidePopup() {
		popupWrapper.removeClass('show').addClass('hide');
		toasterFadeTimeout = setTimeout(function () {
			popupWrapper.empty().hide();
		}, 1000);
	}
	if (toasterFadeTimeout) {
		clearTimeout(toasterFadeTimeout);
	}
	if (toasterTimeout) {
		clearTimeout(toasterTimeout);
	}
	toasterTimeout = setTimeout(hidePopup, duration === undefined ? popupDelay : duration);
}


