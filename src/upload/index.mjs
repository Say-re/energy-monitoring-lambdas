import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { Readable } from 'stream';
import { parse } from 'csv-parse';

const dynamo = DynamoDBDocument.from(new DynamoDB());
const s3 = new S3Client({region: 'us-west-2'});
const Bucket = 'energy-monitoring-pdx';
let Key = 'data/';


export const handler = async (event) => {
    if (!event.body) {
        return {
            status: 500,
            body: JSON.stringify({error: "Invalid request provided"}),
        }
    }
    const { fileName, userId } = event.body;

    if (!fileName || !userId ) {
        return {
            status: 500,
            body: JSON.stringify({error: "Missing parameters from request: file name or user Id"}),
        };
    }

    Key = Key + fileName;
    const command = new GetObjectCommand({Bucket, Key}); 
    const file = await s3.send(command);
    console.log("File", file);

    const fileStream = Readable.from(file.Body);

    // 3. Process CSV and write to DynamoDB
    await processCsv(fileStream, { userId });

    try {
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Succesfully created records from file: " + fileName }),
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message }),
        };
    }
};

async function processCsv(stream, params) {
    const { userId } = params;
    return new Promise((resolve, reject) => {
        const batch = [];

        stream.pipe(parse({delimter: ",", from: 2}))
            .on("data", async (row) => {
                console.log("Parsed row:", row);
                if (!Number(row[1])) return;
                // Prepare DynamoDB item
                const item = {
                    TableName: process.env.TABLE_NAME,
                    Item: {
                        userId,
                        date: row[0].replace(/'|"/gi, ''),
                        energy: Number(row[1]),
                    }
                };

                batch.push(dynamo.put(item));

                // Write in batches to avoid throttling
                if (batch.length % 25 === 0) {
                    await Promise.all(batch);
                }
            })
            .on("end", async () => {
                if (batch.length > 0) {
                    await Promise.all(batch);
                }
                console.log("CSV processing completed.");
                resolve();
            })
            .on("error", (error) => {
                console.error("Error reading CSV:", error);
                reject(error);
            });
    });
}
