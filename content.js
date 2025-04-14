let scrollTime = 0;
let scrollCount = 0;
let currentDomain = window.location.hostname;

// Initialize values from storage
chrome.storage.local.get(['scrollTime', 'scrollCount', 'websiteData'], (result) => {
  scrollTime = result.scrollTime || 0;
  scrollCount = result.scrollCount || 0;
  
  // Initialize website-specific data if it doesn't exist
  const websiteData = result.websiteData || {};
  if (!websiteData[currentDomain]) {
    websiteData[currentDomain] = {
      scrollTime: 0,
      scrollCount: 0
    };
    chrome.storage.local.set({websiteData});
  }
});

setInterval(() => {
  scrollTime++;
  
  // Update global scroll time
  chrome.storage.local.set({scrollTime: scrollTime});
  
  // Update domain-specific scroll time
  chrome.storage.local.get(['websiteData'], (result) => {
    const websiteData = result.websiteData || {};
    if (!websiteData[currentDomain]) {
      websiteData[currentDomain] = {
        scrollTime: 0,
        scrollCount: 0
      };
    }
    
    websiteData[currentDomain].scrollTime = (websiteData[currentDomain].scrollTime || 0) + 1;
    chrome.storage.local.set({websiteData});
  });

  if (scrollTime === 15) {
    alert("You've been scrolling for 15 minutes. Take a break?");
  }
}, 60000);

document.addEventListener("scroll", () => {
  scrollCount++;
  
  // Update global scroll count
  chrome.storage.local.set({scrollCount: scrollCount});
  
  // Update domain-specific scroll count
  chrome.storage.local.get(['websiteData'], (result) => {
    const websiteData = result.websiteData || {};
    if (!websiteData[currentDomain]) {
      websiteData[currentDomain] = {
        scrollTime: 0,
        scrollCount: 0
      };
    }
    
    websiteData[currentDomain].scrollCount = (websiteData[currentDomain].scrollCount || 0) + 1;
    chrome.storage.local.set({websiteData});
  });
});

const negativeWords = ["stupid", "hate", "ugly", "loser"];
const bodyText = document.body.innerText.toLowerCase();

negativeWords.forEach(word => {
  if (bodyText.includes(word)) {
    alert("This post may affect your mood. Consider skipping it.");
  }
});
