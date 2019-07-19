"use strict";

(function () {
	var backend = {
		sendForm: function (form, callback) {
			// HTML Form Element will be returned.
			if (typeof(form) === 'string') {
				form = document.getElementById(form);
			}

			var sourceDomain = getSourceDomainName();
			// Bind the FormData object and the form element
			var FD = new FormData(form);
			// Append the category and country lang to the form and then post to MC
			FD.append("Language", language);
			FD.append("LeadSource", sourceDomain);

			// Post back to the same page, but include an AEM selector 'form-post' to trigger the POST.
			// The form now contains a ':action' hidden field which specifies the
			// endpoint URL to post the form data to.
			var sfmcURL = sonovaLG.getCurrentPage() + '.form-post.html';

			var XHR = new XMLHttpRequest();

			XHR.open("POST", sfmcURL, true);
			// Define what happens on successful data submission
			XHR.addEventListener("load", function (event) {
				// Changing the status of the form post as true after successful submission of the form
				formPostStatus = true;
				popupStatus = 'submitted';
				updateCookie(cookiePopupStatus, 'submitted', country, language);
				callback(true);
			});

			// Define what happens in case of error
			XHR.addEventListener("error", function (event) {
				// Changing the status of the form post as false after unsuccessful submission of the form
				formPostStatus = false;
				if (XHR.responseText.toString().indexOf('errorCode') >= 0) {
					callback('backend');
				} else {
					callback(false);
				}
			});

			// The data sent is what the user provided in the form
			XHR.send(FD);

		},
		counter: 0,
		formClosed: function () {
			var cookieParameters = getPopupCookie(country, language);
			if (cookieParameters && cookieParameters.popupStatus && cookieParameters.popupStatus !== "submitted") {
				updateCookie(cookiePopupStatus, 'minimized', country, language);
			}
		},
		popUpClosed: function () {
			popupExit();
		},
		popUpShown: function () {
		},
		formShown: function () {
			updateCookie(cookiePopupStatus, 'maximized', country, language);
		},
	};
	// Register the methods above to be accessed outside of this file.
	sonovaLG.registerBackendJS(backend);

	// Cookie Variables
	const cookieTimeInterval = 'timeInterval';
	const cookiePagesBrowsed = 'pagesBrowsed';
	const cookiePopupStatus = 'popupStatus';
	const cookieFormPostStatus = 'formPostStatus';
	const cookiePopupClosedCount = 'popupClosedCount';
	const cookieSessionNo = 'sessionNo';

	const perPopupParam_cookie_name = 'per_popup_parameters';
	const sessPopupParam_cookie_name = 'session_popup_parameters';
	const pageContentPrefix = '/content/phonak/';

	const currentURL = sonovaLG.getCurrentPage();
	const country = getSiteCountry(currentURL);
	const language = getSiteLanguage(currentURL);

	// Declaring initial variables
	let formPostStatus = false;    // stores the status of the form being successfully posted
	let closePopupCount = 0;       // counts the number the times the popup is closed/exited
    let initialWaitTimeForNoCookieAndCookieInSec = sonovaLG.getC_FormMinPopupClosedWait();
	let closedPopupWaitTime = sonovaLG.getNC_PopupClosedWait();
	let popupStatus = 'open';       // open / minimized / maximized / closed / submitted
	let customTimeInterval = 5;
	let defaultTimeInterval = parseInt(sonovaLG.getInitialWait()) + customTimeInterval;
	let counter = 0;
	let stopCounter = false;

	backend.counter = counter;


	function getSiteLanguage(url) {
		var language = 'en';
		if (url && url.length > 0) {
			var URLstring = url.split("/");
			var languagePosition = (url.indexOf(pageContentPrefix) >= 0) ? 4 : 2;
			if (URLstring.length > languagePosition + 1) {
				language = URLstring[languagePosition];
			} else {
				var languageString = URLstring[languagePosition];
				var languageArr = languageString.split(".");
				language = languageArr[0];
			}
		}
		return language;
	}


	// tracking the country of the phonak site
	function getSiteCountry(url) {
		var country = "us";
		if (url && url.length > 0) {
			var URLstring = url.split("/");
			var languagePosition = (url.indexOf(pageContentPrefix) >= 0) ? 3 : 1;
			country = URLstring[languagePosition];
			country = (country === "com") ? "us" : country;
		}
		return country;
	}

	// tracking the domain of the source url
	function getSourceDomainName() {
		// var url = document.referrer || "";
		var url = sonovaLG.getReferrer() || "";
		if (url.length > 0) {
			// Extract the domain from the url.
			return url.replace(/(?:https?:\/\/)?([^/]+).*/, '$1');
		} else {
			return "Direct";
		}
	}

	function showPopup() {
		backend.counter = 0;
		sonovaLG.showPopUp();
		updateCookie(cookiePopupStatus, 'minimized', country, language);
	}

	// maximize popup
	function popupMaximized() {
		sonovaLG.showForm();
		updateCookie(cookiePopupStatus, 'maximized', country, language);
	}

	// close popup
	function popupExit() {
		var cookieParameters = getPopupCookie(country, language);
		updateCookie(cookiePopupStatus, 'closed', country, language);
		updateCookie(cookiePopupClosedCount, cookieParameters.popupClosedCount + 1, country, language);
		stopCounter = true;
		if (!closePopupCount && !navigator.cookieEnabled) {
			showPopupAfterExit();
		}
		closePopupCount = closePopupCount + 1;
	}

	// minimize form
	function formMinimized() {
		sonovaLG.closeForm();
		updateCookie(cookiePopupStatus, 'minimized', country, language);
	}

	function showPopupAfterExit() {
		if ((!formPostStatus) && !closePopupCount) {
			setTimeout(function () {
				popupMaximized();
			}, closedPopupWaitTime * 1000);
		}
	}


	function createCookie(country, language) {
		var cn_ln = country + '_' + language;
		var cookieJSON = {
			popupStatus: 'open',
			popupClosedCount: 0,
			cn_ln: cn_ln
		};
		let cookiesArray = document.cookie.split(';');
		let perCookieArray = [];

		cookiesArray.map(function (val) {
			if (val.indexOf(perPopupParam_cookie_name) >= 0) {
				var temp = val.split('=')[1];
				if (!isJson(temp) && atob(temp) !== 'undefined') {
					perCookieArray = JSON.parse(atob(temp)); //perCookieArray = val.split('=')[1];
				}

			}
		});
		perCookieArray.push(cookieJSON);
		var date = new Date();
		date.setFullYear(date.getFullYear() + 3);
		var expires = "expires=" + date.toGMTString();
		var path = "path=/" + country;
		document.cookie = perPopupParam_cookie_name + "=" + btoa(JSON.stringify(perCookieArray)) + ";" + expires + ";" + path;
	}

	function createSessionCookie(country, language) {
		var cn_ln = country + '_' + language;
		var cookieJSON = {
			timeInterval: 0,
			pagesBrowsed: 1,
			cn_ln: cn_ln
		};
		let cookiesArray = document.cookie.split(';');
		let sesCookieArray = [];
		cookiesArray.map(function (val) {
			if (val.indexOf(sessPopupParam_cookie_name) >= 0) {
				var temp = val.split('=')[1];
				if (!isJson(temp) && atob(temp) !== 'undefined') {
					sesCookieArray = JSON.parse(atob(temp));
				}
			}
		});

		sesCookieArray.push(cookieJSON);
		var path = "path=/" + country;
		document.cookie = sessPopupParam_cookie_name + "=" + btoa(JSON.stringify(sesCookieArray)) + ";" + path;
	}

	function updateCookie(cookieProperty, value, country, language) {
		if (document.cookie) {
			let cookiesArray = document.cookie.split(';');
			var cn_ln = country + '_' + language;
			var perpopupCookie = getPopupCookie(country, language);
			if (perpopupCookie) {
				for (let i = 0; i < cookiesArray.length; i += 1) {
					if (cookiesArray[i].indexOf(perPopupParam_cookie_name) >= 0) {
						var cookieJSON;
						if (!isJson(cookiesArray[i].split('=')[1])) {
							cookieJSON = JSON.parse(atob(cookiesArray[i].split('=')[1]));
						}
					}
				}
				cookieJSON.length > 0 && cookieJSON.map(function (val) {
					Object.keys(val).map(function (item) {
						if (val[item] === cn_ln && perpopupCookie.cn_ln === cn_ln) {
							val[cookieProperty] = value;
						}
					});
				});
			}

			var date = new Date();
			date.setFullYear(date.getFullYear() + 3);
			var expires = "expires=" + date.toGMTString();
			var path = "path=/" + country;
			document.cookie = perPopupParam_cookie_name + "=" + btoa(JSON.stringify(cookieJSON)) + ";" + expires + ";" + path;
		}
	}

	function updateSessionCookie(cookieProperty, value, country, language) {
		if (document.cookie) {
			let cookiesArray = document.cookie.split(';');
			let popupCookie;
			var cn_ln = country + '_' + language;
			var popupSessCookie = getSessionPopupCookie(country, language);
			if (popupSessCookie) {
				for (let i = 0; i < cookiesArray.length; i += 1) {
					if (cookiesArray[i].indexOf(sessPopupParam_cookie_name) >= 0) {
						var cookieJSON;
						if (!isJson(cookiesArray[i].split('=')[1])) {
							cookieJSON = JSON.parse(atob(cookiesArray[i].split('=')[1]));
						}
					}
				}

				cookieJSON.length > 0 && cookieJSON.map(function (val) {
					Object.keys(val).map(function (item) {
						if (val[item] === cn_ln && popupSessCookie.cn_ln === cn_ln) {
							val[cookieProperty] = value;
						}
					});
				});

			}
			var path = "path=/" + country;
			document.cookie = sessPopupParam_cookie_name + "=" + btoa(JSON.stringify(cookieJSON)) + ";" + path;
		}
	}

	function getPopupCookie(country, language) { // Get Popup cookie
		let cookiesArray = document.cookie.split(';');
		var cn_ln = country + '_' + language;
		var cookieJSON, tempJsonVal = "", popupCookie = "";
		for (let i = 0; i < cookiesArray.length; i += 1) {
			if (cookiesArray[i].indexOf(perPopupParam_cookie_name) >= 0) {
				tempJsonVal = cookiesArray[i].split('=')[1];
				break;
			}
		}
		if (tempJsonVal !== "" && tempJsonVal !== "undefined" && !isJson(tempJsonVal)) {
			tempJsonVal = atob(tempJsonVal);
			if (tempJsonVal !== "" && tempJsonVal !== "undefined" && isJson(tempJsonVal)) {  // Checking if the cookie value is empty or undefined or json object
				cookieJSON = JSON.parse(tempJsonVal);
				if (Array.isArray(cookieJSON)) { // check if it array tyoe
					cookieJSON.map(function (val) {
						Object.keys(val).map(function (item) {
							if (val[item] === cn_ln) {
								popupCookie = val;
							}
						});
					});
				} else {
					delete_cookie(perPopupParam_cookie_name, country);
					popupCookie = ""
				} // delete cookie if it is not defined properly and return empty val
			} else {
				delete_cookie(perPopupParam_cookie_name, country);
				popupCookie = ""
			} // delete cookie if it is not defined properly and return empty val
		} else {
			delete_cookie(perPopupParam_cookie_name, country);
			popupCookie = ""
		} // delete cookie if it is not defined properly and return empty val

		return popupCookie;
	}

	function getSessionPopupCookie(country, language) {
		let cookiesArray = document.cookie.split(';');
		let popupSessionCookie, tempJsonVal = "", sessionJSON;
		var cn_ln = country + '_' + language;
		for (let i = 0; i < cookiesArray.length; i += 1) {
			if (cookiesArray[i].indexOf(sessPopupParam_cookie_name) >= 0) {
				tempJsonVal = cookiesArray[i].split('=')[1];
			}
		}

		if (tempJsonVal !== "" && tempJsonVal !== "undefined" && !isJson(tempJsonVal)) {
			tempJsonVal = atob(tempJsonVal);
			if (tempJsonVal !== "" && tempJsonVal !== "undefined" && isJson(tempJsonVal)) {
				sessionJSON = JSON.parse(tempJsonVal);
				if (Array.isArray(sessionJSON)) {
					sessionJSON.map(function (val) {
						Object.keys(val).map(function (item) {
							if (val[item] === cn_ln) {
								popupSessionCookie = val;
							}
						});
					});
				} else {
					delete_cookie(sessPopupParam_cookie_name, country);
					popupSessionCookie = ""
				}
			} else {
				delete_cookie(sessPopupParam_cookie_name, country);
				popupSessionCookie = ""
			}
		} else {
			delete_cookie(sessPopupParam_cookie_name, country);
			popupSessionCookie = ""
		}

		return popupSessionCookie;
	}

	function delete_cookie(name, country) { // delete cookie
		document.cookie = name + '=; Path=/' + country + '; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
	}

	function isJson(str) {
		try {
			JSON.parse(str);
		} catch (e) {
			return false;
		}
		return true;
	}

	function startCounter() {
		setTimeout(function () {
			backend.counter += 1;
			if (!stopCounter) {
				startCounter();
			}
		}, 1000);
	}


	function init() {
		// if cookie is enabled in browser
		if (navigator.cookieEnabled) {
			var timeToBeElapsed = initialWaitTimeForNoCookieAndCookieInSec;
			var cn_ln = country + "_" + language;
			var cookieParameters = getPopupCookie(country, language);
			var sessionCookieParameters = getSessionPopupCookie(country, language);
			startCounter();

			if (!cookieParameters) {
				createCookie(country, language);
				if (!sessionCookieParameters) {
					createSessionCookie(country, language);
				}
				cookieParameters = getPopupCookie(country, language);
				setTimeout(function () {
					showPopup();
				}, defaultTimeInterval * 1000);
			} else {
				var newSession = false;
				cookieParameters = getPopupCookie(country, language);
				if (!sessionCookieParameters) {
					newSession = true;
					createSessionCookie(country, language);
					sessionCookieParameters = getSessionPopupCookie(country, language);
					backend.counter = 0;
				} else {
					sessionCookieParameters = getSessionPopupCookie(country, language);
					if (cookieParameters[cookiePopupStatus] === 'minimized' || cookieParameters[cookiePopupStatus] === 'closed') {
						var noOfPagesBrowsed = sessionCookieParameters.pagesBrowsed === 2 ? 1 : sessionCookieParameters.pagesBrowsed + 1;
						updateSessionCookie(cookiePagesBrowsed, noOfPagesBrowsed, country, language);
					}
				}

				timeToBeElapsed = defaultTimeInterval - sessionCookieParameters.timeInterval;
				if(timeToBeElapsed < 0) { timeToBeElapsed = customTimeInterval; }
				if (cookieParameters[cookiePopupStatus] !== 'submitted') {
					if (cookieParameters[cookiePopupStatus] === 'minimized') {
						if (newSession) {
							setTimeout(function () {
								popupMaximized();
							}, closedPopupWaitTime * 1000);
						} else {
							if (sessionCookieParameters.pagesBrowsed === 2) {
								setTimeout(function () {
									popupMaximized();
								}, customTimeInterval * 1000);
							} else {
								setTimeout(function () {
									showPopup();
								}, timeToBeElapsed * 1000);
							}
						}
					} else if (cookieParameters[cookiePopupStatus] === 'closed') {
						//if (sessionCookieParameters[cookiePagesBrowsed] === 1 && newSession && cookieParameters[cookiePopupClosedCount] >= 1) {
						if (sessionCookieParameters[cookiePagesBrowsed] === 1 && newSession) {
							setTimeout(function () {
								showPopup();
							}, closedPopupWaitTime * 1000);
						} else if (sessionCookieParameters[cookiePagesBrowsed] === 2 && !newSession) {
							setTimeout(function () {
								showPopup();
							}, timeToBeElapsed * 1000);
						}
					} else if (cookieParameters[cookiePopupStatus] === 'open') {
						setTimeout(function () {
							showPopup();
						}, timeToBeElapsed * 1000);
					} else if (cookieParameters[cookiePopupStatus] === 'maximized') {
						setTimeout(function () {
							popupMaximized();
						}, timeToBeElapsed * 1000);
					}
				}
			}
		}
		else {
			if ((!formPostStatus) && closePopupCount === 0) {
				setTimeout(function () {
					showPopup();
				}, initialWaitTimeForNoCookieAndCookieInSec * 1000);
			}
		}
	}

	var prev_handler = window.onload;
	window.onload = function () {
		if (prev_handler) {
			prev_handler();
		}
		init();
	};

	window.onbeforeunload = function () {
		var sessionCookieParameters = getSessionPopupCookie(country, language);
		var updatecounter = sessionCookieParameters[cookieTimeInterval] + backend.counter;
		updateSessionCookie(cookieTimeInterval, updatecounter, country, language);
	};

})();

