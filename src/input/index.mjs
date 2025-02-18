import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());


export const handler = async (event) => {
  if (!event.body) {
    return {
        status: 500,
        body: JSON.stringify({error: "Invalid request provided"}),
    }
  }
  console.log("Event", event);
  const tableName = process.env.TABLE_NAME;
  const { userId, date, energy } = event.body;

  const params = {
    TableName: tableName,
    Item: { userId, date, energy }
  };

  try {
    await dynamo.put(params);
    return {
      statusCode: 200,
      body: JSON.stringify({ message: "Record created successfully", date, energy }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
