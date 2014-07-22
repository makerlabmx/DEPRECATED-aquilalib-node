var manager = require("./deviceManager");
var async = require("async");
var events = require("events");
var util = require("util");

var AquilaDevices = function(devices)
{
	Array.call(this);
	// this = devices;
	for(var d = 0; d < devices.length; d++)
	{
		this.push(devices[d]);
	}
};

util.inherits(AquilaDevices, Array);

//AquilaDevices.prototype.__proto__ = Array.prototype;

// action can be number or action name string
AquilaDevices.prototype.action = function(action, param)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].action(action, param);
	}
};

AquilaDevices.prototype.clearEntries = function(cb)
{
	for(var d = 0; d < this.length; d++)
	{
		// TODO, use async.
		this[d].clearEntries(cb);
	}
};

AquilaDevices.prototype.addEntry = function(entry, cb)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].addEntry(entry, cb);
	}
};

AquilaDevices.prototype.removeEntry = function(entryN, cb)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].removeEntry(entryN, cb);
	}
};

AquilaDevices.prototype.editEntry = function(entryN, entry, cb)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].editEntry(entryN, entry, cb);
	}
};

AquilaDevices.prototype.on = function(event, listener)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].on(event, listener);
	}
};

AquilaDevices.prototype.addListener = function(event, listener)
{
	this.on(event, listener);
};

AquilaDevices.prototype.once = function(event, listener)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].once(event, listener);
	}
};

AquilaDevices.prototype.removeListener = function(event, listener)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].removeListener(event, listener);
	}
};

AquilaDevices.prototype.removeAllListeners = function(event)
{
	for(var d = 0; d < this.length; d++)
	{
		this[d].removeAllListeners(event);
	}
};

var Aquila = function(query)
{
	return new AquilaDevices(manager.getDevice(query));
};

Aquila.manager = manager;

Aquila.update = function(callback)
{
	manager.fetchDevices(callback);
};

Aquila.reload = function(callback)
{
	manager.cleanDevices();
	manager.fetchDevices(callback);
};


/*
	Aquila.manager:
	Events:
		"ready"
		"deviceAdded"
		"deviceRemoved"

	Device:
	Events:
		each event, with name. example: apagador.on("Encendido", fcn);

	*When updating entries, should refresh UI with callback

*/

module.exports = Aquila;