(function ($) {
	var frontend = {
		showError: function (errorMsg) {
			$('#phonak-popup form .popup-error-message').html(errorMsg).show();
		},
		showPopUp: function () {
			$('body').addClass('phonak-popup-trigger-showing');
			sonovaLG.popUpShown();
		},
		showForm: function () {
			$('body').addClass('phonak-popup-overlay-showing').removeClass('phonak-popup-trigger-showing');
			if ($('#phonak-popup-overlay-inner-inner').hasScrollBar()) {
				window.setTimeout(function () {
					$('#phonak-overlay-scroll-down').fadeIn();
				}, 500);
			} else {
				$('#phonak-overlay-scroll-down').hide();
			}
			sonovaLG.formShown();
		},
		closePopUp: function () {
			$('body').removeClass('phonak-popup-trigger-showing');
			sonovaLG.popUpClosed();
		},
		closeForm: function () {
			$('body').removeClass('phonak-popup-overlay-showing');
			if (!$('body').hasClass('phonak-popup-form-submitted')) {
				$('body').addClass('phonak-popup-trigger-showing');
			}
			sonovaLG.formClosed();
		},
		sendFormSuccess: function() {
			// Need to show success message
			$('#phonak-popup-confirmation-message').show();
			$('#phonak-popup-overlay-inner-inner').hide();
			$('body').addClass('phonak-popup-form-submitted');
			$('#phonak-overlay-scroll-down').fadeOut();
			window.setTimeout(function() {
				$('body').removeClass('phonak-popup-overlay-showing');
			}, sonovaLG.getSubmitSuccessMessageTimeout() * 1000);
		}
	};
	sonovaLG.registerFrontendJS(frontend);


	$(function () {
		// Modify the Country drop-down.
		var countrySelect = $('#phonak-popup-overlay-inner-inner select');
		var pageCountry = sonovaLG.getCurrentPage().replace(/^\/[^/]+\/[^/]+\/([^/]+).*/gi, '$1').toUpperCase();
		if (pageCountry.length > 2) {
			pageCountry = 'US';
		}
		if (countrySelect.length > 0) {
			// Attempt to find the proper country and select it by default.
			$('option[value="' + pageCountry + '"]', countrySelect).prop('selected', true);

			// Now change all of the VALUEs to be the country names.
			$('option', countrySelect).each(function () {
				if (this.value != null && this.value.length > 0) {
					var v = this.value;
					$(this).attr('v', v); // Store the original value.
					this.value = this.text; // Save the country name as the value.
					this.text = v; // Change the displayed country name to be the country ISO code instead.
				}
			});
		}

		$(window).on('resize', function(){
			if ($('#phonak-popup-overlay').css('visibility') !== 'hidden') {
				var $overlay = $('#phonak-popup-overlay-inner-inner');
				if ($overlay.hasScrollBar() && $overlay.scrollTop() === 0) {
					$('#phonak-overlay-scroll-down').show();
				} else {
					$('#phonak-overlay-scroll-down').hide();
				}
			}
		});

		$('#phonak-popup-trigger .phonak-popup-button').click(function (e) {
			e.preventDefault();
			// Scroll to the top of the form.
			$('#phonak-popup-overlay-inner-inner').scrollTop(0);
			frontend.showForm();
		});
		$('#phonak-popup-overlay-inner-inner').scroll(function () {
			var scrolled = $(this).scrollTop();
			if (scrolled > 0) {
				$('#phonak-overlay-scroll-down').fadeOut();
			}
			else if ($(this).hasScrollBar()) {
				$('#phonak-overlay-scroll-down').fadeIn();
			}
		});
		$('#phonak-overlay-scroll-down').click(function (e) {
			var overlay = $('#phonak-popup-overlay-inner-inner');
			overlay.animate({ scrollTop: $(document).height() - overlay.height() }, 1000);
		});
		$('#phonak-popup-trigger-close').click(function (e) {
			e.preventDefault();
			frontend.closePopUp();
		});
		$('#phonak-popup-overlay-close').click(function (e) {
			e.preventDefault();
			frontend.closeForm();
		});

		// Checkbox fields
		$('#phonak-popup form .checkbox input').change(function () {
			if ($(this).is(':checked')) {
				$(this).parents('.checkbox.field').addClass('checked');
			}
			else {
				$(this).parents('.checkbox.field').removeClass('checked');
			}
		});

		// Form labels
		$('input[type="text"], input[type="tel"], input[type="email"]', '#phonak-popup form').focus(function () {
			$(this).parent('.field').addClass('focus');
			if ($(this).val()) {
				$(this).parent('.field').removeClass('empty');
			}
		});
		$('input[type="text"], input[type="tel"], input[type="email"]', '#phonak-popup form').blur(function () {
			$(this).parent('.field').removeClass('focus');
			if ($(this).val()) {
				$(this).parent('.field').removeClass('empty');
			}
			else {
				$(this).parent('.field').addClass('empty');
			}
		});
		$('input[type="text"], input[type="tel"], input[type="email"]', '#phonak-popup form').each(function() {
			if($(this).val()) {
				$(this).parent('.field').removeClass('empty');
			}
		});
		$('select', '#phonak-popup form').each(function () {
			$(this).change(function () {
				$(this).parent('.field').removeClass('default');
			});
		});

		// Form validation
		$('#phonak-popup form').submit(function (e) {
			e.preventDefault();
			var $form = $(this);

			// Remove errors
			var errors = false;
			$('.popup-error-message', $form).hide();
			$('.field.popup-error', $form).removeClass('popup-error');

			// Loop through required fields	to check if empty
			$('.required input[type="text"], .required input[type="tel"], .required input[type="email"]', $form).each(function () {
				if ($(this).val() === '') {
					var $field = $(this).parent('.field');
					$field.addClass('popup-error');
					errors = true;
				}
			});

			// Check for valid email
			$('input[type="email"]', $form).each(function () {
				var email = $(this).val();
				if (!validateEmail(email)) {
					var $field = $(this).parent('.field');
					$field.addClass('popup-error');
					errors = true;
				}
			});

			// Check for valid zip code
			$('#ZipCode', $form).each(function () {
				var zipCode = $(this).val();
				if (zipCode === '') {
					return true;
				}
				// See if there is a selected country in the drop down, and find the original country ISO code.
				var selectedCountry = countrySelect.find(":selected");
				var selectedCountryValue = selectedCountry.attr('v');
				if (selectedCountryValue === 'UK') selectedCountryValue = 'GB';
				var selectedCountryName = (selectedCountryValue ? selectedCountry.text() : null);
				var zipCodeCountry = selectedCountryValue || pageCountry;
				var zipCodeCountryName = selectedCountryName || pageCountry;

				var result = sonovaLG.postalCodes.validate(zipCodeCountry, zipCode);
				if (result !== true) {
					var $field = $(this).parent('.field');
					$field.addClass('popup-error');
					result = sonovaLG.getErrorMessages().formZipCodeError.format(zipCode, zipCodeCountryName);
					$('.popup-error-details', $field).html(result);
					errors = true;
				}
			});

			// Loop through required checkboxes to check if empty
			$('.required input[type="checkbox"]', $form).each(function () {
				if (!$(this).is(':checked')) {
					var $field = $(this).parents('.field');
					$field.addClass('popup-error');
					errors = true;
				}
			});

			// Loop through selects to check if changed
			$('.required select', $form).each(function () {
				if (!$(this).val()) {
					var $field = $(this).parents('.field');
					$field.addClass('popup-error');
					errors = true;
				}
			});

			// Submit if no errors
			if (errors) {
				$('.popup-error-message', $form).html(sonovaLG.getErrorMessages().formIncompleteError).show();
				$('#phonak-popup-overlay-inner-inner').animate({scrollTop: 0});

				if ($('#phonak-popup-overlay-inner-inner').hasScrollBar()) {
					window.setTimeout(function () {
						$('#phonak-overlay-scroll-down').fadeIn();
					}, 500);
				}
			}
			else {
				// Remove errors
				errors = false;
				$('.popup-error-message', $form).hide();
				$('.popup-error', $form).removeClass('error');

				// Let backend.js know to submit the form.
				sonovaLG.sendForm($form[0]);
			}
		});

		function validateEmail(email) {
			var re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
			return re.test(String(email).toLowerCase());
		}

		$.fn.hasScrollBar = function () {
			return this.get(0).scrollHeight > this.height();
		};

	});

})(jQuery);

(function () {
	// Define functions if not already declared.
	if (!String.prototype.format) {
		String.prototype.format = function () {
			var args = arguments;
			return this.replace(/{(\d+)}/g, function (match, number) {
				return typeof args[number] !== 'undefined' ? args[number] : match;
			});
		};
	}

})();

