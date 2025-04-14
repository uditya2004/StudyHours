let scrollTime = 0;
let scrollCount = 0;
let currentDomain = window.location.hostname;
let timer = null;
let extensionContextValid = true;
let blockingTimer = null; // Timer for blocking feature

// Function to get today's date - called when needed rather than once at load time
function getTodayDate() {
  return new Date().toISOString().split('T')[0];
}

// Safely interact with Chrome storage API
function safeStorageGet(keys, callback) {
  try {
    if (!extensionContextValid) return;
    
    chrome.storage.local.get(keys, (result) => {
      if (chrome.runtime.lastError) {
        handleExtensionError(chrome.runtime.lastError);
        return;
      }
      callback(result);
    });
  } catch (error) {
    handleExtensionError(error);
  }
}

function safeStorageSet(data, callback) {
  try {
    if (!extensionContextValid) return;
    
    chrome.storage.local.set(data, () => {
      if (chrome.runtime.lastError) {
        handleExtensionError(chrome.runtime.lastError);
        return;
      }
      if (callback) callback();
    });
  } catch (error) {
    handleExtensionError(error);
  }
}

// Function to handle extension errors, especially context invalidation
function handleExtensionError(error) {
  if (error.message && error.message.includes("Extension context invalidated")) {
    if (extensionContextValid) {
      console.log("Extension context has been invalidated. Shutting down extension functionality.");
      extensionContextValid = false;
      
      // Clean up resources
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      
      if (blockingTimer) {
        clearTimeout(blockingTimer);
        blockingTimer = null;
      }
      
      // Remove event listeners
      document.removeEventListener("scroll", scrollHandler);
    }
  } else {
    console.error('Extension error:', error);
  }
}

// Initialize values from storage
function initializeData() {
  if (!extensionContextValid) return;
  
  safeStorageGet(['scrollTime', 'scrollCount', 'websiteData', 'dailyData'], (result) => {
    if (!result) return;
    
    scrollTime = result.scrollTime || 0;
    scrollCount = result.scrollCount || 0;
    
    const today = getTodayDate();
    
    // Initialize website-specific data if it doesn't exist
    const websiteData = result.websiteData || {};
    if (!websiteData[currentDomain]) {
      websiteData[currentDomain] = {
        scrollTime: 0,
        scrollCount: 0
      };
      safeStorageSet({websiteData});
    }
    
    // Initialize daily data if it doesn't exist
    const dailyData = result.dailyData || {};
    if (!dailyData[today]) {
      dailyData[today] = {
        scrolls: 0,
        minutes: 0
      };
      safeStorageSet({dailyData});
    }
  });
}

// Start the timer for tracking time spent
function startTimer() {
  if (!extensionContextValid) return;
  
  if (timer) {
    clearInterval(timer);
  }
  
  timer = setInterval(() => {
    if (!extensionContextValid) {
      clearInterval(timer);
      timer = null;
      return;
    }
    
    try {
      scrollTime++;
      const today = getTodayDate();
      
      // Update all data in a single storage operation to reduce potential for errors
      safeStorageGet(['scrollTime', 'websiteData', 'dailyData'], (result) => {
        if (!result) return;
        
        // Prepare all updates
        const updatedData = {
          scrollTime: result.scrollTime ? result.scrollTime + 1 : scrollTime
        };
        
        // Update website data
        const websiteData = result.websiteData || {};
        if (!websiteData[currentDomain]) {
          websiteData[currentDomain] = { scrollTime: 0, scrollCount: 0 };
        }
        websiteData[currentDomain].scrollTime = (websiteData[currentDomain].scrollTime || 0) + 1;
        updatedData.websiteData = websiteData;
        
        // Update daily data
        const dailyData = result.dailyData || {};
        if (!dailyData[today]) {
          dailyData[today] = { scrolls: 0, minutes: 0 };
        }
        dailyData[today].minutes = (dailyData[today].minutes || 0) + 1;
        updatedData.dailyData = dailyData;
        
        // Save everything in one operation
        safeStorageSet(updatedData);
      });

      if (scrollTime === 15) {
        alert("You've been scrolling for 15 minutes. Take a break?");
      }
    } catch (error) {
      handleExtensionError(error);
      // If we encounter an error, clear the interval to prevent repeated errors
      clearInterval(timer);
      timer = null;
    }
  }, 60000);
}

