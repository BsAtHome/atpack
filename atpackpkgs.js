/*
 * AtPack visualizer for Atmel (Microchip) MCU
 * Copyright (C) 2018 B. Stultiens
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Affero General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Affero General Public License for more details.
 *
 * You should have received a copy of the GNU Affero General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */
function pinColor(name)
{
	if(name)
		name = name.replace(/(.*)\d+/, "$1");
	switch(name) {
	case 'VDD':
	case 'VDDIO':
	case 'VDDCORE':
	case 'VCC':	return "#ff0000";
	case 'VBUS':
	case 'UCAP':
	case 'UVCC':	return "#c02020";
	case 'VDDANA':
	case 'AVDD':
	case 'AVCC':	return "#ff2000";
	case 'AREF':	return "#ff4010";
	case 'GNDANA':
	case 'AGND':
	case 'GND':	return "#000000";
	case 'UGND':	return "#202020";
	case 'DNC':
	case 'NC':	return "#808080";
	case 'XTAL':	return "#808000";
	case 'RESET_N':
	case 'RESET':	return "#ff2080";
	case 'ADC':	return "#20c0c0";
	case 'DP':
	case 'DM':
	case 'D+':
	case 'D-':	return "#20c020";
	case 'PDI':
	case 'UPDI':	return "#2020ff";
	default:	return "white";
	}
}

// Draw pins on left side of package
function drawPinsL(ctx, x, y, n, inc, pinnumstart, pinnummargin, pinout, font, nextPin)
{
	ctx.save();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	for(var i = 0; i < n; i++) {
		var pinnum = pinnumstart + i;
		var hh = y + nextPin(i) * inc;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x-inc, hh, inc, inc);
		ctx.fillStyle = pinColor(pinout[pinnum]);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		ctx.font = "" + inc*1.6 + "px " + font;
		ctx.fillText(""+pinnum, x+pinnummargin, hh+inc/2);
		ctx.save();
		ctx.font = "" + inc*2 + "px " + font;
		ctx.textAlign = "right";
		ctx.fillText(pinout[pinnum], x-inc-pinnummargin, hh+inc/2);
		ctx.restore();
	}
	ctx.restore();
}

// Draw pins on bottom side of package
function drawPinsB(ctx, x, y, n, inc, pinnumstart, pinnummargin, pinout, font, nextPin)
{
	ctx.save();
	ctx.textAlign = "left";
	ctx.textBaseline = "middle";
	for(var i = 0; i < n; i++) {
		var pinnum = pinnumstart + i;
		var hh = x + nextPin(i) * inc;
		ctx.save();
		ctx.beginPath();
		ctx.rect(hh, y, inc, inc);
		ctx.fillStyle = pinColor(pinout[pinnum]);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		ctx.save();
		ctx.translate(hh+inc/2, y - pinnummargin)
		ctx.rotate(-Math.PI/2);
		ctx.font = "" + inc*1.6 + "px " + font;
		ctx.fillText(""+pinnum, 0, 0);
		ctx.restore();
		ctx.save();
		ctx.font = "" + inc*2 + "px " + font;
		ctx.textAlign = "right";
		ctx.translate(hh+inc/2, y+inc+pinnummargin)
		ctx.rotate(-Math.PI/2);
		ctx.fillText(pinout[pinnum], 0, 0);
		ctx.restore();
	}
	ctx.restore();
}

// Draw pins on right side of package
function drawPinsR(ctx, x, y, n, inc, pinnumstart, pinnummargin, pinout, font, nextPin)
{
	ctx.save();
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	for(var i = 0; i < n; i++) {
		var pinnum = pinnumstart + i;
		var hh = (y - inc) - nextPin(i) * inc;
		ctx.save();
		ctx.beginPath();
		ctx.rect(x, hh, inc, inc);
		ctx.fillStyle = pinColor(pinout[pinnum]);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		ctx.font = "" + inc*1.6 + "px " + font;
		ctx.fillText(""+pinnum, x-2*pinnummargin, hh+inc/2);
		ctx.save();
		ctx.font = "" + inc*2 + "px " + font;
		ctx.textAlign = "left";
		ctx.fillText(pinout[pinnum], x+inc+pinnummargin, hh+inc/2);
		ctx.restore();
	}
	ctx.restore();
}

