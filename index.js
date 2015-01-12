var fs      = require('fs');
var Twitter = require('twitter');
var knex    = require('knex');
var argv    = require('optimist').argv;
var config  = JSON.parse(fs.readFileSync(argv.file,'utf8'));
var twitter = new Twitter(config.twitter.credentials);
var db      = knex(config.database);

twitter.stream('statuses/filter', config.twitter.stream, function (stream) {

    var tweetQueue = [];
    var readyToSave = true;

    stream.on('data', function (tweet) {
        tweetQueue.push(tweet);
    });

    stream.on('error', function(err){
        throw err;
    });

    setInterval(function(){

        // console.log('checking if tweets are ready to save');

        if (readyToSave && tweetQueue.length) {
            var readyTweets = tweetQueue.concat([]);
            tweetQueue = [];
            readyToSave = false;

            db('tweets').insert(readyTweets.map(function(tweet){
                return {
                    text: tweet.text.replace('@nixtrack','').trim(),
                    user_id: tweet.user.id,
                    user_screen_name: tweet.user.screen_name
                };
            })).then(function savedSuccessfully(){
                readyToSave = true;
            }).catch(function dbError(dbErr){
                console.error(dbErr);
                process.exit(1);
            });
        } else {
            // console.log('no tweets at this time.');
        }

    }, 3000);

});