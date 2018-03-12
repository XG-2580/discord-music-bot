"use strict";

const Discord = require("discord.js");
const fs = require("fs");
const csv = require("csv")
const async = require("async")
const ytdl = require("ytdl-core")
const request = require("request")
const getYouTubeID = require("get-youtube-id")
const fetchVideoInfo = require("youtube-info")

const client = new Discord.Client();

// requires discord 'token'
const config = JSON.parse(fs.readFileSync("./auth.json", "utf-8"));

// get array of random facts
const random_facts = fs.readFileSync("randomfacts.txt").toString().split('\n');

// arrays for tweet data
let Lukas_Tweets = [];
let Connor_Tweets = [];

// music values
const queue_size = 10;
let queue = [];
let video_info = [];
let isAuto = false;
let isPlaying = false;
let isPaused = false;
let dispatcher = null;
    
// bot login
client.login(config.token);

client.on("ready", () => {
  console.log(client.user + " connected");
});

// read in csv files synchronously
async.series([
    (callback) => {
        let obj = csv();
        obj.from.path("LukasPrin_tweets.csv").to.array(data => {
            for (let index = 0; index < data.length; ++index) {
                Lukas_Tweets.push(new myCSV(data[index][0], data[index][1], data[index][2]));
            }
            callback(null, 1);
        });
        
    },
    (callback) => {
        let obj = csv();
        obj.from.path("LiLCBaller23_tweets.csv").to.array(data => {
            for (let index = 0; index < data.length; ++index) {
                Connor_Tweets.push(new myCSV(data[index][0], data[index][1], data[index][2]));    
            }
            callback(null, 2);
        });
    }
], (error, results) => {
    if (error) return console.log(error, results);
});

