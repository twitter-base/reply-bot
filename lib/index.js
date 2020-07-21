/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {} from 'dotenv/config.js';
import { tweet } from '../../twitter-tweet/lib/index.js';
import pkg from 'twitter-autohook';
import fs from 'fs';
const processError = (reason) => {
    if (process.env.HEADLESS === 'TRUE') {
        console.error(JSON.stringify(reason));
    } else {
        console.dir(reason, { depth: null });
        console.error(JSON.stringify(reason));
    }
};
const tweetThreadReply = async (thread, id, params) => {
    return tweet.send(
        params || {
            subdomain: 'api',
            version: '1.1',
            consumer_key: process.env.TWITTER_CONSUMER_KEY,
            consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
            access_token_key: process.env.TWITTER_ACCESS_TOKEN || process.env.ACCESS_TOKEN, // oauth
            access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET, // oauth
        },
        [thread + '\n[' + id.toString() + ']'].flat(Infinity),
        id
    );
};
const stringify = (json) => {
    return JSON.stringify(json) + '\n';
};
const getSignature = (user_screen_name, bot_screen_name, signature) => {
    if (signature === 'none' || !signature) {
        return '';
    }
    return signature
        .toString()
        .split('USER_SCREEN_NAME')
        .join(user_screen_name || 'Twitter Human')
        .split('BOT_SCREEN_NAME')
        .join(bot_screen_name || 'twetJs');
};
const appendLog = (log_dir, module_name, log_name, jsonObject, optional_date_time) => {
    fs.appendFile(
        log_dir +
            module_name +
            '.' +
            log_name +
            '.' +
            (optional_date_time || new Date().toISOString().slice(0, 10)) +
            '.json',
        stringify(jsonObject),
        'utf8',
        (err) => {
            if (err) throw err;
        }
    );
};
const processTweetText = (tweet_text) => {
    return tweet_text.toString().toLowerCase();
};
const getProperty = (obj, prop, optional_fallback) => {
    // bot_user_mentions === null || bot_user_mentions === undefined || bot_user_mentions.length == 0
    const fallback = typeof optional_fallback === 'undefined' ? null : optional_fallback;
    if (typeof obj !== 'object' || obj === null) {
        return fallback;
    } else {
        if (Object.prototype.hasOwnProperty.call(obj, prop) && obj.length == 0) {
            return fallback;
        } else {
            return Object.prototype.hasOwnProperty.call(obj, prop) ? obj[prop] : fallback;
        }
    }
};
const start = async () => {
    try {
        // user_SCREEN_NAME is replaced with the user's name.
        // bot_screen_name is replaced by the bot's twitter handle in reply.
        // Set SIGNATURE to 'none' to actually have no signature.
        // 'at' @twetJs if you need 'none' as a signature and we'll see. PRs welcome!
        const module_screen_name = process.env.MODULE_SCREEN_NAME || 'twetJs',
            signature = process.env.SIGNATURE || 'Thanks, USER_SCREEN_NAME!\n\n@BOT_SCREEN_NAME #BOT_SCREEN_NAME',
            bot_name = process.env.BOT_NAME || module_screen_name,
            log_dir = process.env.LOG_DIR || './data/logs/',
            { Autohook } = pkg,
            params = {
                subdomain: 'api',
                version: '1.1',
                consumer_key: process.env.TWITTER_CONSUMER_KEY,
                consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                access_token_key: process.env.TWITTER_ACCESS_TOKEN || process.env.ACCESS_TOKEN, // oauth
                access_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET || process.env.ACCESS_TOKEN_SECRET, // oauth
            },
            webhook = new Autohook();
        console.log('Verifying credentials…');
        await webhook.removeWebhooks();
        webhook.on('event', async (event) => {
            try {
                appendLog(log_dir, bot_name, 'event', event);
                if (process.env.HEADLESS === 'TRUE') {
                    console.log(JSON.stringify(event));
                } else {
                    console.dir(event, { depth: null });
                }
                for (let [key, value] of Object.entries(event)) {
                    console.log('{ "isoString" : "' + new Date().toISOString() + '" }');
                    if (Array.isArray(value)) {
                        appendLog(log_dir, bot_name, key, value);
                        console.log('{ "array" : "' + key + '" }');
                        if (event.tweet_create_events) {
                            const bot_user_id = event.for_user_id,
                                tweet_create_events = event.tweet_create_events.map(async (tweet) => {
                                    const tweet_id = tweet.id_str;
                                    if (tweet.user.id_str === bot_user_id) {
                                        appendLog(log_dir, bot_name, key + '.self', value);
                                    } else {
                                        appendLog(log_dir, bot_name, key + '.other', value);
                                        const in_reply_to_status_id = tweet.in_reply_to_status_id_str,
                                            in_reply_to_screen_name = tweet.in_reply_to_screen_name,
                                            user_name = tweet.user.name.toString(),
                                            user_screen_name = tweet.user.screen_name.toString(),
                                            extended_tweet = getProperty(tweet, 'extended_tweet', tweet),
                                            user_tweet_text = getProperty(
                                                extended_tweet,
                                                'full_text',
                                                extended_tweet.text
                                            ),
                                            user_tweet_text_processed = processTweetText(user_tweet_text),
                                            entities = getProperty(extended_tweet, 'entities'),
                                            user_mentions = getProperty(entities, 'user_mentions'),
                                            bot_user_mentions =
                                                user_mentions === null || user_mentions === undefined
                                                    ? null
                                                    : user_mentions.find((obj) => {
                                                        return obj.id_str === bot_user_id;
                                                    }),
                                            bot_screen_name = getProperty(
                                                bot_user_mentions,
                                                'screen_name',
                                                module_screen_name
                                            ),
                                            in_reply_to =
                                                typeof in_reply_to_status_id === 'undefined' ||
                                                in_reply_to_status_id === null ||
                                                in_reply_to_status_id === ''
                                                    ? ''
                                                    : '@' +
                                                      in_reply_to_screen_name +
                                                      ' SAYS: \n' +
                                                      processTweetText(
                                                          'placeholder:' + in_reply_to_status_id.toString()
                                                      ) +
                                                      ' \n' +
                                                      'END @' +
                                                      in_reply_to_screen_name +
                                                      ' QUOTE \n' +
                                                      ' \n',
                                            in_reply_toExists = in_reply_to === null || in_reply_to === '' ? 0 : 1,
                                            status =
                                                '@' +
                                                user_screen_name +
                                                ' SAYS: \n' +
                                                user_tweet_text_processed +
                                                ' \n' +
                                                'END @' +
                                                user_screen_name +
                                                ' QUOTE \n',
                                            statusExists = status === null || status === '' ? 0 : 1;
                                        tweetThreadReply(
                                            [
                                                '@' +
                                                    user_screen_name +
                                                    ', here\'s the past ' +
                                                    (in_reply_toExists + statusExists) +
                                                    ' tweets! \n' +
                                                    ' \n' +
                                                    in_reply_to +
                                                    status +
                                                    ' \n' +
                                                    getSignature(user_name, bot_screen_name, signature),
                                            ].flat(Infinity),
                                            tweet_id,
                                            params
                                        ).catch(processError);
                                    }
                                    return tweet_id;
                                });
                            Promise.all(tweet_create_events).then((completed) =>
                                console.log(JSON.stringify(completed))
                            );
                        }
                    } else {
                        // likely "for_user_id:", "user_has_blocked:"...
                        const keyValue = '{ "' + key + '" : ' + value + ' }';
                        appendLog(log_dir, bot_name, 'non-array', keyValue);
                        console.log(keyValue);
                    }
                }
            } catch (e) {
                processError(e);
            }
        });
        await webhook.start();
        await webhook.subscribe({
            oauth_token: process.env.TWITTER_ACCESS_TOKEN,
            oauth_token_secret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });
    } catch (e) {
        processError(e);
    }
};
const startSync = () => {
    try {
        start();
    } catch (e) {
        if ('errors' in e) {
            if (e.errors[0].code === 88)
                // Twitter API error
                console.log(
                    '{ "error" : { "x-rate-limit-reset" : ' +
                        new Date(e._headers.get('x-rate-limit-reset') * 1000) +
                        ' } }'
                );
            else {
                // some other kind of error , e.g. read-only API trying to POST
            }
        } else {
            // non-API error , e.g. network problem or invalid JSON in response
        }
        processError(e);
    }
};

