# lambda-openai-slack-bot-js

## Install

```bash
$ npm install -g serverless
$ npm install
$ sls plugin install -n serverless-dotenv-plugin
```

## Setup

Setup a Slack app by following the guide at https://slack.dev/bolt-js/tutorial/getting-started

Set scopes to Bot Token Scopes in OAuth & Permission:

```
app_mentions:read
channels:join
chat:write
```

Set scopes in Event Subscriptions - Subscribe to bot events

```
app_mention
```

## Credentials

```bash
$ cp .env.example .env
```

### Slack Bot

```bash
SLACK_BOT_TOKEN="xoxb-xxxx"
SLACK_SIGNING_SECRET="xxxx"
```

### ApenAi API

* <https://platform.openai.com/account/api-keys>

```bash
OPENAI_API_KEY="xxxx"
```

## Deployment

In order to deploy the example, you need to run the following command:

```bash
$ sls deploy
```

## Slack Test

```bash
curl -X POST -H "Content-Type: application/json" \
-d " \
{ \
    \"token\": \"Jhj5dZrVaK7ZwHHjRyZWjbDl\", \
    \"challenge\": \"3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P\", \
    \"type\": \"url_verification\" \
}" \
https://xxxx.execute-api.ap-northeast-2.amazonaws.com/dev/slack/events
```

## OpenAi API Test

```bash
curl https://api.openai.com/v1/completions \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${OPENAI_API_KEY}" \
  -d '{
  "model": "gpt-3.5-turbo",
  "prompt": "Say this is a test",
  "max_tokens": 16,
  "temperature": 0
}'
```

## inspired by 
https://github.com/0xpayne/gpt-migrate
https://github.com/nalbam/lambda-openai-slack-bot