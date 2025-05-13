/**
 * Helper functions to validate and verify images
 */

/**
 * Function to check if an image URL is valid
 * @param url - The URL of the image to check
 * @returns Promise<boolean> - True if the image is valid, false otherwise
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  // Add URL validation
  if (!url) return false;
  
  // Handle external URLs vs local uploads differently
  const isExternalUrl = url.startsWith('http://') || url.startsWith('https://');
  const isLocalUrl = url.startsWith('/uploads/');
  
  if (!isExternalUrl && !isLocalUrl) {
    return false;
  }
  
  try {
    // For external URLs, try to fetch the image
    if (isExternalUrl) {
      const response = await fetch(url, { method: 'HEAD' });
      
      // Check if the response is successful and the content type is an image
      if (!response.ok) return false;
      
      const contentType = response.headers.get('content-type');
      return !!contentType && contentType.startsWith('image/');
    }
    
    // For local URLs, we assume they are valid if they exist in our uploads directory
    // This is a simple check - in production you might want to verify the file exists
    if (isLocalUrl) {
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Error validating image URL:', error);
    return false;
  }
}

/**
 * Extracts the filename from a URL
 * @param url - The URL to extract the filename from
 * @returns string - The extracted filename or empty string if not found
 */
export function getFilenameFromUrl(url: string): string {
  if (!url) return '';
  
  try {
    // Split by / and get the last part
    const parts = url.split('/');
    return parts[parts.length - 1] || '';
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return '';
  }
}
