
var _ = require('lodash');
var blittResource = loader.resource('blitt');
var couchConvilleResource = loader.resource('couch_conville');
var glasserGlasserResource = loader.resource('glasser_glasser');
var hoodStacyResource = loader.resource('hood_stacy');
var javitchBlockResource = loader.resource('javitch_block');
var lyonsDoughtyResource = loader.resource('lyons_doughty');
var macholJohannesResource = loader.resource('machol_johannes');
var messerliKramerResource = loader.resource('messerli_kramer');
var mooreLawResource = loader.resource('moore_law');
var nelsonKennardResource = loader.resource('nelson_kennard');
var rasLavrarResource = loader.resource('ras_lavrar');
var scottAssociatesResource = loader.resource('scott_associates');
var selipResource = loader.resource('selip');
var stengerStengerResource = loader.resource('stenger_stenger');
var suttellHammerResource = loader.resource('suttell_hammer');
var tenagliaHuntResource = loader.resource('tenaglia_hunt');
var weltmanWeinbergResource = loader.resource('weltman_weinberg');

var scrapers = {
	'blitt': blittResource,
	'couch_conville': couchConvilleResource,
	'glasser_glasser': glasserGlasserResource,
	'hood_stacy': hoodStacyResource,
	'javitch_block': javitchBlockResource,
	'lyons_doughty': lyonsDoughtyResource,
	'machol_johannes': macholJohannesResource,
	'messerli_kramer': messerliKramerResource,
	'moore_law': mooreLawResource,
	'nelson_kennard': nelsonKennardResource,
	'ras_lavrar': rasLavrarResource,
	'scott_associates': scottAssociatesResource,
	'selip': selipResource,
	'stenger_stenger': stengerStengerResource,
	'suttell_hammer': suttellHammerResource,
	'tenaglia_hunt': tenagliaHuntResource,
	'weltman_weinberg': weltmanWeinbergResource
};

module.exports.run = function(type, body, cb) {
	if(!scrapers[type]) {
		return cb('TYPE_NOT_SUPPORTED');
	}

	// - Chop SSN's to last 4.
	var ssn = _.get(body, 'file.ssn');
	if(ssn && type != 'blitt' && type != 'selip') {
		ssn = _.toString(ssn).substr(-4);
	}

	scrapers[type].run(body, cb);
};