export const bot = { start: start, startSync: startSync };
export default bot;

///////////////////////////////////////
// 100 ,000 requests per day to the /statuses/mentions_timeline endpoint. This is in addition to existing user-level rate limits (75 requests / 15-minutes
// 1279945534917263361

// client
//     .get("statuses/mentions_timeline.json")
//     .then(
//         results => {
//             console.log("results" , results) ;
//         }
//     )
//     .catch(console.error) ;

// Numeric vs. string IDs
// Twitter uses numeric IDs that in practice can be up to 18 characters long. Due to rounding errors , it's unsafe to use numeric IDs in JavaScript. Always set stringify_ids: true when possible , so that Twitter will return strings instead of numbers , and rely on the id_str field , rather than on the id field.
// const rateLimits = await client.get("statuses/show" , {
//   id: "1016078154497048576"
// }) ;

// const tweets = await client.get("statuses/home_timeline") ;
// console.log(`Rate: ${tweets._headers.get('x-rate-limit-remaining')} / ${tweets._headers.get('x-rate-limit-limit')}`) ;
// const delta = (tweets._headers.get('x-rate-limit-reset') * 1000) - Date.now()
// console.log(`Reset: ${Math.ceil(delta / 1000 / 60)} minutes`) ;

// await client.post("friendships/create" , {
//   screen_name: "TextSponge"
// }) ;
// const users = await client.post("users/lookup" , {
//   screen_name: "longScreenName1 ,longerScreeName2 ,… ,veryLongScreenName100"
// }) ;

