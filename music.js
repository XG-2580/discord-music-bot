"use strict";

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
	this.addSearch = function(query, api_key, message, capacity) {
        if (this.queue.length < capacity) {
            if (query !== "") {
                fetch("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + api_key)
            	.then((response) => {
            		if (!response.ok) throw response;
            		return response.json();
            	})
            	.then((results) => {
            		return results.items[0].id.videoId;
            	})
            	.then((id) => {
            		return fetchVideoInfo(id);
            	})
            	.then((videoInfo) => {
            		this.queue.push("https://www.youtube.com/watch?v=" + videoInfo.videoId);
                    this.video_info.push(videoInfo);
                    message.channel.send("added **" +  videoInfo.title + "**" + " time: " + videoInfo.duration + "s");
            	})
            	.catch((error) => {
            		console.log("add error: " + error);
            	});
            }
        } else {
            message.channel.send("queue is full"); 
        }
    };
    this.addLink = function(link, message, capacity) {
        if (this.queue.length < capacity) {
            if (ytdl.validateURL(link)) {
                fetchVideoInfo(ytdl.getURLVideoID(link))
                .then((videoInfo) => {
                    this.queue.push("https://www.youtube.com/watch?v=" + videoInfo.videoId);
                    this.video_info.push(videoInfo);
                    message.channel.send("added **" +  videoInfo.title + "**" + " time: " + videoInfo.duration + "s");
                })
                .catch((error) => {
                    console.log("addlink error: " + error);
                }); 
            } else {
                message.channel.send("bad link");
            }
        } else { 
            message.channel.send("queue is full"); 
        } 
    };
    this.playMusic = function(message) {

        if (this.queue.length > 0 && !this.isPaused && !this.isPlaying) {
            message.member.voiceChannel.join()
            .then(connection => {
                try {
                    message.channel.send(" now playing: **" + this.video_info[0].title + "**");
                    console.log(" now playing: **" + this.video_info[0].title + "**");

                    this.dispatcher = connection.playStream(ytdl(this.queue[0], { 
                        filter: 'audioonly' })
                    );

                    this.dispatcher.passes = 3;
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
                                    module.exports.playMusic(message);
                                }
                                else {
                                    if (this.queue.length > 0) {
                                        message.channel.send('queue is empty');
                                    }
                                }
                            } else {
                                message.channel.send('queue is empty');
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
                message.channel.send("queue is empty"); 
            } else { 
                message.channel.send("already playing"); 
            }
        }
    };
    this.removeMusic = function(position, message) {
        if (position === null || isNaN(position)) {
            message.channel.send("enter a number between 1 - " + this.queue.length);
        } else {
            let temp = Number(position)
            if (temp <= this.queue.length && temp >= 1) {
                message.channel.send("removed " + this.video_info[temp - 1].title + " from queue");
                this.queue.splice(temp - 1, 1);
                this.video_info.splice(temp - 1, 1); 
            } else {
               message.channel.send("enter a number between 1 - " + this.queue.length); 
            }
        }
    };
    this.printQueue = function(capacity, message) {
    	let on_off = this.isAuto ? "ON" : "OFF";
        message.channel.send("CURRENT SIZE: " + this.queue.length + " CAPACITY: " + capacity + " AUTOPLAY: " + on_off + '\n');
        
        for (let i = 0; i < this.queue.length; ++i) {
            if (i === 0 && this.isPlaying) {
                message.channel.send("(" + (i + 1) + ") " + "**" + this.video_info[i].title + "** <- CURRENTLY PLAYING");
            } else {
                message.channel.send("(" + (i + 1) + ") " + "**" + this.video_info[i].title + "**");
            }
        }
    };
    this.clearQueue = function(message) {
        this.queue = [];
        this.video_info = [];
        message.channel.send("queue cleared");
    };
    this.setAutoplay = function(message) {
        if (this.isAuto) { 
            this.isAuto = false;
            message.channel.send("autoplay off");
        } else { 
            this.isAuto = true;
            message.channel.send("autoplay on");

            if (this.queue.length > 0 && !this.isPlaying && !this.isPaused) {
                this.playMusic(message);
            }
        }
    };
    this.skipMusic = function(message) {
        if (this.queue.length > 0 && (this.isPlaying || this.isPaused)) {
            if (this.isPaused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.dispatcher.end();
        }
        else { 
            if (this.queue.length === 0) {
                message.channel.send("queue is empty");
            } else {
                message.channel.send("nothing is playing");
            }
        }
    };
    this.pauseMusic = function(message) {
        if (!this.dispatcher.paused) { 
            this.dispatcher.pause();
            this.isPaused = true;
            this.isPlaying = false;
            message.channel.send("audio paused");
        }
    };
    this.resumeMusic = function(message) {
        if (this.dispatcher.paused) { 
            this.dispatcher.resume();
            this.isPaused = false;
            this.isPlaying = true;
            message.channel.send("audio resumed");
        }
    };
    this.stopMusic = function(message) {
        if (this.isPlaying) { 
            if (this.dispatcher.paused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.isAuto = false;
            this.dispatcher.end(); 
            message.channel.send("audio stopped");
        }
    };
};

module.exports = music;