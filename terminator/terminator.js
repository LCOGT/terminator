/*
	Created by Stuart Lowe (LCOGT)
	(C) LCOGT 2011
*/
function WorldMap(conf) {

	// Variables to check for extra js loading as we can't necessarily trust browsers
	// (I'm looking at you, Chrome) to fire load events in the correct order.
	this.num_js_toload = 0;
	this.num_js_loaded = 0;
	// Voodoo to check if we are in IE and need to use excanvas
	if(/*@cc_on!@*/false){ this.loadJavascript('http://lcogt.net/virtualsky/embed/excanvas.js','head'); }
	// Load jQuery if we don't already have it
	if(typeof jQuery == 'undefined'){ this.loadJavascript('http://lcogt.net/virtualsky/embed/jquery-1.4.2.js','head'); }

	this.clock = new Date();
	this.d2r = Math.PI/180;
	this.r2d = 180/Math.PI;
	this.day = document.getElementById("day");
	this.night = document.getElementById("night");
	
	this.id = "map";
	this.placemarks = new Array();
	this.fs = 11;

	if(typeof conf=="object"){
		if(typeof conf.id=="string") this.id = conf.id;
		if(typeof conf.fontSize=="number") this.fs = conf.fontSize;
	}

	// Capabilities - annoyingly these have to be modified per browser
	this.can = { 'shade' : true, 'clip': true }
	
	// Construct the map
	this.createMap();
}
WorldMap.prototype.loadJavascript = function (jsname,pos) {
	this.num_js_toload++;
	var th = document.getElementsByTagName(pos)[0];
	var s = document.createElement('script');
	s.setAttribute('type','text/javascript');
	s.setAttribute('src',jsname);
	var _obj = this;
	th.appendChild(s);
	if(s.addEventListener) s.addEventListener('load',function(){ _obj.loadedJavascript(); },false);
	else if(s.attachEvent) s.attachEvent('onreadystatechange',function(){ _obj.loadedJavascript(); });
}
WorldMap.prototype.loadedJavascript = function(){ this.num_js_loaded++; }
WorldMap.prototype.loaded = function(){ return (this.num_js_loaded >= this.num_js_toload) ? true : false; }
WorldMap.prototype.createMap = function(){
	// If the browser hasn't yet loaded the extra Javascript we wait for a moment and try again.
	if(!this.loaded()){
		// Have a little wait and try again
		var _obj = this;
		var timer_load = setTimeout(function(){ _obj.createMap(); },100);
		return;
	}
	var el = document.getElementById(this.id);
	
	// If the Javascript function has been passed a width/height
	// those take precedence over the CSS-set values
	if(typeof jQuery != 'undefined'){
		if(this.width > 0) $('#'+this.id).width(this.width);
		if(this.height > 0) $('#'+this.id).height(this.height);
		this.width = $('#'+this.id).width();
		this.height = $('#'+this.id).height();
		this.ua = jQuery.browser;
	}
	if(el!=null){
		if(typeof el=="object" && el.tagName != "CANVAS"){
			// Looks like the element is a container for our <canvas>
			el.setAttribute('id',this.id+'holder');
			this.width = (el.offsetWidth) ? ''+parseInt(el.offsetWidth) : this.width;
			this.height = (el.offsetHeight) ? ''+parseInt(el.offsetHeight) : this.height;
			elcanvas = document.createElement('canvas');
			elcanvas.style.display='block';
			elcanvas.setAttribute('width',this.width);
			elcanvas.setAttribute('height',this.height);
			elcanvas.setAttribute('id',this.id);
			el.appendChild(elcanvas);
			// For excanvas we need to initialise the newly created <canvas>
			if(/*@cc_on!@*/false) el = G_vmlCanvasManager.initElement(elcanvas);
		}else{
			// Define the size of the canvas
			this.width = el.getAttribute('width');
			this.height = el.getAttribute('height');
			// Excanvas doesn't seem to attach itself to the existing
			// <canvas> so we make a new one and replace it.
			if(/*@cc_on!@*/false){
				elcanvas = document.createElement('canvas');
				elcanvas.style.display='block';
				elcanvas.setAttribute('width',this.width);
				elcanvas.setAttribute('height',this.height);
				elcanvas.setAttribute('id',this.id);
				el.parentNode.replaceChild(elcanvas,el);
				if(/*@cc_on!@*/false) el = G_vmlCanvasManager.initElement(elcanvas);
			}
		}
	}else{
		// No appropriate ID or <canvas> exists. So we'll make one.
		elcanvas = document.createElement('canvas');
		elcanvas.style.display='block';
		elcanvas.setAttribute('width',this.width);
		elcanvas.setAttribute('height',this.height);
		elcanvas.setAttribute('id',this.id);
		document.body.appendChild(elcanvas);
		el = elcanvas;
		// For excanvas we need to initialise the newly created <canvas>
		if(/*@cc_on!@*/false) G_vmlCanvasManager.initElement(elcanvas);
	}

	// Now set up the canvas
	this.canvas = document.getElementById(this.id);
	if(this.canvas && this.canvas.getContext){  
		this.ctx = this.canvas.getContext('2d');
		this.wide = this.canvas.getAttribute("width");
		this.tall = this.canvas.getAttribute("height");
		this.ctx.clearRect(0,0,this.wide,this.tall);
		this.ctx.beginPath();
		this.ctx.font = this.fs+"px Helvetica";
		this.ctx.fillStyle = 'rgb(0,0,0)';
		this.ctx.lineWidth = 1.5;
		var loading = 'Loading sky...';
		this.ctx.fillText(loading,(this.width-this.ctx.measureText(loading).width)/2,(this.tall-this.fs)/2)
		this.ctx.fill();
	}

	if(typeof this.ctx.clip!="function") this.can.clip = false;
	if(typeof this.ctx.shadowBlur=="undefined" || typeof this.ctx.shadowOffsetX=="undefined" || typeof this.ctx.shadowOffsetY=="undefined") this.can.shade = false;

	// Get the position of the Sun
	this.sun = this.sunPos();

	this.d2x = this.wide/360;
	this.d2y = this.tall/180;

	// Draw HTML labels - these won't change so only draw them this once
	var off = $('#'+this.id).offset();
	this.d = 5;
	for(var i = 0; i < this.placemarks.length ; i++){
		p = this.placemarks[i];
		if(!p.x){
			p.x = (p.lon+180)*this.d2x;
			p.y = (this.tall-(p.lat+90)*this.d2y);
		}
		this.ctx.fillRect(p.x-this.d/2,p.y-this.d/2,this.d,this.d);
		w = Math.floor(this.wide-p.x)
		if(w > this.fs*p.label.length) w = this.fs*p.label.length;
		label = ((p.link) ? '<a href="'+p.link+'" style="color:white;text-decoration:none;text-shadow: 0px 0px 4px #000;font-size:'+this.fs+'px;padding:0px 0px 0px '+(this.d*1.5)+'px;">' : '')+p.label+((p.link) ? '</a>' : '');
		$('body').append('<div class="worldmap_label" style="position:absolute;top:'+(off.top+p.y-(this.fs/2))+';left:'+(off.left+p.x-this.d/2)+';width:'+w+';height:'+(this.fs*2)+'px;display:block;font-size:'+this.fs+'px;'+((p.link) ? '' : 'padding:0px 0px 0px '+(this.d*1.5)+'px;')+';z-index:20;">'+label+'</div>');
	}

	// Credit line
	var credit = 'Powered by LCOGT';
	// Float a transparent link on top of the credit text
	if(typeof jQuery != 'undefined') {
		if($('#'+this.id+'_credit').length == 0){
			$('body').append('<div id="'+this.id+'_credit" style="position:absolute;padding:0px;top:'+(off.top+parseInt(this.tall)-5-11)+';left:'+(off.left+5)+';z-index:20;"><a href="http://lcogt.net/network" style="margin:4px;font-size:11px;text-shadow: 0px 0px 4px '+((this.sun.dec < 0) ? 'white':'black')+';color:'+((this.sun.dec < 0) ? 'black':'white')+';text-decoration:none;" title="Created by the Las Cumbres Observatory Global Telescope">'+credit+'</a></div>');
		}
	}
	this.draw();
}
WorldMap.prototype.update = function(){
	this.clock = new Date();
	this.sun = this.sunPos();
	this.draw();
}
WorldMap.prototype.getJD = function() {
	// The Julian Date of the Unix Time epoch is 2440587.5
	today = this.clock;
	return ( today.getTime() / 86400000.0 ) + 2440587.5;
}
// Uses algorithm defined in Practical Astronomy (4th ed) by Peter Duffet-Smith and Jonathan Zwart
WorldMap.prototype.sunPos = function(JD){
	if(typeof JD!="number") JD = this.getJD()
	D = (JD-2455196.5);	// Number of days since the epoch of 2010 January 0.0
	// Calculated for epoch 2010.0. If T is the number of Julian centuries since 1900 January 0.5 = (JD-2415020.0)/36525
	eg = 279.557208;	// mean ecliptic longitude in degrees = (279.6966778 + 36000.76892*T + 0.0003025*T*T)%360;
	wg = 283.112438;	// longitude of the Sun at perigee in degrees = 281.2208444 + 1.719175*T + 0.000452778*T*T;
	e = 0.016705;	// eccentricity of the Sun-Earth orbit in degrees = 0.01675104 - 0.0000418*T - 0.000000126*T*T;
	N = ((360/365.242191)*D)%360;
	if(N < 0) N += 360;
	Mo = (N + eg - wg)%360	// mean anomaly in degrees
	if(Mo < 0) Mo += 360;
	v = Mo + (360/Math.PI)*e*Math.sin(Mo*this.d2r);
	lon = v + wg;
	if(lon > 360) lon -= 360;
	lat = 0;
	T = D/(100*365.25);
	obliquity = 23+(26/60)+(21.45/3600) - (46.815/3600)*T - (0.0006/3600)*T*T + (0.00181/3600)*T*T*T;
	sobl = Math.sin(obliquity*this.d2r);
	slon = Math.sin(lon*this.d2r);
	ra = Math.atan2(slon*sobl,Math.cos(lon*this.d2r));
	dec = Math.asin(sobl*slon);
	return {lat:lat,lon:lon,Mo:Mo,D:D,N:N,v:v,ra:ra,dec:dec};
}

