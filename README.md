## Twitter Reply Bot
autohook replier, strangetext transcription

```
git clone https://github.com/twitter-base/reply-bot
cd reply-bot
yarn
yarn reply-bot
```

there's also a `twitter-reply-bot` bin and eventually i'll abstract and one can import/require it.

`.env` / `.env.twitter` , injected into your environment may work :

```
HEADLESS=false
NGROK_AUTH_TOKEN=
TWITTER_ACCESS_TOKEN=
TWITTER_ACCESS_TOKEN_SECRET=
TWITTER_CONSUMER_KEY=
TWITTER_CONSUMER_SECRET=
TWITTER_WEBHOOK_ENV=
MODULE_SCREEN_NAME=twetJs
BOT_NAME=twetJs
SIGNATURE="\nThanks, USER_SCREEN_NAME!\n#BOT_SCREEN_NAME"
```
some of these may not be needed, rules for how this works can be found in the source code,

ngrok auth token requires registration at https://ngrok.com/, isn't required, removes webhook timeout

 - source: https://github.com/twitter-base/reply-bot/tree/main#readme
 - bot: https://twitter.com/SpongeScribe
 - owner/author/contact: https://twitter.com/dezren39
 - code_of_conduct: https://github.com/twitter-base/reply-bot/blob/main/CODE_OF_CONDUCT.md
 - contributors: https://github.com/twitter-base/reply-bot/blob/main/CONTRIBUTORS.md
 - license: https://github.com/twitter-base/reply-bot/blob/main/LICENSE
 - license.NOTICE: https://github.com/twitter-base/reply-bot/blob/main/NOTICE.LICENSE.md
 - changelog: https://github.com/twitter-base/reply-bot/blob/main/CHANGELOG.md
