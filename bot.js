"use strict";

const data = require("./data.js");
const music = require("./music.js");
const Discord = require("discord.js");

// bot login
const client = new Discord.Client();

// capacity of music queue
const queue_size = 10;

// read in data then login
async function boot() {
    await data.read_data();
    await client.login(data.config.token); 
}
boot();

client.on("ready", () => {
  console.log(client.user + " connected");
});

client.on("disconnect", (event) => {
    console.log("disconnection: " + event.reason + " (" + event.code + ")");
});

client.on("error", (error) => {
    console.log("error: " + error);
});

// evaluate messages
client.on("message", (message) => {

    // deny messages 
    if (!message.member) return;
    if (message.author.bot) return;
    if (getChannel(message) === null) { 
        return message.author.sendMessage("no");
    }

    // get bot member object
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

        // parse command and switch
        let args = message.content.substring(1).split(" ");
        let cmd = args[0].toLowerCase();
        args = args.splice(1);

        switch(cmd) {
            case "lukas": // random data finder from array
                message.channel.send(data.getRandom("lukas"));
                break;
            case "connor":
                message.channel.send(data.getRandom("connor"));
                break;
            case "fact": 
                message.channel.send(data.getRandom("fact"));
                break;
            case "join": // join current user's channel
                if (isAdmin(message.member)) {
                    message.member.voiceChannel.join()
                    .then(connection => { 
                        // do things if successfully connected
                    })
                    .catch((error) => {
                        console.log("join error: " + error);
                    });
                }
                break;
            case "leave": // leave current channel
                if (isAdmin(message.member)) { 
                    music.clearQueue(message);
                    bot_member.voiceChannel.leave(); 
                }
                break;
            case "play": // plays next song in queue
                music.playMusic(message);
                break;
            case "skip": // skips current song and plays next if available
                music.skipMusic(message);
                break;
            case "autoplay": // continues to play songs in queue, toggle on/off
                music.setAutoplay(message);
                break;
            case "add": // adds a song to queue
                music.addSearch(args[0], data.config.yt_api_key, message, queue_size);
                break;
            case "addlink": // adds a song to queue based on yt link
                music.addLink(args[0], message, queue_size);
                break;
            case "pause": // pauses current song
                music.pauseMusic(message);
                break;
            case "resume": // resumes current song
                music.resumeMusic(message);
                break;
            case "stop": // stops song
                music.stopMusic(message);
                break;
            case "clear": // clears queue ADMIN only
                if (isAdmin(message.member)) {
                    music.clearQueue(message);
                } else {
                    message.channel.send("not admin" + message.author);
                }
                break;
            case "remove": // removes a song from queue given a position
                music.removeMusic(args[0], message);
                break;
            case "print": // prints queue details
                music.printQueue(queue_size, message);
                break;
            case "coinflip": // heads or tails coinflip
                message.channel.send("beginning coinflip...\n");
                setTimeout(() => {
                    let temp = Math.floor((Math.random() * 2));
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

function isAdmin(member) {
    return member.hasPermission("ADMINISTRATOR");
}

function getChannel(message) {
    return message.member.voiceChannel;
}