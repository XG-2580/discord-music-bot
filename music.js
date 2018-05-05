const fetch = require("node-fetch");
const fetchVideoInfo = require("youtube-info");
const ytdl = require("ytdl-core");

var music = new function() {
	this.queue = [];
	this.video_info = [];
    this.isPlaying = false;
    this.isPaused = false;
    this.isAuto = false;
    this.dispatcher = null;
	this.addSearch = function(query, api_key, channel, capacity) {
        if (this.queue.length < capacity) {
            if (query !== "") {
                fetch("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + api_key)
            	.then((response) => {
            		if (!response.ok) throw response;
            		return response.json();
            	})
            	.then((results) => {
            		return fetchVideoInfo(results.items[0].id.videoId);
            	})
            	.then((videoInfo) => {
            		this.queue.push("https://www.youtube.com/watch?v=" + videoInfo.videoId);
                    this.video_info.push(videoInfo);
                    channel.send("added **" +  videoInfo.title + "**" + " time: " + videoInfo.duration + "s");
            	})
            	.catch((error) => {
            		console.log("add error: " + error);
            	});
            }
        } else {
            channel.send("queue is full"); 
        }
    };
    this.addLink = function(link, channel, capacity) {
        if (this.queue.length < capacity) {
            if (ytdl.validateURL(link)) {
                fetchVideoInfo(ytdl.getURLVideoID(link))
                .then((videoInfo) => {
                    this.queue.push("https://www.youtube.com/watch?v=" + videoInfo.videoId);
                    this.video_info.push(videoInfo);
                    channel.send("added **" +  videoInfo.title + "**" + " time: " + videoInfo.duration + "s");
                })
                .catch((error) => {
                    console.log("addlink error: " + error);
                }); 
            } else {
                channel.send("bad link");
            }
        } else { 
            channel.send("queue is full"); 
        } 
    };
    this.playMusic = function(message, channel) {

        if (this.queue.length > 0 && !this.isPaused && !this.isPlaying) {
            message.member.voiceChannel.join()
            .then(connection => {
                try {
                    channel.send("now playing: **" + this.video_info[0].title + "**");

                    this.dispatcher = connection.playStream(ytdl(this.queue[0], { 
                        filter: 'audioonly' })
                    );

                    this.dispatcher.passes = 2;
                    this.dispatcher.setVolume(0.25);
                    this.isPlaying = true;

                    this.dispatcher.on('debug', (info) => {
                        console.log("dispatcher debug: " + info);
                    });

                    // when finished check for autoplay
                    this.dispatcher.on('end', (reason) => {
                        console.log("reason dispatcher ended: " + reason);
                        this.isPlaying = false;
                        this.isPaused = false;
                        this.dispatcher.end();
                        this.dispatcher = null;
                        setTimeout(() => {
                            if (this.queue.length > 0) {
                                this.queue.shift();
                                this.video_info.shift();

                                if (this.isAuto && this.queue.length > 0) {
                                    module.exports.playMusic(message, channel);
                                }
                                else {
                                    if (this.queue.length > 0) {
                                        channel.send('queue is empty');
                                    }
                                }
                            } else {
                                channel.send('queue is empty');
                            }
                        }, 5000);      
                    });
                }
                catch (error) {
                    console.log("play error: " + error);
                }
            })
            .catch(error => {
                console.log("stream error: " + error);
            });
        } else {
            if (this.queue.length === 0) { 
                channel.send("queue is empty"); 
            } else { 
                channel.send("already playing"); 
            }
        }
    };
    this.removeMusic = function(position, channel) {
        if (position === null || isNaN(position)) {
            channel.send("enter a number between 1 - " + this.queue.length);
        } else {
            let temp = Number(position)
            if (temp <= this.queue.length && temp >= 1) {
                channel.send("removed " + this.video_info[temp - 1].title + " from queue");
                this.queue.splice(temp - 1, 1);
                this.video_info.splice(temp - 1, 1); 
            } else {
               channel.send("enter a number between 1 - " + this.queue.length); 
            }
        }
    };
    this.printQueue = function(capacity, channel) {
    	let on_off = this.isAuto ? "ON" : "OFF";
        channel.send("CURRENT SIZE: " + this.queue.length + " CAPACITY: " + capacity + " AUTOPLAY: " + on_off + '\n');
        
        for (let i = 0; i < this.queue.length; ++i) {
            if (i === 0 && this.isPlaying) {
                channel.send("(" + (i + 1) + ") " + "**" + this.video_info[i].title + "** <- CURRENTLY PLAYING");
            } else {
                channel.send("(" + (i + 1) + ") " + "**" + this.video_info[i].title + "**");
            }
        }
    };
    this.clearQueue = function(channel) {
        this.queue = [];
        this.video_info = [];
        channel.send("queue cleared");
    };
    this.setAutoplay = function(message, channel) {
        if (this.isAuto) { 
            this.isAuto = false;
            channel.send("autoplay off");
        } else { 
            this.isAuto = true;
            channel.send("autoplay on");

            if (this.queue.length > 0 && !this.isPlaying && !this.isPaused) {
                this.playMusic(message, channel);
            }
        }
    };
    this.skipMusic = function(channel) {
        if (this.queue.length > 0 && (this.isPlaying || this.isPaused)) {
            if (this.isPaused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.dispatcher.end();
        }
        else { 
            if (this.queue.length === 0) {
                channel.send("queue is empty");
            } else {
                channel.send("nothing is playing");
            }
        }
    };
    this.pauseMusic = function(channel) {
        if (!this.dispatcher.paused) { 
            this.dispatcher.pause();
            this.isPaused = true;
            this.isPlaying = false;
            channel.send("audio paused");
        }
    };
    this.resumeMusic = function(channel) {
        if (this.dispatcher.paused) { 
            this.dispatcher.resume();
            this.isPaused = false;
            this.isPlaying = true;
            channel.send("audio resumed");
        }
    };
    this.stopMusic = function(channel) {
        if (this.isPlaying) { 
            if (this.dispatcher.paused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.isAuto = false;
            this.dispatcher.end(); 
            channel.send("audio stopped");
        }
    };
};

module.exports = music;