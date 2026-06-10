// Cache bust script - Force reload after deployment
(function() {
  const BUILD_ID = 'opening-hours-20260610-v2';
  const STORAGE_KEY = 'bm_build_id';
  
  try {
    const storedBuildId = localStorage.getItem(STORAGE_KEY);
    
    if (storedBuildId !== BUILD_ID) {
      console.log('[Cache Bust] New deployment detected, clearing cache...');
      
      // Clear localStorage except auth tokens
      const authToken = localStorage.getItem('bm_token');
      const clientToken = localStorage.getItem('client_token');
      const cartData = localStorage.getItem('bm_cart');
      
      localStorage.clear();
      
      // Restore important data
      if (authToken) localStorage.setItem('bm_token', authToken);
      if (clientToken) localStorage.setItem('client_token', clientToken);
      if (cartData) localStorage.setItem('bm_cart', cartData);
      
      // Store new build ID
      localStorage.setItem(STORAGE_KEY, BUILD_ID);
      
      // Clear session storage
      sessionStorage.clear();
      
      // Unregister service workers
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then(function(registrations) {
          for (let registration of registrations) {
            registration.unregister();
          }
        });
      }
      
      // Clear all caches
      if ('caches' in window) {
        caches.keys().then(function(names) {
          for (let name of names) {
            caches.delete(name);
          }
        });
      }
      
      console.log('[Cache Bust] Cache cleared, reloading page...');
      
      // Reload page to get fresh content (only if not already reloaded)
      if (!sessionStorage.getItem('cache_bust_reloaded')) {
        sessionStorage.setItem('cache_bust_reloaded', '1');
        window.location.reload(true);
      }
    }
  } catch (e) {
    console.warn('[Cache Bust] Error:', e);
  }
})();
