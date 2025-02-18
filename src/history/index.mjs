import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocument.from(new DynamoDB());


export const handler = async (event) => {
    console.log("PARAMS", event);
    if (!event.params) {
        return {
            status: 500,
            body: JSON.stringify({error: "Invalid request provided"}),
        }
    }
    console.log("Event", event);
    const tableName = process.env.TABLE_NAME;
    const {
        endDate,
        startDate,
        userId,
    } = event.params.querystring;

    const params = {
        TableName: tableName,
        KeyConditionExpression: "userId = :userId AND #date BETWEEN :startDate ANd :endDate",
        ExpressionsAttributeNames: {
            "#date": "date",
        },
        ExpressionAttributeValues: { 
            ':userId': userId,
            ':startDate': startDate,
            ':endDate': endDate,
        },
    };

    try {
        const data = await dynamo.query(params);
        return {
            statusCode: 200,
            body: JSON.stringify(data),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};
