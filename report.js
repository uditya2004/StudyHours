// Display current date for the report
const today = new Date();
document.getElementById('reportDate').textContent = `Report generated on: ${today.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}`;

// Use Chrome's storage API to get all data
chrome.storage.local.get(['scrollCount', 'scrollTime', 'dailyData', 'websiteData'], (result) => {
  const scrolls = result.scrollCount || 0;
  const minutes = result.scrollTime || 0;
  const dailyData = result.dailyData || {};
  const websiteData = result.websiteData || {};
  
  // Update the stats cards
  document.getElementById('scrollCountStat').textContent = scrolls;
  document.getElementById('timeSpentStat').textContent = minutes.toFixed(1);
  
  // Calculate and display scroll rate
  const scrollRate = minutes > 0 ? (scrolls / minutes).toFixed(1) : 0;
  document.getElementById('scrollRateStat').textContent = scrollRate;
  
  // Display website-specific stats
  displayWebsiteStats(websiteData);
  
  // Create website usage pie chart
  createWebsitePieChart(websiteData);
  
  // Prepare data for the weekly chart
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const today = new Date();
  const dayOfWeek = today.getDay();
  
  // Create arrays for the past 7 days
  const lastSevenDays = [];
  const scrollData = [];
  const timeData = [];
  
  // Fill in data for the past week
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(today.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const day = days[date.getDay()];
    lastSevenDays.push(day.substring(0, 3)); // First 3 characters of day name
    
    if (dailyData[dateStr]) {
      scrollData.push(dailyData[dateStr].scrolls || 0);
      timeData.push(dailyData[dateStr].minutes || 0);
    } else {
      scrollData.push(0);
      timeData.push(0);
    }
  }
  
  // Create the chart
  const ctx = document.getElementById('myChart').getContext('2d');
  
  const chart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: lastSevenDays,
      datasets: [
        {
          label: 'Scrolls',
          data: scrollData,
          backgroundColor: 'rgba(74, 111, 165, 0.7)',
          borderColor: 'rgba(74, 111, 165, 1)',
          borderWidth: 1
        },
        {
          label: 'Minutes',
          data: timeData,
          backgroundColor: 'rgba(76, 181, 174, 0.7)',
          borderColor: 'rgba(76, 181, 174, 1)',
          borderWidth: 1,
          // Use a separate y-axis for minutes
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Scroll Count'
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Minutes'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Day'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: function(context) {
              return context[0].label;
            },
            label: function(context) {
              const label = context.dataset.label || '';
              const value = context.raw;
              return `${label}: ${value}`;
            }
          }
        }
      }
    }
  });
  
  // Generate insights
  generateInsights(scrolls, minutes, scrollData, timeData, websiteData);
});

// Function to display website-specific statistics
function displayWebsiteStats(websiteData) {
  const container = document.getElementById('websiteStatsContainer');
  container.innerHTML = ''; // Clear loading message
  
  // Check if we have any website data
  if (Object.keys(websiteData).length === 0) {
    container.innerHTML = '<p class="no-data-message">No website data collected yet. Start browsing to see statistics!</p>';
    return;
  }
  
  // Convert website data to array for sorting
  const websites = Object.keys(websiteData).map(domain => ({
    domain: domain,
    scrollTime: websiteData[domain].scrollTime || 0,
    scrollCount: websiteData[domain].scrollCount || 0
  }));
  
  // Sort websites by time spent (descending)
  websites.sort((a, b) => b.scrollTime - a.scrollTime);
  
  // Take top 5 websites
  const topWebsites = websites.slice(0, 5);
  
  // Create HTML elements for each website
  topWebsites.forEach(website => {
    const websiteElement = document.createElement('div');
    websiteElement.className = 'website-stat-item';
    
    // Get website name without "www." prefix
    let displayName = website.domain.replace(/^www\./, '');
    
    // Choose appropriate icon based on domain name
    let icon = 'globe';
    if (displayName.includes('facebook')) icon = 'facebook';
    else if (displayName.includes('twitter') || displayName.includes('x.com')) icon = 'twitter';
    else if (displayName.includes('instagram')) icon = 'instagram';
    else if (displayName.includes('tiktok')) icon = 'video';
    else if (displayName.includes('youtube')) icon = 'youtube';
    else if (displayName.includes('reddit')) icon = 'reddit';
    else if (displayName.includes('linkedin')) icon = 'linkedin';
    
    websiteElement.innerHTML = `
      <div class="website-name">
        <i class="fab fa-${icon}"></i>
        ${displayName}
      </div>
      <div class="website-metrics">
        <div class="website-metric">
          <div class="metric-value">${website.scrollTime}</div>
          <div class="metric-label">Minutes</div>
        </div>
        <div class="website-metric">
          <div class="metric-value">${website.scrollCount}</div>
          <div class="metric-label">Scrolls</div>
        </div>
        <div class="website-metric">
          <div class="metric-value">${website.scrollTime > 0 ? (website.scrollCount / website.scrollTime).toFixed(1) : '0'}</div>
          <div class="metric-label">Scrolls/Min</div>
        </div>
      </div>
    `;
    
    container.appendChild(websiteElement);
  });
}