// const user = new Twitter({
//   consumer_key: process.env.TWITTER_CONSUMER_KEY , // from Twitter.
//   consumer_secret: process.env.TWITTER_CONSUMER_SECRET , // from Twitter.
// }) ;

// const response = await user.getBearerToken() ;
// const app = new Twitter({
//   bearer_token: response.access_token
// }) ;
// {

// const welcomeMessageID = "abc" ;

// await client.put(
//   "direct_messages/welcome_messages/update" ,
//   {
//     id: welcomeMessageID
//   },
//   {
//     message_data: {
//       text: "Welcome!!!"
//     }
//   }
// );

//oauth
// const client = new Twitter({
//   consumer_key: "xyz" ,
//   consumer_secret: "xyz"
// }) ;

// client
//   .getRequestToken("http://callbackurl.com")
//   .then(res =>
//     console.log({
//       reqTkn: res.oauth_token ,
//       reqTknSecret: res.oauth_token_secret
//     })
//   )
//   .catch(console.error) ;
// // Then you redirect your user to https://api.twitter.com/oauth/authenticate?oauth_token=xyz123abc , and once you get the verifier and the token , you pass them on to the next stage of the authentication.

// const client = new Twitter({
//   consumer_key: "xyz" ,
//   consumer_secret: "xyz"
// }) ;

// client
//   .getAccessToken({
//     oauth_verifier: oauthVerifier ,
//     oauth_token: oauthToken
//   })
//   .then(res =>
//     console.log({
//       accTkn: res.oauth_token ,
//       accTknSecret: res.oauth_token_secret ,
//       userId: res.user_id ,
//       screenName: res.screen_name
//     })
//   )
//   .catch(console.error) ;
// And this will return you your access_token and access_token_secret.
//
// const response = await client.get('account/verify_credentials') ;
// expect(response).toHaveProperty('screen_name') ;
//       const user = new Twitter({
//     consumer_key: TWITTER_CONSUMER_KEY ,
//     consumer_secret: TWITTER_CONSUMER_SECRET ,
//   }) ;

//   const response = await user.getBearerToken() ;
//   expect(response).toMatchObject({
//     token_type: 'bearer' ,
//   }) ;
//   const app = new Twitter({
//     bearer_token: response.access_token ,
//   }) ;
//   const rateLimits = await app.get('application/rate_limit_status' , {
//     resources: 'statuses' ,
//   }) ;
//   // This rate limit is 75 for user auth and 300 for app auth
//   expect(
//     rateLimits.resources.statuses['/statuses/retweeters/ids'].limit ,
//   ).toEqual(300) ;
// }) ;
// const client = new Twitter({
//   consumer_key: "xyz" // from Twitter.
//   consumer_secret: "xyz" // from Twitter.
//   access_token_key: "abc" // from your User (oauth_token)
//   access_token_secret: "abc" // from your User (oauth_token_secret)
// }) ;

