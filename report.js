// Use Chrome's storage API to get data
chrome.storage.local.get(['scrollCount', 'scrollTime'], (result) => {
  const scrolls = result.scrollCount || 0;
  const time = result.scrollTime || 0;

  const data = {
    labels: ["Scrolls", "Minutes"],
    datasets: [{
      label: 'This Week',
      data: [scrolls, time],
      backgroundColor: ['#f39c12', '#2980b9']
    }]
  };

  new Chart(document.getElementById('myChart'), {
    type: 'bar',
    data: data
  });
});
