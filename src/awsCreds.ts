import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { CognitoIdentityClient } from "@aws-sdk/client-cognito-identity";
import { AWS_REGION, IDENTITY_POOL_ID } from "./awsConfig";

export async function getAwsCredentials() {
  const provider = fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: AWS_REGION }),
    identityPoolId: IDENTITY_POOL_ID,
  });
  const creds = await provider();
  if (!creds.accessKeyId || !creds.secretAccessKey || !creds.sessionToken) {
    throw new Error("Failed to obtain temporary AWS credentials");
  }
  return creds; // { accessKeyId, secretAccessKey, sessionToken, expiration }
}
