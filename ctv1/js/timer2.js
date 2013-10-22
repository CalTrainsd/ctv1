/////////////// Timer global Data - Used for logging

/////////////// Cache File IO
function fileErrorHandler(e) {
	  var msg = '';

	  switch (e.code) {
	    case FileError.QUOTA_EXCEEDED_ERR:
	      msg = 'QUOTA_EXCEEDED_ERR';
	      break;
	    case FileError.NOT_FOUND_ERR:
	      msg = 'NOT_FOUND_ERR';
	      break;
	    case FileError.SECURITY_ERR:
	      msg = 'SECURITY_ERR';
	      break;
	    case FileError.INVALID_MODIFICATION_ERR:
	      msg = 'INVALID_MODIFICATION_ERR';
	      break;
	    case FileError.INVALID_STATE_ERR:
	      msg = 'INVALID_STATE_ERR';
	      break;
	    default:
	      msg = 'Unknown Error';
	      break;
		}
	  console.error(msg);
}


///////////////////////
/////////// Class Cache 
//////// config ////////
var cacheURL = "http://cpt.aws.af.cm/cpt/" ;	// on the net
var cacheDir = "cpt" ;						// on the sdcard
var cacheFileSystem ;

function Cache() {
}

Cache.prototype = {

	find: function(fname, callBack) {
if( typeof(device) == 'undefined' || device.platform !== "Android") {
callBack( cacheURL+fname ) ;
//callBack( "file:///storage/sdcard/cpt/"+fname ) ;
//callBack( fname ) ;
return ;	
}
		var that = this;
		that.getFilesystem(
			function(fileSystem) {
//				console.log("gotFS root:"+fileSystem.root.name);
				var fullName = fileSystem.root.fullPath + "\/" + cacheDir +"\/"+ fname ;
				var URL = cacheURL+fname ;
				fileSystem.root.getFile( 
					cacheDir+"\/"+fname,
					{create: false, exclusive: true}, 
					function(fe) {	// found in cache
//						console.log( "found in cache: "+ fe.name ) ;
						callBack( fullName ) ;
						},
					function(er) {	// go get it
//        				console.log("Not in cache: ") ;
						callBack( URL ) ;
						// and go get it
						that.downloadFile( URL, fullName ) ;
						}
					);
				},
			fileErrorHandler 
			);
		},
  
	getFilesystem:function (success, fail) {
		if( cacheFileSystem === undefined ) {
			window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
			window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, 
				function(fs) {
					cacheFileSystem = fs ;
					success(fs) ;
					},
				fileErrorHandler);
		} else
			success( cacheFileSystem ) ;
		},
	
	downloadFile: function (URL, fullName) {
		//TODO: add tmp during download and check stale
		var transfer = new FileTransfer();
		transfer.download(
			encodeURI(URL),
			fullName,
			function(entry) {
				console.log("Cache Downloaded:"+entry.fullPath);
			},
			fileErrorHandler
			);
		}
	
}

//////////////////////////

////////// Class Mp3Cache

function Mp3Cache() {
	this.cache = new Cache() ;
	this.list= new Object();
}
Mp3Cache.prototype.play = function( fname, loop ) {
	var me = this ;
	var s = this.list[fname] ;
	if( s ) {
		s.pause() ;
	}
	this.cache.find( fname,
		function( fn ) {
console.log("mp3play:"+fn);
            var snd = document.createElement('audio');
			snd.id = fname ;
			snd.src = fn ;
			if( loop )
				snd.setAttribute('loop', true );
			snd.addEventListener('ended', function(){ this.src ='';} );
			snd.play() ;
            me.list[fname] = snd ;
		}
	);
	
}

Mp3Cache.prototype.pause = function() {
	for( var p in this.list )
			this.list[p].pause() ;
}
// resume 
Mp3Cache.prototype.resume = function() {
	for( var p in this.list )
			this.list[p].play() ;
}
// stop/trash all mp3
Mp3Cache.prototype.stop = function() {
	this.pause() ;
	this.list = new Object() ;
}

//////////////////////////

//
//	intv - singelton
//
//	see code and HTML for documentation