// Function to create a pie chart for website time distribution
function createWebsitePieChart(websiteData) {
  // Check if we have any website data
  if (Object.keys(websiteData).length === 0) {
    return; // No data to show
  }
  
  // Convert website data to arrays for the chart
  const domains = [];
  const timeData = [];
  const backgroundColors = [
    'rgba(74, 111, 165, 0.7)',
    'rgba(76, 181, 174, 0.7)',
    'rgba(249, 157, 77, 0.7)',
    'rgba(218, 87, 98, 0.7)',
    'rgba(147, 88, 177, 0.7)',
    'rgba(98, 187, 128, 0.7)',
    'rgba(231, 169, 73, 0.7)',
    'rgba(85, 141, 214, 0.7)'
  ];
  
  // Convert website data to array for sorting
  const websites = Object.keys(websiteData).map(domain => ({
    domain: domain,
    scrollTime: websiteData[domain].scrollTime || 0
  }));
  
  // Sort websites by time spent (descending)
  websites.sort((a, b) => b.scrollTime - a.scrollTime);
  
  // Take top 7 websites, group others
  const displayWebsites = websites.slice(0, 7);
  let otherTime = 0;
  
  for (let i = 7; i < websites.length; i++) {
    otherTime += websites[i].scrollTime;
  }
  
  // Add top websites to the chart data
  displayWebsites.forEach(website => {
    // Get website name without "www." prefix
    let displayName = website.domain.replace(/^www\./, '');
    domains.push(displayName);
    timeData.push(website.scrollTime);
  });
  
  // Add "Others" category if there are more websites
  if (otherTime > 0) {
    domains.push('Others');
    timeData.push(otherTime);
  }
  
  // Create the chart
  const ctx = document.getElementById('websitePieChart').getContext('2d');
  
  new Chart(ctx, {
    type: 'pie',
    data: {
      labels: domains,
      datasets: [{
        data: timeData,
        backgroundColor: backgroundColors.slice(0, domains.length),
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        title: {
          display: true,
          text: 'Minutes Spent by Website'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = ((value / total) * 100).toFixed(1);
              return `${label}: ${value} min (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Function to generate insights based on the data
function generateInsights(totalScrolls, totalMinutes, scrollData, timeData, websiteData) {
  // Insight 1: Overall activity trend
  let trendInsight = '';
  
  // Calculate if scrolling activity is increasing or decreasing
  const firstHalf = scrollData.slice(0, 3).reduce((a, b) => a + b, 0);
  const secondHalf = scrollData.slice(3, 7).reduce((a, b) => a + b, 0);
  
  if (secondHalf > firstHalf * 1.2) {
    trendInsight = 'Your scrolling activity has increased significantly this week. Consider setting time limits.';
  } else if (secondHalf < firstHalf * 0.8) {
    trendInsight = 'Great job! Your scrolling activity has decreased this week.';
  } else {
    trendInsight = 'Your scrolling activity has remained relatively stable this week.';
  }
  
  document.getElementById('insight1').textContent = trendInsight;
  
  // Insight 2: Activity intensity or top website insight
  let insight2 = '';
  
  // If we have website data, provide an insight about the most used website
  if (Object.keys(websiteData).length > 0) {
    // Find the website with the most time spent
    let topWebsite = '';
    let maxTime = 0;
    
    for (const domain in websiteData) {
      if (websiteData[domain].scrollTime > maxTime) {
        maxTime = websiteData[domain].scrollTime;
        topWebsite = domain;
      }
    }
    
    // Calculate percentage of total time
    const percentTime = ((maxTime / totalMinutes) * 100).toFixed(1);
    
    // Format the domain name for display
    const displayName = topWebsite.replace(/^www\./, '');
    
    if (percentTime > 50) {
      insight2 = `You've spent ${percentTime}% of your time on ${displayName}. Consider diversifying your browsing.`;
    } else if (percentTime > 30) {
      insight2 = `Your top site is ${displayName} at ${percentTime}% of your browsing time.`;
    } else {
      insight2 = `Your browsing is well-distributed across sites, with ${displayName} being your most visited.`;
    }
  } else {
    // Fall back to the original intensity insight if no website data
    const avgScrollsPerMinute = totalMinutes > 0 ? (totalScrolls / totalMinutes) : 0;
    
    if (avgScrollsPerMinute > 10) {
      insight2 = 'You have a high scrolling intensity. Try to be more mindful while browsing.';
    } else if (avgScrollsPerMinute > 5) {
      insight2 = 'Your scrolling pace is moderate. Good balance of engagement.';
    } else if (totalScrolls > 0) {
      insight2 = 'You seem to browse at a relaxed pace. Well done!';
    } else {
      insight2 = 'Not enough data to analyze your browsing intensity yet.';
    }
  }
  
  document.getElementById('insight2').textContent = insight2;
}

// Initialize reset button functionality
document.addEventListener('DOMContentLoaded', () => {
  const resetButton = document.getElementById('resetStatsBtn');
  const resetConfirmation = document.getElementById('resetConfirmation');
  
  if (resetButton) {
    resetButton.addEventListener('click', () => {
      // Confirm before resetting
      if (confirm('Are you sure you want to reset all statistics? This action cannot be undone.')) {
        // Reset all statistics in Chrome storage
        chrome.storage.local.set({
          scrollCount: 0,
          scrollTime: 0,
          dailyData: {},
          websiteData: {}
        }, () => {
          // Show confirmation message
          resetConfirmation.classList.remove('hidden');
          
          // Update UI with zeros
          document.getElementById('scrollCountStat').textContent = '0';
          document.getElementById('timeSpentStat').textContent = '0';
          document.getElementById('scrollRateStat').textContent = '0';
          
          // Clear website stats
          const websiteStatsContainer = document.getElementById('websiteStatsContainer');
          websiteStatsContainer.innerHTML = '<p class="no-data-message">No website data collected yet. Start browsing to see statistics!</p>';
          
          // Reset insights
          document.getElementById('insight1').textContent = 'Not enough data to analyze your activity trends yet.';
          document.getElementById('insight2').textContent = 'Start browsing to generate personalized insights.';
          
          // Reset charts - clear and recreate with empty data
          if (window.websitePieChart) {
            window.websitePieChart.destroy();
          }
          
          if (window.activityChart) {
            window.activityChart.destroy();
          }
          
          // Create empty charts
          createEmptyCharts();
          
          // Hide confirmation after 3 seconds
          setTimeout(() => {
            resetConfirmation.classList.add('hidden');
          }, 3000);
        });
      }
    });
  }
});

// Function to create empty charts when no data is available
function createEmptyCharts() {
  // Empty weekly activity chart
  const activityCtx = document.getElementById('myChart').getContext('2d');
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  window.activityChart = new Chart(activityCtx, {
    type: 'bar',
    data: {
      labels: days,
      datasets: [
        {
          label: 'Scrolls',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(74, 111, 165, 0.7)',
          borderColor: 'rgba(74, 111, 165, 1)',
          borderWidth: 1
        },
        {
          label: 'Minutes',
          data: [0, 0, 0, 0, 0, 0, 0],
          backgroundColor: 'rgba(76, 181, 174, 0.7)',
          borderColor: 'rgba(76, 181, 174, 1)',
          borderWidth: 1,
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Scroll Count'
          }
        },
        y1: {
          beginAtZero: true,
          position: 'right',
          grid: {
            drawOnChartArea: false,
          },
          title: {
            display: true,
            text: 'Minutes'
          }
        },
        x: {
          title: {
            display: true,
            text: 'Day'
          }
        }
      },
      plugins: {
        legend: {
          position: 'top',
        }
      }
    }
  });
  
  // Empty website pie chart
  const pieCtx = document.getElementById('websitePieChart').getContext('2d');
  
  window.websitePieChart = new Chart(pieCtx, {
    type: 'pie',
    data: {
      labels: ['No Data'],
      datasets: [{
        data: [1],
        backgroundColor: ['rgba(200, 200, 200, 0.7)'],
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
        },
        title: {
          display: true,
          text: 'Minutes Spent by Website'
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return 'No data available';
            }
          }
        }
      }
    }
  });
}
