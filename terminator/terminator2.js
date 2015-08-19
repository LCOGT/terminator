/*
	Earth Terminator Display
	Created by Stuart Lowe (LCOGT)
	(C) LCOGT 2011
*/
function WorldMap(conf) {

	// Variables to check for extra js loading as we can't necessarily trust browsers
	// (I'm looking at you, Chrome) to fire load events in the correct order.
	this.num_js_toload = 0;
	this.num_js_loaded = 0;

	this.clock = new Date();
	this.d2r = Math.PI/180;
	this.r2d = 180/Math.PI;
	this.day = document.getElementById("day");
	this.night = document.getElementById("night");
	
	this.id = "map";
	this.placemarks = (typeof conf.placemarks=="object") ? conf.placemarks : new Array();
	this.fs = 11;
	this.sigma = 6;

	if(typeof conf=="object"){
		if(typeof conf.id=="string") this.id = conf.id;
		if(typeof conf.fontSize=="number") this.fs = conf.fontSize;
	}

	this.ie = (navigator.userAgent.match(/MSIE ([\d.]+)?/)) ? +navigator.userAgent.match(/MSIE ([\d.]+)?/)[1] : false;

	// Construct the map
	this.createMap();

	return this;
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
			if(typeof G_vmlCanvasManager != 'undefined') el = G_vmlCanvasManager.initElement(elcanvas);
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
				if(typeof G_vmlCanvasManager != 'undefined') el = G_vmlCanvasManager.initElement(elcanvas);
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
		if(typeof G_vmlCanvasManager != 'undefined') G_vmlCanvasManager.initElement(elcanvas);
	}

	// Now set up the canvas
	this.canvas = document.getElementById(this.id);
	if(this.canvas && this.canvas.getContext){  
		this.ctx = this.canvas.getContext('2d');
		this.wide = this.canvas.getAttribute("width");
		this.tall = this.canvas.getAttribute("height");
		this.fs = Math.max(11,Math.round(this.tall/40));
		this.ctx.clearRect(0,0,this.wide,this.tall);
		this.ctx.beginPath();
		this.ctx.font = this.fs+"px Helvetica";
		this.ctx.fillStyle = 'rgb(0,0,0)';
		this.ctx.lineWidth = 1.5;
		var loading = 'Loading sky...';
		this.ctx.fillText(loading,(this.width-this.ctx.measureText(loading).width)/2,(this.tall-this.fs)/2)
		this.ctx.fill();
	}

	// Get the position of the Sun
	this.sun = this.sunPos();

	this.d2x = this.wide/360;
	this.d2y = this.tall/180;

	// Draw HTML labels - these won't change so only draw them this once
	var off = jQuery('#'+this.id).offset();
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
		label = ((p.link) ? '<a href="'+p.link+'" target="_parent" style="color:white;text-decoration:none;text-shadow: 0px 0px 4px #000;font-size:'+this.fs+'px;padding:0px 0px 0px '+(this.d*1.5)+'px;">' : '')+p.label+((p.link) ? '</a>' : '');
		jQuery('body').append('<div class="worldmap_label" style="position:absolute;top:'+(off.top+p.y-(this.fs/2))+';left:'+(off.left+p.x-this.d/2)+';width:'+w+';height:'+(this.fs*2)+'px;display:block;font-size:'+this.fs+'px;'+((p.link) ? '' : 'padding:0px 0px 0px '+(this.d*1.5)+'px;')+';z-index:20;">'+label+'</div>');
	}

	// Credit line
	var credit = 'Powered by LCOGT';
	// Float a transparent link on top of the credit text
	if(typeof jQuery != 'undefined') {
		if($('#'+this.id+'_credit').length == 0){
			jQuery('body').append('<div id="'+this.id+'_credit" style="position:absolute;padding:0px;top:'+(off.top+parseInt(this.tall)-5-11)+';left:'+(off.left+5)+';z-index:20;"><a href="http://lcogt.net/network" style="margin:4px;font-size:11px;text-shadow: 0px 0px 4px '+((this.sun.dec < 0) ? 'white':'black')+';color:'+((this.sun.dec < 0) ? 'black':'white')+';text-decoration:none;" title="Created by the Las Cumbres Observatory Global Telescope">'+credit+'</a></div>');
		}
	}

	buffer = document.createElement('canvas');
	buffer.style.display='block';
	buffer.setAttribute('width',this.wide);
	buffer.setAttribute('height',this.tall);
	buffer.setAttribute('id','buffer');
	document.body.appendChild(buffer);
	// For excanvas we need to initialise the newly created <canvas>
	if(typeof G_vmlCanvasManager != 'undefined') G_vmlCanvasManager.initElement(buffer);
	if(typeof jQuery != 'undefined') jQuery('#buffer').hide().css('display','none');

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
		ha = 360*((this.clock.getUTCHours()+(this.clock.getMinutes()/60)+(this.clock.getSeconds()/3600))-12)/24

		//console.log("Time until star drawing:" + (new Date() - this.clock) + "ms");

		dlon = 2;
		var x = new Array();
		var y = new Array();
		
		// Jump 2 degrees in longitude
		for(var lon = -180 ; lon <= 180; lon += 2){
			tlat = Math.atan2(-Math.cos((lon+ha)*this.d2r),Math.tan(this.sun.dec))*this.r2d;
			if(tlat < -90) tlat += 180
			if(tlat > 90) tlat -= 180
			x.push((lon+180)*this.d2x);
			y.push(this.tall-(tlat+90)*this.d2y);	// y is inverted
		}
		//console.log("Calculated terminator points:" + (new Date() - this.clock) + "ms");

		this.ctx.moveTo(0,0);
		this.ctx.clearRect(0,0,this.wide,this.tall);

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

		if(!this.ie){

			buffer = document.getElementById('buffer');
			bx = buffer.getContext('2d');

			bx.drawImage(this.day, 0, 0, this.wide, this.tall);
			try {
				var day = bx.getImageData(0, 0, this.wide, this.tall);
				var dayData = day.data;
			} catch(err) {
			
			}
			bx.drawImage(this.night, 0, 0, this.wide, this.tall);
			try {
				var night = bx.getImageData(0, 0, this.wide, this.tall);
				var nightData = night.data;
			} catch(err) {
			
			}
	
			bx.fillStyle = "white";
			bx.fillRect(0,0,this.wide,this.tall);
			bx.beginPath();
			bx.fillStyle = "black";
			bx.moveTo(0,0);
			bx.lineTo(0,this.tall);
			bx.lineTo(this.wide,this.tall);
			bx.lineTo(this.wide,0);
			bx.lineTo(0,0);
			for(var i = 0; i < x.length ; i++){
				//console.log(i,x[i],y[i])
				if(i == 0) bx.moveTo(x[i], y[i]);
				else bx.lineTo(x[i], y[i]);
			}
			bx.fill();
			bx.closePath();

			//console.log("Drawn terminator:" + (new Date() - this.clock) + "ms");

			var image = bx.getImageData(0, 0, this.wide, this.tall);
			var imageData = image.data; // here we detach the pixels array from DOM
			var image2 = bx.getImageData(0, 0, this.wide, this.tall);
			var image2Data = image2.data; // here we detach the pixels array from DOM
			var npix = this.wide*this.tall;
			var sigmashort = this.sigma/Math.sqrt(2);

			//console.log("Read terminator:" + (new Date() - this.clock) + "ms");

			var changed = new Array();
			// Find places where it changes
			for(var i = 0 ; i < npix ; i++){
				if(i > 0){
					if(imageData[4*i]-imageData[4*(i-1)] != 0){
						ty = Math.floor(i/this.wide)
						tx = i % this.wide
						changed.push({x:tx,y:ty})
					}
				}
			}
			//console.log("Calculated terminator pixels:" + (new Date() - this.clock) + "ms");

			processed = new Array(npix);
			for(var c = 0 ; c < changed.length ; c++){
				for(var py = changed[c].y-this.sigma ; py < changed[c].y+this.sigma ; py++){
					deltay = Math.abs(py-changed[c].y);
					if(py < 0 || py > this.tall) continue;
					for(var px = changed[c].x-this.sigma ; px < changed[c].x+this.sigma ; px++){
						// Can we leave this loop early?
						if(px < 0 || px > this.wide) continue;
						pixel = px + py*this.wide;
						if(processed[pixel]) continue;
						deltax = Math.abs(px-changed[c].x)
						if(deltay > sigmashort && deltax > sigmashort) continue;
						//if(imageData[4*pixel] == 0) continue;
						tot = 0;
						n = 0;
						for(var dy = -this.sigma; dy <= this.sigma ; dy++){
							for(var dx = -this.sigma; dx <= this.sigma ; dx++){
								pix = pixel + dx + dy*this.wide;
								if(pix < 0 || pix > npix) continue;
								tot += imageData[4*pix];
								n++;
							}
						}
						image2Data[4*pixel] = tot/n;
						processed[pixel] = true;
					}
				}
			}
			//console.log("Blurred terminator:" + (new Date() - this.clock) + "ms");

			// Get another copy of the canvas
			var composite = bx.getImageData(0, 0, this.wide, this.tall);
			var compositeData = composite.data;
	
			for(var i = 0 ; i < npix ; i++){
				j = 4*i;
				f = image2Data[j]/255
				mf = 1-f;
				compositeData[j] = nightData[j]*mf + dayData[j+0]*f;
				compositeData[j+1] = nightData[j+1]*mf + dayData[j+1]*f;
				compositeData[j+2] = nightData[j+2]*mf + dayData[j+2]*f;
			}
			composite.data = compositeData;
			this.ctx.putImageData(composite, 0, 0);
			//console.log("Drawn blurred terminator:" + (new Date() - this.clock) + "ms");

		}else{

			// Draw day
			this.ctx.drawImage(this.day, 0, 0, this.wide, this.tall);
			this.ctx.fillStyle = "rgba(0,0,0,0.7)";
			this.ctx.beginPath();
			this.ctx.moveTo(0,0);
			this.ctx.lineTo(0,this.tall);
			this.ctx.lineTo(this.wide,this.tall);
			this.ctx.lineTo(this.wide,0);
			this.ctx.lineTo(0,0);
			for(var i = 0; i < x.length ; i++){
				if(i == 0) this.ctx.moveTo(x[i], y[i]);
				else this.ctx.lineTo(x[i], y[i]);
			}
			this.ctx.fill();
		}

		// Draw markers
		this.ctx.beginPath();
		if(!this.ie){
			this.ctx.shadowOffsetX = 0;
			this.ctx.shadowOffsetY = 0;
			this.ctx.shadowBlur    = 5;
			this.ctx.shadowColor   = 'rgba(0, 0, 0, 1)';
		}
		this.ctx.fillStyle = "rgb(255,255,255)";
		for(var i = 0; i < this.placemarks.length ; i++){
			p = this.placemarks[i];
			if(!p.x){
				p.x = (p.lon+180)*this.d2x;
				p.y = (this.tall-(p.lat+90)*this.d2y);
			}
			this.ctx.fillRect(p.x-this.d/2,p.y-this.d/2,this.d,this.d);
		}
		this.ctx.restore();
		//console.log("Total time:" + (new Date() - this.clock) + "ms");
	}
}
