/*
 *   Copyright (c) 2017, Paul Hulme
 *   https://github.com/paulhulme/
 */

'use strict';

angular.module('SimpleTrainTimes').service('huxleyService', function($http) {

    var baseUrl = 'http://yourhuxley.com'; // change to your huxley URL
    var accessToken = 'accessToken=0000-yourtoken-000-00000'; // change to your access token

    // Search for stations or a CRS code using the Huxley CRS endpoint
    this.CrsLookup = function(val) {
        var URL = baseUrl + '/crs/' + val;
        return $http.get(URL).then(function(response) {
            //var ret = response.data;
            // check if the val exactly matches a CRS code
            if (val.length === 3) {
                var ret = response.data.filter(function(item) {
                    return val.toUpperCase() === item.crsCode;
                });
                if (ret.length === 1)
                    return ret;
            }
            return response.data.slice(0, 8);
        });
    };

    // get DepartureBoard from Huxley departures endpoint
    this.getDepartureBoard = function(from, to) {
        var URL = baseUrl + '/departures/' + from + '/to/' + to + '?' + accessToken + '&expand=true';
        return $http.get(URL);
    };
});