// Display current date for the report
const today = new Date();
document.getElementById('reportDate').textContent = `Report generated on: ${today.toLocaleDateString('en-US', { 
  weekday: 'long', 
  year: 'numeric', 
  month: 'long', 
  day: 'numeric' 
})}`;

// Use Chrome's storage API to get all data
chrome.storage.local.get(['scrollCount', 'scrollTime', 'dailyData'], (result) => {
  const scrolls = result.scrollCount || 0;
  const minutes = result.scrollTime || 0;
  const dailyData = result.dailyData || {};
  
  // Update the stats cards
  document.getElementById('scrollCountStat').textContent = scrolls;
  document.getElementById('timeSpentStat').textContent = minutes.toFixed(1);
  
  // Calculate and display scroll rate
  const scrollRate = minutes > 0 ? (scrolls / minutes).toFixed(1) : 0;
  document.getElementById('scrollRateStat').textContent = scrollRate;
  
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
  generateInsights(scrolls, minutes, scrollData, timeData);
});

// Function to generate insights based on the data
function generateInsights(totalScrolls, totalMinutes, scrollData, timeData) {
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
  
  // Insight 2: Activity intensity
  let intensityInsight = '';
  
  const avgScrollsPerMinute = totalMinutes > 0 ? (totalScrolls / totalMinutes) : 0;
  
  if (avgScrollsPerMinute > 10) {
    intensityInsight = 'You have a high scrolling intensity. Try to be more mindful while browsing.';
  } else if (avgScrollsPerMinute > 5) {
    intensityInsight = 'Your scrolling pace is moderate. Good balance of engagement.';
  } else if (totalScrolls > 0) {
    intensityInsight = 'You seem to browse at a relaxed pace. Well done!';
  } else {
    intensityInsight = 'Not enough data to analyze your browsing intensity yet.';
  }
  
  document.getElementById('insight2').textContent = intensityInsight;
}
