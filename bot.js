const Discord = require('discord.js');
const fs = require('fs');
const csv = require('csv')
const async = require('async')
const ytdl = require('ytdl-core')
const request = require('request')
const getYouTubeID = require('get-youtube-id')
const fetchVideoInfo = require('youtube-info')

const client = new Discord.Client();

// requires discord 'token'
const config = JSON.parse(fs.readFileSync('./auth.json', 'utf-8'));

// get array of random facts
const random_facts = fs.readFileSync('randomfacts.txt').toString().split('\n');

// arrays for tweet data
var Lukas_Tweets = [];
var Connor_Tweets = [];

// music values
const queue_size = 10;
var queue = [];
var video_info = [];
var isAuto = false;
var isPlaying = false;
var isPaused = false;
var dispatcher = null;

// bot login
client.login(config.token);

client.on('ready', () => {
  console.log(client.user + ' connected');
});

// values for csv
function MyCSV(id, time, message) {
    this.FieldOne = id;
    this.FieldTwo = time;
    this.FieldThree = message;
}

// read in csv files synchronously
async.series([
    function(callback) {
        var obj = csv();
        obj.from.path('LukasPrin_tweets.csv').to.array(function (data) {
            for (var index = 0; index < data.length; ++index) {
                Lukas_Tweets.push(new MyCSV(data[index][0], data[index][1], data[index][2]));
            }
            callback(null, 1);
        });
    },
    function(callback) {
        var obj = csv();
        obj.from.path('LiLCBaller23_tweets.csv').to.array(function (data) {
            for (var index = 0; index < data.length; ++index) {
                Connor_Tweets.push(new MyCSV(data[index][0], data[index][1], data[index][2]));    
            }
            callback(null, 2);
        });
    }
], function(error, results) {
    if (error) console.log(error, results);
});

