// ==UserScript==
// @name         Queen Reporter
// @version      0.10.3
// @namespace    https://github.com/SOBotics
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
		window.GM = {};
	}

	if (typeof GM_xmlhttpRequest === 'function' && !GM.xmlHttpRequest) {
		GM.xmlHttpRequest = GM_xmlhttpRequest;
	}

	GM_addStyle(".s-modal--dialog { max-width: 750px !important; }");

	addFlagIdListener();

    //Listener to react to the opened comment flagging popup
	addXHRListener(checkPopup);

	//When comments are loaded because a new one is added, there are more than a few comments or a comment was posted at the bottom of a longer thread, the whole comment section is reloaded causing the icon to be removed
	//Because of that we need another request listener that checks when the comments for a certain post are requested so they can be added after that.
    addXHRListener(checkCommentReload);

})();

function addPopupListener() {
	let observer = new MutationObserver(mutations => {
		mutations.forEach(mutation => {
			if (!mutation.addedNodes) return;

			let nodeArray = Array.from(mutation.addedNodes);
            if (nodeArray.some(matchCommentFlagPopupCriteria)) {
                $(".js-stacks-managed-popup").remove();
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
}

function matchCommentFlagPopupCriteria(node) {
    let matches = true;
    matches &= node.classList && node.classList.contains("js-stacks-managed-popup");
    let jqText = $(node).text();
    matches &= !!jqText && jqText.trim().indexOf("Thanks for flagging") > -1;
    return matches;
}

function addFlagIdListener(preSelector) {
	preSelector = (preSelector || "").trim() + " ";

	$(preSelector + "div.comment-flagging").click(function(ev) {
		commentId = $(ev.target).parents("li.comment").attr("data-comment-id");

		let observer = new MutationObserver(mutations => {
			mutations.forEach(mutation => {
				if (!mutation.addedNodes) return;

				let nodeArray = Array.from(mutation.addedNodes);

				if (nodeArray.some(node => node.classList.contains("js-modal-overlay")) && $("#queenAutoFeedbackEnabled").length == 0) {
					$("#modal-base div.ai-center button.js-modal-close")
						.after($("<label style='margin: 6px;'><input id='queenFeatureThanksPopupRemovalEnabled' type='checkbox' checked='checked'>Popup removal enabled</label>"));
					
					
					conditionallyAddFeedbacks(commentId);

					//Manipulate ajax. If the url matches the regex to flag but ends in undefined that means that the custom flag was used.
					

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

/*

`
<div id="queen-feedback-container">
	Reported by Queen!
	<br>
	Feedback: 
	<select id="queen-selected-feedback" style="margin-top: 5px;">
		<option value="tp">tp</option>
		...
	</select>

</div>
`

*/

function conditionallyAddFeedbacks(commentId) {
	let fullURL = "http://api.higgs.sobotics.org/Reviewer/v2/Check?contentId=" + commentId + "&contentSite=" + (new URL(commentUrl)).host + "&contentType=comment"
	GM.xmlHttpRequest({
		method: "GET",
		url: fullURL,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
//		data: "contentUrl=" + encodeURIComponent(commentUrl),
		onload: function (r) {
			let reports = JSON.parse(r.responseText);
			if (reports.length > 0 && reports.some(report => report.dashboard === "Hydrant")) {
				addFeedbacks();
			}
		}
	});
}

function addFeedbacks() {
	const structure = $("<div style='margin-right: 10px;'>Reported by Queen!<br>Feedback: <select id='queen-selected-feedback' style='margin-top: 5px;'></select></div>");
	$("#modal-base div.ai-center button.js-modal-close").after(structure);

	const toOption = value => $(`<option value="${value}">${value}</option>`);

	["tp", "nc", "fp", "sk", "None"]
		.map(toOption)
		.forEach(option => $("#queen-selected-feedback").append(option));
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
	if ($("#queenFeatureThanksPopupRemovalEnabled").is(":checked")) {
	    addPopupListener();
	}

	if (!$("#queenAutoFeedbackEnabled").is(":checked")) {
		return;
	}
	
	let results = $("input[name='comment-flag-type']:checked");
	if (results.length > 0) {
		let link = getCommentUrl(commentId);
		const selectedFeedback = $('#queen-selected-feedback').val()

		validateFeedbackRequired(link, selectedFeedback, commentId);
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
	
	GM.xmlHttpRequest({
		method: "GET",
		url: fullURL,
		headers: { "Content-Type": "application/x-www-form-urlencoded" },
//		data: "contentUrl=" + encodeURIComponent(commentUrl),
		onload: function (r) {
			let reports = JSON.parse(r.responseText);
			if (reports.length > 0 && reports.some(report => report.dashboard === "Hydrant")) {
				sendFeedback();
			} else {
				displayToaster("Feedback not needed.", "#E4EB31");
			}

			//Clean up the manipulated ajax call
			$.ajaxSetup({ beforeSend: undefined });
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

function handleResponse(r) {
	if (r.status === 200)
		addSnack("Reported to Queen!", true);
	else
		addSnack("Failed to report!", false);
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
