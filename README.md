# Lambda OpenAI Slack Bot JS

Lambda OpenAI Slack Bot JS is a project to deploy a chatbot on Slack that uses OpenAI's GPT-3.5-turbo model to interact with users.

## Pre-Requisites

Make sure you have Node.js and npm installed on your system. You also need to install the Serverless framework globally.

```bash
$ npm install -g serverless
```

## Installation

First, clone this repository and install the dependencies:

```bash
$ git clone <repository-url>
$ cd lambda-openai-slack-bot-js
$ npm install
$ sls plugin install -n serverless-dotenv-plugin
```

## Slack Setup

Setup a Slack app by following the guide at https://slack.dev/bolt-js/tutorial/getting-started

Set scopes to Bot Token Scopes in OAuth & Permissions:

```
app_mentions:read
channels:join
chat:write
```

Set scopes in Event Subscriptions - Subscribe to bot events

```
app_mention
```

## Environment Variables

Copy the `.env.example` to a new file called `.env` and fill it with your credentials and preferences.

```bash
$ cp .env.example .env
```

Here is what each environment variable means:

- `DYNAMODB_TABLE_NAME`: The name of your DynamoDB table.
- `SLACK_BOT_TOKEN`: Your Slack Bot User OAuth Token.
- `SLACK_SIGNING_SECRET`: Your Slack Signing Secret.
- `OPENAI_API_KEY`: Your OpenAI API Key.
- `OPENAI_MODEL`: The OpenAI model you want to use. Default is "gpt-3.5-turbo".
- `OPENAI_HISTORY`: The number of previous messages to keep in context when making an API call to OpenAI.
- `OPENAI_SYSTEM`: The system message used to instruct the model about its behavior.
- `OPENAI_TEMPERATURE`: Controls randomness in the model's responses. A higher value makes the output more random.

## Deployment

In order to deploy the bot, you need to run the following command:

```bash
$ sls deploy
```

After running the deploy command, you will see an output with the API Gateway endpoint.

## Testing

### Slack Test

Replace `<API_GATEWAY_ENDPOINT>` with the endpoint you got after the deployment.

```bash
curl -X POST -H "Content-Type: application/json" \
-d " \
{ \
    \"token\": \"Jhj5dZrVaK7ZwHHjRyZWjbDl\", \
    \"challenge\": \"3eZbrw1aBm2rZgRNFdxV2595E9CY3gmdALWMmHkvFXO7tYXAYM8P\", \
    \"type\": \"url_verification\" \
}" \
https://<API_GATEWAY_ENDPOINT>/dev/slack/events
```

### OpenAI API Test

Make sure to replace `${OPENAI_API_KEY}` with your actual OpenAI API key.

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

## Contribution

Feel free to contribute to this project by creating a pull request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the terms of the MIT license.

## Acknowledgements

This project was inspired by 
https://github.com/0xpayne/gpt-migrate
https://github.com/nalbam/lambda-openai-slack-bot
