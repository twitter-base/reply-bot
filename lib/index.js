/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https:// mozilla.org/MPL/2.0/. */

// import section
import {} from "dotenv/config.js";
// import tweet from "twitter-tweet";
import tweet from "../../twitter-tweet/lib/index.js";
import autohook from "twitter-autohook";
import fs from "fs";
import Twitter from "twitter-lite";
import unzalgo from "unzalgo";
const { clean } = unzalgo;
import _weirdToNormalChars from "weird-to-normal-chars";
const { weirdToNormalChars } = _weirdToNormalChars;
import replaceSpecialCharacters from "replace-special-characters";
import anglicize from "anglicize";
import emojiRegex from "emoji-regex/text.js";
import runes from 'runes';
import getPort from 'get-port';
import sleep from 'sleep-atomic';
// import translitro from 'translitro';
// import Bleetify from 'bleetify';

// polyfill & 'custom method for standard object' sections
if (!Object.prototype.hasOwnProperty.call(RegExp, 'escape')) {
  RegExp.escape = function(string) {
    // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
    // https:// github.com/benjamingr/RegExp.escape/issues/37
    return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
  };
}
if (!Object.prototype.hasOwnProperty.call(String, 'replaceAll')) {
  String.prototype.replaceAll = function(find, replace) {
    // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll
    // If you pass a RegExp to 'find', you _MUST_ include 'g' as a flag.
    // TypeError: "replaceAll must be called with a global RegExp" not included, will silently cause significant errors. _MUST_ include 'g' as a flag for RegExp.
    // String parameters to 'find' do not require special handling.
    // Does not conform to "special replacement patterns" when "Specifying a string as a parameter" for replace
    // Does not conform to "Specifying a function as a parameter" for replace
    return this.replace(
          Object.prototype.toString.call(find) == '[object RegExp]' ?
            find :
            new RegExp(RegExp.escape(find), 'g'),
          replace
        );
  }
}
if (!Object.prototype.hasOwnProperty.call(String, 'unlink')) {
  String.prototype.unlink = function() {
      return this
            .replaceAll("@", "@ ")
            .replaceAll("#", "# ");
  }
}
if (!Object.prototype.hasOwnProperty.call(String, 'normalizeCharacters')) {
  String.prototype.normalizeCharacters = function() {
      // translitro Bleetify
      return anglicize(
        replaceSpecialCharacters(
          weirdToNormalChars(
            clean(
              this.toString()
            )
          )
        )
      )
      .toLowerCase()
      .trim();
  }
}

