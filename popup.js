document.addEventListener('DOMContentLoaded', function() {
  // Open report functionality
  document.getElementById("openReport").addEventListener("click", function() {
    chrome.tabs.create({ url: "report.html" });
  });

  // Open rewards functionality
  document.getElementById("openRewards").addEventListener("click", function() {
    chrome.tabs.create({ url: "rewards.html" });
  });

  // Show/hide block time input based on block mode
  document.getElementById("block-mode").addEventListener("change", function() {
    const timeInput = document.getElementById("block-time");
    const fullBlockControls = document.getElementById("full-block-controls");
    const saveButton = document.getElementById("save-blocking");
    
    if (this.value === "timer") {
      timeInput.classList.remove("hidden");
      fullBlockControls.classList.add("hidden");
      saveButton.classList.remove("hidden");
    } else {
      timeInput.classList.add("hidden");
      fullBlockControls.classList.remove("hidden");
      saveButton.classList.add("hidden");
    }
  });
  
  // Start full block mode focus timer
  document.getElementById("start-full-block").addEventListener("click", startFullBlockFocus);
  
  // Stop full block mode focus timer
  document.getElementById("stop-full-block").addEventListener("click", stopFullBlockFocus);

  // Load saved blocking settings
  loadBlockingSettings();

  // Save blocking settings
  document.getElementById("save-blocking").addEventListener("click", saveBlockingSettings);
  
  // Update focus status display
  updateFocusStatus();
});

// Start full block focus timer
function startFullBlockFocus() {
  chrome.storage.local.set({
    fullBlockActive: true,
    fullBlockStartTime: Date.now()
  }, function() {
    // Update UI
    document.getElementById("start-full-block").disabled = true;
    document.getElementById("stop-full-block").disabled = false;
    document.getElementById("focus-status").textContent = "Focus time: active";
    document.getElementById("focus-status").style.color = "#4CAF50";
    
    // Start background tracking
    chrome.runtime.sendMessage({ 
      action: "startFocusTracking"
    }, function(response) {
      // Handle potential error from sendMessage
      const lastError = chrome.runtime.lastError;
      if (lastError) {
        console.log("Focus tracking started in background mode only. No content scripts available to notify: ", lastError.message);
      }
    });
  });
}

// Stop full block focus timer
function stopFullBlockFocus() {
  // Get the current time data
  chrome.storage.local.get(['fullBlockActive', 'fullBlockStartTime', 'focusTime', 'rewardData'], function(result) {
    if (result.fullBlockActive) {
      // Calculate elapsed minutes and add them to focusTime
      const startTime = result.fullBlockStartTime || Date.now();
      const elapsedMs = Date.now() - startTime;
      const elapsedMinutes = Math.floor(elapsedMs / 60000);
      const elapsedSeconds = Math.floor((elapsedMs % 60000) / 1000);
      
      // Update focus time tracking
      const updatedFocusTime = (result.focusTime || 0) + elapsedMinutes;
      
      // Also update rewardData.timeEarned to display in rewards page
      const rewardData = result.rewardData || { coins: 0, timeEarned: 0, lastClaim: null };
      // Convert minutes to include fractional part for seconds
      const timeEarnedMinutes = elapsedMinutes + (elapsedSeconds / 60);
      rewardData.timeEarned = (rewardData.timeEarned || 0) + timeEarnedMinutes;
      
      // Save the updated time and set active state to false
      chrome.storage.local.set({
        fullBlockActive: false,
        focusTime: updatedFocusTime,
        rewardData: rewardData
      }, function() {
        // Update UI
        document.getElementById("start-full-block").disabled = false;
        document.getElementById("stop-full-block").disabled = true;
        document.getElementById("focus-status").textContent = "Focus time: inactive";
        document.getElementById("focus-status").style.color = "#555";
        
        // Stop background tracking
        chrome.runtime.sendMessage({ 
          action: "stopFocusTracking",
          minutesEarned: elapsedMinutes
        }, function(response) {
          // Handle potential error from sendMessage
          const lastError = chrome.runtime.lastError;
          if (lastError) {
            console.log("Focus tracking stopped in background mode only. No content scripts available to notify: ", lastError.message);
          }
        });
      });
    }
  });
}

// Update focus status display
function updateFocusStatus() {
  chrome.storage.local.get(['fullBlockActive'], function(result) {
    if (result.fullBlockActive) {
      document.getElementById("start-full-block").disabled = true;
      document.getElementById("stop-full-block").disabled = false;
      document.getElementById("focus-status").textContent = "Focus time: active";
      document.getElementById("focus-status").style.color = "#4CAF50";
    } else {
      document.getElementById("start-full-block").disabled = false;
      document.getElementById("stop-full-block").disabled = true;
      document.getElementById("focus-status").textContent = "Focus time: inactive";
      document.getElementById("focus-status").style.color = "#555";
    }
  });
}

// Load blocking settings from storage
function loadBlockingSettings() {
  chrome.storage.local.get(['blockingSettings'], function(result) {
    const settings = result.blockingSettings || { sites: {}, mode: 'full', time: 30 };
    
    // Set block mode
    document.getElementById("block-mode").value = settings.mode || 'full';
    
    // Show/hide time input and full block controls based on mode
    const timeInput = document.getElementById("block-time");
    const fullBlockControls = document.getElementById("full-block-controls");
    const saveButton = document.getElementById("save-blocking");
    
    if (settings.mode === 'timer') {
      timeInput.classList.remove("hidden");
      fullBlockControls.classList.add("hidden");
      saveButton.classList.remove("hidden");
    } else {
      timeInput.classList.add("hidden");
      fullBlockControls.classList.remove("hidden");
      saveButton.classList.add("hidden");
    }
    
    // Set time value
    timeInput.value = settings.time || 30;
    
    // Check checkboxes for blocked sites
    const checkboxes = document.querySelectorAll('.site-item input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      const sites = checkbox.dataset.site.split(',');
      // If any of the sites in this checkbox's data-site are blocked, check the box
      const isBlocked = sites.some(site => settings.sites[site]);
      checkbox.checked = isBlocked;
    });
  });
}

// Save blocking settings to storage
function saveBlockingSettings() {
  const settings = {
    sites: {},
    mode: document.getElementById("block-mode").value,
    time: parseInt(document.getElementById("block-time").value, 10) || 30
  };
  
  // Get selected sites
  const checkboxes = document.querySelectorAll('.site-item input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    if (checkbox.checked) {
      const sites = checkbox.dataset.site.split(',');
      sites.forEach(site => {
        settings.sites[site] = true;
      });
    }
  });
  
  // Save settings
  chrome.storage.local.set({blockingSettings: settings}, function() {
    // Show success message
    const saveBtn = document.getElementById("save-blocking");
    const originalText = saveBtn.textContent;
    saveBtn.textContent = "Saved!";
    saveBtn.disabled = true;
    
    // Reset button after 1 second
    setTimeout(() => {
      saveBtn.textContent = originalText;
      saveBtn.disabled = false;
    }, 1000);
  });
}