// const parameters = {
//   track: "#bitcoin ,#litecoin ,#monero" ,
//   follow: "422297024 ,873788249839370240" ,  // @OrchardAI , @tylerbuchea
//   locations: "-122.75 ,36.8 ,-121.75 ,37.8" ,  // Bounding box -  San Francisco
// };

// function htmlEscape(string) {
//   return string
//     .replace(/&/g , '&amp ;')
//     .replace(/</g , '&lt ;')
//     .replace(/>/g , '&gt ;') ;
// }

// function randomString() {
//   return Math.random().toString(36).substr(2 , 11) ;
// }

// POST with JSON body and no parameters per https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event
// const response = await client.post('direct_messages/events/new' , {
//   event: {
//     type: 'message_create' ,
//     message_create: {
//       target: {
//         recipient_id: DIRECT_MESSAGE_RECIPIENT_ID ,
//       },
//       message_data: {
//         text: message + STRING_WITH_SPECIAL_CHARS ,
//         // https://developer.twitter.com/en/docs/direct-messages/sending-and-receiving/api-reference/new-event#message-data-object
//         // says "URL encode as necessary" , but applying encodeURIComponent results in verbatim %NN being sent
//       },
//     },
//   },
// }) ;
// expect(response).toMatchObject({
//   event: {
//     type: 'message_create' ,
//     id: expect.stringMatching(/^\d+$/) ,
//     created_timestamp: expect.any(String) ,
//     message_create: {
//       message_data: {
//         text: htmlEscape(message + STRING_WITH_SPECIAL_CHARS) ,
//       },
//     },
//   },
// }) ;
// const response = await client.post('direct_messages/indicate_typing' , {
//    recipient_id: DIRECT_MESSAGE_RECIPIENT_ID ,
//  }) ;
//     const message = randomString() ; // prevent overzealous abuse detection

// https://developer.twitter.com/en/docs/tweets/post-and-engage/api-reference/post-statuses-update
// const response = await client.post('statuses/update' , {
//   status: STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS ,
// }) ;

// expect(response).toMatchObject({
//   text: htmlEscape(
//     STRING_WITH_SPECIAL_CHARS + message + STRING_WITH_SPECIAL_CHARS ,
//   ),
// }) ;
// const id = response.id_str ;
// const deleted = await client.post('statuses/destroy' , {
//   id ,
// }) ;
// expect(deleted).toMatchObject({
//   id_str: id ,
// }) ;

// let uploadClient ;
// beforeAll(() => (uploadClient = newClient('upload'))) ;

// it('should upload a picture , and add alt text to it' , async () => {
//   // Upload picture
//   const base64Image = new Buffer(TEST_IMAGE).toString('base64') ;
//   const mediaUploadResponse = await uploadClient.post('media/upload' , {
//     media_data: base64Image ,
//   }) ;
//   expect(mediaUploadResponse).toMatchObject({
//     media_id_string: expect.any(String) ,
//   }) ;

//   // Set alt text
//   const imageAltString = 'Animated picture of a dancing banana' ;
//   await uploadClient.post('media/metadata/create' , {
//     media_id: mediaUploadResponse.media_id_string ,
//     alt_text: { text: imageAltString },
//   }) ;
// }) ;

//  let client ;
//  beforeAll(() => (client = newClient())) ;
//  /**
//   * For this test you need to have opted to receive messages from anyone at https://twitter.com/settings/safety
//   * and your demo app needs to have access to read , write , and direct messages.
//   */
//  it('can update welcome message' , async () => {
//    const newWelcomeMessage = await client.post(
//      'direct_messages/welcome_messages/new' ,
//      {
//        welcome_message: {
//          name: 'simple_welcome-message 01' ,
//          message_data: {
//            text: 'Welcome!' ,
//          },
//        },
//      },
//   );

//    const updatedWelcomeMessage = await client.put(
//      'direct_messages/welcome_messages/update' ,
//      {
//        id: newWelcomeMessage.welcome_message.id ,
//      },
//      {
//        message_data: {
//          text: 'Welcome!!!' ,
//        },
//      },
//    );

//    expect(updatedWelcomeMessage.welcome_message.message_data.text).toEqual(
//      'Welcome!!!' ,
//    );
//  }) ;
// let client ;
//  beforeAll(() => (client = newClient())) ;