var intv = {
	timerStart: 0,	// time pop is opened.
	timerStop: 0,	// time popup is closed - that's when the popup closes
	timerId:"",		// routine ID string added by event object
	timerLog: [],	// log strings added by event objects during popup

	
	
	index: 0,
	resetIndex:0,
	events: [],
	defaultEvent: { 
		btnReset:false, btnStop:false, btnStart:false, btnClose:true, 
		msg:"", msgColor:"black", clock: "", clockColor:"black",
		img:""
		}, 
    // mp3 initialize after open
    mp3Cache: {},
	mediaCache: {},

	// ticker
	timer:0,		// the js timer id
	ticks:0,		// the ticks in seconds
	eventTicker:0, 	// next event down ticker (sec)
	clockTicker:0,	// clock display down ticker (sec)
	
	tick: function() {
/*
console.log("ticks:"+intv.ticks);
console.log("ticks:"+intv.ticks+
			",paused"+intv.paused+
			",index:"+intv.index 
			);
*/
		intv.ticks++ ;
		// display clock or not
		if( intv.clockTicker ) {
			$("#intvClock > span").html( (--intv.clockTicker == 0) ? "<br>" : intv.clockTicker ) ;
			}
		// do events
		if( intv.eventTicker ) {
			intv.eventTicker--;
			if( !intv.eventTicker )
				intv.next() ;
			}
		},
	pause: function() {
		intv.paused = 1 ;
		},
	resume: function() {
		intv.paused = 0 ;
		},
	init: function() {
		// set state
		intv.uiPause = 0 ;
		intv.uiResetIndex = 0 ;
		intv.eventTicker = intv.clockTicker = 0 ;
		intv.index = 0 ;
		intv.next() ;
		intv.paused = 0 ;
		intv.ticks = 0 ;
		intv.timer = setInterval( intv.tick, 1000 ) ;
		},
	halt: function() {
		clearInterval( intv.timer ) ;
		},
		
		
	// do the next event in array
	next: function() {
		do {
			intv.event( intv.events[intv.index]) ; 
		} while( ++intv.index < intv.events.length && intv.eventTicker == 0 ) ; // till end of array but not while interval time is ticking
	},
	// do an event object
	event: function( i ) {
		for( key in i ) {
			switch( key ) {
			//interval length
				case "time":
					intv.eventTicker = i.time ;						// time for this interval before next is executed or 0
					break ;
			//display
				case "clock":									// clock put this time on the clock 
					var c = i.clock ;
					if( c != "" )
						{
						intv.clockTicker = c ;
					} else {
						c = "<br>" ;
						intv.clockTicker = 0 ;
					}
					$("#intvClock > span").html( c ) ;
					break ;
				case "clockSize":									// clock size up to 6.0em
					$("#intvClock").css( "font-size", i.clockSize );
					break ;
				case "clockColor":									// clock color
					$("#intvClock").css( "color", i.clockColor );
					break ;
				case "msg":											// msg text message
					$("#intvMsg > span").html( (i.msg=="")?"<br>":i.msg );
					break
				case "msgSize":										// msg size 
					$("#intvMsg").css( "font-size", i.msgSize );
					break ;
				case "msgColor":									// msg color
					$("#intvMsg").css( "color", i.msgColor );
					break
				case "header":										// header text 
					$("#intvHeader").html( i.header ) ;
					break ;
				case "headerColor":									// header color
					$("#intvHeader").css( "color", i.headerColor );
					break
					
			// media
				case "mp3":											// play mp3 file ie "bell" not "bell.mp3"
                    intv.mp3Cache.play( i.mp3+".mp3" ) ;
					break ;
				case "mp3loop":										// play and loop a mp3 file
					intv.mp3Cache.play( i.mp3loop+".mp3", 1 ) ;
					break ;
				case "vid":											// play a video file single video on background
					if( i.vid == "" )								// or blank to hide video
						document.getElementById("intvVid").style.display = "hidden";
					else
						intv.mediaCache.find( i.vid+".mp4", 
							function( fname ) {
								var dom = document.getElementById("intvVid");
								dom.src=fname;
								dom.load();
								dom.play();
							}
						);
					break ;
				case "img":
					if( i.img == "" )
						document.getElementById("intvContent").style.backgroundImage = "none";
					else
						intv.mediaCache.find( i.img, 
							function( fname ) {
								document.getElementById("intvContent").style.backgroundImage = "url('"+fname+"')";
							}
						);
					break ;
			// Data logging
				case "id":
					intv.timerId = i.id ;
					break ;
				case "log":
					var d = new Date() ;
					intv.timerLog.push({log:i.log, time:d.getTime()});
					break ;
			// css + html
				case "css":
					$("#"+i.css.id).css( i.css.attr, i.css.val) ;	// set any css give { id, attr, value }
					break ;
				case "show":										// show and element by id
					$("#"+i.show).show() ;
					break ;
				case "hide":										// show and element by id
					$("#"+i.hide).hide() ;
					break ;
				case "html":										// put text on screen
					$("#"+i.html.id).html( i.html.text ) ;
					break ;
			// flow control
				case "close":										// close the popup
					intv.btnClose() ;
					break ;
				case "reset":										// event to jump to when user hits reset button
					intv.uiResetIndex = intv.index ;
					break;
			// run some javascript
				case "eval":										// run any javascript now
					eval( i.eval ) ;
					break ;
			// buttons - select to show or hide a button. if they show a user can click them
				case "btnReset":
					if( i.btnReset ) {
						$( "#intvReset" ).show() ;
						intv.uiResetIndex = intv.index ;
					} else {
						$( "#intvReset" ).hide() ;
					}
					break ;
				case "btnStop":
					i.btnStop ? $( "#intvStop" ).show() : $( "#intvStop" ).hide() ;
					break ;
				case "btnStart":
					i.btnStart ? $( "#intvStart" ).show() : $( "#intvStart" ).hide() ;
					break ;
				case "btnClose":
					i.btnClose ? $( "#intvClose" ).show() : $( "#intvClose" ).hide() ;
					break ;
			}
		}
	},

/**********		
// media //////////////////

	vidLoad: function( mp4 ) {
//        srcCache( "intvVid", mp4+".mp4", 1 ) ;
//		$("#intvVid").attr("src", mediaCache.find( mp4 + ".mp4")) ;
//		document.getElementById( "intvVid" ).load() ;	
		},
	vidPlay: function( mp4 ) {
		intv.vidLoad( mp4 ) ;
		document.getElementById( "intvVid" ).play() ;	
		$( "#"+mp4 ).show() ;	
		},
	vidPause: function() {
		var vid = document.getElementById( "intvVid" ) ;
		if( vid ) vid.pause() ;	
		},
	vidResume: function() {
		var vid = document.getElementById( "intvVid" );
		if( vid ) vid.play() ;	
		},
	vidRemove: function() {
		var vid = document.getElementById( "intvVid" );
		if( vid ) { 
			vid.pause() ;	
			$("#intvVid").attr("src", "") ;
		}
		},
**********/	
// UI /////////////////////	
	uiPause:0, 			// true if user has it paused
	uiResetIndex:0,	// when user clicks reset, jump to this event in events[]
	btnStop: function() {
		clearInterval( intv.timer ) ;
		intv.mp3Cache.pause() ;
//		document.getElementById("intvVid").pause() ;
		intv.uiPause = 1;
		},
	btnStart: function() {
		if( intv.uiPause ) {
			intv.timer = setInterval( intv.tick, 1000 ) ;
			intv.mp3Cache.resume() ;
//			document.getElementById("intvVid").play() ;
			intv.uiPause = 0 ;
			}
		},
	btnReset: function() {
		if( intv.uiPause ) {
			intv.mp3Cache.resume() ;
//			document.getElementById("intvVid").pause() ;
			intv.uiPause = 0 ;
			}
		clearInterval( intv.timer ) ;
		intv.timer = setInterval( intv.tick, 1000 ) ;
		intv.index = intv.uiResetIndex ;	// tagged reset position in events[]
		intv.next() ;
		},
	btnClose: function() {
//		$( "#intvPopup").popup("close") ;
console.log("back");
		history.back() ;
		},

// pop init and close //////////////////
	pagebeforeshow: function () {
		intv.event( intv.defaultEvent ) ;
		},
	pageshow: function() {
		intvResize() ;

		var d = new Date() ;
		intv.timerStart = intv.timerStop = d.getTime() ;
		intv.timerId = "";
		intv.timerLog = new Array();

		// hookup btn
		$("#intvStop").click( intv.btnStop ) ;
		$("#intvStart").click( intv.btnStart ) ;
		$("#intvReset").click( intv.btnReset ) ;
		$("#intvClose").click( intv.btnClose ) ;
        // mp3
        intv.mp3Cache = new Mp3Cache( ) ;
		intv.mediaCache = new Cache( ) ;
 		// start events
		intv.init() ;
		},
	// stop timer, mp3, vid
	pagehide: function() {
		var d = new Date() ;
		intv.timerStop = d.getTime() ;
		$("#intvPopup").trigger("log");
		
		intv.halt() ;
		intv.mp3Cache.stop() ;

		$("#intvMsg > span").html( "<br>" );
		$("#intvClock > span").html( "<br>" );
		}
};


