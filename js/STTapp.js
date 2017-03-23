/*
 *   Copyright (c) 2017, Paul Hulme
 *   https://github.com/paulhulme/
 */

'use strict';

angular.module('SimpleTrainTimes', ['ngAnimate', 'ui.bootstrap', 'ngSanitize']);

angular.module('SimpleTrainTimes').config(function($locationProvider) {
    $locationProvider.html5Mode(true);
});

angular.module('SimpleTrainTimes').run(function($rootScope, $location, stationDataSvc, trainTimesDataSvc) {

    // retrieve vlues from local storage and then get train times on initialisation
    if ($location.path().indexOf('/to/') !== 4) {
        if (stationDataSvc.restoreState()) {
            trainTimesDataSvc.getTrainTimes(stationDataSvc.from.crs, stationDataSvc.to.crs);
        }
    }

    // process to and from CRS from the browser path in the format: /crs/to/crs
    // called on initialisation and when URL changes
    $rootScope.$on('$locationChangeSuccess', function(event) {
        if ($location.path().indexOf('/to/') !== 4)
            return;

        var from = $location.path().substring(1, 4);
        var to = $location.path().substring(8, 11);
        if ((from !== stationDataSvc.from.crs) || (to !== stationDataSvc.to.crs)) {
            stationDataSvc.from = '';
            stationDataSvc.to = '';
            stationDataSvc.search(from).then(function(data) {
                stationDataSvc.from = data[0];
                if (stationDataSvc.validStations()) {
                    trainTimesDataSvc.getTrainTimes(stationDataSvc.from.crs, stationDataSvc.to.crs);
                }
            });
            stationDataSvc.search(to).then(function(data) {
                stationDataSvc.to = data[0];
                if (stationDataSvc.validStations()) {
                    trainTimesDataSvc.getTrainTimes(stationDataSvc.from.crs, stationDataSvc.to.crs);
                }
            });
        }
    });
});