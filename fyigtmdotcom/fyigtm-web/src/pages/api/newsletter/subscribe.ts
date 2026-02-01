import type { APIRoute } from 'astro';

export const prerender = false;

const KIT_API_BASE = 'https://api.kit.com/v4';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();
    const { email } = data;

    if (!email || !email.includes('@')) {
      return new Response(JSON.stringify({ error: 'Valid email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Access env vars
    const runtime = (locals as any).runtime;
    const env = runtime?.env || process.env;
    const apiKey = env.KIT_API_KEY || import.meta.env.KIT_API_KEY;
    const tagName = env.KIT_TAG_NAME || import.meta.env.KIT_TAG_NAME || 'FYI GTM_Website';

    if (!apiKey) {
      console.error('KIT_API_KEY not configured');
      return new Response(JSON.stringify({ error: 'Server configuration error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const headers = {
      'Content-Type': 'application/json',
      'X-Kit-Api-Key': apiKey,
    };

    // Step 1: Create/update the subscriber
    const subscriberResponse = await fetch(`${KIT_API_BASE}/subscribers`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email_address: email,
      }),
    });

    if (!subscriberResponse.ok) {
      const errorData = await subscriberResponse.text();
      console.error('Kit subscriber creation failed:', errorData);
      return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const subscriberData = await subscriberResponse.json();
    const subscriberId = subscriberData.subscriber?.id;

    if (!subscriberId) {
      console.error('No subscriber ID returned:', subscriberData);
      return new Response(JSON.stringify({ error: 'Failed to create subscriber' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Step 2: Find the tag ID by name
    const tagsResponse = await fetch(`${KIT_API_BASE}/tags`, {
      method: 'GET',
      headers,
    });

    if (tagsResponse.ok) {
      const tagsData = await tagsResponse.json();
      const tag = tagsData.tags?.find((t: any) => t.name === tagName);

      if (tag?.id) {
        // Step 3: Tag the subscriber
        const tagResponse = await fetch(`${KIT_API_BASE}/tags/${tag.id}/subscribers/${subscriberId}`, {
          method: 'POST',
          headers,
          body: JSON.stringify({}),
        });

        if (!tagResponse.ok) {
          console.error('Failed to tag subscriber:', await tagResponse.text());
          // Don't fail the whole request - subscriber was still created
        }
      } else {
        console.warn(`Tag "${tagName}" not found in Kit account`);
      }
    } else {
      console.error('Failed to fetch tags:', await tagsResponse.text());
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Successfully subscribed!'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Newsletter subscribe error:', error);
    return new Response(JSON.stringify({ error: 'Failed to subscribe' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