// evaluate messages
client.on("message", (message) => {

    if (!message.member) return;

    // deny messages from other bots
    if (message.author.bot) return;

    if (getChannel(message) === null) { 
        return message.author.sendMessage("no");
    }

    // get bot
    const bot_member = (message.guild).members.get(client.user.id);

    // basic responses
    const ramus = "ramus";
    let i, j;

    if (message.content.toLowerCase() === "hey ramus" || 
        message.content.toLowerCase() === "hi ramus") {
        message.channel.send("hey " + message.author);
    }
    for (i = 0, j = 0; i < message.content.length; ++i) {
        if (j === ramus.length - 1) { 
            message.channel.send("ok"); 
        }
        if (message.content[i].toLowerCase() === ramus[j]) { 
            j++; 
        } else { 
            j = 0; 
        }
    }

    // accept messages with !
    if (message.content[0] === '!') {

        let temp = 0;
        let link = "";

        // parse command and switch
        let args = message.content.substring(1).split(" ");
        let cmd = args[0].toLowerCase();
        args = args.splice(1);

        switch(cmd) {
            case "lukas": // random tweet finder
                temp = Math.floor((Math.random() * Lukas_Tweets.length));
                link = "https://twitter.com/LukasPrin/status/" + 
                    Lukas_Tweets[temp].fieldOne.substring(1);
                message.channel.send(link);

                console.log(link + ' : ' + Lukas_Tweets[temp].fieldTwo + " : " + 
                    Lukas_Tweets[temp].fieldThree.substring(1));
                break;
            case "connor":
                temp = Math.floor((Math.random() * Connor_Tweets.length));
                link = "https://twitter.com/LiLCBaller23/status/" + 
                    Connor_Tweets[temp].fieldOne.substring(1);
                message.channel.send(link);

                console.log(link + " : " + Connor_Tweets[temp].fieldTwo + " : " + 
                    Connor_Tweets[temp].fieldThree.substring(1));
                break;
            case "fact": // random fact finder
                temp = Math.floor((Math.random() * random_facts.length));
                message.channel.send(random_facts[temp]);
                console.log(random_facts[temp]);
                break;
            case "join": // join current user's channel
                if (isAdmin(message.member)) {
                    message.member.voiceChannel.join()
                    .then(connection => { 
                        // do things if successfully connected
                    })
                    .catch(console.log);
                }
                break;
            case "leave": // leave current channel
                if (isAdmin(message.member)) { 
                    if (isPlaying) {
                        dispatcher.end();
                    }
                    queue = [];
                    video_info = [];
                    console.log("queue cleared");

                    bot_member.voiceChannel.leave(); 
                }
                break;
            case "play": // plays next song in queue
                if (queue.length > 0 && !isPaused && !isPlaying) {
                    getNext(message);
                }
                else {
                    if (queue.length === 0) { 
                        message.channel.send("queue is empty"); 
                    } else { 
                        message.channel.send("already playing"); 
                    }
                }
                break;
            case "skip": // skips current song and plays next if available
                if (queue.length > 0 && isPlaying) {
                    if (dispatcher.paused) { 
                        dispatcher.resume();
                        isPaused = false;
                    }
                    dispatcher.end();
                }
                else { 
                    if (queue.length === 0) {
                        message.channel.send("queue is empty");
                    } else {
                        message.channel.send("nothing is playing");
                    }
                }
                break;
            case "autoplay": // continues to play songs in queue
                if (isAuto) { 
                    isAuto = false;
                    message.channel.send("autoplay off");
                } else { 
                    isAuto = true;
                    message.channel.send("autoplay on");

                    if (queue.length > 0 && !isPlaying && !isPaused) {
                        getNext(message);
                    }
                }
                break;
            case "add": // adds a song to queue
                if (queue.length < queue_size) {
                    getSearchID(args, message, (id) => {
                        if (id === null) {
                            return message.channel.send("could not find");
                        }
                        
                        fetchVideoInfo(id, (error, videoInfo) => {
                            if (error) return console.log(error);

                            message.channel.send("added **" +  videoInfo.title + "**");
                            queue.push("https://www.youtube.com/watch?v=" + id);
                            video_info.push(videoInfo.title);
                        });
                    });
                } else { 
                    message.channel.send("queue is full"); 
                }
                break;
            case "addlink": // adds a song to queue based on yt link
                if (queue.length < queue_size) {
                    getID(args, message, (id) => {

                        if (args[0] === null) {
                            return message.channel.send("empty link");
                        } else if (args[0].substring(0, 32) != "https://www.youtube.com/watch?v=") {
                            return message.channel.send("link must follow following format: " + 
                                                        "https://www.youtube.com/watch?v=");
                        } else { 
                            fetchVideoInfo(id, (error, videoInfo) => {
                                if (error) return console.log(error);

                                message.channel.send("added **" +  videoInfo.title + "**");
                                queue.push(args[0]); 
                                video_info.push(videoInfo.title);
                            });
                        }
                    });
                } else { 
                    message.channel.send("queue is full"); 
                }
                break;
            case "pause": // pauses current song
                if (!dispatcher.paused) { 
                    dispatcher.pause();
                    isPaused = true;
                    isPlaying = false;
                }
                break;
            case "resume": // resumes current song
                if (dispatcher.paused) { 
                    dispatcher.resume();
                    isPaused = false;
                    isPlaying = true;
                }
                break;
            case "stop": // stops song
                if (isPlaying) { 
                    if (dispatcher.paused) { 
                        dispatcher.resume();
                        isPaused = false;
                    }
                    dispatcher.end(); 
                }
                break;
            case "clear": // clears queue ADMIN only
                if (isAdmin(message.member)) {
                    queue = [];
                    video_info = [];
                    console.log("queue cleared");
                } else {
                    console.log("not admin" + message.author)
                }
                break;
            case "remove": // removes a song from queue given a position
                if (args[0] === null || isNaN(args[0])) {
                    message.channel.send("enter a number between 1 - " + queue.length);
                }
                else {
                    temp = Number(args[0])
                    if (temp <= queue.length && temp >= 1) {
                        message.channel.send("removed " + video_info[temp - 1] + " from queue");

                        queue.splice(temp - 1, 1);
                        video_info.splice(temp - 1, 1); 
                    } else {
                       message.channel.send("enter a number between 1 - " + queue.length); 
                    }
                }
                break;
            case "print": // prints queue details
                let on_off = isAuto ? "ON" : "OFF";

                message.channel.send("CURRENT SIZE: " + queue.length + 
                    " CAPACITY: " + queue_size + " AUTOPLAY: " + on_off + '\n');
                
                for (let i = 0; i < queue.length; ++i) {
                    if (i === 0 && isPlaying) {
                        message.channel.send("(" + (i + 1) + ") " + "**" +  
                            video_info[i] + "** <- CURRENTLY PLAYING");
                    } else {
                        message.channel.send("(" + (i + 1) + ") " + "**" +  
                            video_info[i] + "**");
                    }
                }
                break;
            case "coinflip": // heads or tails coinflip
                message.channel.send("beginning coinflip...\n");
                setTimeout(() => { message.channel.send("..."); }, 1000);
                setTimeout(() => { message.channel.send(".."); }, 1000);
                setTimeout(() => { message.channel.send("."); }, 1000);
                setTimeout(() => {
                    temp = Math.floor((Math.random() * 2));
                    if (temp === 0) {  
                        message.channel.send("HEADS"); 
                    } else { 
                        message.channel.send("TAILS"); 
                    }
                }, 2000);
                break;
            default:
                message.channel.send("commands: \n" +
                    "!lukas !connor !coinflip !fact \n" + 
                    "!add [search] !addlink [yt link here] !remove [position] \n" +
                    "!play !skip !pause !resume !stop !print !autoplay \n");
                break;
        }
    }
});

