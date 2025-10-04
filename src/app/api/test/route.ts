import { Composio } from '@composio/core';
import { VercelProvider } from '@composio/vercel';
import { generateText, streamText } from 'ai';
import { getModel, DEFAULT_MODEL } from '@/lib/providers';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const composio = new Composio({
      apiKey: 'ak_Ab2a5vp1NdN8dFaW-23a',
      provider: new VercelProvider()
    });

    // Id of the user in your system
    const externalUserId = 'cherrymx317@gmail.com';

    const connectionRequest = await composio.connectedAccounts.link(
      externalUserId,
      'ac_qX5ST7iH0BbM'
    );

    // redirect the user to the OAuth flow
    const redirectUrl = connectionRequest.redirectUrl;
    console.log(
      `Please authorize the app by visiting this URL: ${redirectUrl}`
    );

    // wait for connection to be established
    const connectedAccount = await connectionRequest.waitForConnection();

    const tools = await composio.tools.get(externalUserId, 'GMAIL_SEND_EMAIL');

    // env: OPENAI_API_KEY

    const { text } = await generateText({
      model: DEFAULT_MODEL,
      messages: [
        {
          role: 'user',
          content: `Send an email to cherrymx317@gmail.com with the subject 'Hello from composio 👋🏻' and the body 'Congratulations on sending your first email using AI Agents and Composio!'`
        }
      ],
      tools
    });

    console.log('Email sent successfully!', { text });

    // Create a trigger
    const trigger = await composio.triggers.create(
      externalUserId,
      'GMAIL_NEW_GMAIL_MESSAGE',
      {
        connectedAccountId: connectedAccount.id,
        triggerConfig: {
          labelIds: 'INBOX',
          userId: 'me',
          interval: 1
        }
      }
    );
    console.log(
      `✅ Trigger created successfully. Trigger Id: ${trigger.triggerId}`
    );

    /**
     * subscribe to trigger events
     * Note: For production usecases, use webhooks. Read more here -> https://docs.composio.dev/docs/using-triggers
     *
     * You can send an email to yourself and see the events being captured in the console.
     */
    composio.triggers.subscribe(
      (data) => {
        // Handle email data here
        console.log(
          `⚡️ Trigger event recieved for ${data.triggerSlug}`,
          JSON.stringify(data, null, 2)
        );
      },
      { triggerId: trigger.triggerId }
    );
  } catch (error) {
    console.error('Error in test route:', error);
    return NextResponse.json(
      { error: 'Failed to process test request' },
      { status: 500 }
    );
  }
}
