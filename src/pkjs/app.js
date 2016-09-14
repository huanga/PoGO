//"use strict";

// XMLHttpRequest helper
var xhrRequest = function (url, type, callback) {
	var xhr = new XMLHttpRequest();
	xhr.onload = function () {
		callback(this.responseText);
	};
	xhr.open(type, url);
	xhr.send();
};

function getPokemon(latitude, longitude) {

	// live PokeVision data, hard-coded to Ann Arbor for now
	//var scanUrl = 'https://pokevision.com/map/scan/' + latitude + '/' + longitude;
	//var dataUrl = 'https://pokevision.com/map/data/' + latitude + '/' + longitude;

	// static (stable!) example of PokeVision data
	//var scanUrl = 'https://mathewreiss.github.io/PoGO/data.json';
	//var dataUrl = 'https://mathewreiss.github.io/PoGO/data.json';

	// who needs PokeVision? :P

	// TODO: figure out real/sensible (configurable?!) values for this
	var latitudeOffset = (42.21292056305407 - 42.2070240993399) / 2;
	var longitudeOffset = (-83.68226052392578 - -83.65136147607421) / 2;
	console.log("latitudeOffset: " + latitudeOffset);
	console.log("longitude: " + longitudeOffset);


	// * * * TODO: STILL NEED SCAN!!! * * *

	// !!! replace TODO_REPLACE_SERVER_URL before using !!!
    var server = "https://pgm.chiisana.net";
	var dataUrl = server + "/raw_data" + 
		"?pokemon=true&pokestops=true&gyms=true&scanned=false" + 
		"&swLat=" + (latitude - latitudeOffset) + 
		"&swLng=" + (longitude + longitudeOffset) + 
		"&neLat=" + (latitude + latitudeOffset) + 
		"&neLng=" + (longitude - longitudeOffset);
	console.log("dataUrl: " + dataUrl);


	xhrRequest(dataUrl, 'GET', 
		function(dataResponseText) {
			var json = JSON.parse(dataResponseText);
			console.log(dataResponseText); // JSON.stringify() not necessary!

			// TODO: much better error checking???
			if (json.pokemons.length > 0) {

				var allNearbyPokemon = [];

				var i;
				for (i = 0; i < json.pokemons.length - 1; i++) {

					var pokemon = json.pokemons[i];

					// TODO: gyms, stops, etc.!?

					// TODO: should still actually verify vs. using blindly!
					console.log('pokemons[' + i + '].pokemon_id is "' + pokemon.pokemon_id + '"');
					// PokeVision is string for some reason
					var pokemonId = Number(pokemon.pokemon_id);
					console.log('pokemonId is "' + pokemonId + '"');

					// TOOD: no need for .h translation any more!
					var pokemonName = pokemon.pokemon_name;
					console.log('pokemonName is "' + pokemonName + '"');

					var pokemonExpirationTime = pokemon.disappear_time;
					pokemonExpirationTime /= 1000; // new API is in JS ms vs. epoch
					console.log('pokemonExpirationTime is "' + pokemonExpirationTime + '"');

					var pokemonLatitude = pokemon.latitude;
					console.log('pokemonLatitude is "' + pokemonLatitude + '"');
					var pokemonLongitude = pokemon.longitude;
					console.log('pokemonLongitude is "' + pokemonLongitude + '"');

					var pokemonDistance = getDistance(latitude, longitude, pokemonLatitude, pokemonLongitude);		
                    
                    var pokemonUID = pokemon.encounter_id;

                    var pokemonBearing = getBearing(latitude, longitude, pokemonLatitude, pokemonLongitude);


					// fails on iOS!
					// per @katharine:
					// > PebbleKit JS Android is not to spec.
					//allNearbyPokemon.push({i, pokemonId, pokemonExpirationTime, pokemonDistance});

                    var pokemonData = {
							"i": i,
							"pokemonId": pokemonId,
							"pokemonExpirationTime": pokemonExpirationTime,
							"pokemonLatitude": pokemonLatitude,
							"pokemonLongitude": pokemonLongitude,
							"pokemonDistance": pokemonDistance,
							"pokemonBearing": pokemonBearing,
							"pokemonUID": pokemonUID
						};
// 					var pokemonData = {
// 						"i": i, 
// 						"pokemonId": pokemonId, 
// 						"pokemonExpirationTime": pokemonExpirationTime, 
// 						"pokemonDistance": pokemonDistance
// 					};
					allNearbyPokemon.push(pokemonData);

				}

				console.log("allNearbyPokemon: " + JSON.stringify(allNearbyPokemon));

				// sort by distance
				allNearbyPokemon.sort(function(a, b) {
				    return a.pokemonDistance - b.pokemonDistance;
				});

				//get rid of duplicates that have the same UID
					for(var j=0; i<allNearbyPokemon.length-1; j++ ) {
					  if (allNearbyPokemon[j+1] !== undefined && allNearbyPokemon[j].pokemonId == allNearbyPokemon[j+1].pokemonId && allNearbyPokemon[j].pokemonLatitude == allNearbyPokemon[j+1].pokemonLatitude  && allNearbyPokemon[j].pokemonLongitude == allNearbyPokemon[j+1].pokemonLongitude) {
					    console.log("removed pokemon at index " + j);
					    delete allNearbyPokemon[j];
					    //allNearbyPokemon.splice(i, 1);
					  }
					}

					allNearbyPokemon = allNearbyPokemon.filter( function( el ){ return (typeof el !== "undefined"); } );

					// Assemble dictionary using our keys
					var dictionary = {};

					// take closest 9 (or fewer if not available; sentinel indicated by pokemonId == 0)
					var j;
					for (j = 0; j < 9; j++) {

						if (j < allNearbyPokemon.length) {
							dictionary["Pokemon" + (j + 1) + "Id"] = allNearbyPokemon[j].pokemonId;
							dictionary["Pokemon" + (j + 1) + "ExpirationTime"] = allNearbyPokemon[j].pokemonExpirationTime;
							dictionary["Pokemon" + (j + 1) + "Distance"] = allNearbyPokemon[j].pokemonDistance;
							dictionary["Pokemon" + (j + 1) + "Bearing"] = allNearbyPokemon[j].pokemonBearing;
						} else {
							dictionary["Pokemon" + (j + 1) + "Id"] = 0;
							dictionary["Pokemon" + (j + 1) + "ExpirationTime"] = 0;
							dictionary["Pokemon" + (j + 1) + "Distance"] = 0;
							dictionary["Pokemon" + (j + 1) + "Bearing"] = 0;
							break;
						}
					}
					console.log("dictionary: " + JSON.stringify(dictionary));

				// Send to Pebble
				Pebble.sendAppMessage(dictionary,
					function(e) {
						console.log("AppMessage sent to Pebble successfully!");
					},
					function(e) {
						console.log("Error sending AppMessage to Pebble!");
					}
				);
			} else {
				// no pokemon found!
				Pebble.showSimpleNotificationOnPebble("No Pokemon found!", "(" + latitude + ", " + longitude + ")");
			}


		}
	);

}


