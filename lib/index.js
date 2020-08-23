/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
import {} from "dotenv/config.js";
import tweet from "twitter-tweet";
import autohook from "twitter-autohook";
import fs from "fs";
import Twitter from "twitter-lite";
import unzalgo from "unzalgo";
const { clean } = unzalgo;
import _weirdToNormalChars from "weird-to-normal-chars";
const { weirdToNormalChars } = _weirdToNormalChars;
import replaceSpecialCharacters from "replace-special-characters";
import anglicize from "anglicize";
// import translitro from 'translitro';
// import Bleetify from 'bleetify';
const processTweetText = (tweet_text) =>
    typeof tweet_text === "undefined" ||
    tweet_text === null ||
    tweet_text === ""
        ? ""
        : anglicize(
              replaceSpecialCharacters(
                  weirdToNormalChars(clean(tweet_text.toString()))
              )
          )
              .toLowerCase()
              .trim();

const processLog = (reason) => {
    if (process.env.HEADLESS.toString().toUpperCase() === "TRUE") {
        console.log(JSON.stringify(reason));
    } else {
        console.dir(reason, { depth: null });
    }
};

const processError = (reason) => {
    if (process.env.HEADLESS.toString().toUpperCase() !== "TRUE") {
        processLog(reason);
    }
    console.error(JSON.stringify(reason));
};

