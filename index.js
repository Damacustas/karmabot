var fs = require('fs');
var IrcClient = require('./IrcClient');
var IrcColor = require('irc-colors');

// Method to make sure karma.json exists.
function fileExistsSync(path)
{
        try {   
                var stats = fs.statSync(path);
                return stats.isFile();
        } catch(e) {
                return false;
        }
}

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

// Helper function to save karma async.
function saveKarma(karma) {
        var out = {karma: karma};
        var outStr = JSON.stringify(out, null, null);
        fs.writeFile('karma.json', outStr, function(err) {
                if(err) {
                        console.error("Could not write karma, dump below.\n");
                        console.error(outStr + "\n");
                }
        });
}

// if karma.json does not exist, create an empty one.
if(!fileExistsSync('karma.json')) {
        fs.writeFileSync('karma.json', '{"karma":{}}');
}

var karma = null;

// Load karma.json.
try {   
        karma = JSON.parse(fs.readFileSync('karma.json', 'utf8')).karma;
} catch(e) {
        console.error("Could not open and/or interpret karma.json file.");
        process.exit(1);
}


// Create irc client.
var client = new IrcClient({
        username: 'karmabot-dev',
        realname: 'Karma Bot Development',
        port: 6697,
		host: 'irc.kepow.org',
		nick: 'karmabot-dev'
});


client.addListener('message', function(from, to, message) {
    
		var text = IrcColor.stripColorsAndStyle(message);
        if(text.startsWith('!')) {
                if(text.endsWith('?')) {
                        // Karma query.
                        var subj = text.substr(1, text.length - 2);

                        // Does karma exists?
                        if(karma.hasOwnProperty(subj)) {
                            var target = to === client.getNick() ? from : to;
                            
                                client.say(target, 'Karma for ' + subj + ': ' + karma[subj]);
                        } else {
                                client.say(target, 'I have no karma for ' + subj + '.');
                        }
                } else if(text.endsWith('++')) {
                        if(to === client.getNick()) {
                            client.say(from, "Cannot privately modify karma.");
                            return;
                        }
                        
                        var subj = text.substr(1, text.length - 3);

                        // Check if karma for subj already exists.
                        if(!karma.hasOwnProperty(subj)) {
                                karma[subj] = 0;
                        }

                        // Increment karma.
                        karma[subj]++;

                        // Report karma
                        console.log(from + ': ' + message + ' -> ' + subj + ': ' + karma[subj]);
                        var channels = client.getChannels();
                        for(var channelName in channels) {
                            if(channelName === to)
                                client.say(channelName, from + ' increased karma for ' + subj + ' to ' + karma[subj]);
                            else
                                client.say(channelName, to+':'+from+' increased karma for ' + subj + ' to ' + karma[subj])
                        }

                        // Save karma
                        saveKarma(karma);
                } else if(text.endsWith('--')) {
                        if(to === client.getNick()) {
                            client.say(from, "Cannot privately modify karma.");
                            return;
                        }
                        
                        var subj = text.substr(1, text.length - 3);

                        // Check if karma for subj already exists.
                        if(!karma.hasOwnProperty(subj)) {
                                karma[subj] = 0;
                        }

                        // Decrement karma.
                        karma[subj]--;

                        // Report karma
                        console.log(from + ': ' + message + ' -> ' + subj + ': ' + karma[subj]);
                        var channels = client.getChannels();
                        for(var channelName in channels) {
                            if(channelName === to)
                                client.say(channelName, from + ' decreased karma for ' + subj + ' to ' + karma[subj]);
                            else
                                client.say(channelName, to+':'+from+' decreased karma for ' + subj + ' to ' + karma[subj])
                        }

                        // Save karma.
                        saveKarma(karma);
                }
        }
})


client.connect();