// evaluate messages
client.on('message', message => {

    // get bot
    const bot_member = (message.guild).members.get(client.user.id);

    // deny messages from other bots
    if (message.author.bot) return;

    // basic responses
    const ramus = 'ramus';
    var i, j;

    if (message.content.toLowerCase() === 'hey ramus' || 
        message.content.toLowerCase() === 'hi ramus') {
        message.channel.send('hey ' + message.author);
    }
    for (i = 0, j = 0; i < message.content.length; ++i) {
        if (j === ramus.length - 1) { 
            message.channel.send('ok'); 
        }
        if (message.content[i].toLowerCase() === ramus[j]) { 
            j++; 
        } else { 
            j = 0; 
        }
    }

    // accept messages with !
    if (message.content.substring(0, 1) === '!') {

        // parse command and switch
        var args = message.content.substring(1).split(' ');
        var cmd = args[0];
        args = args.splice(1);

        switch(cmd.toLowerCase()) {
            // random tweet finder
            case 'lukas':
                var temp = Math.floor((Math.random() * Lukas_Tweets.length));
                var link = 'https://twitter.com/LukasPrin/status/' + 
                    Lukas_Tweets[temp].FieldOne.substring(1);
                console.log(link + ' : ' + Lukas_Tweets[temp].FieldTwo + ' : ' + 
                    Lukas_Tweets[temp].FieldThree.substring(1));
                message.channel.send(link);
                break;
            case 'connor':
                var temp = Math.floor((Math.random() * Connor_Tweets.length));
                var link = 'https://twitter.com/LiLCBaller23/status/' + 
                    Connor_Tweets[temp].FieldOne.substring(1);
                console.log(link + ' : ' + Connor_Tweets[temp].FieldTwo + ' : ' + 
                    Connor_Tweets[temp].FieldThree.substring(1));
                message.channel.send(link);
                break;
            // random fact finder
            case 'fact':
                var temp = Math.floor((Math.random() * random_facts.length));
                console.log(random_facts[temp]);
                message.channel.send(random_facts[temp]);
                break;
            // join current user's channel
            case 'join':
                if (message.member.voiceChannel && is_admin(message.member)) {
                    message.member.voiceChannel.join()
                    .then(connection => { 
                        // do things if successfully connected
                    })
                    .catch(console.log);
                } else { 
                    message.channel.send('join a channel'); 
                }
                break;
            // leave current channel
            case 'leave':
                if (get_connection(message) === null) { 
                    return console.log('not in channel');
                }
                else {
                    if (is_admin(message.member)) { 
                        if (isPlaying) {
                            dispatcher.end();
                        }
                        queue = [];
                        video_info = [];
                        console.log('queue cleared');

                        bot_member.voiceChannel.leave(); 
                    }
                }
                break;
            // plays next song in queue
            case 'play':
                if (queue.length > 0 && !isPaused && !isPlaying) {
                    get_next(message);
                }
                else {
                    if (queue.length === 0) { 
                        message.channel.send('queue is empty'); 
                    } else { 
                        message.channel.send('already playing'); 
                    }
                }
                break;
            case 'skip':
                if (queue.length > 0 && isPlaying) {
                    if (get_connection(message) === null) {
                        return message.channel.send('no');
                    }

                    if (dispatcher.paused) { 
                        dispatcher.resume();
                        isPaused = false;
                    }
                    dispatcher.end();
                }
                else { 
                    if (queue.length === 0) {
                        message.channel.send('queue is empty');
                    } else {
                        message.channel.send('nothing is playing');
                    }
                }
                break;
            // autoplay
            case 'autoplay':
                if (isAuto) { 
                    isAuto = false;
                    message.channel.send('autoplay off');
                } else { 
                    isAuto = true;
                    message.channel.send('autoplay on');

                    if (queue.length > 0 && !isPlaying && !isPaused) {
                        get_next(message);
                    }
                }
                break;
            // adds a song to queue
            case 'add':
                if (queue.length < queue_size) {
                    getsearchID(args, message, function(id) {
                        if (id === null) {
                            message.channel.send('could not find');
                        }
                        
                        fetchVideoInfo(id, function(error, videoInfo) {
                            if (error) console.log(error);
                            message.channel.send("added **" +  videoInfo.title + "**");

                            queue.push('https://www.youtube.com/watch?v=' + id);
                            video_info.push(videoInfo.title);
                        });
                    });
                } else { 
                    message.channel.send('queue is full'); 
                }
                break;
            case 'addlink':
                if (queue.length < queue_size) {
                    getID(args, message, function(id) {

                        if (args[0] === null) {
                            message.channel.send('empty link');
                            return;
                        } else if (args[0].length < 33) {
                            message.channel.send('use full youtube link');
                            return;
                        } else if (args[0].substring(0, 32) != 'https://www.youtube.com/watch?v=') {
                            message.channel.send('use link with https://www. [no mobile]');
                            return;
                        } else { 
                            fetchVideoInfo(id, function(error, videoInfo) {
                                if (error) console.log(error);

                                message.channel.send("added **" +  videoInfo.title + "**");
                                queue.push(args[0]); 
                                video_info.push(videoInfo.title);
                            });
                        }
                    });
                } else { 
                    message.channel.send('queue is full'); 
                }
                break;
            // pauses current song
            case 'pause':
                if (get_connection(message) === null) { 
                    return message.channel.send('no');
                }

                if (!dispatcher.paused) { 
                    dispatcher.pause();
                    isPaused = true;
                }
                break;
            // resumes current song
            case 'resume':
                if (get_connection(message) === null) { 
                    return message.channel.send('no');
                }

                if (dispatcher.paused) { 
                    dispatcher.resume();
                    isPaused = false;
                }
                break;
            // stops song
            case 'stop':
                if (isPlaying) { 
                    if (dispatcher.paused) { 
                        dispatcher.resume();
                        isPaused = false;
                    }
                    dispatcher.end(); 
                }
                break;
            case 'clear':
                if (is_admin(message.member)) {
                    queue = [];
                    video_info = [];
                    message.channel.send('queue cleared');
                    console.log('queue cleared');
                } else {
                    console.log('not admin')
                }
                break;
            case 'remove':
                if (args[0] === null) {
                    message.channel.send('enter a number between 1 - ' + queue.length);
                }
                else {
                    if (!isNaN(args[0])) {
                        var temp = Number(args[0])
                        if (temp <= queue.length && temp >= 1) {
                            message.channel.send('removed ' + video_info[temp - 1] + ' from queue');

                            queue.splice(temp - 1, 1);
                            video_info.splice(temp - 1, 1); 
                        } else {
                           message.channel.send('enter a number between 1 - ' + queue.length); 
                        }
                    } else {
                        message.channel.send('enter a number between 1 - ' + queue.length);
                    }
                }
                break;
            case 'print':
                if (queue.length === 0) { 
                    message.channel.send('queue is empty'); 
                } else {
                    var on_off = isAuto ? 'ON' : 'OFF';
                    var i;

                    message.channel.send('CURRENT SIZE: ' + queue.length + 
                        ' CAPACITY: ' + queue_size + ' AUTOPLAY: ' + on_off + '\n');
                    
                    for (i = 0; i < queue.length; ++i) {
                        if (i === 0 && isPlaying) {
                            message.channel.send('(' + (i + 1) + ') ' + '**' +  
                                video_info[i] + '** <- CURRENTLY PLAYING');
                        } else {
                            message.channel.send('(' + (i + 1) + ') ' + '**' +  
                                video_info[i] + '**');
                        }
                    }
                }
                break;
            // heads or tails coinflip
            case 'coinflip':
                message.channel.send('beginning coinflip...\n');
                setTimeout(function() { message.channel.send('...\n'); }, 1000);
                setTimeout(function() { message.channel.send('..\n'); }, 1000);
                setTimeout(function() { message.channel.send('.\n'); }, 1000);
                setTimeout(function() {
                    var temp = Math.floor((Math.random() * 2));
                    if (temp === 0) {  
                        message.channel.send('HEADS\n'); 
                    } else { 
                        message.channel.send('TAILS\n'); 
                    }
                }, 2000);
                break;
            // list commands
            default:
                message.channel.send('commands: \n' +
                    '!lukas !connor !coinflip !fact \n' + 
                    '!add [search] !addlink [yt link here] !remove [position] \n' +
                    '!play !skip !pause !resume !stop !print !autoplay \n');
                break;
        }
    }
});

