// Rewards System for SocialTimeout Extension

document.addEventListener('DOMContentLoaded', function() {
  // Initialize the rewards page
  initRewardsPage();
  
  // Set up event listeners
  document.getElementById('claimCoinsBtn').addEventListener('click', claimCoins);
  document.getElementById('backToReportBtn').addEventListener('click', () => {
    chrome.tabs.create({ url: "report.html" });
  });
  document.getElementById('backToHomeBtn').addEventListener('click', () => {
    window.close();
  });
  
  // Set up site selector change listener
  document.getElementById('siteSelector').addEventListener('change', updateRedemptionOptions);
  
  // Set up redeem buttons
  const redeemButtons = document.querySelectorAll('.redeem-button');
  redeemButtons.forEach(button => {
    button.addEventListener('click', function() {
      redeemCoins(
        document.getElementById('siteSelector').value,
        parseInt(this.dataset.time),
        parseInt(this.dataset.cost)
      );
    });
  });
  
  // Set up tooltip system
  initTooltips();
});

// Initialize the rewards page
function initRewardsPage() {
  loadRewardData();
  loadFocusStats();
  loadBlockedSites();
  loadTransactionHistory();
  initAchievements();
  checkDailyBonus();
}

// Initialize tooltip system
function initTooltips() {
  const tooltipElements = document.querySelectorAll('.has-tooltip');
  const tooltip = document.getElementById('tooltip');
  
  tooltipElements.forEach(element => {
    element.addEventListener('mouseenter', function(e) {
      const tooltipText = this.getAttribute('data-tooltip');
      tooltip.querySelector('.tooltip-content').textContent = tooltipText;
      
      // Position the tooltip
      const rect = this.getBoundingClientRect();
      tooltip.style.left = (rect.left + rect.width / 2) + 'px';
      tooltip.style.top = (rect.top - 10) + 'px';
      tooltip.style.opacity = '1';
    });
    
    element.addEventListener('mouseleave', function() {
      tooltip.style.opacity = '0';
    });
  });
}

// Load reward data from storage
function loadRewardData() {
  chrome.storage.local.get(['rewardData', 'scrollTime', 'focusTime'], function(result) {
    const rewardData = result.rewardData || { coins: 0, timeEarned: 0, lastClaim: null };
    
    // Update UI with reward data
    document.getElementById('coinBalance').textContent = rewardData.coins;
    document.getElementById('timeBalance').textContent = rewardData.timeEarned;
    
    // Update progress bar
    updateNextRewardProgress();
  });
}

// Update progress bar for next reward
function updateNextRewardProgress() {
  chrome.storage.local.get(['scrollTime', 'rewardData', 'focusTime'], function(result) {
    const totalScrollTime = result.scrollTime || 0;
    const totalFullBlockTime = result.focusTime || 0;
    
    // Prioritize Full block mode time for rewards
    const totalTrackedTime = totalFullBlockTime;
    
    const rewardData = result.rewardData || { lastClaimAmount: 0 };
    
    // Calculate unclaimed time
    let unclaimedTime = totalTrackedTime - (rewardData.lastClaimAmount || 0);
    
    // Calculate progress percentage (20 minutes for a reward)
    const remainder = unclaimedTime % 20;
    const progressPercentage = Math.min((remainder / 20) * 100, 100);
    
    // Update progress bar and text
    document.getElementById('nextRewardProgress').style.width = `${progressPercentage}%`;
    document.getElementById('nextRewardText').textContent = `${remainder}/20 minutes`;
  });
}

// Load focus statistics
function loadFocusStats() {
  chrome.storage.local.get(['scrollTime', 'dailyData', 'focusTime'], function(result) {
    // Calculate total focus time - Now prioritizing focusTime (Full block mode time)
    const totalScrollTime = result.scrollTime || 0;
    const totalFullBlockTime = result.focusTime || 0;
    
    // Display total time with priority on Full block mode time
    document.getElementById('totalFocusTime').textContent = `${totalFullBlockTime} minutes`;
    
    // Calculate today's focus time
    const today = new Date().toISOString().split('T')[0];
    const dailyData = result.dailyData || {};
    const todayFocusTime = dailyData[today] ? (dailyData[today].minutes || 0) : 0;
    document.getElementById('todayFocusTime').textContent = `${todayFocusTime} minutes`;
    
    // Calculate focus streak
    const streak = calculateFocusStreak(dailyData);
    document.getElementById('focusStreak').textContent = `${streak} days`;
    
    // Update claim button state
    updateClaimButtonState(result.rewardData, totalFullBlockTime);
  });
}