// Scroll handler function to be used with event listener
function scrollHandler() {
  if (!extensionContextValid) return;
  
  try {
    scrollCount++;
    const today = getTodayDate();
    
    // Update all scroll-related data in a single storage operation
    safeStorageGet(['scrollCount', 'websiteData', 'dailyData'], (result) => {
      if (!result) return;
      
      // Prepare all updates
      const updatedData = {
        scrollCount: result.scrollCount ? result.scrollCount + 1 : scrollCount
      };
      
      // Update website data
      const websiteData = result.websiteData || {};
      if (!websiteData[currentDomain]) {
        websiteData[currentDomain] = { scrollTime: 0, scrollCount: 0 };
      }
      websiteData[currentDomain].scrollCount = (websiteData[currentDomain].scrollCount || 0) + 1;
      updatedData.websiteData = websiteData;
      
      // Update daily data
      const dailyData = result.dailyData || {};
      if (!dailyData[today]) {
        dailyData[today] = { scrolls: 0, minutes: 0 };
      }
      dailyData[today].scrolls = (dailyData[today].scrolls || 0) + 1;
      updatedData.dailyData = dailyData;
      
      // Save everything in one operation
      safeStorageSet(updatedData);
    });
  } catch (error) {
    handleExtensionError(error);
  }
}

// Check for negative words
function checkNegativeWords() {
  if (!extensionContextValid) return;
  
  try {
    // Check if document.body exists before trying to access it
    if (!document.body) {
      console.log("SocialTimeout: document.body not yet available for negative word check");
      return;
    }
    
    const negativeWords = ["stupid", "hate", "ugly", "loser"];
    const bodyText = document.body.innerText.toLowerCase();

    negativeWords.forEach(word => {
      if (bodyText.includes(word)) {
        alert("This post may affect your mood. Consider skipping it.");
      }
    });
  } catch (error) {
    handleExtensionError(error);
  }
}

// Check if the current website should be blocked
function checkIfSiteBlocked() {
  if (!extensionContextValid) return;
  
  try {
    // Extract the base domain (example.com from sub.example.com)
    const baseDomain = extractBaseDomain(currentDomain);
    console.log(`SocialTimeout: Checking if site should be blocked. Current domain: ${currentDomain}, Base domain: ${baseDomain}`);
    
    safeStorageGet(['blockingSettings'], (result) => {
      if (!result || !result.blockingSettings) {
        console.log('SocialTimeout: No blocking settings found in storage');
        return;
      }
      
      const settings = result.blockingSettings;
      console.log('SocialTimeout: Blocking settings loaded:', settings);
      
      // Check if this domain should be blocked
      let shouldBlock = false;
      let matchedSite = null;
      
      Object.keys(settings.sites).forEach(site => {
        // Only consider valid site entries
        if (!site) return;
        
        console.log(`SocialTimeout: Checking site ${site} against current domain ${baseDomain}`);
        
        // Improved domain matching:
        // Check exact matches first
        if (baseDomain === site || currentDomain === site) {
          shouldBlock = true;
          matchedSite = site;
          console.log(`SocialTimeout: Exact match found with ${site}`);
          return;
        }
        
        // Check if the current domain contains the site name
        // For example, youtube.com should match youtube.com 
        // and www.youtube.com, but not fakeyoutube.com
        const domainParts = baseDomain.split('.');
        const siteParts = site.split('.');
        if (siteParts.length >= 2) {
          // For multi-part domains like youtube.com, instagram.com
          if (baseDomain.endsWith(site) || currentDomain.endsWith(site)) {
            shouldBlock = true;
            matchedSite = site;
            console.log(`SocialTimeout: Domain suffix match found with ${site}`);
            return;
          }
        }
      });
      
      if (shouldBlock) {
        console.log(`SocialTimeout: Blocking site: ${currentDomain} (matched with ${matchedSite}). Mode: ${settings.mode}`);
        if (settings.mode === 'full') {
          console.log('SocialTimeout: Applying full block');
          blockSite('This site has been blocked by Social Timeout.');
        } else if (settings.mode === 'timer') {
          // Timer block mode
          const timeInMs = (settings.time || 30) * 60 * 1000; // Convert minutes to milliseconds
          console.log(`SocialTimeout: Setting timer block for ${settings.time} minutes`);
          
          // Set a warning that the site will be blocked soon
          const warningTime = Math.min(timeInMs / 2, 5 * 60 * 1000); // Half time or 5 minutes, whichever is less
          
          setTimeout(() => {
            if (extensionContextValid) {
              alert(`You have ${Math.ceil(warningTime / 60000)} minutes left on ${currentDomain} before it's blocked.`);
            }
          }, timeInMs - warningTime);
          
          // Set the timer to block the site
          blockingTimer = setTimeout(() => {
            if (extensionContextValid) {
              blockSite(`Your time limit of ${settings.time} minutes on this site has been reached.`);
            }
          }, timeInMs);
        }
      } else {
        console.log(`SocialTimeout: Site ${currentDomain} is not blocked`);
      }
    });
  } catch (error) {
    console.error('SocialTimeout Error:', error);
    handleExtensionError(error);
  }
}

