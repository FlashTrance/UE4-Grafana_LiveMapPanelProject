// THIS IS THE REST API PROGRAM THAT UE4 SENT DATA TO. FROM HERE, THE DATA WAS STORED IN A POSTGRESQL DB AND PULLED IN BY GRAFANA.
// ---------------------------------------------------------------

// IMPORTS
const cors = require('cors');
const express = require('express');
const bodyParser = require('body-parser');
const { Client } = require('pg');


// GLOBAL VARS
const listenPort = process.env.PORT || 3000; // Checks for env variable called port, otherwise uses specified value
const app = express();

const DB_USER = '';
const DB_PW = '';
const DB_NAME = '';
const TABLE_NAME = '';
const SERVER_IP = '';


// SETUP POSTGRESQL CONNECTION
const client = new Client({
	user: DB_USER,
	host: SERVER_IP,
	database: DB_NAME,
	password: DB_PW,
	port: 5432,
});


// SETUP REST SERVER
app.use(cors()); // This is required if sending requests from HTML5 program
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));


// CONNECT TO POSTGRESQL
client.connect( (err) => 
{ 
	if (err) 
	{ 
		console.error("Failed to connect to PostgreSQL server!");
		process.exit(); 
	} 

	else
	{
		console.log("Successfully connected to PostgreSQL server @ " + SERVER_IP + " as user " + DB_USER);

		// START REST SERVER
		app.listen(listenPort, () => 
		{
			console.log("REST server running on port %d", listenPort);
		});
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

	// Setup DB query
	var db_query = '', query_params = '';
	db_query = 'INSERT INTO ' + TABLE_NAME + '(lat, lng, event_type, event_data, officer_data, map_data) values($1, $2, $3, $4, $5, $6)'; 
	var event_data = {'eventDesc': 'Some custom string from database', 'POI': pOI};
	var officer_data = {"vehicleID": asset, "vehicleSpeed": parseInt(speedMPH), "distanceTraveled": distanceMI, "totalTimeWorked": totalTimeWorked};
	var map_data = {"city": city, "street": street, "speedLimit": parseInt(speedLimitMPH)};
	query_params = [latitude, longitude, eventType, event_data, officer_data, map_data];

	// Send query to DB
	client.query(db_query, query_params, (err, res) => 
	{
		if (err) { throw err; }
		// else { console.info("Successfully inserted data into DB."); }
	});
	res.sendStatus(200);
});