// ready ///////////////////////////////////////////
function intvResize() {
	var header = $.mobile.activePage.find("div[data-role='header']:visible");
	var footer = $.mobile.activePage.find("div[data-role='footer']:visible");
	var content = $.mobile.activePage.find("div[data-role='content']:visible:visible");
	var viewport_height = $(window).height();
 
	var content_height = viewport_height - header.outerHeight() - footer.outerHeight();
	if((content.outerHeight() - header.outerHeight() - footer.outerHeight()) <= viewport_height) {
		content_height -= (content.outerHeight() - content.height());
	} 
	var content_width = header.outerWidth() ;
	$("#intvMsg").css("width", content_width).css("height", content_height*0.25);
	$("#intvClock").css("width", content_width).css("height", content_height*0.75);
	$('.textfill').textfill({ maxFontPixels: -1 });
console.log("resize");

}

var intvInitCnt = 0 ;
$( document ).on( "pageinit", function() {
	if( intvInitCnt++ == 0 ) {
console.log( "--------page1:pageinit") ;
		$( "#intvPopup").on("pagebeforeshow", intv.pagebeforeshow );
		$( "#intvPopup").on("pageshow", intv.pageshow );
    	$( "#intvPopup").on("pagehide", intv.pagehide );
		
		$( window ).on( "orientationchange", intvResize );		
	}
});
