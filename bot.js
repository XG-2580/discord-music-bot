const Data = require("./data.js");
const Music = require("./music.js");
const Discord = require("discord.js");

// bot login
const client = new Discord.Client();

// read in data then login
async function boot() {
    await Data.read_data();
    await client.login(Data.config.token); 
}
boot();

let text_channel = null;
let bot_member = null;

// capacity of music queue
const queue_size = 10;
const search_result_size = 5;

client.on("ready", () => {
    console.log(client.user.username + " connected \n" + "client id: " + client.user.id);
    let server = client.guilds.get(client.guilds.firstKey());
    console.log("server name: " + server.name + "\n" + "server id: " + server.id);
    text_channel = getChannel("395259672980094986"); // server.id returns main text channel
    bot_member = server.members.get(client.user.id);
});

client.on("message", (message) => {

    // deny messages 
    if (!message.member) return;
    if (message.author.bot) return;
    if (message.channel.type === "dm") return;

    // basic responses
    const ramus = "ramus";
    let i, j;

    if (message.content.toLowerCase() === "hey ramus" || 
        message.content.toLowerCase() === "hi ramus" ||
        message.content.toLowerCase() === "sup ramus") {
        message.channel.send("hey " + message.author);
        return;
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
                text_channel.send(Data.getRandom("lukas"));
                break;
            case "connor":
                text_channel.send(Data.getRandom("connor"));
                break;
            case "fact": 
                text_channel.send(Data.getRandom("fact"));
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
                    Music.queue = [];
                    Music.search_results = [];
                    bot_member.voiceChannel.leave(); 
                }
                break;
            case "play": // plays next song in queue
                Music.playMusic(message, text_channel);
                break;
            case "skip": // skips current song and plays next if available
                Music.skipMusic(text_channel);
                break;
            case "autoplay": // continues to play songs in queue, toggle on/off
                Music.setAutoplay(message, text_channel);
                break;
            case "add": // adds a song to queue
                Music.addSearch(args, Data.config.yt_api_key, text_channel, queue_size);
                break;
            case "addlink": // adds a song to queue based on yt link
                Music.addLink(args[0], text_channel, queue_size);
                break;
            case "search":
                Music.listSearch(args, Data.config.yt_api_key, text_channel, search_result_size);
                break;
            case "clearsearch":
                Music.clearSearch(text_channel);
                break;
            case "pause": // pauses current song
                Music.pauseMusic(text_channel);
                break;
            case "resume": // resumes current song
                Music.resumeMusic(text_channel);
                break;
            case "stop": // stops song
                Music.stopMusic(text_channel);
                break;
            case "clear": // clears queue ADMIN only
                if (isAdmin(message.member)) {
                    Music.clearQueue(text_channel);
                } else {
                    text_channel.send("not admin" + message.author);
                }
                break;
            case "remove": // removes a song from queue given a position
                Music.removeMusic(args[0], text_channel);
                break;
            case "print": // prints queue details
                Music.printQueue(queue_size, text_channel);
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
                text_channel.send("commands: \n" +
                    "!lukas !connor !coinflip !fact !search \n" + 
                    "!add [search] !addlink [yt link here] !remove [position] \n" +
                    "!play !skip !pause !resume !stop !print !autoplay \n");
                break;
        }
    }
});

function isAdmin(member) {
    return member.hasPermission("ADMINISTRATOR");
}

function getChannel(id) {
    return client.channels.get(id);
}