function geolocationSuccess(pos) {
  console.log('lat= ' + pos.coords.latitude + ' lon= ' + pos.coords.longitude);

  getPokemon(pos.coords.latitude, pos.coords.longitude);
}

function geolocationError(err) {
  console.log('location error (' + err.code + '): ' + err.message);

  // TODO: alert user via watchapp instead
  Pebble.showSimpleNotificationOnPebble("location error", err.message);
}

function updateLocation() {
	var options = {
	  enableHighAccuracy: true,
	  maximumAge: 10000,
	  timeout: 10000
	};

	navigator.geolocation.getCurrentPosition(geolocationSuccess, geolocationError, options);
}

// Listen for when the watchface is opened
Pebble.addEventListener('ready', 
	function(e) {
		console.log('PebbleKit JS ready!');

		updateLocation();
	}
);

// Listen for when an AppMessage is received
Pebble.addEventListener('appmessage',
	function(e) {
		console.log('AppMessage received!');

		updateLocation();
	}                     
);


// based on @mathew's process_distance()
function getDistance(myLatitude, myLongitude, pkmnLatitude, pkmnLongitude) {
	var distance;

	var lat1 = myLatitude, lon1 = myLongitude;
	var lat2 = pkmnLatitude, lon2 = pkmnLongitude;
	
	var dLat = toRadians(lat2-lat1);
	var dLon = toRadians(lon2-lon1);
	
	lat1 = toRadians(lat1);
	lat2 = toRadians(lat2);
	
	var y = Math.sin(dLon) * Math.cos(lat2);
	var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
		
	var a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2) * Math.sin(dLon/2);
	var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
	
	//distance = convert_units(c*3959);
	// numeric (meters) for now since actual data doesn't appear to reach kms
	distance = (c*3959) * 1.60934 * 1000;
	
	console.log("Start Lat: " + lat1);
	console.log("Start Lon: " + lon1);
	console.log("End Lat: " + lat2);
	console.log("End Lon: " + lon2);
	console.log("Distance: " + distance);

	return distance;
}

function getBearing(myLatitude, myLongitude, pkmnLatitude, pkmnLongitude) {
	var bearing;

	var lat1 = myLatitude, lon1 = myLongitude;
	var lat2 = pkmnLatitude, lon2 = pkmnLongitude;

	var dLat = toRadians(lat2-lat1);
	var dLon = toRadians(lon2-lon1);

	lat1 = toRadians(lat1);
	lat2 = toRadians(lat2);

	var y = Math.sin(dLon) * Math.cos(lat2);
	var x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

	bearing = toDegrees(Math.atan2(y,x));
	if(bearing < 0) bearing = 360-Math.abs(bearing);

	console.log("Start Lat: " + lat1);
	console.log("Start Lon: " + lon1);
	console.log("End Lat: " + lat2);
	console.log("End Lon: " + lon2);
	console.log("Bearing: " + bearing);

	return bearing;
}

// TODO: move to own .js or maybe @mathew already has a lib?

function toRadians(degrees) {
	return degrees * Math.PI / 180;
}

function toDegrees(radians) {
	return radians * 180 / Math.PI;
}

function convert_units(old_distance) {
	var new_distance;
	
	old_distance *= 1.60934; //Convert miles to km
	
	if(old_distance < 0.1){
		new_distance = old_distance * 1000.0;
		
		if(new_distance < accuracy){
			new_distance = "< " + (accuracy/10).toFixed(0)*10 + " m";
		}
		else{
			new_distance += "";
			new_distance = new_distance.substring(0, new_distance.indexOf('.') + 2);
			new_distance += " m";
		}
	}
	else{
		new_distance = old_distance + "";
		new_distance = new_distance.substring(0, new_distance.indexOf('.') + 3);
		new_distance += " km";
	}
	//}
	
	if(new_distance.charAt(0) === '.') new_distance = "0" + new_distance;
	
	return new_distance;
}