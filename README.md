## Discord Music Bot

Discord bot that can play music, downloaded from youtube, through a queue for everyone on the server. 

### Requirements

npm, node.js, Discord bot account, access to the Youtube API through Google

Requires an auth.json file:

```
{
  "token": "discord api token here",
  "yt_api_key": "youtube api token here"
}
```

I made the bot a little specific to the Discord server I use, so if you need any assistance setting it up or configuring it for your server contact me.

Also, there are probably some bugs and implementation details that I could have done better. If you find any, feel free to contact me for this as well.

#### Commands:
Takes the query and adds the first search result from Youtube into the queue
```
!add [search query]
```
Adds a direct link to the Youtube video to the queue.
```
!addlink [full youtube link]
```
Forces bot to join current channel (if it is not already in it) then plays the next audio in the queue.

!autoplay will toggle autoplay, play the next audio, and continue until the queue is empty.
```
!play
!autoplay
```
Skips current audio and plays next audio in queue if available
```
!skip
```
Stops, pauses, and resumes audio that is currently playing.
```
!stop 
!pause 
!resume
```
Prints the contents of the queue.
```
!print
```
!clear will clear the queue (admin only) and when given a position, !remove will take the audio out of the queue.
```
!clear
!remove [position in queue]
```
Both commands are admin only and cause the bot to the join the current channel and leave the channel it is in respectively.
```
!join 
!leave
```
#### Other commands:
Retrieves a random tweet from a friend's twitter account (data is stored in a csv file using Twitter's API). 

You can remove this feature by simply not requiring data.js and removing the commands from the bot.js.
```
!lukas
!connor
```
Same as above but for a collection of random facts I found online.
```
!fact
```
Returns heads or tails.
```
!coinflip
```

## License

This project is licensed under the MIT License - see the [LICENSE.md](LICENSE.md) file for details

