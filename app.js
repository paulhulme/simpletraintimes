/*
*   Copyright (c) 2017, Paul Hulme
*   https://github.com/paulhulme/
*/

'use strict';

angular.module('SimpleTrainTimes', ['ngAnimate', 'ui.bootstrap', 'ngSanitize']);

angular.module('SimpleTrainTimes').controller('SimpleTrainTimesCtrl', function ($scope, $http, $location) {

  $scope.isOpen = new Array();
  $scope.formOpen = true;
  $scope.tableOpen = false;
  $scope.sortBy = 'timeToArrive';
  $scope.updated = '';
  $scope.fromCRS = '';
  $scope.toCRS = '';
  $scope.fromStation = '';
  $scope.toStation = '';

  $scope.toggleOpen = function (index) {
    if (typeof $scope.isOpen[index] === 'undefined') {
      $scope.isOpen[index] = false;
    };
    $scope.isOpen[index] = !$scope.isOpen[index];
  };

  $scope.refresh = function () {
    $scope.formOpen = false;
    $scope.getTrainTimes();
  }

  $scope.switch = function () {
    var tmp = $scope.toStation;
    $scope.toStation = $scope.fromStation;
    $scope.fromStation = tmp;
    $scope.ttData = new Array();
    $scope.isOpen = new Array();
    $scope.getTrainTimes();
  };

  // looks up stations from the CRS JSON endpoint provided by Huxley
  $scope.getStations = function (val) {
    var URL = 'http://yourhuxley.com/crs' + val;                // change to your URL!
    return $http.get(URL).then(function (response) {
      var ret = response.data;
      // check if the val exactly matches a CRS code
      if (val.length === 3) {
        ret = ret.filter(function (item) {
          return val.toUpperCase() === item.crsCode;
        });
        if (ret.length != 1) {
          ret = response.data;
        }
      }
      return ret.slice(0, 10).map(function (item) {
        return item.stationName + ' (' + item.crsCode + ')';
      });
    });
  };

  // retrieves and processes the departureboard data from the Huxley departures JSON endpoint
  $scope.getTrainTimes = function () {
    if (!$scope.fromStation || !$scope.toStation) {
      $scope.tableOpen = false;
      $scope.formOpen = true;
      $scope.updated = '';
      return;
    }

    // put the inputs and timestamp into local storage.
    var d = new Date();
    storeInputs($scope.fromStation, $scope.toStation, d);

    // update displayed values
    $scope.updated = '(... loading ...)';
    var l = $scope.fromStation.length;
    $scope.fromCRS = $scope.fromStation.substring(l - 4, l - 1);
    l = $scope.toStation.length;
    $scope.toCRS = $scope.toStation.substring(l - 4, l - 1);

    // Build the URL
    var URL = 'http://yourhuxley.com/departures/' + $scope.fromCRS;  	    // change to your huxley URL
    URL += '/to/' + $scope.toCRS + '?';											              // to CRS
    URL += 'accessToken=0000-yourtoken-000-00000';					              // change to your access token
    URL += '&expand=true';														                    // DB with details

    // get train services from DepartureBoard endpoint
    $http.get(URL)
      .then(function successCallback(response) {
        // parse the response
        $scope.ttData = parseTrainServices(response.data);
        $scope.updated = '(updated ' + d.toLocaleTimeString() + ')';
        $scope.tableOpen = true;
      }, function errorCallback(err) {
        // Handle error
        $scope.updated = ' - Error getting train times!';
        $scope.tableOpen = true;
        if (err.data == null) {
          $scope.ttData[0] = {
            std: "Couldn't connect to server.",
            status: "DISCONNECTED",
            timeToArrive: 0
          };
        } else {
          $scope.ttData[0] = {
            std: err.data.message,
            status: err.status + ':' + err.statusText,
            timeToArrive: 0
          };
        }
      });
  };

  // *************** initialisation on page load *****************

  // handle URL search parameters
  var search = $location.search();
  if (search.from && search.to) {
    $scope.getStations(search.from).then(function (data){
      $scope.fromStation = data[0];
      $scope.getTrainTimes();
      $scope.formOpen = false;
    });   // async call
    $scope.getStations(search.to).then(function (data){
      $scope.toStation = data[0];
      $scope.getTrainTimes();
      $scope.formOpen = false;
    });   // async call
  }

  // retrieve vlues from local storage
  if (!(search.from && search.to) && typeof (Storage) !== "undefined") {
    if (localStorage.from) {
      $scope.fromStation = localStorage.from;
      $scope.toStation = localStorage.to;
      $scope.formOpen = false;
      // if time now is in a 4 hour window of last checked then get times, else switch for return journey
      if (((Date.now() - localStorage.time) / 60000 < 120) || ((Date.now() - localStorage.time) / 60000 > 1080)) {
        $scope.getTrainTimes();
      } else {
        $scope.switch();
      }
    };
  };
});
// ****************** controller end ********************