//  it('should get full text of retweeted tweet' , async () => {
//    const response = await client.get('statuses/show' , {
//      id: '1019171288533749761' , // a retweet by @dandv of @naval
//      tweet_mode: 'extended' ,
//    }) ;
//    // This is @naval's original tweet
//    expect(response.retweeted_status.full_text).toEqual(
//      '@jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income exceeds your burn rate , or when you can make a living doing what you love.' ,
//    );
//    // For the retweet , "truncated" comes misleadingly set to "false" from the API , and the "full_text" is limited to 140 chars
//    expect(response.truncated).toEqual(false) ;
//    expect(response.full_text).toEqual(
//      'RT @naval: @jdburns4 “Retirement” occurs when you stop sacrificing today for an imagined tomorrow. You can retire when your passive income…' ,
//    );
//  }) ;

//  it('should have favorited at least one tweet ever' , async () => {
//    const response = await client.get('favorites/list') ;
//    expect(response[0]).toHaveProperty('id_str') ;
//  }) ;

//  it('should fail to follow unspecified user' , async () => {
//    expect.assertions(1) ;
//    try {
//      await client.post('friendships/create') ;
//    } catch (e) {
//      expect(e).toMatchObject({
//        errors: [{ code: 108 , message: 'Cannot find specified user.' }] ,
//      }) ;
//    }
//  }) ;

//  it('should follow user' , async () => {
//    const response = await client.post('friendships/create' , {
//      screen_name: 'mdo' ,
//    }) ;
//    expect(response).toMatchObject({
//      name: 'Mark Otto' ,
//    }) ;
//  }) ;

//  it('should unfollow user' , async () => {
//    const response = await client.post('friendships/destroy' , {
//      user_id: '15008676' ,
//    }) ;
//    expect(response).toMatchObject({
//      name: 'Dan Dascalescu' ,
//    }) ;
//  }) ;

//  it('should get details about 100 users with 18-character ids' , async () => {
//    const userIds = [
//      …Array(99).fill('928759224599040001') ,
//      '711030662728437760' ,
//    ].join(' ,') ;
//    const expectedIds = [
//      { id_str: '928759224599040001' },
//      { id_str: '711030662728437760' },
//    ];
//    // Use POST per https://developer.twitter.com/en/docs/accounts-and-users/follow-search-get-users/api-reference/get-users-lookup
//    const usersPost = await client.post('users/lookup' , {
//      user_id: userIds ,
//    }) ;
//    delete usersPost._headers ; // to not confuse Jest - https://github.com/facebook/jest/issues/5998#issuecomment-446827454
//    expect(usersPost).toMatchObject(expectedIds) ;
//    // Check if GET worked the same
//    const usersGet = await client.get('users/lookup' , { user_id: userIds }) ;
//    expect(usersGet.map((u) => u)).toMatchObject(expectedIds) ; // map(u => u) is an alternative to deleting _headers
//  }) ;

//  it('should be unable to get details about suspended user' , async () => {
//    const nonexistentScreenName = randomString() + randomString() ;
//    try {
//      // https://twitter.com/fuckyou is actually a suspended user , but the API doesn't differentiate from nonexistent users
//      await client.get('users/lookup' , {
//        screen_name: `fuckyou ,${nonexistentScreenName}` ,
//      }) ;
//    } catch (e) {
//      expect(e).toMatchObject({
//        errors: [{ code: 17 , message: 'No user matches for specified terms.' }] ,
//      }) ;
//    }
//  }) ;

//  it('should get timeline' , async () => {
//    const response = await client.get('statuses/user_timeline' , {
//      screen_name: 'twitterapi' ,
//      count: 2,
//    }) ;
//    expect(response).toHaveLength(2) ;
//  }) ;