// global function const declaration section
const // there are more const function variables to follow,
      // until near eof where there is the 'export' section
  processLog = (reason) => {
      if (process.env.HEADLESS.toString().toUpperCase().trim() === "TRUE") {
          console.log(JSON.stringify(reason));
      } else {
          console.dir(reason, { depth: null });
      }
  },
  processError = (reason) => {
      if ((process.env.HEADLESS || '').toString().toUpperCase().trim() !== "TRUE") {
          processLog(reason);
      }
      console.error(JSON.stringify(reason));
  },
  tweetThreadReply = async (thread, id, params) => {
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
  },
  stringify = (json) => {
      return JSON.stringify(json) + "\n";
  },
  getSignature = (
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
          .replaceAll("USER_SCREEN_NAME", user_screen_name || "Twitter Human")
          .replaceAll("BOT_SCREEN_NAME", bot_screen_name || "twetJs")
          .replaceAll("TWEET_ID_OR_TAG", tweet_tag_or_id || "??");
  },
  appendLog = (
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
  },
  getProperty = (obj, prop, optional_fallback) => {
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
  },
  getEmoji = text => { const regex = emojiRegex(); return text.toString().match(regex) },
  removeEmoji = text =>  { const regex = emojiRegex(); return text.toString().replace(regex, '').replaceAll(/\s\n\s/g, ' \n') },
  emojiCount = text => (getEmoji(text.toString()) || []).length,
  isEmojiRidden = text => {
    const characterCount = (runes(text.toString()) || []).length;
    const _emojiCount = emojiCount(text.toString());
    const firstCharactersEmojiCount = emojiCount(runes.substr(text, 0, 10).toString());
    const spaceCount = (text.toString().match(/ /g) || []).length
    const whitespaceCount = (text.toString().match(/[ ].*/g) || []).length
    console.dir({text, characterCount, _emojiCount, firstCharactersEmojiCount, spaceCount, whitespaceCount});
    if (_emojiCount > (spaceCount * .5) || _emojiCount > (whitespaceCount) || _emojiCount > (characterCount * 0.25) || firstCharactersEmojiCount > 3) {
      return _emojiCount
    } else {
      return false
    }
  },
  makeUnique = text => String.prototype.concat(...new Set(text)),
  cleanEmoji = text => {
    if (typeof text != 'undefined' && text != null && text != '' ) {
      const emojiCount = isEmojiRidden(text);
      if (emojiCount !== false ) {
        return { "text": removeEmoji(text),
                 "alterations": "\n[ Removed: " + emojiCount + " of " + (runes(makeUnique(getEmoji(text).join(''))).length) +
                 " emoji, including " +

                 runes.substr(makeUnique(getEmoji(text).join('')), 0,(runes(makeUnique(getEmoji(text).join(''))).length) > 8 ? 4 : 3).split().join(" ") +
                 ((runes(makeUnique(getEmoji(text).join(''))).length) > 3 ? runes.substr(makeUnique(getEmoji(text).join('')), ((runes(makeUnique(getEmoji(text).join(''))).length) > 4 ? -2 : -1), 0).split().join(" ") : '' )+" ] " +
                       "\n[ Removed: Uppercase, Fonts, Math, Diacritics ]"
        };
      } else {
        return { "text": text, "alterations": "\n[ Removed: Uppercase, Fonts, Math, Diacritics ]" };
      }
    } else {
        return { "text": text, "alterations": "\n[ Removed: Uppercase, Fonts, Math, Diacritics ]" };
    }
  },
  getNewPort = async () => {
                // Will use any port from 49152 to 65535, otherwise fall back to a random sport;
                return await getPort({port: getPort.makeRange(49152, 65535)});
              },
  { Autohook } = autohook,
  removeWebhooks = async () => {const _port = await getNewPort();  return await new Autohook({port: _port}).removeWebhooks()},
  start = async () => {
      try {
          // user_SCREEN_NAME is replaced with the user's name.
          // bot_screen_name is replaced by the bot's twitter handle in reply.
          // Set SIGNATURE to 'none' to actually have no signature.
          // 'at' @twetJs if you need 'none' as a signature and we'll see. PRs welcome!
          // todo parameterize module_screen_name
          const
            module_screen_name = process.env.MODULE_SCREEN_NAME || "twetJs",
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
            port = await getNewPort(),
            webhook = new Autohook({port: port}),
            removeWebhooks = async () => { await webhook.removeWebhooks(); };
          await removeWebhooks();
          sleep(5 * 1000);

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
                                                  cleaned_text = cleanEmoji(
                                                                    (getProperty(
                                                                      extended_tweet_reply_to,
                                                                      "full_text",
                                                                      extended_tweet_reply_to.text
                                                                  ) || '').substring(
                                                                      reply_to_display_text_range[0]
                                                                  ).normalizeCharacters(
                                                                  ).unlink()),
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
                                                                cleaned_text.text
                                                                   +
                                                              " \n" +
                                                              "END @ " +
                                                              in_reply_to_screen_name +
                                                              " QUOTE \n" +
                                                              cleaned_text.alterations
                                                      ,
                                                  reply_entities = getProperty(extended_tweet_reply_to, "entities", null),
                                                  urls = getProperty(reply_entities, "urls", null),
                                                  media_reply_entities = getProperty(extended_tweet_reply_to, "extended_entities", reply_entities),
                                                  media = getProperty(media_reply_entities, "media", null),
                                                  quoted_status_permalink = getProperty(
                                                    extended_tweet_reply_to,
                                                    "quoted_status_permalink",
                                                    null
                                                  ),
                                                  quoted_status_permalink_expanded = getProperty(
                                                    quoted_status_permalink,
                                                    "expanded",
                                                    null
                                                  )
                                                ;
                                              appendLog(
                                                  log_dir,
                                                  bot_name,
                                                  key + ".tweetThreadReply.replyTweet",
                                                  status_reply_to
                                              );
                                              if (
                                                  user_tweet_text
                                                      .toString()
                                                      .toLowerCase()
                                                      .includes(
                                                          "@" + bot_screen_name.toLowerCase()
                                                      )
                                              ) {
                                                  let reply_text = in_reply_to;
                                                  if (Array.isArray(urls) &&
                                                      urls.length > 0) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key + ".tweetThreadReply.urls",
                                                        urls
                                                    );
                                                    urls.forEach(urlValue => {
                                                        reply_text = reply_text
                                                                      .replaceAll(
                                                                        new RegExp(RegExp.escape(urlValue.url), 'ig'),
                                                                        urlValue.expanded_url === quoted_status_permalink_expanded ?
                                                                          " ['Quote-Tweet'] " :
                                                                          urlValue.expanded_url
                                                                      )
                                                      }
                                                    );
                                                  }
                                                  if (Array.isArray(media) &&
                                                      media.length > 0) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key + ".tweetThreadReply.urls.media",
                                                        media
                                                    );
                                                    media.forEach(urlValue => {
                                                        reply_text = reply_text
                                                                      .replaceAll(
                                                                        new RegExp(RegExp.escape(urlValue.url), 'ig'),
                                                                          urlValue.expanded_url
                                                                      )
                                                      }
                                                    );
                                                  }

                                                  appendLog(
                                                      log_dir,
                                                      bot_name,
                                                      key + ".tweetThreadReply.reply_text",
                                                      reply_text
                                                  );
                                                  const thread = [
                                                          (
                                                              "@" +
                                                              user_screen_name +
                                                              "\n" + //', here you go!\n' +
                                                              // status + '\n' +
                                                              reply_text +
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
                                  ),
                              filtered_tweet_create_events = tweet_create_events.filter(
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
  },
  startSync = () => {
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

// export section
export const bot = { start: start, startSync: startSync };
export default bot;
