const fetch = require("node-fetch");
const fetchVideoInfo = require("youtube-info");
const ytdl = require("ytdl-core");

module.exports = {
    queue: [],
    video_info: [],
    search_results: [],
    recentlySearched: false,
    isPlaying: false,
    isPaused: false,
    isAuto: false,
    isSkipped: false,
    dispatcher: null,
	addSearch: function(query, api_key, channel, capacity) {
        if (this.queue.length < capacity) {
            query = query.join(" ");
            if (query !== "") {
                if (this.recentlySearched && !isNaN(query)) {
                    let number = parseInt(query);
                    if (number > 0 && number <= this.search_results.length) {
                        let videoInfo = this.search_results[number-1];
                        this.queue.push(videoInfo.url);
                        this.video_info.push(videoInfo);
                        channel.send(`added **${videoInfo.title}** \n time: ${videoInfo.duration}s`);
                    }
                } else {
                    if (!this.recentlySearched && !isNaN(query)) {
                        return channel.send("try again");
                    }

                    fetch("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + 
                        encodeURIComponent(query) + "&key=" + api_key)
                	.then((response) => {
                		if (!response.ok) throw response;
                		return response.json();
                	})
                	.then((results) => {
                		return fetchVideoInfo(results.items[0].id.videoId);
                	})
                	.then((videoInfo) => {
                		this.queue.push(videoInfo.url);
                        this.video_info.push(videoInfo);
                        channel.send(`added **${videoInfo.title}** \n time: ${videoInfo.duration}s`);            	
                    })
                	.catch((error) => {
                		console.log("add error: " + error);
                	});
                }
            }   
        } else {
            channel.send("queue is full"); 
        }
    },
    addLink: function(link, channel, capacity) {
        if (this.queue.length < capacity) {
            if (ytdl.validateURL(link)) {
                fetchVideoInfo(ytdl.getURLVideoID(link))
                .then((videoInfo) => {
                    this.queue.push("https://www.youtube.com/watch?v=" + videoInfo.videoId);
                    this.video_info.push(videoInfo);
                    channel.send(`added **${videoInfo.title}** \n time: ${videoInfo.duration}s`);
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
    },
    listSearch: function(query, api_key, channel, list_size) {
        query = query.join(" ");
        if (query !== "") {
            this.search_results = [];
            fetch("https://www.googleapis.com/youtube/v3/search?part=id&type=video&q=" + encodeURIComponent(query) + "&key=" + api_key)
            .then((response) => {
                if (!response.ok) throw response;
                return response.json();
            })
            .then((results) => {
                const fetchLoop = async (n) => {
                    for (let i = 0; i < n; i++) {
                      let info = await fetchVideoInfo(results.items[i].id.videoId);
                      this.search_results.push(info);
                    }
                    return;
                }

                fetchLoop(list_size).then(() => {
                    this.recentlySearched = true;
                    let result_string = "";
                    for (let i = 0; i < list_size; i++) {
                        result_string += `${i+1}. **${this.search_results[i].title}** \n`;
                    }
                    
                    channel.send({embed: {
                            color: 0xD62D0C,
                            title: "search results for: " + query,
                            url: "https://www.youtube.com/results?search_query=" + encodeURIComponent(query),
                            description: result_string,
                            timestamp: new Date(),
                        }
                    });
                })
                .catch((error) => {
                    console.log("fetchLoop error: " + error);
                });
            })
            .catch((error) => {
                console.log("listSearch error: " + error);
            });
        }
    },
    clearSearch: function(channel) {
        this.search_results = [];
        this.recentlySearched = false;
        channel.send("search results cleared");
    },
    playMusic: function(message, channel) {

        if (this.queue.length > 0 && !this.isPaused && !this.isPlaying) {
            message.member.voiceChannel.join()
            .then(connection => {
                try {
                    channel.send(`now playing: **${this.video_info[0].title}**`);

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
                    if (this.dispatcher) {
                        this.dispatcher.on('end', (reason) => {
                            if (this.isPlaying) {
                                console.log("reason dispatcher ended: " + reason);
                                this.isPlaying = false;
                                this.isPaused = false;
                                setTimeout(() => {
                                    this.dispatcher = null;
                                    if (this.queue.length > 0) {
                                        this.queue.shift();
                                        this.video_info.shift();

                                        if ((this.isAuto || this.isSkipped) && this.queue.length > 0) {
                                            this.isSkipped = false;
                                            module.exports.playMusic(message, channel);
                                        }
                                    } else {
                                        channel.send('queue is empty');
                                    }
                                }, 6000);
                            }     
                        });
                    }                   
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
    },
    removeMusic: function(position, channel) {
        if (position === null || isNaN(position)) {
            channel.send(`enter a number between 1 - ${this.queue.length}`);
        } else {
            let temp = Number(position)
            if (temp <= this.queue.length && temp >= 1) {
                channel.send(`removed **${this.video_info[temp - 1].title}** from queue`);
                this.queue.splice(temp - 1, 1);
                this.video_info.splice(temp - 1, 1); 
            } else {
               channel.send(`enter a number between 1 - ${this.queue.length}`);
            }
        }
    },
    printQueue: function(capacity, channel) {
    	let on_off = this.isAuto ? "ON" : "OFF";
        let info_print = `CURRENT SIZE: ${this.queue.length} CAPACITY: ${capacity} AUTOPLAY: ${on_off} \n`;
        let queue_results = "";
        for (let i = 0; i < this.queue.length; ++i) {
            if (i === 0 && this.isPlaying) {
                queue_results += `(${i+1}) **${this.video_info[i].title}** <- CURRENTLY PLAYING`;
            } else {
                queue_results += `(${i+1}) **${this.video_info[i].title}**`;
            }
        }
        channel.send({embed: {
                color: 0xD62D0C,
                title: info_print,
                description: queue_results,
                timestamp: new Date(),
            }
        });
    },
    clearQueue: function(channel) {
        this.queue = [];
        this.video_info = [];
        channel.send("queue cleared");
    },
    setAutoplay: function(message, channel) {
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
    },
    skipMusic: function(channel) {
        if (this.queue.length > 0 && (this.isPlaying || this.isPaused)) {
            if (this.isPaused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.isSkipped = true;
            this.dispatcher.end();
        }
        else { 
            if (this.queue.length === 0) {
                channel.send("queue is empty");
            } else {
                channel.send("nothing is playing");
            }
        }
    },
    pauseMusic: function(channel) {
        if (!this.dispatcher.paused) { 
            this.dispatcher.pause();
            this.isPaused = true;
            this.isPlaying = false;
            channel.send("audio paused");
        }
    },
    resumeMusic: function(channel) {
        if (this.dispatcher.paused) { 
            this.dispatcher.resume();
            this.isPaused = false;
            this.isPlaying = true;
            channel.send("audio resumed");
        }
    },
    stopMusic: function(channel) {
        if (this.isPlaying) { 
            if (this.dispatcher.paused) { 
                this.dispatcher.resume();
                this.isPaused = false;
            }
            this.isAuto = false;
            this.dispatcher.end(); 
            channel.send("audio stopped");
        }
    }
};