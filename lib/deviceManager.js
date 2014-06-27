var Protocol = require("./protocol");
var addressParser = require("./addressParser");
var Device = require("./device");
var events = require("events");
var async = require("async");
var buffertools = require("buffertools");

/*
	Events:
		"ready"
		"deviceAdded"
		"deviceRemoved"
*/

var TIMEOUT = 100;
var REFRESH_INTERVAL = 5000;

var COM_CLASS = 2;

var DeviceManager = function()
{
	var self = this;

	this.devices = [];

	this.protocol = new Protocol();

	this.protocol.on("ready", function()
		{
			console.log("Starting bridge...");
			setTimeout(function()
				{
					self.protocol.on("post", (function(packet)
					{
						if(packet.message.command[0] === COM_CLASS)
						{
							var self = this;
							var deviceAddress = addressParser.toString(packet.srcAddr);
							if(!this.deviceAlreadyAdded(deviceAddress))
							{
								var device = new Device(this);
								device.class = packet.message.data.toString("utf8");
								device.address = deviceAddress;

								device.fetchAll((function(err, results)
									{
										if(err) 
										{
											console.log(err);
											return;
										}
										if(!self.deviceAlreadyAdded(this.address))
										{
											self.devices.push(this);
											self.emit("deviceAdded");
										}
									}).bind(device));
							}
							else
							{
								var altdevice = self.getDevice(deviceAddress)[0];
								if(altdevice.active === false)
								{
									altdevice.active = true;
									self.emit("deviceAdded");
								}
							}
							
						}
					}).bind(self));

					setInterval(function()
						{
							self.refreshDevices();
						}, REFRESH_INTERVAL);

					self.emit("ready");
				}, 2000);
		});
};

DeviceManager.prototype.__proto__ = events.EventEmitter.prototype;

DeviceManager.prototype.deviceAlreadyAdded = function(address)
{
	for(var device in this.devices)
	{
		if(this.devices[device].address === address) return true;
	}
	return false;
};

DeviceManager.prototype.fetchDevices = function(callback)
{
	var self = this;
	self.protocol.requestGet(addressParser.toBuffer("FF:FF"), COM_CLASS);
	var count = 0;
	var interval = setInterval(function()
		{
			self.protocol.requestGet(addressParser.toBuffer("FF:FF"), COM_CLASS);
			count++;
			if(count > 3) 
			{
				clearInterval(interval);
				if(callback) callback();
			}

		}, 500);
};

DeviceManager.prototype.refreshDevices = function(callback)
{
	var self = this;
	var fcns = [];
	for(var i = 0; i < this.devices.length; i++)
	{
		(function()
		{
			var j = i;
			fcns.push((function(callback)
			{
				if(typeof self.devices[j] !== "undefined")
				{
					async.retry(3, function(callback){ self.devices[j].ping(callback); }, function(err)
					{
						if(err) 
						{
							if(self.devices[j].active === true)
							{
								self.devices[j].active = false;
								self.emit("deviceRemoved");
							}
						}
						else
						{
							if(self.devices[j].active === false)
							{
								self.devices[j].active = true;
								self.emit("deviceAdded");
							}
						}
						callback(null);
					});
				}
			}));
		})();
	}

	async.series(fcns, function(err, results)
		{
			if(callback) callback(err);
		});

};

DeviceManager.prototype.requestAction = function(address, action, param)
{
	if(typeof address === "string")
	{
		address = addressParser.toBuffer(address);
	}

	if(address)
	{
		this.protocol.requestAction(address, action, param);
	}
};

DeviceManager.prototype.requestGet = function(address, command, param, data, callback)
{
	if(typeof address === "string")
	{
		address = addressParser.toBuffer(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestGet(address, command, param, data);

	function getCb(packet)
	{
		clearTimeout(timeout);
		callback(null, packet, getCb);
	}

	var timeout = setTimeout(function()
	{
		callback(new Error("Timeout"), null, getCb);
	}, TIMEOUT);


	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(addressParser.toString(address), getCb);
};

DeviceManager.prototype.requestPost = function(address, command, param, data, callback, timeout)
{
	if(typeof timeout === "undefined") timeout = TIMEOUT;
	if(typeof address === "string")
	{
		address = addressParser.toBuffer(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestPost(address, command, param, data);

	function postCb(packet)
	{
		clearTimeout(tout);
		callback(null, packet, postCb);
	}

	var tout = setTimeout(function()
	{
		callback(new Error("Timeout"), null, postCb);
	}, timeout);

	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(addressParser.toString(address), postCb);
};

DeviceManager.prototype.requestCustom = function(address, data, callback)
{
	if(typeof address === "string")
	{
		address = addressParser.toBuffer(address);
	}
	if(!address) return callback(new Error("Invalid address"));
	this.protocol.requestCustom(address, data);

	function custCb(packet)
	{
		clearTimeout(tiout);
		callback(null, packet, custCb);
	}

	var tiout = setTimeout(function()
	{
		callback(new Error("Timeout"), null, custCb);
	}, TIMEOUT);

	// TODO: Check if its necesary to remove listener after success.
	this.protocol.on(addressParser.toString(address), custCb);
};

DeviceManager.prototype.getDevice = function(query)
{
	var devices = [];
	if(typeof query === "undefined")
	{
		devices = this.devices;
	}
	else if(Array.isArray(query))	// Array of addresses
	{
		for(var i = 0; i < this.devices.length; i++)
		{
			for(var j = 0; j < query.length; j++)
			{
				if(addressParser.isAddress(query[j]))
				{
					if(addressParser.compare(query[j], this.devices[i].address))
					{
						devices.push(this.devices[i]);
					}
				}
			}
		}
	}
	else if(typeof query === "string")
	{
		if(query === "*")
		{
			devices = this.devices;
		}
		else
		{
			devices = this.devices.filter(function(element)
			{
				if(addressParser.isAddress(query))
				{
					if(addressParser.compare(element.address, query)) return true;
				}
				if(element.name === query) return true;
				if(element.class === query) return true;
				return false;
			});
		}
	}
	else if(Buffer.isBuffer(query))
	{
		devices = this.devices.filter(function(element)
		{
			if(buffertools.compare(addressParser.toBuffer(element.address), query) === 0) return true;
			else return false;
		});
	}
	return devices;
};

var deviceManager = new DeviceManager();

module.exports = deviceManager;