/*
* gTweets class for recieveing node.js server data, placing on a map and associated functions
*
* Dependancies: Google maps API v3 (https://developers.google.com/maps/documentation/javascript/)  
*				Socket.IO (Websocket normalization, http://socket.io/)
*				InfoBox (google maps InfoWindow extender for styling, http://google-maps-utility-library-v3.googlecode.com/svn/trunk/infobox/docs/reference.html)
*
* Fully validated with JSLint (Implied Globals 'google', 'InfoBubble' and 'io' notwithstanding)
*
* Author: Chris Finch
* Date: April, 2012
*/

$(function () {
	return new gTweets();
});

var gTweets = function () {
	this.sideBar = $('#tweets');
	this.termForm = $('#termForm');
	this.statsBox = $('#stats');
	this.timeOut = 90000;
	this.stats = {
		totalTweetsCo: 0,
		totalTweetsLoc: 0,		
		goodGeo: 0,
		badGeo: 0
	}
	this.init();
};

gTweets.prototype = {
	
	/*
	* Initialize gTweets class
	*/
	init : function () {
		this.initMaps();
		this.webSocket();
		this.manageSidebar();
		this.manageSearchTerm();
		this.statsCounter();
		this.messageBox('Now mapping "#nowplaying".');
	},

	/*
	* Create an instance of Google Maps
	*/
	initMaps : function () {
		this.mapOptions = {
			center: new google.maps.LatLng(50.848223,-0.129433),
			zoom: 3,
			mapTypeId: google.maps.MapTypeId.ROADMAP,
			styles: [ // Monochrome map
						{
							featureType: "all",
							stylers: [
								{ saturation: -100 }
							]
						}
					]
		};
		this.map = new google.maps.Map(document.getElementById('map_canvas'), this.mapOptions); // Init map
		this.geoCoder = new google.maps.Geocoder(); // Initialize the geocoder for later use
	},

	/*
	* Takes twitter data and places a marker and attached info box on the map
	*/
	placeMarker : function (data) {
		var i = this,
			myLatlng;
		if (typeof data.geo.coordinates.lat == 'function') { // Are we dealing with a geocoded tweet or one direct from twitter?
			myLatlng = data.geo.coordinates;
		} else {
			myLatlng = new google.maps.LatLng(data.geo.coordinates[0], data.geo.coordinates[1]);
		}

		var image = new google.maps.MarkerImage( // Center bottom point of image denotes tweet location
			data.user.profile_image_url,
			new google.maps.Size(32, 32),
			new google.maps.Point(0,0),
			new google.maps.Point(16, 32)
		);

		// I took a stab at making a better icon for the map - too involved for the scope of this project though
		var shadow = new google.maps.MarkerImage("img/shadow.png",
			new google.maps.Size(49.0, 32.0),
			new google.maps.Point(0, 0),
			new google.maps.Point(16.0, 32.0)
		);

		var marker = new google.maps.Marker({
			position: myLatlng,
			icon: image,
			shadow: shadow,
			map: i.map,
			title:data.text.replace(/(\r\n|\n|\r)/gm,""),
			animation: google.maps.Animation.DROP,
			draggable: false
		});

		marker.setMap(i.map); // Add to map!

		setTimeout(function () { // Remove markers after 90 seconds to prevent the map becoming clogged up
			marker.setMap(null);
		}, i.timeOut);

        var infowindow = new InfoBubble({ // Adds the info windows with the tweet text
			map: i.map,
			content: '<div class="infotext">'+data.text.replace(/(\r\n|\n|\r)/gm,"")+'</div>',
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
			backgroundClassName: 'info',
			arrowStyle: 2
        });

		google.maps.event.addListener(marker, 'mouseover', function() {
			infowindow.open(i.map,marker);
			setTimeout(function () { // Timeout for removal of infowindows on ios (No 'hover' event)
				try {
					infowindow.close();					
				} catch (ex) {
					// ignore
				}
			}, 7000);
			google.maps.event.addListener(marker, 'mouseout', function() {
				infowindow.close();
			});
		});

		i.logTweet(data); // Only log tweets that actually make it to the map..
	},

	/*
	* Geocodes a tweet location using the gMaps API geocoding service.
	*/
	getGeo : function (data) {
		var i = this;
		i.geoCoder.geocode( { 'address': data.user.location}, function(results, status) {
			if (status == google.maps.GeocoderStatus.OK) {
				data.geo = {
					'coordinates': results[0].geometry.location
				};
				i.placeMarker(data);
				i.stats.goodGeo++;
			} else {
				/*
				* The google geocoding service has a query limit that is often reached when dealing with the vlume of requests from live tweet stream
				* Unfortunately there is no easy way round this that I could find within the scope of this project..
				*/
				i.stats.badGeo++;
				// console.log("Geocode was not successful for the following reason: " + status);
			}
		});
	},

	/*
	* Using Socket.io - connects with the node server and recieves tweet events from the stream
	*/
	webSocket : function () {
		var i = this;
		i.socket = io.connect(window.location.hostname);
		i.socket.on('geoTweet', function (data) {
			i.placeMarker(data);
			i.stats.totalTweetsCo++;
		});
		i.socket.on('locTweet', function (data) {
			i.getGeo(data);
			i.stats.totalTweetsLoc++;			
		});
	},

	/*
	* Creates a tweet element on the fly for display on the tweets list
	*/
	logTweet : function (data) {
		var i = this;
		var tweet = $('<li />').addClass('tweet');
		var html = [];

		// date
		var date = new Date(data.created_at);
		var dateText = date.getHours()+':'+date.getMinutes()+':'+date.getSeconds();

		html.push('<div class="icon"><img src="'+data.user.profile_image_url+'" width="48" height="48" /></div>');
		html.push('<div class="title"><a href="http://twitter.com/'+data.user.screen_name+'" target="_blank" class="name">'+data.user.name+'</a>');
		html.push('<span class="from"> - '+data.user.location+'</span></div>');
		html.push('<span class="date">'+dateText+'</span>');
		html.push('<span class="text">'+data.text+'</span>');
		
		i.displayTweets(tweet.html(html.join('')));		
	},

	/*
	* Displays tweets on the list, this function need re-working as often tweets appear to quickly for the list to keep up,
	* again, outside the scope of this short project
	*/
	displayTweets : function (tweet) {
		var i = this;
		var sbHeight = i.sideBar.innerHeight();
		var twtHeight = i.sideBar.find('.tweet').first().outerHeight(true);
		var numTwt = i.sideBar.find('.tweet').length;
		
		if ((twtHeight*(numTwt-3)) > sbHeight) {
			i.sideBar.find('.tweet').first().slideUp(200, function () {
				$(this).remove();
			});
			tweet.hide().appendTo(i.sideBar.find('#tweetsList')).slideDown(200);
		} else {
			tweet.hide().appendTo(i.sideBar.find('#tweetsList')).slideDown(200);
		}
	},

	/*
	* Allows the sidebar to be shown and hidden, accessability for devices with smaller screen resolutions
	*/
	manageSidebar : function () {
		var i = this;
		i.sideBar.find('#handle').on('click', function (event) {
			if (i.sideBar.hasClass('open')) {
				i.sideBar.css('right', '-'+i.sideBar.width()+'px').removeClass('open').find('#handle').html('&laquo; Show Feed');
			} else {
				i.sideBar.css('right', 0).addClass('open').find('#handle').html('Hide Feed &raquo;');
			}
		});
	},

	/*
	* Allows the search term to be changed by emitting a socket.IO event back to the server
	*/
	manageSearchTerm : function () {
		var i = this,
			field = i.termForm.find('#searchTerm'),
			active = false;
		i.termForm.find('#submit').on('click', function (event) {
			event.preventDefault();
			if (typeof i.socket != 'undefined' && !active) {
				active = true;
				try {
					i.socket.emit('changeSearch', { term: field.val() });
					if (typeof field.data('val') == 'undefined' || field.val() != field.data('val')) {
						field.data('val', field.val());
					}
					i.messageBox('Now mapping "'+field.val()+'".');
				} catch (ex) {
					console.log('Socket.io exception: '+ex);
				}
				setTimeout(function () { // Normalize input to prevent stream being broken
					active = false;
				}, 3000);
			}
		});
		field.on('focus', function () { // Clear field if contents hasn't changed
			if (field.val() == field.data('val')) {
				field.val('');
			}
			field.on('blur', function () {
				if (field.val() == field.data('val') || field.val() === '') {
					field.val(field.data('val'));
				}				
			});
		});
	},

	/*
	* Display a feedback message box so the user knows the search term has been accepted.
	*/
	messageBox : function (message) {
		var	box = $('<div />').attr('id', 'popup');
		box.html(message).css({
			'top':'60%',
			'opacity': 0
		}).appendTo('body').animate({
			'top': '50%',
			'opacity': 1
		}, 400, function () {
			setTimeout(function () {
				box.fadeOut(400, function () {
					box.remove();
				});
			}, 3000);
		});
	},
	
	/*
	* Display a few system stats, could be improved by adding ability to reset stats
	*/
	statsCounter : function () {
		var	i = this,
			html = [],
			sec = 0,
			tSec = 0;
		html.push('<span class="stat total">Total Tweets processed: <span class="num"></span></span>');
		html.push('<span class="stat goodgeo">Successful Geocoder requests: <span class="num"></span></span>');		
		html.push('<span class="stat badgeo">Unsuccessful Geocoder requests: <span class="num"></span></span>');				
		html.push('<span class="stat av">Average tweets/second: <span class="num"></span></span>');
		i.statsBox.html(html.join(''));
		function update () {
			sec++;
			i.statsBox.find('.total .num').html(i.stats.totalTweetsLoc+i.stats.totalTweetsCo);
			i.statsBox.find('.goodgeo .num').html(i.stats.goodGeo);
			i.statsBox.find('.badgeo .num').html(i.stats.badGeo);
			if (sec == 10) {
				sec = 0;
				tSec++;
				var av = 
				i.statsBox.find('.av .num').html(Math.round(((i.stats.totalTweetsLoc+i.stats.totalTweetsCo)/tSec)*100)/100);
			}
		}
		setInterval(update, 100);
	}
};