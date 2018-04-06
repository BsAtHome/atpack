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
/*
 * atpacks.atpack parsed structure:
 * atpack: [
 *	{
 *		family,		// Family name
 *		version,	// String 1.2.3
 *		vmaj,		// Split version (numeric) major
 *		vmin,		// minor
 *		vpnt,		// point
 *		release,	// Latest version release message
 *		devices: [	// Devices array
 *			{
 *				name,		// Device name
 *				description,	// Device's description
 *				atdf,		// Device's atdf XML file (atmel device description)
 *				pic,		// Device's pic XML file (microchip device description)
 				book: [		// Documentation array
 *					{
 *						name,	// HTML link address
 *						title,	// Link description
 *					}
 *				]
 *			},
 *			...
 *		]
 *	}
 *	...
 * }
 */

// This is executed when the page is loaded
// - load all pdsc files
// - update the html to show the loaded files
$.when($.ready).then(function() {
	$("#avrpacks").empty();
	$("#avrpacks").append('<option value="-1">- select a pack -</option>');

	atpacks.atpack = new Array();	// Where we load the pdsc files

	// Load all atpack XML files
	var fetchFiles = function(files) {
		var fetchXml = function(pdsc, n) {
			//console.log(Date.now(), "Request pack ", n, pdsc);
			var jax = $.ajax({
				url: pdsc,
				method: "GET",
				dataType: "xml",
			}).done(function(doc) {
				//console.log(Date.now(), "Loaded read ", n, pdsc);
				var pack = new Object();
				pack.version = "";
				pack.vmaj = 0;
				pack.vmin = 0;
				pack.vpnt = 0;
				pack.devices = new Array();
				pack.name = $("package name", doc).text();
				pack.description = $("package description", doc).text();
				pack.family = $('package family', doc).attr("Dfamily");
				// Find the latest release version
				$("package releases release", doc).each(function(i, item) {
					var ver = item.getAttribute("version");
					var v = ver.match(/(\d+)\.(\d+)\.(\d+)/);
					if(v && +v[1] >= pack.vmaj && +v[2] >= pack.vmin && +v[3] > pack.vpnt) {
						pack.version = ver;
						pack.vmaj = +v[1];
						pack.vmin = +v[2];
						pack.vpnt = +v[3];
						pack.release = $(item).text();
					}
				});
				// Get all devices
				$('package family device', doc).each(function(i, item) {
					var dev = new Object();
					dev.name = item.getAttribute("Dname");
					dev.description = $('description', item).first().text();
					dev.atdf = $('environment[name="atmel"] at\\:extension at\\:atdf', item).attr("name");
					dev.pic = $('environment[name="microchip"] mchp\\:extension mchp\\:pic', item).attr("name");
					dev.book = new Array();
					$('book', item).each(function(j, jtem) {
						var book = new Object();
						book.name = jtem.getAttribute('name');
						book.title = jtem.getAttribute('title');
						dev.book.push(book);
					});
					pack.devices.push(dev);
				});
				atpacks.atpack[n] = pack;

				// Sort the devices list based on the numerical value of the type
				pack.devices.sort(function(a, b) {
					var am = a.name.match(/^(AT90\D*|ATmega|ATtiny|ATxmega|ATA|AT32UCS3.)(\d+)(.*)/);
					var bm = b.name.match(/^(AT90\D*|ATmega|ATtiny|ATxmega|ATA|AT32UCS3.)(\d+)(.*)/);
					if(!am || !bm)
						return a.name.localeCompare(b.name);
					if(am[1] == bm[1]) {
						if(am[2] == bm[2])
							return am[3].localeCompare(bm[3]);
						return +am[2] - bm[2];
					} else
						return am[1].localeCompare(bm[1]);
				});
				//console.log(Date.now(), "Loaded pack ", n, atpacks.atpack[n].name);
			});
			return jax;
		};
		return $.map(files, fetchXml);
	};
	var promises = fetchFiles(atpacks.base);	// Actually get them
	$.when.apply(null, promises).then(function() {	// Now handle the post-load operations
		//console.log(Date.now(), "Loaded all packs");
		$.each(atpacks.atpack, function(i, item) {
			$("#avrpacks").append("<option value=\"" + i + "\">" + i + " - " + item.family + " (" + item.version + ")</option>");
		});

		$("#avrpacks").change(function() {
			selectAtPack($("#avrpacks option:selected").val());
		});
		$("#avrdevices").change(function() {
			selectDevice($("#avrdevices option:selected").val());
		});

		// Trigger a change on the show parts checkboxes to format the following table
		$(".showpart").trigger("change");
	}, function() {
		console.log("Fetching failed", this, arguments);
	});

});