// ******* Train Times Utility Functions ********

/** Extracts train service data from a Departure Board with Details object. */
function parseTrainServices(DBwithDetails) {
  var ret = new Array();

  if (DBwithDetails.trainServices == null) {
    ret[0] = { std: "No services found" };
    return ret;
  }

  var toCRS = DBwithDetails.filtercrs;
  for (var i = 0; i < DBwithDetails.trainServices.length; i++) {
    //set initial result values
    var ts = DBwithDetails.trainServices[i];
    var res = {
      platform: (ts.platform !== null) ? ts.platform : "TBA",
      std: ts.std,
      operator: ts.operator,
    }

    //set the destination values
    var subCallPts = ts.subsequentCallingPoints[0].callingPoint;
    res.destCallPt = subCallPts.filter(function (cp) {
      return cp.crs === toCRS;
    })[0];
    res.stops = subCallPts.indexOf(res.destCallPt) + " stops";

    // Setup initial delay and time values
    res.minsDelayed = '';
    res.reason = (ts.delayReason) ? (ts.delayReason) : '';
    res.travelTime = subTimes(res.destCallPt.st, res.std) + "mins";
    var d = new Date();
    var timeNow = d.getHours() + ':' + d.getMinutes();
    res.timeToArrive = subTimes(res.destCallPt.st, timeNow);
    res.timeToDepart = subTimes(res.std, timeNow);

    // Handle different statuses and specified amounts of delay
    var ETA = res.destCallPt.et;
    res.status = ETA;
    if (ETA === 'On time') {
      res.reason = '';
    }  // sometimes there's a delay reason in the data when a train is on time!

    // when there is a specified amount of delay ETA will be a time
    if (ETA.indexOf(':') > -1) {
      if (ts.etd === 'On time') {
        var delayMins = subTimes(ETA, res.destCallPt.st);
      } else {
        var delayMins = subTimes(ts.etd, ts.std);
        res.etd = '(' + ts.etd + ')';
        res.timeToDepart = subTimes(ts.etd, timeNow);
      }
      res.minsDelayed = delayMins + 'mins';
      res.status = (delayMins < 10) ? 'Delayed' : 'Long Delay';
      res.timeToArrive = subTimes(ETA, timeNow);
      res.eta = '(' + ETA + ')';
    }

    if (ETA === 'Cancelled') {
      res.timeToArrive = 1440;
      if (ts.cancelReason) res.reason = ts.cancelReason;
    }

    ret[i] = res;
  }
  return ret;
}

/** Subtracts t2 from t1 with a rollover for times around midnight (e.g. 00:45 - 11:55). */
function subTimes(t1, t2) {
  var ret = parseTime(t1) - parseTime(t2);
  // fix for when t1 is after midnight, and t2 is before midnight.
  if (ret < -60) {    // small negatives happen when timenow is a few minutes after an SDT
    ret += 1440;      // minutes in a day
  };
  return ret;
}

/** Parses a time string 'hh:mm' into int minutes. */
function parseTime(s) {
  var c = s.split(':');
  return parseInt(c[0]) * 60 + parseInt(c[1]);
}

/** Puts values into localStorage for use later. */
function storeInputs(from, to, time) {
  if (typeof (Storage) !== "undefined") {
    localStorage.from = from;
    localStorage.to = to;
    localStorage.time = Date.parse(time);
  }
}