WorldMap.prototype.draw = function() {
	if(this.canvas && this.canvas.getContext){
		var x = new Array();
		var y = new Array();
		ha = 360*((this.clock.getUTCHours()+(this.clock.getMinutes()/60)+(this.clock.getSeconds()/3600))-12)/24

		// Jump 2 degrees in longitude
		for(var lon = -180 ; lon <= 180; lon += 2){
			tlat = Math.atan2(-Math.cos((lon+ha)*map.d2r),Math.tan(this.sun.dec))*map.r2d;
			if(tlat < -90) tlat += 180
			if(tlat > 90) tlat -= 180
			x.push((lon+180)*this.d2x);
			y.push(this.tall-(tlat+90)*this.d2y);	// y is inverted
		}
		if(this.sun.dec < 0){
			x.push(this.wide);
			y.push(this.tall);
			x.push(0);
			y.push(this.tall);
		}else if(this.sun.dec > 0){
			x.push(this.wide);
			y.push(0);
			x.push(0);
			y.push(0);
		}

		this.ctx.moveTo(0,0);
		this.ctx.clearRect(0,0,this.wide,this.tall);

		// Draw day
		this.ctx.drawImage(this.day, 0, 0, this.wide, this.tall);

		if(this.can.shade){
			// Draw shadow for daytime side of terminator
			this.ctx.beginPath();
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.ctx.shadowBlur    = 30;
			this.ctx.shadowColor   = 'rgb(0, 0, 0)';
			this.ctx.fillStyle = "rgb(0,0,0)";
			this.ctx.lineWidth = 0.1;
			// Here we do an anti-clockwise outer shape
			this.ctx.moveTo(0,0);
			this.ctx.lineTo(0,this.tall);
			this.ctx.lineTo(this.wide,this.tall);
			this.ctx.lineTo(this.wide,0);
			this.ctx.lineTo(0,0);
			// ... followed by a clockwise inner one
			for(var i = 0; i < x.length ; i++){
				if(i == 0) this.ctx.moveTo(x[i], y[i]);
				else this.ctx.lineTo(x[i], y[i]);
			}
			this.ctx.fill();
		}

		this.ctx.save();

		if(this.can.clip){
			// Draw clipped night
			this.ctx.beginPath();
			this.ctx.fillStyle = "rgba(0,0,0,1)";
			this.ctx.moveTo(0,0);
			this.ctx.lineTo(0,this.tall);
			this.ctx.lineTo(this.wide,this.tall);
			this.ctx.lineTo(this.wide,0);
			this.ctx.lineTo(0,0);
			for(var i = 0; i < x.length ; i++){
				if(i == 0) this.ctx.moveTo(x[i], y[i]);
				else this.ctx.lineTo(x[i], y[i]);
			}
			this.ctx.clip();
			this.ctx.drawImage(this.night, 0, 0, this.wide, this.tall);
		}

		if(this.can.shade){
			// Draw shadow for night side of terminator
			this.ctx.beginPath();
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.ctx.shadowBlur    = 5;
			this.ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
			for(var i = 0; i < x.length ; i++){
				if(i == 0) this.ctx.moveTo(x[i], y[i]);
				else this.ctx.lineTo(x[i], y[i]);
			}
			this.ctx.fill();
		}

		this.ctx.restore();

		// Draw markers
		this.ctx.beginPath();
		this.ctx.shadowOffsetX = 0;
		this.ctx.shadowOffsetY = 0;
		this.ctx.shadowBlur    = 5;
		this.ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
		this.ctx.fillStyle = "rgb(255,255,255)";
		for(var i = 0; i < this.placemarks.length ; i++){
			p = this.placemarks[i];
			if(!p.x){
				p.x = (p.lon+180)*this.d2x;
				p.y = (this.tall-(p.lat+90)*this.d2y);
			}
			this.ctx.fillRect(p.x-this.d/2,p.y-this.d/2,this.d,this.d);
		}
	}
}