// Draw pins on top side of package
function drawPinsT(ctx, x, y, n, inc, pinnumstart, pinnummargin, pinout, font, nextPin)
{
	ctx.save();
	ctx.textAlign = "right";
	ctx.textBaseline = "middle";
	for(var i = 0; i < n; i++) {
		var pinnum = pinnumstart + i;
		var hh = (x-inc) - nextPin(i) * inc;
		ctx.save();
		ctx.beginPath();
		ctx.rect(hh, y-inc, inc, inc);
		ctx.fillStyle = pinColor(pinout[pinnum]);
		ctx.fill();
		ctx.stroke();
		ctx.restore();
		var px = hh+inc/2;
		var py = y + 2*pinnummargin;
		ctx.save();
		ctx.translate(px, py)
		ctx.rotate(-Math.PI/2);
		ctx.font = "" + inc*1.6 + "px " + font;
		ctx.fillText(""+pinnum, 0, 0);
		ctx.restore();
		ctx.save();
		ctx.font = "" + inc*2 + "px " + font;
		ctx.textAlign = "left";
		ctx.translate(px, py-inc-3*pinnummargin)
		ctx.rotate(-Math.PI/2);
		ctx.fillText(pinout[pinnum], 0, 0);
		ctx.restore();
	}
	ctx.restore();
}

// Pin offsets are different for four-side pins or 2-side pins packages
function nextPinXFN(i)
{
	return 2*i+3;
}

function nextPinDIL(i)
{
	return 2*i+1;
}

// Draw the package box outline and center text (device name and package name)
function drawPkgBox(ctx, x, y, w, h, inc, name, pkg, n, font, marktop)
{
	ctx.save();
	ctx.beginPath();
	ctx.fillStyle = "black";
	if(marktop) {
		ctx.moveTo(x+w/2-inc, y);
		ctx.arcTo(x+w/2-inc, y+inc, x+w/2, y+inc, inc);
		ctx.arcTo(x+w/2+inc, y+inc, x+w/2+inc, y, inc);
	} else {
		ctx.moveTo(x, y);
		ctx.lineTo(x+2.5*inc, y);
		ctx.lineTo(x, y+2.5*inc);
	}
	ctx.closePath();
	ctx.fill();
	ctx.rect(x, y, w, h);
	ctx.stroke();
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";
	ctx.save();
	ctx.font = "10px " + font;
	var pw = ctx.measureText(pkg).width;
	var nw = ctx.measureText(name).width;
	if(pw < nw)
		pw = nw;
	pw = 250.0 / pw;
	ctx.font = "" + pw + "px " + font;
	ctx.fillText(pkg + n, x+w/2, y+h/2-pw/1.5);
	ctx.fillText(name, x+w/2, y+h/2+pw/1.5);
	ctx.restore();
	ctx.restore();
}

