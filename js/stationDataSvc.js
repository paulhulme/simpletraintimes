/*
 *   Copyright (c) 2017, Paul Hulme
 *   https://github.com/paulhulme/
 */

'use strict';
/*global localStorage: false, console: false */

angular.module('SimpleTrainTimes').service('stationDataSvc', function(huxleyService) {

    // Station class def
    var Station = function(name, CRS) {
        this.name = name;
        this.CRS = CRS;

        Object.defineProperties(this, {
            "display": {
                "get": function() {
                    if (!this.name)
                        return null;
                    return this.name + ' (' + this.CRS + ')';
                }
            },
            "crs": {
                "get": function() {
                    if (this.CRS) return this.CRS.toLowerCase();
                    return null;
                }
            }
        });
    };

    this.from = new Station();
    this.to = new Station();

    this.search = function(val) {
        return huxleyService.CrsLookup(val).then(function(result) {
            return result.map(function(item) {
                return new Station(item.stationName, item.crsCode);
            });
        });
    };

    this.switch = function() {
        var tmp = this.from;
        this.from = this.to;
        this.to = tmp;
    };

    this.validStations = function() {
        return this.from && this.to && this.from.crs && this.to.crs;
    };

    /** Puts to and from stations in local storage for retrieval later */
    this.saveState = function() {
        if (typeof(Storage) !== "undefined") {
            localStorage.fromName = this.from.name;
            localStorage.fromCrs = this.from.CRS;
            localStorage.toName = this.to.name;
            localStorage.toCrs = this.to.CRS;
            localStorage.time = Date.now();
        }
    };

    /** Retrieves to and from stations from local storage */
    this.restoreState = function() {
        if (typeof(Storage) !== "undefined") {
            if (localStorage.from) {
                this.from.name = localStorage.fromName;
                this.from.CRS = localStorage.fromCrs;
                this.to.name = localStorage.toName;
                this.to.CRS = localStorage.toCrs;
                // if time now is in a 4 hour window of last checked then get times, else switch for return journey
                var timeNow = (Date.now() - localStorage.time) / 60000;
                if ((timeNow > 120) && (timeNow < 1080)) {
                    this.switch();
                    this.saveState();
                }
                return true;
            }
        }
        return false;
    };
});