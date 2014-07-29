var Protocol = require("./protocol");
var addressParser = require("./addressParser");
var Device = require("./device");
var events = require("events");
var async = require("async");
var buffertools = require("buffertools");
var Datastore = require('nedb');

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

	this.configDB = new Datastore({ filename: '../db/config.db', autoload: true });
	this.devicesDB = new Datastore({ filename: '../db/devices.db', autoload: true });

	this._devices = [];

	this.protocol = new Protocol();

	this.protocol.on("ready", function()
		{
			console.log("Starting bridge...");

			setTimeout(function()
				{
					self.configDB.find({}, function(err, docs)
					{
						if (err) console.log(err);
						console.log("Config: ", docs);
						if(docs.length === 0)	//No hay config
						{
							var defaultConfig = {
								PAN: 0xCA5A
							};
							self.configDB.insert(defaultConfig);
						}
						else
						{
							self.setPAN(docs[0].PAN);
						}
					});
					
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
											self.addDevice(this);
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

DeviceManager.prototype.getPAN = function()
{
	return this.protocol.getPAN();
};

DeviceManager.prototype.setPAN = function(pan)
{
	var self = this;
	if(typeof(pan) === 'number')
	{
		self.configDB.update({}, {PAN: pan});
		this.protocol.setPAN(pan);
	}
};

DeviceManager.prototype.getDevices = function()
{
	return this._devices;
};

DeviceManager.prototype.setDevices = function(devices)
{
	this._devices = devices;
	this.emit("deviceAdded");
	return this._devices;
};

DeviceManager.prototype.cleanDevices = function()
{
	while(this._devices.length > 0)
	{
		this._devices.pop().removeAllListeners();
	}
};

DeviceManager.prototype.addDevice = function(device)
{
	var self = this;
	self.devicesDB.find({address: device.address}, function(err, docs)
		{
			if(err) { console.log(err); return; }
			if(docs.length !== 0)
			{
				console.log(docs);
				device.name = docs[0].name;
			}
			else
			{
				self.devicesDB.insert({ address: device.address, 
										name: device.name });
			}
			self._devices.push(device);
			self.emit("deviceAdded");

		});
};

DeviceManager.prototype.setDeviceName = function(address, name)
{
	var self = this;
	self.devicesDB.update({address: address}, {address: address, name: name}, {}, function(err, replaced)
		{
			if(err) { console.log(err); return; }

			var devices = self.getDevices();
			for(var device in devices)
			{
				if(devices[device].address === address) 
				{
					devices[device].name = name;
					self.setDevices(devices);
					continue;
				}
			}
		});
};

DeviceManager.prototype.deviceAlreadyAdded = function(address)
{
	var devices = this.getDevices();
	for(var device in devices)
	{
		if(devices[device].address === address) return true;
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
	var devices = this.getDevices();

	for(var i = 0; i < devices.length; i++)
	{
		(function()
		{
			var j = i;
			fcns.push((function(callback)
			{
				if(typeof devices[j] !== "undefined")
				{
					async.retry(3, function(callback){ devices[j].ping(callback); }, function(err)
					{
						if(err) 
						{
							if(devices[j].active === true)
							{
								devices[j].active = false;
								self.setDevices(devices);
								self.emit("deviceRemoved");
							}
						}
						else
						{
							if(devices[j].active === false)
							{
								devices[j].active = true;
								self.setDevices(devices);
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
	var allDevices = this.getDevices();
	if(typeof query === "undefined")
	{
		devices = allDevices;
	}
	else if(Array.isArray(query))	// Array of addresses
	{
		for(var i = 0; i < allDevices.length; i++)
		{
			for(var j = 0; j < query.length; j++)
			{
				if(addressParser.isAddress(query[j]))
				{
					if(addressParser.compare(query[j], allDevices[i].address))
					{
						devices.push(allDevices[i]);
					}
				}
			}
		}
	}
	else if(typeof query === "string")
	{
		if(query === "*")
		{
			devices = allDevices;
		}
		else
		{
			devices = allDevices.filter(function(element)
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
		devices = allDevices.filter(function(element)
		{
			if(buffertools.compare(addressParser.toBuffer(element.address), query) === 0) return true;
			else return false;
		});
	}
	return devices;
};

var deviceManager = new DeviceManager();

module.exports = deviceManager;