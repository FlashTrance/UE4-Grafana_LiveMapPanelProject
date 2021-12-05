// THIS IS THE REST API PROGRAM THAT UE4 SENT DATA TO. FROM HERE, THE DATA IS SCRAPED BY PROMETHEUS AND PULLED DIRECTLY INTO THE GRAFANA DASHBOARD.
// ---------------------------------------------------------------

// IMPORTS
const cors = require('cors');
const express = require("express");
const pc = require("prom-client");
const register = require("prom-client").register;
const bodyParser = require("body-parser");


// GLOBAL VARS
const listenPort = process.env.PORT || 3000; // Checks for env variable called port, otherwise uses specified value
const app = express();
const incidents_finished = []; 	  		 // Used for "incident_times_gauge"
const incidents_finished_times = []; 		 // -------------------------------


// PROMETHEUS METRICS
const speed_gauge_kmh = new pc.Gauge({ name: 'da_vehicle_speed_kmh', help: 'The speed of the simulated vehicle (km/h)' });
const speed_gauge_mph = new pc.Gauge({ name: 'da_vehicle_speed_mph', help: 'The speed of the simulated vehicle (mph)' });
const speedlimit_gauge_kmh = new pc.Gauge({ name: 'da_speedlimit_kmh', help: 'The speed limit of the current road (km/h)' });
const speedlimit_gauge_mph = new pc.Gauge({ name: 'da_speedlimit_mph', help: 'The speed limit of the current road (mph)' });
const distance_traveled_gauge_km = new pc.Gauge({ name: 'da_vehicle_dist_traveled_km', help: 'Total distance driven (km)' });
const distance_traveled_gauge_mi = new pc.Gauge({ name: 'da_vehicle_dist_traveled_mi', help: 'Total distance driven (mi)' });
const incident_times_gauge = new pc.Gauge({ name: 'da_incident_times_gauge', help: 'incident time - Minutes since previous incident stop', labelNames: ['stop']});
const total_time_working_gauge_min = new pc.Gauge({ name: 'da_vehicle_minutes_worked', help: 'Total time spent working (min)' });
const total_incidents_gauge = new pc.Gauge({ name: 'da_total_incidents', help: 'Total # of incidents to be addressed today.' });
const current_incidents_gauge = new pc.Gauge({ name: 'da_current_incidents', help: 'Current # of incidents already addressed today.' });
const latitude_gauge = new pc.Gauge({ name: 'da_vehicle_lat', help: 'The latitudinal location of the vehicle' });
const longitude_gauge = new pc.Gauge({ name: 'da_vehicle_long', help: 'The longitudinal location of the vehicle' });
const event_type_gauge = new pc.Gauge({ name: 'da_event_type', help: 'Integer value representing an event type.' });
speed_gauge_kmh.set(0);
speed_gauge_mph.set(0);
speedlimit_gauge_mph.set(0);
distance_traveled_gauge_km.set(0);
distance_traveled_gauge_mi.set(0);
total_time_working_gauge_min.set(0);
latitude_gauge.set(39.115543);   // This location is the intersection of Minnesota Ave and North 18th St (Kansas City)
longitude_gauge.set(-94.649231); // '''
event_type_gauge.set(-1);


// SETUP REST SERVER
app.use(cors()); // This is required if sending requests from HTML5 program
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


// START REST SERVER
app.listen(listenPort, () => 
{
	console.log("Server running on port %d", listenPort);
});


// GET ROUTES
app.get("/metrics", async (req, res) => 
{
	try
	{
		res.set('Content-Type', register.contentType);
		res.end(await register.metrics());
	} 
	catch (error) 
	{
		res.status(500).end(error);
	}
});


