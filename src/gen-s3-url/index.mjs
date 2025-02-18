import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const s3 = new S3Client({ region: "us-west-2" }); // Change to your region

const bucketName = "energy-monitoring-pdx"; // Replace with your S3 bucket
const expiresIn = 3600; // URL expiry time in seconds (1 hour)

async function generatePresignedUrls(type, fileName) {
  let objectKey = "data/"; // Replace with your file name
  if (!fileName) return null;
  try {
    let url;

    objectKey = objectKey + fileName;
    switch (type) {
        case 'put': {
            // Generate upload URL (PUT request)
            const putCommand = new PutObjectCommand({ Bucket: bucketName, Key: objectKey });
            url = await getSignedUrl(s3, putCommand, { expiresIn });
            break;
        }

        case 'get': 
        default: {
            // Generate download URL (GET request)
            const getCommand = new GetObjectCommand({ Bucket: bucketName, Key: objectKey });
            url = await getSignedUrl(s3, getCommand, { expiresIn });
            break;
        }
    }
    return url;
  } catch (error) {
    console.error("Error generating pre-signed URLs:", error);
    return null;
  }
}

export const handler = async (event) => {
  if (!event.params.querystring.fileName) {
    return {
        status: 500,
        body: JSON.stringify({error: "Invalid request provided"}),
    }
  }
  const { fileName } = event.params.querystring;

  try {
    const frmtFileName = `${new Date().getTime()}_${fileName}`;

    const preSignedPut = await generatePresignedUrls('put', frmtFileName);
    if (!preSignedPut ) {
        return {
            status: 500,
            body: JSON.stringify({error: "Failed to generate presigned URLs"}),
        };
    }
    return {
      statusCode: 200,
      body: JSON.stringify({ fileName: frmtFileName, putUrl: preSignedPut }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};
