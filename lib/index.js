/* Copyright 2020 Drewry Pope
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https:// mozilla.org/MPL/2.0/. */

// import section
import {} from 'dotenv/config.js';
import tweet from 'twitter-tweet';
import autohook from 'twitter-autohook';
import fs from 'fs';
import Twitter from 'twitter-lite';
import unzalgo from 'unzalgo';
const { clean } = unzalgo;
import _weirdToNormalChars from 'weird-to-normal-chars';
const { weirdToNormalChars } = _weirdToNormalChars;
import replaceSpecialCharacters from 'replace-special-characters';
import anglicize from 'anglicize';
import emojiRegex from 'emoji-regex/text.js';
import runes from 'runes';
import getPort from 'get-port';
// import translitro from 'translitro';
// import Bleetify from 'bleetify';

// polyfill & 'custom method for standard object' sections
if (!Object.prototype.hasOwnProperty.call(RegExp, 'escape')) {
    /* jshint ignore:start */
    RegExp.escape = function (string) {
        // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#Escaping
        // https:// github.com/benjamingr/RegExp.escape/issues/37
        return string.replace(/[.*+\-?^${}()|[\]\\]/gu, '\\$&'); // $& means the whole matched string
    };
    /* jshint ignore:end */
}
if (!Object.prototype.hasOwnProperty.call(String, 'replaceAll')) {
    String.prototype.replaceAll = function (find, replace) { // jshint ignore:line
        // https:// developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/replaceAll
        // If you pass a RegExp to 'find', you _MUST_ include 'g' as a flag.
        // TypeError: "replaceAll must be called with a global RegExp" not included, will silently cause significant errors. _MUST_ include 'g' as a flag for RegExp.
        // String parameters to 'find' do not require special handling.
        // Does not conform to "special replacement patterns" when "Specifying a string as a parameter" for replace
        // Does not conform to "Specifying a function as a parameter" for replace
        return this.replace(
            Object.prototype.toString.call(find) === '[object RegExp]' ?
                find
                : new RegExp(RegExp.escape(find), 'g'),
            replace
        );
    };
}

