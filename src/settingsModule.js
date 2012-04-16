﻿define([
		'src/settingsPageController',
		'amdUtils/string/interpolate'
], function (settingsPageController, interpolate) {

	initializeLogging();
	// mainModule already loaded
	var mainModule = chrome.extension.getBackgroundPage().require("src/mainModule");
	settingsPageController.initialize(mainModule.getSupportedServiceTypes());
	settingsPageController.settingsChanged.add(settingsChanged);

	function initializeLogging() {
		window.onerror = function (message, url, line) {
			console.error(interpolate('Unhandled error. message=[{{0}}], url=[{{1}}], line=[{{2}}]', [message, url, line]));
			return false; // don't suppress default handling
		};
	}

	function settingsChanged(updatedSettings) {
		mainModule.updateSettings(updatedSettings);
	}

	return {
		show: function () {
			var settings = mainModule.getSettings();
			settingsPageController.load(settings);
		}
	};
});
