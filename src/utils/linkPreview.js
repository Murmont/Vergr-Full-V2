// src/utils/linkPreview.js

// Replace this with your actual function URL after deployment
const FUNCTION_URL = 'https://us-central1-vergr-44494.cloudfunctions.net/getLinkPreviewV2';

export async function getLinkPreview(url) {
  try {
    const response = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!response.ok) {
      throw new Error('Preview fetch failed');
    }

    const data = await response.json();
    return data.error ? null : data;
  } catch (error) {
    console.error('Link preview error:', error);
    return null;
  }
}