// global function const declaration section
const // there are more const function variables to follow,
    // until near eof where there is the 'export' section
    { Autohook } = autohook,
    getNewPort = async () => {
        // Will use any port from 49152 to 65535, otherwise fall back to a random port;
        return getPort({ port: getPort.makeRange(49152, 65535), });
    },
    removeWebhooks = async () => {
        const _port = await getNewPort();
        return new Autohook({ port: _port, }).removeWebhooks();
    },
    processLog = (reason) => {
        if (process.env.HEADLESS.toString().toUpperCase().trim() === 'TRUE') {
            console.log(JSON.stringify(reason));
        } else {
            console.dir(reason, { depth: null, });
        }
    },
    processError = (reason) => {
        if (
            (process.env.HEADLESS || '').toString().toUpperCase().trim() !==
            'TRUE'
        ) {
            processLog(reason);
        }
        console.error(JSON.stringify(reason));
    },
    tweetThreadReply = async (thread, id, params) => {
        if (typeof thread === 'undefined' || thread === null || thread === '') {
            return { thread, id, params, };
        } else {
            return tweet.send(
                params || {
                    subdomain: 'api',
                    version: '1.1',
                    consumer_key: process.env.TWITTER_CONSUMER_KEY,
                    consumer_secret: process.env.TWITTER_CONSUMER_SECRET,
                    access_token_key:
                        process.env.TWITTER_ACCESS_TOKEN ||
                        process.env.ACCESS_TOKEN, // oauth
                    access_token_secret:
                        process.env.TWITTER_ACCESS_TOKEN_SECRET ||
                        process.env.ACCESS_TOKEN_SECRET, // oauth
                },
                [thread,].flat(Infinity), //.map(x => Bleetify.bleet(x * 0.02))
                id,
                false
            );
        }
    },
    stringify = (json) => {
        return JSON.stringify(json) + '\n';
    },
    getSignature = (
        user_screen_name,
        bot_screen_name,
        tweet_tag_or_id,
        signature
    ) => {
        if (signature === 'none' || !signature) {
            return '';
        }
        return signature
            .toString()
            .replaceAll('USER_SCREEN_NAME', user_screen_name || 'Twitter Human')
            .replaceAll('BOT_SCREEN_NAME', bot_screen_name || 'twetJs')
            .replaceAll('TWEET_ID_OR_TAG', tweet_tag_or_id || '??');
    },
    trimPath = (text) => text.replaceAll(/[\\/]$/gu, ''),
    appendLog = (
        log_dir,
        module_name,
        log_name,
        jsonObject,
        optional_date_time
    ) => {
        const filename =
            trimPath(log_dir) +
            '/' +
            module_name +
            '.' +
            log_name +
            '.' +
            (optional_date_time || new Date().toISOString().slice(0, 10)) +
            '.json';
        fs.appendFile(filename, stringify(jsonObject), 'utf8', (err) => {
            if (err) {
                throw err;
            }
        });
        processLog({ log_append: filename, });
    },
    getProperty = (obj, prop, optional_fallback) => {
        const fallback =
            typeof optional_fallback === 'undefined' ? null : optional_fallback;
        if (typeof obj !== 'object' || obj === null) {
            return fallback;
        } else {
            if (
                Object.prototype.hasOwnProperty.call(obj, prop) &&
                obj.length === 0
            ) {
                return fallback;
            } else {
                return Object.prototype.hasOwnProperty.call(obj, prop) ?
                    obj[prop]
                    : fallback;
            }
        }
    },
    unlink = (text) => {
        return text.toString().replaceAll('@', '@ ').replaceAll('#', '# ');
    },
    normalizeCharacters = (text) => {
        // translitro Bleetify
        return anglicize(
            replaceSpecialCharacters(weirdToNormalChars(clean(text.toString())))
        )
            .toLowerCase()
            .trim();
    },
    getEmoji = (text) => {
        const regex = emojiRegex();
        return text.toString().match(regex);
    },
    normalizeSpaces = (text) => text.replaceAll(/ +/gu, ' '),
    normalizeNewlines = (text) =>
        text.replaceAll(/\n\n+/gu, '\n\n').replaceAll(/\n\n+/gu, '\n\n'),
    trimAllLines = (text) =>
        text
            .split('\n')
            .map((line) => line.trim())
            .join('\n'),
    collapseExtraSingleSpaces = (text) => {
        let output = normalizeNewlines(normalizeSpaces(trimAllLines(text)));
        const spaceMatches = output.match(/[ \n\t]\S( \S)+ \S \S[ \n\t]/gu);
        // const newlineMatches = text.match(/[ \n\t]\S[ \t]*(\n\S[ \t]*)+\n/gu);
        // const newlineMatches = output.match(/\n{0,1}(\s{0,1}[ ?!.]{0,2}\S*)+\n/gu);
        const newlineMatches = output.match(
            /(^|\n)+(\S{1}[ ?!.]{0,2}(\s|$)+)+/gu
        );
        const tabMatches = output.match(
            /[ \n\t]\S[ \n]*(\t\S[ \n]*)+[ \n\t]/gu
        );
        let count = 0;
        if (
            typeof spaceMatches !== 'undefined' &&
            spaceMatches &&
            spaceMatches.length > 0
        ) {
            spaceMatches.forEach((match) => {
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        match.replaceAll(/\s/gu, '') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
                count += 1;
            });
        }
        if (
            typeof newlineMatches !== 'undefined' &&
            newlineMatches &&
            newlineMatches.length > 0
        ) {
            newlineMatches.forEach((match) => {
                const intermediate = match.split('\n\n');
                count += intermediate.length;
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        intermediate
                            .map((value) => value.replaceAll(/\s/gu, ''))
                            .join('\n\n') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
            });
        }
        if (
            typeof tabMatches !== 'undefined' &&
            tabMatches &&
            tabMatches.length > 0
        ) {
            tabMatches.forEach((match) => {
                output = output.replaceAll(
                    match,
                    match.charAt(0).replaceAll(/\S/gu, '') +
                        match.replaceAll(/\s/gu, '') +
                        match.charAt(match.length - 1).replaceAll(/\S/gu, '')
                );
                count += 1;
            });
        }
        return { text: output, count, };
    },
    removeEmoji = (text) => {
        const regex = emojiRegex();
        return collapseExtraSingleSpaces(
            normalizeSpaces(
                text
                    .toString()
                    .replaceAll(regex, ' ')
                    .replaceAll(/\s\n\s/gu, ' \n')
            )
        );
    },
    emojiCount = (text) => (getEmoji(text.toString()) || []).length,
    isEmojiRidden = (text) => {
        const characterCount = (runes(text.toString()) || []).length;
        const _emojiCount = emojiCount(text.toString());
        const firstCharactersEmojiCount = emojiCount(
            runes.substr(text, 0, 10).toString()
        );
        const spaceCount = (text.toString().match(/ /gu) || []).length;
        const whitespaceCount = (text.toString().match(/[ ].*/gu) || []).length;
        console.dir({
            text,
            characterCount,
            _emojiCount,
            firstCharactersEmojiCount,
            spaceCount,
            whitespaceCount,
        });
        if (
            _emojiCount > 3 &&
            (_emojiCount > spaceCount * 0.5 ||
                _emojiCount > whitespaceCount ||
                _emojiCount > characterCount * 0.25 ||
                firstCharactersEmojiCount > 3)
        ) {
            return _emojiCount;
        } else {
            return false;
        }
    },
    makeUnique = (text) => String.prototype.concat(...new Set(text)),
    cleanText = (text) => {
        console.dir({ text, });
        return normalizeCharacters(unlink(text));
    },
    cleanEmoji = (text) => {
        if (typeof text !== 'undefined' && text !== null && text !== '') {
            const emojiCount = isEmojiRidden(text);
            const cleanedText = removeEmoji(text);
            if (emojiCount !== false) {
                return {
                    text: cleanedText.text,
                    alterations:
                        '\n[ Removed: ' +
                        emojiCount +
                        ' of ' +
                        runes(makeUnique(getEmoji(text).join(''))).length +
                        ' Emoji, including ' +
                        makeUnique(
                            runes.substr(
                                makeUnique(getEmoji(text).join('')),
                                0,
                                runes(makeUnique(getEmoji(text).join('')))
                                    .length > 11 ? 3 : 2
                            ) +
                                makeUnique(
                                    runes.substr(
                                        makeUnique(getEmoji(text).join('')),
                                        runes(
                                            makeUnique(getEmoji(text).join(''))
                                        ).length > 7 ?
                                            runes(
                                                makeUnique(
                                                    getEmoji(text).join('')
                                                )
                                            ).length - 3
                                            : runes(
                                                makeUnique(
                                                    getEmoji(text).join('')
                                                )
                                            ).length - 2,
                                        runes(
                                            makeUnique(getEmoji(text).join(''))
                                        ).length - 1
                                    )
                                )
                        ) +
                        ' ]' +
                        (cleanedText.count > 0 ?
                            '\n[ Collapsed: ' +
                              cleanedText.count +
                              ' Exploded Word' +
                              (cleanedText.count === 1 ? '' : 's') +
                              ' ]'
                            : '') +
                        '\n[ Removed: Uppercase, Fonts, Math, Diacritics ]',
                };
            } else {
                return {
                    text: collapseExtraSingleSpaces(
                        normalizeSpaces(text.toString())
                    ).text.replaceAll(/\s\n\s/gu, ' \n'),
                    alterations:
                        (cleanedText.count > 0 ?
                            '\n[ Collapsed: ' +
                              cleanedText.count +
                              ' Exploded Word' +
                              (cleanedText.count === 1 ? '' : 's') +
                              ' ]'
                            : '') +
                        '\n[ Removed: Uppercase, Fonts, Math, Diacritics ]',
                };
            }
        } else {
            return {
                text: text,
                alterations: '\n[ Error: Received empty text? ]',
            };
        }
    },
    urlExpand = (text, urls, mediaUrls, skipUrls) => {
        let output = text;
        if (Array.isArray(urls) && urls.length > 0) {
            urls.forEach((urlValue) => {
                output = output.replaceAll(
                    new RegExp(RegExp.escape(urlValue.url), 'ig'),
                    (typeof skipUrls !== 'undefined' ?
                        [skipUrls,].flat(Infinity)
                        : []
                    ).includes(urlValue.expanded_url) ?
                        ' [\'Quote-Tweet\'] '
                        : urlValue.expanded_url
                );
            });
        }
        if (Array.isArray(mediaUrls) && mediaUrls.length > 0) {
            mediaUrls.forEach((urlValue) => {
                output = output.replaceAll(
                    new RegExp(RegExp.escape(urlValue.url), 'ig'),
                    urlValue.expanded_url
                );
            });
        }
        return output;
    },
    // leftTrimAllLines = text => text.split('\n').map(line => line.replaceAll(/^\s+/gu,'')).join('\n'),
    // rightTrimAllLines = text => text.split('\n').map(line => line.replaceAll(/\s+$/gu,'')).join('\n'),
    replaceEmptyLines = (text, replace) =>
        text.replaceAll(/\n\s*\n/gu, replace),
    reduceEmptyLinesToSingle = (text) => replaceEmptyLines(text, '\n\n'),
    // removeEmptyLines = text => replaceEmptyLines(text, '\n'),
    // oneSpaceBeforeEachNewLine = text => rightTrimAllLines(text).replaceAll('\n', ' \n'),
    fixAmp = (text) => text.replaceAll('&amp;', '&'),
    start = async () => {
        try {
            // user_SCREEN_NAME is replaced with the user's name.
            // bot_screen_name is replaced by the bot's twitter handle in reply.
            // Set SIGNATURE to 'none' to actually have no signature.
            // 'at' @twetJs if you need 'none' as a signature and we'll see. PRs welcome!
            // todo parameterize module_screen_name
            const module_screen_name =
                    process.env.MODULE_SCREEN_NAME || 'twetJs',
                signature =
                    process.env.SIGNATURE ||
                    ' \nThanks, USER_SCREEN_NAME! \n\n@BOT_SCREEN_NAME #BOT_SCREEN_NAME \n[\'TWEET_ID_OR_TAG\']',
                bot_name = process.env.BOT_NAME || module_screen_name,
                data_dir = trimPath(process.env.DATA_DIR || './data'),
                log_dir = data_dir + '/logs',
                params = {
                    subdomain: 'api',
                    version: '1.1',
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
                webhook = new Autohook({ port: port, });
            if (!fs.existsSync(log_dir)) {
                fs.mkdirSync(log_dir);
            }
            await removeWebhooks();
            webhook.on('event', async (event) => {
                try {
                    appendLog(log_dir, bot_name, 'event', event);
                    processLog(event);
                    for (const [key, value] of Object.entries(event)) {
                        console.log(
                            '{ "isoString" : "' +
                                new Date().toISOString() +
                                '" }'
                        );
                        if (Array.isArray(value)) {
                            appendLog(log_dir, bot_name, key, value);
                            processLog({ type: key, });
                            if (event.tweet_create_events) {
                                const bot_user_id = event.for_user_id,
                                    tweet_create_events = event.tweet_create_events.map(
                                        async (tweet) => {
                                            const tweet_id = tweet.id_str;
                                            if (
                                                getProperty(
                                                    getProperty(
                                                        tweet,
                                                        'extended_tweet',
                                                        tweet
                                                    ),
                                                    'full_text',
                                                    getProperty(
                                                        getProperty(
                                                            tweet,
                                                            'extended_tweet',
                                                            tweet
                                                        ),
                                                        'text',
                                                        tweet.text
                                                    )
                                                )
                                                    .toString()
                                                    .toLowerCase()
                                                    .includes('bug')
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key +
                                                        '.tweetThreadReply.bugReport.prelim',
                                                    { value, event, }
                                                );
                                            }
                                            if (
                                                tweet.user.id_str ===
                                                bot_user_id
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.self',
                                                    value
                                                );
                                                return { sub_type: 'self', };
                                            } else if (
                                                tweet.text
                                                    .toString()
                                                    .startsWith('RT')
                                            ) {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.rt',
                                                    value
                                                );
                                                return { sub_type: 'rt', };
                                            } else {
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key + '.other',
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
                                                        'extended_tweet',
                                                        tweet
                                                    ),
                                                    display_text_range = getProperty(
                                                        extended_tweet,
                                                        'display_text_range',
                                                        [-Infinity, Infinity,]
                                                    ),
                                                    user_tweet_text = getProperty(
                                                        extended_tweet,
                                                        'full_text',
                                                        extended_tweet.text
                                                    ).substring(
                                                        display_text_range[0],
                                                        display_text_range[1]
                                                    ),
                                                    entities = getProperty(
                                                        extended_tweet,
                                                        'entities'
                                                    ),
                                                    user_mentions = getProperty(
                                                        entities,
                                                        'user_mentions'
                                                    ),
                                                    bot_user_mentions =
                                                        user_mentions ===
                                                            null ||
                                                        user_mentions ===
                                                            undefined ?
                                                            null
                                                            : user_mentions.find(
                                                                (obj) =>
                                                                    obj.id_str ===
                                                                      bot_user_id
                                                            ),
                                                    bot_screen_name = getProperty(
                                                        bot_user_mentions,
                                                        'screen_name',
                                                        module_screen_name
                                                    ),
                                                    client = new Twitter(
                                                        params
                                                    ),
                                                    status_reply_to =
                                                        typeof in_reply_to_status_id ===
                                                            'undefined' ||
                                                        in_reply_to_status_id ===
                                                            null ||
                                                        in_reply_to_status_id ===
                                                            '' ?
                                                            ''
                                                            : await (async () => {
                                                                try {
                                                                    return await client.get(
                                                                        'statuses/show',
                                                                        {
                                                                            id: in_reply_to_status_id,
                                                                            tweet_mode:
                                                                                  'extended',
                                                                        }
                                                                    );
                                                                } catch (e) {
                                                                    if (
                                                                        'errors' in
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
                                                                                        'x-rate-limit-reset': new Date(
                                                                                            e._headers.get(
                                                                                                'x-rate-limit-reset'
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
                                                        'extended_tweet',
                                                        status_reply_to
                                                    ),
                                                    reply_to_display_text_range = getProperty(
                                                        extended_tweet_reply_to,
                                                        'display_text_range',
                                                        [-Infinity, Infinity, ]
                                                    ),
                                                    reply_entities = getProperty(
                                                        extended_tweet_reply_to,
                                                        'entities',
                                                        null
                                                    ),
                                                    urls = getProperty(
                                                        reply_entities,
                                                        'urls',
                                                        null
                                                    ),
                                                    /* jshint ignore:start */
                                                    urlsLog = appendLog( // eslint-disable-line no-unused-vars
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.urls',
                                                        urls
                                                    ),
                                                    /* jshint ignore:end */
                                                    media_reply_entities = getProperty(
                                                        extended_tweet_reply_to,
                                                        'extended_entities',
                                                        reply_entities
                                                    ),
                                                    media = getProperty(
                                                        media_reply_entities,
                                                        'media',
                                                        null
                                                    ),
                                                    /* jshint ignore:start */
                                                    mediaLog = appendLog( // eslint-disable-line no-unused-vars
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.urls.media',
                                                        media
                                                    ),
                                                    /* jshint ignore:end */
                                                    quoted_status_permalink = getProperty(
                                                        extended_tweet_reply_to,
                                                        'quoted_status_permalink',
                                                        null
                                                    ),
                                                    quoted_status_permalink_expanded = getProperty(
                                                        quoted_status_permalink,
                                                        'expanded',
                                                        null
                                                    ),
                                                    url_expanded_text = urlExpand(
                                                        (
                                                            getProperty(
                                                                extended_tweet_reply_to,
                                                                'full_text',
                                                                extended_tweet_reply_to.text
                                                            ) || ''
                                                        ).substring(
                                                            reply_to_display_text_range[0]
                                                        ),
                                                        urls,
                                                        media,
                                                        quoted_status_permalink_expanded
                                                    ),
                                                    cleaned_text = cleanEmoji(
                                                        cleanText(
                                                            url_expanded_text
                                                        )
                                                    ),
                                                    straightened_lines = normalizeNewlines(
                                                        reduceEmptyLinesToSingle(
                                                            trimAllLines(
                                                                normalizeSpaces(
                                                                    fixAmp(
                                                                        cleaned_text.text
                                                                    )
                                                                )
                                                            )
                                                        )
                                                    ).trim(),
                                                    reply_text =
                                                        typeof in_reply_to_status_id ===
                                                            'undefined' ||
                                                        in_reply_to_status_id ===
                                                            null ||
                                                        in_reply_to_status_id ===
                                                            '' ?
                                                            ''
                                                            : '@ ' +
                                                              in_reply_to_screen_name +
                                                              ' SAYS:\n\n' +
                                                              straightened_lines +
                                                              '\n\n' +
                                                              'END @ ' +
                                                              in_reply_to_screen_name +
                                                              ' QUOTE\n' +
                                                              cleaned_text.alterations;
                                                appendLog(
                                                    log_dir,
                                                    bot_name,
                                                    key +
                                                        '.tweetThreadReply.replyTweet',
                                                    status_reply_to
                                                );
                                                if (
                                                    user_tweet_text
                                                        .toString()
                                                        .toLowerCase()
                                                        .includes('bug')
                                                ) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.bugReport',
                                                        {
                                                            status_reply_to,
                                                            event,
                                                        }
                                                    );
                                                }
                                                if (
                                                    user_tweet_text
                                                        .toString()
                                                        .toLowerCase()
                                                        .includes(
                                                            '@' +
                                                                bot_screen_name.toLowerCase()
                                                        )
                                                ) {
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply.reply_text',
                                                        reply_text
                                                    );
                                                    const thread = [
                                                        (
                                                            '@' +
                                                            user_screen_name +
                                                            '\n' + //', here you go!\n' +
                                                            // status + '\n' +
                                                            reply_text +
                                                            '\n' +
                                                            getSignature(
                                                                user_name,
                                                                bot_screen_name,
                                                                in_reply_to_status_id ||
                                                                    tweet_id,
                                                                signature
                                                            )
                                                        ).trim(),
                                                    ].flat(Infinity);
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key +
                                                            '.tweetThreadReply',
                                                        {
                                                            tweetThreadReply: {
                                                                thread,
                                                                tweet_id,
                                                                params,
                                                            },
                                                        }
                                                    );
                                                    processLog(status_reply_to);
                                                    tweetThreadReply(
                                                        thread,
                                                        tweet_id,
                                                        params
                                                    ).catch(processError);
                                                    return {
                                                        sub_type: 'other.tweet',
                                                    };
                                                } else {
                                                    const indirect = {};
                                                    indirect[key] = value;
                                                    appendLog(
                                                        log_dir,
                                                        bot_name,
                                                        key + '.indirect',
                                                        indirect
                                                    );
                                                    return {
                                                        sub_type:
                                                            'other.indirect',
                                                    };
                                                }
                                                return { // eslint-disable-line no-unreachable
                                                    sub_type: 'other.etc',
                                                };
                                            }
                                        }
                                    ),
                                    filtered_tweet_create_events = tweet_create_events.filter(
                                        (el) =>
                                            el &&
                                            el.then &&
                                            typeof el.then === 'function'
                                    );
                                if (
                                    Array.isArray(
                                        filtered_tweet_create_events
                                    ) &&
                                    filtered_tweet_create_events.length > 0
                                ) {
                                    Promise.all(
                                        filtered_tweet_create_events
                                    ).then((completed) =>
                                        processLog(completed)
                                    );
                                }
                            }
                        } else {
                            // likely "for_user_id:", "user_has_blocked:"...
                            const nonArray = {};
                            nonArray[key] = value;
                            appendLog(log_dir, bot_name, 'non-array', nonArray);
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
            if ('errors' in e) {
                if (e.errors[0].code === 88) {
                    // Twitter API error
                    processLog(
                        '{ "e": {' +
                            e +
                            '}, "error" : { "x-rate-limit-reset" : ' +
                            new Date(
                                e._headers.get('x-rate-limit-reset') * 1000
                            ) +
                            ' } }'
                    );
                } else {
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
            if ('errors' in e) {
                if (e.errors[0].code === 88) {
                    // Twitter API error
                    processLog(
                        '{ "e": {' +
                            e +
                            '}, "error" : { "x-rate-limit-reset" : ' +
                            new Date(
                                e._headers.get('x-rate-limit-reset') * 1000
                            ) +
                            ' } }'
                    );
                } else {
                    // some other kind of error , e.g. read-only API trying to POST
                }
            } else {
                // non-API error , e.g. network problem or invalid JSON in response
            }
            processError(e);
        }
    };

// export section
export const bot = { start: start, startSync: startSync, };
export default bot;
