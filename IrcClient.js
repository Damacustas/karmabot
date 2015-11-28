var util = require('util');
var EventEmitter = require('events');
var ircParse = require('irc-message').parse;
var tls = require('tls');

function IrcClient(options) {
	this.options = options;
	
	var self = this;
	
	self.channels = [];
	
	self.addListener('raw', function(message){
		switch(message.command) {
			case 'PING':
				self.sendRaw('PONG :' + message.params[0] + "\r\n");
				break;
				
			case 'JOIN':
				console.log(JSON.stringify(message, null, 2));
				if(getNick(message.prefix) === self.options.nick) {
					self.updateChannel(message.params[0], true);
				}
				
				self.emit('join', getNick(message.prefix), message.params[0], message);
				break;
				
			case 'PRIVMSG':
				self.emit('message', getNick(message.prefix), message.params[0], message.params[1], message);
				break;
		}
	});
}

util.inherits(IrcClient, EventEmitter);
IrcClient.prototype.conn = null;

IrcClient.prototype.sendRaw = function(line) {
	console.log('< ' + line);
	this.conn.write(line);
}

IrcClient.prototype.updateChannel = function(channelName, create) {
	this.channels[channelName] = {
		name: channelName,
		users: {}
	};
}

IrcClient.prototype.say = function(to, text) {
	var self = this;
	
	self.sendRaw('PRIVMSG ' + to + ' ' + text + "\r\n");
}

IrcClient.prototype.connect = function() {
	var self = this;
	
	var connectionOptions = {
		host: self.options.host,
		port: self.options.port
	}
	
	self.conn = tls.connect(connectionOptions, function() {
		console.log('connected!');
		
		self.conn.setEncoding('utf8');
		
		self.sendRaw('NICK ' + self.options.nick + "\r\n");
		self.sendRaw('USER ' + self.options.username + ' 8 * ' + self.options.realname + "\r\n");
	});
	
	var buffer = new Buffer('');
	self.conn.addListener('data', function(chunck) {
		if(typeof chunck === 'string') {
			buffer += chunck;
		} else {
			buffer = Buffer.concat([buffer, chunck]);
		}
		
		var lines = buffer.toString().split('\r\n');
		
		if(lines.pop())
			return;
		else
			buffer = new Buffer('');
		
		lines.forEach(function iterator (line) {
			var raw = ircParse(line);
			console.log('> ' + line);
			
			self.emit('raw', raw);
		})
	});
	
	self.conn.addListener('close', function(had_error){
		if(had_error) {
			console.log('Closed due to tls/net error.');
		} else {
			console.log('Closed normally.');
		}
	});
	
	self.conn.addListener('end', function(param){
		console.log('Ending connection: ' + param);
	})
	
	self.conn.addListener('error', function(error){
		console.log('ERROR: ' + error);
	})
}

module.exports = IrcClient;






// Helper string methods.
if (typeof String.prototype.endsWith !== 'function') {
    String.prototype.endsWith = function(suffix) {
        return this.indexOf(suffix, this.length - suffix.length) !== -1;
    };
}
if(typeof String.prototype.startsWith !== 'function') {
	String.prototype.startsWith = function (prefix) {
		return this.slice(0, prefix.length) == prefix;
	}
}

// Helper method to get nick
function getNick(prefix) {
	return prefix.substring(0, prefix.indexOf('!'));
}