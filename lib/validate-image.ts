/**
 * Helper functions to validate and verify images
 */
import { access } from 'fs/promises';
import { join } from 'path';
import { constants } from 'fs';

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
      const controller = new AbortController();
      // Set a timeout of 3 seconds
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      try {
        const response = await fetch(url, { 
          method: 'HEAD',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        // Check if the response is successful and the content type is an image
        if (!response.ok) return false;
        
        const contentType = response.headers.get('content-type');
        return !!contentType && contentType.startsWith('image/');
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('Error fetching external image URL:', fetchError);
        return false;
      }
    }
    
    // For local URLs, verify if the file exists in the uploads directory
    if (isLocalUrl) {
      try {
        // Get the file path by combining the process cwd with public and the URL
        // This assumes the URL starts with /uploads/ which is in the public directory
        const filePath = join(process.cwd(), 'public', url);
        
        // Check if file exists
        await access(filePath, constants.F_OK);
        return true;
      } catch (fileError) {
        // File doesn't exist
        console.warn(`Local image file not found: ${url}`);
        return false;
      }
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
    let filename = parts[parts.length - 1] || '';
    
    // Remove any query parameters
    if (filename.includes('?')) {
      filename = filename.split('?')[0];
    }
    
    return filename;
  } catch (error) {
    console.error('Error extracting filename from URL:', error);
    return '';
  }
}

/**
 * Get the extension from a URL or filename
 * @param url - The URL or filename to extract the extension from
 * @returns string - The extracted extension (without the dot) or empty string if not found
 */
export function getExtensionFromUrl(url: string): string {
  const filename = getFilenameFromUrl(url);
  if (!filename) return '';
  
  const parts = filename.split('.');
  return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
}

/**
 * Check if a URL points to an image based on filename extension
 * @param url - The URL to check
 * @returns boolean - True if the URL has a valid image extension
 */
export function hasImageExtension(url: string): boolean {
  const validExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'avif'];
  const extension = getExtensionFromUrl(url);
  
  return validExtensions.includes(extension);
}

/**
 * Generate a cache-busting URL to prevent browser caching of images
 * @param url - The original URL
 * @returns string - URL with cache busting parameter
 */
export function getCacheBustingUrl(url: string): string {
  if (!url) return '';
  
  // Add timestamp parameter to prevent caching
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}t=${Date.now()}`;
}
