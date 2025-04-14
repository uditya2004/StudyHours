let scrollTime = 0;
let scrollCount = 0;
let currentDomain = window.location.hostname;
let timer = null;
let extensionContextValid = true;

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

// Track scrolling events
function setupScrollListener() {
  if (!extensionContextValid) return;
  document.addEventListener("scroll", scrollHandler);
}

// Check for negative words
function checkNegativeWords() {
  if (!extensionContextValid) return;
  
  try {
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

// Initialize extension functionality with error handling
try {
  extensionContextValid = checkExtensionContext();
  if (extensionContextValid) {
    initializeData();
    startTimer();
    setupScrollListener();
    checkNegativeWords();
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