// Extract base domain from a full domain
function extractBaseDomain(domain) {
  const parts = domain.split('.');
  if (parts.length <= 2) return domain; // Already a base domain
  
  // For domains like www.example.com, return example.com
  if (parts[0] === 'www' && parts.length === 3) {
    return parts.slice(1).join('.');
  }
  
  // Try to get the main part for other subdomains
  return parts.slice(-2).join('.');
}

// Block the current site
function blockSite(message) {
  try {
    // Check if document.body exists before trying to modify it
    if (!document.body) {
      console.log("SocialTimeout: document.body not yet available for site blocking, waiting for DOMContentLoaded");
      
      // Wait for the DOM to be ready before trying to block the page
      const readyStateHandler = () => {
        if (document.readyState === "interactive" || document.readyState === "complete") {
          console.log("SocialTimeout: DOM now ready, applying block");
          document.removeEventListener("readystatechange", readyStateHandler);
          blockSite(message); // Try again once DOM is ready
        }
      };
      
      document.addEventListener("readystatechange", readyStateHandler);
      return; // Exit the current execution
    }
    
    // Save the original content to restore later if needed
    const originalContent = document.documentElement.innerHTML;
    
    // Replace the page with a blocking notice
    document.body.innerHTML = `
      <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                  background-color: #f8f8f8; z-index: 9999; display: flex; 
                  flex-direction: column; align-items: center; justify-content: center; 
                  font-family: Arial, sans-serif;">
        <div style="background-color: white; padding: 30px; border-radius: 10px;
                    box-shadow: 0 4px 8px rgba(0,0,0,0.1); max-width: 500px; text-align: center;">
          <h1 style="color: #e74c3c; font-size: 28px;">Site Blocked</h1>
          <p style="font-size: 18px; margin: 20px 0; color: #000000;">${message}</p>
          <p style="font-size: 15px; color: #000000;">Take a break and do something else for a while.</p>
          <button id="unblock-temp" style="background-color: #3498db; color: white; 
                  border: none; padding: 10px 20px; border-radius: 5px; 
                  margin-top: 20px; cursor: pointer; width: 330px; height: 45px;
                  font-size: 14px;">
            Override Block (Just This Time)
          </button>
          <p style="font-size: 12px; color: #7f8c8d; margin-top: 20px;">
            To change blocking settings, click on the Social Timeout extension icon.
          </p>
        </div>
      </div>
    `;
    
    // Add event listener for the override button
    document.getElementById('unblock-temp').addEventListener('click', function() {
      // Restore original content
      document.documentElement.innerHTML = originalContent;
      
      // Add a small notification that the block was overridden
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed; top: 20px; right: 20px; background-color: #3498db;
        color: white; padding: 10px 15px; border-radius: 5px; z-index: 9999;
        font-family: Arial, sans-serif; box-shadow: 0 2px 5px rgba(0,0,0,0.2);
      `;
      notification.textContent = 'Block overridden for this session. Use mindfully!';
      document.body.appendChild(notification);
      
      // Remove the notification after 5 seconds
      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.5s';
        setTimeout(() => notification.remove(), 500);
      }, 5000);
      
      // Reinitialize any extension functionality
      initializeData();
      startTimer();
      setupScrollListener();
    });
  } catch (error) {
    console.error('SocialTimeout Error in blockSite:', error);
    handleExtensionError(error);
  }
}

// Check extension context validity
function checkExtensionContext() {
  try {
    // This will throw an error if the context is invalid
    chrome.runtime.getURL("");
    return true;
  } catch (error) {
    handleExtensionError(error);
    return false;
  }
}

// Track scrolling events
function setupScrollListener() {
  if (!extensionContextValid) return;
  document.addEventListener("scroll", scrollHandler);
}

// Initialize extension functionality with error handling
try {
  extensionContextValid = checkExtensionContext();
  if (extensionContextValid) {
    // Handle initialization at document_start
    // Some operations need the DOM to be loaded, so we'll check readyState
    if (document.readyState === "loading") {
      console.log("SocialTimeout: Document still loading, waiting for DOM ready state");
      document.addEventListener("DOMContentLoaded", () => {
        console.log("SocialTimeout: DOM now ready, initializing features");
        initializeData();
        startTimer();
        setupScrollListener();
        checkNegativeWords();
        checkIfSiteBlocked();
      });
    } else {
      // DOM already ready, initialize immediately
      console.log("SocialTimeout: DOM already ready, initializing features");
      initializeData();
      startTimer();
      setupScrollListener();
      checkNegativeWords();
      checkIfSiteBlocked();
    }
  }
} catch (error) {
  handleExtensionError(error);
}

// Listen for context invalidation
if (chrome.runtime && chrome.runtime.onMessage) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message && message.action === "ping") {
      sendResponse({status: "alive"});
      return true;
    }
  });
}