var currentDevice = new Object();	// Ref to atdf, fuses, lockbits, signature and other stuff

function htmlEscape(s)
{
	return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function dirname(path)
{
	var i;
	if(path.length <= 0 || (i = path.lastIndexOf("/")) < 0)
		return "";
	return path.substr(0, i);
}

// When a device change occurs, clean out the previous data
function clearDetails()
{
	$("#device").html("");
	$(".variantsgen").remove();
	$(".memoriesgen").remove();
	$(".booksgen").remove();
	$(".modulesgen").remove();
	$(".canvasdivgen").remove();
	$("#interface").empty();
	$("#fusetable").empty();
	$("#lockbittable").empty();
	currentDevice = new Object();
}

// Top level AtPack selection
function selectAtPack(index)
{
	// Clear the device-list
	$("#avrdevices").empty();
	$("#avrdevices").append('<option value="-1">- select a device -</option>');
	clearDetails();

	// Only do a fill of the device-list if we have a pack
	if(!atpacks.atpack[index]) {
		return;
	}

	$.each(atpacks.atpack[index].devices, function(i, item) {
		var name = item.name
		var desc = htmlEscape(item.description);
		var descs = desc;
		if(descs.length > 100)
			descs = desc.substr(0, 100) + "...";
		$("#avrdevices").append("<option title=\"" + desc + "\" value=\"" + i + "\">" + name + " - " + descs + "</option>");
	});
}

// Count the # of ones in a values
function countBits(val)
{
	var n = 0;
	while(val > 0) {
		if(val & 1)
			n++;
		val >>= 1;
	}
	return n;
}

// Count how far to shift to have bit 0 as a one
function countShifts(val)
{
	var n = 0;
	while(val > 0 && !(val & 1)) {
		val >>= 1;
		n++;
	}
	return n;
}

// Fake mask value based on word-size if none supplied
function getOnes(n)
{
	switch(n) {
	case 1:  return 0xff;
	case 2:  return 0xffff;
	case 3:  return 0xffffff;
	case 4:  return 0xffffffff;
	default: return -1;
	}
}

/*
 * Build an object to describe a module's bit-layout:
 * fuses = {
 *   type,					// Initial type
 *   regorder[],				// offsets with reg's name as content
 *   regs: {
 *   	"EXTENDED": {
 *   		caption,
 *   		offset,
 *   		size,
 *   		hasinitval,			// true if initval is actually defined in source
 *   		initval,
 *		bitfieldmask,			// Mask of bitfields combined
 *   		bitfield: [
 *   			{	caption,	// Description of the bitfield
 *   				mask,		// Bitmask
 *   				nbits,		// calculated # of bits in mask
 *   				nshift,		// calculated from bits in mask
 *   				name,		// Field name
 *   				values		// Value enumeration reference ("ENUM_NAME" or null if none)
 *   			},
 *   			...
 *   		]
 *   	},
 *   	...
 *   },
 *   vals: {
 *   	"ENUM_NAME": [
 *   			{
 *   				caption,	// Description of value
 *   				name,		// Reference name
 *   				value,		// Bitfield value
 *   			},
 *   			...
 *   	],
 *   	...
 *   }
 * }
 */
function buildBitTable(atdf, modname)
{
	// name^ because sometimes it is "FUSE" or "FUSES" and "LOCKBIT" or "LOCKBITS"
	var reggroup = $('peripherals module instance[name^="'+modname+'"] register-group', atdf);
	if(reggroup.length < 1)
		return false;
	var bt = new Array();
	$.each(reggroup, function(i, item) {
		bt.push(buildBitTableInstance(atdf, item));
	});
	return bt;
}

function buildBitTableInstance(atdf, reggroup)
{
	var instname;
	if(reggroup.hasAttribute("name-in-module"))
		instname = reggroup.getAttribute("name-in-module");
	else
		instname = reggroup.getAttribute("name");
	var modname = reggroup.parentNode.parentNode.getAttribute("name");
	var regmod = $('modules module[name="'+modname+'"]', atdf)[0];
	var regs = $('register-group[name="'+instname+'"] register', regmod);
	var vals = $('value-group', regmod);
	var fuses = new Object();
	fuses.name = instname;
	fuses.regs = new Object();
	fuses.vals = new Object();
	fuses.regorder = new Array();
	fuses.type = modname;
	$.each(regs, function(i, item) {
		var fname = item.getAttribute("name");
		fuses.regs[fname] = new Object();
		fuses.regs[fname].caption = item.getAttribute("caption");
		fuses.regs[fname].offset = parseInt(item.getAttribute("offset"));
		fuses.regorder[fuses.regs[fname].offset] = fname;
		fuses.regs[fname].size = parseInt(item.getAttribute("size"));
		fuses.regs[fname].bitfieldmask = -1;
		fuses.regs[fname].bitfield = new Array();
		$('bitfield', item).each(function(j, jtem) {
			var bf = new Object();
			bf.name = jtem.getAttribute("name");
			if(jtem.hasAttribute("caption"))
				bf.caption = jtem.getAttribute("caption");
			else
				bf.caption = bf.name;
			bf.mask = parseInt(jtem.getAttribute("mask"));
			fuses.regs[fname].bitfieldmask ^= bf.mask;
			bf.nbits = countBits(bf.mask);
			bf.nshift = countShifts(bf.mask);
			bf.values = jtem.getAttribute("values");
			fuses.regs[fname].bitfield.push(bf);
		});
		fuses.regs[fname].bitfieldmask ^= -1;
		fuses.regs[fname].hasinitval = item.hasAttribute("initval");
		if(fuses.regs[fname].hasinitval)
			fuses.regs[fname].initval = parseInt(item.getAttribute("initval"));
		else
			fuses.regs[fname].initval = getOnes(fuses.regs[fname].size) & fuses.regs[fname].bitfieldmask;
	});
	$.each(vals, function(i, item) {
		var vname = item.getAttribute("name");
		fuses.vals[vname] = new Array();
		$('value', item).each(function(j, jtem) {
			var vobj = new Object();
			vobj.caption = jtem.getAttribute("caption");
			vobj.name = jtem.getAttribute("name");
			vobj.value = parseInt(jtem.getAttribute("value"));
			fuses.vals[vname].push(vobj);
		});
	});
	return fuses;
}

function formatBits(val, n)
{
	var s = "";
	while(n) {
		s = ((val & 1) ? '1' : '0') + s;
		val >>= 1;
		n--;
	}
	return s;
}

function formatHexByte(val)
{
	if(val < 16)
		return '0' + val.toString(16);
	else
		return val.toString(16);
}

function formatHex(val, size)
{
	if(size < 1)
		size = 1;
	else if(size > 4)
		size = 4;
	var s = '';
	while(size--) {
		s = formatHexByte(val & 0xff) + s;
		val >>= 8;
	}
	return '0x' + s;
}

function changeBitfieldSel(obj, spantag, mask)
{
	var s = $(spantag).first().text();
	var v = parseInt(s);
	v &= ~mask;
	v |= parseInt($("option:selected", obj).first().val());
	$(spantag).text(formatHex(v, (s.length-2)/2));
}

function changeBitfieldChk(obj, spantag, mask)
{
	var s = $(spantag).first().text();
	var v = parseInt(s);
	if(obj.checked)
		v &= ~mask;
	else
		v |= parseInt(obj.getAttribute("value"));
	$(spantag).text(formatHex(v, (s.length-2)/2));
}

function changeShow(obj, tag, show)
{
	$(tag).css('display', obj.checked ? show : 'none');
}

function buildSelect(modregtable, bitfield, initval, spantag)
{
	var s = '<select class="input_'+modregtable.type+'" name="'+bitfield.name+'" onChange="changeBitfieldSel(this,\'#'+spantag+'\','+bitfield.mask+')">';
	var bitfieldmask = (initval & bitfield.mask) >> bitfield.nshift;
	$.each(modregtable.vals[bitfield.values], function(i, item) {
		var bits = formatBits(item.value, bitfield.nbits)
		var sel = item.value == bitfieldmask ? ' selected="1"' : '';
		s += '<option name="'+item.name+'" value="'+(item.value << bitfield.nshift)+'"'+sel+'>'+item.caption+' ['+bits+']</option>';
	});
	return s + '</select>';
}

function buildModuleTable(htmltable, modregtable, caption)
{
	if(caption !== false) {
		$(htmltable).append('<tr><th colspan="2">'+caption+'</th></tr>');
	}
	for(var r = modregtable.regorder.length - 1; r >= 0; r--) {
		var i = modregtable.regorder[r];
		var item = modregtable.regs[modregtable.regorder[r]];
		if(!item)
			continue;	// Some devices lack an offset
		var spantag = "value_" + i;
		var inithex = formatHex(item.initval, item.size);
		var s = '<tr><th class="al" colspan="2">' + i + ' (<small>offset:'+formatHex(item.offset, item.size)+'</small>) ' + item.caption;
		if(0 == item.bitfield.length || (item.bitfield.length == 1 && !modregtable.vals[item.bitfield[0].values] && item.bitfield[0].mask == getOnes(item.size)))
			s += '</th></tr><tr><td colspan="2">(value-field)</td>';
		else {
			s += ' (';
			if(item.hasinitval)
				s += 'default: ' + inithex + ', ';
			s += 'current: <span id="'+spantag+'">'+inithex+'</span>)</th>';
		}
		$(htmltable).append(s + '</tr>');
		$.each(item.bitfield, function(j, jtem) {
			if(jtem.nbits == 1 && !jtem.values) {
				var sel = (item.initval & jtem.mask) == 0 ? ' checked="1"' : '';
				$(htmltable).append('<tr><td>'+jtem.caption+'</td><td><input type="checkbox" class="input_'+modregtable.type+'" onChange="changeBitfieldChk(this,\'#'+spantag+'\','+jtem.mask+')" name="'+jtem.name+'" value="'+jtem.mask+'"'+sel+'/></td></tr>');
			} else if(jtem.values && modregtable.vals[jtem.values]) {
				$(htmltable).append('<tr><td>'+jtem.caption+'</td><td>'+buildSelect(modregtable, jtem, item.initval, spantag)+'</td></tr>');
			} else {
				$(htmltable).append('<tr><td>'+jtem.caption+'</td><td>(value-field, mask:'+formatHex(jtem.mask, item.size)+')</td></tr>');
			}
		});
	}
	$(".input_" + modregtable.type).trigger("change");
}

// When a new device is selected
// - clear the old device data
// - load the new atdf file
// - update the html with the new device's data
function selectDevice(devidx)
{
	clearDetails();
	var apidx = $("#avrpacks option:selected").val();
	var ap = atpacks.atpack[apidx];
	if(apidx < 0 || !ap.devices[devidx])
		return;


	var dev = ap.devices[devidx];
	$("#device").html(dev.name + '<br />' + htmlEscape(dev.description));

	$.each(dev.book, function(i, item) {
		$("#bookshead").parent().append('<tr class="booksgen"><td><a href="'+item.name+'">'+item.title+'</a></td></tr>');
	});

	// Get the device's atdf file and use it
	var pkgs = new Map();
	$.get(dirname(atpacks.base[apidx]) + "/" + dev.atdf, {}, function(atdf) {
		currentDevice.atdf = atdf;
		currentDevice.name = dev.name;

		// Get the (package, temp and Vcc) variants of the device
		var vars = $("variant", atdf);
		$.each(vars, function(i, item) {
			var oc = item.getAttribute("ordercode");
			var pa = item.getAttribute("package");
			pkgs.set(pa, item.getAttribute("pinout"));
			var sm = (item.getAttribute("speedmax") / 1000000) + "&nbsp;MHz";
			var vi = item.getAttribute("vccmin");
			var va = item.getAttribute("vccmax");
			var ti = item.getAttribute("tempmin");
			var ta = item.getAttribute("tempmax");
			$("#variantshead").parent().append('<tr class="variantsgen"><td>'+oc+'</td><td>'+pa+'</td><td class="ar">'+sm+'</td><td class="ar">'+vi+'</td><td class="ar">'+va+'</td><td class="ar">'+ti+'</td><td class="ar">'+ta+'</td></tr>');
		});

		// Get the programming interfaces
		var s = "";
		var ifs = $("interface", atdf);
		$.each(ifs, function(i, item) { s += " " + item.getAttribute("name"); });
		$("#interface").html('<tr><td>Programmer</td><td>'+s+'</td></tr>');

		// Get the device signature(s)
		var sig = $('property-groups property-group[name="SIGNATURES"] property', atdf);
		currentDevice.signature = new Array();
		currentDevice.chipid = new Array();
		currentDevice.jtagid = false;
		$.each(sig, function(i, item) {
			var m;
			var name = item.getAttribute("name");
			var val = item.getAttribute("value");
			if(name == "JTAGID") {
				currentDevice.jtagid = val;
			} else if((m = name.match(/^SIGNATURE(\d*)/))) {
				currentDevice.signature[+m[1]] = val;
			} else if(name.match(/^CHIPID.*/)) {
				var id = new Object();
				id.name = name;
				id.value = val;
				currentDevice.chipid.push(id);
			}
		});
		if(currentDevice.jtagid !== false)
			$("#interface").append('<tr><td>JTAG ID</td><td>'+currentDevice.jtagid+'</td></tr>');
		$.each(currentDevice.signature, function(i, item) {
			$("#interface").append('<tr><td>Signature&nbsp;'+i+'</td><td>'+item+'</td></tr>');
		});
		$.each(currentDevice.chipid, function(i, item) {
			$("#interface").append('<tr><td>'+item.name+'</td><td>'+item.value+'</td></tr>');
		});

		// Get the address space layout
		var mems = $("address-space", atdf);
		$.each(mems, function(i, item) {
			var segs = $("memory-segment", item);
			var t = "";
			var rsp = "";
			if(segs.length > 1) {
				rsp = ' rowspan="'+(segs.length+1)+'"';
				$.each(segs, function(j, jtem) {
					t += '<tr class="memoriesgen">';
					t += '<td class="ar">' + jtem.getAttribute("start") + '</td>';
					t += '<td class="ar">' + jtem.getAttribute("size") + '</td>';
					t += '<td>' + jtem.getAttribute("name") + '</td>';
					t += '</tr>';
				});
			}
			
			var ty = item.getAttribute("name");
			var st = item.getAttribute("start");
			var si = item.getAttribute("size");
			$("#memorieshead").parent().append('<tr class="memoriesgen"><td'+rsp+'>'+ty+'</td><td class="ar">'+st+'</td><td class="ar">'+si+'</td></tr>' + t);
		});

		// Get the modules build into the device
		var mods = $("instance", atdf);
		var lines = new Array();
		$.each(mods, function(i, item) {
			var na = item.getAttribute("name");
			var ca = item.getAttribute("caption");
			if(!ca) ca = "";
			lines.push('<tr class="modulesgen"><td>'+na+'</td><td>'+ca+'</td></tr>');
		});
		lines.sort();
		for(var i = 0; i < lines.length; i++)
			$("#moduleshead").parent().append(lines[i]);

		// Register device fuses and lock-bits in global data
		currentDevice.fuses = buildBitTable(atdf, "FUSE");
		currentDevice.lockbits = buildBitTable(atdf, "LOCKBIT");
		// Build tables
		if(currentDevice.fuses.length) {
			$.each(currentDevice.fuses, function(i, item) {
				buildModuleTable("#fusetable", item, currentDevice.fuses.length > 1 ? item.name : false);
			});
		}
		if(currentDevice.lockbits.length) {
			$.each(currentDevice.lockbits, function(i, item) {
				buildModuleTable("#lockbittable", item, currentDevice.lockbits.length > 1 ? item.name : false);
			});
		}

		// Draw the packages
		drawPkgs(dev.name, pkgs, atdf);
	}, "xml");
}
