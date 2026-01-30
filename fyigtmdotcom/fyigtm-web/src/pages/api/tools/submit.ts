import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();

    // Access env vars using the same pattern as other API routes
    const runtime = (locals as any).runtime;
    const env = runtime?.env || process.env;
    const webhookUrl = env.SLACK_WEBHOOK_URL || import.meta.env.SLACK_WEBHOOK_URL;

    if (!webhookUrl) {
      console.error('SLACK_WEBHOOK_URL not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Format Slack message
    const slackMessage = {
      blocks: [
        {
          type: "header",
          text: {
            type: "plain_text",
            text: "New Tool Submission",
            emoji: true
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Tool Name:*\n${data.name}` },
            { type: "mrkdwn", text: `*Category:*\n${data.category}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*URL:*\n<${data.url}|${data.url}>`
          }
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Description:*\n${data.description}`
          }
        },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Pricing:*\n${data.pricing}` },
            { type: "mrkdwn", text: `*Price Details:*\n${data.priceNote || 'Not specified'}` }
          ]
        },
        {
          type: "section",
          text: {
            type: "mrkdwn",
            text: `*Tags:*\n${data.tags || 'None'}`
          }
        },
        { type: "divider" },
        {
          type: "section",
          fields: [
            { type: "mrkdwn", text: `*Contact:*\n${data.contactName}` },
            { type: "mrkdwn", text: `*Email:*\n${data.contactEmail}` }
          ]
        },
        {
          type: "context",
          elements: [
            { type: "mrkdwn", text: `Newsletter: ${data.newsletter ? 'Yes' : 'No'}` }
          ]
        }
      ]
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage),
    });

    if (!response.ok) {
      throw new Error('Slack webhook failed');
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Submit error:', error);
    return new Response(JSON.stringify({ error: 'Failed to submit' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
