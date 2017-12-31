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

// bot login
client.login(config.token);

// bot is ready
client.on('ready', () => {
  console.log(client.user + ' connected');
});

// arrays for tweet data
var Lukas_Tweets = [];
var Connor_Tweets = [];
var Jack_Tweets = [];

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
    },
    function(callback) {
        var obj = csv();
        obj.from.path('jjkunderscore_tweets.csv').to.array(function (data) {
            for (var index = 0; index < data.length; ++index) {
                Jack_Tweets.push(new MyCSV(data[index][0], data[index][1], data[index][2]));
            }
            callback(null, 3);
        });
    }
], function(error, results) {
    if (error) console.log(error);
});

const queue_size = 10;
var queue = [];
var video_info = [];
var isAuto = false;
var isJoined = false;
var isPlaying = false;
var dispatcher = null;
var isPaused = false;
const random_facts = fs.readFileSync('randomfacts.txt').toString().split('\n');

// evaluate messages
client.on('message', message => {

    // get bot
    const bot_member = (message.guild).members.get(client.user.id);

    // deny messages from other bots
    if (message.author.bot) return;

    // basic responses
    const ramus = 'ramus';
    if (message.content.toLowerCase() == 'hey ramus' || 
        message.content.toLowerCase() == 'hi ramus') {
        message.channel.send('hey ' + message.author);
        return;
    }
    for (var i = 0, j = 0; i < message.content.length; ++i) {
        if (j == ramus.length - 1) { message.channel.send('ok'); }
        if (message.content[i].toLowerCase() == ramus[j]) { j++; }
        else { j = 0; }
    }

    // accept messages with !
    if (message.content.substring(0, 1) == '!') {

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
            case 'jack':
                var temp = Math.floor((Math.random() * Jack_Tweets.length));
                var link = 'https://twitter.com/jkkunderscore/status/' + 
                    Jack_Tweets[temp].FieldOne.substring(1);
                console.log(link + ' : ' + Jack_Tweets[temp].FieldTwo + ' : ' + 
                    Jack_Tweets[temp].FieldThree.substring(1));
                message.channel.send(link);
                break;
            case 'fact':
                var temp = Math.floor((Math.random() * random_facts.length));
                console.log(random_facts[temp]);
                message.channel.send(random_facts[temp]);
                break;
            // join current user's channel
            case 'join':
                if (message.member.voiceChannel) {
                    message.member.voiceChannel.join()
                    .then(connection => { 
                        // do things if successfully connected
                    })
                    .catch(console.log);
                    isJoined = true;
                } 
                else { 
                    message.reply('join a channel'); 
                }
                break;
            // leave current channel
            case 'leave':
                if (isJoined) { 
                    bot_member.voiceChannel.kick; 
                }
                else { 
                    message.channel.send('not in channel'); 
                }
                break;
            // plays next song in queue / skips current song
            case 'play':
                if (queue.length > 0 && !isPlaying && !isPaused) {
                    isPlaying = true;

                    getID(queue, message, function(id) {
                        playMusic(id, message);

                        fetchVideoInfo(id, function(err, videoInfo) {
                            if (err) throw new Error(err);
                            message.channel.send(" now playing: **" + videoInfo.title + "**");
                            console.log("playing: " + videoInfo.title);
                        });
                    });
                }
                else {
                    if (queue.length == 0) { 
                        message.channel.send('queue is empty'); 
                    }
                    else { 
                        message.channel.send('already playing'); 
                    }
                }
                break;
            case 'skip':
                if (queue.length > 0 && isPlaying) {
                    dispatcher.end();

                    if (queue.length == 0) {
                        message.channel.send('queue is empty'); 
                    }
                    else {
                        if (!isAuto) {
                            getID(queue, message, function(id) {
                                playMusic(id, message);

                                fetchVideoInfo(id, function(err, videoInfo) {
                                    if (err) throw new Error(err);
                                    message.channel.send(" now playing: **" + videoInfo.title + "**");
                                    console.log("playing: " + videoInfo.title);
                                });
                            });
                        }
                    }
                }
                else { 
                    if (queue.length == 0) { 
                        message.channel.send('queue is empty'); 
                    }
                    else { 
                        message.channel.send('nothing is playing'); 
                    }
                }
                break;
            // autoplay
            case 'autoplay':
                if (isAuto) { 
                    isAuto = false;
                    message.channel.send('autoplay off');
                }
                else { 
                    isAuto = true;
                    message.channel.send('autoplay on');

                    if (queue.length > 0 && !isPlaying && !isPaused) {
                        isPlaying = true;

                        getID(queue, message, function(id) {
                            playMusic(id, message);

                            fetchVideoInfo(id, function(err, videoInfo) {
                                if (err) throw new Error(err);
                                message.channel.send(" now playing: **" + videoInfo.title + "**");
                                console.log("playing: " + videoInfo.title);
                            });
                        });
                    }
                }
                break;
            // adds a song to queue
            case 'add':
                if (queue.length <= queue_size) {
                    getsearchID(args, message, function(id) {
                        if (id == 'null') return;
                        queue.push('https://www.youtube.com/watch?v=' + id);

                        fetchVideoInfo(id, function(error, videoInfo) {
                            if (error) throw new Error(error);
                            message.channel.send("added **" +  videoInfo.title + "**");
                            video_info.push(videoInfo.title);
                        });
                    });
                }
                else { 
                    message.channel.send('queue is full'); 
                }
                break;
            case 'addlink':
                if (queue.length <= queue_size) {
                    getID(args, message, function(id) {

                        if (args[0] == null) {
                            message.channel.send('empty link');
                            return;
                        }
                        else if (args[0].length < 33) {
                            message.channel.send('use full youtube link');
                            return;
                        }
                        else if (args[0].substring(0, 32) != 'https://www.youtube.com/watch?v=') {
                            message.channel.send('use link with https://www. [no mobile]');
                            return;
                        } 
                        else { 
                            queue.push(args[0]); 
                            fetchVideoInfo(id, function(error, videoInfo) {
                                if (error) throw new Error(error);
                                message.channel.send("added **" +  videoInfo.title + "**");
                                video_info.push(videoInfo.title);
                            });
                        }
                    });
                }
                else { 
                    message.channel.send('queue is full'); 
                }
                break;
            // pauses current song
            case 'pause':
                if (isPlaying) {
                    dispatcher.pause();
                    isPaused = true;
                    isPlaying = false;
                }
                break;
            // resumes current song
            case 'resume':
                if (isPaused) {
                    dispatcher.resume();
                    isPlaying = true;
                    isPaused = false;
                }
                break;
            // stops song
            case 'stop':
                if (isPlaying) { 
                    dispatcher.end(); 
                    isPlaying = false;
                }
                break;
            case 'clear':
                queue = [];
                video_info = [];
                message.channel.send('queue cleared');
                break;
            case 'remove':
                if (args[0] == null) {
                    message.channel.send('enter a number between 1 - ' + queue.length);
                }
                else {
                    if (!isNaN(args[0])) {
                        var temp = Number(args[0])
                        if (temp <= queue.length && temp >= 1) {
                            message.channel.send('removed ' + video_info[temp - 1] + ' from queue');

                            queue.splice(temp - 1, 1);
                            video_info.splice(temp - 1, 1); 
                        }
                        else {
                           message.channel.send('enter a number between 1 - ' + queue.length); 
                        }
                    }
                    else {
                        message.channel.send('enter a number between 1 - ' + queue.length);
                    }
                }
                break;
            case 'print':
                if (queue.length == 0) { 
                    message.channel.send('queue is empty'); 
                }
                else {
                    if (isAuto) {
                        message.channel.send('CURRENT SIZE: ' + queue.length + 
                            ' CAPACITY: ' + queue_size + ' AUTOPLAY: ON\n');
                    }
                    else {
                        message.channel.send('CURRENT SIZE: ' + queue.length + 
                            ' CAPACITY: ' + queue_size + ' AUTOPLAY: OFF\n');
                    }
                    
                    for (var i = 0; i < queue.length; ++i) {
                        if (i == 0 && isPlaying) {
                            message.channel.send('(' + (i + 1) + ') ' + '**' +  
                                video_info[i] + '** <- CURRENTLY PLAYING');
                        }
                        else {
                            message.channel.send('(' + (i + 1) + ') ' + '**' +  
                                video_info[i] + '**');
                        }
                    }
                }
                break;
            // heads or tails coinflip
            case 'coinflip':
                message.channel.send('beginning coinflip...\n');
                setTimeout(function() { message.channel.send('...\n'); }, 3000);
                setTimeout(function() { message.channel.send('..\n'); }, 3000);
                setTimeout(function() { message.channel.send('.\n'); }, 3000);
                setTimeout(function() {
                    var temp = Math.floor((Math.random() * 2));
                    if (temp == 0) { 
                        message.channel.send('HEADS\n'); 
                    }
                    else {  
                        message.channel.send('TAILS\n'); 
                    }
                }, 3000);
                break;
            // list commands
            default:
                message.channel.send('commands: !lukas !connor !jack !coinflip !fact \n');
                message.channel.send('!add [search] !addlink [yt link here] !remove [position] \n');
                message.channel.send('!play !skip !pause !resume !stop !print !clear !autoplay \n');
                break;
        }
    }
});

