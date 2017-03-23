/*
 *   Copyright (c) 2017, Paul Hulme
 *   https://github.com/paulhulme/
 */

'use strict';

angular.module('SimpleTrainTimes').controller('SimpleTrainTimesCtrl', function($scope, $location, stationDataSvc, trainTimesDataSvc) {

    $scope.stations = stationDataSvc;
    $scope.depBd = trainTimesDataSvc;
    $scope.formOpen = !stationDataSvc.validStations();
    $scope.sortBy = 'timeToArrive';

    $scope.refresh = function() {
        $scope.formOpen = false;
        $scope.getTrainTimes();
    };

    $scope.switch = function() {
        $scope.stations.switch();
        $scope.getTrainTimes();
    };

    $scope.getTrainTimes = function() {
        if (stationDataSvc.validStations()) {
            trainTimesDataSvc.getTrainTimes(stationDataSvc.from.crs, stationDataSvc.to.crs);
            stationDataSvc.saveState();
            $location.path(stationDataSvc.from.crs + '/to/' + stationDataSvc.to.crs);
        }
    };
});