client.on("disconnect", (event) => {
    console.log("disconnection: " + event.reason + " (" + event.code + ")");
});


client.on("error", (error) => {
    console.log("error: " + error);
});

//
//
// FUNCTIONS
//
//

// values for csv
function myCSV(id, time, message) {
    this.fieldOne = id;
    this.fieldTwo = time;
    this.fieldThree = message;
}

function isAdmin(member) {
    return member.hasPermission("ADMINISTRATOR");
}

function getChannel(message) {
    return message.member.voiceChannel;
}

function getSearchID(str, message, callback) {
    searchVideo(str, (id) => {
        if (id === null) { 
            message.channel.send("no results found"); 
        }
        callback(id);
    });
}

function getID(str, message, callback) {
    if (str[0] === null) {
        return message.channel.send("empty link");
    } else if (str[0].substring(0, 32) != "https://www.youtube.com/watch?v=") {
        return message.channel.send("link must follow following format: " + 
                                    "https://www.youtube.com/watch?v=");
    } else { 
        callback(getYouTubeID(str)); 
    }
}

function playMusic(id, message) {

    if (queue.length === 0) {
        return message.channel.send("queue is empty");
    }

    getChannel(message).join().then(connection => {

        // change video if error
        connection.on('error', (error) => {
            console.log(error);
            queue.shift();
            video_info.shift();
            getNext(message);
        });

        let stream = ytdl('https://www.youtube.com/watch?v=' + id, {
            filter: 'audioonly'
        });

        stream.on('error', (error) => {
          console.log(error);
        });

        dispatcher = connection.playStream(stream);

        dispatcher.on('error', (error) => {
            console.log(error);
            queue.shift();
            video_info.shift();
            getNext(message);
        });

        // adjust volume
        dispatcher.setVolume(0.25);

        isPlaying = true;

        // when finished check for autoplay
        dispatcher.on('end', () => {
            isPlaying = false;
            isPaused = false;

            setTimeout(() => {
                if (queue.length > 0) {
                    queue.shift();
                    video_info.shift();

                    if (isAuto && queue.length > 0) {
                        getNext(message);
                    }
                } else {
                    message.channel.send('queue is empty');
                }
            }, 1000);
        });
    }).catch(error => {
        console.log(error);
    });
}

// searches for video through yt api
function searchVideo(query, callback) {
    request("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + 
        encodeURIComponent(query) + "&key=" + config.yt_api_key, (error, response, body) => {
        let search_results = JSON.parse(body);
        if (!search_results.items[0]) { 
            callback(null); 
        } else { 
            callback(search_results.items[0].id.videoId); 
        }
    });
}

function getNext(message) {
    getID(queue, message, (new_id) => {
        playMusic(new_id, message);

        fetchVideoInfo(new_id, (error, videoInfo) => {
            if (error) return console.log(error);

            message.channel.send(" now playing: **" + videoInfo.title + "**");
            console.log("playing: " + videoInfo.title);
        });
    });
}

