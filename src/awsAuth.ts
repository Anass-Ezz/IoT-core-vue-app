import { CognitoIdentityClient, GetIdCommand } from "@aws-sdk/client-cognito-identity";
import { fromCognitoIdentityPool } from "@aws-sdk/credential-provider-cognito-identity";
import { IoTClient, AttachPolicyCommand, DescribeEndpointCommand, ListAttachedPoliciesCommand } from "@aws-sdk/client-iot";
import { AWS_REGION, IDENTITY_POOL_ID, IOT_POLICY_NAME } from "./awsConfig";

// 1) Get Cognito Identity ID (for AttachPolicy target)
export async function getIdentityId(): Promise<string> {
  const cognito = new CognitoIdentityClient({ region: AWS_REGION });
  const out = await cognito.send(new GetIdCommand({ IdentityPoolId: IDENTITY_POOL_ID }));
  if (!out.IdentityId) throw new Error("No IdentityId returned from Cognito");
  return out.IdentityId;
}

// 2) Browser credential provider (unauth)
export function makeCredentialProvider() {
  return fromCognitoIdentityPool({
    client: new CognitoIdentityClient({ region: AWS_REGION }),
    identityPoolId: IDENTITY_POOL_ID,
  });
}

// 3) Attach IoT policy to identity if not already attached
export async function ensureIotPolicyAttached(identityId: string): Promise<void> {
  const iot = new IoTClient({
    region: AWS_REGION,
    credentials: makeCredentialProvider(),
  });

  const listed = await iot.send(new ListAttachedPoliciesCommand({ target: identityId }));
  const already = (listed.policies ?? []).some((p) => p.policyName === IOT_POLICY_NAME);
  if (!already) {
    await iot.send(new AttachPolicyCommand({ policyName: IOT_POLICY_NAME, target: identityId }));
  }
}

// 4) Get IoT data endpoint (for next step, MQTT over WSS)
export async function getIotWssEndpoint(): Promise<string> {
  const iot = new IoTClient({
    region: AWS_REGION,
    credentials: makeCredentialProvider(),
  });
  const out = await iot.send(new DescribeEndpointCommand({ endpointType: "iot:Data-ATS" }));
  if (!out.endpointAddress) throw new Error("No IoT endpointAddress returned");
  return `wss://${out.endpointAddress}/mqtt`;
}

// Convenience runner for Step 1
export async function runStep1() {
  const identityId = await getIdentityId();
  await ensureIotPolicyAttached(identityId);
  const clientId = `${identityId}-web`; // matches your IoT policy (StringLike with prefix)
  const wssEndpoint = await getIotWssEndpoint();
  return { identityId, clientId, wssEndpoint };
}