// Endpoint  Resource family POST limit window POST per user limit POST per app limit
// POST statuses/update
// create content  3 hours*  300*  300*
// POST statuses/retweet/:id
// create content  3 hours*  300*  300*
// POST favorites/create
// favorites 24 hours  1000  1000
// POST friendships/create
// friendships 24 hours  400 1000
// POST direct_messages/events/new
// direct messages 24 hours  1000  15000
// Endpoint  Resource family Requests / window (user auth) Requests / window (app auth)
// GET account/verify_credentials  application 75  0
// GET application/rate_limit_status application 180 180
// GET favorites/list  favorites 75  75
// GET followers/ids followers 15  15
// GET followers/list  followers 15  15
// GET friends/ids friends 15  15
// GET friends/list  friends 15  15
// GET friendships/show  friendships 180 15
// GET geo/id/:place_id  geo 75  0
// GET help/configuration  help  15  15
// GET help/languages  help  15  15
// GET help/privacy  help  15  15
// GET help/tos  help  15  15
// GET lists/list  lists 15  15
// GET lists/members lists 900 75
// GET lists/members/show  lists 15  15
// GET lists/memberships lists 75  75
// GET lists/ownerships  lists 15  15
// GET lists/show  lists 75  75
// GET lists/statuses  lists 900 900
// GET lists/subscribers lists 180 15
// GET lists/subscribers/show  lists 15  15
// GET lists/subscriptions lists 15  15
// GET search/tweets search  180 450
// GET statuses/lookup statuses  900 300
// GET statuses/mentions_timeline  statuses  75  0
// GET statuses/retweeters/ids statuses  75  300
// GET statuses/retweets_of_me statuses  75  0
// GET statuses/retweets/:id statuses  75  300
// GET statuses/show/:id statuses  900 900
// GET statuses/user_timeline  statuses  900 1500
// GET trends/available  trends  75  75
// GET trends/closest  trends  75  75
// GET trends/place  trends  75  75
// GET users/lookup  users 900 300
// GET users/search  users 900 0
// GET users/show  users 900 900
// GET users/suggestions users 15  15
// GET users/suggestions/:slug users 15  15
// GET users/suggestions/:slug/members users 15  15
// const stream = client.stream("statuses/filter" , parameters)
//   .on("start" , response => console.log("start"))
//   .on("data" , tweet => console.log("data" , tweet.text))
//   .on("ping" , () => console.log("ping"))
//   .on("error" , error => console.log("error" , error))
//   .on("end" , response => console.log("end")) ;

// Per user or per Developer App
// Rate limiting of the standard API is primarily on a per-user basis — or more accurately described , per user access token. If a method allows for 15 requests per rate limit window , then it allows 15 requests per window per access token.

// When using OAuth 2.0 Bearer Token , rate limits are determined globally for the entire Developer App. If a method allows for 180 requests per rate limit window , then it allows you to make 15 requests per window — on behalf of your App. This limit is considered completely separately from per-user limits.

// 15-minute windows
// Rate limits are divided into 15 minute intervals. All endpoints require authentication , so there is no concept of unauthenticated calls and rate limits.

// There are two initial buckets available for GET requests: 15 calls every 15 minutes , and 180 calls every 15 minutes.

// HTTP headers and response codes
// Use the HTTP headers in order to understand where the App is at for a given rate limit , on the method that was just utilized.

// Note that the HTTP headers are contextual. When using OAuth 2.0 Bearer Token , they indicate the rate limit for the App context. When using OAuth 1.0a User Context , they indicate the rate limit for that user-application context.

// x-rate-limit-limit: the rate limit ceiling for that given endpoint
// x-rate-limit-remaining: the number of requests left for the 15 minute window
// x-rate-limit-reset: the remaining window before the rate limit resets , in UTC epoch seconds
// When an App exceeds the rate limit for a given standard API endpoint , the API will return a HTTP 429 “Too Many Requests” response code , and the following error will be returned in the response body:

//  { "errors": [ { "code": 88 , "message": "Rate limit exceeded" } ] }

// To better predict the rate limits available , consider periodically using GET application / rate_limit_status. Like the rate limiting HTTP headers , this resource’s response will indicate the rate limit status for the calling context — when using OAuth 2.0 Bearer Token , the limits will pertain to that auth context. When using OAuth 1.0a User Context , the limits will pertain to the application-user context.

// GET and POST request limits
// Rate limits on reads from the system (GET) are defined on a per user and per App basis , while rate limits on writes into the system (POST) are defined solely at the user account level. In other words , for reading rate limits consider the following scenario:

