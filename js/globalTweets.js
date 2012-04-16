$(function () {
	return new gTweets;
});

        // var tweet_list = $("#tweets");  
 
        // function load_tweets() {
        //     $.getJSON("/twitter?nowplaying", function(tweets) {
        //         $.each(tweets.results, function() {
        //             $("<li>").append(this.text, this.location, this.geocode).prependTo(tweet_list);
        //         });
        //     });
        // }  
 
        // // Request tweets every five seconds
        // setInterval(load_tweets, 5000);
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
						// ,
						// {
						// 	featureType: "poi.park",
						// 	stylers: [
						// 		{ hue: "#ff0023" },
						// 		{ saturation: 40 }
						// 	]
						// }
					]
		};

		i.map = new google.maps.Map(document.getElementById('map_canvas'), this.mapOptions);
		i.geoCoder = new google.maps.Geocoder;
		i.heatMap();
	},

	loadTweets : function () {
		var i = this;
		i.tweets = [];

		$.getJSON("/twitter?nowplaying", function(tweets) {
			$.each(tweets.results, function(x, y) {
				
				i.tweets.push({
					text: this.text,
					loc: this.location,
					geo: this.geocode
				});

				console.log(this.text, this.location, this.geocode);

				if (x == tweets.results.length) {
					i.tweetsTomarkers();
				}

			});
		});		
	},

	placeMarker : function (data) {
		var i = this;

			var myLatlng = new google.maps.LatLng(data.geo.coordinates[0], data.geo.coordinates[1]);

			var marker = new google.maps.Marker({
			position: myLatlng,
			map: i.map,
			title:data.text,
			animation: google.maps.Animation.DROP,
			draggable: false
			});

			marker.setMap(i.map);
			i.heatmap.addDataPoint(data.geo.coordinates[0],data.geo.coordinates[1],1);

			var infowindow = new google.maps.InfoWindow({
			    content: data.text
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

      	//console.log(results, results[0].geometry.location.Ya, results[0].geometry.location.Yz);

      	data.geo = {
			'coordinates': [results[0].geometry.location.Ya, results[0].geometry.location.Za]
      	};
      	i.placeMarker(data);
        // map.setCenter(results[0].geometry.location);
        // var marker = new google.maps.Marker({
        //     map: map,
        //     position: results[0].geometry.location
        // });
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
	},

	heatMap : function () {
		var i = this;
		i.heatmap = new HeatmapOverlay(i.map, {"radius":15, "visible":true, "opacity":60});

		google.maps.event.addListenerOnce(i.map, "idle", function(){
			heatmap.setDataSet(testData);
		});
	}
}