// Calculate focus streak
function calculateFocusStreak(dailyData) {
  if (!dailyData) return 0;
  
  let streak = 0;
  const today = new Date();
  
  // Check backwards from today
  for (let i = 0; i < 30; i++) { // Check up to 30 days back
    const checkDate = new Date();
    checkDate.setDate(today.getDate() - i);
    const dateStr = checkDate.toISOString().split('T')[0];
    
    // If there's data for this day and the user focused for at least 5 minutes
    if (dailyData[dateStr] && dailyData[dateStr].minutes && dailyData[dateStr].minutes >= 5) {
      streak++;
    } else if (i > 0) { // If we found a day without focus (except today), break the streak
      break;
    }
  }
  
  return streak;
}

// Update claim button state
function updateClaimButtonState(rewardData, totalFocusTime) {
  const claimBtn = document.getElementById('claimCoinsBtn');
  rewardData = rewardData || { lastClaim: null, lastClaimAmount: 0 };
  
  chrome.storage.local.get(['scrollTime', 'focusTime'], function(result) {
    const totalScrollTime = result.scrollTime || 0;
    const totalFullBlockTime = result.focusTime || 0;
    
    // Now prioritize Full block mode time for rewards calculation
    const totalTrackedTime = totalFullBlockTime;
    
    // Check if the user has unclaimed focus time
    let unclaimedTime = totalTrackedTime;
    
    // If they've claimed before, subtract what they've already claimed
    if (rewardData.lastClaimAmount) {
      unclaimedTime -= rewardData.lastClaimAmount;
    }
    
    // If there's unclaimed time, enable the button
    if (unclaimedTime >= 20) { // 20 minutes is the minimum for a claim
      claimBtn.disabled = false;
      claimBtn.textContent = `Claim ${Math.floor(unclaimedTime / 20) * 10} Coins`;
    } else {
      claimBtn.disabled = true;
      const minutesNeeded = 20 - unclaimedTime;
      claimBtn.textContent = `Need ${minutesNeeded} more minutes of focus time`;
    }
  });
}

// Load blocked sites
function loadBlockedSites() {
  chrome.storage.local.get(['blockingSettings'], function(result) {
    const settings = result.blockingSettings || { sites: {} };
    const siteSelector = document.getElementById('siteSelector');
    
    // Clear existing options except the default one
    while (siteSelector.options.length > 1) {
      siteSelector.remove(1);
    }
    
    // Add blocked sites to the dropdown
    const blockedSites = Object.keys(settings.sites).filter(site => settings.sites[site]);
    
    if (blockedSites.length === 0) {
      const option = document.createElement('option');
      option.text = 'No blocked sites available';
      option.disabled = true;
      siteSelector.add(option);
    } else {
      blockedSites.forEach(site => {
        // Format the site name (remove www. if present)
        const displayName = site.replace(/^www\./, '');
        
        const option = document.createElement('option');
        option.value = site;
        option.text = displayName;
        siteSelector.add(option);
      });
    }
  });
}

// Update redemption options based on selected site
function updateRedemptionOptions() {
  const selectedSite = document.getElementById('siteSelector').value;
  
  // Enable/disable redeem buttons based on coin balance
  if (selectedSite) {
    chrome.storage.local.get(['rewardData'], function(result) {
      const coins = result.rewardData ? (result.rewardData.coins || 0) : 0;
      
      const redeemButtons = document.querySelectorAll('.redeem-button');
      redeemButtons.forEach(button => {
        const cost = parseInt(button.dataset.cost);
        button.disabled = cost > coins;
      });
    });
  }
}

