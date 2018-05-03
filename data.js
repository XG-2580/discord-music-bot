"use strict";

const csv = require("csv");
const fs = require("fs");

var data = new function() {
	this.random_facts = [];
	this.Lukas_Tweets = [];
	this.Connor_Tweets = [];
	this.config = JSON.parse(fs.readFileSync("./auth.json", "utf-8"));
	// read in all the data for tweets and random facts
	this.read_data = function() {
		function wait(ms) {
		    return new Promise(resolve => { 
		        setTimeout(resolve, ms); 
		    }); 
		};
	    wait(0)
	    .then(() => {
	        let obj = csv();
	        obj.from.path("./data/LukasPrin_tweets.csv").to.array(data => {
	            for (let index = 0; index < data.length; ++index) {
	                this.Lukas_Tweets.push(new this.myCSV(data[index][0], data[index][1], data[index][2]));
	            }
	        });
	        return wait(0);
	    })
	    .then(() => {
	        let obj = csv();
	        obj.from.path("./data/LiLCBaller23_tweets.csv").to.array(data => {
	            for (let index = 0; index < data.length; ++index) {
	                this.Connor_Tweets.push(new this.myCSV(data[index][0], data[index][1], data[index][2]));    
	            }
	        });
	        return wait(0);
	    })
	    .then(() => {
	        this.random_facts = fs.readFileSync("./data/randomfacts.txt").toString().split('\n');
	        return wait(0);
	    })
	    .catch((error) => {
	    	console.log("reading in data error: " + error);
	    })
	};
	// function used for reading in CSV file
	this.myCSV = function(id, time, message) {
	    this.fieldOne = id;
	    this.fieldTwo = time;
	    this.fieldThree = message;
	};
	// returns random entry in any data array
	this.getRandom = function(name) {
		if (name === "lukas") {
			let temp = Math.floor((Math.random() * this.Lukas_Tweets.length));
	        let link = "https://twitter.com/LukasPrin/status/" + 
	            this.Lukas_Tweets[temp].fieldOne.substring(1);
	        console.log(link + ' : ' + this.Lukas_Tweets[temp].fieldTwo + " : " + 
	            this.Lukas_Tweets[temp].fieldThree.substring(1));
	        return link;
	    }
	    else if (name === "connor") {
	    	let temp = Math.floor((Math.random() * this.Connor_Tweets.length));
            let link = "https://twitter.com/LiLCBaller23/status/" + 
                this.Connor_Tweets[temp].fieldOne.substring(1);
            console.log(link + " : " + this.Connor_Tweets[temp].fieldTwo + " : " + 
                this.Connor_Tweets[temp].fieldThree.substring(1));
            return link;
	    }
	    else if (name === "fact") {
	    	let temp = Math.floor((Math.random() * this.random_facts.length));
            console.log(this.random_facts[temp]);
            return this.random_facts[temp];
	    }
	};
};

module.exports = data;