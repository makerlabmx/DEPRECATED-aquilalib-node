var addressParser = require("./aquilalib").addressParser;
Aq = require("./aquilalib").Aq;
Entry = require("./aquilalib").Entry;
var util = require("util");

var repl = require("repl");

colors = function(device, interval)
{
	return setInterval(function()
		{
			randomColor(device);
		}, interval);
};

randomColor = function(device)
{
	var r = Math.floor(Math.random()*255);
	var g = Math.floor(Math.random()*255);
	var b = Math.floor(Math.random()*255);

	device.action(0, r);
	device.action(2, b);
	device.action(1, g);
};

ping = function(device, interval)
{
	return setInterval(function()
		{
			device.action(2);
		}, interval);
};

Aq.manager.on("ready", function()
{
	Aq.manager.protocol.on("ack", function(packet)
		{
			console.log("Got ACK from ", addressParser.toString(packet.srcAddr));
		});
	Aq.manager.protocol.on("nack", function(packet)
		{
			console.log("Got NACK from ", addressParser.toString(packet.srcAddr));
		});
	Aq.manager.protocol.on("action", function(packet)
		{
			console.log("Got Action ", packet.message.command[0]," from ", addressParser.toString(packet.srcAddr));
		});
	Aq.manager.protocol.on("event", function(packet)
		{
			console.log("Got Event ", packet.message.command[0]," from ", addressParser.toString(packet.srcAddr));
		});
/*	Aq.manager.protocol.on("get", function(packet)
		{
			console.log("--------------------GET--------------------")
			console.log(packet);
			console.log("--------------------------------------------")
			
		});
	Aq.manager.protocol.on("post", function(packet)
		{
			console.log("--------------------POST--------------------")
			console.log(packet);
			console.log("--------------------------------------------")
			
		});
	Aq.manager.protocol.on("custom", function(packet)
		{
			console.log(packet);
			
		});*/

	/*Aq.manager.protocol.net.mac.bridge.serialPort.on("data", function(packet)
		{
			console.log("~~~~~~~~~~~~~~~~~~~~~DATA~~~~~~~~~~~~~~~~~~~~")
			console.log(packet);
			console.log("~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~")
		});*/

	/*Aq.manager.protocol.on("receive", function(packet)
		{
			console.log(packet);
		});*/
	//Aq.manager.protocol.net.mac.bridge.setPromiscuous(false);

	Aq.manager.on("deviceAdded", function()
		{
			console.log("Device Added");
		});

	Aq.manager.on("deviceRemoved", function()
		{
			console.log("Device Removed");
		});


	console.log("Protocol ready.");
	console.log("Getting devices...");
	Aq.update(function()
		{
			console.log("Devices ready.");
			repl.start(">");
		});
});