// Claim coins based on focus time
function claimCoins() {
  chrome.storage.local.get(['scrollTime', 'rewardData', 'focusTime'], function(result) {
    const totalScrollTime = result.scrollTime || 0;
    const totalFullBlockTime = result.focusTime || 0;
    
    // Now prioritize Full block mode time for rewards instead of combining both
    const totalTrackedTime = totalFullBlockTime;
    
    const rewardData = result.rewardData || { 
      coins: 0, 
      timeEarned: 0, 
      lastClaim: null, 
      lastClaimAmount: 0 
    };
    
    // Calculate unclaimed time
    let unclaimedTime = totalTrackedTime - (rewardData.lastClaimAmount || 0);
    
    // Calculate coins to award (20 minutes = 10 coins)
    const claimableMinutes = Math.floor(unclaimedTime / 20) * 20;
    const coinsToAward = Math.floor(unclaimedTime / 20) * 10;
    
    if (coinsToAward > 0) {
      // Update reward data
      rewardData.coins = (rewardData.coins || 0) + coinsToAward;
      rewardData.timeEarned = (rewardData.timeEarned || 0) + claimableMinutes;
      rewardData.lastClaim = new Date().toISOString();
      rewardData.lastClaimAmount = (rewardData.lastClaimAmount || 0) + claimableMinutes;
      
      // Add transaction record
      if (!rewardData.transactions) {
        rewardData.transactions = [];
      }
      
      rewardData.transactions.unshift({
        type: 'earned',
        amount: coinsToAward,
        time: new Date().toISOString(),
        description: `Claimed ${coinsToAward} coins for ${claimableMinutes} minutes of Full block mode`
      });
      
      // Save to storage
      chrome.storage.local.set({ rewardData }, function() {
        // Show success with animation
        playCoinAnimation();
        
        // Refresh the UI
        loadRewardData();
        updateClaimButtonState(rewardData, totalTrackedTime);
        loadTransactionHistory();
        checkAchievements(); // Check if any achievements were unlocked
      });
    }
  });
}

// Play coin animation when claiming rewards
function playCoinAnimation() {
  // Play confetti animation
  confetti({
    particleCount: 150,
    spread: 70,
    origin: { y: 0.6 },
    colors: ['#ffb703', '#fb8500', '#4361ee'],
  });
  
  // Add pulse animation to the coin balance
  const coinBalance = document.getElementById('coinBalance');
  coinBalance.classList.add('pulse');
  
  // Remove animation class after animation completes
  setTimeout(() => {
    coinBalance.classList.remove('pulse');
  }, 600);
}

// Redeem coins for browsing time
function redeemCoins(site, minutes, coinCost) {
  if (!site) {
    alert('Please select a site to redeem time for.');
    return;
  }
  
  chrome.storage.local.get(['rewardData', 'siteAllowances'], function(result) {
    const rewardData = result.rewardData || { coins: 0, timeEarned: 0 };
    
    // Check if user has enough coins
    if (rewardData.coins < coinCost) {
      alert(`Not enough coins! You need ${coinCost} coins to redeem this reward.`);
      return;
    }
    
    // Update coins balance
    rewardData.coins -= coinCost;
    
    // Add transaction record
    if (!rewardData.transactions) {
      rewardData.transactions = [];
    }
    
    rewardData.transactions.unshift({
      type: 'spent',
      amount: coinCost,
      time: new Date().toISOString(),
      description: `Spent ${coinCost} coins for ${minutes} minutes on ${site.replace(/^www\./, '')}`
    });
    
    // Create or update site allowances
    const siteAllowances = result.siteAllowances || {};
    
    if (!siteAllowances[site]) {
      siteAllowances[site] = {
        minutes: minutes,
        expiryTime: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours from now
      };
    } else {
      // Add to existing allowance
      siteAllowances[site].minutes += minutes;
      
      // If expired, reset expiry time to 24 hours from now
      const expiryTime = new Date(siteAllowances[site].expiryTime).getTime();
      if (expiryTime < Date.now()) {
        siteAllowances[site].expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      }
    }
    
    // Save changes
    chrome.storage.local.set({ rewardData, siteAllowances }, function() {
      // Show success animation (smaller than claim animation)
      confetti({
        particleCount: 50,
        spread: 40,
        origin: { y: 0.6 },
        scalar: 0.7
      });
      
      alert(`Success! You've redeemed ${minutes} minutes on ${site.replace(/^www\./, '')}.`);
      
      // Refresh the UI
      loadRewardData();
      updateRedemptionOptions();
      loadTransactionHistory();
    });
  });
}

