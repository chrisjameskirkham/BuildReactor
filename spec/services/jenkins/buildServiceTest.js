require([
	'jasmineSignals',
	'services/jenkins/buildService',
	'services/cctray/buildService'
], function (jasmineSignals, BuildService, CCTrayBuildService) {

	'use strict';

	describe('services/jenkins/buildService', function () {

		var settings;
		var ccBuildInfo;

		beforeEach(function () {
			settings = {
				typeName: 'Jenkins',
				baseUrl: 'jenkins',
				icon: 'jenkins/icon.png',
				url: 'http://example.com/',
				name: 'Jenkins instance'
			};
			ccBuildInfo = {
				serviceName: 'cc service name',
				buildName: 'cc build name',
				group: 'cc group name',
				url: 'http://example.com/cc_link',
				icon: 'cctray/icon.png'
			};
		});

		it('should provide default settings', function () {
			var defaultSettings = BuildService.settings();

			expect(defaultSettings.typeName).toBe('Jenkins');
			expect(defaultSettings.baseUrl).toBe('jenkins');
			expect(defaultSettings.icon).toBe('jenkins/icon.png');
			expect(defaultSettings.logo).toBe('jenkins/logo.png');
			expect(defaultSettings.urlHint).toBe('http://ci.jenkins-ci.org/');
		});

		it('should modify url used to get projects', function () {
			spyOn(CCTrayBuildService.prototype, 'projects').andCallFake(function (selectedPlans) {
				expect(this.settings.url).toBe('http://example.com/view/All/cc.xml');
			});

			var service = new BuildService(settings);
			service.projects([ 'A', 'B' ]);

			expect(CCTrayBuildService.prototype.projects).toHaveBeenCalled();
		});

		it('should modify url', function () {
			spyOn(CCTrayBuildService.prototype, 'start').andCallFake(function () {
				expect(this.settings.url).toBe('http://example.com/view/All/cc.xml');
			});

			var service = new BuildService(settings);
			service.start();

			expect(CCTrayBuildService.prototype.start).toHaveBeenCalled();
		});

	});

});