// POST ROUTES
app.post("/sim_data", (req, res) => 
{
	// Set all values sent in from UE4 sim
	const asset = req.body.asset;
	const assetType = req.body.assetType;
	const resourceCrew = req.body.resourceCrew;
	const date = req.body.date;
	const dateAndTime = req.body.dateAndTime;
	const timeZone = req.body.timeZone;
	const pOI = req.body.pOI;
	const eventType = req.body.eventType
	const street = req.body.street;
	const city = req.body.city;
	const state = req.body.state;
	const postalCode = req.body.postalCode;
	const country = req.body.country;
	const speedKMH = req.body.speedKMH;
	const speedMPH = req.body.speedMPH;
	const speedLimitKMH = req.body.speedLimitKMH;
	const speedLimitMPH = req.body.speedLimitMPH;
	const distanceKM = req.body.distanceKM;
	const distanceMI = req.body.distanceMI;
	const heading  = req.body.heading;
	const direction = req.body.direction;
	const odometerKM = req.body.odometerKM;
	const odometerMI = req.body.odometerMI;
	const ignition = req.body.ignition;
	const duringWorkingHours = req.body.duringWorkingHours;
	const privateRoad = req.body.privateRoad;
	const validGPS = req.body.validGPS;
	const pTO = req.body.pTO;
	const batteryLevel = req.body.batteryLevel;
	const assetStatus = req.body.assetStatus;
	const run = req.body.run;
	const latitude = req.body.latitude;
	const longitude = req.body.longitude;
	const lSD = req.body.lSD;
	const rSSI = req.body.rSSI;
	const reasonCode = req.body.reasonCode;
	const alarm = req.body.alarm;
	const sId = req.body.sId;
	const satellitesInFix = req.body.satellitesInFix;
	const satellitesTracked = req.body.satellitesTracked;
	const gPSSignalStrength = req.body.gPSSignalStrength;
	const locationAge = req.body.locationAge;
	const expectedElapsedTime = req.body.expectedElapsedTime;
	const fromSatellite = req.body.fromSatellite;
	const branch = req.body.branch;
	const totalTimeWorked = req.body.totalTimeWorked;
	const totalIncidents = req.body.totalIncidents;
	const currentIncidents = req.body.currentIncidents;

	// Set incident times gauge
	if (parseInt(currentIncidents) > 0 && !incidents_finished.includes(currentIncidents) && parseInt(currentIncidents) <= 4)
	{
		incidents_finished.push(currentIncidents);
		incidents_finished_times.push(totalTimeWorked);
		if (incidents_finished.length < 2) { incident_times_gauge.labels(currentIncidents).set(parseInt(totalTimeWorked)); }
		else 
		{ 
			new_time = parseInt(incidents_finished_times[parseInt(currentIncidents)-1]) - 
							parseInt(incidents_finished_times[parseInt(currentIncidents)-2]);
			incident_times_gauge.labels(currentIncidents).set(new_time); 
		}
	}

	// Assign eventType an integer (have to do this as long as we're using Prometheus)
	var eventInt = -1;
	if (eventType == "TrafficLight") { eventInt = 0; }
	else if (eventType == "Incident") { eventInt = 1; }
	else if (eventType == "Break") { eventInt = 2; }
	else if (eventType == "TrafficJam") { eventInt = 3; }

	// Set Prometheus metrics
	setMetrics(parseFloat(speedKMH), parseFloat(speedMPH), parseFloat(speedLimitKMH), parseFloat(speedLimitMPH), parseFloat(distanceKM), 
				parseFloat(distanceMI), parseInt(totalTimeWorked), parseInt(totalIncidents), parseInt(currentIncidents), 
				parseFloat(latitude), parseFloat(longitude), eventInt);

	// Let the client know everything is OK (IMPORTANT!!!)
	res.sendStatus(200);
});


// setMetrics() - SET PROMETHEUS METRICS
function setMetrics(speedKMH, speedMPH, speedLimitKMH, speedLimitMPH, distanceKM, distanceMI, timeWorkedMin, totalIncidents, 
	currentIncidents, lat, long, eventInt)
{
	speed_gauge_kmh.set(speedKMH);
	speed_gauge_mph.set(speedMPH);
	speedlimit_gauge_kmh.set(speedLimitKMH);
	speedlimit_gauge_mph.set(speedLimitMPH);
	distance_traveled_gauge_km.set(distanceKM);
	distance_traveled_gauge_mi.set(distanceMI);
	total_time_working_gauge_min.set(timeWorkedMin);
	total_incidents_gauge.set(totalIncidents);
	current_incidents_gauge.set(currentIncidents);
	latitude_gauge.set(lat);
	longitude_gauge.set(long);
	event_type_gauge.set(eventInt);
}