// Load transaction history
function loadTransactionHistory() {
  chrome.storage.local.get(['rewardData'], function(result) {
    const rewardData = result.rewardData || {};
    const transactions = rewardData.transactions || [];
    const historyContainer = document.getElementById('transactionHistory');
    
    // Clear current content
    historyContainer.innerHTML = '';
    
    // If no transactions, show message
    if (transactions.length === 0) {
      historyContainer.innerHTML = '<div class="no-transactions">No transactions yet</div>';
      return;
    }
    
    // Add transactions to the history
    transactions.forEach(transaction => {
      const transactionEl = document.createElement('div');
      transactionEl.className = 'transaction-item';
      
      const type = transaction.type === 'earned' ? 'earned' : 'spent';
      const icon = transaction.type === 'earned' ? 'plus-circle' : 'minus-circle';
      const prefix = transaction.type === 'earned' ? '+' : '-';
      
      // Format time
      const transactionTime = new Date(transaction.time);
      const formattedTime = transactionTime.toLocaleDateString() + ' ' + 
                            transactionTime.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
      
      transactionEl.innerHTML = `
        <div class="transaction-type ${type}">
          <i class="fas fa-${icon}"></i>
          <div>${transaction.description}</div>
        </div>
        <div class="transaction-amount ${type}">${prefix}${transaction.amount}</div>
        <div class="transaction-time">${formattedTime}</div>
      `;
      
      historyContainer.appendChild(transactionEl);
    });
  });
}

// Initialize achievements
function initAchievements() {
  // Define the achievements
  const achievements = [
    {
      id: 'firstHour',
      icon: 'fa-hourglass-start',
      title: 'First Hour',
      description: 'Complete 60 minutes of focused time',
      requirement: {
        type: 'totalFocusTime',
        value: 60
      },
      reward: 20 // Bonus coins
    },
    {
      id: 'productiveWeek',
      icon: 'fa-calendar-check',
      title: 'Productive Week',
      description: 'Maintain a streak of 7 days',
      requirement: {
        type: 'streak',
        value: 7
      },
      reward: 35 // Bonus coins
    },
    {
      id: 'focusMaster',
      icon: 'fa-user-ninja',
      title: 'Focus Master',
      description: 'Accumulate 10 hours of focused time',
      requirement: {
        type: 'totalFocusTime',
        value: 600
      },
      reward: 100 // Bonus coins
    },
    {
      id: 'disciplined',
      icon: 'fa-medal',
      title: 'Disciplined',
      description: 'Redeem 10 times without overriding blocks',
      requirement: {
        type: 'redemptions',
        value: 10
      },
      reward: 50 // Bonus coins
    },
    {
      id: 'socialBalance',
      icon: 'fa-balance-scale',
      title: 'Social Balance',
      description: 'Use rewards 5 days in a row',
      requirement: {
        type: 'dailyUse',
        value: 5
      },
      reward: 30 // Bonus coins
    }
  ];
  
  // Load user achievements
  chrome.storage.local.get(['achievements'], function(result) {
    const userAchievements = result.achievements || {};
    const container = document.getElementById('achievementsContainer');
    
    // Clear container
    container.innerHTML = '';
    
    // Add each achievement to the UI
    achievements.forEach(achievement => {
      const achieved = userAchievements[achievement.id];
      const element = document.createElement('div');
      element.className = `achievement${achieved ? ' unlocked' : ''}`;
      element.setAttribute('data-id', achievement.id);
      
      // Create achievement HTML
      element.innerHTML = `
        <div class="achievement-icon">
          <i class="fas ${achievement.icon}"></i>
          ${achieved ? '<div class="achievement-badge"><i class="fas fa-check"></i></div>' : ''}
        </div>
        <div class="achievement-title has-tooltip" 
             data-tooltip="${achievement.description} (Reward: ${achievement.reward} coins)">
          ${achievement.title}
        </div>
        ${achieved ? 
          `<div class="achievement-date">${new Date(achieved.date).toLocaleDateString()}</div>` : 
          '<div class="achievement-progress">In progress</div>'
        }
      `;
      
      container.appendChild(element);
    });
    
    // Re-initialize tooltips after adding achievements
    initTooltips();
  });
}

