// API service using native fetch instead of axios
const DEFAULT_TIMEOUT = 30000; // 30 seconds

// Create a custom fetch with timeout
const fetchWithTimeout = (url: string, options: RequestInit = {}, timeout = DEFAULT_TIMEOUT) => {
  // Create an abort controller to handle timeouts
  const controller = new AbortController();
  const { signal } = controller;

  // Set timeout to abort fetch
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  // Merge signals if options already has one
  const fetchOptions = {
    ...options,
    signal,
    // Don't set credentials by default
  };

  console.log('Making fetch request to:', url, 'with options:', JSON.stringify(fetchOptions, null, 2));

  return fetch(url, fetchOptions)
    .then(response => {
      clearTimeout(timeoutId);
      
      console.log('Received response:', response.status, response.statusText);
      
      // Handle HTTP errors
      if (!response.ok) {
        console.error('Response not OK:', response.status, response.statusText);
        
        // Try to parse error response as JSON
        return response.text()
          .then(text => {
            console.log('Error response text:', text);
            let errorData;
            try {
              // Try to parse as JSON
              errorData = JSON.parse(text);
            } catch (e) {
              // If not JSON, create a simple error object
              errorData = { message: text || `HTTP Error ${response.status}` };
            }
            
            // Add status and statusText to error data
            errorData.status = response.status;
            errorData.statusText = response.statusText;
            
            return Promise.reject(errorData);
          })
          .catch(parseError => {
            console.error('Error parsing error response:', parseError);
            // If we can't even get the text, return a generic error
            return Promise.reject({ 
              message: `HTTP Error ${response.status}: ${response.statusText}`,
              status: response.status,
              statusText: response.statusText
            });
          });
      }
      
      // Parse JSON or return raw response for non-JSON data
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return response.json().catch(error => {
          console.error('Error parsing JSON response:', error);
          throw new Error('Invalid JSON in response');
        });
      }
      
      return response;
    })
    .catch(error => {
      clearTimeout(timeoutId);
      console.error('Fetch error:', error);
      
      // Handle specific abort error
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeout}ms`);
      }
      
      // Add better debugging for network errors
      if (error instanceof TypeError && error.message.includes('Failed to fetch')) {
        console.error('Network error - server may be down or URL may be incorrect:', url);
        error.message = `Network error connecting to ${url.split('/').slice(0, 3).join('/')}`;
      }
      
      throw error;
    });
};

// API client using fetch
const api = {
  /**
   * GET request
   */
  get: (url: string, options: RequestInit = {}) => {
    return fetchWithTimeout(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  },

  /**
   * POST request
   */
  post: (url: string, data: any, options: RequestInit = {}) => {
    // Extract headers from options
    const { headers, credentials, ...restOptions } = options;
    
    return fetchWithTimeout(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...headers
      },
      // If credentials aren't specified, don't include them
      ...(credentials ? { credentials } : {}),
      body: JSON.stringify(data),
      ...restOptions
    });
  },

  /**
   * PATCH request
   */
  patch: (url: string, data: any, options: RequestInit = {}) => {
    return fetchWithTimeout(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      body: JSON.stringify(data),
      ...options
    });
  },

  /**
   * DELETE request
   */
  delete: (url: string, options: RequestInit = {}) => {
    return fetchWithTimeout(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
  }
};

export default api; 