client.on("disconnect", event => {
    console.log("disconnection: " + event.reason + " (" + event.code + ")");
});

function getsearchID(str, message, callback) {
    search_video(str, function(id) {
        if (id === null) { 
            message.channel.send('no results found'); 
        }
        callback(id);
    });
}

function getID(str, message, callback) {

    if (str[0] === null) {
        message.channel.send('empty link');
        return;
    } else if (str[0].length < 33) {
        message.channel.send('use full youtube link');
        return;
    } else if (str[0].substring(0, 32) != 'https://www.youtube.com/watch?v=') {
        message.channel.send('use full yt link with |https://www.| [no mobile]');
        return;
    } else { 
        callback(getYouTubeID(str)); 
    }
}

function playMusic(id, message) {
    var voiceChannel = message.member.voiceChannel;

    if (queue.length === 0) {
        return message.channel.send('queue is empty');
    }

    voiceChannel.join().then(function (connection) {

        var stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });

        dispatcher = connection.playStream(stream);

        // adjust volume
        dispatcher.setVolume(0.25);

        // change video if error
        connection.on('error', (error) => {
            console.log(error);
            queue.shift();
            video_info.shift();
            get_next(message);
        });

        dispatcher.on('error', (error) => {
            console.log(error);
            queue.shift();
            video_info.shift();
            get_next(message);
        });

        dispatcher.on('start', () => {
            isPlaying = true;
        });

        // when finished check for autoplay
        dispatcher.on('end', () => {
            isPlaying = false;
            isPaused = false;

            setTimeout(() => {
                if (queue.length > 0) {
                    queue.shift();
                    video_info.shift();

                    if (isAuto && queue.length > 0) {
                        get_next(message);
                    }
                } else {
                    message.channel.send('queue is empty');
                }
            }, 1000);
        });
    }).catch((error) => {
        console.log(error);
    });
}

// searches for video through yt api
function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + 
        encodeURIComponent(query) + "&key=" + config.yt_api_key, function(error, response, body) {
        var search_results = JSON.parse(body);
        if (!search_results.items[0]) { 
            callback(null); 
        } else { 
            callback(search_results.items[0].id.videoId); 
        }
    });
}

function get_next(message) {
    getID(queue, message, function(new_id) {
        playMusic(new_id, message);

        fetchVideoInfo(new_id, function(error, videoInfo) {
            if (error) console.log(error);
            message.channel.send(" now playing: **" + 
                videoInfo.title + "**");
            console.log("playing: " + videoInfo.title);
        });
    });
}

function is_admin(member) {
    return member.hasPermission("ADMINISTRATOR");
}

function get_connection(message) {
    return client.voiceConnections.find(val => val.channel.guild.id == message.guild.id);
}