// Check if any achievements are newly completed
function checkAchievements() {
  chrome.storage.local.get(['achievements', 'scrollTime', 'dailyData', 'rewardData'], function(result) {
    const achievements = result.achievements || {};
    const scrollTime = result.scrollTime || 0;
    const dailyData = result.dailyData || {};
    const rewardData = result.rewardData || {};
    const transactions = rewardData.transactions || [];
    
    let achievementsUnlocked = false;
    let unlockedArray = [];
    
    // First Hour achievement
    if (!achievements.firstHour && scrollTime >= 60) {
      achievements.firstHour = {
        date: new Date().toISOString(),
        rewardClaimed: false
      };
      unlockedArray.push('First Hour');
      achievementsUnlocked = true;
    }
    
    // Productive Week achievement
    const streak = calculateFocusStreak(dailyData);
    if (!achievements.productiveWeek && streak >= 7) {
      achievements.productiveWeek = {
        date: new Date().toISOString(),
        rewardClaimed: false
      };
      unlockedArray.push('Productive Week');
      achievementsUnlocked = true;
    }
    
    // Focus Master achievement
    if (!achievements.focusMaster && scrollTime >= 600) {
      achievements.focusMaster = {
        date: new Date().toISOString(),
        rewardClaimed: false
      };
      unlockedArray.push('Focus Master');
      achievementsUnlocked = true;
    }
    
    // Disciplined achievement - count redemptions
    if (!achievements.disciplined) {
      const redemptions = transactions.filter(t => t.type === 'spent').length;
      if (redemptions >= 10) {
        achievements.disciplined = {
          date: new Date().toISOString(),
          rewardClaimed: false
        };
        unlockedArray.push('Disciplined');
        achievementsUnlocked = true;
      }
    }
    
    // If any achievements were unlocked
    if (achievementsUnlocked) {
      chrome.storage.local.set({ achievements }, function() {
        // Update UI
        initAchievements();
        
        // Show notification for unlocked achievements
        setTimeout(() => {
          const achievementNames = unlockedArray.join(', ');
          alert(`Achievement${unlockedArray.length > 1 ? 's' : ''} unlocked: ${achievementNames}! Check the Achievements section to claim your rewards.`);
        }, 800);
      });
    }
    
    // Check for unclaimed achievement rewards
    let coinsToAward = 0;
    
    for (const [id, achievement] of Object.entries(achievements)) {
      if (!achievement.rewardClaimed) {
        // Find the achievement in our local definition to get reward amount
        const achievementDef = [
          { id: 'firstHour', reward: 20 },
          { id: 'productiveWeek', reward: 35 },
          { id: 'focusMaster', reward: 100 },
          { id: 'disciplined', reward: 50 },
          { id: 'socialBalance', reward: 30 }
        ].find(a => a.id === id);
        
        if (achievementDef) {
          coinsToAward += achievementDef.reward;
          achievement.rewardClaimed = true;
        }
      }
    }
    
    // If there are coins to award
    if (coinsToAward > 0) {
      // Update coin balance
      rewardData.coins = (rewardData.coins || 0) + coinsToAward;
      
      // Add transaction
      if (!rewardData.transactions) {
        rewardData.transactions = [];
      }
      
      rewardData.transactions.unshift({
        type: 'earned',
        amount: coinsToAward,
        time: new Date().toISOString(),
        description: `Achievement reward: ${coinsToAward} coins`
      });
      
      // Save changes
      chrome.storage.local.set({ achievements, rewardData }, function() {
        // Update UI
        loadRewardData();
        loadTransactionHistory();
      });
    }
  });
}

// Check for daily bonus
function checkDailyBonus() {
  chrome.storage.local.get(['rewardData', 'dailyBonus'], function(result) {
    const rewardData = result.rewardData || { coins: 0 };
    const dailyBonus = result.dailyBonus || {};
    
    const today = new Date().toISOString().split('T')[0];
    
    // If today's bonus hasn't been claimed yet
    if (!dailyBonus[today]) {
      // Award 5 bonus coins
      const bonusCoins = 5;
      rewardData.coins = (rewardData.coins || 0) + bonusCoins;
      
      // Add to transactions
      if (!rewardData.transactions) {
        rewardData.transactions = [];
      }
      
      rewardData.transactions.unshift({
        type: 'earned',
        amount: bonusCoins,
        time: new Date().toISOString(),
        description: `Daily login bonus: ${bonusCoins} coins`
      });
      
      // Mark as claimed
      dailyBonus[today] = true;
      
      // Save changes
      chrome.storage.local.set({ rewardData, dailyBonus }, function() {
        setTimeout(() => {
          alert('You received 5 coins as a daily login bonus!');
          
          // Update UI
          loadRewardData();
          loadTransactionHistory();
        }, 1000);
      });
    }
  });
}