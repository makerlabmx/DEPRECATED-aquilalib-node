var addressParser = require("./addressParser");

var Entry = function()
{
	this.n = 0;
	this.hasParam = false;
	this.event = 0;
	this.address = "00:00:00:00:00:00:00:00";
	this.action = 0;
	this.param = 0;
};

Entry.prototype.fromBuffer = function(raw)
{
	// parse entry
	this.hasParam = Boolean(raw.data[0]);
	this.event = raw.data[1];
	this.address = addressParser.toString(raw.data.slice(2, 10));
	this.action = raw.data[10];
	this.param = raw.data[11];
};

Entry.prototype.toBuffer = function()
{
	var buf = new Buffer(12);
	buf[0] = Number(this.hasParam);
	buf[1] = this.event;
	var address = addressParser.toBuffer(this.address);
	address.copy(buf, 2);
	buf[10] = this.action;
	buf[11] = this.param;

	return buf;
};

module.exports = Entry;