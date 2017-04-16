/*
 *   Copyright (c) 2017, Paul Hulme
 *   https://github.com/paulhulme/
 */

'use strict';

angular.module('SimpleTrainTimes').service('trainTimesDataSvc', function(huxleyService) {
    this.TTdata = [];
    this.status = '';
    this.fromCRS = '';
    this.toCRS = '';
    var self = this;

    // retrieves and processes the departureboard data from the Huxley departures JSON endpoint
    this.getTrainTimes = function(fromCrs, toCrs) {

        // update status
        this.status = '(... loading ...)';
        this.fromCRS = fromCrs.toUpperCase();
        this.toCRS = toCrs.toUpperCase();

        // get train services from DepartureBoard endpoint
        huxleyService.getDepartureBoard(this.fromCRS, this.toCRS)
            .then(function successCallback(response) {
                // check that there are services to parse
                if (response.data.trainServices === null) {
                    self.TTData = [{
                        std: "No direct trains for 2 hours. You may need a journey planner, like National Rail Enquiries."
                    }];
                    self.status = 'No Direct Services';
                } else {
                    // parse the response
                    self.TTData = parseDepBd(response.data);
                }
                self.status = '(updated ' + new Date().toLocaleTimeString() + ')';
            }, function errorCallback(err) {
                if (err.data === null) {
                    self.status = "(couldn't connect to server)";
                } else {
                    self.status = '(' + err.data.message + ')';
                }
                self.TTData = [];
            });
    };

    function parseDepBd(DBwithDetails) {
        var ret = [];

        function destCPCallBack(item) {
            return item.crs === DBwithDetails.filtercrs;
        }

        function notNullCallBack(item) {
            return item !== undefined;
        }

        for (var i = 0; i < DBwithDetails.trainServices.length; i++) {
            //set initial result values
            var ts = DBwithDetails.trainServices[i];
            var res = {
                platform: (ts.platform !== null) ? ts.platform : 'TBA',
                std: ts.std,
                operator: ts.operator,
                serviceID: ts.serviceID,
                carriages: (ts.length > 0) ? (ts.length + '-car') : '',
                isOpen: false
            };

            // set the destination values
            var subCallPts = ts.subsequentCallingPoints[0].callingPoint;
            var destCallPt = subCallPts.filter(destCPCallBack)[0];
            // Sometimes the DBwithDetails has services that don't stop at the destination!!
            if (destCallPt === undefined) {
                continue;
            }
            res.stops = subCallPts.indexOf(destCallPt) + ' stops';
            res.sta = destCallPt.st;

            // Setup initial delay and time values
            res.minsDelayed = '';
            res.reason = (ts.delayReason) ? (ts.delayReason) : '';
            //res.travelTime = subTimes(res.sta, res.std) + "mins";
            var d = new Date();
            var timeNow = d.getHours() + ':' + d.getMinutes();
            res.timeToArrive = subTimes(res.sta, timeNow);
            res.timeToDepart = subTimes(res.std, timeNow);

            // Handle different statuses and specified amounts of delay
            var ETA = destCallPt.et;
            res.status = ETA;
            if (ETA === 'On time') {
                res.reason = '';
            } // sometimes there's a delay reason in the data when a train is on time!

            // when there is a specified amount of delay ETA will be a time
            if (ETA.indexOf(':') > -1) {
                var delayMins;
                if (ts.etd === 'On time') {
                    delayMins = subTimes(ETA, res.sta);
                } else if (ts.etd.indexOf(':') > -1) {
                    delayMins = subTimes(ts.etd, ts.std);
                    res.etd = '(' + ts.etd + ')';
                    res.timeToDepart = subTimes(ts.etd, timeNow);
                }
                res.minsDelayed = delayMins + 'mins';
                res.status = (delayMins < 10) ? 'Delayed' : 'Long Delay';
                res.timeToArrive = subTimes(ETA, timeNow);
                res.eta = '(' + ETA + ')';
            }
            res.travelTime = (res.timeToArrive - res.timeToDepart) + 'mins';

            if (ETA === 'Cancelled' || ts.etd === 'Cancelled') {
                res.status = 'Cancelled';
                res.minsDelayed = '';
                res.timeToArrive = 1440;
                if (ts.cancelReason) res.reason = ts.cancelReason;
            }

            ret[i] = res;
        }
        return ret.filter(notNullCallBack); // filter out blanks
    }

    /** Subtracts t2 from t1 with a rollover for times around midnight (e.g. 00:45 - 11:55). */
    function subTimes(t1, t2) {
        var ret = parseTime(t1) - parseTime(t2);
        // fix for when t1 is after midnight, and t2 is before midnight.
        if (ret < -60) { // small negatives happen when timenow is a few minutes after an SDT
            ret += 1440; // minutes in a day
        }
        return ret;
    }

    /** Parses a time string 'hh:mm' into int minutes. */
    function parseTime(s) {
        var c = s.split(':');
        return parseInt(c[0]) * 60 + parseInt(c[1]);
    }
});