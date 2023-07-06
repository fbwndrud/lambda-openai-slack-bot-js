const AWS = require('aws-sdk');
const { App, AwsLambdaReceiver } = require('@slack/bolt');
const axios = require('axios');

// env
const BOT_CURSOR = process.env.BOT_CURSOR || ":robot_face:";
const DYNAMODB_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || "openai-slack-bot-context";
const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY.replace(/^["']|["']$/g, '');
const OPENAI_MODEL = process.env.OPENAI_MODEL;
const OPENAI_HISTORY = parseInt(process.env.OPENAI_HISTORY) || 6;
const OPENAI_SYSTEM = process.env.OPENAI_SYSTEM || "";
const OPENAI_TEMPERATURE = parseFloat(process.env.OPENAI_TEMPERATURE) || 0.5;

// DynamoDB
const dynamodb = new AWS.DynamoDB.DocumentClient();
const table = DYNAMODB_TABLE_NAME;

// Slack app
const app = new App({
  token: SLACK_BOT_TOKEN,
  receiver: new AwsLambdaReceiver({
    signingSecret: SLACK_SIGNING_SECRET,
  }),
  processBeforeResponse: true
});

async function get_context(id, defaultValue = "") {
  const params = {
    TableName: table,
    Key: { "id": id }
  };
  try {
    const item = await dynamodb.get(params).promise();
    // console.log(`get_context item: ${item.Item ? item.Item.conversation : defaultValue}`);
    return item.Item ? item.Item.conversation : defaultValue;
  } catch (error) {
    console.error(`Error in get_context: ${error}`);
    throw error;  // Continue to throw the error
  }
}

async function put_context(id, conversation = "") {
  const current_time = Math.floor(Date.now() / 1000);
  const expire_at = current_time + (86400 * 10);

  const params = {
    TableName: table,
    Item: {
      "id": id,
      "conversation": conversation,
      "expire_at": expire_at,
    }
  };

  try {
    await dynamodb.put(params).promise();
  } catch (error) {
    console.error(`Error in put_context: ${error}`);
  }
};

async function chat_update(channel, message, latest_ts) {
  if (!message) {
    throw new Error("chat_update error: message is undefined or empty");
  }

  try {
    await app.client.chat.update({
      token: SLACK_BOT_TOKEN,
      channel: channel,
      text: message,
      ts: latest_ts,
    });
  } catch (error) {
    console.error(`Error updating chat: ${error}`);
    throw error;
  }
};

async function streamChatCompletion(prompt, channel, latest_ts) {
  let message = "";
  const url = `https://api.openai.com/v1/chat/completions`;
  const payload = {
    model: OPENAI_MODEL,
    messages: prompt,
    temperature: OPENAI_TEMPERATURE,
    stream:true
  };

  let intervalId = null;

  return axios({
    method: 'post',
    url,
    data: payload,
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    responseType: 'stream'
  })
  .then(response => {
    return new Promise((resolve, reject) => {
      intervalId = setInterval(async () => {
        try {
          await chat_update(channel, message + " " + BOT_CURSOR, latest_ts);
        } catch (error) {
          console.error(`Error updating chat: ${error}`);
          reject(error);
        }
      }, 1500); // 1.5 seconds
      
      response.data.on('data', (chunk) => {
        const chunkData = chunk.toString();
        const dataChunks = chunkData.split('\n\n');
        for (const dataChunk of dataChunks) {
          if (dataChunk.startsWith('data: ') && !dataChunk.startsWith('data: [DONE]')) {
            try {
              const dataObject = JSON.parse(dataChunk.substring(6));
              if (dataObject.choices && dataObject.choices[0] && "content" in dataObject.choices[0].delta) {
                message += dataObject.choices[0].delta.content;
              }
            } catch (error) {
              reject(new Error(`Error parsing chunk: ${error}\nchunkData: ${dataChunk}`));
            }
          }
        }
      });

      response.data.on('end', async () => {
        console.log('Streaming ended');
        clearInterval(intervalId);
        try {
          await chat_update(channel, message, latest_ts);
          resolve(message);
        } catch (error) {
          reject(error);
        }
      });
    });
  })
  .catch(err => {
    console.error(err);
    clearInterval(intervalId);
    throw err;
  });
};



async function conversation(thread_ts, prompt, channel, say) {
  // console.log('conversation: ', thread_ts, prompt);

  const result = await say({ text: BOT_CURSOR, thread_ts: thread_ts });
  // console.log('conversation_result: ', result);

  const latest_ts = result.ts;
  // console.log('conversation_latest_ts: ', latest_ts);

  let messages = JSON.parse(await get_context(thread_ts, "[]"));
  messages = messages.slice(-OPENAI_HISTORY);
  // console.log('conversation_messages: ',messages);

  messages.push({
    "role": "user",
    "content": prompt,
  });

  let chat_message = OPENAI_SYSTEM
    ? [{ "role": "system", "content": OPENAI_SYSTEM }].concat(messages)
    : messages;

  let message = "";

  try {
    message = await streamChatCompletion(chat_message, channel, latest_ts);
    
    if (message !== "") {
      messages.push({
        "role": "assistant",
        "content": message,
      });

      await put_context(thread_ts, JSON.stringify(messages));
    }
  } catch (error) {
    await chat_update(channel, message, latest_ts);
    console.log(thread_ts, `Error handling message: ${error}`);

    message = "Sorry, I could not process your request.\nhttps://status.openai.com";
    await say({ text: message, thread_ts: thread_ts });
  }
};

app.event('app_mention', async ({ event, say }) => {
  // console.log(`handle_app_mentions: ${JSON.stringify(event)}`);

  const thread_ts = event.thread_ts || event.ts;
  const prompt = event.text.split("<@")[1].split(">")[1].trim();

  await conversation(thread_ts, prompt, event.channel, say);
});

module.exports.handler = async (event, context, callback) => {
  const body = JSON.parse(event.body);

  if (body.challenge) {
    // Respond to the Slack Event Subscription Challenge
    return callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "challenge": body.challenge }),
    });
  }

  // Duplicate execution prevention
  const token = body.event.client_msg_id;
  let prompt = await get_context(token);
  if (prompt === "") {
    await put_context(token, body.event.text);
  } else {
    return callback(null, {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ "status": "Success" }),
    });
  }

  const handler = await app.start();
  return handler(event, context, callback);
};
