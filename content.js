let scrollTime = 0;
let scrollCount = 0;

// Initialize values from storage
chrome.storage.local.get(['scrollTime', 'scrollCount'], (result) => {
  scrollTime = result.scrollTime || 0;
  scrollCount = result.scrollCount || 0;
});

setInterval(() => {
  scrollTime++;
  chrome.storage.local.set({scrollTime: scrollTime});

  if (scrollTime === 15) {
    alert("You've been scrolling for 15 minutes. Take a break?");
  }
}, 60000);

document.addEventListener("scroll", () => {
  scrollCount++;
  chrome.storage.local.set({scrollCount: scrollCount});
});

const negativeWords = ["stupid", "hate", "ugly", "loser"];
const bodyText = document.body.innerText.toLowerCase();

negativeWords.forEach(word => {
  if (bodyText.includes(word)) {
    alert("This post may affect your mood. Consider skipping it.");
  }
});
