import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { 
    startOfDay, 
    startOfWeek, 
    startOfMonth, 
    format, 
    parseISO
} from 'date-fns';

const dynamo = DynamoDBDocument.from(new DynamoDB());

// Aggregation Function
const aggregateData = (data, interval = 'daily') => {
      const aggregatedData = {};


      data.forEach(item => {
        const date = parseISO(item.date);
        let key;
        console.log("Interval", interval);

        switch (interval) {
          case 'daily' :
            key = format(startOfDay(date), 'yyyy-MM-dd');
            break;
          case 'weekly':
            key = format(startOfWeek(date, { weekStartsOn: 1 }), 'yyyy-MM-dd'); // Weeks start on Monday
            break;
          case 'monthly':
            key = format(startOfMonth(date), 'yyyy-MM');
            break;
          default:
            throw new Error('Invalid interval');
        }

        if (!aggregatedData[key]) {
          aggregatedData[key] = [];
        }
        aggregatedData[key].push(item);
      });
      return aggregatedData;
}

const summarizeData = (data) => {
    if (!data) return null;
    let sumData; 
    if (data && typeof data === 'object') {
       sumData = Object.keys(data).map((key) => {
           if (data[key] && Array.isArray(data[key])) {
                return {
                    energy: data[key].reduce((acc, cur) => acc += cur.energy, 0),
                    date: key,
                }
           }
       });
       return sumData
    }
}

export const handler = async (event) => {
  console.log("PARAMS", event);
  if (!event.params) {
    return {
        status: 500,
        body: JSON.stringify({error: "Invalid request provided"}),
    }
  }
  console.log("Event", event);

  const params = {
    TableName: process.env.TABLE_NAME,
    KeyConditionExpression: "userId = :userId",
    ScanIndexForward: true,
    ExpressionAttributeValues: { ':userId': event.params.querystring.userId },
  };

  try {
    let data;
    const { Items }  = await dynamo.query(params);

    const { aggLevel } = event.params.querystring;
    
    if (!Items || !Items.length) {
        return {
            status: 500,
            body: JSON.stringify({error: "User has no data available"}),
        }
    } else {
        console.log("Agg Data", aggregateData(Items, aggLevel));
        data = summarizeData(aggregateData(Items, aggLevel));
    }
    
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
