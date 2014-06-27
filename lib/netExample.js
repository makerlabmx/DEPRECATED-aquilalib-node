var Net = require("./net");
var Packet = require("./packet");
var repl = require("repl");

var net = new Net();

var packet = new Packet();

packet.frameControl.srcAddrMode = Packet.ADDR_SHORT;
packet.frameControl.frameVersion = Packet.V2003;
packet.frameControl.destAddrMode = Packet.ADDR_SHORT;

packet.destAddr = new Buffer([0x04, 0x00]);
packet.srcAddr = new Buffer([0x02, 0x00]);
packet.payload = new Buffer([0x00, 0x2E, 0x30, 0x30, 0x32, 0x3B, 0x32, 0x35, 0x35, 0x3B]);

net.on("ready", function()
	{
		console.log("Net ready");
		/*setInterval(function()
		{
			console.log("Sent:\n", packet);
			net.send(packet);
		}, 2000);*/
	});

net.on("receive", function(packet)
	{
		console.log(packet);
	});

var r = repl.start("node> ");