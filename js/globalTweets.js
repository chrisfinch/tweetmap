$(function () {
	return new gTweets;
});

var gTweets = function () {
	this.init()
};

gTweets.prototype = {
	init : function () {
		this.initMaps();
		//this.loadTweets();
		this.webSocket();
	},

	initMaps : function () {
		var i = this;
		i.mapOptions = {
			center: new google.maps.LatLng(50.848223,-0.129433),
			zoom: 3,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			styles: [
						{
							featureType: "all",
							stylers: [
								{ saturation: -100 }
							]
						}
					]
		};
		
		// i.styles = {
		//     'Black and White': [{
		//         featureType: "all",
		//         stylers: [{
		//             saturation: -100
		//         }]
		//     }],
		//     'Midnight': [{
		//         featureType: 'all',
		//         stylers: [{
		//             hue: '#0000b0'
		//         }, {
		//             invert_lightness: 'true'
		//         }, {
		//             saturation: -30
		//         }]
		//     }]
		// };

		i.map = new google.maps.Map(document.getElementById('map_canvas'), this.mapOptions);
		
		google.maps.event.addListenerOnce(i.map, "idle", function(){
			for (var s in i.styles) {
				// console.log(i.styles[s], s);
				// var style = new google.maps.StyledMapType(i.styles[s], {name: s});
				// i.map.mapTypes.set('bw', style);
			}		
		});

		i.geoCoder = new google.maps.Geocoder;
		//i.heatMap(); broken
	},

	placeMarker : function (data) {
		var i = this;

		if (typeof data.geo.coordinates.lat == 'function') {
			var myLatlng = data.geo.coordinates;
		} else {
			var myLatlng = new google.maps.LatLng(data.geo.coordinates[0], data.geo.coordinates[1]);
		}

		var marker = new google.maps.Marker({
		position: myLatlng,
		map: i.map,
		title:data.text,
		animation: google.maps.Animation.DROP,
		draggable: false
		});

		marker.setMap(i.map);

		var a = setTimeout(function () {
			marker.setMap(null); // removed
		}, 90000); // 1m30s time out

        var infowindow = new InfoBubble({
			map: i.map,
			content: '<div class="phoneytext">'+data.text+'</div>',
			shadowStyle: 1,
			padding: 0,
			backgroundColor: 'rgb(57,57,57)',
			borderRadius: 4,
			arrowSize: 10,
			borderWidth: 1,
			borderColor: '#2c2c2c',
			disableAutoPan: true,
			hideCloseButton: true,
			arrowPosition: 30,
			backgroundClassName: 'phoney',
			arrowStyle: 2
        });

		google.maps.event.addListener(marker, 'mouseover', function() {
			infowindow.open(i.map,marker);
			google.maps.event.addListener(marker, 'mouseout', function() {
				infowindow.close();
			});
		});
	},

	getGeo : function (data) {
		var i = this;
		i.geoCoder.geocode( { 'address': data.user.location}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				data.geo = {
					'coordinates': results[0].geometry.location
				};
				i.placeMarker(data);
			} else {
				console.log("Geocode was not successful for the following reason: " + status);
			}
		});
	},

	webSocket : function () {
		var i = this;
		i.socket = io.connect(window.location.hostname);
		i.socket.on('geoTweet', function (data) {
			i.placeMarker(data);
			//socket.emit('my other event', { my: 'data' });
		});
		i.socket.on('locTweet', function (data) {
			i.getGeo(data);
			//socket.emit('my other event', { my: 'data' });
		});
	}
}