const tweetThreadReply = async (thread, id, params) => {
    if (typeof thread === "undefined" || thread === null || thread === "") {
        return { thread, id, params };
    } else {
        return tweet.send(
            params || {
                subdomain: "api",
                version: "1.1",
                consumer_key: process.env.TWITTER_CONSUMER_KEY,
                consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                access_token_key:
                    process.env.TWITTER_ACCESS_TOKEN ||
                    process.env.ACCESS_TOKEN, // oauth
                access_token_secret:
                    process.env.TWITTER_ACCESS_TOKEN_SECRET ||
                    process.env.ACCESS_TOKEN_SECRET, // oauth
            },
            [thread].flat(Infinity), //.map((x) => Bleetify.bleet(x * 0.02))
            id,
            false
        );
    }
};
const stringify = (json) => {
    return JSON.stringify(json) + "\n";
};
const getSignature = (
    user_screen_name,
    bot_screen_name,
    tweet_tag_or_id,
    signature
) => {
    if (signature === "none" || !signature) {
        return "";
    }
    return signature
        .toString()
        .split("USER_SCREEN_NAME")
        .join(user_screen_name || "Twitter Human")
        .split("BOT_SCREEN_NAME")
        .join(bot_screen_name || "twetJs")
        .split("TWEET_ID_OR_TAG")
        .join(tweet_tag_or_id || "??");
};
const appendLog = (
    log_dir,
    module_name,
    log_name,
    jsonObject,
    optional_date_time
) => {
    const filename =
        log_dir +
        module_name +
        "." +
        log_name +
        "." +
        (optional_date_time || new Date().toISOString().slice(0, 10)) +
        ".json";
    fs.appendFile(filename, stringify(jsonObject), "utf8", (err) => {
        if (err) throw err;
    });
    processLog({ log_append: filename });
};
const getProperty = (obj, prop, optional_fallback) => {
    const fallback =
        typeof optional_fallback === "undefined" ? null : optional_fallback;
    if (typeof obj !== "object" || obj === null) {
        return fallback;
    } else {
        if (
            Object.prototype.hasOwnProperty.call(obj, prop) &&
            obj.length == 0
        ) {
            return fallback;
        } else {
            return Object.prototype.hasOwnProperty.call(obj, prop)
                ? obj[prop]
                : fallback;
        }
    }
};
const start = async () => {
    try {
        // user_SCREEN_NAME is replaced with the user's name.
        // bot_screen_name is replaced by the bot's twitter handle in reply.
        // Set SIGNATURE to 'none' to actually have no signature.
        // 'at' @twetJs if you need 'none' as a signature and we'll see. PRs welcome!
        // todo parameterize module_screen_name
        const module_screen_name = process.env.MODULE_SCREEN_NAME || "twetJs",
            signature =
                process.env.SIGNATURE ||
                " \nThanks, USER_SCREEN_NAME! \n\n@BOT_SCREEN_NAME #BOT_SCREEN_NAME \n['TWEET_ID_OR_TAG']",
            bot_name = process.env.BOT_NAME || module_screen_name,
            log_dir = process.env.LOG_DIR || "./data/logs/",
            { Autohook } = autohook,
            params = {
                subdomain: "api",
                version: "1.1",
                consumer_key: process.env.TWITTER_CONSUMER_KEY,
                consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                access_token_key:
                    process.env.TWITTER_ACCESS_TOKEN ||
                    process.env.ACCESS_TOKEN, // oauth
                access_token_secret:
                    process.env.TWITTER_ACCESS_TOKEN_SECRET ||
                    process.env.ACCESS_TOKEN_SECRET, // oauth
            },
            webhook = new Autohook();
        await webhook.removeWebhooks();
        webhook.on("event", async (event) => {
            try {
                appendLog(log_dir, bot_name, "event", event);
                processLog(event);
                for (const [key, value] of Object.entries(event)) {
                    console.log(
                        '{ "isoString" : "' + new Date().toISOString() + '" }'
                    );
                    if (Array.isArray(value)) {
                        appendLog(log_dir, bot_name, key, value);
                        processLog({ type: key });
                        if (event.tweet_create_events) {
                            const bot_user_id = event.for_user_id,
                                tweet_create_events = event.tweet_create_events.map(
                                    async (tweet) => {
                                        const tweet_id = tweet.id_str;
                                        if (tweet.user.id_str === bot_user_id) {
                                            appendLog(
                                                log_dir,
                                                bot_name,
                                                key + ".self",
                                                value
                                            );
                                            return {sub_type: 'self'};
                                        } else if (
                                            tweet.text
                                                .toString()
                                                .startsWith("RT")
                                        ) {
                                            appendLog(
                                                log_dir,
                                                bot_name,
                                                key + ".rt",
                                                value
                                            );
                                            return {sub_type: 'rt'};
                                        } else {
                                            appendLog(
                                                log_dir,
                                                bot_name,
                                                key + ".other",
                                                value
                                            );
                                            const in_reply_to_status_id =
                                                    tweet.in_reply_to_status_id_str,
                                                in_reply_to_screen_name =
                                                    tweet.in_reply_to_screen_name,
                                                user_name = tweet.user.name.toString(),
                                                user_screen_name = tweet.user.screen_name.toString(),
                                                extended_tweet = getProperty(
                                                    tweet,
                                                    "extended_tweet",
                                                    tweet
                                                ),
                                                display_text_range = getProperty(
                                                  extended_tweet,
                                                  "display_text_range",
                                                  [-Infinity, Infinity]
                                                ),
                                                user_tweet_text = getProperty(
                                                    extended_tweet,
                                                    "full_text",
                                                    extended_tweet.text
                                                ).substring(
                                                    display_text_range[0],
                                                    display_text_range[1]
                                                ),
                                                entities = getProperty(
                                                    extended_tweet,
                                                    "entities"
                                                ),
                                                user_mentions = getProperty(
                                                    entities,
                                                    "user_mentions"
                                                ),
                                                bot_user_mentions =
                                                    user_mentions === null ||
                                                    user_mentions === undefined
                                                        ? null
                                                        : user_mentions.find(
                                                              (obj) =>
                                                                  obj.id_str ===
                                                                  bot_user_id
                                                          ),
                                                bot_screen_name = getProperty(
                                                    bot_user_mentions,
                                                    "screen_name",
                                                    module_screen_name
                                                ),
                                                client = new Twitter(params),
                                                status_reply_to =
                                                    typeof in_reply_to_status_id ===
                                                        "undefined" ||
                                                    in_reply_to_status_id ===
                                                        null ||
                                                    in_reply_to_status_id === ""
                                                        ? ""
                                                        : await (async () => {
                                                              try {
                                                                  return await client.get(
                                                                      "statuses/show",
                                                                      {
                                                                          id: in_reply_to_status_id,
                                                                          tweet_mode:
                                                                              "extended",
                                                                      }
                                                                  );
                                                              } catch (e) {
                                                                  if (
                                                                      "errors" in
                                                                      e
                                                                  ) {
                                                                      if (
                                                                          e
                                                                              .errors[0]
                                                                              .code ===
                                                                          88
                                                                      ) {
                                                                          // Twitter API error
                                                                          processLog(
                                                                              {
                                                                                  e,
                                                                                  error: {
                                                                                      "x-rate-limit-reset": new Date(
                                                                                          e._headers.get(
                                                                                              "x-rate-limit-reset"
                                                                                          ) *
                                                                                              1000
                                                                                      ),
                                                                                  },
                                                                              }
                                                                          );
                                                                      } else {
                                                                          // some other kind of error , e.g. read-only API trying to POST
                                                                      }
                                                                  } else {
                                                                      // non-API error , e.g. network problem or invalid JSON in response
                                                                  }
                                                                  processError(
                                                                      e
                                                                  );
                                                                  return '';
                                                              }
                                                          })(),
                                                extended_tweet_reply_to = getProperty(
                                                    status_reply_to,
                                                    "extended_tweet",
                                                    status_reply_to
                                                ),
                                                reply_to_display_text_range = getProperty(
                                                  extended_tweet_reply_to,
                                                  "display_text_range",
                                                  [-Infinity, Infinity]
                                                ),
                                                in_reply_to =
                                                    typeof in_reply_to_status_id ===
                                                        "undefined" ||
                                                    in_reply_to_status_id ===
                                                        null ||
                                                    in_reply_to_status_id === ''
                                                        ? ''
                                                        : '@ ' +
                                                          in_reply_to_screen_name +
                                                          " SAYS: \n" +
                                                          processTweetText(
                                                              getProperty(
                                                                  extended_tweet_reply_to,
                                                                  "full_text",
                                                                  extended_tweet_reply_to.text
                                                              ).substring(
                                                                  reply_to_display_text_range[0]
                                                              )
                                                          )
                                                              .split("@")
                                                              .join("@ ")
                                                              .split("#")
                                                              .join("# ") +
                                                          " \n" +
                                                          "END @ " +
                                                          in_reply_to_screen_name +
                                                          " QUOTE \n";
                                            if (
                                                user_tweet_text
                                                    .toString()
                                                    .includes(
                                                        "@" + bot_screen_name
                                                    )
                                            ) {
                                                const thread = [
                                                        (
                                                            "@" +
                                                            user_screen_name +
                                                            "\n" + //', here you go!\n' +
                                                            // status + '\n' +
                                                            in_reply_to +
                                                            "\n" +
                                                            getSignature(
                                                                user_name,
                                                                bot_screen_name,
                                                                in_reply_to_status_id ||
                                                                    tweet_id,
                                                                signature
                                                            )
                                                        ).trim(),
                                                    ].flat(Infinity)
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + ".tweetThreadReply",
                                                    {tweetThreadReply: {thread, tweet_id, params}}
                                                );
                                                processLog(status_reply_to);
                                                tweetThreadReply(
                                                    thread,
                                                    tweet_id,
                                                    params
                                                ).catch(processError);
                                                return {sub_type: 'other.tweet'};
                                            } else {
                                                const indirect = {};
                                                indirect[key] = value;
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + ".indirect",
                                                    indirect
                                                );
                                                return {sub_type: 'other.indirect'};
                                            }
                                            return {sub_type: 'other.etc'};
                                        }
                                    }
                                );

                            const filtered_tweet_create_events = tweet_create_events.filter(
                                function (el) {
                                    return (
                                        el &&
                                        el.then &&
                                        typeof el.then === "function"
                                    );
                                }
                            );
                            if (
                                Array.isArray(filtered_tweet_create_events) &&
                                filtered_tweet_create_events.length > 0
                            ) {
                                Promise.all(
                                    filtered_tweet_create_events
                                ).then((completed) => processLog(completed));
                            }
                        }
                    } else {
                        // likely "for_user_id:", "user_has_blocked:"...
                        const nonArray = {};
                        nonArray[key] = value;
                        appendLog(log_dir, bot_name, "non-array", nonArray);
                        processLog(nonArray);
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
        if ("errors" in e) {
            if (e.errors[0].code === 88)
                // Twitter API error
                processLog(
                    '{ "e": {' +
                        e +
                        '}, "error" : { "x-rate-limit-reset" : ' +
                        new Date(e._headers.get("x-rate-limit-reset") * 1000) +
                        " } }"
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
const startSync = () => {
    try {
        start();
    } catch (e) {
        if ("errors" in e) {
            if (e.errors[0].code === 88)
                // Twitter API error
                processLog(
                    '{ "e": {' +
                        e +
                        '}, "error" : { "x-rate-limit-reset" : ' +
                        new Date(e._headers.get("x-rate-limit-reset") * 1000) +
                        " } }"
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
