var express = require('express');
var cfenv = require('cfenv');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var Cloudant = require('cloudant');

var Client = require("ibmiotf");
var appClientConfig = {
	"org": process.env.IOT_ORG || "57mkcv",
	"id": "Badmition",
	"auth-key": process.env.IOT_AUTH_KEY || "a-57mkcv-kw3kflexm1",
	"auth-token": process.env.IOT_AUTH_TOKEN || "LP1JeoV(+9fqRTlvRH",
	"domain": process.env.IOT_DOMAIN || "internetofthings.chinabluemix.net"
}

var appClient = new Client.IotfApplication(appClientConfig);
appClient.log.setLevel('info');
//console.log("KeepAliveInterval : " + appClient.getKeepAliveInterval());
//console.log("CleanSession : " + appClient.isCleanSession());
appClient.setKeepAliveInterval(20);
appClient.setCleanSession(true);
appClient.connect(2);// qos : 0,1,2



var username = process.env.CLOUDANT_USERNAME || '1df04d79-dac2-4c2f-8cba-ab1ae6606098-bluemix';
var password = process.env.CLOUDANT_PASSWORD || '46f9ac7180f36a1f752786421858d01b5dbd92bb42c89f84e7464016a0792e55';

// Initialize the library with my account.
var cloudant = Cloudant({ account: username, password: password });

var badmintondb;
var statusdb;
var devicestatusdb;

function useDB() {
	var yearMonthDate = getYearMonthDate();

	var badmintondbname = 'badminton' + yearMonthDate;
	var statusdbname = 'badminton_status' + yearMonthDate;
	var devicestatusdbname = 'badminton_device_status' + yearMonthDate;
	console.log("badmintondbname : " + badmintondbname);
	console.log("statusdbname : " + statusdbname);
	console.log("devicestatusdbname : " + devicestatusdbname);

	cloudant.db.list(function (err, allDbs) {
		console.log('All my databases: %s', allDbs.join(', '))

		var dbs = allDbs.join(",");
		if (dbs.indexOf(badmintondbname) < 0) {
			cloudant.db.create(badmintondbname,function () {
				badmintondb = cloudant.db.use(badmintondbname)
				var first_name = { name: 'time-index', type: 'json', index: { fields: [{'time':'desc'}] } }
				badmintondb.index(first_name, function (er, response) {
					if (er) {
						throw er;
					}
					console.log('Index creation result: %s', response.result);
				});
			});
			//statusdb = cloudant.db.create(statusdbname);
			//devicestatusdb = cloudant.db.create(devicestatusdbname);
			
		} else {
			badmintondb = cloudant.db.use(badmintondbname)
			//statusdb = cloudant.db.use(statusdbname);
			//devicestatusdb = cloudant.db.use(devicestatusdbname);
		}

	});
}

function getYearMonthDate() {
	var currentTime = new Date();
	var month = currentTime.getMonth() + 1;
	month = month <= 9 ? "0" + month : "" + month;
	var date = currentTime.getDate();
	date = date <= 9 ? "0" + date : "" + date;
	//return currentTime.getFullYear() + month + date;
	return currentTime.getFullYear() + month;
}

appClient.on("connect", function () {
	appClient.log.info("IoT Server connected.");
	appClient.subscribeToDeviceEvents();				// iot-2/type/+/id/+/evt/+/fmt/+ with QoS 0
	//appClient.subscribeToDeviceEvents("+","+","+"); 	// iot-2/type/+/id/+/evt/+/fmt/+ with QoS 0
	// Subscribing to status updates for all devices
	appClient.subscribeToDeviceStatus();				// iot-2/type/+/id/+/mon with QoS 0
	//Subscribing to DeviceCommands for all devices
	appClient.subscribeToDeviceCommands();				// iot-2/type/+/id/+/cmd/+/fmt/+ with QoS 0
});

// Error
appClient.on("error", function (err) {
	console.log("Error : " + err);
});

// Handling events from devices
appClient.on("deviceEvent", function (deviceType, deviceId, eventType, format, payload) {
	//console.log("Device Event from : " + deviceType + " : " + deviceId + " of event " + eventType + " with payload :" + payload);

	if (eventType == "log") {

	}
	else {
		if (deviceId.indexOf("USENSE") >= 0) {
			console.log("Device Event from : " + deviceType + " : " + deviceId + " of event " + eventType + " with payload :" + payload);

			var topic = 'iot-2/type/' + deviceType + '/id/' + deviceId + '/evt/' + eventType + '/fmt/' + format;
			var payloadJSON = JSON.parse('' + payload);
			//var json = {'serverTime' : new Date(), 'topic' : topic, 'payload' : payloadJSON, 'deviceId' : deviceId, 'deviceType' : deviceType, 'eventType' : eventType, 'format': format};

			io.emit('message', JSON.stringify(payloadJSON));
			saveToDb(payloadJSON);
		}
	}
});

//Handling status updates from devices
appClient.on("deviceCommand", function (deviceType, deviceId, payload, topic) {
	//console.log("Device command from : "+deviceType+" : "+deviceId+" with payload : "+payload + "\ttopic:" + topic);
});

//Handling status updates from devices
appClient.on("deviceStatus", function (deviceType, deviceId, payload, topic) {
	//console.log("Device status from : "+deviceType+" : "+deviceId+" with payload : "+payload + "\ttopic:" + topic);
});

io.on('connection', function (socket) {
	console.log('a user connected');

	queryFromDb();
});

function saveToDb(badmition) {
	var d = new Date();
	badmition.time = d.getTime();
	badmintondb.insert(badmition, function (err, body, header) {
		if (err)
			return console.log('[badmintondb.insert] ', err.message)

		console.log('you have inserted the badmition.')
		console.log(body)

		queryFromDb();
	})
}

function queryFromDb() {
	var sel = {
		"selector": {
			"time": { "$gt": 0 }
		},
		"sort": [{ "time": "desc" }],
		"limit": 20,
		"skip": 0
	}
	badmintondb.find(sel, function (er, result) {
		if (er) {
			throw er;
			//console.log(er);
		}

		console.log('Found %d documents ', result.docs.length);
		// for (var i = 0; i < result.docs.length; i++) {
		// 	console.log('  Doc id: %s', JSON.stringify(result.docs[i]));
		// }

		io.emit('playlist', JSON.stringify(result.docs));
	});
}

app.use(express.static(__dirname + '/public'));
var port = process.env.HTTP_PORT || process.env.VCAP_APP_PORT || 3000;
http.listen(port, function () {
	console.log('Server running on port: %d', port);
});

var schedule = require('node-schedule');
function scheduleCronstyle() {
	schedule.scheduleJob('1 0 0 * * *', function () {
		useDB();
	});
	useDB();
}

scheduleCronstyle();