// Draw a specific package
function drawPkg(devname, pkg, num, cls, pinout)
{
	num = +num;
	var cvs = $(cls)[0];
	if(!cvs)
		return;

	if(pinout.length == 0) {
		// No pinout supplied in atdf --> just set to a value
		for(var i = 1; i <= num; i++)
			pinout[i] = "pin-" + i;
	} else {
		// Check if there are undefined pads --> set to DNC
		for(var i = 1; i <= num; i++) {
			if(!pinout[i])
				pinout[i] = "DNC";
		}
	}

	var ctx = cvs.getContext("2d");
	var ww = cvs.width > cvs.height ? cvs.height : cvs.width;

	var font = "sans-serif";
	var pinnummargin = 0.5;
	var fontbase = 64 * 2.25;
	var inc = 50 / (2*num/4 + 5);

	ctx.lineWidth = 0.25;
	ctx.lineCap="round";
	ctx.lineJoin="round";
	ctx.font = "" + fontbase / num + "px " + font;
	// FIXME: we should draw 0,0 centered and then move accordingly to the
	// center of the canvas. Also, a two-pass is required for optimal
	// scaling; especially if we want the pin descriptions to include
	// module mappings.
	// Therefore, the following scaling and translation is a Bad Hack. But
	// it will do for now ;-)
	if(num < 20) {
		ctx.translate(cvs.width/4, 0);
		ctx.scale(ww/200.0, ww/200.0);
	}
	else
		ctx.scale(ww/100.0, ww/100.0);
	var boffs = 0;
	var twoside = false;

	switch(pkg) {
	case "PDIP":
	case "SOIC":
	case "TSSOP":
	case "UDFN":
	case "SOT23":
		twoside = true;
		inc = 80 / (2*num/2 + 1);
		break;

	case 'MLF':
		if(num == 10) {
			twoside = true;
			inc = 50 / (2*num/2 + 1);
		}
		/* Fall-through */
	case 'QFN':
		boffs = inc;
		ctx.save();
		ctx.fillStyle = "#f0f0f0";
		ctx.fillRect(35, 35, 30, 30);
		ctx.stroke();
		ctx.restore();
		break;

	case 'VQFN':
		boffs = inc/2;
		ctx.save();
		ctx.fillStyle = "#f0f0f0";
		ctx.fillRect(35, 35, 30, 30);
		ctx.stroke();
		ctx.restore();
		break;
	}

	switch(pkg) {
	case 'QFN':
	case 'MLF':
	case 'VQFN':
	case 'TQFP':
	case 'LQFP':
		drawPkgBox(ctx, 25-boffs, 25-boffs, 50+2*boffs, 50+2*boffs, inc, devname, pkg, num, font, false);
		if(twoside) {
			drawPinsL(ctx, 25, 25, num/2, inc, 1, pinnummargin, pinout, font, nextPinDIL);
			drawPinsR(ctx, 75, 75, num/2, inc, 1+num/2, pinnummargin, pinout, font, nextPinDIL);
		} else {
			drawPinsL(ctx, 25, 25, num/4, inc, 1, pinnummargin, pinout, font, nextPinXFN);
			drawPinsB(ctx, 25, 75, num/4, inc, 1+num/4, pinnummargin, pinout, font, nextPinXFN);
			drawPinsR(ctx, 75, 75, num/4, inc, 1+num/2, pinnummargin, pinout, font, nextPinXFN);
			drawPinsT(ctx, 75, 25, num/4, inc, 1+num*3/4, pinnummargin, pinout, font, nextPinXFN);
		}
		break;

	case "PDIP":
	case "SOIC":
	case "TSSOP":
	case "UDFN":
	case "SOT23":
		drawPkgBox(ctx, 25, 10, 50, 80, inc, devname, pkg, num, font, true);
		if(twoside) {
			drawPinsL(ctx, 25, 10, num/2, inc, 1, pinnummargin, pinout, font, nextPinDIL);
			drawPinsR(ctx, 75, 90, num/2, inc, 1+num/2, pinnummargin, pinout, font, nextPinDIL);
		}
		break;
	default:
		ctx.textAlign = "center";
		ctx.textBaseline = "middle";
		ctx.font = "5px " + font;
		ctx.fillText("Can't draw " + pkg + num, 50, 50);
		break;
	}
	ctx.stroke();
}

// These packages we know how to draw
function pkgCanDraw(pkg)
{
	switch(pkg) {
	case 'TQFP':
	case 'LQFP':
	case 'QFN':
	case 'VQFN':
	case 'MLF':
	case 'PDIP':
	case 'SOIC':
	case 'TSSOP':
	case 'UDFN':
	case 'SOT23':
		return true;
	}
	return false;
}

// Top-level draw function
// - for all package types for this device
//   * if we can draw it, do draw it on a canvas
function drawPkgs(devname, pkgmap, atdf)
{
	for(var k of pkgmap.keys()) {
		if(!k) continue;
		var v = pkgmap.get(k);
		var cls = k + "gen";
		var pkg;
		var num;
		if(k.match(/^SOT23-/)) {
			pkg = k.replace(/([^-]+).*/, "$1");
			num = k.replace(/[^-]*-(\d+)/, "$1");
		} else {
			pkg = k.replace(/(\D+).*/, "$1");
			num = k.replace(/\D*(\d+).*/, "$1");
		}
		if(pkgCanDraw(pkg)) {
			$("#canvas").append('<div class="canvasdivgen"><canvas id="'+ cls +'" width="800" height="700"></canvas></div>');
			var pinout = [];
			$('pinout[name="'+v+'"]', atdf).children().each(function(i, item) {
				pinout[item.getAttribute("position")] = item.getAttribute("pad");
			});
			drawPkg(devname, pkg, num, "#" + cls, pinout);
		}
	}
}