// If user A launches application Z, and app Z makes 10 calls to user A’s mention timeline in a 15 minute window , then app Z has 5 calls left to make for that window
// Then user A launches application X, and app X calls user A’s mention timeline 3 times , then app X has 12 calls left for that window
// The remaining value of calls on application X is isolated from application Z’s , despite the same user A
// Contrast this with write allowances , which are defined on a per user basis. So , if user A ends up posting 5 Tweets with application Z, then for that same period , regardless of any other application that user A opens , those 5 POSTs will count against any other application acting on behalf of user A during that same window of time.

// Lastly , there may be times when the rate limit values that are returned are inconsistent , or cases where no headers are returned at all. Perhaps memcache has been reset , or one memcache was busy so the system spoke to a different instance: the values may be inconsistent now and again. There is a best effort to maintain consistency , with a tendency towards giving an application extra calls if there is an inconsistency.

// Tips to avoid being Rate Limited
// The tips below are there to help you code defensively and reduce the possibility of being rate limited. Some application features that you may want to provide are simply impossible in light of rate limiting , especially around the freshness of results. If real-time information is an aim of your application , look into the Streaming APIs.

// Caching
// Store API responses in your application or on your site if you expect a lot of use. For example , don’t try to call the Twitter API on every page load of your website landing page. Instead , call the API infrequently and load the response into a local cache. When users hit your website load the cached version of the results.

// Prioritize active users
// If your site keeps track of many Twitter users (for example , fetching their current status or statistics about their Twitter usage) , consider only requesting data for users who have recently signed into your site.

// Adapt to the search results
// If your application monitors a high volume of search terms , query less often for searches that have no results than for those that do. By using a back-off you can keep up to date on queries that are popular but not waste cycles requesting queries that very rarely change. Alternatively , consider using the Streaming APIs and filter on your search terms.

// Use OAuth 2.0 Bearer Token as a “reserve”
// Requests using OAuth 2.0 Bearer Token are evaluated in a separate context to an App's per-user rate limits. For many scenarios , you may want to use this additional rate limit pool as a “reserve” for your typical user-based operations.

// Deny-listing
// If an application abuses the rate limits , it will be deny-listed. Deny-listed apps are unable to get a response from the Twitter API. If you or your application has been deny-listed and you think there has been a mistake , you can use our Platform Support forms to request assistance. Please include the following information:

// If you are using the standard REST API , make a call to the GET application / rate_limit_status from the account or computer which you believe to be deny-listed.
// Explain why you think your application was deny-listed.
// Describe in detail how you have fixed the problem that you think caused you to be deny-listed.

// Streaming API
// The Streaming API has rate limiting and access levels that are appropriate for long-lived connections. See the Streaming APIs documentation for more details.

// Leveraging the Streaming API is a great way to free-up your rate limits for more inventive uses of the Twitter API.

// Rate Limiting information for the Streaming API is detailed on Connecting to a streaming endpoint.

// Exponential back-off pattern for streaming
// If the initial reconnect attempt is unsuccessful , your client should continue attempting to reconnect using an exponential back-off pattern until it successfully reconnects.
// Regardless of how your client gets disconnected , you should configure your app to reconnect immediately. If your first reconnection attempt is unsuccessful , we recommend that your app implement an exponential back-off pattern in subsequent reconnection attempts (e.g. wait 1 second , then 2 seconds , then 4, 8, 16 , etc) , with some reasonable upper limit. If this upper limit is reached , you should configure your client to notify your team so that you can investigate further.

// Limits per window per resource
// The API rate limit window duration is 15 minutes. Visit our standard API Rate Limit: Chart page to see the limits by resource.

// Note that endpoints/resources not listed in the above chart default to 15 requests per allotted user.
/////////////probably broken
// import Twitter from "twitter-lite" ;
// import { success , failure } from "./libs/response-lib" ;

// export async function main(event , context , callback) {
// const data = JSON.parse(event.body) ;
// const client = new Twitter({
// subdomain: "api" ,
// consumer_key: "REDACTED" ,
// consumer_secret: "REDACTED" ,
// access_token_key: "REDACTED" ,
// access_token_secret: "REDACTED"
// }) ;
// const upload_client = new Twitter({
// subdomain: "upload" ,
// consumer_key: "REDACTED" ,
// consumer_secret: "REDACTED" ,
// access_token_key: "REDACTED" ,
// access_token_secret: "REDACTED"
// }) ;