function getsearchID(str, message, callback) {
    search_video(str, function(id) {
        if (id == 'null') { message.channel.send('no results found'); }
        callback(id);
    });
}

function getID(str, message, callback) {

    if (str[0] == null) {
        message.channel.send('empty link');
        return;
    }
    else if (str[0].length < 33) {
        message.channel.send('use full youtube link');
        return;
    }
    else if (str[0].substring(0, 32) != 'https://www.youtube.com/watch?v=') {
        message.channel.send('use full yt link with |https://www.| [no mobile]');
        return;
    }
    else { 
        callback(getYouTubeID(str)); 
    }
}

function playMusic(id, message) {
    voiceChannel = message.member.voiceChannel;
    voiceChannel.join().then(function (connection) {

        isJoined = true;
        isPlaying = true;

        stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });

        dispatcher = connection.playStream(stream);

        // adjust volume
        dispatcher.setVolume(0.25);

        dispatcher.on('error', e => {
          console.log(e);
        });

        // when finished check for autoplay
        dispatcher.on('end', () => {
            
            if (queue.length > 0) {
                queue.reverse();
                queue.pop();
                queue.reverse();

                video_info.reverse();
                video_info.pop();
                video_info.reverse();

                isPlaying = false;

                if (isAuto && queue.length > 0) {
                    getID(queue, message, function(new_id) {
                        playMusic(new_id, message);

                        fetchVideoInfo(new_id, function(err, videoInfo) {
                            if (err) console.log(err);
                            message.channel.send(" now playing: **" + 
                                videoInfo.title + "**");
                            console.log("playing: " + videoInfo.title);
                        });
                    });
                }
            }
        });
    });
}

// searches for video through yt api
function search_video(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + 
        encodeURIComponent(query) + "&key=" + config.yt_api_key, function(error, response, body) {
        var search_results = JSON.parse(body);
        if (!search_results.items[0]) { 
            callback('null'); 
        }
        else { 
            callback(search_results.items[0].id.videoId); 
        }
    });
}