// if(data.img)
// {
// try
// {
// const url = await upload_client.post("media/upload" , null , {
// media_data: data.img ,
// }) ;
// const resp = await client.post("statuses/update" , null , {
// status: data.tweet ,
// media_ids: url.media_id_string ,
// }) ;
// callback(null , success(resp.id_str)) ;
// } catch (e) {
// console.log(e) ;
// callback(null , failure({ status: e})) ;
// }
// }
// else
// {
// try
// {
// const resp = await client.post("statuses/update" , null , {
// status: data.tweet ,
// /* lat: 37.7821120598956 ,
// long: -122.400612831116 ,
// display_coordinates: true ,*/
// }) ;
// callback(null , success(resp.id_str)) ;
// } catch (e) {
// console.log(e) ;
// callback(null , failure({ status: false })) ;
// }
// }

// }
/////////////probably broken
// // To stop the stream:
// process.nextTick(() => stream.destroy()) ;  // emits "end" and "error" events
// To stop a stream , call stream.destroy(). That might take a while though , if the stream receives a lot of traffic. Also , if you attempt to destroy a stream from an on handler , you may get an error about writing to a destroyed stream. In that case , try to defer the destroy() call:

// process.nextTick(() => stream.destroy()) ;
// After calling stream.destroy() , you can recreate the stream , if you wait long enough - see the "should reuse stream N times" test. Note that Twitter may return a "420 Enhance your calm" error if you switch streams too fast. There are no response headers specifying how long to wait , and the error , as well as streaming limits in general , are poorly documented. Trial and error has shown that for tracked keywords , waiting 20 to 30 seconds between re-creating streams was enough. Remember to also set up the .on() handlers again for the new stream.

// async function sayHi(event) => {
//   // We check that the message is a direct message
//   if (!event.direct_message_events) {
//     return ;
//   }

//   // Messages are wrapped in an array , so we'll extract the first element
//   const message = event.direct_message_events.shift() ;

//   // We check that the message is valid
//   if (typeof message === 'undefined' || typeof message.message_create === 'undefined') {
//     return ;
//   }

//   // We filter out message you send , to avoid an infinite loop
//   if (message.message_create.sender_id === message.message_create.target.recipient_id) {
//     return ;
//   }

//   // Prepare and send the message reply
//   const senderScreenName = event.users[message.message_create.sender_id].screen_name ;

//   const requestConfig = {
//     url: 'https://api.twitter.com/1.1/direct_messages/events/new.json' ,
//     oauth: oAuthConfig ,
//     json: {
//       event: {
//         type: 'message_create' ,
//         message_create: {
//           target: {
//             recipient_id: message.message_create.sender_id ,
//           },
//           message_data: {
//             text: `Hi @${senderScreenName}! 👋` ,
//           },
//         },
//       },
//     },
//   };
//   await post(requestConfig) ;
// }
// async function markAsRead(messageId , senderId , auth) {
//   const requestConfig = {
//     url: 'https://api.twitter.com/1.1/direct_messages/mark_read.json' ,
//     form: {
//       last_read_event_id: messageId ,
//       recipient_id: senderId ,
//     },
//     oauth: auth ,
// };

// async function indicateTyping(senderId , auth) {
//   const requestConfig = {
//     url: 'https://api.twitter.com/1.1/direct_messages/indicate_typing.json' ,
//     form: {
//       recipient_id: senderId ,
//     },
//     oauth: auth ,
// };

// https://dev.to/alexluong/comprehensive-guide-to-twitter-webhook-1cd3
// https://classic.yarnpkg.com/blog/2016/11/24/offline-mirror/

// function followFollowers(twitbot) {
//     twitbot.get('followers/list' , { screen_name: constants.twitBot_screen_name }, function(err , data , response) {
//         if(err) {
//             console.log('utils: twitter follower list search error , err = '+JSON.stringify(err)) ;
//         } else {
//             console.log('utils: twitter follower list search success') ;
//             _.forEach(data.users , function(item){
//                 twitbot.post('friendships/create' , { id: item.id_str }, function (err , data , response) {
//                     if(err) {
//                         console.log('utils: twitter follow error , err = '+JSON.stringify(err)) ;
//                     } else {
//                         console.log('utils: twitter follow success') ;
//                     }
//                 }) ;
//             }) ;
//         }
//     }) ;
// }
